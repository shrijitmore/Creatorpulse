import React, { useState } from 'react'
import { Icon } from '../../components/ui.jsx'
import { PLAN_FAQS } from '../../constants/plans.js'

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          flexShrink: 0, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          color: 'var(--mute)',
        }}>
          <Icon.ChevD size={16}/>
        </span>
      </button>
      {open && (
        <p style={{
          fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65,
          paddingBottom: 18, paddingRight: 32,
        }}>
          {a}
        </p>
      )}
    </div>
  )
}

export default function PlanFAQ() {
  const items = PLAN_FAQS.map(faq => <FAQItem key={faq.q} q={faq.q} a={faq.a}/>)

  return (
    <div>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <span className="kicker">FAQ</span>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 8 }}>
          Questions & answers
        </h2>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', borderTop: '1px solid var(--line)' }}>
        {items}
      </div>
    </div>
  )
}
