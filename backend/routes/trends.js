import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { getCreatorProfile } from '../lib/memory.js'
import { getDb } from '../db.js'
import { trendsRefreshLimiter } from '../lib/limiters.js'
import { validate, NICHE_RE } from '../lib/validate.js'
import { nichePoolKey, warmNiche } from '../jobs/scrapeJob.js'
import { logger } from '../lib/logger.js'

const router = Router()
router.use(requireAuth)

const SAMPLE_SIZE = 10
const WARM_LOCK_TTL = 60 // seconds — dedup concurrent warms for the same niche

async function getUserNiches(userId) {
  try {
    const db = await getDb()
    const result = await db.query('SELECT niches FROM users WHERE id = $1', [userId])
    const niches = result.rows?.[0]?.niches
    if (Array.isArray(niches) && niches.length > 0) return niches
  } catch {}
  return []
}

async function getUserContext(userId) {
  try {
    const profile = await getCreatorProfile(userId)
    if (!profile) return {}
    const platforms = Array.isArray(profile.platforms) ? profile.platforms : []
    const primaryPlatform = platforms[0]?.toLowerCase().replace(/\s.*/, '') || null
    return { primaryPlatform, languageStyle: profile.language_style || 'English' }
  } catch { return {} }
}

// Fisher–Yates shuffle (new array) — used to sample a fresh 10 each request.
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Read the cached per-niche pools, merge their trends, and report which niches
 * have no pool yet. NEVER scrapes — pure cache read.
 */
async function readPools(redis, niches) {
  if (!redis || !niches.length) return { pool: [], missing: [...niches] }
  let raws = []
  try {
    raws = await redis.mget(...niches.map(nichePoolKey))
  } catch (e) {
    logger.warn('trends.redis_mget_error', { message: e.message })
    raws = []
  }
  const pool = []
  const missing = []
  niches.forEach((niche, i) => {
    const raw = raws[i]
    if (!raw) { missing.push(niche); return }
    try {
      const parsed = JSON.parse(raw)
      for (const t of (parsed.trends || [])) pool.push(t)
    } catch { missing.push(niche) }
  })
  return { pool, missing }
}

/**
 * Fire a deduped background warm for each missing niche. A Redis SET NX lock
 * means 1000 concurrent cache-misses for the same niche trigger ONE scrape, not
 * 1000 — so external API cost stays decoupled from user count.
 */
async function warmMissing(redis, niches) {
  if (!redis || !niches.length) return
  for (const niche of niches) {
    try {
      const acquired = await redis.set(`lock:warm:${niche}`, '1', 'EX', WARM_LOCK_TTL, 'NX')
      if (acquired) {
        logger.info('trends.warm_start', { niche })
        warmNiche(niche, redis).finally(() => redis.del(`lock:warm:${niche}`).catch(() => {}))
      }
    } catch (e) {
      logger.warn('trends.warm_lock_error', { niche, message: e.message })
    }
  }
}

/** Sample SAMPLE_SIZE trends + top-3 recommendations from the merged pool. */
function buildResponse(pool, languageStyle) {
  const personalized = filterByLanguage({ trends: pool }, languageStyle).trends
  const sampled = shuffle(personalized).slice(0, SAMPLE_SIZE)
  const recommendations = [...personalized].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3)
  return { trends: sampled, recommendations }
}

// GET /api/trends — cache-only. Samples 10 from the cached pools; warms missing
// niches in the background (deduped). Never live-scrapes on the user path.
router.get('/', async (req, res) => {
  try {
    const rawNiches = req.query.niches
      ? req.query.niches.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const invalidNiche = rawNiches.find(n => n.length > 50 || !NICHE_RE.test(n))
    if (invalidNiche) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_NICHE', message: `Invalid niche value: "${invalidNiche}"` } })
    }
    if (rawNiches.length > 10) {
      return res.status(400).json({ success: false, error: { code: 'TOO_MANY_NICHES', message: 'Maximum 10 niches per request' } })
    }

    const [niches, userCtx] = await Promise.all([
      rawNiches.length > 0 ? Promise.resolve(rawNiches) : getUserNiches(req.userId),
      getUserContext(req.userId),
    ])

    const redis = req.app.locals.redis
    const { pool, missing } = await readPools(redis, niches)
    if (missing.length) warmMissing(redis, missing) // fire-and-forget, deduped

    const { trends, recommendations } = buildResponse(pool, userCtx.languageStyle)
    const warming = pool.length === 0 && missing.length > 0

    res.json({
      success: true,
      data: { trends, recommendations },
      meta: { cached: true, sampled: trends.length, warming, missing },
    })
  } catch (err) {
    logger.error('trends.get_error', { message: err.message })
    res.status(500).json({ success: false, error: { code: 'TRENDS_ERROR', message: err.message } })
  }
})

// POST /api/trends/refresh — re-sample a DIFFERENT 10 from the SAME cached pools.
// Zero external API calls, zero quota. Warms missing niches in the background.
router.post(
  '/refresh',
  trendsRefreshLimiter,
  validate({
    body: {
      niches: { type: 'array', maxItems: 10, itemType: 'string', itemMaxLength: 50, itemPattern: NICHE_RE },
    },
  }),
  async (req, res) => {
    try {
      const { niches: bodyNiches = [] } = req.body
      const [niches, userCtx] = await Promise.all([
        bodyNiches.length > 0 ? Promise.resolve(bodyNiches) : getUserNiches(req.userId),
        getUserContext(req.userId),
      ])

      const redis = req.app.locals.redis
      const { pool, missing } = await readPools(redis, niches)
      if (missing.length) warmMissing(redis, missing)

      const { trends, recommendations } = buildResponse(pool, userCtx.languageStyle)
      const warming = pool.length === 0 && missing.length > 0

      res.json({
        success: true,
        data: { trends, recommendations },
        meta: { refreshed: true, sampled: trends.length, warming, missing },
      })
    } catch (err) {
      logger.error('trends.refresh_error', { message: err.message })
      res.status(500).json({ success: false, error: { code: 'REFRESH_ERROR', message: err.message } })
    }
  }
)

// ── Language personalisation (post-cache) ─────────────────────────────────────

const REGIONAL_KEYWORDS = {
  hindi:    ['india', 'indian', 'desi', 'bollywood', 'rupee', 'crore', 'lakh', 'ipl'],
  hinglish: ['india', 'indian', 'desi', 'bhai', 'yaar'],
  regional: ['india', 'indian', 'desi'],
}

function filterByLanguage(result, languageStyle) {
  const lang = (languageStyle || 'english').toLowerCase()
  if (lang === 'english') return result
  const keywords = REGIONAL_KEYWORDS[lang] || REGIONAL_KEYWORDS.regional
  const boost = t => keywords.some(k => t.title?.toLowerCase().includes(k) || t.summary?.toLowerCase().includes(k))
  const boosted = (result.trends || []).map(t => boost(t) ? { ...t, score: Math.min(99, t.score + 8) } : t)
    .sort((a, b) => b.score - a.score)
  return { ...result, trends: boosted }
}

export default router
