import crypto from 'crypto'
import { getDb } from '../db.js'

const EMBEDDING_MODEL = 'text-embedding-004'
const EMBEDDING_DIM = 768

/**
 * Generate embedding vector via Gemini text-embedding-004.
 * Falls back to null if Vertex AI not configured.
 */
export async function embedText(text) {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

  if (!saJson || !projectId) {
    console.warn('[embeddings] No Vertex AI credentials — skipping embedding')
    return null
  }

  try {
    const credentials = JSON.parse(saJson)

    // Get access token via service account
    const token = await getAccessToken(credentials)

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${EMBEDDING_MODEL}:predict`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        instances: [{ content: text.slice(0, 3000) }]
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Embedding API error ${res.status}: ${err.slice(0, 200)}`)
    }

    const data = await res.json()
    const values = data?.predictions?.[0]?.embeddings?.values

    if (!values || values.length !== EMBEDDING_DIM) {
      throw new Error(`Unexpected embedding shape: ${values?.length}`)
    }

    return values
  } catch (err) {
    console.error('[embeddings] Failed to embed:', err.message)
    return null
  }
}

/**
 * Store script embedding in DB after generation.
 */
export async function storeScriptEmbedding(userId, scriptId, script, contentKit) {
  const text = buildScriptText(script, contentKit)
  const embedding = await embedText(text)

  const db = await getDb()
  const id = crypto.randomUUID()
  const metadata = {
    topicTitle: script.topicTitle,
    niche: script.niche,
    tone: script.tone,
    format: script.format,
    hookLine: script.hookLine,
    score: script.engagementScore || 0
  }

  if (embedding && process.env.DATABASE_URL) {
    // Supabase — store real vector
    await db.query(
      `INSERT INTO script_embeddings (id, user_id, script_id, embedding, content, metadata)
       VALUES ($1, $2, $3, $4::vector, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [id, userId, scriptId, JSON.stringify(embedding), text, JSON.stringify(metadata)]
    )
  } else {
    // PGlite fallback — store without vector
    await db.query(
      `INSERT INTO script_embeddings (id, user_id, script_id, content, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, userId, scriptId, text, JSON.stringify(metadata)]
    )
  }

  console.log(`[embeddings] Stored embedding for script ${scriptId}`)
}

/**
 * Find top-K similar past scripts for a user via cosine similarity.
 * Falls back to keyword match when pgvector unavailable.
 */
export async function findSimilarScripts(userId, queryText, topK = 3) {
  const db = await getDb()

  if (process.env.DATABASE_URL) {
    // Supabase — vector similarity search
    const queryEmbedding = await embedText(queryText)
    if (queryEmbedding) {
      try {
        const result = await db.query(
          `SELECT se.metadata, se.content, se.script_id,
                  1 - (se.embedding <=> $1::vector) AS similarity
           FROM script_embeddings se
           WHERE se.user_id = $2
           ORDER BY se.embedding <=> $1::vector
           LIMIT $3`,
          [JSON.stringify(queryEmbedding), userId, topK]
        )
        return result.rows
      } catch (err) {
        console.error('[embeddings] Vector search failed:', err.message)
      }
    }
  }

  // Fallback — keyword search on content
  try {
    const keywords = queryText.toLowerCase().split(' ').filter(w => w.length > 4).slice(0, 5)
    if (keywords.length === 0) return []

    const result = await db.query(
      `SELECT metadata, content, script_id, 0.5 AS similarity
       FROM script_embeddings
       WHERE user_id = $1
         AND LOWER(content) LIKE ANY($2::text[])
       LIMIT $3`,
      [userId, keywords.map(k => `%${k}%`), topK]
    )
    return result.rows
  } catch {
    return []
  }
}

/**
 * Update topic memory — increment count or insert new topic.
 */
export async function trackTopic(userId, topic, niche) {
  const db = await getDb()
  const id = crypto.randomUUID()
  try {
    await db.query(
      `INSERT INTO topic_memory (id, user_id, topic, niche, count, last_used)
       VALUES ($1, $2, $3, $4, 1, NOW())
       ON CONFLICT (user_id, topic)
       DO UPDATE SET count = topic_memory.count + 1, last_used = NOW()`,
      [id, userId, topic.toLowerCase().trim(), niche]
    )
  } catch (err) {
    console.error('[embeddings] Topic track error:', err.message)
  }
}

/**
 * Get topics user has already covered in a niche.
 */
export async function getCoveredTopics(userId, niche) {
  const db = await getDb()
  try {
    const result = await db.query(
      `SELECT topic, count FROM topic_memory
       WHERE user_id = $1 AND niche = $2
       ORDER BY count DESC, last_used DESC
       LIMIT 20`,
      [userId, niche]
    )
    return result.rows
  } catch {
    return []
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildScriptText(script, contentKit) {
  const parts = [
    `Topic: ${script.topicTitle}`,
    `Niche: ${script.niche}`,
    `Tone: ${script.tone}`,
    `Hook: ${script.hookLine}`,
    script.scenes?.map(s => `Scene ${s.sceneNumber}: ${s.voiceover}`).join(' ') || '',
    `CTA: ${script.cta}`,
    contentKit?.hookVariants?.join(' ') || '',
    contentKit?.caption?.slice(0, 200) || ''
  ]
  return parts.filter(Boolean).join('\n')
}

async function getAccessToken(credentials) {
  const { GoogleAuth } = await import('google-auth-library')
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token
}
