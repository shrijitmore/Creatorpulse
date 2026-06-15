import { ChatVertexAI } from '@langchain/google-vertexai'
import { GEMINI_RETRY, GEMINI_FALLBACK_MODELS } from '../constants.js'

// True when a Vertex error is a transient quota/overload — i.e. worth retrying
// on a different model. Matches 429 RESOURCE_EXHAUSTED and 503 UNAVAILABLE.
function isQuotaError(err) {
  const msg = String(err?.message || err || '')
  return /429|resource.?exhausted|too many requests|quota|503|unavailable|overloaded/i.test(msg)
}

// ── Creator profile cache ─────────────────────────────────────────────────────
// Cache profile system prompts in memory (per userId) to reduce token cost.
// Gemini 2.5 Flash caches context at ~25% of normal token price.
// We cache for 1 hour — invalidated when profile updates.

const profileCache = new Map()  // userId → { systemPrompt, cachedAt }
const PROFILE_CACHE_TTL = 60 * 60 * 1000  // 1 hour

export function cacheCreatorProfile(userId, systemPrompt) {
  profileCache.set(userId, { systemPrompt, cachedAt: Date.now() })
}

export function getCachedProfile(userId) {
  const entry = profileCache.get(userId)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > PROFILE_CACHE_TTL) {
    profileCache.delete(userId)
    return null
  }
  return entry.systemPrompt
}

export function invalidateProfileCache(userId) {
  profileCache.delete(userId)
  console.log(`[gemini] Profile cache invalidated for ${userId}`)
}

function parseCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    console.error('[gemini] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON')
    return null
  }
}

export function hasGeminiCredentials() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_AI_API_KEY)
}

// Build the ordered list of models to try. The env override (if set) goes
// first, then the static fallback chain with the primary de-duplicated out.
function resolveModelChain() {
  const primary = process.env.GEMINI_MODEL
  const chain = primary
    ? [primary, ...GEMINI_FALLBACK_MODELS.filter(m => m !== primary)]
    : [...GEMINI_FALLBACK_MODELS]
  return chain
}

function buildVertexModel(modelId, { temperature, maxOutputTokens }) {
  const credentials = parseCredentials()
  const project = process.env.GOOGLE_CLOUD_PROJECT || credentials?.project_id
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'

  // Reduce safety thresholds so creative/controversial content isn't blocked.
  // BLOCK_ONLY_HIGH still catches genuinely dangerous output.
  const safetySettings = [
    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  ]

  // maxRetries:0 — let OUR fallback wrapper handle quota errors immediately.
  // LangChain's default (6 retries w/ exponential backoff) would burn ~30-60s
  // hammering the already-exhausted model before the error reaches our chain.
  const config = { model: modelId, temperature, maxOutputTokens, location, project, safetySettings, maxRetries: 0 }
  if (credentials) {
    config.authOptions = { credentials, projectId: project }
  }
  return new ChatVertexAI(config)
}

/**
 * Returns a model-like object exposing .invoke(prompt). Internally it tries each
 * model in the fallback chain in order; on a quota/overload error (429/503) it
 * moves to the next model — each has its own Vertex quota bucket, so this
 * multiplies effective capacity. Non-quota errors throw immediately.
 *
 * Drop-in for the old createGeminiModel return value (call sites use .invoke only).
 */
export function createGeminiModel({ temperature = 0.7, maxOutputTokens = 3000 } = {}) {
  const chain = resolveModelChain()

  return {
    async invoke(prompt) {
      let lastErr
      for (let i = 0; i < chain.length; i++) {
        const modelId = chain[i]
        try {
          const model = buildVertexModel(modelId, { temperature, maxOutputTokens })
          const res = await model.invoke(prompt)
          if (i > 0) console.warn(`[gemini] Served via fallback model "${modelId}" (primary exhausted)`)
          return res
        } catch (err) {
          lastErr = err
          if (isQuotaError(err) && i < chain.length - 1) {
            console.warn(`[gemini] "${modelId}" quota/overload — falling back to "${chain[i + 1]}"`)
            continue
          }
          throw err
        }
      }
      throw lastErr
    },
  }
}

