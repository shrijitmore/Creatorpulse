import React from 'react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/MarketingShell.jsx'
import Seo from '../components/Seo.jsx'
import JsonLd, { faqPage, breadcrumb } from '../components/JsonLd.jsx'
import { Icon } from '../components/ui.jsx'
import { PLANS, PLAN_FAQS } from '../constants/plans.js'
import { getSeo, SITE } from '../lib/seo.js'

const FAQ_LD = faqPage(PLAN_FAQS)
const CRUMB_LD = breadcrumb([
  { name: 'Home', url: SITE.url + '/' },
  { name: 'Pricing', url: SITE.url + '/pricing' },
])

function PlanCard({ plan }) {
  const featureItems = plan.features.map(f => (
    <li key={f} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--ink-2)', padding: '5px 0' }}>
      <Icon.Check size={13} stroke={2.4} style={{ color: 'var(--ink)', flexShrink: 0, marginTop: 2 }} />
      <span>{f}</span>
    </li>
  ))
  const isHero = plan.recommended
  return (
    <div style={{
      border: isHero ? '1.5px solid var(--ink)' : '1px solid var(--line)',
      borderRadius: 16, padding: 24, background: 'var(--paper)', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{plan.name}</h3>
          {isHero && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'var(--ink)', color: 'var(--paper)' }}>POPULAR</span>}
        </div>
        <div style={{ marginTop: 10, fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          ₹{plan.price.toLocaleString('en-IN')}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--mute)' }}>{plan.price === 0 ? '/forever' : '/mo'}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 6 }}>{plan.description}</p>
      </div>
      <Link
        to="/sign-up"
        className={`btn btn-sm ${isHero ? 'btn-primary' : 'btn-line'}`}
        style={{ justifyContent: 'center', width: '100%' }}>
        {plan.cta}
      </Link>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        {featureItems}
      </ul>
    </div>
  )
}

export default function Pricing() {
  const cards = PLANS.map(p => <PlanCard key={p.id} plan={p} />)
  const faqItems = PLAN_FAQS.map(f => (
    <div key={f.q} style={{ borderTop: '1px solid var(--line)', padding: '18px 0' }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{f.q}</h3>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>{f.a}</p>
    </div>
  ))

  return (
    <MarketingShell>
      <Seo {...getSeo('/pricing')} />
      <JsonLd id="pricing-faq" data={FAQ_LD} />
      <JsonLd id="pricing-crumb" data={CRUMB_LD} />

      <header style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 48px' }}>
        <span className="kicker">Pricing</span>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink)', marginTop: 14, lineHeight: 1.05 }}>
          Simple pricing for serious creators
        </h1>
        <p style={{ fontSize: 16, color: 'var(--mute)', marginTop: 16, lineHeight: 1.6 }}>
          Start free, no credit card. Upgrade to Pro for unlimited AI scripts, voice training,
          and cross-platform trend signals. Cancel anytime.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 72 }}>
        {cards}
      </div>

      <section>
        <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 8 }}>
          Frequently asked questions
        </h2>
        {faqItems}
      </section>

      <div style={{ textAlign: 'center', marginTop: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Ready to create faster?</h2>
        <Link to="/sign-up" className="btn btn-primary">Get started free</Link>
      </div>
    </MarketingShell>
  )
}
