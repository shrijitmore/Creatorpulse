import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import crypto from 'crypto'

const router = Router()

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  return { keyId, keySecret, available: Boolean(keyId && keySecret) }
}

const PLAN_AMOUNTS = {
  pro:    { monthly: 99900,   yearly: 958800  }, // paise (₹999/mo, ₹7990/yr ≈ 20% off)
  agency: { monthly: 499900,  yearly: 4799040 },
}

// POST /api/billing/create-order
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { planId, cycle = 'monthly', coupon = '' } = req.body

    if (!planId || !PLAN_AMOUNTS[planId]) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Unknown plan ID' } })
    }

    const { keyId, keySecret, available } = getRazorpayConfig()

    let amount = PLAN_AMOUNTS[planId][cycle] || PLAN_AMOUNTS[planId].monthly

    // Simple coupon: LAUNCH20 → 20% off
    if (coupon?.trim().toUpperCase() === 'LAUNCH20') {
      amount = Math.round(amount * 0.8)
    }

    if (!available) {
      // Simulated order for dev/demo — no real charge
      return res.json({
        success: true,
        data: {
          simulated: true,
          orderId: `order_sim_${Date.now()}`,
          amount,
          currency: 'INR',
          keyId: 'rzp_test_placeholder',
        }
      })
    }

    const Razorpay = (await import('razorpay')).default
    const instance = new Razorpay({ key_id: keyId, key_secret: keySecret })

    const order = await instance.orders.create({
      amount,
      currency: 'INR',
      receipt: `cp_${req.userId}_${Date.now()}`,
      notes: { userId: req.userId, planId, cycle, coupon },
    })

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      }
    })
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

    if (available) {
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      if (expected !== signature) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } })
      }
    }

    // TODO: persist subscription to DB (plans table) and update user's plan field
    console.log(`[billing] Payment verified — user=${req.userId} plan=${planId} cycle=${cycle} payment=${paymentId}`)

    res.json({ success: true, data: { planId, cycle, paymentId } })
  } catch (err) {
    console.error('[billing/verify]', err.message)
    res.status(500).json({ success: false, error: { code: 'VERIFY_ERROR', message: err.message } })
  }
})

export default router
