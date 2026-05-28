import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/ui.jsx'
import { PLANS } from '../constants/plans.js'

const NEXT_STEPS = [
  { icon: Icon.Studio, label: 'Generate unlimited scripts', href: '/studio' },
  { icon: Icon.Mic,    label: 'Record with AI coaching',    href: '/studio' },
  { icon: Icon.Flame,  label: 'Track trending topics',      href: '/dashboard' },
]

export default function PlanSuccess() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [visible, setVisible] = useState(false)

  const planId = params.get('plan') || 'pro'
  const plan = PLANS.find(p => p.id === planId) || PLANS[1]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const nextSteps = NEXT_STEPS.map(s => (
    <button
      key={s.label}
      onClick={() => navigate(s.href)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
        border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)',
        cursor: 'pointer', transition: 'all var(--tx-fast)', textAlign: 'left', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'var(--paper-2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--paper)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <s.icon size={15} style={{ color: 'var(--ink)' }}/>
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', flex: 1 }}>{s.label}</span>
      <Icon.ChevR size={14} style={{ color: 'var(--mute)', flexShrink: 0 }}/>
    </button>
  ))

  return (
    <div className="app-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <div style={{
        maxWidth: 440, width: '100%', textAlign: 'center', padding: '0 24px',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Checkmark circle */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <Icon.Check size={28} stroke={2} style={{ color: 'var(--paper)' }}/>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 10 }}>
          Welcome to {plan.name}
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 36 }}>
          Your subscription is active. Everything unlocked — go create something people can't stop watching.
        </p>

        {/* Next steps */}
        <div style={{ textAlign: 'left', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 12 }}>Start here</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nextSteps}
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 46 }}>
          Go to dashboard
          <Icon.Arrow size={14}/>
        </button>

        <p style={{ fontSize: 12, color: 'var(--mute)', marginTop: 20 }}>
          A confirmation email is on its way. Questions?{' '}
          <a href="mailto:hello@creatorpulse.in" style={{ color: 'var(--ink)', textDecoration: 'none' }}>hello@creatorpulse.in</a>
        </p>
      </div>
    </div>
  )
}
