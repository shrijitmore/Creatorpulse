import { createGeminiModel, hasGeminiCredentials, extractJson, extractResponseText } from '../lib/gemini.js'

/**
 * Agent 3 — Script Writer
 * Generates full scene-by-scene reel scripts via Gemini.
 * When creatorContext provided, injects RAG memory + voice profile.
 */

const SCENE_COUNTS = {
  '30s': { max: 4, label: '3-4' },
  '60s': { max: 6, label: '5-6' },
  '90s': { max: 9, label: '7-9' }
}

const TONE_GUIDES = {
  educational:   'informative and authoritative — teach something valuable, use data/facts, position as expert',
  entertaining:  'fun and high-energy — use humor, unexpected twists, keep energy up throughout',
  controversial: 'provocative and bold — challenge conventional wisdom, take a strong stance, be willing to be divisive',
  storytelling:  'personal and narrative — use first-person story arc, emotional beats, build to a resolution'
}

export async function writeScript(topic, topicTitle, tone, format, niche, creatorContext = null) {
  if (!hasGeminiCredentials()) {
    throw new Error('Gemini credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in backend/.env')
  }

  const sceneConfig = SCENE_COUNTS[format] || SCENE_COUNTS['60s']
  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES['educational']
  const totalSecs = format === '30s' ? '28-32' : format === '60s' ? '55-65' : '85-95'

  const model = createGeminiModel({ temperature: 0.7, maxOutputTokens: 3000 })

  const contextBlock = creatorContext?.systemPrompt
    ? `\n${creatorContext.systemPrompt}\n\n---\n`
    : ''

  // Language-aware voiceover instruction
  const languageStyle = creatorContext?.profile?.language_style || 'English'
  const isCodeSwitch = /hinglish|hindi|marathi|kannada|urdu|tamil|bengali/i.test(languageStyle)
  const langInstruction = isCodeSwitch
    ? `IMPORTANT: Write ALL voiceovers in ${languageStyle} — the exact mix this creator uses. Visuals stay in English (they are filming instructions). Do NOT write voiceovers in pure English.`
    : languageStyle !== 'English'
      ? `Write voiceovers in ${languageStyle}. Visuals stay in English.`
      : ''

  const prompt = `You are a viral short-form video scriptwriter specializing in Instagram Reels, TikTok, and YouTube Shorts.
${contextBlock}
Write a ${format} ${tone} short-form video script about "${topicTitle}" for a ${niche} creator.

Tone guide: ${toneGuide}
${langInstruction ? `\n${langInstruction}\n` : ''}
Requirements:
- hookLine: Opening line SPOKEN (not written) in FIRST 3 SECONDS — must stop the scroll instantly
- scenes: Exactly ${sceneConfig.label} scenes (aim for ${sceneConfig.max})
  - visuals: English instruction for the creator/editor (b-roll, shot type, camera direction)
  - voiceover: Exact SPOKEN words — ${langInstruction ? `in ${languageStyle}` : 'natural, conversational'}
  - duration: timing estimate
  - hookLine = voiceover of scene 1
- cta: Call-to-action — specific, drives follow/save/comment

Platform: Instagram Reels (9:16 vertical)

Return ONLY valid JSON, no markdown:
{
  "hookLine": "...",
  "scenes": [{ "sceneNumber": 1, "visuals": "...", "voiceover": "...", "duration": "~Xs" }],
  "cta": "..."
}`

  const response = await model.invoke(prompt)
  const content = extractResponseText(response)
  const parsed = extractJson(content)

  if (!parsed.hookLine || !parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Invalid script structure from Gemini')
  }

  console.log(`[scriptWriter] Generated ${parsed.scenes.length} scenes for "${topicTitle}"${creatorContext ? ' (with creator memory)' : ''}`)

  return {
    topicId: topic, topicTitle, tone, format,
    hookLine: parsed.hookLine,
    scenes: parsed.scenes,
    cta: parsed.cta || 'Follow for more content like this.',
    niche, platform: 'instagram'
  }
}
