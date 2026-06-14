import React, { useState, useEffect } from 'react'
import { adminGetStats } from '../../lib/api.js'

const CARD = {
  border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', background: 'var(--paper)',
}
const NUM = { fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }
const LBL = { fontSize: 12, color: 'var(--mute)', marginTop: 4 }

export default function AdminStats() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminGetStats().then(setStats).catch(() => setError('Failed to load stats'))
  }, [])

  if (error) return <p style={{ fontSize: 13, color: 'var(--mute)' }}>{error}</p>
  if (!stats) return <p style={{ fontSize: 13, color: 'var(--mute)' }}>Loading…</p>

  const cards = [
    { n: stats.totalUsers, l: 'Total users' },
    { n: stats.paidUsers, l: 'Paid users' },
    { n: `₹${(stats.revenue || 0).toLocaleString('en-IN')}`, l: 'Revenue (captured)' },
    { n: stats.totalScripts, l: 'Scripts generated' },
  ].map(c => (
    <div key={c.l} style={CARD}>
      <div style={NUM}>{c.n}</div>
      <div style={LBL}>{c.l}</div>
    </div>
  ))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {cards}
    </div>
  )
}
