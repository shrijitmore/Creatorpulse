import { getAuthHeaders } from './apiClient.js'

// Strip trailing slash(es) so buildUrl never produces `//api` (a common env typo).
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const DEFAULT_TIMEOUT_MS = 30000

function buildUrl(path) {
  return `${BASE_URL}${path}`
}

/**
 * Single fetch wrapper for every API call.
 * - Prepends VITE_API_URL (never relative — works on Netlify/prod).
 * - Hard timeout via AbortController so no loader spins forever.
 *   Override per-call with options.timeoutMs (e.g. slow audio analysis).
 */
async function apiFetch(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOpts } = options
  const url = buildUrl(path)
  const authHeaders = await getAuthHeaders()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...fetchOpts,
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...(fetchOpts.headers || {}) },
      signal: controller.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error')
      throw new Error(`API ${res.status}: ${text}`)
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`)
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ─── Trends ──────────────────────────────────────────────────────────────────

export async function getTrends(niches = [], platforms = []) {
  const params = new URLSearchParams()
  if (niches.length) params.set('niches', niches.join(','))
  if (platforms.length) params.set('platforms', platforms.join(','))
  const data = await apiFetch(`/api/trends?${params}`)
  return data.data || data
}

export async function refreshTrends(niches = [], platforms = []) {
  const data = await apiFetch('/api/trends/refresh', {
    method: 'POST',
    body: JSON.stringify({ niches, platforms })
  })
  return data.data || data
}

// ─── Recording studio ──────────────────────────────────────────────────────────

export async function analyseRecording({ audioBase64, mimeType = 'audio/webm', sceneText, sceneNumber, scriptTone, niche }) {
  const data = await apiFetch('/api/recording/analyse', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, mimeType, sceneText, sceneNumber, scriptTone, niche }),
    timeoutMs: 60000, // Gemini audio analysis is slower than a normal request
  })
  return data.data || data
}

export async function getRecordingStats() {
  const data = await apiFetch('/api/recording/stats')
  return data.data || data
}

export async function markScriptUsed(scriptId, engagementScore) {
  const data = await apiFetch('/api/profile/mark-used', {
    method: 'POST',
    body: JSON.stringify({ scriptId, engagementScore }),
  })
  return data.data || data
}

// ─── Scripts ─────────────────────────────────────────────────────────────────

export function generateScript(topicId, topicTitle, niche, tone, format, onStep, onComplete, onError) {
  const controller = new AbortController()
  const url = buildUrl('/api/scripts/generate')

  async function stream() {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', ...authHeaders },
        body: JSON.stringify({ topicId, topicTitle, niche, tone, format }),
        signal: controller.signal
      })

      if (!res.ok) throw new Error(`Server error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        let eventType = null
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (eventType === 'progress') onStep && onStep(data)
              else if (eventType === 'complete') onComplete && onComplete(data)
              else if (eventType === 'error') onError && onError(data.message || 'Generation failed')
            } catch {}
            eventType = null
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') onError && onError(err.message || 'Generation failed')
    }
  }

  stream()
  return () => controller.abort()
}

export async function regenerateSection(scriptId, section, tone, format) {
  const data = await apiFetch('/api/scripts/regenerate-section', {
    method: 'POST',
    body: JSON.stringify({ scriptId, section, tone, format })
  })
  return data.data || data
}

export async function getSavedScripts(filters = {}) {
  const params = new URLSearchParams()
  if (filters.niche) params.set('niche', filters.niche)
  if (filters.format) params.set('format', filters.format)
  if (filters.platform) params.set('platform', filters.platform)
  const data = await apiFetch(`/api/scripts?${params}`)
  return data.data || data
}

export async function getScript(id) {
  const data = await apiFetch(`/api/scripts/${id}`)
  return data.data || data
}

export async function deleteScript(id) {
  await apiFetch(`/api/scripts/${id}`, { method: 'DELETE' })
  return { success: true }
}

export async function updateNiches(niches) {
  localStorage.setItem('trendforge_niches', JSON.stringify(niches))
  try {
    await apiFetch('/api/user/niches', { method: 'PATCH', body: JSON.stringify({ niches }) })
  } catch (err) {
    console.warn('Failed to sync niches to server:', err.message)
  }
  return { niches }
}


// ─── Onboarding ───────────────────────────────────────────────────────────────

export async function completeOnboarding(answers) {
  const data = await apiFetch('/api/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify({ answers })
  })
  return data.data || data
}

