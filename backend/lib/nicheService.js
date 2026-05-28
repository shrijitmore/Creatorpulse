import { createGeminiModel, extractResponseText, extractJson, hasGeminiCredentials } from './gemini.js'
import { NICHE_IG_HASHTAGS, NICHE_SUBREDDITS, NICHE_YT_CATEGORIES } from '../constants.js'

const SYSTEM_PROMPT = `You are a content niche classifier for a creator intelligence tool.

Given a user's description of their content niche or topic, you must:
1. Identify the specific, narrow content niche
2. Generate relevant search data for Instagram, Reddit, and YouTube
3. If the description is genuinely unclear or too broad to generate useful data, ask exactly 1-2 clarifying questions

IMPORTANT RULES:
- Never assume or guess broadly — if someone says "health" ask whether it's fitness, mental health, nutrition, skincare, etc.
- For specific niches (e.g. "dog training", "sourdough baking", "day trading"), proceed directly — no questions needed
- Keep nicheId as kebab-case, short, descriptive (e.g. "dog-training", "sourdough", "day-trading")
- Hashtags: 5-8, no # prefix, sorted by relevance
- Subreddits: 2-4, exact subreddit names (case-sensitive as they appear on reddit.com/r/...)
- ytQuery: a YouTube search string that would surface trending videos in this niche (under 60 chars)
- Questions: only when genuinely unclear. Plain strings, direct, no bullet points in the question itself.

Always respond with valid JSON only. No markdown, no extra text.

Response shape when understood:
{
  "understood": true,
  "nicheId": "kebab-case-id",
  "nicheLabel": "Human Readable Label",
  "hashtags": ["tag1", "tag2", ...],
  "subreddits": ["SubredditName", ...],
  "ytQuery": "search query here"
}

Response shape when unclear:
{
  "understood": false,
  "questions": ["First clarifying question?", "Second clarifying question?"]
}`

export async function interpretNiche(query) {
  if (!query?.trim()) throw new Error('No query provided')

  // Check against known presets first — no AI needed
  const lower = query.trim().toLowerCase().replace(/\s+/g, '-')
  const knownId = Object.keys(NICHE_IG_HASHTAGS).find(id =>
    id === lower || id === lower.replace(/-/g, '') || id.replace(/-/g, '') === lower.replace(/-/g, '')
  )

  if (knownId) {
    const label = knownId.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    return {
      understood: true,
      nicheId: knownId,
      nicheLabel: label,
      hashtags: NICHE_IG_HASHTAGS[knownId] || [knownId],
      subreddits: NICHE_SUBREDDITS[knownId] || [knownId],
      ytQuery: NICHE_YT_CATEGORIES[knownId]?.query || `${label} tips 2024`,
      isPreset: true,
    }
  }

  // No Gemini credentials — fall back to treating the query as a niche directly
  if (!hasGeminiCredentials()) {
    const slug = query.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    return {
      understood: true,
      nicheId: slug,
      nicheLabel: query.trim(),
      hashtags: [slug, ...slug.split('-')].filter(Boolean).slice(0, 5),
      subreddits: [slug],
      ytQuery: `${query.trim()} tips guide`,
      isPreset: false,
    }
  }

  const model = createGeminiModel({ temperature: 0.3, maxOutputTokens: 600 })
  const response = await model.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `My content niche: "${query.trim()}"` },
  ])

  const text = extractResponseText(response)
  const parsed = extractJson(text)

  if (!parsed || typeof parsed.understood !== 'boolean') {
    throw new Error('Unexpected AI response format')
  }

  return parsed
}
