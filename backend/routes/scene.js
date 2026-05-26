import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { createGeminiModel, extractJson, extractResponseText } from '../lib/gemini.js'
import { getCreatorProfile } from '../lib/memory.js'
import { GEMINI } from '../constants.js'

const router = Router()
router.use(requireAuth)

/**
 * POST /api/scene/edit
 * User prompts an edit to a specific scene element (visual or voiceover).
 * AI reasons about the change, detects cascading impacts, returns suggestion.
 *
 * Body: { scriptId, sceneNumber, element ('visual'|'voiceover'|'hook'|'cta'),
 *         currentValue, userPrompt, tone, niche, fullScript }
 */
router.post('/edit', async (req, res) => {
  console.log('[scene/edit] body keys:', Object.keys(req.body || {}), '| userId:', req.userId)
  try {
    const {
      sceneNumber,
      element,
      currentValue,
      userPrompt,
      tone = 'storytelling',
      niche = 'lifestyle',
      fullScript = null,
    } = req.body

    if (!element || !currentValue || !userPrompt) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'element, currentValue, userPrompt required' } })
    }

    const profile = await getCreatorProfile(req.userId)
    const voiceTraits = Array.isArray(profile?.voice_traits)
      ? profile.voice_traits
      : (typeof profile?.voice_traits === 'string' ? JSON.parse(profile.voice_traits || '[]') : [])
    const voiceContext = profile
      ? `Creator voice: ${voiceTraits.join(', ')} | Format: ${profile.content_format || 'on-camera'} | Language: ${profile.language_style || 'English'}`
      : ''

    const model = createGeminiModel({ temperature: 0.4, maxOutputTokens: 4000 })

    // Build context about the full script so AI understands cascading changes
    const scriptContext = fullScript ? `
Full script context:
- Hook: "${fullScript.hookLine}"
- Tone: ${fullScript.tone}
- Format: ${fullScript.format}
- Total scenes: ${fullScript.scenes?.length || 0}
${fullScript.scenes?.map(s => `  Scene ${s.sceneNumber}: visual="${s.visuals?.slice(0,60)}" voiceover="${s.voiceover?.slice(0,60)}"`).join('\n') || ''}
` : ''

    const prompt = `You are a script coach helping a ${niche} content creator refine their reel script.
${voiceContext ? `\n${voiceContext}\n` : ''}
${scriptContext}

CURRENT SCENE ${sceneNumber || ''}:
${element === 'visual' ? `Visual (instruction): "${currentValue}"` : ''}
${element === 'voiceover' ? `Voiceover (spoken words): "${currentValue}"` : ''}
${element === 'hook' ? `Hook (first 3 seconds): "${currentValue}"` : ''}
${element === 'cta' ? `Call to action: "${currentValue}"` : ''}

USER WANTS: "${userPrompt}"

Analyse this change request and respond with ONLY valid JSON:
{
  "suggestion": "the new improved ${element} text",
  "reasoning": "2-3 sentences explaining WHY this change works (cite platform behaviour, audience psychology, or content data — not vague praise)",
  "confidence": "high|medium|low",
  "pros": ["specific benefit 1", "specific benefit 2"],
  "cons": ["potential risk 1 if any, or empty"],
  "cascadingChange": {
    "needed": true,
    "element": "voiceover|visual|null",
    "reason": "why the other element needs updating",
    "suggestion": "updated text for the other element"
  },
  "dataSource": "platform_pattern|audience_psychology|content_structure|style_suggestion"
}

Rules:
- If the change is a bad idea, say so clearly in reasoning with specific reason
- cascadingChange.needed = true only if the other element truly becomes inconsistent
- dataSource tells user whether this is data-backed or a style suggestion
- Keep suggestion in creator's language style: ${profile?.language_style || 'English'}`

    const response = await model.invoke(prompt)
    const content = extractResponseText(response)
    const parsed = extractJson(content)

    res.json({ success: true, data: parsed })
  } catch (err) {
    const detail = err.cause?.message || err.response?.data?.error?.message || err.message
    console.error('[scene/edit] Error:', detail, '\n', err.stack?.split('\n').slice(0,3).join('\n'))
    res.status(500).json({ success: false, error: { code: 'EDIT_ERROR', message: detail } })
  }
})

/**
 * POST /api/scene/followup
 * Continue the conversation after an initial edit suggestion.
 * User provides additional context/constraint and AI refines.
 *
 * Body: { previousSuggestion, followupPrompt, element, tone, niche, languageStyle }
 */
router.post('/followup', async (req, res) => {
  try {
    const {
      previousSuggestion,
      followupPrompt,
      element,
      tone = 'storytelling',
      niche = 'lifestyle',
      languageStyle = 'English',
    } = req.body

    if (!previousSuggestion || !followupPrompt) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS' } })
    }

    const profile = await getCreatorProfile(req.userId)
    const model = createGeminiModel({ temperature: 0.5, maxOutputTokens: 2000 })

    const prompt = `You are refining a ${element} for a ${niche} content creator.

Previous suggestion: "${previousSuggestion}"
Creator's feedback: "${followupPrompt}"
Language style: ${profile?.language_style || languageStyle}
Tone: ${tone}

Generate a refined version based on their feedback. Return ONLY valid JSON:
{
  "suggestion": "refined ${element} text",
  "reasoning": "1-2 sentences on what changed and why it's better",
  "dataSource": "platform_pattern|audience_psychology|content_structure|style_suggestion"
}`

    const response = await model.invoke(prompt)
    const content = extractResponseText(response)
    const parsed = extractJson(content)

    res.json({ success: true, data: parsed })
  } catch (err) {
    const detail = err.cause?.message || err.response?.data?.error?.message || err.message
    console.error('[scene/followup] Error:', detail)
    res.status(500).json({ success: false, error: { code: 'FOLLOWUP_ERROR', message: detail } })
  }
})

export default router
