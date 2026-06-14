import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../lib/auth.js'
import { requireAdmin } from '../lib/adminAuth.js'
import { getDb } from '../db.js'
import { setUserPlan } from '../lib/billingService.js'
import { effectivePlan } from '../lib/plan.js'
import { logger } from '../lib/logger.js'
import { PLAN_IDS } from '../constants.js'
import { validate, VALID_CYCLES, COUPON_RE } from '../lib/validate.js'

const router = Router()

// Every admin route requires a signed-in user who is on the admin allowlist.
router.use(requireAuth)
router.use(requireAdmin)

async function audit(db, req, action, targetUserId, detail = {}) {
  await db.query(
    `INSERT INTO admin_audit (id, admin_clerk_id, action, target_user_id, detail)
     VALUES ($1, $2, $3, $4, $5)`,
    [crypto.randomUUID(), req.clerkId || 'dev', action, targetUserId || null, JSON.stringify(detail)]
  ).catch(err => logger.error('admin.audit_error', { message: err.message }))
}

function shapeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || null,
    planRaw: row.plan || 'free',
    plan: effectivePlan(row),
    planCycle: row.plan_cycle || 'monthly',
    planExpiresAt: row.plan_expires_at || null,
    subscriptionStatus: row.subscription_status || null,
    isComp: row.is_comp || false,
    createdAt: row.created_at,
  }
}

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb()
    const [users, payments, scripts] = await Promise.all([
      db.query(`SELECT plan, plan_expires_at FROM users`).catch(() => ({ rows: [] })),
      db.query(`SELECT amount, status, created_at FROM payments WHERE status = 'captured'`).catch(() => ({ rows: [] })),
      db.query(`SELECT COUNT(*) AS c FROM scripts`).catch(() => ({ rows: [{ c: 0 }] })),
    ])

    const byPlan = { free: 0, pro: 0, agency: 0 }
    for (const u of users.rows) byPlan[effectivePlan(u)] = (byPlan[effectivePlan(u)] || 0) + 1

    const revenuePaise = payments.rows.reduce((sum, p) => sum + (p.amount || 0), 0)

    res.json({
      success: true,
      data: {
        totalUsers: users.rows.length,
        byPlan,
        paidUsers: byPlan.pro + byPlan.agency,
        totalPayments: payments.rows.length,
        revenue: Math.round(revenuePaise / 100),
        totalScripts: parseInt(scripts.rows[0]?.c || 0),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: err.message } })
  }
})

// GET /api/admin/users?search=&limit=
router.get('/users', async (req, res) => {
  try {
    const search = (req.query.search || '').toString().trim().slice(0, 100)
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const db = await getDb()

    const result = search
      ? await db.query(
          `SELECT id, email, name, plan, plan_cycle, plan_expires_at, subscription_status, is_comp, created_at
           FROM users WHERE email ILIKE $1 OR id ILIKE $1 OR name ILIKE $1
           ORDER BY created_at DESC LIMIT $2`,
          [`%${search}%`, limit]
        )
      : await db.query(
          `SELECT id, email, name, plan, plan_cycle, plan_expires_at, subscription_status, is_comp, created_at
           FROM users ORDER BY created_at DESC LIMIT $1`,
          [limit]
        )

    res.json({ success: true, data: { users: result.rows.map(shapeUser) } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'USERS_ERROR', message: err.message } })
  }
})

