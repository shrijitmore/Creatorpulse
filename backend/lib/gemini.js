import { ChatVertexAI } from '@langchain/google-vertexai'

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

export function createGeminiModel({ temperature = 0.7, maxOutputTokens = 3000 } = {}) {
  const credentials = parseCredentials()
  const project = process.env.GOOGLE_CLOUD_PROJECT || credentials?.project_id
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

  const config = {
    model,
    temperature,
    maxOutputTokens,
    location,
    project,
  }

  if (credentials) {
    config.authOptions = {
      credentials,
      projectId: project,
    }
  }

  return new ChatVertexAI(config)
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
    if (start === -1) throw new Error('No JSON object found in Gemini response')
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
    try { return JSON.parse(truncated) } catch {}
    throw new Error('No JSON object found in Gemini response')
  }

  let jsonStr = match[0]

  // Fix trailing commas
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')
  // Remove JS comments
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

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
