import {
  MOCK_TRENDS,
  MOCK_RECOMMENDATIONS,
  MOCK_SCRIPT,
  MOCK_CONTENT_KIT,
  MOCK_SAVED_SCRIPTS
} from './mockData.js'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// Mock mode: use if localStorage flag set OR API fails
export function isMockMode() {
  return localStorage.getItem('trendforge_mock') === 'true' ||
    localStorage.getItem('trendforge_mock') === null
}

function buildUrl(path) {
  return `${BASE_URL}${path}`
}

async function apiFetch(path, options = {}) {
  const url = buildUrl(path)
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Trends ──────────────────────────────────────────────────────────────────

export async function getTrends(niches = [], platforms = []) {
  if (isMockMode()) {
    await delay(800)
    let trends = [...MOCK_TRENDS]
    if (niches.length > 0) {
      trends = trends.filter(t => niches.includes(t.niche))
    }
    if (platforms.length > 0 && !platforms.includes('all')) {
      trends = trends.filter(t => platforms.includes(t.platform))
    }
    return {
      trends,
      recommendations: MOCK_RECOMMENDATIONS.filter(r =>
        niches.length === 0 || niches.includes(r.niche)
      )
    }
  }
  try {
    const params = new URLSearchParams()
    if (niches.length) params.set('niches', niches.join(','))
    if (platforms.length) params.set('platforms', platforms.join(','))
    return await apiFetch(`/api/trends?${params}`)
  } catch (err) {
    console.warn('API unavailable, falling back to mock data:', err.message)
    localStorage.setItem('trendforge_mock', 'true')
    return getTrends(niches, platforms)
  }
}

export async function refreshTrends(niches = [], platforms = []) {
  if (isMockMode()) {
    await delay(1200)
    return getTrends(niches, platforms)
  }
  try {
    return await apiFetch('/api/trends/refresh', {
      method: 'POST',
      body: JSON.stringify({ niches, platforms })
    })
  } catch (err) {
    console.warn('API unavailable, falling back to mock data:', err.message)
    return getTrends(niches, platforms)
  }
}

// ─── Scripts ─────────────────────────────────────────────────────────────────

export function generateScript(topicId, tone, format, onStep, onComplete, onError) {
  if (isMockMode()) {
    return simulateMockGeneration(onStep, onComplete, onError)
  }

  try {
    const params = new URLSearchParams({ topicId, tone, format })
    const url = buildUrl(`/api/scripts/generate?${params}`)
    const eventSource = new EventSource(url)

    eventSource.addEventListener('step', (e) => {
      try {
        const data = JSON.parse(e.data)
        onStep && onStep(data)
      } catch {}
    })

    eventSource.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data)
        onComplete && onComplete(data)
      } catch {}
      eventSource.close()
    })

    eventSource.addEventListener('error', (e) => {
      console.warn('SSE error, falling back to mock:', e)
      eventSource.close()
      localStorage.setItem('trendforge_mock', 'true')
      simulateMockGeneration(onStep, onComplete, onError)
    })

    return () => eventSource.close()
  } catch (err) {
    console.warn('SSE setup failed, using mock:', err.message)
    return simulateMockGeneration(onStep, onComplete, onError)
  }
}

function simulateMockGeneration(onStep, onComplete, onError) {
  const steps = [
    { step: 1, label: 'Scraping Instagram, X, Reddit...', status: 'active' },
    { step: 2, label: 'Analysing trends...', status: 'active' },
    { step: 3, label: 'Writing your script...', status: 'active' },
    { step: 4, label: 'Generating hooks & copy...', status: 'active' }
  ]

  let cancelled = false
  const timers = []

  steps.forEach((step, idx) => {
    const startTimer = setTimeout(() => {
      if (cancelled) return
      onStep && onStep({ step: step.step, status: 'active' })
    }, idx * 1200)

    const doneTimer = setTimeout(() => {
      if (cancelled) return
      onStep && onStep({ step: step.step, status: 'done' })
    }, idx * 1200 + 1000)

    timers.push(startTimer, doneTimer)
  })

  const completeTimer = setTimeout(() => {
    if (cancelled) return
    onComplete && onComplete({
      script: MOCK_SCRIPT,
      contentKit: MOCK_CONTENT_KIT
    })
  }, steps.length * 1200 + 600)

  timers.push(completeTimer)

  return () => {
    cancelled = true
    timers.forEach(t => clearTimeout(t))
  }
}

