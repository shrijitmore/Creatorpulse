import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { getMemorySummary, buildCreatorContext } from '../lib/memory.js'
import { findSimilarScripts, getCoveredTopics } from '../lib/embeddings.js'

const router = Router()

// GET /api/memory/summary?niche=fitness — sidebar memory widget data
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { niche } = req.query
    const summary = await getMemorySummary(req.userId, niche || null)
    res.json({ success: true, data: summary })
  } catch (err) {
    console.error('[memory/summary]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// GET /api/memory/similar?topic=...&niche=... — find similar past scripts
router.get('/similar', requireAuth, async (req, res) => {
  try {
    const { topic, niche } = req.query
    if (!topic) return res.status(400).json({ success: false, error: { code: 'MISSING_TOPIC' } })

    const similar = await findSimilarScripts(req.userId, topic, 3)
    res.json({ success: true, data: { similar } })
  } catch (err) {
    console.error('[memory/similar]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// GET /api/memory/topics?niche=fitness — topics already covered
router.get('/topics', requireAuth, async (req, res) => {
  try {
    const { niche } = req.query
    const topics = await getCoveredTopics(req.userId, niche || null)
    res.json({ success: true, data: { topics } })
  } catch (err) {
    console.error('[memory/topics]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// POST /api/memory/context — full RAG context for script generation
router.post('/context', requireAuth, async (req, res) => {
  try {
    const { topicTitle, niche } = req.body
    if (!topicTitle) return res.status(400).json({ success: false, error: { code: 'MISSING_TOPIC' } })

    const context = await buildCreatorContext(req.userId, topicTitle, niche || 'general')
    res.json({ success: true, data: { context } })
  } catch (err) {
    console.error('[memory/context]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

export default router
