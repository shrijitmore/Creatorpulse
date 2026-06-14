import React, { useState, useEffect } from 'react'
import { PLANS } from '../../constants/plans.js'
import { adminListCoupons, adminCreateCoupon, adminToggleCoupon } from '../../lib/api.js'

const PAID_PLANS = PLANS.filter(p => p.id !== 'free')
const TH = { padding: '10px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)' }

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState({ code: '', plan: 'pro', durationDays: 30, maxRedemptions: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => adminListCoupons().then(setCoupons).catch(() => setCoupons([]))
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) return
    setSaving(true)
    setError('')
    try {
      await adminCreateCoupon({
        code: form.code.trim().toUpperCase(),
        plan: form.plan,
        durationDays: Number(form.durationDays) || 30,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      })
      setForm({ code: '', plan: 'pro', durationDays: 30, maxRedemptions: '' })
      load()
    } catch {
      setError('Could not create code. Use A–Z, 0–9 and _ only.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (c) => {
    await adminToggleCoupon(c.code, !c.active).catch(() => {})
    load()
  }

  const planOptions = PAID_PLANS.map(p => <option key={p.id} value={p.id}>{p.id}</option>)

  const rows = coupons.map(c => (
    <tr key={c.code} style={{ borderTop: '1px solid var(--line)' }}>
      <td style={{ padding: '10px', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{c.code}</td>
      <td style={{ padding: '10px', fontSize: 12.5 }}>{c.plan}</td>
      <td style={{ padding: '10px', fontSize: 12.5 }}>{c.duration_days}d</td>
      <td style={{ padding: '10px', fontSize: 12.5, color: 'var(--mute)' }}>
        {c.redemptions}{c.max_redemptions != null ? ` / ${c.max_redemptions}` : ''}
      </td>
      <td style={{ padding: '10px' }}>
        <button onClick={() => toggle(c)} className="btn btn-line" style={{ height: 30, padding: '0 10px', fontSize: 12 }}>
          {c.active ? 'Active' : 'Disabled'}
        </button>
      </td>
    </tr>
  ))

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <span className="kicker">Access codes</span>
      </div>

      <form onSubmit={create} style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid var(--line)' }}>
        <div>
          <label className="label">Code</label>
          <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FREEPRO" style={{ height: 36, width: 140, fontSize: 13 }} />
        </div>
        <div>
          <label className="label">Plan</label>
          <select className="input" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} style={{ height: 36, fontSize: 13 }}>{planOptions}</select>
        </div>
        <div>
          <label className="label">Days</label>
          <input className="input" type="number" min={1} value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} style={{ height: 36, width: 80, fontSize: 13 }} />
        </div>
        <div>
          <label className="label">Max uses</label>
          <input className="input" type="number" min={1} value={form.maxRedemptions} onChange={e => setForm({ ...form, maxRedemptions: e.target.value })} placeholder="∞" style={{ height: 36, width: 80, fontSize: 13 }} />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ height: 36, padding: '0 16px', fontSize: 13 }}>
          {saving ? '…' : 'Create'}
        </button>
        {error && <p style={{ fontSize: 12, color: 'var(--errorc, #c0392b)', flexBasis: '100%' }}>{error}</p>}
      </form>

      {coupons.length === 0 ? (
        <p style={{ padding: 24, fontSize: 13, color: 'var(--mute)' }}>No codes yet. Create one above to grant free access.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                <th style={TH}>Code</th><th style={TH}>Plan</th><th style={TH}>Duration</th><th style={TH}>Used</th><th style={TH}>Status</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