export async function regenerateSection(scriptId, section, tone, format) {
  if (isMockMode()) {
    await delay(1000)
    if (section === 'hooks') {
      return { hookVariants: MOCK_CONTENT_KIT.hookVariants }
    }
    if (section === 'caption') {
      return { caption: MOCK_CONTENT_KIT.caption }
    }
    if (section === 'hashtags') {
      return { hashtags: MOCK_CONTENT_KIT.hashtags }
    }
    if (section === 'thumbnail') {
      return { thumbnailText: MOCK_CONTENT_KIT.thumbnailText }
    }
    return {}
  }
  try {
    return await apiFetch('/api/scripts/regenerate-section', {
      method: 'POST',
      body: JSON.stringify({ scriptId, section, tone, format })
    })
  } catch (err) {
    console.warn('API unavailable:', err.message)
    return regenerateSection(scriptId, section, tone, format)
  }
}

export async function getSavedScripts() {
  if (isMockMode()) {
    await delay(400)
    const stored = localStorage.getItem('trendforge_saved_scripts')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {}
    }
    return MOCK_SAVED_SCRIPTS
  }
  try {
    return await apiFetch('/api/scripts')
  } catch (err) {
    console.warn('API unavailable:', err.message)
    const stored = localStorage.getItem('trendforge_saved_scripts')
    return stored ? JSON.parse(stored) : MOCK_SAVED_SCRIPTS
  }
}

export async function getScript(id) {
  if (isMockMode()) {
    await delay(300)
    return { script: MOCK_SCRIPT, contentKit: MOCK_CONTENT_KIT }
  }
  try {
    return await apiFetch(`/api/scripts/${id}`)
  } catch (err) {
    console.warn('API unavailable:', err.message)
    return { script: MOCK_SCRIPT, contentKit: MOCK_CONTENT_KIT }
  }
}

export async function saveScript(scriptData) {
  // Always save to localStorage for persistence
  const stored = localStorage.getItem('trendforge_saved_scripts')
  const scripts = stored ? JSON.parse(stored) : [...MOCK_SAVED_SCRIPTS]
  const newScript = {
    ...scriptData,
    id: `local-${Date.now()}`,
    createdAt: new Date().toISOString()
  }
  const updated = [newScript, ...scripts]
  localStorage.setItem('trendforge_saved_scripts', JSON.stringify(updated))

  if (!isMockMode()) {
    try {
      await apiFetch('/api/scripts', {
        method: 'POST',
        body: JSON.stringify(scriptData)
      })
    } catch (err) {
      console.warn('API unavailable, saved locally only:', err.message)
    }
  }

  return newScript
}

export async function deleteScript(id) {
  // Remove from localStorage
  const stored = localStorage.getItem('trendforge_saved_scripts')
  if (stored) {
    try {
      const scripts = JSON.parse(stored)
      const updated = scripts.filter(s => s.id !== id)
      localStorage.setItem('trendforge_saved_scripts', JSON.stringify(updated))
    } catch {}
  }

  if (!isMockMode()) {
    try {
      await apiFetch(`/api/scripts/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.warn('API unavailable:', err.message)
    }
  }

  return { success: true }
}

export async function updateNiches(niches) {
  localStorage.setItem('trendforge_niches', JSON.stringify(niches))

  if (!isMockMode()) {
    try {
      await apiFetch('/api/user/niches', {
        method: 'PATCH',
        body: JSON.stringify({ niches })
      })
    } catch (err) {
      console.warn('API unavailable:', err.message)
    }
  }

  return { niches }
}

export async function updateSettings(settings) {
  if (settings.apiKeys) {
    localStorage.setItem('trendforge_api_keys', JSON.stringify(settings.apiKeys))
  }

  if (!isMockMode()) {
    try {
      return await apiFetch('/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      })
    } catch (err) {
      console.warn('API unavailable:', err.message)
    }
  }

  return { success: true }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
