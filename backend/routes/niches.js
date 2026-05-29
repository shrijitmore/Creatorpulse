import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { interpretNiche } from '../lib/nicheService.js'
import { aiAssistLimiter, requireBrowserLike } from '../lib/limiters.js'
import { validate, sanitizeText } from '../lib/validate.js'

const router = Router()

// POST /api/niches/interpret — AI interprets free-text niche
router.post(
  '/interpret',
  requireAuth,
  requireBrowserLike,
  aiAssistLimiter,
  validate({ body: { query: { required: true, type: 'string', minLength: 1, maxLength: 200 } } }),
  async (req, res) => {
  try {
    const query = sanitizeText(req.body.query, 200)
    const result = await interpretNiche(query)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[niches/interpret]', err.message)
    res.status(500).json({ success: false, error: { code: 'INTERPRET_ERROR', message: err.message } })
  }
  }
)

export default router
