import { createGeminiModel, hasGeminiCredentials, extractJson } from '../lib/gemini.js'

/**
 * Agent 2 — Trend Analyst
 * Scores virality, deduplicates, picks top 3 recommendations.
 */
export async function analyzeTrends(rawTrends, niches) {
  if (!rawTrends || rawTrends.length === 0) {
    throw new Error('No trend data to analyze — scrapers returned empty results')
  }

  if (!hasGeminiCredentials()) {
    throw new Error('Gemini credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env')
  }

  const model = createGeminiModel({ temperature: 0.3, maxOutputTokens: 4096 })
  const trendsJson = JSON.stringify(rawTrends, null, 2)

  const prompt = `You are a social media trend analyst specializing in content virality prediction.

Given this list of trending topics from social media, analyze each one and return a JSON object.

Raw trend data:
${trendsJson}

Target niches: ${niches.join(', ')}

For each trend, determine:
- id: keep original id
- title: clean up the title if needed (max 80 chars, remove spam/noise)
- platform: keep original ('instagram', 'x', or 'reddit')
- signal: classify as 'viral' (explosive growth, >50k engagement), 'rising' (steady climb, 5k-50k), or 'new' (emerging, <5k)
- summary: one sentence explaining WHY this is trending right now (max 15 words, be specific)
- score: 0-100 viral potential score based on: engagement velocity (40%), cross-platform presence (30%), recency (20%), niche relevance (10%)
- niche: detected content niche (fitness, finance, tech, lifestyle, food, beauty, gaming, travel, etc.)
- createdAt: keep original or use current ISO timestamp

Also identify the top 3 trends by score as "recommendations".

Return ONLY valid JSON:
{
  "trends": [...],
  "recommendations": [...top 3 trend objects...]
}

No markdown, no explanation. Raw JSON only.`

  const response = await model.invoke(prompt)
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  const parsed = extractJson(content)

  if (!parsed.trends || !Array.isArray(parsed.trends)) {
    throw new Error('Invalid response structure from Gemini')
  }

  console.log(`[trendAnalyst] Analyzed ${parsed.trends.length} trends, ${parsed.recommendations?.length || 0} recommendations`)

  return {
    trends: parsed.trends,
    recommendations: parsed.recommendations || parsed.trends.sort((a, b) => b.score - a.score).slice(0, 3)
  }
}
