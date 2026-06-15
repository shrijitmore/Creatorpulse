import React from 'react'
import MarketingShell from '../../components/MarketingShell.jsx'
import Seo from '../../components/Seo.jsx'

// Shared wrapper for legal documents — consistent head + prose styling.
export default function LegalDoc({ title, description, path, updated, children }) {
  return (
    <MarketingShell>
      <Seo title={`${title} — Influensa`} description={description} path={path} />
      <article className="legal-prose">
        <span className="kicker">Legal</span>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        {children}
      </article>
    </MarketingShell>
  )
}
