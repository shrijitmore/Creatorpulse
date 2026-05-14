import { createGeminiModel, hasGeminiCredentials, extractJson } from '../lib/gemini.js'

/**
 * Agent 3 — Script Writer
 * Generates full scene-by-scene reel scripts via Gemini.
 */

const SCENE_COUNTS = {
  '30s': { max: 4, label: '3-4' },
  '60s': { max: 6, label: '5-6' },
  '90s': { max: 9, label: '7-9' }
}

const TONE_GUIDES = {
  educational:  'informative and authoritative — teach something valuable, use data/facts, position as expert',
  entertaining: 'fun and high-energy — use humor, unexpected twists, keep energy up throughout',
  controversial:'provocative and bold — challenge conventional wisdom, take a strong stance, be willing to be divisive',
  storytelling: 'personal and narrative — use first-person story arc, emotional beats, build to a resolution'
}

export async function writeScript(topic, topicTitle, tone, format, niche) {
  if (!hasGeminiCredentials()) {
    throw new Error('Gemini credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env')
  }

  const sceneConfig = SCENE_COUNTS[format] || SCENE_COUNTS['60s']
  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES['educational']
  const totalSecs = format === '30s' ? '28-32' : format === '60s' ? '55-65' : '85-95'

  const model = createGeminiModel({ temperature: 0.7, maxOutputTokens: 3000 })

  const prompt = `You are a viral short-form video scriptwriter specializing in Instagram Reels, TikTok, and YouTube Shorts.

Write a ${format} ${tone} short-form video script about "${topicTitle}" for a ${niche} creator.

Tone guide: ${toneGuide}

Requirements:
- hookLine: Opening line spoken in FIRST 3 SECONDS — must stop the scroll instantly
- scenes: Exactly ${sceneConfig.label} scenes (aim for ${sceneConfig.max})
  - Each scene: sceneNumber, visuals (specific b-roll/shot description), voiceover (exact words), duration (~Xs)
  - Total duration: ~${totalSecs} seconds
  - hookLine = voiceover of scene 1
- cta: End call-to-action — specific, drives follow/save/comment

Platform: Instagram Reels (9:16 vertical)
Audience: ${niche} creators and followers

Return ONLY valid JSON, no markdown:
{
  "hookLine": "...",
  "scenes": [{ "sceneNumber": 1, "visuals": "...", "voiceover": "...", "duration": "~Xs" }],
  "cta": "..."
}`

  const response = await model.invoke(prompt)
  const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)
  const parsed = extractJson(content)

  if (!parsed.hookLine || !parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Invalid script structure from Gemini')
  }

  console.log(`[scriptWriter] Generated ${parsed.scenes.length} scenes for "${topicTitle}"`)

  return {
    topicId: topic, topicTitle, tone, format,
    hookLine: parsed.hookLine,
    scenes: parsed.scenes,
    cta: parsed.cta || 'Follow for more content like this.',
    niche, platform: 'instagram'
  }
}
