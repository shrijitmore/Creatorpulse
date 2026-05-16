import { Router } from 'express'
import { runTrendPipeline } from '../agents/pipeline.js'
import { requireAuth } from '../lib/auth.js'
import { getDb } from '../db.js'
import { CACHE_TTL } from '../constants.js'

const router = Router()
router.use(requireAuth)

/**
 * SHARED niche cache key — same key for all users with same niches.
 * 1000 fitness users → 1 API call per TTL window, not 1000.
 */
function nicheCacheKey(niches) {
  return `trends:niche:${niches.slice().sort().join(',')}`
}

/**
 * Dynamic TTL based on dominant signal in results.
 * Viral trends die fast → 1h. New trends build slowly → 10h.
 */
function getTTL(trends = []) {
  const counts = { viral: 0, rising: 0, new: 0 }
  for (const t of trends) counts[t.signal] = (counts[t.signal] || 0) + 1
  if (counts.viral > trends.length * 0.3) return CACHE_TTL.viral
  if (counts.rising > trends.length * 0.4) return CACHE_TTL.rising
  return CACHE_TTL.new
}

async function getUserNiches(userId) {
  try {
    const db = await getDb()
    const result = await db.query('SELECT niches FROM users WHERE id = $1', [userId])
    const niches = result.rows?.[0]?.niches
    if (Array.isArray(niches) && niches.length > 0) return niches
  } catch {}
  return []
}

// GET /api/trends
router.get('/', async (req, res) => {
  try {
    const queryNiches = req.query.niches
      ? req.query.niches.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const niches = queryNiches.length > 0 ? queryNiches : await getUserNiches(req.userId)
    const redis = req.app.locals.redis

    // Check shared niche cache first
    const sharedKey = nicheCacheKey(niches)
    if (redis) {
      try {
        const cached = await redis.get(sharedKey)
        if (cached) {
          console.log(`[trends] Shared cache hit: ${sharedKey}`)
          return res.json({
            success: true,
            data: JSON.parse(cached),
            meta: { cached: true, processingMs: 0, sharedCache: true }
          })
        }
      } catch (e) { console.error('[trends] Redis get error:', e.message) }
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, [])
    const processingMs = Date.now() - start
    const result = { trends, recommendations }

    // Cache with dynamic TTL based on signal composition
    if (redis) {
      try {
        const ttl = getTTL(trends)
        await redis.set(sharedKey, JSON.stringify(result), 'EX', ttl)
        console.log(`[trends] Cached ${sharedKey} TTL=${ttl}s (${Math.round(ttl/3600)}h) — ${trends.length} trends`)
      } catch (e) { console.error('[trends] Redis set error:', e.message) }
    }

    res.json({ success: true, data: result, meta: { cached: false, processingMs, niches } })
  } catch (err) {
    console.error('[trends GET] Error:', err)
    res.status(500).json({ success: false, error: { code: 'TRENDS_ERROR', message: err.message } })
  }
})

// POST /api/trends/refresh — bypasses cache, re-scrapes, updates shared cache
router.post('/refresh', async (req, res) => {
  try {
    const { niches: bodyNiches = [] } = req.body
    const niches = bodyNiches.length > 0 ? bodyNiches : await getUserNiches(req.userId)
    const redis = req.app.locals.redis
    const sharedKey = nicheCacheKey(niches)

    // Invalidate shared cache for these niches
    if (redis) {
      try { await redis.del(sharedKey) } catch {}
    }

    const start = Date.now()
    const { trends, recommendations } = await runTrendPipeline(niches, [])
    const processingMs = Date.now() - start
    const result = { trends, recommendations }

    if (redis) {
      try {
        const ttl = getTTL(trends)
        await redis.set(sharedKey, JSON.stringify(result), 'EX', ttl)
        console.log(`[trends] Refreshed ${sharedKey} TTL=${ttl}s`)
      } catch {}
    }

    res.json({ success: true, data: result, meta: { refreshed: true, processingMs, niches } })
  } catch (err) {
    console.error('[trends POST /refresh] Error:', err)
    res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: err.message } })
  }
})

export default router
