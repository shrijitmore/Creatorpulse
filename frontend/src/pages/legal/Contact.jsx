import React from 'react'
import MarketingShell from '../../components/MarketingShell.jsx'
import Seo from '../../components/Seo.jsx'
import JsonLd from '../../components/JsonLd.jsx'
import { SITE } from '../../lib/seo.js'

const CONTACT_LD = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Influensa',
  url: SITE.url + '/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'Influensa',
    email: 'support@influensa.xyz',
    url: SITE.url + '/',
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@influensa.xyz',
      availableLanguage: ['English'],
    }],
  },
}

const CHANNELS = [
  { label: 'General support', email: 'support@influensa.xyz' },
  { label: 'Billing & refunds', email: 'billing@influensa.xyz' },
  { label: 'Privacy requests', email: 'privacy@influensa.xyz' },
]

export default function Contact() {
  const cards = CHANNELS.map(c => (
    <div key={c.email} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: 'var(--paper)' }}>
      <p style={{ fontSize: 13, color: 'var(--mute)', marginBottom: 6 }}>{c.label}</p>
      <a href={`mailto:${c.email}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{c.email}</a>
    </div>
  ))

  return (
    <MarketingShell>
      <Seo title="Contact — Influensa" description="Get in touch with the Influensa team — support, billing, and privacy." path="/contact" />
      <JsonLd id="contact-page" data={CONTACT_LD} />

      <div style={{ maxWidth: 680 }}>
        <span className="kicker">Contact</span>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)', marginTop: 12, lineHeight: 1.1 }}>
          We're here to help
        </h1>
        <p style={{ fontSize: 16, color: 'var(--mute)', marginTop: 14, lineHeight: 1.6 }}>
          Questions, feedback, or partnership ideas — reach the right inbox below and we'll get back within 1–2 business days.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 32 }}>
          {cards}
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--mute)', marginTop: 32 }}>
          Registered entity: <strong>[LEGAL ENTITY NAME]</strong> · <strong>[REGISTERED ADDRESS]</strong>
        </p>
      </div>
    </MarketingShell>
  )
}
