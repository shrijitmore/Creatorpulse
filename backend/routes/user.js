import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

const HARDCODED_USER = {
  id: 'user-1',
  email: 'alex@trendforge.io',
  niches: ['fitness', 'tech']
}

// Track niches in memory as fallback (updated by PATCH)
let currentNiches = ['fitness', 'tech']

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'email and password are required' }
      })
    }

    if (email !== 'alex@trendforge.io' || password !== 'demo123') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      })
    }

    // Fetch latest niches from DB
    let niches = currentNiches
    try {
      const db = await getDb()
      const result = await db.query('SELECT niches FROM users WHERE id = $1', ['user-1'])
      if (result.rows && result.rows.length > 0) {
        niches = result.rows[0].niches || currentNiches
      }
    } catch (dbErr) {
      console.error('[user/login] DB error:', dbErr.message)
    }

    res.json({
      success: true,
      data: {
        user: { ...HARDCODED_USER, niches }
      }
    })
  } catch (err) {
    console.error('[user/login] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Login failed' }
    })
  }
})

// GET /api/auth/me
router.get('/auth/me', async (req, res) => {
  try {
    let niches = currentNiches
    try {
      const db = await getDb()
      const result = await db.query('SELECT niches FROM users WHERE id = $1', ['user-1'])
      if (result.rows && result.rows.length > 0) {
        niches = result.rows[0].niches || currentNiches
      }
    } catch (dbErr) {
      console.error('[user/me] DB error:', dbErr.message)
    }

    res.json({
      success: true,
      data: {
        user: { ...HARDCODED_USER, niches }
      }
    })
  } catch (err) {
    console.error('[user/me] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to fetch user' }
    })
  }
})

// PATCH /api/user/niches
router.patch('/niches', async (req, res) => {
  try {
    const { niches } = req.body

    if (!niches || !Array.isArray(niches)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'niches must be an array of strings' }
      })
    }

    const cleanNiches = niches.map(n => String(n).toLowerCase().trim()).filter(Boolean)

    if (cleanNiches.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'niches array cannot be empty' }
      })
    }

    // Update DB
    try {
      const db = await getDb()
      await db.query('UPDATE users SET niches = $1 WHERE id = $2', [cleanNiches, 'user-1'])
    } catch (dbErr) {
      console.error('[user/niches] DB update error:', dbErr.message)
    }

    // Update in-memory fallback
    currentNiches = cleanNiches

    res.json({
      success: true,
      data: {
        user: {
          id: HARDCODED_USER.id,
          email: HARDCODED_USER.email,
          niches: cleanNiches
        }
      }
    })
  } catch (err) {
    console.error('[user/niches] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Failed to update niches' }
    })
  }
})

export default router
