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
    audioVoiceProfile = null, // structured profile from transcribeAudio (real prosody), if recorded
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
  "voiceTraits": ["5-7 short voice traits"],
  "audienceAge": "18-28",
  "audiencePersona": "one sentence describing their ideal viewer",
  "audienceInferred": ${needsAudienceInference},
  "suggestedTone": "educational|entertaining|controversial|storytelling",
  "nicheStrengths": {"fitness": 80, "tech": 60},
  "voiceFingerprint": {
    "energyLevel": "high|medium|low",
    "pacing": "fast|moderate|deliberate",
    "formality": "casual|semi-formal|formal",
    "sentenceRhythm": "short punchy fragments | long flowing | mixed",
    "vocabulary": "simple everyday | technical | sophisticated",
    "fillerWords": ["verbal tics from the sample, [] if none/unknown"],
    "catchphrases": ["signature phrases, [] if none"],
    "openerStyle": "how they tend to open a video",
    "ctaStyle": "how they tend to wrap up / drive action",
    "tonalQualities": ["e.g. warm, urgent, deadpan, animated"],
    "quirks": "distinctive habits — code-switching, rhetorical questions, self-deprecation"
  }
}

voiceTraits examples: "data-driven", "first-person", "punchy sentences", "uses questions", "high energy", "vulnerable", "motivational", "code-switches languages"
For ${languageStyle} creators, add language-specific traits if relevant.
If no voice sample, infer the fingerprint from content styles, format, and goal — mark unknown fields with best-guess defaults, never leave them blank.`

  let voiceTraits = contentStyles.slice(0, 3)
  let nicheStrengths = {}
  let refinedPersona = audiencePersona && audiencePersona !== '(ai-infer)' ? audiencePersona : ''
  let audienceAge = '18-35'
  let voiceFingerprint = {}

  try {
    const response = await model.invoke(prompt)
    const content = extractResponseText(response)
    const parsed = extractJson(content)

    voiceTraits = parsed.voiceTraits || voiceTraits
    refinedPersona = parsed.audiencePersona || refinedPersona
    audienceAge = parsed.audienceAge || audienceAge
    nicheStrengths = parsed.nicheStrengths || buildNicheStrengths(niches, contentStyles)
    voiceFingerprint = parsed.voiceFingerprint && typeof parsed.voiceFingerprint === 'object' ? parsed.voiceFingerprint : {}

    console.log(`[onboarding] Profile built for "${creatorName}" — traits: ${voiceTraits.join(', ')}`)
  } catch (err) {
    console.error('[onboarding] Gemini analysis error:', err.message)
    nicheStrengths = buildNicheStrengths(niches, contentStyles)
  }

  // Merge the audio-derived profile over the text-inferred one. Audio is real
  // prosody (energy/pace/emphasis the text analysis can only guess at), so it wins
  // on overlapping fields; arrays (fillers, catchphrases) are unioned.
  voiceFingerprint = mergeVoiceFingerprint(voiceFingerprint, audioVoiceProfile)

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
    voiceFingerprint,
    nicheStrengths,
  }

  await saveCreatorProfile(userId, profileData)
  return profileData
}

// Combine text-inferred fingerprint with the audio-derived one. Audio values
// (real prosody) override scalars; array fields are unioned + de-duped.
function mergeVoiceFingerprint(textFp = {}, audioFp) {
  if (!audioFp || typeof audioFp !== 'object') return textFp
  const merged = { ...textFp }
  const arrayKeys = new Set(['fillerWords', 'catchphrases', 'tonalQualities'])
  for (const [k, v] of Object.entries(audioFp)) {
    if (v == null || v === '') continue
    if (arrayKeys.has(k)) {
      const a = Array.isArray(textFp[k]) ? textFp[k] : []
      const b = Array.isArray(v) ? v : [v]
      merged[k] = [...new Set([...a, ...b].map(s => String(s).trim()).filter(Boolean))]
    } else {
      merged[k] = v // audio wins on scalars
    }
  }
  return merged
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
