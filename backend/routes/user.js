import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../lib/auth.js'
import { isAdminRequest } from '../lib/adminAuth.js'
import { effectivePlan } from '../lib/plan.js'
import { validate, NICHE_RE } from '../lib/validate.js'

const router = Router()

// GET /api/auth/me — returns the authenticated user's profile from DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.query(
      'SELECT id, email, niches, plan, plan_cycle, plan_expires_at, subscription_status, created_at FROM users WHERE id = $1',
      [req.userId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      })
    }

    const row = result.rows[0]
    const user = {
      id: row.id,
      email: row.email,
      niches: row.niches,
      plan: effectivePlan(row),          // what limits actually apply
      planRaw: row.plan || 'free',
      planCycle: row.plan_cycle || 'monthly',
      planExpiresAt: row.plan_expires_at || null,
      subscriptionStatus: row.subscription_status || null,
      isAdmin: isAdminRequest(req),
      createdAt: row.created_at,
    }

    res.json({ success: true, data: { user } })
  } catch (err) {
    console.error('[user/me] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' }
    })
  }
})

// PATCH /api/user/niches
router.patch('/niches', requireAuth, validate({
  body: {
    niches: { required: true, type: 'array', minItems: 1, maxItems: 20, itemType: 'string', itemMaxLength: 50, itemPattern: NICHE_RE },
  },
}), async (req, res) => {
  try {
    const { niches } = req.body
    const cleanNiches = niches.map(n => String(n).toLowerCase().trim()).filter(Boolean)

    const db = await getDb()
    await db.query('UPDATE users SET niches = $1, updated_at = NOW() WHERE id = $2', [cleanNiches, req.userId])

    res.json({ success: true, data: { niches: cleanNiches } })
  } catch (err) {
    console.error('[user/niches] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update niches' }
    })
  }
})

export default router
