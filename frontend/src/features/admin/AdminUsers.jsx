import React, { useState, useEffect, useCallback } from 'react'
import { adminListUsers } from '../../lib/api.js'
import AdminUserRow from './AdminUserRow.jsx'

const TH = { padding: '10px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)' }

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback((q) => {
    setLoading(true)
    adminListUsers(q).then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load('') }, [load])

  const onSearch = (e) => {
    e.preventDefault()
    load(search)
  }

  const onUpdate = (updated) => {
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
  }

  const rows = users.map(u => <AdminUserRow key={u.id} user={u} onUpdate={onUpdate} />)

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="kicker">Users</span>
        <form onSubmit={onSearch} style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <input
            className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search email or id…" style={{ height: 34, width: 220, fontSize: 12.5 }}
          />
          <button type="submit" className="btn btn-line" style={{ height: 34, padding: '0 12px', fontSize: 12.5 }}>Search</button>
        </form>
      </div>

      {loading ? (
        <p style={{ padding: 24, fontSize: 13, color: 'var(--mute)' }}>Loading…</p>
      ) : users.length === 0 ? (
        <p style={{ padding: 24, fontSize: 13, color: 'var(--mute)' }}>No users found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={TH}>User</th>
                <th style={TH}>Plan</th>
                <th style={TH}>Expires</th>
                <th style={TH}>Set plan</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
