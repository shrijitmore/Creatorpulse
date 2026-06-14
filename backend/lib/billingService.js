import crypto from 'crypto'
import { SUBSCRIPTION_TOTAL_COUNT } from '../constants.js'
import { logger } from './logger.js'

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  return { keyId, keySecret, webhookSecret, available: Boolean(keyId && keySecret) }
}

/**
 * Resolve the Razorpay plan_id for a (planId, cycle) pair.
 * Plans are created once in the Razorpay dashboard; their IDs live in env so they
 * differ per account/environment. e.g. RZP_PLAN_PRO_MONTHLY=plan_Xyz...
 */
export function resolveRazorpayPlanId(planId, cycle) {
  const key = `RZP_PLAN_${planId.toUpperCase()}_${cycle.toUpperCase()}`
  return process.env[key] || ''
}

async function getInstance() {
  const { keyId, keySecret } = getRazorpayConfig()
  const Razorpay = (await import('razorpay')).default
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

/**
 * Create a Razorpay subscription. Returns a subscription_id the frontend hands to
 * Razorpay Checkout. Authoritative activation happens via webhook, not here.
 */
export async function createSubscription({ planId, cycle, userId }) {
  const { keyId, available } = getRazorpayConfig()

  if (!available) {
    return {
      simulated: true,
      subscriptionId: `sub_sim_${Date.now()}`,
      keyId: 'rzp_test_placeholder',
    }
  }

  const rzpPlanId = resolveRazorpayPlanId(planId, cycle)
  if (!rzpPlanId) {
    throw new Error(`No Razorpay plan configured for ${planId}/${cycle}. Set RZP_PLAN_${planId.toUpperCase()}_${cycle.toUpperCase()}.`)
  }

  const instance = await getInstance()
  const subscription = await instance.subscriptions.create({
    plan_id: rzpPlanId,
    total_count: SUBSCRIPTION_TOTAL_COUNT[cycle] || 12,
    quantity: 1,
    customer_notify: 1,
    notes: { userId, planId, cycle },
  })

  return { subscriptionId: subscription.id, keyId, shortUrl: subscription.short_url }
}

export async function cancelSubscription(subscriptionId, atCycleEnd = true) {
  const { available } = getRazorpayConfig()
  if (!available || !subscriptionId || subscriptionId.startsWith('sub_sim_')) {
    return { cancelled: true, simulated: true }
  }
  const instance = await getInstance()
  // cancel_at_cycle_end=1 keeps access until the paid period ends
  const result = await instance.subscriptions.cancel(subscriptionId, atCycleEnd)
  return { cancelled: true, status: result.status }
}

// ── Signature verification ────────────────────────────────────────────────────

/** Checkout handler signature for subscriptions: HMAC(payment_id|subscription_id). */
export function verifySubscriptionSignature({ paymentId, subscriptionId, signature, keySecret }) {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex')
  return timingSafeEqual(expected, signature)
}

/** Webhook signature: HMAC of the raw request body against the webhook secret. */
export function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return timingSafeEqual(expected, signature)
}

function timingSafeEqual(a, b) {
  if (!a || !b) return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Set a user's plan. expiresAt is authoritative (from the subscription's current_end
 * on webhooks, or now+duration for admin comps). isComp marks admin-granted access.
 */
export async function setUserPlan(db, userId, { plan, cycle, expiresAt, subscriptionId, status, isComp = false }) {
  await db.query(
    `UPDATE users SET
       plan = $1,
       plan_cycle = COALESCE($2, plan_cycle),
       plan_expires_at = $3,
       plan_started_at = COALESCE(plan_started_at, NOW()),
       razorpay_subscription_id = COALESCE($4, razorpay_subscription_id),
       subscription_status = COALESCE($5, subscription_status),
       is_comp = $6,
       updated_at = NOW()
     WHERE id = $7`,
    [plan, cycle || null, expiresAt ? new Date(expiresAt).toISOString() : null,
     subscriptionId || null, status || null, isComp, userId]
  )
}

/** Idempotent payment record — dedupes on razorpay_payment_id. */
export async function recordPayment(db, p) {
  await db.query(
    `INSERT INTO payments
       (id, user_id, razorpay_payment_id, razorpay_subscription_id, razorpay_order_id,
        plan, cycle, amount, currency, status, method, raw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = EXCLUDED.status, raw = EXCLUDED.raw`,
    [crypto.randomUUID(), p.userId || null, p.paymentId || null, p.subscriptionId || null,
     p.orderId || null, p.plan || null, p.cycle || null, p.amount || null,
     p.currency || 'INR', p.status || null, p.method || null,
     p.raw ? JSON.stringify(p.raw) : null]
  )
}

// ── Webhook dispatch ──────────────────────────────────────────────────────────

/**
 * Handle a verified Razorpay webhook event. Webhooks are the source of truth for
 * plan state — never trust the browser-side handler alone.
 */
export async function applyWebhookEvent(db, event) {
  const type = event?.event
  const sub = event?.payload?.subscription?.entity
  const payment = event?.payload?.payment?.entity

  // Resolve the local user + plan from the subscription notes we set at creation.
  const notes = sub?.notes || payment?.notes || {}
  const userId = notes.userId
  const planId = notes.planId || 'pro'
  const cycle = notes.cycle || 'monthly'

  switch (type) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed': {
      if (!userId) break
      const currentEnd = sub?.current_end ? sub.current_end * 1000 : null
      await setUserPlan(db, userId, {
        plan: planId,
        cycle,
        expiresAt: currentEnd,
        subscriptionId: sub?.id,
        status: 'active',
        isComp: false,
      })
      if (payment) {
        await recordPayment(db, {
          userId,
          paymentId: payment.id,
          subscriptionId: sub?.id,
          orderId: payment.order_id,
          plan: planId,
          cycle,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          raw: payment,
        })
      }
      logger.info('billing.webhook.activated', { userId, plan: planId, type })
      break
    }

    case 'subscription.cancelled':
    case 'subscription.halted':
    case 'subscription.completed':
    case 'subscription.paused': {
      if (!userId) break
      const statusMap = {
        'subscription.cancelled': 'cancelled',
        'subscription.halted': 'halted',
        'subscription.completed': 'completed',
        'subscription.paused': 'paused',
      }
      // Don't revoke immediately — the user keeps access until plan_expires_at lapses.
      await db.query(
        `UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2`,
        [statusMap[type], userId]
      )
      logger.security('billing.webhook.ended', { userId, type })
      break
    }

    case 'payment.failed': {
      if (payment) {
        await recordPayment(db, {
          userId,
          paymentId: payment.id,
          subscriptionId: sub?.id,
          plan: planId,
          cycle,
          amount: payment.amount,
          currency: payment.currency,
          status: 'failed',
          method: payment.method,
          raw: payment,
        }).catch(() => {})
      }
      logger.security('billing.webhook.payment_failed', { userId })
      break
    }

    default:
      logger.info('billing.webhook.ignored', { type })
  }
}
