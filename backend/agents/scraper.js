import crypto from 'crypto'
import {
  NICHES_DEFAULT,
  NICHE_YT_CATEGORIES,
  NICHE_SUBREDDITS,
} from '../constants.js'
import { logger } from '../lib/logger.js'

// YouTube's short-window burst limit (rateLimitExceeded) trips when the cron warms
// niches back-to-back. It's transient (unlike the daily quotaExceeded), so a short
// backoff retry clears it. Daily-quota errors are NOT retried — that would be futile.
const YT_RETRY = { max: 2, baseDelayMs: 2000 }
const YT_MIN_GAP_MS = 1100 // min spacing between any two YT search calls (anti-burst)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Global throttle: chain every YT search through a single promise so calls are
// spaced ≥ YT_MIN_GAP_MS apart even when tiers/warms run concurrently. This is
// what actually prevents the rateLimitExceeded bursts; retry is the safety net.
let ytGate = Promise.resolve()
function ytThrottle() {
  const wait = ytGate.then(() => sleep(YT_MIN_GAP_MS))
  ytGate = wait
  return wait
}

async function fetchYouTubeSearch(url, niche) {
  await ytThrottle()
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (res.ok) return res

    let reason = ''
    try { const e = await res.clone().json(); reason = e.error?.errors?.[0]?.reason || e.error?.status || '' } catch {}

    const transient = res.status === 429 && reason !== 'quotaExceeded'
    if (transient && attempt < YT_RETRY.max) {
      await sleep(YT_RETRY.baseDelayMs * (attempt + 1))
      continue
    }
    logger.warn('scraper.youtube_http_error', { niche, status: res.status, reason })
    return null
  }
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeTrends(niches, platforms, userCtx = {}) {
  const activeNiches = niches?.length > 0 ? niches : NICHES_DEFAULT
  const targetPlatforms = platforms?.length > 0 ? platforms.filter(p => p !== 'x') : ['reddit', 'youtube']
  const results = []

  // Run all scrapers in parallel
  await Promise.all([
    scrapeYouTube(activeNiches, targetPlatforms, results, userCtx),
    scrapeReddit(activeNiches, targetPlatforms, results),
  ])

  logger.info('scraper.total', {
    total:   results.length,
    youtube: results.filter(r => r.platform === 'youtube').length,
    reddit:  results.filter(r => r.platform === 'reddit').length,
  })
  return results
}

// ── YouTube Data API ──────────────────────────────────────────────────────────

async function scrapeYouTube(niches, platforms, results, userCtx = {}) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) { logger.warn('scraper.youtube_no_key'); return }

  const isPrimary = userCtx.primaryPlatform === 'youtube'
  const nicheLimit = isPrimary ? 8 : 6

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString()
  let ytCount = 0

  await Promise.all(niches.slice(0, nicheLimit).map(async niche => {
    try {
      const cat = NICHE_YT_CATEGORIES[niche] || { id: '0', query: niche }

      // Search recent trending videos. maxResults=50 costs the SAME 100 units as
      // maxResults=5 (search.list is priced per call) — so we pull a 50-item pool
      // for free. The cron caches this pool; users sample from it (no per-user calls).
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(cat.query)}&type=video&order=viewCount&publishedAfter=${sevenDaysAgo}&maxResults=50&relevanceLanguage=en&key=${key}`
      const res = await fetchYouTubeSearch(searchUrl, niche)
      if (!res) return // error already logged (after retries for transient 429s)

      const data = await res.json()
      if (!data.items?.length) return

      // Get video statistics for view counts
      const ids = data.items.map(v => v.id.videoId).join(',')
      const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids}&key=${key}`, { signal: AbortSignal.timeout(8000) })
      const statsData = await statsRes.json()

      for (const video of (statsData.items || [])) {
        const views = parseInt(video.statistics?.viewCount || 0)
        const title = video.snippet?.title || ''
        if (!title || title.length < 10) continue

        const score = Math.min(99, Math.floor(Math.log10(Math.max(1, views)) * 12) + 20)

        results.push({
          id: crypto.randomUUID(),
          title: title.slice(0, 100),
          platform: 'youtube',
          signal: views > 500000 ? 'viral' : views > 50000 ? 'rising' : 'new',
          summary: `${views.toLocaleString()} views this week on YouTube — ${video.snippet?.channelTitle?.slice(0,30)}`,
          score,
          niche,
          createdAt: video.snippet?.publishedAt || new Date().toISOString(),
          views,
        })
        ytCount++
      }
    } catch (err) {
      logger.error('scraper.youtube_error', { niche, message: err.message })
    }
  }))

  logger.info('scraper.youtube_done', { count: ytCount })
}

// ── Reddit ────────────────────────────────────────────────────────────────────

async function scrapeReddit(niches, platforms, results) {
  let rdCount = 0

  await Promise.all(niches.slice(0, 5).map(async niche => {
    try {
      const [searchRes, subRes] = await Promise.all([
        fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(niche)}&sort=top&limit=8&type=link&t=week`, {
          headers: { 'User-Agent': 'Influensa/1.0' }, signal: AbortSignal.timeout(10000)
        }),
        fetch(`https://www.reddit.com/r/${(NICHE_SUBREDDITS[niche] || [niche])[0]}/hot.json?limit=5`, {
          headers: { 'User-Agent': 'Influensa/1.0' }, signal: AbortSignal.timeout(8000)
        })
      ])

      if (!searchRes.ok || !subRes.ok) {
        logger.warn('scraper.reddit_http_error', { niche, searchStatus: searchRes.status, subStatus: subRes.status })
      }

      if (searchRes.ok) {
        const data = await searchRes.json()
        const posts = (data?.data?.children || []).filter(p => p.data.ups > 10).slice(0, 4)
        posts.forEach(post => {
          const p = post.data
          const ups = p.ups || 0
          const engagement = ups + (p.num_comments || 0) * 3
          results.push({
            id: crypto.randomUUID(),
            title: p.title?.slice(0, 100) || `Trending ${niche} on Reddit`,
            platform: 'reddit',
            signal: ups > 15000 ? 'viral' : ups > 3000 ? 'rising' : 'new',
            summary: `r/${p.subreddit} — ${ups.toLocaleString()} upvotes · ${(p.num_comments||0).toLocaleString()} comments`,
            score: Math.min(99, Math.floor((engagement / 30000) * 60) + 30),
            niche,
            createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
          })
          rdCount++
        })
      }

      if (subRes.ok) {
        const subData = await subRes.json()
        const subPosts = (subData?.data?.children || []).filter(p => !p.data.stickied && p.data.ups > 50).slice(0, 3)
        subPosts.forEach(post => {
          const p = post.data
          results.push({
            id: crypto.randomUUID(),
            title: p.title?.slice(0, 100) || `Hot in r/${p.subreddit}`,
            platform: 'reddit',
            signal: p.ups > 10000 ? 'viral' : p.ups > 2000 ? 'rising' : 'new',
            summary: `Hot in r/${p.subreddit} — ${(p.ups||0).toLocaleString()} upvotes`,
            score: Math.min(99, Math.floor(((p.ups||0) / 20000) * 60) + 30),
            niche,
            createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
          })
          rdCount++
        })
      }
    } catch (err) {
      logger.error('scraper.reddit_error', { niche, message: err.message })
    }
  }))

  logger.info('scraper.reddit_done', { count: rdCount })
}
