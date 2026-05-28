import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { interpretNiche } from '../lib/nicheService.js'

const router = Router()

// POST /api/niches/interpret — AI interprets free-text niche
router.post('/interpret', requireAuth, async (req, res) => {
  try {
    const { query } = req.body
    if (!query?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_QUERY', message: 'query is required' } })
    }
    const result = await interpretNiche(query)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[niches/interpret]', err.message)
    res.status(500).json({ success: false, error: { code: 'INTERPRET_ERROR', message: err.message } })
  }
})

export default router
