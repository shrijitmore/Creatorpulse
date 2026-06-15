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

    let reason = '', message = ''
    try { const e = await res.clone().json(); reason = e.error?.errors?.[0]?.reason || e.error?.status || ''; message = e.error?.message || '' } catch {}

    // YouTube returns reason="rateLimitExceeded" for BOTH the short burst limit AND
    // the daily quota cap (message says "...per day"). Only the burst limit is worth
    // retrying — retrying a daily cap just wastes the (already 0) remaining quota.
    const isDailyQuota = reason === 'quotaExceeded' || /per day|quota exceeded/i.test(message)
    const transient = res.status === 429 && !isDailyQuota
    if (transient && attempt < YT_RETRY.max) {
      await sleep(YT_RETRY.baseDelayMs * (attempt + 1))
      continue
    }
    logger.warn('scraper.youtube_http_error', { niche, status: res.status, reason, dailyQuota: isDailyQuota })
    return null
  }
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeTrends(niches, platforms, userCtx = {}) {
  const activeNiches = niches?.length > 0 ? niches : NICHES_DEFAULT
  const targetPlatforms = platforms?.length > 0 ? platforms.filter(p => p !== 'x') : ['reddit', 'youtube']
  const results = []

  // Run all scrapers in parallel. Google News is keyless/auth-free so the feed
  // still fills when YouTube quota is spent or Reddit is blocked.
  await Promise.all([
    scrapeYouTube(activeNiches, targetPlatforms, results, userCtx),
    scrapeReddit(activeNiches, targetPlatforms, results),
    scrapeGoogleNews(activeNiches, results),
  ])

  logger.info('scraper.total', {
    total:   results.length,
    youtube: results.filter(r => r.platform === 'youtube').length,
    reddit:  results.filter(r => r.platform === 'reddit').length,
    news:    results.filter(r => r.platform === 'news').length,
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
// Reddit blocks anonymous .json (403). With app credentials we use the OAuth
// app-only (client_credentials) flow against oauth.reddit.com. A descriptive,
// unique User-Agent is mandatory or Reddit 429/403s regardless of the token.

// Reddit requires a unique UA in the format: <platform>:<app id>:<version> (by /u/<user>)
const REDDIT_UA = process.env.REDDIT_USER_AGENT || 'web:influensa:1.0 (by /u/influensa_app)'
let redditTokenCache = { token: null, expiresAt: 0 }

async function getRedditToken() {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) return null // not configured — caller falls back to other sources

  if (redditTokenCache.token && Date.now() < redditTokenCache.expiresAt) {
    return redditTokenCache.token
  }

  try {
    const basic = Buffer.from(`${id}:${secret}`).toString('base64')
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_UA,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      logger.warn('scraper.reddit_auth_error', { status: res.status })
      return null
    }
    const data = await res.json()
    if (!data.access_token) return null
    // Cache until ~1 min before expiry (Reddit tokens last ~1h).
    redditTokenCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000 }
    return data.access_token
  } catch (err) {
    logger.warn('scraper.reddit_auth_error', { message: err.message })
    return null
  }
}

async function scrapeReddit(niches, platforms, results) {
  let rdCount = 0

  // App-only OAuth token. If unavailable (no creds / auth fail), skip Reddit —
  // anonymous .json is 403-blocked, and Google News already covers the feed.
  const token = await getRedditToken()
  if (!token) {
    logger.info('scraper.reddit_skipped', { reason: 'no_oauth_token' })
    return
  }
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'User-Agent': REDDIT_UA }

  await Promise.all(niches.slice(0, 5).map(async niche => {
    try {
      const [searchRes, subRes] = await Promise.all([
        fetch(`https://oauth.reddit.com/search?q=${encodeURIComponent(niche)}&sort=top&limit=8&type=link&t=week`, {
          headers: authHeaders, signal: AbortSignal.timeout(10000)
        }),
        fetch(`https://oauth.reddit.com/r/${(NICHE_SUBREDDITS[niche] || [niche])[0]}/hot?limit=5`, {
          headers: authHeaders, signal: AbortSignal.timeout(8000)
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

// ── Google News RSS ───────────────────────────────────────────────────────────
// Keyless, auth-free fallback so the feed survives when YouTube quota is spent or
// Reddit is blocked. Returns recent news headlines per niche, scored by recency.

const NEWS_MAX_PER_NICHE = 8
const NEWS_NICHE_CAP = 6 // niches per run (keep total HTTP fan-out modest)

function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim()
}

// Score a headline purely by recency (no engagement signal exists for news).
function newsScoreAndSignal(ageHours) {
  if (ageHours <= 6)  return { score: 82, signal: 'viral'  }
  if (ageHours <= 24) return { score: 64, signal: 'rising' }
  if (ageHours <= 72) return { score: 48, signal: 'new'    }
  return { score: 38, signal: 'new' }
}

async function scrapeGoogleNews(niches, results) {
  let newsCount = 0

  await Promise.all(niches.slice(0, NEWS_NICHE_CAP).map(async niche => {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(niche)}&hl=en-US&gl=US&ceid=US:en`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InfluensaBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        logger.warn('scraper.news_http_error', { niche, status: res.status })
        return
      }

      const xml = await res.text()
      const items = xml.split('<item>').slice(1, NEWS_MAX_PER_NICHE + 1)

      for (const item of items) {
        const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ''
        const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || ''
        const title = decodeEntities(rawTitle.replace(/<!\[CDATA\[|\]\]>/g, ''))
        if (!title || title.length < 12) continue

        // Google News titles are "Headline - Publisher" — strip the trailing source.
        const publisher = decodeEntities(source)
        const headline = publisher && title.endsWith(`- ${publisher}`)
          ? title.slice(0, -(publisher.length + 2)).trim()
          : title

        const published = pubDate ? new Date(pubDate) : new Date()
        const ageHours = (Date.now() - published.getTime()) / 3600000
        const { score, signal } = newsScoreAndSignal(ageHours)

        results.push({
          id: crypto.randomUUID(),
          title: headline.slice(0, 100),
          platform: 'news',
          signal,
          summary: `${publisher || 'Google News'} — ${ageHours < 24 ? `${Math.max(1, Math.round(ageHours))}h ago` : `${Math.round(ageHours / 24)}d ago`}`,
          score,
          niche,
          createdAt: published.toISOString(),
        })
        newsCount++
      }
    } catch (err) {
      logger.error('scraper.news_error', { niche, message: err.message })
    }
  }))

  logger.info('scraper.news_done', { count: newsCount })
}
