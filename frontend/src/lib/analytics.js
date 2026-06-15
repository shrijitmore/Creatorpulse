// Scalable analytics loader. IDs come from env; nothing loads in dev or without an ID.
// Add new providers here — call sites stay unchanged.

let started = false

function loadGA4(id) {
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', id, { anonymize_ip: true })
}

function loadClarity(id) {
  ;(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', id)
}

export function initAnalytics() {
  if (started || !import.meta.env.PROD) return
  started = true

  const ga4 = import.meta.env.VITE_GA4_ID
  const clarity = import.meta.env.VITE_CLARITY_ID

  if (ga4) loadGA4(ga4)
  if (clarity) loadClarity(clarity)
}

// SPA pageview — call on route change once GA4 is configured.
export function trackPageview(path) {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', { page_path: path })
}
