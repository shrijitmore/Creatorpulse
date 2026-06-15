import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/MarketingShell.jsx'
import Seo from '../components/Seo.jsx'
import JsonLd, { breadcrumb } from '../components/JsonLd.jsx'
import { getSeo, SITE } from '../lib/seo.js'
import { POSTS } from '../content/blog.js'

const BLOG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'Influensa Blog',
  url: SITE.url + '/blog',
  blogPost: POSTS.map(p => ({
    '@type': 'BlogPosting',
    headline: p.title,
    url: `${SITE.url}/blog/${p.slug}`,
    datePublished: p.date,
    author: { '@type': 'Organization', name: p.author },
  })),
}
const CRUMB_LD = breadcrumb([
  { name: 'Home', url: SITE.url + '/' },
  { name: 'Blog', url: SITE.url + '/blog' },
])

export default function Blog() {
  const cards = POSTS.map(p => (
    <Link
      key={p.slug}
      to={`/blog/${p.slug}`}
      style={{ display: 'block', border: '1px solid var(--line)', borderRadius: 14, padding: 24, background: 'var(--paper)', color: 'inherit' }}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute-2)' }}>
        {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {p.readMins} min read
      </p>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '8px 0 8px' }}>{p.title}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{p.description}</p>
    </Link>
  ))

  return (
    <MarketingShell>
      <Seo {...getSeo('/blog')} />
      <JsonLd id="blog-list" data={BLOG_LD} />
      <JsonLd id="blog-crumb" data={CRUMB_LD} />

      <header style={{ marginBottom: 40 }}>
        <span className="kicker">Blog</span>
        <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', marginTop: 12, lineHeight: 1.08 }}>
          Playbooks for creators who ship
        </h1>
        <p style={{ fontSize: 16, color: 'var(--mute)', marginTop: 14, maxWidth: 560, lineHeight: 1.6 }}>
          Tactics on viral trends, AI scriptwriting, and growing your audience — written for solo creators.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {cards}
      </div>
    </MarketingShell>
  )
}
