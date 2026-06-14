import React, { useState, useEffect } from 'react'
import { adminListPayments } from '../../lib/api.js'

const TH = { padding: '10px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)' }

function fmt(d) {
  return d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
}

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminListPayments().then(setPayments).catch(() => setPayments([])).finally(() => setLoading(false))
  }, [])

  const rows = payments.map(p => (
    <tr key={p.id} style={{ borderTop: '1px solid var(--line)' }}>
      <td style={{ padding: '10px', fontSize: 12.5 }}>{fmt(p.created_at)}</td>
      <td style={{ padding: '10px', fontSize: 12.5, color: 'var(--ink)' }}>{p.email || p.user_id || '—'}</td>
      <td style={{ padding: '10px', fontSize: 12.5 }}>{p.plan || '—'} · {p.cycle || '—'}</td>
      <td style={{ padding: '10px', fontSize: 12.5 }}>₹{((p.amount || 0) / 100).toLocaleString('en-IN')}</td>
      <td style={{ padding: '10px', fontSize: 12, color: p.status === 'captured' ? 'var(--ink)' : 'var(--mute)' }}>{p.status || '—'}</td>
    </tr>
  ))

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
        <span className="kicker">Recent payments</span>
      </div>
      {loading ? (
        <p style={{ padding: 24, fontSize: 13, color: 'var(--mute)' }}>Loading…</p>
      ) : payments.length === 0 ? (
        <p style={{ padding: 24, fontSize: 13, color: 'var(--mute)' }}>No payments recorded yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr><th style={TH}>When</th><th style={TH}>User</th><th style={TH}>Plan</th><th style={TH}>Amount</th><th style={TH}>Status</th></tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
