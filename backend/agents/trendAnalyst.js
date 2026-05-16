import { createGeminiModel, hasGeminiCredentials, extractJson } from '../lib/gemini.js'
import { GEMINI, SCRAPING } from '../constants.js'

const VALID_NICHES = ['fitness', 'finance', 'tech', 'lifestyle', 'food', 'travel', 'beauty', 'gaming']

/**
 * Agent 2 — Trend Analyst
 * Enriches top 15 trends with Gemini (clean title, why-trending summary, re-scored).
 * Returns ALL trends — top 15 enriched, rest with raw scores.
 * Matches by title (not ID) since Gemini often reassigns IDs.
 */
export async function analyzeTrends(rawTrends, niches) {
  if (!rawTrends || rawTrends.length === 0) throw new Error('No trend data to analyze')
  if (!hasGeminiCredentials()) throw new Error('Gemini credentials not configured')

  const cap = SCRAPING.trend_analyst_input_cap
  const topTrends = rawTrends.slice(0, cap)

  const model = createGeminiModel({ temperature: GEMINI.analyst_temp, maxOutputTokens: GEMINI.analyst_tokens })

  const validNicheStr = VALID_NICHES.join(', ')

  const prompt = `You are a social media trend analyst for content creators.

TARGET NICHES: ${niches.join(', ')}
VALID NICHES (use ONLY these): ${validNicheStr}

POSTS TO ANALYSE (${topTrends.length} items):
${topTrends.map((t, i) => `${i+1}. [${t.platform}|${t.niche}] "${t.title?.slice(0,100)}" raw_score:${t.score}`).join('\n')}

For EACH post (return ALL ${topTrends.length}):
- title: clean English headline max 80 chars (translate non-English, remove CTAs, fix truncation)
- platform: keep original
- niche: pick from VALID NICHES only — match the actual topic NOT the platform. "Georgia Tech graduation" = lifestyle, not tech
- signal: "viral" if score≥80, "rising" if ≥55, "new" below
- summary: WHY trending right now in 12 words max — be specific, cite the dynamic
- score: 0-100 viral potential for a content creator
- idx: the number from the list (1, 2, 3...) — IMPORTANT for matching

Pick top 3 as recommendations.

Return ONLY valid JSON (NO markdown):
{"trends":[{"idx":1,"title":"...","platform":"...","signal":"...","summary":"...","score":0,"niche":"..."}],"recommendations":[{"idx":1},{"idx":2},{"idx":3}]}`

  const response = await model.invoke(prompt)
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  const parsed = extractJson(content)

  if (!parsed.trends || !Array.isArray(parsed.trends)) throw new Error('Invalid response from Gemini')

  // Match by index (1-based) — reliable even when Gemini changes IDs
  const enriched = parsed.trends.map(t => {
    const idx = (t.idx || 1) - 1  // convert 1-based to 0-based
    const original = topTrends[idx] || {}
    const niche = VALID_NICHES.includes(t.niche) ? t.niche : (original.niche || 'lifestyle')
    return { ...original, ...t, id: original.id || t.id, niche }
  }).filter(t => t.id)  // drop any that couldn't be matched

  // Append unanalyzed trends (with their raw data)
  const enrichedIds = new Set(enriched.map(t => t.id))
  const remaining = rawTrends.filter(r => !enrichedIds.has(r.id))
  const allTrends = [...enriched, ...remaining]

  // Recommendations matched by index
  const recs = (parsed.recommendations || [])
    .map(r => {
      const idx = (r.idx || r.id || 1)
      const numIdx = typeof idx === 'number' ? idx - 1 : 0
      return enriched[numIdx] || null
    })
    .filter(Boolean)
    .slice(0, 3)

  const finalRecs = recs.length > 0
    ? recs
    : [...enriched].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3)

  console.log(`[trendAnalyst] ${enriched.length} enriched + ${remaining.length} raw = ${allTrends.length} total | ${finalRecs.length} recommendations`)

  return { trends: allTrends, recommendations: finalRecs }
}
