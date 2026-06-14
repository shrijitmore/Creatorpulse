import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { PLAN_AMOUNTS } from '../constants.js'
import {
  createSubscription,
  cancelSubscription,
  verifySubscriptionSignature,
  verifyWebhookSignature,
  getRazorpayConfig,
  setUserPlan,
  applyWebhookEvent,
} from '../lib/billingService.js'
import { getDb } from '../db.js'
import { logger } from '../lib/logger.js'
import { validate, VALID_CYCLES, COUPON_RE, RAZORPAY_PAYMENT_RE } from '../lib/validate.js'

const router = Router()

const VALID_PLAN_IDS = Object.keys(PLAN_AMOUNTS)
const RAZORPAY_SUB_RE = /^sub_[A-Za-z0-9_]+$/

// POST /api/billing/create-subscription
router.post(
  '/create-subscription',
  requireAuth,
  validate({
    body: {
      planId: { required: true, type: 'string', maxLength: 20 },
      cycle:  { type: 'string', oneOf: VALID_CYCLES },
    },
  }),
  async (req, res) => {
    try {
      const { planId, cycle = 'monthly' } = req.body
      if (!VALID_PLAN_IDS.includes(planId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
      }

      const result = await createSubscription({ planId, cycle, userId: req.userId })

      // Store the pending subscription id so we can reconcile if the webhook arrives first.
      const db = await getDb()
      await db.query(
        `UPDATE users SET razorpay_subscription_id = $1, plan_cycle = $2, updated_at = NOW() WHERE id = $3`,
        [result.subscriptionId, cycle, req.userId]
      )

      res.json({ success: true, data: result })
    } catch (err) {
      logger.error('billing.create_subscription_error', { message: err.message })
      res.status(500).json({ success: false, error: { code: 'SUBSCRIPTION_ERROR', message: err.message } })
    }
  }
)

// POST /api/billing/verify — confirms the checkout handler signature.
// Optimistically marks active; the webhook is still the authoritative source.
router.post(
  '/verify',
  requireAuth,
  validate({
    body: {
      paymentId:      { required: true, type: 'string', maxLength: 64, pattern: RAZORPAY_PAYMENT_RE },
      subscriptionId: { required: true, type: 'string', maxLength: 64, pattern: RAZORPAY_SUB_RE },
      signature:      { required: true, type: 'string', maxLength: 128 },
      planId:         { required: true, type: 'string', maxLength: 20 },
      cycle:          { required: true, type: 'string', oneOf: VALID_CYCLES },
    },
  }),
  async (req, res) => {
    try {
      const { paymentId, subscriptionId, signature, planId, cycle } = req.body
      if (!VALID_PLAN_IDS.includes(planId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
      }

      const { keySecret, available } = getRazorpayConfig()

      if (available && !verifySubscriptionSignature({ paymentId, subscriptionId, signature, keySecret })) {
        logger.security('billing.invalid_signature', { userId: req.userId, subscriptionId })
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } })
      }

      // Optimistic activation — give immediate access. Webhook reconciles current_end.
      const expiresAt = Date.now() + (cycle === 'yearly' ? 365 : 31) * 24 * 60 * 60 * 1000
      const db = await getDb()
      await setUserPlan(db, req.userId, {
        plan: planId, cycle, expiresAt, subscriptionId, status: 'active', isComp: false,
      })

      res.json({ success: true, data: { planId, cycle, subscriptionId } })
    } catch (err) {
      logger.error('billing.verify_error', { message: err.message })
      res.status(500).json({ success: false, error: { code: 'VERIFY_ERROR', message: err.message } })
    }
  }
)

// POST /api/billing/cancel — cancel at the end of the current paid period.
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const row = (await db.query('SELECT razorpay_subscription_id FROM users WHERE id = $1', [req.userId])).rows[0]
    const subId = row?.razorpay_subscription_id
    if (!subId) {
      return res.status(400).json({ success: false, error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription found' } })
    }
    await cancelSubscription(subId, true)
    await db.query(`UPDATE users SET subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1`, [req.userId])
    res.json({ success: true, data: { cancelled: true } })
  } catch (err) {
    logger.error('billing.cancel_error', { message: err.message })
    res.status(500).json({ success: false, error: { code: 'CANCEL_ERROR', message: err.message } })
  }
})

// POST /api/billing/redeem-code — admin-issued access code grants comp plan, no payment.
router.post(
  '/redeem-code',
  requireAuth,
  validate({ body: { code: { required: true, type: 'string', maxLength: 50, pattern: COUPON_RE } } }),
  async (req, res) => {
    try {
      const code = req.body.code.trim().toUpperCase()
      const db = await getDb()
      const row = (await db.query('SELECT * FROM coupons WHERE code = $1', [code])).rows[0]

      const invalid = (msg) => res.status(400).json({ success: false, error: { code: 'INVALID_CODE', message: msg } })

      if (!row || !row.active) return invalid('This code is not valid.')
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return invalid('This code has expired.')
      if (row.max_redemptions != null && row.redemptions >= row.max_redemptions) return invalid('This code has been fully redeemed.')

      const expiresAt = Date.now() + (row.duration_days || 30) * 24 * 60 * 60 * 1000
      await setUserPlan(db, req.userId, {
        plan: row.plan || 'pro', cycle: 'monthly', expiresAt, status: 'comp', isComp: true,
      })
      await db.query('UPDATE coupons SET redemptions = redemptions + 1 WHERE code = $1', [code])

      logger.info('billing.code_redeemed', { userId: req.userId, code, plan: row.plan })
      res.json({ success: true, data: { granted: true, plan: row.plan || 'pro', durationDays: row.duration_days || 30 } })
    } catch (err) {
      logger.error('billing.redeem_error', { message: err.message })
      res.status(500).json({ success: false, error: { code: 'REDEEM_ERROR', message: err.message } })
    }
  }
)

// Webhook handler — mounted in server.js with a raw-body parser (signature needs raw bytes).
// NOT behind requireAuth: the Razorpay signature is the authentication.
export async function razorpayWebhookHandler(req, res) {
  try {
    const { webhookSecret } = getRazorpayConfig()
    const signature = req.headers['x-razorpay-signature']
    const rawBody = req.body // Buffer (express.raw)

    if (!webhookSecret) {
      logger.security('billing.webhook.no_secret')
      return res.status(503).json({ success: false })
    }
    if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      logger.security('billing.webhook.bad_signature', { ip: req.ip })
      return res.status(400).json({ success: false })
    }

    const event = JSON.parse(rawBody.toString('utf8'))
    const db = await getDb()
    await applyWebhookEvent(db, event)

    // Always 200 quickly so Razorpay doesn't retry a handled event.
    res.json({ success: true })
  } catch (err) {
    logger.error('billing.webhook_error', { message: err.message })
    res.status(500).json({ success: false })
  }
}

export default router
