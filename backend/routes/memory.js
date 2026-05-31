import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { getMemorySummary, buildCreatorContext } from '../lib/memory.js'
import { findSimilarScripts, getCoveredTopics } from '../lib/embeddings.js'
import { transcribeAudio } from '../lib/gemini.js'
import { transcribeLimiter, requireBrowserLike } from '../lib/limiters.js'
import { validate } from '../lib/validate.js'

const router = Router()

// GET /api/memory/summary?niche=fitness — sidebar memory widget data
router.get('/summary', requireAuth, validate({ query: { niche: { type: 'string', maxLength: 50 } } }), async (req, res) => {
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
router.get('/similar', requireAuth, validate({ query: { topic: { required: true, type: 'string', maxLength: 200 }, niche: { type: 'string', maxLength: 50 } } }), async (req, res) => {
  try {
    const { topic, niche } = req.query

    const similar = await findSimilarScripts(req.userId, topic, 3)
    res.json({ success: true, data: { similar } })
  } catch (err) {
    console.error('[memory/similar]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// GET /api/memory/topics?niche=fitness — topics already covered
router.get('/topics', requireAuth, validate({ query: { niche: { type: 'string', maxLength: 50 } } }), async (req, res) => {
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
router.post('/context', requireAuth, validate({ body: { topicTitle: { required: true, type: 'string', maxLength: 200 }, niche: { type: 'string', maxLength: 50 } } }), async (req, res) => {
  try {
    const { topicTitle, niche } = req.body

    const context = await buildCreatorContext(req.userId, topicTitle, niche || 'general')
    res.json({ success: true, data: { context } })
  } catch (err) {
    console.error('[memory/context]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// POST /api/memory/transcribe-voice — transcribe audio clip + extract voice traits via Gemini
router.post(
  '/transcribe-voice',
  requireAuth,
  requireBrowserLike,
  transcribeLimiter,
  validate({
    body: {
      audioBase64: { required: true, type: 'base64', maxBytes: 15 * 1024 * 1024 },
      mimeType:    { type: 'audioMime' },
    },
  }),
  async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body
    const result = await transcribeAudio(audioBase64, mimeType)
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[memory/transcribe-voice]', err.message)
    res.status(500).json({ success: false, error: { code: 'TRANSCRIBE_ERROR', message: err.message } })
  }
  }
)

export default router
