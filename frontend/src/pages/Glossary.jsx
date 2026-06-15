import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/MarketingShell.jsx'
import Seo from '../components/Seo.jsx'
import JsonLd, { breadcrumb } from '../components/JsonLd.jsx'
import { getSeo, SITE } from '../lib/seo.js'
import { TERMS } from '../content/glossary.js'

const SET_LD = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'Influensa Creator Glossary',
  url: SITE.url + '/glossary',
  hasDefinedTerm: TERMS.map(t => ({
    '@type': 'DefinedTerm',
    name: t.term,
    description: t.short,
    url: `${SITE.url}/glossary/${t.slug}`,
  })),
}
const CRUMB_LD = breadcrumb([
  { name: 'Home', url: SITE.url + '/' },
  { name: 'Glossary', url: SITE.url + '/glossary' },
])

export default function Glossary() {
  const rows = TERMS.map(t => (
    <Link
      key={t.slug}
      to={`/glossary/${t.slug}`}
      style={{ display: 'block', borderTop: '1px solid var(--line)', padding: '18px 0', color: 'inherit' }}>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{t.term}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{t.short}</p>
    </Link>
  ))

  return (
    <MarketingShell>
      <Seo {...getSeo('/glossary')} />
      <JsonLd id="glossary-set" data={SET_LD} />
      <JsonLd id="glossary-crumb" data={CRUMB_LD} />

      <header style={{ marginBottom: 24 }}>
        <span className="kicker">Glossary</span>
        <h1 style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', marginTop: 12, lineHeight: 1.08 }}>
          Creator glossary
        </h1>
        <p style={{ fontSize: 16, color: 'var(--mute)', marginTop: 14, maxWidth: 560, lineHeight: 1.6 }}>
          Plain-English definitions of the content, trend, and growth terms every creator should know.
        </p>
      </header>

      <div>{rows}</div>
    </MarketingShell>
  )
}
