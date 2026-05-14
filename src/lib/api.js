const BASE_URL = import.meta.env.VITE_API_URL || ''

function buildUrl(path) {
  return `${BASE_URL}${path}`
}

async function apiFetch(path, options = {}) {
  const url = buildUrl(path)
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

// ─── Scripts ─────────────────────────────────────────────────────────────────

export function generateScript(topicId, topicTitle, niche, tone, format, onStep, onComplete, onError) {
  const controller = new AbortController()
  const url = buildUrl('/api/scripts/generate')

  async function stream() {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
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
        buffer = lines.pop() // keep incomplete line

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
      if (err.name !== 'AbortError') {
        onError && onError(err.message || 'Generation failed')
      }
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

export async function saveScript(scriptData) {
  const data = await apiFetch('/api/scripts', {
    method: 'POST',
    body: JSON.stringify(scriptData)
  })
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

export async function updateSettings(settings) {
  if (settings.apiKeys) {
    localStorage.setItem('trendforge_api_keys', JSON.stringify(settings.apiKeys))
  }
  return { success: true }
}
