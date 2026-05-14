import crypto from 'crypto'

/**
 * Agent 1 — Scraper
 * Instagram via Apify, Reddit via public API (no auth needed).
 * Returns empty array on failure — Trend Analyst handles gracefully.
 */
export async function scrapeTrends(niches, platforms) {
  const hasApify = !!process.env.APIFY_API_KEY
  const results = []
  const targetPlatforms = platforms && platforms.length > 0
    ? platforms.filter(p => p !== 'x')
    : ['instagram', 'reddit']

  // ── Instagram via Apify ───────────────────────────────────────────────────
  if (targetPlatforms.includes('instagram') && hasApify) {
    try {
      const hashtags = niches.flatMap(n => [`#${n}`, `#${n}tips`, `#${n}lifestyle`])
      const runRes = await fetch(
        'https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIFY_API_KEY}` },
          body: JSON.stringify({ hashtags: hashtags.slice(0, 5), resultsLimit: 10 }),
          signal: AbortSignal.timeout(30000)
        }
      )
      if (runRes.ok) {
        const items = await runRes.json()
        const normalized = (Array.isArray(items) ? items : []).slice(0, 5).map(item => ({
          id: crypto.randomUUID(),
          title: item.caption
            ? item.caption.slice(0, 80).split('\n')[0].replace(/#\w+/g, '').trim()
            : `Instagram trend: ${niches[0]}`,
          platform: 'instagram',
          signal: item.likesCount > 50000 ? 'viral' : item.likesCount > 10000 ? 'rising' : 'new',
          summary: `${(item.likesCount || 0).toLocaleString()} likes — trending in ${niches[0]} niche`,
          score: Math.min(99, Math.floor(((item.likesCount || 0) / 100000) * 60) + 35),
          niche: niches[0] || 'lifestyle',
          createdAt: item.timestamp || new Date().toISOString()
        }))
        results.push(...normalized)
        console.log(`[scraper] Instagram: ${normalized.length} posts scraped`)
      }
    } catch (err) {
      console.error('[scraper] Apify Instagram error:', err.message)
    }
  }

  // ── Reddit (public API — no auth needed) ─────────────────────────────────
  if (targetPlatforms.includes('reddit') || !targetPlatforms.includes('instagram')) {
    const NICHE_SUBREDDITS = {
      fitness:   'fitness', finance: 'personalfinance', tech: 'technology',
      lifestyle: 'selfimprovement', food: 'food', travel: 'travel',
      beauty:    'SkincareAddiction', gaming: 'gaming'
    }

    for (const niche of niches.slice(0, 3)) {
      try {
        const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(niche)}&sort=hot&limit=8&type=link&t=week`
        const res = await fetch(searchUrl, {
          headers: { 'User-Agent': 'TrendForge/1.0' },
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const data = await res.json()
          const posts = (data?.data?.children || []).filter(p => p.data.ups > 5).slice(0, 4)
          results.push(...posts.map(post => {
            const p = post.data
            const upvotes = p.ups || 0
            const engagement = upvotes + (p.num_comments || 0) * 2
            return {
              id: crypto.randomUUID(),
              title: p.title ? p.title.slice(0, 100) : `Reddit trending: ${niche}`,
              platform: 'reddit',
              signal: upvotes > 10000 ? 'viral' : upvotes > 2000 ? 'rising' : 'new',
              summary: `r/${p.subreddit} — ${upvotes.toLocaleString()} upvotes, ${(p.num_comments || 0).toLocaleString()} comments`,
              score: Math.min(99, Math.floor((engagement / 25000) * 60) + 30),
              niche,
              createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
            }
          }))
        }

        const sub = NICHE_SUBREDDITS[niche]
        if (sub) {
          const subRes = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
            headers: { 'User-Agent': 'TrendForge/1.0' },
            signal: AbortSignal.timeout(8000)
          })
          if (subRes.ok) {
            const subData = await subRes.json()
            const subPosts = (subData?.data?.children || []).filter(p => !p.data.stickied && p.data.ups > 10).slice(0, 3)
            results.push(...subPosts.map(post => {
              const p = post.data
              return {
                id: crypto.randomUUID(),
                title: p.title ? p.title.slice(0, 100) : `r/${sub} trending`,
                platform: 'reddit',
                signal: p.ups > 10000 ? 'viral' : p.ups > 2000 ? 'rising' : 'new',
                summary: `Hot in r/${sub} — ${(p.ups || 0).toLocaleString()} upvotes`,
                score: Math.min(99, Math.floor(((p.ups || 0) / 20000) * 60) + 28),
                niche,
                createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
              }
            }))
          }
        }
      } catch (err) {
        console.error(`[scraper] Reddit error for ${niche}:`, err.message)
      }
    }
    console.log(`[scraper] Reddit: ${results.filter(r => r.platform === 'reddit').length} posts scraped`)
  }

  console.log(`[scraper] Total: ${results.length} real trends`)
  return results
}
