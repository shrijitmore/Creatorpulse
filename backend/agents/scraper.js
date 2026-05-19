import crypto from 'crypto'
import {
  NICHES_DEFAULT,
  NICHE_IG_HASHTAGS,
  NICHE_YT_CATEGORIES,
  NICHE_SUBREDDITS,
  SCRAPING,
  SCORING,
} from '../constants.js'

// ── Instagram helpers ─────────────────────────────────────────────────────────

function scoreInstagramPost(item) {
  const { instagram: S } = SCORING
  const now = Date.now()
  const ageHours = (now - new Date(item.timestamp || now).getTime()) / 3600000
  let score = S.base
  if (ageHours < 2)        score += S.recency.h2
  else if (ageHours < 12)  score += S.recency.h12
  else if (ageHours < 24)  score += S.recency.h24
  else if (ageHours < 72)  score += S.recency.h72
  const type = (item.type || '').toLowerCase()
  if (type.includes('video') || type.includes('reel')) score += S.video_bonus
  else if (type === 'sidecar') score += S.sidecar_bonus
  const hashtagCount = (item.hashtags || []).length
  if (hashtagCount >= 10 && hashtagCount <= 25) score += 12
  else if (hashtagCount > 25) score += 6
  else if (hashtagCount >= 5) score += 8
  const caption = (item.caption || '').toLowerCase()
  if (/\?/.test(caption)) score += 5
  if (/\d+/.test(caption)) score += 4
  if (/free|tip|how|why|best|top/i.test(caption)) score += 4
  if (caption.length > 200) score += 5
  if (caption.length < 20) score -= 10
  return Math.min(96, Math.max(25, score))
}

function extractTitle(caption, niche) {
  if (!caption) return `Trending ${niche} content on Instagram`
  let clean = caption
    .replace(/#\w+/g, '').replace(/@\w+/g, '').replace(/https?:\/\/\S+/g, '')
    .replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean || clean.length < 10) return `Trending ${niche} content on Instagram`
  const first = clean.split(/[.!?\n]/)[0].trim()
  return (first.length > 10 ? first : clean).slice(0, 100)
}

function isSpamItem(item, allowRegional = false) {
  const caption = (item.caption || '').toLowerCase()
  const title = extractTitle(item.caption, '')
  if (title.length < 10) return true
  if (/submit.*paper|call.*paper|conference|webinar|register.*now/i.test(caption)) return true
  // Only filter non-ASCII for English creators — Hindi/Hinglish creators want regional content
  if (!allowRegional) {
    const nonAscii = (title.match(/[^\x00-\x7F]/g) || []).length
    if (nonAscii / title.length > 0.3) return true
  }
  // Filter CTA-only titles that leaked into extraction
  if (/^(comment|tag|follow|click|link in bio|dm me|check this|shop now|buy now)/i.test(title.trim())) return true
  return false
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeTrends(niches, platforms, userCtx = {}) {
  const activeNiches = niches?.length > 0 ? niches : NICHES_DEFAULT
  const targetPlatforms = platforms?.length > 0 ? platforms.filter(p => p !== 'x') : ['instagram', 'reddit', 'youtube']
  const results = []

  // Run all scrapers in parallel
  await Promise.all([
    scrapeInstagram(activeNiches, targetPlatforms, results, userCtx),
    scrapeYouTube(activeNiches, targetPlatforms, results, userCtx),
    scrapeReddit(activeNiches, targetPlatforms, results),
  ])

  console.log(`[scraper] Total: ${results.length} — IG:${results.filter(r=>r.platform==='instagram').length} YT:${results.filter(r=>r.platform==='youtube').length} Reddit:${results.filter(r=>r.platform==='reddit').length}`)
  return results
}

// ── Instagram (session cookie) ────────────────────────────────────────────────

async function scrapeInstagram(niches, platforms, results, userCtx = {}) {
  if (!platforms.includes('instagram')) return
  const sessionId = decodeURIComponent(process.env.INSTAGRAM_SESSION_ID || '')
  const csrfToken = process.env.INSTAGRAM_CSRF_TOKEN || ''

  // Platform weighting: primary platform gets 60% of scraping budget
  const isPrimary = userCtx.primaryPlatform === 'instagram'
  const allowRegional = ['hindi', 'hinglish'].includes((userCtx.languageStyle || '').toLowerCase())

  if (!sessionId) {
    console.log('[scraper] Instagram: no session cookie — using Apify fallback')
    return scrapeInstagramApify(niches, platforms, results, allowRegional)
  }

  const hashtagsPerNiche = isPrimary ? 3 : 2
  const maxHashtags = isPrimary ? 9 : 6
  const loopLimit = isPrimary ? 6 : 4
  const hashtags = niches.slice(0, isPrimary ? 5 : 4)
    .flatMap(n => (NICHE_IG_HASHTAGS[n] || [n]).slice(0, hashtagsPerNiche))
    .slice(0, maxHashtags)
  console.log(`[scraper] Instagram searching: ${hashtags.slice(0, loopLimit).join(', ')} (${isPrimary ? 'primary platform' : 'standard'})`)

  const igHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'x-ig-app-id': '936619743392459',
    'x-csrftoken': csrfToken,
    'Cookie': `sessionid=${encodeURIComponent(sessionId)}; csrftoken=${csrfToken}`,
    'Referer': 'https://www.instagram.com/',
  }

  let scraped = 0
  for (const hashtag of hashtags.slice(0, loopLimit)) {
    try {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))  // respectful delay

      const res = await fetch(
        `https://i.instagram.com/api/v1/tags/${hashtag}/sections/`,
        {
          method: 'POST',
          headers: { ...igHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Sec-Fetch-Site': 'same-site', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' },
          body: 'tab=top&page=1&surface=hashtag&count=12',
          signal: AbortSignal.timeout(15000)
        }
      )

      if (res.status === 429) { console.log(`[scraper] Instagram: rate limited on ${hashtag}`); break }
      if (!res.ok) { console.log(`[scraper] Instagram: ${res.status} on ${hashtag}`); continue }

      const data = await res.json()
      const sections = data.sections || []

      for (const section of sections) {
        const medias = section.layout_content?.medias || []
        for (const mediaItem of medias.slice(0, 4)) {
          const m = mediaItem.media
          if (!m) continue

          const caption = m.caption?.text || ''
          const timestamp = new Date(m.taken_at * 1000).toISOString()
          const type = m.media_type === 2 ? 'video' : m.media_type === 8 ? 'sidecar' : 'image'
          const postHashtags = (caption.match(/#(\w+)/g) || []).map(h => h.slice(1))
          const likeCount = m.like_count || 0
          const commentCount = m.comment_count || 0

          // Match to niche
          const matchedNiche = niches.find(n =>
            (NICHE_IG_HASHTAGS[n] || []).some(h => postHashtags.map(p=>p.toLowerCase()).includes(h) || postHashtags.map(p=>p.toLowerCase()).includes(n))
          ) || niches[0]

          const item = { caption, timestamp, type, hashtags: postHashtags, likeCount }
          if (isSpamItem(item, allowRegional)) continue

          const score = scoreInstagramPost({ ...item, likeCount, commentCount })
          const title = extractTitle(caption, matchedNiche)
          if (title.length < 10) continue

          // Instagram now sometimes returns like counts — use if available
          const engagement = likeCount + commentCount * 2
          const adjustedScore = likeCount > 0
            ? Math.min(99, score + Math.min(20, Math.floor((engagement / 50000) * 20)))
            : score

          results.push({
            id: crypto.randomUUID(),
            title,
            platform: 'instagram',
            signal: adjustedScore >= 80 ? 'viral' : adjustedScore >= 55 ? 'rising' : 'new',
            summary: likeCount > 0
              ? `Instagram ${type} — ${likeCount.toLocaleString()} likes · ${postHashtags.length} hashtags`
              : `Instagram ${type} — ${Math.round((Date.now() - new Date(timestamp).getTime()) / 3600000)}h ago · ${postHashtags.length} hashtags`,
            score: adjustedScore,
            niche: matchedNiche,
            createdAt: timestamp,
          })
          scraped++
        }
      }
    } catch (err) {
      console.error(`[scraper] Instagram error (${hashtag}):`, err.message)
    }
  }

  // Dedupe and keep best
  const seen = new Set()
  const unique = results
    .filter(r => r.platform === 'instagram')
    .sort((a, b) => b.score - a.score)
    .filter(r => { const k = r.title.slice(0, 25).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })

  // Replace instagram results with deduped
  const others = results.filter(r => r.platform !== 'instagram')
  results.length = 0
  results.push(...others, ...unique.slice(0, 8))

  console.log(`[scraper] Instagram: ${scraped} raw → ${unique.slice(0,8).length} unique posts`)

  if (scraped === 0) {
    console.log('[scraper] Instagram session may need refresh — falling back to Apify')
    return scrapeInstagramApify(niches, platforms, results)
  }
}

