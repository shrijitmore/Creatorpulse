import crypto from 'crypto'
import { PLAN_AMOUNTS, COUPON_DISCOUNTS } from '../constants.js'

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  return { keyId, keySecret, available: Boolean(keyId && keySecret) }
}

export function calcAmount(planId, cycle, coupon = '') {
  const base = PLAN_AMOUNTS[planId]?.[cycle] ?? PLAN_AMOUNTS[planId]?.monthly
  if (!base) throw new Error(`Unknown plan: ${planId}`)
  const discount = COUPON_DISCOUNTS[coupon?.trim().toUpperCase()] ?? 0
  return Math.round(base * (1 - discount))
}

export async function createRazorpayOrder({ planId, cycle, coupon, userId }) {
  const { keyId, keySecret, available } = getRazorpayConfig()
  const amount = calcAmount(planId, cycle, coupon)

  if (!available) {
    return {
      simulated: true,
      orderId: `order_sim_${Date.now()}`,
      amount,
      currency: 'INR',
      keyId: 'rzp_test_placeholder',
    }
  }

  const Razorpay = (await import('razorpay')).default
  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret })
  const order = await instance.orders.create({
    amount,
    currency: 'INR',
    receipt: `cp_${userId}_${Date.now()}`,
    notes: { userId, planId, cycle, coupon },
  })

  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId }
}

export function verifySignature({ orderId, paymentId, signature, keySecret }) {
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expected === signature
}

export async function savePlan(db, userId, planId, cycle) {
  const now = Date.now()
  const msPerMonth = 30 * 24 * 60 * 60 * 1000
  const expiresAt = new Date(now + (cycle === 'yearly' ? 12 * msPerMonth : msPerMonth))
  await db.query(
    `UPDATE users SET plan = $1, plan_cycle = $2, plan_expires_at = $3, updated_at = NOW() WHERE id = $4`,
    [planId, cycle, expiresAt.toISOString(), userId]
  )
}
