import { useEffect } from 'react'
import { SITE } from '../lib/seo.js'

// Dependency-free document-head manager. Updates title + meta on route change.
// Works for client navigation (Googlebot renders JS) and during prerendering.

function upsertMeta(attr, key, content) {
  if (content == null) return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export default function Seo({ title, description, path = '/', noindex = false, image }) {
  const fullTitle = title || SITE.defaultTitle
  const desc = description || SITE.description
  const url = SITE.url + (path === '/' ? '/' : path)
  const img = image || SITE.ogImage
  const robots = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1'

  useEffect(() => {
    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'robots', robots)
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:image', img)

    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', img)
  }, [fullTitle, desc, url, img, robots])

  return null
}
