import { Router } from 'express'
import { runTrendPipeline } from '../agents/pipeline.js'

const router = Router()

function cacheKey(niches, platforms) {
  const n = (niches || []).slice().sort().join(',')
  const p = (platforms || []).slice().sort().join(',')
  return `trends:${n}:${p}`
}

// GET /api/trends
router.get('/', async (req, res) => {
  try {
    const niches = req.query.niches ? req.query.niches.split(',').map(s => s.trim()).filter(Boolean) : []
    const platforms = req.query.platforms ? req.query.platforms.split(',').map(s => s.trim()).filter(Boolean) : []

    const redis = req.app.locals.redis
    const key = cacheKey(niches, platforms)

    if (redis) {
      try {
        const cached = await redis.get(key)
        if (cached) {
          console.log(`[trends] Cache hit: ${key}`)
          return res.json({ success: true, data: JSON.parse(cached), meta: { cached: true, processingMs: 0 } })
        }
      } catch (cacheErr) {
        console.error('[trends] Redis get error:', cacheErr.message)
      }
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, platforms)
    const processingMs = Date.now() - start
    const result = { trends, recommendations }

    if (redis) {
      try {
        await redis.set(key, JSON.stringify(result), 'EX', 7200)
        console.log(`[trends] Cached: ${key} (TTL 7200s)`)
      } catch (cacheErr) {
        console.error('[trends] Redis set error:', cacheErr.message)
      }
    }

    res.json({ success: true, data: result, meta: { cached: false, processingMs } })
  } catch (err) {
    console.error('[trends GET] Error:', err)
    res.status(500).json({ success: false, error: { code: 'TRENDS_ERROR', message: err.message || 'Failed to fetch trends' } })
  }
})

// POST /api/trends/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { niches = [], platforms = [] } = req.body
    const redis = req.app.locals.redis

    if (redis) {
      try {
        const key = cacheKey(niches, platforms)
        await redis.del(key)
        console.log(`[trends] Invalidated cache: ${key}`)
      } catch (cacheErr) {
        console.error('[trends] Redis del error:', cacheErr.message)
      }
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, platforms)
    const processingMs = Date.now() - start
    const result = { trends, recommendations }

    if (redis) {
      try {
        const key = cacheKey(niches, platforms)
        await redis.set(key, JSON.stringify(result), 'EX', 7200)
      } catch (cacheErr) {
        console.error('[trends] Redis set error after refresh:', cacheErr.message)
      }
    }

    res.json({ success: true, data: result, meta: { refreshed: true, processingMs } })
  } catch (err) {
    console.error('[trends POST /refresh] Error:', err)
    res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: err.message || 'Failed to refresh trends' } })
  }
})

export default router