async function scrapeInstagramApify(niches, platforms, results, allowRegional = false) {
  if (!process.env.APIFY_API_KEY) return
  const hashtags = niches.slice(0, 4).flatMap(n => (NICHE_IG_HASHTAGS[n] || [n]).slice(0, 1))
  try {
    const runRes = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIFY_API_KEY}` },
        body: JSON.stringify({ hashtags, resultsLimit: 12 }),
        signal: AbortSignal.timeout(45000)
      }
    )
    if (!runRes.ok) return
    const items = await runRes.json()
    if (!Array.isArray(items)) return
    const scored = items.filter(item => !isSpamItem(item, allowRegional)).map(item => {
      const postHashtags = (item.hashtags || []).map(h => h.toLowerCase())
      const matchedNiche = niches.find(n => (NICHE_IG_HASHTAGS[n] || [n]).some(h => postHashtags.includes(h))) || niches[0]
      const score = scoreInstagramPost(item)
      const title = extractTitle(item.caption, matchedNiche)
      return { id: crypto.randomUUID(), title, platform: 'instagram', signal: score>=80?'viral':score>=55?'rising':'new', summary: `Instagram ${item.type||'post'} via Apify`, score, niche: matchedNiche, createdAt: item.timestamp || new Date().toISOString() }
    })
    const seen = new Set()
    scored.sort((a,b)=>b.score-a.score).filter(p=>{ const k=p.title.slice(0,25).toLowerCase(); if(seen.has(k)||p.title.length<10)return false; seen.add(k); return true }).slice(0,6).forEach(p => results.push(p))
    console.log(`[scraper] Instagram (Apify fallback): ${scored.length} posts`)
  } catch (err) { console.error('[scraper] Apify fallback error:', err.message) }
}

// ── YouTube Data API ──────────────────────────────────────────────────────────

async function scrapeYouTube(niches, platforms, results, userCtx = {}) {
  if (!platforms.includes('youtube') && !platforms.includes('all') && platforms.length > 0 && !platforms.includes('instagram')) {
    // Only skip if explicitly filtering to non-youtube platforms
  }
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
        const likes = parseInt(video.statistics?.likeCount || 0)
        const comments = parseInt(video.statistics?.commentCount || 0)
        const title = video.snippet?.title || ''
        if (!title || title.length < 10) continue

        const engagement = views + likes * 10 + comments * 20
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
