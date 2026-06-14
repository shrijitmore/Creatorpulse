import React, { useState } from 'react'
import { PLANS } from '../../constants/plans.js'
import { adminSetPlan } from '../../lib/api.js'

const PLAN_IDS = PLANS.map(p => p.id)

const PLAN_TONE = {
  free:   { bg: 'var(--paper-3)', fg: 'var(--mute)' },
  pro:    { bg: '#0A0A0A', fg: '#fff' },
  agency: { bg: '#C47338', fg: '#fff' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function AdminUserRow({ user, onUpdate }) {
  const [plan, setPlan] = useState(user.plan)
  const [days, setDays] = useState(30)
  const [saving, setSaving] = useState(false)

  const apply = async () => {
    setSaving(true)
    try {
      const updated = await adminSetPlan(user.id, { plan, days: plan === 'free' ? undefined : days })
      onUpdate(updated)
    } catch {
      /* surfaced by parent reload if needed */
    } finally {
      setSaving(false)
    }
  }

  const tone = PLAN_TONE[user.plan] || PLAN_TONE.free
  const planOptions = PLAN_IDS.map(p => <option key={p} value={p}>{p}</option>)

  return (
    <tr style={{ borderTop: '1px solid var(--line)' }}>
      <td style={{ padding: '12px 10px', fontSize: 13, color: 'var(--ink)' }}>
        <div style={{ fontWeight: 500 }}>{user.email}</div>
        <div style={{ fontSize: 11, color: 'var(--mute-2)', fontFamily: 'var(--mono)' }}>{user.id}</div>
      </td>
      <td style={{ padding: '12px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: tone.bg, color: tone.fg }}>
          {user.plan}{user.isComp ? ' · comp' : ''}
        </span>
      </td>
      <td style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--mute)' }}>{fmtDate(user.planExpiresAt)}</td>
      <td style={{ padding: '12px 10px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select className="input" value={plan} onChange={e => setPlan(e.target.value)} style={{ height: 34, padding: '0 8px', fontSize: 12.5 }}>
            {planOptions}
          </select>
          {plan !== 'free' && (
            <input
              className="input" type="number" min={1} max={3650} value={days}
              onChange={e => setDays(parseInt(e.target.value) || 0)}
              title="Days of access"
              style={{ width: 64, height: 34, padding: '0 8px', fontSize: 12.5 }}
            />
          )}
          <button onClick={apply} disabled={saving} className="btn btn-line" style={{ height: 34, padding: '0 12px', fontSize: 12.5 }}>
            {saving ? '…' : 'Apply'}
          </button>
        </div>
      </td>
    </tr>
  )
}
