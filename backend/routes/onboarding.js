import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { processOnboarding, validateOnboardingStep } from '../agents/onboarding.js'
import { getCreatorProfile } from '../lib/memory.js'
import { getDb } from '../db.js'
import { accountCreationLimiter } from '../lib/limiters.js'
import { validate, sanitizeText } from '../lib/validate.js'

const router = Router()

// GET /api/onboarding/status — check if user has completed onboarding
router.get('/status', requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    const [profileRes, userRes] = await Promise.all([
      getCreatorProfile(req.userId),
      db.query('SELECT niches FROM users WHERE id = $1', [req.userId])
    ])
    const profile = profileRes
    const niches = userRes.rows?.[0]?.niches || []

    res.json({
      success: true,
      data: {
        completed: !!(profile?.onboarding_done),
        niches,
        profile: profile ? {
          creatorName: profile.creator_name,
          platforms: profile.platforms,
          primaryGoal: profile.primary_goal,
          contentStyles: profile.content_styles,
          audiencePersona: profile.audience_persona,
          voiceTraits: typeof profile.voice_traits === 'string'
            ? JSON.parse(profile.voice_traits)
            : (profile.voice_traits || []),
        } : null
      }
    })
  } catch (err) {
    console.error('[onboarding/status]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// POST /api/onboarding/validate — validate a single step
router.post('/validate', requireAuth, validate({
  body: {
    step:  { required: true, type: 'string', maxLength: 50 },
    value: { type: 'string', maxLength: 500 },
  },
}), async (req, res) => {
  const { step, value } = req.body
  const error = validateOnboardingStep(step, value)
  res.json({ success: true, data: { valid: !error, error } })
})

// POST /api/onboarding/complete — submit all answers, process profile
router.post('/complete', requireAuth, accountCreationLimiter, async (req, res) => {
  try {
    const { answers } = req.body

    if (!answers) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_ANSWERS', message: 'answers object required' } })
    }

    // Only name is strictly required now — rest can be inferred
    if (!answers.creatorName) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'creatorName is required' } })
    }

    // Sanitize text fields before they reach AI prompts
    const safeAnswers = {
      ...answers,
      creatorName:     sanitizeText(answers.creatorName, 100),
      audiencePersona: sanitizeText(answers.audiencePersona, 500),
      primaryGoal:     sanitizeText(answers.primaryGoal, 200),
      rawVoiceSample:  sanitizeText(answers.rawVoiceSample, 10000),
      languageStyle:   sanitizeText(answers.languageStyle, 50),
      contentFormat:   sanitizeText(answers.contentFormat, 50),
    }

    const db = await getDb()

    // Derive niches from content styles + audience
    const styleNicheMap = { educational:'tech', entertaining:'lifestyle', controversial:'finance', storytelling:'fitness' }
    const selectedStyles = Array.isArray(safeAnswers.contentStyles) ? safeAnswers.contentStyles : []
    const derivedNiches = selectedStyles.map(s => styleNicheMap[s.toLowerCase()] || s.toLowerCase()).filter(Boolean)
    const niches = derivedNiches.length > 0 ? [...new Set(derivedNiches)] : ['fitness', 'tech', 'finance']

    // Upsert user — ensures row exists even if auth middleware DB write failed
    await db.query(
      `INSERT INTO users (id, email, name, niches)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, niches = EXCLUDED.niches, updated_at = NOW()`,
      [req.userId, `${req.userId}@clerk.user`, safeAnswers.creatorName, niches]
    )

    // Process onboarding — extract voice traits, save profile
    const profile = await processOnboarding(req.userId, { ...safeAnswers, niches })

    res.json({ success: true, data: { profile } })
  } catch (err) {
    console.error('[onboarding/complete]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// POST /api/onboarding/reset — re-trigger onboarding (dev + settings)
router.post('/reset', requireAuth, async (req, res) => {
  try {
    const db = await getDb()
    await db.query(
      'UPDATE creator_profiles SET onboarding_done = FALSE WHERE user_id = $1',
      [req.userId]
    )
    res.json({ success: true, data: { reset: true } })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

export default router
