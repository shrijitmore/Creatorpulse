import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { PLAN_AMOUNTS } from '../constants.js'
import { createRazorpayOrder, verifySignature, savePlan, getRazorpayConfig } from '../lib/billingService.js'
import { getDb } from '../db.js'

const router = Router()

// POST /api/billing/create-order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { planId, cycle = 'monthly', coupon = '' } = req.body

    if (!planId || !PLAN_AMOUNTS[planId]) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
    }

    const result = await createRazorpayOrder({ planId, cycle, coupon, userId: req.userId })
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[billing/create-order]', err.message)
    res.status(500).json({ success: false, error: { code: 'ORDER_ERROR', message: err.message } })
  }
})

// POST /api/billing/verify
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId, cycle } = req.body

    const { keySecret, available } = getRazorpayConfig()

    if (available && !verifySignature({ orderId, paymentId, signature, keySecret })) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } })
    }

    const db = await getDb()
    await savePlan(db, req.userId, planId, cycle)

    res.json({ success: true, data: { planId, cycle, paymentId } })
  } catch (err) {
    console.error('[billing/verify]', err.message)
    res.status(500).json({ success: false, error: { code: 'VERIFY_ERROR', message: err.message } })
  }
})

export default router
