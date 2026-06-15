import React from 'react'
import { useParams, Link } from 'react-router-dom'
import MarketingShell from '../components/MarketingShell.jsx'
import Seo from '../components/Seo.jsx'
import JsonLd, { breadcrumb } from '../components/JsonLd.jsx'
import { SITE } from '../lib/seo.js'
import { getTerm } from '../content/glossary.js'

export default function GlossaryTerm() {
  const { slug } = useParams()
  const t = getTerm(slug)

  if (!t) {
    return (
      <MarketingShell>
        <Seo title="Term not found — Influensa" path={`/glossary/${slug}`} noindex />
        <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)' }}>Term not found</h1>
        <p style={{ color: 'var(--mute)', marginTop: 8 }}><Link to="/glossary">← Back to the glossary</Link></p>
      </MarketingShell>
    )
  }

  const url = `${SITE.url}/glossary/${t.slug}`
  const termLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: t.term,
    description: t.definition,
    url,
    inDefinedTermSet: SITE.url + '/glossary',
  }
  const crumbLd = breadcrumb([
    { name: 'Home', url: SITE.url + '/' },
    { name: 'Glossary', url: SITE.url + '/glossary' },
    { name: t.term, url },
  ])

  return (
    <MarketingShell>
      <Seo title={`${t.term} — Creator glossary — Influensa`} description={t.short} path={`/glossary/${t.slug}`} />
      <JsonLd id="term-defined" data={termLd} />
      <JsonLd id="term-crumb" data={crumbLd} />

      <article className="legal-prose">
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute-2)', marginBottom: 4 }}>
          <Link to="/glossary">Glossary</Link>
        </p>
        <h1>{t.term}</h1>
        <p className="legal-updated">{t.short}</p>
        <p>{t.definition}</p>

        <div style={{ marginTop: 32 }}>
          <Link to="/sign-up" className="btn btn-primary btn-sm">Try Influensa free</Link>
        </div>
      </article>
    </MarketingShell>
  )
}
