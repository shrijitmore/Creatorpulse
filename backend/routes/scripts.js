import { Router } from 'express'
import crypto from 'crypto'
import { runScriptPipeline } from '../agents/pipeline.js'
import { writeScript } from '../agents/scriptWriter.js'
import { generateCopyKit } from '../agents/hookCopy.js'
import { getDb } from '../db.js'
import { requireAuth } from '../lib/auth.js'
import { buildCreatorContext } from '../lib/memory.js'
import { storeScriptEmbedding, trackTopic } from '../lib/embeddings.js'

const router = Router()

function sendSSE(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

router.use(requireAuth)

// POST /api/scripts/generate  (SSE)
router.post('/generate', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const { topicId, topicTitle, tone, format, niche } = req.body

  if (!topicTitle || !tone || !format || !niche) {
    sendSSE(res, 'error', { message: 'Missing required fields: topicTitle, tone, format, niche' })
    return res.end()
  }

  const validTones = ['educational', 'entertaining', 'controversial', 'storytelling']
  const validFormats = ['30s', '60s', '90s']

  if (!validTones.includes(tone)) {
    sendSSE(res, 'error', { message: `Invalid tone. Must be one of: ${validTones.join(', ')}` })
    return res.end()
  }
  if (!validFormats.includes(format)) {
    sendSSE(res, 'error', { message: `Invalid format. Must be one of: ${validFormats.join(', ')}` })
    return res.end()
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  try {
    sendSSE(res, 'progress', { step: 1, status: 'active', label: 'Scanning trending topics...' })
    await sleep(300)
    sendSSE(res, 'progress', { step: 1, status: 'done', label: 'Trends scanned' })

    sendSSE(res, 'progress', { step: 2, status: 'active', label: 'Analyzing virality signals...' })

    // Fetch creator context (RAG + voice profile) in parallel with step 2 delay
    const userId = req.userId || 'user-1'
    const creatorContext = await buildCreatorContext(userId, topicTitle, niche).catch(() => null)

    await sleep(300)
    sendSSE(res, 'progress', { step: 2, status: 'done', label: 'Analysis complete' })

    const onProgress = ({ step, status, label }) => sendSSE(res, 'progress', { step, status, label })

    const { script, contentKit } = await runScriptPipeline(
      topicId || crypto.randomUUID(),
      topicTitle, tone, format, niche, onProgress, creatorContext
    )

    const scriptId = crypto.randomUUID()
    const fullScript = { ...script, id: scriptId, createdAt: new Date().toISOString() }
    const fullKit = { ...contentKit, scriptId }

    try {
      const db = await getDb()
      await db.query(
        `INSERT INTO scripts (id, topic_id, topic_title, tone, format, hook_line, scenes, cta, niche, platform, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [scriptId, fullScript.topicId || topicId, fullScript.topicTitle, fullScript.tone,
         fullScript.format, fullScript.hookLine, JSON.stringify(fullScript.scenes),
         fullScript.cta, fullScript.niche, fullScript.platform || 'instagram', userId]
      )
      await db.query(
        `INSERT INTO content_kits (id, script_id, hook_variants, caption, hashtags, thumbnail_text)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), scriptId, fullKit.hookVariants, fullKit.caption,
         JSON.stringify(fullKit.hashtags), fullKit.thumbnailText]
      )
    } catch (dbErr) {
      console.error('[scripts/generate] DB persist error:', dbErr.message)
    }

    // Async: embed script + track topic (non-blocking)
    Promise.all([
      storeScriptEmbedding(userId, scriptId, fullScript, fullKit).catch(e => console.error('[scripts] embed error:', e.message)),
      trackTopic(userId, topicTitle, niche).catch(e => console.error('[scripts] topic track error:', e.message))
    ])

    sendSSE(res, 'complete', { script: fullScript, contentKit: fullKit })
    res.end()
  } catch (err) {
    console.error('[scripts/generate] Error:', err)
    sendSSE(res, 'error', { message: err.message || 'Script generation failed' })
    res.end()
  }
})

