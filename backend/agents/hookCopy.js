import { ChatAnthropic } from '@langchain/anthropic'
import { MOCK_CONTENT_KIT } from '../mockData.js'

/**
 * Agent 4 — Hook & Copy Generator
 * Uses Claude to generate the full content kit: hook variants, caption, hashtags, thumbnail text.
 * Falls back to mock content kit if ANTHROPIC_API_KEY is not set.
 */
export async function generateCopyKit(script, topicTitle, niche) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[hookCopy] No ANTHROPIC_API_KEY — returning mock content kit')
    return MOCK_CONTENT_KIT
  }

  try {
    const model = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      temperature: 0.8,
      maxTokens: 2000,
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const scriptSummary = `
Topic: ${topicTitle}
Hook: ${script.hookLine}
Tone: ${script.tone}
Format: ${script.format}
Key scenes: ${script.scenes.map(s => s.voiceover).join(' | ')}
CTA: ${script.cta}
`.trim()

    const prompt = `You are a social media copywriter specializing in viral Instagram Reels content for ${niche} creators.

Given this reel script about "${topicTitle}":

${scriptSummary}

Generate a complete content kit. Return ONLY valid JSON (no markdown, no explanation):

{
  "hookVariants": [
    "curiosity hook — create an information gap, make them wonder what happens next",
    "bold claim hook — make a strong, specific, surprising claim that demands attention",
    "question hook — ask a question the target audience can NOT ignore"
  ],
  "caption": "Full Instagram caption with emojis, line breaks for readability. Include a story/value element (3-4 lines), a list of key takeaways or benefits (3-5 bullet points with emojis), and an engagement CTA at the end. 150-200 words total. Make it feel authentic, not corporate.",
  "hashtags": {
    "niche": ["5 highly specific hashtags for the ${niche} niche — medium competition"],
    "trending": ["5 currently relevant/trending hashtags related to this topic"],
    "broad": ["8-10 broad reach hashtags that reach a wider audience"]
  },
  "thumbnailText": "BOLD 3-6 WORD TEXT OVERLAY IN ALL CAPS — should make someone stop scrolling in the feed preview"
}

Rules:
- hookVariants: each must be under 15 words, punchy, scroll-stopping
- caption: use actual line breaks (\\n), authentic voice, NOT generic
- hashtags: include the # symbol, realistic and relevant
- thumbnailText: ALL CAPS, 3-6 words maximum, create curiosity or bold claim`

    const response = await model.invoke(prompt)
    const content = response.content

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON in Claude response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.hookVariants || !parsed.caption || !parsed.hashtags) {
      throw new Error('Invalid content kit structure from Claude')
    }

    console.log(`[hookCopy] Generated content kit for "${topicTitle}"`)

    return {
      hookVariants: parsed.hookVariants,
      caption: parsed.caption,
      hashtags: {
        niche: parsed.hashtags.niche || [],
        trending: parsed.hashtags.trending || [],
        broad: parsed.hashtags.broad || []
      },
      thumbnailText: parsed.thumbnailText || topicTitle.toUpperCase().slice(0, 30)
    }
  } catch (err) {
    console.error('[hookCopy] Claude error, falling back to mock:', err.message)
    return MOCK_CONTENT_KIT
  }
}
