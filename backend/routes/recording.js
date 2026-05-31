import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { createGeminiModel, extractResponseText } from '../lib/gemini.js'
import { getCreatorProfile } from '../lib/memory.js'
import { getDb } from '../db.js'
import crypto from 'crypto'
import { recordingLimiter, requireBrowserLike } from '../lib/limiters.js'
import { validate, sanitizeText, VALID_TONES } from '../lib/validate.js'

const router = Router()
router.use(requireAuth)

/**
 * POST /api/recording/analyse
 * Accepts base64-encoded audio of one scene recording.
 * Returns: script accuracy, filler words, confidence, energy, emotion, voice raise analysis.
 *
 * Body: { audioBase64, mimeType, sceneText, sceneNumber, scriptTone, niche }
 */
router.post(
  '/analyse',
  requireBrowserLike,
  recordingLimiter,
  validate({
    body: {
      audioBase64:    { required: true, type: 'base64', maxBytes: 15 * 1024 * 1024 },
      mimeType:       { type: 'audioMime' },
      sceneText:      { required: true, type: 'string', maxLength: 3000 },
      sceneNumber:    { type: 'integer', min: 1, max: 50 },
      scriptTone:     { type: 'string', oneOf: VALID_TONES },
      niche:          { type: 'string', maxLength: 50 },
      fullScriptText: { type: 'string', maxLength: 6000 },
    },
  }),
  async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType = 'audio/webm',
      sceneText,
      sceneNumber,
      scriptTone = 'storytelling',
      niche = 'lifestyle',
      fullScriptText = '',
    } = req.body

    // Sanitize free-text fields before interpolating into the AI prompt
    const safeSceneText     = sanitizeText(sceneText, 3000)
    const safeScriptTone    = sanitizeText(scriptTone, 50)
    const safeNiche         = sanitizeText(niche, 50)

    const profile = await getCreatorProfile(req.userId)
    const languageStyle = profile?.language_style || 'English'
    const contentFormat = profile?.content_format || 'on-camera'

    const model = createGeminiModel({ temperature: 0.2, maxOutputTokens: 2000 })

    const prompt = `You are a voice coach analysing a content creator's script recording.

SCRIPT (what they should have said):
<scene_text>${safeSceneText}</scene_text>

Expected tone: ${safeScriptTone}
Creator's language style: ${sanitizeText(languageStyle, 50)}
Content format: ${sanitizeText(contentFormat, 50)}
Niche: ${safeNiche}
${profile ? `Creator voice profile: ${(Array.isArray(profile.voice_traits) ? profile.voice_traits : JSON.parse(profile.voice_traits || '[]')).join(', ')}` : ''}

Analyse this audio recording for:
1. Script accuracy — did they say the right words? Note specific deviations.
2. Filler words — list every "um", "like", "basically", "you know", "uh", etc. with approximate position.
3. Confidence — detect: voice trembling, trailing off at sentence ends, upward inflection on statements (makes them sound like questions), rushing through important words.
4. Energy match — does their energy/enthusiasm match the "${safeScriptTone}" tone requirement? Score it.
5. Emotion authenticity — does it sound genuine or rehearsed/robotic?
6. Voice raise analysis — did they emphasise the RIGHT words? What was emphasised vs. what should have been?
7. Pace — was it too fast, too slow, or well-paced per sentence?
8. Improvisation — did they go off-script? If yes, was the improvised version better or worse?

Return ONLY valid JSON:
{
  "overallScore": 0,
  "scriptAccuracy": {
    "score": 0,
    "percentMatch": 0,
    "deviations": [{"position": "0:04", "said": "...", "shouldHaveSaid": "...", "impact": "minor|major"}]
  },
  "fillerWords": {
    "count": 0,
    "list": [{"word": "um", "position": "0:03"}, {"word": "like", "position": "0:11"}]
  },
  "confidence": {
    "score": 0,
    "issues": ["trailing off at 'game changer'", "upward inflection on statement at 0:14"]
  },
  "energy": {
    "score": 0,
    "required": 8,
    "actual": 6,
    "note": "sounds calm — needs more edge for controversial tone"
  },
  "emotion": {
    "score": 0,
    "authentic": true,
    "note": "sounds genuine in first half, rehearsed in second"
  },
  "voiceRaise": {
    "correct": ["emphasised '5AM' correctly"],
    "missed": ["should have raised on 'decision' — went flat"]
  },
  "pace": {
    "score": 0,
    "note": "slightly fast at 0:08-0:12"
  },
  "improvisation": {
    "detected": false,
    "improvisedText": null,
    "better": null
  },
  "topFixes": ["fix 1 — most impactful", "fix 2", "fix 3"],
  "encouragement": "one specific positive thing they did well"
}`

    // Send audio to Gemini with the prompt
    const response = await model.invoke([
      {
        role: 'user',
        content: [
          {
            type: 'media',
            data: audioBase64,
            mimeType,
          },
          {
            type: 'text',
            text: prompt,
          }
        ]
      }
    ])

    const content = extractResponseText(response)

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in Gemini response')

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      // Fix trailing commas
      const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1')
      parsed = JSON.parse(fixed)
    }

    // Persist session to DB for growth tracking
    try {
      const db = await getDb()
      const sessionId = crypto.randomUUID()
      await db.query(
        `INSERT INTO recording_sessions (id, user_id, scene_number, overall_score, confidence_score, energy_score, accuracy_score, filler_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT DO NOTHING`,
        [
          sessionId, req.userId, sceneNumber,
          parsed.overallScore || 0,
          parsed.confidence?.score || 0,
          parsed.energy?.score || 0,
          parsed.scriptAccuracy?.score || 0,
          parsed.fillerWords?.count || 0,
        ]
      )
    } catch (dbErr) {
      console.warn('[recording] DB persist error (non-fatal):', dbErr.message)
    }

    res.json({ success: true, data: parsed })
  } catch (err) {
    console.error('[recording/analyse] Error:', err.message)
    res.status(500).json({ success: false, error: { code: 'ANALYSE_ERROR', message: err.message } })
  }
  }
)

/**
 * GET /api/recording/stats
 * Returns user's recording improvement over time.
 */
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.query(
      `SELECT overall_score, confidence_score, energy_score, accuracy_score, filler_count, created_at
       FROM recording_sessions WHERE user_id = $1
       ORDER BY created_at ASC LIMIT 50`,
      [req.userId]
    )
    res.json({ success: true, data: { sessions: result.rows } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'STATS_ERROR', message: err.message } })
  }
})

export default router
