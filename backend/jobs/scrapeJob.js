/**
 * Background scraping job — populates the Redis cache so user requests never
 * trigger live scraping.
 *
 * Two ways to drive it:
 *   - In-process timers (startScrapeJob) — fine for a single long-lived process
 *     (local dev, or a single always-on instance). Breaks on serverless: timers
 *     stop when an instance scales to zero, and duplicate across instances.
 *   - External trigger (runScrapeTier via /api/internal/scrape) — Cloud Scheduler
 *     hits the endpoint on a schedule. Correct for autoscaling/serverless.
 *
 * Tiers:
 *   fast  → every 1h
 *   slow  → every 5h
 *   all   → every 10h
 */
import { runTrendPipeline } from '../agents/pipeline.js'
import { NICHES_DEFAULT, CACHE_TTL } from '../constants.js'

// Niche groups by refresh cadence. Single source of truth for both drivers.
export const SCRAPE_TIERS = {
  fast: ['fitness', 'tech', 'finance'],
  slow: ['lifestyle', 'food', 'travel', 'beauty', 'gaming'],
  all:  NICHES_DEFAULT,
}

let jobTimers = []

/**
 * Scrape and cache a niche group.
 */
async function scrapeGroup(niches, label, redis) {
  console.log(`[scrapeJob] Scraping ${label}: ${niches.join(', ')}`)
  try {
    const { trends, recommendations } = await runTrendPipeline(niches, [])
    const result = JSON.stringify({ trends, recommendations })

    // Cache per-niche-group key (shared across all users with same niches)
    const key = `trends:niche:${niches.slice().sort().join(',')}`

    // Dynamic TTL based on dominant signal
    const counts = { viral: 0, rising: 0, new: 0 }
    for (const t of trends) counts[t.signal] = (counts[t.signal] || 0) + 1
    const ttl = counts.viral > trends.length * 0.3 ? CACHE_TTL.viral
              : counts.rising > trends.length * 0.4 ? CACHE_TTL.rising
              : CACHE_TTL.new

    if (redis) {
      await redis.set(key, result, 'EX', ttl)
      console.log(`[scrapeJob] Cached ${key} TTL=${Math.round(ttl/3600)}h — ${trends.length} trends`)
    }
    return trends
  } catch (err) {
    console.error(`[scrapeJob] Failed to scrape ${label}:`, err.message)
    return []
  }
}

/**
 * Scrape and cache one tier. The single entry point used by both the in-process
 * timers and the external (Cloud Scheduler) endpoint.
 */
export async function runScrapeTier(tier, redis) {
  const niches = SCRAPE_TIERS[tier]
  if (!niches) throw new Error(`Unknown scrape tier: ${tier}`)
  return scrapeGroup(niches, `${tier} niches`, redis)
}

/**
 * Start in-process scheduled scraping. Use ONLY for a single long-lived process
 * (local dev or a single always-on instance). For serverless/autoscaling, leave
 * this off and drive scraping via Cloud Scheduler → /api/internal/scrape.
 * Call from server.js after Redis is connected.
 */
export function startScrapeJob(redis) {
  if (!redis) {
    console.log('[scrapeJob] No Redis — background scraping disabled')
    return
  }

  const runFast = () => runScrapeTier('fast', redis)
  const runSlow = () => runScrapeTier('slow', redis)
  const runAll  = () => runScrapeTier('all', redis)

  // Initial run on startup (staggered to avoid thundering herd)
  setTimeout(() => runFast(), 5000)
  setTimeout(() => runSlow(), 30000)

  // Recurring schedules
  const fastTimer = setInterval(runFast, CACHE_TTL.viral * 1000)   // 1h
  const slowTimer = setInterval(runSlow, CACHE_TTL.rising * 1000)  // 5h
  const allTimer  = setInterval(runAll,  CACHE_TTL.new * 1000)     // 10h

  jobTimers = [fastTimer, slowTimer, allTimer]
  console.log('[scrapeJob] In-process scraping started — fast:1h, slow:5h, all:10h')
}

export function stopScrapeJob() {
  jobTimers.forEach(t => clearInterval(t))
  jobTimers = []
  console.log('[scrapeJob] Background scraping stopped')
}
