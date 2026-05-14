import { ChatAnthropic } from '@langchain/anthropic'
import { MOCK_SCRIPT } from '../mockData.js'

/**
 * Agent 3 — Script Writer
 * Uses Claude to write full short-form video scripts.
 * Falls back to mock script if ANTHROPIC_API_KEY is not set.
 */

const SCENE_COUNTS = {
  '30s': { min: 3, max: 4, label: '3-4' },
  '60s': { min: 5, max: 6, label: '5-6' },
  '90s': { min: 7, max: 9, label: '7-9' }
}

const TONE_GUIDES = {
  educational: 'informative and authoritative — teach something valuable, use data/facts, position as expert',
  entertaining: 'fun and high-energy — use humor, unexpected twists, keep energy up throughout',
  controversial: 'provocative and bold — challenge conventional wisdom, take a strong stance, be willing to be divisive',
  storytelling: 'personal and narrative — use first-person story arc, emotional beats, build to a resolution'
}

export async function writeScript(topic, topicTitle, tone, format, niche) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[scriptWriter] No ANTHROPIC_API_KEY — returning mock script')
    return {
      ...MOCK_SCRIPT,
      topicId: topic,
      topicTitle,
      tone,
      format,
      niche
    }
  }

  const sceneConfig = SCENE_COUNTS[format] || SCENE_COUNTS['60s']
  const toneGuide = TONE_GUIDES[tone] || TONE_GUIDES['educational']

  try {
    const model = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      temperature: 0.7,
      maxTokens: 3000,
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const prompt = `You are a viral short-form video scriptwriter. You specialize in creating high-converting scripts for Instagram Reels, TikTok, and YouTube Shorts.

Write a ${format} ${tone} short-form video script about "${topicTitle}" for a ${niche} creator.

Tone guide: ${toneGuide}

Script requirements:
- hookLine: The opening line spoken in the FIRST 3 SECONDS — must stop the scroll, create instant curiosity or emotional reaction
- scenes: Exactly ${sceneConfig.label} scenes (aim for ${sceneConfig.max})
  - Each scene: sceneNumber (1, 2, 3...), visuals (specific b-roll or shot description for the videographer), voiceover (exact spoken words), duration (e.g. '~8s', '~10s')
  - Total scene durations should add up to approximately ${format === '30s' ? '28-32' : format === '60s' ? '55-65' : '85-95'} seconds
  - The hookLine should be the voiceover of scene 1
- cta: Call-to-action for the END of the video — specific, actionable, drives follow/save/comment

Platform: Instagram Reels (vertical 9:16, fast cuts, text overlays typical)
Niche audience: ${niche} creators and their followers

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "hookLine": "...",
  "scenes": [
    {
      "sceneNumber": 1,
      "visuals": "...",
      "voiceover": "...",
      "duration": "~Xs"
    }
  ],
  "cta": "..."
}`

    const response = await model.invoke(prompt)
    const content = response.content

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON in Claude response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.hookLine || !parsed.scenes || !Array.isArray(parsed.scenes)) {
      throw new Error('Invalid script structure from Claude')
    }

    console.log(`[scriptWriter] Generated script with ${parsed.scenes.length} scenes for "${topicTitle}"`)

    return {
      topicId: topic,
      topicTitle,
      tone,
      format,
      hookLine: parsed.hookLine,
      scenes: parsed.scenes,
      cta: parsed.cta || 'Follow for more content like this.',
      niche,
      platform: 'instagram'
    }
  } catch (err) {
    console.error('[scriptWriter] Claude error, falling back to mock:', err.message)
    return {
      ...MOCK_SCRIPT,
      topicId: topic,
      topicTitle,
      tone,
      format,
      niche
    }
  }
}
