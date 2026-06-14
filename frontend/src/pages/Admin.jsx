import React from 'react'
import { Navigate } from 'react-router-dom'
import { useMe } from '../hooks/useMe.js'
import AdminStats from '../features/admin/AdminStats.jsx'
import AdminUsers from '../features/admin/AdminUsers.jsx'
import AdminCoupons from '../features/admin/AdminCoupons.jsx'
import AdminPayments from '../features/admin/AdminPayments.jsx'

export default function Admin() {
  const { me, loading, isAdmin } = useMe()

  if (loading) return <div className="app-main"><p style={{ fontSize: 13, color: 'var(--mute)' }}>Checking access…</p></div>
  if (!me || !isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="app-main">
      <div className="app-top">
        <span className="kicker">Admin</span>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 4 }}>
          Control panel
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1000 }}>
        <AdminStats />
        <AdminUsers />
        <AdminCoupons />
        <AdminPayments />
      </div>
    </div>
  )
}
