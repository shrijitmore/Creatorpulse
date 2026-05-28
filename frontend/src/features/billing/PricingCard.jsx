import React from 'react'
import { Icon } from '../../components/ui.jsx'

export default function PricingCard({ plan, isCurrent, yearly, onSelect }) {
  const dark = plan.recommended

  const monthlyPrice = plan.price
    ? (yearly ? Math.round(plan.price * 0.8) : plan.price)
    : 0

  const featureRows = plan.features.map(f => (
    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <Icon.Check size={13} stroke={2.5} style={{
        color: dark ? 'rgba(255,255,255,0.5)' : 'var(--ink)',
        marginTop: 2, flexShrink: 0,
      }}/>
      <span style={{ fontSize: 13.5, color: dark ? 'rgba(255,255,255,0.8)' : 'var(--ink-2)', lineHeight: 1.45 }}>{f}</span>
    </li>
  ))

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 24px',
      borderRadius: 14,
      border: dark ? 'none' : '1px solid var(--line)',
      background: dark ? '#0A0A0A' : 'var(--paper)',
      flex: 1,
      transform: dark ? 'scale(1.015)' : 'scale(1)',
      boxShadow: dark ? '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.18)' : 'none',
      transition: 'box-shadow 0.2s, transform 0.2s',
      zIndex: dark ? 1 : 0,
    }}
    onMouseEnter={e => {
      if (!dark) e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'
    }}
    onMouseLeave={e => {
      if (!dark) e.currentTarget.style.boxShadow = 'none'
    }}>

      {dark && (
        <div style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 999, padding: '3px 12px',
          fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--mono)',
          letterSpacing: '0.07em', color: 'var(--ink)', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          Recommended
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        {isCurrent && (
          <p style={{ fontSize: 10.5, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: dark ? 'rgba(255,255,255,0.38)' : 'var(--mute)', marginBottom: 6 }}>Current plan</p>
        )}
        <h3 style={{ fontSize: 17, fontWeight: 600, color: dark ? '#fff' : 'var(--ink)', letterSpacing: '-0.015em', marginBottom: 5 }}>{plan.name}</h3>
        <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.45)' : 'var(--mute)', lineHeight: 1.5 }}>{plan.description}</p>
      </div>

      <div style={{ marginBottom: 22 }}>
        {plan.price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.4)' : 'var(--mute)', marginBottom: 7, fontFamily: 'var(--mono)' }}>₹</span>
              <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.04em', color: dark ? '#fff' : 'var(--ink)', lineHeight: 1 }}>
                {monthlyPrice.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.35)' : 'var(--mute)', marginBottom: 7 }}>/mo</span>
            </div>
            {yearly && (
              <p style={{ fontSize: 11.5, color: dark ? 'rgba(255,255,255,0.35)' : 'var(--mute)', marginTop: 5 }}>
                ₹{(monthlyPrice * 12).toLocaleString('en-IN')} billed yearly · save 20%
              </p>
            )}
          </>
        ) : (
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.04em', color: dark ? '#fff' : 'var(--ink)', lineHeight: 1, display: 'block' }}>Free</span>
        )}
      </div>

      <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.08)' : 'var(--line)', marginBottom: 20 }}/>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1, listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
        {featureRows}
      </ul>

      <button
        onClick={() => !isCurrent && onSelect?.(plan)}
        disabled={isCurrent}
        style={{
          width: '100%', padding: '11px 0', borderRadius: 10,
          fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em',
          cursor: isCurrent ? 'default' : 'pointer',
          border: dark ? '1px solid rgba(255,255,255,0.14)' : '1.5px solid var(--ink)',
          background: dark ? 'rgba(255,255,255,0.09)' : isCurrent ? 'var(--paper-2)' : 'var(--ink)',
          color: dark ? 'rgba(255,255,255,0.9)' : isCurrent ? 'var(--mute)' : 'var(--paper)',
          transition: 'background 0.15s, opacity 0.15s',
          opacity: isCurrent ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : '#222' }}
        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.09)' : 'var(--ink)' }}>
        {isCurrent ? '✓ Current plan' : plan.cta}
      </button>
    </div>
  )
}
