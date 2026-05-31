import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { createGeminiModel, extractJson, extractResponseText } from '../lib/gemini.js'
import { getCreatorProfile } from '../lib/memory.js'
import { GEMINI } from '../constants.js'
import { logger } from '../lib/logger.js'
import { aiAssistLimiter, requireBrowserLike } from '../lib/limiters.js'
import { validate, sanitizeText, VALID_TONES, VALID_ELEMENTS } from '../lib/validate.js'

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
router.post(
  '/edit',
  requireBrowserLike,
  aiAssistLimiter,
  validate({
    body: {
      element:      { required: true, type: 'string', oneOf: VALID_ELEMENTS },
      currentValue: { required: true, type: 'string', maxLength: 1000 },
      userPrompt:   { required: true, type: 'string', maxLength: 500 },
      sceneNumber:  { type: 'integer', min: 1, max: 50 },
      tone:         { type: 'string', oneOf: VALID_TONES },
      niche:        { type: 'string', maxLength: 50 },
    },
  }),
  async (req, res) => {
  logger.info('scene.edit', { userId: req.userId, keys: Object.keys(req.body || {}) })
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

    // Sanitize user-supplied text before interpolating into the AI prompt
    const safeCurrentValue = sanitizeText(currentValue, 1000)
    const safeUserPrompt   = sanitizeText(userPrompt, 500)
    const safeTone         = sanitizeText(tone, 50)
    const safeNiche        = sanitizeText(niche, 50)

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

    const prompt = `You are a script coach helping a ${safeNiche} content creator refine their reel script.
${voiceContext ? `\n${voiceContext}\n` : ''}
${scriptContext}

CURRENT SCENE ${sceneNumber || ''}:
${element === 'visual'    ? `Visual (instruction): <current_value>${safeCurrentValue}</current_value>` : ''}
${element === 'voiceover' ? `Voiceover (spoken words): <current_value>${safeCurrentValue}</current_value>` : ''}
${element === 'hook'      ? `Hook (first 3 seconds): <current_value>${safeCurrentValue}</current_value>` : ''}
${element === 'cta'       ? `Call to action: <current_value>${safeCurrentValue}</current_value>` : ''}

USER REQUEST: <user_request>${safeUserPrompt}</user_request>

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
- Keep suggestion in creator's language style: ${sanitizeText(profile?.language_style || 'English', 50)}`

    const response = await model.invoke(prompt)
    const content = extractResponseText(response)
    const parsed = extractJson(content)

    res.json({ success: true, data: parsed })
  } catch (err) {
    const detail = err.cause?.message || err.response?.data?.error?.message || err.message
    console.error('[scene/edit] Error:', detail, '\n', err.stack?.split('\n').slice(0,3).join('\n'))
    res.status(500).json({ success: false, error: { code: 'EDIT_ERROR', message: detail } })
  }
  }
)

/**
 * POST /api/scene/followup
 * Continue the conversation after an initial edit suggestion.
 * User provides additional context/constraint and AI refines.
 *
 * Body: { previousSuggestion, followupPrompt, element, tone, niche, languageStyle }
 */
router.post(
  '/followup',
  requireBrowserLike,
  aiAssistLimiter,
  validate({
    body: {
      previousSuggestion: { required: true, type: 'string', maxLength: 2000 },
      followupPrompt:     { required: true, type: 'string', maxLength: 500 },
      element:            { type: 'string', oneOf: VALID_ELEMENTS },
      tone:               { type: 'string', oneOf: VALID_TONES },
      niche:              { type: 'string', maxLength: 50 },
      languageStyle:      { type: 'string', maxLength: 50 },
    },
  }),
  async (req, res) => {
  try {
    const {
      previousSuggestion,
      followupPrompt,
      element,
      tone = 'storytelling',
      niche = 'lifestyle',
      languageStyle = 'English',
    } = req.body

    // Sanitize user-supplied text before interpolating into the AI prompt
    const safePrevious = sanitizeText(previousSuggestion, 2000)
    const safeFollowup = sanitizeText(followupPrompt, 500)
    const safeTone     = sanitizeText(tone, 50)
    const safeNiche    = sanitizeText(niche, 50)

    const profile = await getCreatorProfile(req.userId)
    const model = createGeminiModel({ temperature: 0.5, maxOutputTokens: 2000 })
    const safeLang = sanitizeText(profile?.language_style || languageStyle, 50)

    const prompt = `You are refining a ${element || 'script element'} for a ${safeNiche} content creator.

Previous suggestion: <previous>${safePrevious}</previous>
Creator's feedback: <feedback>${safeFollowup}</feedback>
Language style: ${safeLang}
Tone: ${safeTone}

Generate a refined version based on their feedback. Return ONLY valid JSON:
{
  "suggestion": "refined text",
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
  }
)

export default router
