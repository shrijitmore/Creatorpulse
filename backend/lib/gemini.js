import { ChatVertexAI } from '@langchain/google-vertexai'

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
 * Robustly extract and parse JSON from Gemini response text.
 * Handles: markdown code fences, trailing commas, single-line responses.
 */
export function extractJson(text) {
  if (!text) throw new Error('Empty response from Gemini')

  let str = typeof text === 'string' ? text : JSON.stringify(text)

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  str = str.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()

  // Try direct parse first
  try { return JSON.parse(str) } catch {}

  // Extract largest {...} block
  const match = str.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in Gemini response')

  let jsonStr = match[0]

  // Fix trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')

  // Remove JS-style comments
  jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

  try { return JSON.parse(jsonStr) } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}`)
  }
}