// PATCH /api/admin/users/:id/plan — grant/override a plan (comp access or discount).
// body: { plan, cycle?, days? }  days omitted → 1 year for paid, null for free.
router.patch(
  '/users/:id/plan',
  validate({
    body: {
      plan:  { required: true, type: 'string', oneOf: PLAN_IDS },
      cycle: { type: 'string', oneOf: VALID_CYCLES },
      days:  { type: 'number', min: 0, max: 3650 },
    },
  }),
  async (req, res) => {
    try {
      const userId = req.params.id
      const { plan, cycle = 'monthly', days } = req.body
      const db = await getDb()

      const exists = (await db.query('SELECT id FROM users WHERE id = $1', [userId])).rows[0]
      if (!exists) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } })

      if (plan === 'free') {
        await setUserPlan(db, userId, { plan: 'free', cycle: 'monthly', expiresAt: null, status: null, isComp: false })
      } else {
        const grantDays = days != null ? days : 365
        const expiresAt = Date.now() + grantDays * 24 * 60 * 60 * 1000
        await setUserPlan(db, userId, { plan, cycle, expiresAt, status: 'comp', isComp: true })
      }

      await audit(db, req, 'set_plan', userId, { plan, cycle, days })
      const updated = (await db.query(
        `SELECT id, email, name, plan, plan_cycle, plan_expires_at, subscription_status, is_comp, created_at FROM users WHERE id = $1`,
        [userId]
      )).rows[0]
      res.json({ success: true, data: { user: shapeUser(updated) } })
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'SET_PLAN_ERROR', message: err.message } })
    }
  }
)

// GET /api/admin/payments?limit=
router.get('/payments', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const db = await getDb()
    const result = await db.query(
      `SELECT p.id, p.user_id, u.email, p.razorpay_payment_id, p.plan, p.cycle,
              p.amount, p.currency, p.status, p.method, p.created_at
       FROM payments p LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT $1`,
      [limit]
    )
    res.json({ success: true, data: { payments: result.rows } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'PAYMENTS_ERROR', message: err.message } })
  }
})

// ── Coupons (admin-issued access codes) ─────────────────────────────────────────

// GET /api/admin/coupons
router.get('/coupons', async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.query(`SELECT * FROM coupons ORDER BY created_at DESC LIMIT 200`)
    res.json({ success: true, data: { coupons: result.rows } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'COUPONS_ERROR', message: err.message } })
  }
})

// POST /api/admin/coupons
router.post(
  '/coupons',
  validate({
    body: {
      code:           { required: true, type: 'string', maxLength: 50, pattern: COUPON_RE },
      plan:           { type: 'string', oneOf: PLAN_IDS },
      durationDays:   { type: 'number', min: 1, max: 3650 },
      maxRedemptions: { type: 'number', min: 1, max: 100000 },
      note:           { type: 'string', maxLength: 200 },
    },
  }),
  async (req, res) => {
    try {
      const code = req.body.code.trim().toUpperCase()
      const { plan = 'pro', durationDays = 30, maxRedemptions = null, note = null } = req.body
      const db = await getDb()

      await db.query(
        `INSERT INTO coupons (code, kind, plan, duration_days, max_redemptions, note, created_by)
         VALUES ($1, 'free_access', $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET plan = EXCLUDED.plan, duration_days = EXCLUDED.duration_days,
           max_redemptions = EXCLUDED.max_redemptions, note = EXCLUDED.note, active = TRUE`,
        [code, plan, durationDays, maxRedemptions, note, req.clerkId || 'dev']
      )
      await audit(db, req, 'create_coupon', null, { code, plan, durationDays })
      const row = (await db.query('SELECT * FROM coupons WHERE code = $1', [code])).rows[0]
      res.json({ success: true, data: { coupon: row } })
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'COUPON_CREATE_ERROR', message: err.message } })
    }
  }
)

// PATCH /api/admin/coupons/:code — toggle active
router.patch('/coupons/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase()
    const active = Boolean(req.body.active)
    const db = await getDb()
    const result = await db.query('UPDATE coupons SET active = $1 WHERE code = $2 RETURNING *', [active, code])
    if (!result.rows.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found' } })
    await audit(db, req, 'toggle_coupon', null, { code, active })
    res.json({ success: true, data: { coupon: result.rows[0] } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'COUPON_UPDATE_ERROR', message: err.message } })
  }
})

export default router