// POST /api/scripts/regenerate-section
router.post('/regenerate-section', async (req, res) => {
  try {
    const { scriptId, section, tone, format } = req.body

    if (!scriptId || !section) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'scriptId and section are required' } })
    }

    const validSections = ['hookVariants', 'caption', 'hashtags', 'thumbnailText', 'fullScript']
    if (!validSections.includes(section)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_SECTION', message: `section must be one of: ${validSections.join(', ')}` } })
    }

    const db = await getDb()
    const scriptRes = await db.query('SELECT * FROM scripts WHERE id = $1', [scriptId])

    if (!scriptRes.rows || scriptRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Script not found' } })
    }

    const row = scriptRes.rows[0]
    const existingScript = {
      id: row.id, topicId: row.topic_id, topicTitle: row.topic_title,
      tone: tone || row.tone, format: format || row.format,
      hookLine: row.hook_line,
      scenes: typeof row.scenes === 'string' ? JSON.parse(row.scenes) : row.scenes,
      cta: row.cta, niche: row.niche, platform: row.platform
    }

    let content

    if (section === 'fullScript') {
      const newScript = await writeScript(existingScript.topicId, existingScript.topicTitle, existingScript.tone, existingScript.format, existingScript.niche)
      content = { hookLine: newScript.hookLine, scenes: newScript.scenes, cta: newScript.cta }
      await db.query(`UPDATE scripts SET hook_line = $1, scenes = $2, cta = $3 WHERE id = $4`,
        [newScript.hookLine, JSON.stringify(newScript.scenes), newScript.cta, scriptId])
    } else {
      const kit = await generateCopyKit(existingScript, existingScript.topicTitle, existingScript.niche)
      if (section === 'hookVariants') content = kit.hookVariants
      else if (section === 'caption') content = kit.caption
      else if (section === 'hashtags') content = kit.hashtags
      else if (section === 'thumbnailText') content = kit.thumbnailText

      const kitRes = await db.query('SELECT id FROM content_kits WHERE script_id = $1', [scriptId])
      if (kitRes.rows && kitRes.rows.length > 0) {
        const fieldMap = { hookVariants: 'hook_variants', caption: 'caption', hashtags: 'hashtags', thumbnailText: 'thumbnail_text' }
        const col = fieldMap[section]
        const val = section === 'hashtags' ? JSON.stringify(content) : content
        await db.query(`UPDATE content_kits SET ${col} = $1 WHERE script_id = $2`, [val, scriptId])
      }
    }

    res.json({ success: true, data: { content } })
  } catch (err) {
    console.error('[scripts/regenerate-section] Error:', err)
    res.status(500).json({ success: false, error: { code: 'REGEN_ERROR', message: err.message || 'Failed to regenerate section' } })
  }
})

// GET /api/scripts
router.get('/', async (req, res) => {
  try {
    const { niche, format, platform } = req.query
    const db = await getDb()
    let sql = 'SELECT * FROM scripts WHERE user_id = $1'
    const params = [req.userId]
    let idx = 2
    if (niche) { sql += ` AND niche = $${idx++}`; params.push(niche) }
    if (format) { sql += ` AND format = $${idx++}`; params.push(format) }
    if (platform) { sql += ` AND platform = $${idx++}`; params.push(platform) }
    sql += ' ORDER BY created_at DESC'

    const result = await db.query(sql, params)
    const scripts = (result.rows || []).map(row => ({
      id: row.id, topicId: row.topic_id, topicTitle: row.topic_title,
      tone: row.tone, format: row.format, hookLine: row.hook_line,
      scenes: typeof row.scenes === 'string' ? JSON.parse(row.scenes) : (row.scenes || []),
      cta: row.cta, niche: row.niche, platform: row.platform, createdAt: row.created_at
    }))

    res.json({ success: true, data: scripts })
  } catch (err) {
    console.error('[scripts GET /] Error:', err)
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message || 'Failed to fetch scripts' } })
  }
})

// GET /api/scripts/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const scriptRes = await db.query('SELECT * FROM scripts WHERE id = $1 AND user_id = $2', [id, req.userId])

    if (!scriptRes.rows || scriptRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Script not found' } })
    }

    const row = scriptRes.rows[0]
    const script = {
      id: row.id, topicId: row.topic_id, topicTitle: row.topic_title,
      tone: row.tone, format: row.format, hookLine: row.hook_line,
      scenes: typeof row.scenes === 'string' ? JSON.parse(row.scenes) : (row.scenes || []),
      cta: row.cta, niche: row.niche, platform: row.platform, createdAt: row.created_at
    }

    const kitRes = await db.query('SELECT * FROM content_kits WHERE script_id = $1', [id])
    let contentKit = null
    if (kitRes.rows && kitRes.rows.length > 0) {
      const kr = kitRes.rows[0]
      contentKit = {
        scriptId: kr.script_id, hookVariants: kr.hook_variants || [],
        caption: kr.caption || '',
        hashtags: typeof kr.hashtags === 'string' ? JSON.parse(kr.hashtags) : (kr.hashtags || {}),
        thumbnailText: kr.thumbnail_text || ''
      }
    }

    res.json({ success: true, data: { ...script, contentKit } })
  } catch (err) {
    console.error('[scripts GET /:id] Error:', err)
    res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: err.message || 'Failed to fetch script' } })
  }
})

// DELETE /api/scripts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const check = await db.query('SELECT id FROM scripts WHERE id = $1 AND user_id = $2', [id, req.userId])
    if (!check.rows || check.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Script not found' } })
    }
    await db.query('DELETE FROM content_kits WHERE script_id = $1', [id])
    await db.query('DELETE FROM scripts WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('[scripts DELETE /:id] Error:', err)
    res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: err.message || 'Failed to delete script' } })
  }
})

export default router
