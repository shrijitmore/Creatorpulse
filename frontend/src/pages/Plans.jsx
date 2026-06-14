import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PLANS } from '../constants/plans.js'
import { getProfile } from '../lib/api.js'
import PricingCard from '../features/billing/PricingCard.jsx'
import CompareTable from '../features/billing/CompareTable.jsx'
import PlanFAQ from '../features/billing/PlanFAQ.jsx'
import CurrentPlanCard from '../features/billing/CurrentPlanCard.jsx'

const TRUST = [
  { label: 'Secured by Razorpay', sub: 'PCI-DSS Level 1' },
  { label: 'Cancel anytime', sub: 'No lock-in contracts' },
  { label: '₹ Indian pricing', sub: 'Pay in your currency' },
]

export default function Plans() {
  const navigate = useNavigate()
  const [yearly, setYearly] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [scriptsUsed, setScriptsUsed] = useState(0)
  const [scriptsLimit, setScriptsLimit] = useState(5)

  useEffect(() => {
    getProfile()
      .then(d => {
        if (d?.plan) setCurrentPlan(d.plan)
        if (d?.stats?.totalScripts != null) setScriptsUsed(d.stats.totalScripts)
        const limit = PLANS.find(p => p.id === (d?.plan || 'free'))?.limits?.scripts
        if (limit && isFinite(limit)) setScriptsLimit(limit)
      })
      .catch(() => {})
  }, [])

  const handleSelect = (plan) => {
    if (plan.id === 'free') return
    navigate(`/checkout?plan=${plan.id}&cycle=${yearly ? 'yearly' : 'monthly'}`)
  }

  const cards = PLANS.map(plan => (
    <PricingCard
      key={plan.id}
      plan={plan}
      isCurrent={plan.id === currentPlan}
      yearly={yearly}
      onSelect={handleSelect}
    />
  ))

  const trustBadges = TRUST.map(t => (
    <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{t.label}</p>
      <p style={{ fontSize: 11.5, color: 'var(--mute)' }}>{t.sub}</p>
    </div>
  ))

  return (
    <div className="app-main">
      <div className="app-top">
        <div>
          <span className="kicker">Billing</span>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--ink)', marginTop: 8 }}>
            Plans & pricing
          </h1>
          <p className="body" style={{ marginTop: 5, maxWidth: 460 }}>
            Simple, transparent pricing. No hidden fees. Upgrade or downgrade anytime.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 0 80px' }}>

        {/* Current plan */}
        <div style={{ marginBottom: 32 }}>
          <CurrentPlanCard plan={currentPlan} scriptsUsed={scriptsUsed} scriptsLimit={scriptsLimit}/>
        </div>

        {/* Billing cycle toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
          <span style={{ fontSize: 13, color: yearly ? 'var(--mute)' : 'var(--ink)', fontWeight: yearly ? 400 : 500, transition: 'color 0.15s' }}>Monthly</span>
          <button
            onClick={() => setYearly(v => !v)}
            role="switch"
            aria-checked={yearly}
            style={{
              width: 48, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: yearly ? 'var(--ink)' : 'var(--paper-3)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}>
            <span style={{
              position: 'absolute', top: 3, left: yearly ? 25 : 3, width: 20, height: 20,
              borderRadius: '50%', background: 'var(--paper)', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}/>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: yearly ? 'var(--ink)' : 'var(--mute)', fontWeight: yearly ? 500 : 400, transition: 'color 0.15s' }}>Yearly</span>
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 999, background: 'var(--ink)', color: 'var(--paper)',
              opacity: yearly ? 1 : 0.35, transition: 'opacity 0.2s',
            }}>Save 20%</span>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="billing-cards">
          {cards}
        </div>

        {/* Trust indicators */}
        <div className="trust-row">
          {trustBadges}
        </div>

        {/* Compare table */}
        <div style={{ marginBottom: 72 }}>
          <CompareTable/>
        </div>

        {/* FAQ */}
        <PlanFAQ/>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: 64 }}>
          <p style={{ fontSize: 13, color: 'var(--mute)', lineHeight: 1.6 }}>
            Questions? Email us at{' '}
            <a href="mailto:hello@influensa.in" style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>
              hello@influensa.in
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
