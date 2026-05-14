import { ChatAnthropic } from '@langchain/anthropic'
import { MOCK_TRENDS, MOCK_RECOMMENDATIONS } from '../mockData.js'

/**
 * Agent 2 — Trend Analyst
 * Uses Claude to analyze raw trend data, score virality, and pick recommendations.
 * Falls back to mock data if ANTHROPIC_API_KEY is not set.
 */
export async function analyzeTrends(rawTrends, niches) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[trendAnalyst] No ANTHROPIC_API_KEY — returning mock analyzed trends')
    return {
      trends: MOCK_TRENDS,
      recommendations: MOCK_RECOMMENDATIONS
    }
  }

  try {
    const model = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 4096,
      apiKey: process.env.ANTHROPIC_API_KEY
    })

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

Also identify the top 3 trends by score as "recommendations" (best content opportunities).

Return ONLY valid JSON in this exact format:
{
  "trends": [...array of all analyzed trend objects...],
  "recommendations": [...array of top 3 trend objects...]
}

Do not include any explanation or markdown. Return raw JSON only.`

    const response = await model.invoke(prompt)
    const content = response.content

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON in Claude response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.trends || !Array.isArray(parsed.trends)) {
      throw new Error('Invalid response structure from Claude')
    }

    console.log(`[trendAnalyst] Analyzed ${parsed.trends.length} trends, ${parsed.recommendations?.length || 0} recommendations`)

    return {
      trends: parsed.trends,
      recommendations: parsed.recommendations || parsed.trends.sort((a, b) => b.score - a.score).slice(0, 3)
    }
  } catch (err) {
    console.error('[trendAnalyst] Claude error, falling back to mock:', err.message)
    return {
      trends: MOCK_TRENDS,
      recommendations: MOCK_RECOMMENDATIONS
    }
  }
}
