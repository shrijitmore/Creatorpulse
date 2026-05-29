import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { PLAN_AMOUNTS } from '../constants.js'
import { createRazorpayOrder, verifySignature, savePlan, getRazorpayConfig } from '../lib/billingService.js'
import { getDb } from '../db.js'
import { validate, VALID_CYCLES, COUPON_RE, RAZORPAY_ORDER_RE, RAZORPAY_PAYMENT_RE } from '../lib/validate.js'

const router = Router()

const VALID_PLAN_IDS = Object.keys(PLAN_AMOUNTS)

// POST /api/billing/create-order
router.post(
  '/create-order',
  requireAuth,
  validate({
    body: {
      planId: { required: true, type: 'string', maxLength: 20 },
      cycle:  { type: 'string', oneOf: VALID_CYCLES },
      coupon: { type: 'string', maxLength: 50, pattern: COUPON_RE },
    },
  }),
  async (req, res) => {
    try {
      const { planId, cycle = 'monthly', coupon = '' } = req.body

      if (!VALID_PLAN_IDS.includes(planId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
      }

      const result = await createRazorpayOrder({ planId, cycle, coupon, userId: req.userId })
      res.json({ success: true, data: result })
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'ORDER_ERROR', message: err.message } })
    }
  }
)

// POST /api/billing/verify
router.post(
  '/verify',
  requireAuth,
  validate({
    body: {
      orderId:   { required: true, type: 'string', maxLength: 64, pattern: RAZORPAY_ORDER_RE },
      paymentId: { required: true, type: 'string', maxLength: 64, pattern: RAZORPAY_PAYMENT_RE },
      signature: { required: true, type: 'string', maxLength: 128 },
      planId:    { required: true, type: 'string', maxLength: 20 },
      cycle:     { required: true, type: 'string', oneOf: VALID_CYCLES },
    },
  }),
  async (req, res) => {
    try {
      const { orderId, paymentId, signature, planId, cycle } = req.body

      if (!VALID_PLAN_IDS.includes(planId)) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
      }

      const { keySecret, available } = getRazorpayConfig()

      if (available && !verifySignature({ orderId, paymentId, signature, keySecret })) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } })
      }

      const db = await getDb()
      await savePlan(db, req.userId, planId, cycle)

      res.json({ success: true, data: { planId, cycle, paymentId } })
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'VERIFY_ERROR', message: err.message } })
    }
  }
)

export default router
