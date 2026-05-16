import { createGeminiModel, extractJson, extractResponseText } from '../lib/gemini.js'
import { saveCreatorProfile } from '../lib/memory.js'
import { GEMINI } from '../constants.js'

/**
 * Agent 5 — Onboarding Processor
 * Processes 8-step onboarding answers:
 * - Extracts voice traits from sample (Gemini)
 * - Infers audience age if user skipped it (Gemini)
 * - Infers audience persona if blank
 * - Persists full Creator Profile to DB
 */
export async function processOnboarding(userId, answers) {
  const {
    creatorName,
    platforms = [],
    contentStyles = [],
    contentFormat = 'on-camera',
    languageStyle = 'English',
    audiencePersona = '',
    primaryGoal = 'Grow audience',
    rawVoiceSample = '',
    niches = [],
  } = answers

  const model = createGeminiModel({ temperature: GEMINI.onboarding_temp, maxOutputTokens: GEMINI.onboarding_tokens })

  // Single Gemini call — extract voice traits + infer audience if needed
  const needsAudienceInference = !audiencePersona || audiencePersona === '(ai-infer)'

  const prompt = `You are analysing a content creator's onboarding answers to build their AI profile.

Creator info:
- Name: ${creatorName}
- Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
- Content styles: ${Array.isArray(contentStyles) ? contentStyles.join(', ') : contentStyles}
- Content format: ${contentFormat}
- Language style: ${languageStyle}
- Primary goal: ${primaryGoal}
- Niches: ${niches.join(', ')}
${audiencePersona && audiencePersona !== '(ai-infer)' ? `- Audience (user-stated): ${audiencePersona}` : '- Audience: not provided — infer it'}
${rawVoiceSample ? `\nVoice sample:\n"${rawVoiceSample.slice(0, 600)}"` : ''}

Return ONLY valid JSON:
{
  "voiceTraits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "audienceAge": "18-28",
  "audiencePersona": "one sentence describing their ideal viewer",
  "audienceInferred": ${needsAudienceInference},
  "energyLevel": "high|medium|low",
  "formalityLevel": "casual|semi-formal|formal",
  "suggestedTone": "educational|entertaining|controversial|storytelling",
  "nicheStrengths": {"fitness": 80, "tech": 60}
}

voiceTraits examples: "data-driven", "first-person", "punchy sentences", "uses questions", "high energy", "vulnerable", "motivational", "code-switches languages"
For ${languageStyle} creators, add language-specific traits if relevant.
If no voice sample, infer from content styles and format.`

  let voiceTraits = contentStyles.slice(0, 3)
  let nicheStrengths = {}
  let refinedPersona = audiencePersona && audiencePersona !== '(ai-infer)' ? audiencePersona : ''
  let audienceAge = '18-35'

  try {
    const response = await model.invoke(prompt)
    const content = extractResponseText(response)
    const parsed = extractJson(content)

    voiceTraits = parsed.voiceTraits || voiceTraits
    refinedPersona = parsed.audiencePersona || refinedPersona
    audienceAge = parsed.audienceAge || audienceAge
    nicheStrengths = parsed.nicheStrengths || buildNicheStrengths(niches, contentStyles)

    console.log(`[onboarding] Profile built for "${creatorName}" — traits: ${voiceTraits.join(', ')}`)
  } catch (err) {
    console.error('[onboarding] Gemini analysis error:', err.message)
    nicheStrengths = buildNicheStrengths(niches, contentStyles)
  }

  const profileData = {
    creatorName,
    platforms: Array.isArray(platforms) ? platforms : [platforms],
    contentStyles: Array.isArray(contentStyles) ? contentStyles : [contentStyles],
    contentFormat,
    languageStyle,
    audiencePersona: refinedPersona,
    audienceAge,
    primaryGoal,
    rawVoiceSample,
    voiceTraits,
    nicheStrengths,
  }

  await saveCreatorProfile(userId, profileData)
  return profileData
}

function buildNicheStrengths(niches, styles) {
  return niches.reduce((acc, niche, i) => {
    acc[niche] = Math.max(30, 90 - i * 12)
    return acc
  }, {})
}

export function validateOnboardingStep(step, value) {
  if (step === 1 && (!value || value.trim().length < 2)) return 'Enter your creator name'
  if (step === 2 && (!value || !Array.isArray(value) || value.length === 0)) return 'Select at least one platform'
  if (step === 5 && (!value || value.trim().length < 5)) return 'Describe your audience (or leave blank for AI inference)'
  return null
}