/**
 * Extract plain text from a LangChain response.
 * Gemini 2.5 Flash via @langchain/google-vertexai returns content as either
 * a plain string or an array of typed content blocks — handle both.
 */
export function extractResponseText(response) {
  const content = response?.content
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    const text = content.filter(b => b.type === 'text').map(b => b.text || '').join('')
    if (!text) {
      return content.map(b => b.text || b.content || b.thinking || '').join('')
    }
    return text
  }
  return typeof content === 'object' ? JSON.stringify(content) : String(content ?? '')
}

/**
 * Transcribe audio via Vertex AI REST API (inlineData).
 * LangChain wrapper doesn't reliably support audio, so use REST directly.
 * Returns { transcript, traits }.
 */
export async function transcribeAudio(audioBase64, mimeType = 'audio/webm') {
  const credentials = parseCredentials()
  const project = process.env.GOOGLE_CLOUD_PROJECT || credentials?.project_id
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
  const chain = resolveModelChain()

  if (!project) throw new Error('No GOOGLE_CLOUD_PROJECT configured')
  if (!credentials) throw new Error('Service account credentials required for audio transcription')

  const { JWT } = await import('google-auth-library')
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const { token: accessToken } = await client.getAccessToken()

  const body = {
    contents: [{
      role: 'user',
      parts: [
        {
          text: `You are a voice/speech analyst. Listen to this voice recording carefully — the AUDIO carries signal that text cannot (energy, pace, emphasis, pauses, vocal warmth).

1. Transcribe it word-for-word (include natural filler words like "um", "like", "you know" — do NOT clean them up; they are part of the voice).
2. Build a structured VOICE FINGERPRINT describing HOW this person speaks, not what they say. Base it on the actual audio.

Return ONLY valid JSON:
{
  "transcript": "exact words spoken, fillers included",
  "traits": ["5-7 short descriptive traits"],
  "voiceProfile": {
    "energyLevel": "high | medium | low",
    "pacing": "fast | moderate | deliberate",
    "formality": "casual | semi-formal | formal",
    "sentenceRhythm": "e.g. short punchy fragments | long flowing sentences | mixed",
    "fillerWords": ["actual fillers/verbal tics heard, e.g. like, honestly, right"],
    "catchphrases": ["any signature/repeated phrases, [] if none"],
    "openerStyle": "how they tend to open — bold claim, question, story, greeting",
    "tonalQualities": ["e.g. warm, urgent, deadpan, animated, reassuring"],
    "quirks": "distinctive habits — code-switching, rhetorical questions, self-deprecation, emphasis patterns"
  }
}

traits examples: "conversational", "high energy", "direct and punchy", "uses rhetorical questions", "storytelling", "casual", "motivational", "vulnerable", "humorous", "pauses for emphasis", "code-switches languages"`
        },
        { inlineData: { mimeType: mimeType.split(';')[0], data: audioBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
  }

  // Try each model in the chain. A 429/503 burns the current model's quota, so
  // move to the next model (own quota bucket) rather than just sleeping. Within
  // a single model we still do a short backoff retry for brief spikes.
  let lastErrText = ''
  for (let m = 0; m < chain.length; m++) {
    const modelId = chain[m]
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${modelId}:generateContent`

    let response
    let quotaHit = false
    for (let attempt = 0; ; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) break

      const isQuota = response.status === 429 || response.status === 503
      // 429 = sustained quota exhaustion → don't waste time retrying the same
      // model; fall straight to the next in the chain. 503 = transient overload
      // → a short backoff retry on the same model is worth it.
      if (response.status === 503 && attempt < GEMINI_RETRY.maxRetries) {
        await new Promise(r => setTimeout(r, GEMINI_RETRY.baseDelayMs * (attempt + 1)))
        continue
      }
      lastErrText = (await response.text()).slice(0, 300)
      if (isQuota) { quotaHit = true; break }
      throw new Error(`Vertex AI audio: ${response.status} — ${lastErrText}`)
    }

    if (quotaHit) {
      if (m < chain.length - 1) {
        console.warn(`[gemini] transcribe "${modelId}" quota — falling back to "${chain[m + 1]}"`)
        continue
      }
      throw new Error(`Vertex AI audio: 429 — all models exhausted: ${lastErrText}`)
    }

    if (m > 0) console.warn(`[gemini] transcribe served via fallback "${modelId}"`)
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) throw new Error('Empty audio response from Vertex AI')

    const parsed = extractJson(text)
    return {
      transcript: parsed.transcript || '',
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      voiceProfile: parsed.voiceProfile && typeof parsed.voiceProfile === 'object' ? parsed.voiceProfile : null,
    }
  }
}

/**
 * Robustly extract and parse JSON from Gemini response text.
 * Handles: markdown code fences, trailing commas, single-line responses.
 */
export function extractJson(text) {
  if (!text) throw new Error('Empty response from Gemini')

  let str = typeof text === 'string' ? text : JSON.stringify(text)

  // Strip Gemini 2.5 thinking tags (thinking content bleeds in when budget > 0)
  str = str.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim()
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // Strip markdown code fences (closed or unclosed — handles truncated responses)
  str = str.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
  // Handle unclosed fence (truncated): strip opening fence only
  if (str.startsWith('```')) str = str.replace(/^```(?:json)?\s*/, '').trim()

  // Try direct parse first
  try { return JSON.parse(str) } catch {}

  // Extract largest {...} block
  const match = str.match(/\{[\s\S]*\}/)

  // No closing } found — JSON was truncated before any object closed.
  // Try to salvage by closing all open braces/brackets.
  if (!match) {
    const start = str.indexOf('{')
    if (start === -1) {
      console.error('[gemini] No JSON found in response. Raw text:', str.slice(0, 500))
      throw new Error('No JSON object found in Gemini response')
    }
    let truncated = str.slice(start)
    // Remove trailing commas and incomplete last key-value
    truncated = truncated.replace(/,\s*$/, '')
    // Close open string if needed
    const quoteCount = (truncated.match(/(?<!\\)"/g) || []).length
    if (quoteCount % 2 !== 0) truncated += '"'
    // Count open braces/brackets
    let depth = 0; let inStr = false; let escape = false
    const stack = []
    for (const ch of truncated) {
      if (escape) { escape = false; continue }
      if (ch === '\\' && inStr) { escape = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') { stack.push('}'); depth++ }
      else if (ch === '[') { stack.push(']'); depth++ }
      else if (ch === '}' || ch === ']') { stack.pop(); depth-- }
    }
    truncated += stack.reverse().join('')
    truncated = truncated.replace(/,\s*([}\]])/g, '$1')
    truncated = truncated.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, (_, pre, key, colon) => `${pre}"${key}"${colon}`)
    try { return JSON.parse(truncated) } catch {}
    throw new Error('No JSON object found in Gemini response')
  }

  let jsonStr = match[0]

  // Fix trailing commas
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
  // Remove JS comments
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // Fix unquoted object keys: { key: value } → { "key": value }
  jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, (_, pre, key, colon) => `${pre}"${key}"${colon}`)
  // Fix single-quoted strings → double-quoted
  jsonStr = jsonStr.replace(/'(?:[^'\\]|\\.)*'/g, m => '"' + m.slice(1, -1).replace(/\\'/g, "'").replace(/(?<!\\)"/g, '\\"') + '"')

  try { return JSON.parse(jsonStr) } catch {}

  // Last resort: if truncated JSON, try to close it gracefully
  try {
    // Count open braces/brackets and close them
    let depth = 0
    let inStr = false
    let escape = false
    for (const ch of jsonStr) {
      if (escape) { escape = false; continue }
      if (ch === '\\' && inStr) { escape = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{' || ch === '[') depth++
      if (ch === '}' || ch === ']') depth--
    }
    // Trim to last complete object if truncated
    const lastComplete = jsonStr.lastIndexOf('},"recommendations"')
    if (lastComplete > 0 && depth !== 0) {
      jsonStr = jsonStr.slice(0, lastComplete) + '},"recommendations":[]}'
    }
    return JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}`)
  }
}