export async function getOnboardingStatus() {
  const data = await apiFetch('/api/onboarding/status')
  return data.data || data
}

export async function resetOnboarding() {
  const data = await apiFetch('/api/onboarding/reset', { method: 'POST' })
  return data
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile() {
  const data = await apiFetch('/api/profile')
  return data.data || data
}

export async function updateProfile(updates) {
  const data = await apiFetch('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
  return data.data || data
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export async function getMemorySummary(niche) {
  const params = niche ? `?niche=${encodeURIComponent(niche)}` : ''
  const data = await apiFetch(`/api/memory/summary${params}`)
  return data.data || data
}

export async function getSimilarScripts(topic, niche) {
  const params = new URLSearchParams()
  if (topic) params.set('topic', topic)
  if (niche) params.set('niche', niche)
  const data = await apiFetch(`/api/memory/similar?${params}`)
  return data.data || data
}

export async function transcribeVoice(audioBase64, mimeType = 'audio/webm') {
  const data = await apiFetch('/api/memory/transcribe-voice', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, mimeType })
  })
  return data.data || data
}

export async function saveUserPreferences(prefs) {
  if (prefs.languageStyle || prefs.contentFormat) {
    await updateProfile(prefs).catch(() => {})
  }
  return { success: true }
}

// ─── Scene editing ────────────────────────────────────────────────────────────

export async function editScene({ sceneNumber, element, currentValue, userPrompt, tone, niche, fullScript }) {
  const data = await apiFetch('/api/scene/edit', {
    method: 'POST',
    body: JSON.stringify({ sceneNumber, element, currentValue, userPrompt, tone, niche, fullScript })
  })
  return data.data || data
}

export async function followupScene({ previousSuggestion, followupPrompt, element, tone, niche }) {
  const data = await apiFetch('/api/scene/followup', {
    method: 'POST',
    body: JSON.stringify({ previousSuggestion, followupPrompt, element, tone, niche })
  })
  return data.data || data
}

// ─── Auth / user ─────────────────────────────────────────────────────────────

export async function getMe() {
  const data = await apiFetch('/api/auth/me')
  return data.data?.user || data.data || data
}

// ─── Billing (Razorpay subscriptions) ──────────────────────────────────────────

export async function createSubscription({ planId, cycle }) {
  const data = await apiFetch('/api/billing/create-subscription', {
    method: 'POST',
    body: JSON.stringify({ planId, cycle })
  })
  return data.data || data
}

export async function verifySubscription({ paymentId, subscriptionId, signature, planId, cycle }) {
  const data = await apiFetch('/api/billing/verify', {
    method: 'POST',
    body: JSON.stringify({ paymentId, subscriptionId, signature, planId, cycle })
  })
  return data.data || data
}

export async function cancelSubscription() {
  const data = await apiFetch('/api/billing/cancel', { method: 'POST' })
  return data.data || data
}

export async function redeemCode(code) {
  const data = await apiFetch('/api/billing/redeem-code', {
    method: 'POST',
    body: JSON.stringify({ code })
  })
  return data.data || data
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function adminGetStats() {
  const data = await apiFetch('/api/admin/stats')
  return data.data || data
}

export async function adminListUsers(search = '') {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const data = await apiFetch(`/api/admin/users?${params}`)
  return data.data?.users || []
}

export async function adminSetPlan(userId, { plan, cycle = 'monthly', days }) {
  const data = await apiFetch(`/api/admin/users/${userId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan, cycle, ...(days != null ? { days } : {}) })
  })
  return data.data?.user || data.data || data
}

export async function adminListPayments() {
  const data = await apiFetch('/api/admin/payments')
  return data.data?.payments || []
}

export async function adminListCoupons() {
  const data = await apiFetch('/api/admin/coupons')
  return data.data?.coupons || []
}

export async function adminCreateCoupon({ code, plan, durationDays, maxRedemptions, note }) {
  const data = await apiFetch('/api/admin/coupons', {
    method: 'POST',
    body: JSON.stringify({ code, plan, durationDays, maxRedemptions, note })
  })
  return data.data?.coupon || data.data || data
}

export async function adminToggleCoupon(code, active) {
  const data = await apiFetch(`/api/admin/coupons/${code}`, {
    method: 'PATCH',
    body: JSON.stringify({ active })
  })
  return data.data?.coupon || data.data || data
}

export async function interpretNiche(query) {
  const data = await apiFetch('/api/niches/interpret', {
    method: 'POST',
    body: JSON.stringify({ query })
  })
  return data.data || data
}
