import crypto from 'crypto'
import {
  NICHES_DEFAULT,
  NICHE_YT_CATEGORIES,
  NICHE_SUBREDDITS,
} from '../constants.js'

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

  console.log(`[scraper] Total: ${results.length} — YT:${results.filter(r=>r.platform==='youtube').length} Reddit:${results.filter(r=>r.platform==='reddit').length}`)
  return results
}

// ── YouTube Data API ──────────────────────────────────────────────────────────

async function scrapeYouTube(niches, platforms, results, userCtx = {}) {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) { console.log('[scraper] YouTube: no API key'); return }

  const isPrimary = userCtx.primaryPlatform === 'youtube'
  const nicheLimit = isPrimary ? 6 : 4

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString()
  let ytCount = 0

  await Promise.all(niches.slice(0, nicheLimit).map(async niche => {
    try {
      const cat = NICHE_YT_CATEGORIES[niche] || { id: '0', query: niche }

      // Search recent trending videos for this niche
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(cat.query)}&type=video&order=viewCount&publishedAfter=${sevenDaysAgo}&maxResults=5&relevanceLanguage=en&key=${key}`
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return

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
      console.error(`[scraper] YouTube error (${niche}):`, err.message)
    }
  }))

  console.log(`[scraper] YouTube: ${ytCount} videos scraped`)
}

// ── Reddit ────────────────────────────────────────────────────────────────────

async function scrapeReddit(niches, platforms, results) {
  let rdCount = 0

  await Promise.all(niches.slice(0, 5).map(async niche => {
    try {
      const [searchRes, subRes] = await Promise.all([
        fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(niche)}&sort=top&limit=8&type=link&t=week`, {
          headers: { 'User-Agent': 'TrendForge/1.0' }, signal: AbortSignal.timeout(10000)
        }),
        fetch(`https://www.reddit.com/r/${(NICHE_SUBREDDITS[niche] || [niche])[0]}/hot.json?limit=5`, {
          headers: { 'User-Agent': 'TrendForge/1.0' }, signal: AbortSignal.timeout(8000)
        })
      ])

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
      console.error(`[scraper] Reddit error (${niche}):`, err.message)
    }
  }))

  console.log(`[scraper] Reddit: ${rdCount} posts scraped`)
}
