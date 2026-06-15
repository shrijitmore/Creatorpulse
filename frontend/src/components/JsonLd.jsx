import { useEffect } from 'react'

// Injects a Schema.org JSON-LD block into <head>. Pass a stable `id` per block
// and a plain `data` object. Cleans itself up on unmount / route change.
export default function JsonLd({ id, data }) {
  useEffect(() => {
    const sid = `jsonld-${id}`
    let el = document.getElementById(sid)
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = sid
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify(data)
    return () => { el?.remove() }
  }, [id, data])

  return null
}

// Helper builders so pages stay declarative.
export const breadcrumb = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: it.url,
  })),
})

export const faqPage = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
})
