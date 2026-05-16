/**
 * Background scraping job — runs on schedule, populates Redis cache.
 * All users read from cache → zero API calls per user request.
 *
 * Schedule:
 *   viral niches  → every 1h
 *   rising niches → every 5h
 *   new niches    → every 10h
 *
 * Run standalone: node jobs/scrapeJob.js
 * Or call startScrapeJob() from server.js
 */
import { runTrendPipeline } from '../agents/pipeline.js'
import { NICHES_DEFAULT, CACHE_TTL } from '../constants.js'

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
 * Start background scraping on schedules.
 * Call from server.js after Redis is connected.
 */
export function startScrapeJob(redis) {
  if (!redis) {
    console.log('[scrapeJob] No Redis — background scraping disabled')
    return
  }

  // Split niches into groups — scrape popular niches more frequently
  const FAST_NICHES = ['fitness', 'tech', 'finance']    // 1h
  const SLOW_NICHES = ['lifestyle', 'food', 'travel', 'beauty', 'gaming']  // 5h

  const runFast = () => scrapeGroup(FAST_NICHES, 'fast niches', redis)
  const runSlow = () => scrapeGroup(SLOW_NICHES, 'slow niches', redis)
  const runAll  = () => scrapeGroup(NICHES_DEFAULT, 'all niches', redis)

  // Initial run on startup (staggered to avoid thundering herd)
  setTimeout(() => runFast(), 5000)
  setTimeout(() => runSlow(), 30000)

  // Recurring schedules
  const fastTimer = setInterval(runFast, CACHE_TTL.viral * 1000)   // 1h
  const slowTimer = setInterval(runSlow, CACHE_TTL.rising * 1000)  // 5h
  const allTimer  = setInterval(runAll,  CACHE_TTL.new * 1000)     // 10h

  jobTimers = [fastTimer, slowTimer, allTimer]
  console.log('[scrapeJob] Background scraping started — fast:1h, slow:5h, all:10h')
}

export function stopScrapeJob() {
  jobTimers.forEach(t => clearInterval(t))
  jobTimers = []
  console.log('[scrapeJob] Background scraping stopped')
}
