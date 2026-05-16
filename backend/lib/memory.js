import { findSimilarScripts, getCoveredTopics } from './embeddings.js'
import { getDb } from '../db.js'
import { getCachedProfile, cacheCreatorProfile } from './gemini.js'

/**
 * Build full RAG context for a user + topic.
 * Uses in-memory profile cache (1h TTL) to reduce Gemini token cost ~60%.
 */
export async function buildCreatorContext(userId, topicTitle, niche) {
  const [profile, similarScripts, coveredTopics] = await Promise.all([
    getCreatorProfile(userId),
    findSimilarScripts(userId, topicTitle, 3),
    getCoveredTopics(userId, niche)
  ])

  // Check memory cache for system prompt (avoids rebuilding on every script gen)
  let systemPrompt = getCachedProfile(userId)
  if (!systemPrompt) {
    systemPrompt = buildSystemPrompt(profile, similarScripts, coveredTopics, topicTitle)
    if (profile) cacheCreatorProfile(userId, systemPrompt)
  }

  return { profile, similarScripts, coveredTopics, systemPrompt }
}

/**
 * Fetch creator profile for a user.
 */
export async function getCreatorProfile(userId) {
  const db = await getDb()
  try {
    const result = await db.query(
      `SELECT cp.*, u.email, u.name
       FROM creator_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.user_id = $1`,
      [userId]
    )
    return result.rows[0] || null
  } catch (err) {
    console.error('[memory] getCreatorProfile error:', err.message)
    return null
  }
}

/**
 * Upsert creator profile after onboarding.
 */
export async function saveCreatorProfile(userId, profileData) {
  invalidateProfileCache(userId)  // force rebuild on next script generation
  const db = await getDb()
  const id = `profile-${userId}`
  const {
    creatorName, platforms, contentStyles,
    contentFormat = 'on-camera', languageStyle = 'English',
    audiencePersona, audienceAge, primaryGoal, rawVoiceSample,
    voiceTraits, nicheStrengths
  } = profileData

  await db.query(
    `INSERT INTO creator_profiles
       (id, user_id, creator_name, platforms, content_styles, content_format, language_style,
        audience_persona, audience_age, primary_goal, raw_voice_sample, voice_traits, niche_strengths, onboarding_done, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       creator_name    = EXCLUDED.creator_name,
       platforms       = EXCLUDED.platforms,
       content_styles  = EXCLUDED.content_styles,
       content_format  = EXCLUDED.content_format,
       language_style  = EXCLUDED.language_style,
       audience_persona= EXCLUDED.audience_persona,
       audience_age    = EXCLUDED.audience_age,
       primary_goal    = EXCLUDED.primary_goal,
       raw_voice_sample= EXCLUDED.raw_voice_sample,
       voice_traits    = EXCLUDED.voice_traits,
       niche_strengths = EXCLUDED.niche_strengths,
       onboarding_done = TRUE,
       updated_at      = NOW()`,
    [
      id, userId, creatorName,
      platforms || [],
      contentStyles || [],
      contentFormat,
      languageStyle,
      audiencePersona || '',
      audienceAge || null,
      primaryGoal || '',
      rawVoiceSample || '',
      JSON.stringify(voiceTraits || []),
      JSON.stringify(nicheStrengths || {})
    ]
  )

  return { id, userId, ...profileData }
}

/**
 * Get memory summary for display in Script Studio sidebar.
 */
export async function getMemorySummary(userId, niche) {
  const db = await getDb()

  const [recentScripts, topTopics, totalCount] = await Promise.all([
    db.query(
      `SELECT id, topic_title, tone, format, engagement_score, created_at
       FROM scripts WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [userId]
    ).catch(() => ({ rows: [] })),

    db.query(
      `SELECT topic, count FROM topic_memory
       WHERE user_id = $1 AND ($2::text IS NULL OR niche = $2)
       ORDER BY count DESC LIMIT 10`,
      [userId, niche || null]
    ).catch(() => ({ rows: [] })),

    db.query(
      `SELECT COUNT(*) as total FROM scripts WHERE user_id = $1`,
      [userId]
    ).catch(() => ({ rows: [{ total: 0 }] }))
  ])

  return {
    recentScripts: recentScripts.rows,
    topTopics: topTopics.rows,
    totalScripts: parseInt(totalCount.rows[0]?.total || 0)
  }
}

// ── Internal ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(profile, similarScripts, coveredTopics, topicTitle) {
  if (!profile) return ''

  const parts = []

  parts.push(`CREATOR PROFILE:
Name: ${profile.creator_name || 'Unknown'}
Platforms: ${(profile.platforms || []).join(', ')}
Content style: ${(profile.content_styles || []).join(', ')}
Audience: ${profile.audience_persona || 'general audience'}
Primary goal: ${profile.primary_goal || 'grow audience'}
Voice traits: ${formatVoiceTraits(profile.voice_traits)}`)

  if (profile.raw_voice_sample) {
    parts.push(`\nCREATOR'S VOICE SAMPLE (match this tone/style):
"${profile.raw_voice_sample.slice(0, 500)}"`)
  }

  if (similarScripts.length > 0) {
    parts.push(`\nPAST SCRIPTS BY THIS CREATOR (maintain consistency):`)
    similarScripts.forEach((s, i) => {
      const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata
      parts.push(`${i + 1}. Topic: "${meta.topicTitle}" | Tone: ${meta.tone} | Hook: "${meta.hookLine || ''}"`)
    })
  }

  if (coveredTopics.length > 0) {
    const topics = coveredTopics.slice(0, 8).map(t => t.topic).join(', ')
    parts.push(`\nTOPICS ALREADY COVERED (find a fresh angle, don't repeat):
${topics}`)
  }

  parts.push(`\nCURRENT TOPIC: "${topicTitle}"
Write in the creator's established voice. Make it feel personal to them, not generic AI.`)

  return parts.join('\n')
}

function formatVoiceTraits(traits) {
  if (!traits) return 'not specified'
  const arr = typeof traits === 'string' ? JSON.parse(traits) : traits
  return Array.isArray(arr) ? arr.join(', ') : 'not specified'
}
