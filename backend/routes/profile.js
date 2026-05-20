import { Router } from 'express'
import { requireAuth } from '../lib/auth.js'
import { getCreatorProfile, saveCreatorProfile } from '../lib/memory.js'
import { getDb } from '../db.js'

const router = Router()

// GET /api/profile — full creator profile + stats + top hooks
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = await getDb()

    const [profile, stats, favFormatRes, topTopics, topHooks, scriptHistory] = await Promise.all([
      getCreatorProfile(req.userId),

      db.query(
        `SELECT
           COUNT(*) AS total_scripts,
           COUNT(*) FILTER (WHERE was_used = TRUE) AS used_scripts,
           AVG(engagement_score) FILTER (WHERE engagement_score IS NOT NULL) AS avg_score
         FROM scripts WHERE user_id = $1`,
        [req.userId]
      ).catch(() => ({ rows: [{}] })),

      db.query(
        `SELECT format, COUNT(*) AS cnt FROM scripts WHERE user_id = $1
         GROUP BY format ORDER BY cnt DESC LIMIT 1`,
        [req.userId]
      ).catch(() => ({ rows: [] })),

      db.query(
        `SELECT topic, count FROM topic_memory
         WHERE user_id = $1 ORDER BY count DESC LIMIT 15`,
        [req.userId]
      ).catch(() => ({ rows: [] })),

      db.query(
        `SELECT id, topic_title, hook_line, tone, format, engagement_score, created_at
         FROM scripts WHERE user_id = $1
         ORDER BY COALESCE(engagement_score, 0) DESC, created_at DESC
         LIMIT 5`,
        [req.userId]
      ).catch(() => ({ rows: [] })),

      db.query(
        `SELECT created_at, engagement_score
         FROM scripts WHERE user_id = $1
         ORDER BY created_at ASC
         LIMIT 20`,
        [req.userId]
      ).catch(() => ({ rows: [] }))
    ])

    const s = stats.rows[0] || {}

    res.json({
      success: true,
      data: {
        profile: profile ? {
          creatorName: profile.creator_name,
          platforms: profile.platforms || [],
          contentStyles: profile.content_styles || [],
          audiencePersona: profile.audience_persona,
          audienceAge: profile.audience_age || null,
          primaryGoal: profile.primary_goal,
          languageStyle: profile.language_style || 'English',
          contentFormat: profile.content_format || 'on-camera',
          rawVoiceSample: profile.raw_voice_sample ? true : false,
          voiceTraits: typeof profile.voice_traits === 'string'
            ? JSON.parse(profile.voice_traits)
            : (profile.voice_traits || []),
          nicheStrengths: typeof profile.niche_strengths === 'string'
            ? JSON.parse(profile.niche_strengths)
            : (profile.niche_strengths || {}),
          onboardingDone: profile.onboarding_done
        } : null,
        stats: {
          totalScripts: parseInt(s.total_scripts || 0),
          usedScripts: parseInt(s.used_scripts || 0),
          avgScore: s.avg_score ? Math.round(parseFloat(s.avg_score)) : null,
          favFormat: favFormatRes.rows[0]?.format || null
        },
        topTopics: topTopics.rows,
        topHooks: (topHooks.rows || []).map(r => ({
          id: r.id,
          topicTitle: r.topic_title,
          hookLine: r.hook_line,
          tone: r.tone,
          format: r.format,
          engagementScore: r.engagement_score,
          createdAt: r.created_at,
        })),
        scriptHistory: (scriptHistory.rows || []).map(r => ({
          createdAt: r.created_at,
          engagementScore: r.engagement_score != null ? parseInt(r.engagement_score) : null,
        }))
      }
    })
  } catch (err) {
    console.error('[profile GET]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// PATCH /api/profile — update profile fields
router.patch('/', requireAuth, async (req, res) => {
  try {
    const allowed = ['creatorName', 'platforms', 'contentStyles', 'audiencePersona', 'audienceAge', 'primaryGoal', 'rawVoiceSample', 'languageStyle', 'contentFormat']
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    )

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_UPDATES', message: 'No valid fields to update' } })
    }

    const existing = await getCreatorProfile(req.userId)
    const merged = { ...(existing || {}), ...updates }

    const profile = await saveCreatorProfile(req.userId, {
      creatorName: merged.creator_name || merged.creatorName,
      platforms: merged.platforms,
      contentStyles: merged.content_styles || merged.contentStyles,
      audiencePersona: merged.audience_persona || merged.audiencePersona,
      audienceAge: merged.audience_age || merged.audienceAge || null,
      primaryGoal: merged.primary_goal || merged.primaryGoal,
      rawVoiceSample: merged.raw_voice_sample || merged.rawVoiceSample,
      languageStyle: merged.language_style || merged.languageStyle || 'English',
      contentFormat: merged.content_format || merged.contentFormat || 'on-camera',
      voiceTraits: merged.voice_traits || merged.voiceTraits || [],
      nicheStrengths: merged.niche_strengths || merged.nicheStrengths || {}
    })

    res.json({ success: true, data: { profile } })
  } catch (err) {
    console.error('[profile PATCH]', err.message)
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

// POST /api/profile/mark-used — mark script as used + add engagement score
router.post('/mark-used', requireAuth, async (req, res) => {
  try {
    const { scriptId, engagementScore } = req.body
    if (!scriptId) return res.status(400).json({ success: false, error: { code: 'MISSING_SCRIPT_ID' } })

    const db = await getDb()
    await db.query(
      `UPDATE scripts SET was_used = TRUE, engagement_score = $1 WHERE id = $2 AND user_id = $3`,
      [engagementScore || null, scriptId, req.userId]
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } })
  }
})

export default router
