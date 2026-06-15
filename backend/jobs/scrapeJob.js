/**
 * Background scraping job — fills a per-niche Redis "pool" so user requests never
 * trigger live scraping. External API cost is decoupled from user count: only the
 * cron (or a deduped lazy warm) calls YouTube/Reddit; everyone reads the cache.
 *
 * Cache shape: one key per single niche — `trends:niche:{niche}` → { trends, recommendations }.
 * Each pool holds up to ~50 items; the trends route samples 10 from it per request.
 *
 * Drivers:
 *   - In-process timers (startScrapeJob) — single long-lived process only (dev).
 *   - Cloud Scheduler → POST /api/internal/scrape (serverless/autoscaling).
 */
import { runTrendPipeline } from '../agents/pipeline.js'
import { NICHES_DEFAULT, CACHE_TTL } from '../constants.js'
import { logger } from '../lib/logger.js'

// Niche tiers by refresh cadence.
export const SCRAPE_TIERS = {
  fast: ['fitness', 'tech', 'finance'],
  slow: ['lifestyle', 'food', 'travel', 'beauty', 'gaming'],
  all:  NICHES_DEFAULT,
}

// Single source of truth for the per-niche pool cache key (shared with trends route).
export function nichePoolKey(niche) {
  return `trends:niche:${niche}`
}

// Dynamic TTL by dominant signal — viral pools expire fast, new ones live longer.
function poolTTL(trends = []) {
  const counts = { viral: 0, rising: 0, new: 0 }
  for (const t of trends) counts[t.signal] = (counts[t.signal] || 0) + 1
  if (counts.viral > trends.length * 0.3) return CACHE_TTL.viral
  if (counts.rising > trends.length * 0.4) return CACHE_TTL.rising
  return CACHE_TTL.new
}

let jobTimers = []

/**
 * Scrape + cache ONE niche's pool. The single unit of work — used by the cron
 * tiers and by lazy on-demand warming from the trends route. Returns the pool's
 * trends array (empty on failure).
 */
export async function warmNiche(niche, redis) {
  try {
    const { trends, recommendations } = await runTrendPipeline([niche], [])
    if (redis && trends.length) {
      const ttl = poolTTL(trends)
      await redis.set(nichePoolKey(niche), JSON.stringify({ trends, recommendations }), 'EX', ttl)
      logger.info('scrapeJob.niche_cached', { niche, count: trends.length, ttlH: Math.round(ttl / 3600) })
    } else if (!trends.length) {
      logger.warn('scrapeJob.niche_empty', { niche })
    }
    return trends
  } catch (err) {
    logger.error('scrapeJob.niche_error', { niche, message: err.message })
    return []
  }
}

/**
 * Scrape + cache every niche in a tier (each as its own pool). Sequential to
 * avoid hammering the external APIs / tripping rate limits. Returns total items.
 */
export async function runScrapeTier(tier, redis) {
  const niches = SCRAPE_TIERS[tier]
  if (!niches) throw new Error(`Unknown scrape tier: ${tier}`)
  logger.info('scrapeJob.tier_start', { tier, niches: niches.length })
  let total = 0
  for (const niche of niches) {
    // Skip niches whose pool is still fresh in Redis. The TTL expiring (key gone)
    // is what triggers a re-scrape — so a server restart/redeploy doesn't re-burn
    // external API quota on pools that are already warm.
    try {
      if (redis && await redis.exists(nichePoolKey(niche))) {
        logger.info('scrapeJob.niche_fresh_skip', { niche })
        continue
      }
    } catch {}
    const trends = await warmNiche(niche, redis)
    total += trends.length
  }
  logger.info('scrapeJob.tier_done', { tier, total })
  return total
}

/**
 * Start in-process scheduled scraping. Use ONLY for a single long-lived process.
 * For serverless, leave off and drive via Cloud Scheduler → /api/internal/scrape.
 */
export function startScrapeJob(redis) {
  if (!redis) {
    logger.warn('scrapeJob.no_redis')
    return
  }

  const runFast = () => runScrapeTier('fast', redis)
  const runSlow = () => runScrapeTier('slow', redis)
  const runAll  = () => runScrapeTier('all', redis)

  // Staggered initial runs on startup to avoid a thundering herd.
  setTimeout(() => runFast(), 5000)
  setTimeout(() => runSlow(), 30000)

  const fastTimer = setInterval(runFast, CACHE_TTL.viral * 1000)   // 1h
  const slowTimer = setInterval(runSlow, CACHE_TTL.rising * 1000)  // 5h
  const allTimer  = setInterval(runAll,  CACHE_TTL.new * 1000)     // 10h

  jobTimers = [fastTimer, slowTimer, allTimer]
  logger.info('scrapeJob.inprocess_started', { fastH: 1, slowH: 5, allH: 10 })
}

export function stopScrapeJob() {
  jobTimers.forEach(t => clearInterval(t))
  jobTimers = []
  logger.info('scrapeJob.stopped')
}
