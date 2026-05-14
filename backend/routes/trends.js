import { Router } from 'express'
import { runTrendPipeline } from '../agents/pipeline.js'
import { MOCK_TRENDS, MOCK_RECOMMENDATIONS } from '../mockData.js'

const router = Router()

// Detect mock mode
function isMockMode() {
  if (process.env.MOCK_MODE === 'true') return true
  const hasAnyKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.APIFY_API_KEY ||
    process.env.RAPIDAPI_KEY
  return !hasAnyKey
}

// Build cache key
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

    // Mock mode
    if (isMockMode()) {
      return res.json({
        success: true,
        data: {
          trends: MOCK_TRENDS,
          recommendations: MOCK_RECOMMENDATIONS
        },
        meta: { mode: 'mock', processingMs: 0 }
      })
    }

    const redis = req.app.locals.redis
    const key = cacheKey(niches, platforms)

    // Check Redis cache
    if (redis) {
      try {
        const cached = await redis.get(key)
        if (cached) {
          console.log(`[trends] Cache hit: ${key}`)
          return res.json({
            success: true,
            data: JSON.parse(cached),
            meta: { mode: 'live', cached: true, processingMs: 0 }
          })
        }
      } catch (cacheErr) {
        console.error('[trends] Redis get error:', cacheErr.message)
      }
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, platforms)
    const processingMs = Date.now() - start

    const result = { trends, recommendations }

    // Cache result
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(result), 'EX', 7200)
        console.log(`[trends] Cached: ${key} (TTL 7200s)`)
      } catch (cacheErr) {
        console.error('[trends] Redis set error:', cacheErr.message)
      }
    }

    res.json({
      success: true,
      data: result,
      meta: { mode: 'live', cached: false, processingMs }
    })
  } catch (err) {
    console.error('[trends GET] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'TRENDS_ERROR', message: err.message || 'Failed to fetch trends' }
    })
  }
})

// POST /api/trends/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { niches = [], platforms = [] } = req.body

    const redis = req.app.locals.redis

    // Invalidate cache
    if (redis) {
      try {
        const key = cacheKey(niches, platforms)
        await redis.del(key)
        console.log(`[trends] Invalidated cache: ${key}`)
      } catch (cacheErr) {
        console.error('[trends] Redis del error:', cacheErr.message)
      }
    }

    // Mock mode
    if (isMockMode()) {
      return res.json({
        success: true,
        data: {
          trends: MOCK_TRENDS,
          recommendations: MOCK_RECOMMENDATIONS
        },
        meta: { mode: 'mock', refreshed: true }
      })
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, platforms)
    const processingMs = Date.now() - start

    const result = { trends, recommendations }

    // Re-cache
    if (redis) {
      try {
        const key = cacheKey(niches, platforms)
        await redis.set(key, JSON.stringify(result), 'EX', 7200)
      } catch (cacheErr) {
        console.error('[trends] Redis set error after refresh:', cacheErr.message)
      }
    }

    res.json({
      success: true,
      data: result,
      meta: { mode: 'live', refreshed: true, processingMs }
    })
  } catch (err) {
    console.error('[trends POST /refresh] Error:', err)
    res.status(500).json({
      success: false,
      error: { code: 'REFRESH_ERROR', message: err.message || 'Failed to refresh trends' }
    })
  }
})

export default router
