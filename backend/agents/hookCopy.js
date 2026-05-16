import { createGeminiModel, hasGeminiCredentials, extractJson, extractResponseText } from '../lib/gemini.js'

/**
 * Agent 4 — Hook & Copy Generator
 * Generates hook variants, caption, hashtags, thumbnail text via Gemini.
 * When creatorContext provided, hooks match creator's voice fingerprint.
 */
export async function generateCopyKit(script, topicTitle, niche, creatorContext = null) {
  if (!hasGeminiCredentials()) {
    throw new Error('Gemini credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env')
  }

  const model = createGeminiModel({ temperature: 0.8, maxOutputTokens: 4096 })

  const scriptSummary = `Topic: ${topicTitle}
Hook: ${script.hookLine}
Tone: ${script.tone}
Format: ${script.format}
Key scenes: ${script.scenes.map(s => s.voiceover).join(' | ')}
CTA: ${script.cta}`.trim()

  const voiceContext = creatorContext?.profile
    ? `\nCREATOR VOICE: ${(creatorContext.profile.voice_traits || []).join(', ')} | Goal: ${creatorContext.profile.primary_goal} | Audience: ${creatorContext.profile.audience_persona}\n`
    : ''

  const prompt = `You are a social media copywriter specializing in viral Instagram Reels for ${niche} creators.
${voiceContext}
Given this reel script about "${topicTitle}":

${scriptSummary}

Generate a complete content kit. Return ONLY valid JSON, no markdown:

{
  "hookVariants": [
    "curiosity hook — create an information gap",
    "bold claim hook — strong, specific, surprising claim",
    "question hook — question the audience cannot ignore"
  ],
  "caption": "Full Instagram caption with emojis and line breaks. Story/value element (3-4 lines), bullet takeaways (3-5 with emojis), engagement CTA. 150-200 words. Authentic voice.",
  "hashtags": {
    "niche": ["5 specific ${niche} hashtags — medium competition"],
    "trending": ["5 currently relevant trending hashtags"],
    "broad": ["8-10 broad reach hashtags"]
  },
  "thumbnailText": "BOLD 3-6 WORD OVERLAY IN ALL CAPS"
}

Rules:
- hookVariants: under 15 words each, punchy, scroll-stopping
- caption: real line breaks (\\n), authentic not corporate
- hashtags: include # symbol
- thumbnailText: ALL CAPS, 3-6 words max`

  const response = await model.invoke(prompt)
  const content = extractResponseText(response)
  const parsed = extractJson(content)

  if (!parsed.hookVariants || !parsed.caption || !parsed.hashtags) {
    throw new Error('Invalid content kit structure from Gemini')
  }

  console.log(`[hookCopy] Generated content kit for "${topicTitle}"${creatorContext ? ' (with creator voice)' : ''}`)

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
}
