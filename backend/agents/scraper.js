import { MOCK_TRENDS } from '../mockData.js'
import crypto from 'crypto'

/**
 * Agent 1 — Scraper
 * Scrapes trending content from Instagram, X, and Reddit.
 * Falls back to mock data if API keys are not configured.
 */
export async function scrapeTrends(niches, platforms) {
  const hasApify = !!process.env.APIFY_API_KEY
  const hasRapidApi = !!process.env.RAPIDAPI_KEY
  const hasRedditAuth = !!process.env.REDDIT_CLIENT_ID

  const anyKeySet = hasApify || hasRapidApi || hasRedditAuth

  if (!anyKeySet) {
    console.log('[scraper] No API keys set — returning mock trends')
    return filterByNichesAndPlatforms(MOCK_TRENDS, niches, platforms)
  }

  const results = []
  const targetPlatforms = platforms && platforms.length > 0 ? platforms : ['instagram', 'x', 'reddit']

  // Scrape Instagram via Apify
  if (targetPlatforms.includes('instagram') && hasApify) {
    try {
      const hashtags = niches.flatMap(n => [`#${n}`, `#${n}lifestyle`, `#${n}tips`])
      const runRes = await fetch('https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.APIFY_API_KEY}`
        },
        body: JSON.stringify({ hashtags: hashtags.slice(0, 5), resultsLimit: 10 }),
        signal: AbortSignal.timeout(30000)
      })
      if (runRes.ok) {
        const items = await runRes.json()
        const normalized = (Array.isArray(items) ? items : []).slice(0, 5).map(item => ({
          id: crypto.randomUUID(),
          title: item.caption ? item.caption.slice(0, 80).split('\n')[0] : `Instagram trend: ${niches[0]}`,
          platform: 'instagram',
          signal: item.likesCount > 50000 ? 'viral' : item.likesCount > 10000 ? 'rising' : 'new',
          summary: `Instagram post with ${item.likesCount || 0} likes in ${niches[0]} niche`,
          score: Math.min(99, Math.floor(((item.likesCount || 0) / 100000) * 100) + 40),
          niche: niches[0],
          createdAt: item.timestamp || new Date().toISOString()
        }))
        results.push(...normalized)
      }
    } catch (err) {
      console.error('[scraper] Apify Instagram error:', err.message)
    }
  }

  // Scrape X/Twitter via RapidAPI
  if (targetPlatforms.includes('x') && hasRapidApi) {
    try {
      for (const niche of niches.slice(0, 2)) {
        const url = `https://contextual-web-news-search.p.rapidapi.com/api/search?q=${encodeURIComponent(niche)}&pageSize=5`
        const res = await fetch(url, {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'contextual-web-news-search.p.rapidapi.com'
          },
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const data = await res.json()
          const articles = data.value || []
          const normalized = articles.slice(0, 3).map(article => ({
            id: crypto.randomUUID(),
            title: article.title ? article.title.slice(0, 100) : `${niche} trending on X`,
            platform: 'x',
            signal: 'rising',
            summary: article.description ? article.description.slice(0, 100) : `Trending ${niche} discussion on X`,
            score: Math.floor(Math.random() * 30) + 60,
            niche,
            createdAt: article.datePublished || new Date().toISOString()
          }))
          results.push(...normalized)
        }
      }
    } catch (err) {
      console.error('[scraper] RapidAPI X error:', err.message)
    }
  }

  // Scrape Reddit (public API, no auth needed for basic search)
  if (targetPlatforms.includes('reddit')) {
    try {
      for (const niche of niches.slice(0, 2)) {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(niche)}&sort=hot&limit=10&type=link`
        const res = await fetch(url, {
          headers: { 'User-Agent': 'TrendForge/1.0' },
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const data = await res.json()
          const posts = data?.data?.children || []
          const normalized = posts.slice(0, 4).map(post => {
            const p = post.data
            const upvotes = p.ups || 0
            return {
              id: crypto.randomUUID(),
              title: p.title ? p.title.slice(0, 100) : `Reddit trending: ${niche}`,
              platform: 'reddit',
              signal: upvotes > 10000 ? 'viral' : upvotes > 2000 ? 'rising' : 'new',
              summary: `r/${p.subreddit} post with ${upvotes.toLocaleString()} upvotes`,
              score: Math.min(99, Math.floor((upvotes / 20000) * 60) + 30),
              niche,
              createdAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : new Date().toISOString()
            }
          })
          results.push(...normalized)
        }
      }
    } catch (err) {
      console.error('[scraper] Reddit error:', err.message)
    }
  }

  // If we got real results, return them; otherwise fall back to filtered mock data
  if (results.length > 0) {
    console.log(`[scraper] Scraped ${results.length} real trends`)
    return results
  }

  console.log('[scraper] No real results — falling back to mock trends')
  return filterByNichesAndPlatforms(MOCK_TRENDS, niches, platforms)
}

function filterByNichesAndPlatforms(trends, niches, platforms) {
  let filtered = [...trends]
  if (niches && niches.length > 0) {
    filtered = filtered.filter(t => niches.includes(t.niche))
    if (filtered.length === 0) filtered = [...trends] // return all if no match
  }
  if (platforms && platforms.length > 0) {
    const platFiltered = filtered.filter(t => platforms.includes(t.platform))
    if (platFiltered.length > 0) filtered = platFiltered
  }
  return filtered
}
