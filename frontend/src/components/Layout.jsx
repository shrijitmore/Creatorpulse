import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { UserButton, useClerk } from '@clerk/clerk-react'
import { useAuth, CLERK_ENABLED } from '../lib/auth.jsx'
import { TrendsProvider } from '../context/TrendsContext.jsx'
import { COLORS } from '../constants/theme.js'
import { useRecentScripts } from '../hooks/useRecentScripts.js'
import { useMe } from '../hooks/useMe.js'
import BrandLogo from './BrandLogo.jsx'
import Seo from './Seo.jsx'
import { getSeo } from '../lib/seo.js'

const NAV = [
  { to: '/dashboard', label: 'Dashboard',      icon: '◈', shortcut: 'G D' },
  { to: '/studio',    label: 'Script Studio',  icon: '✦', shortcut: 'G S' },
  { to: '/saved',     label: 'Library',        icon: '⊟', shortcut: 'G L' },
  { to: '/profile',   label: 'Creator profile', icon: '◎', shortcut: 'G P' },
  { to: '/settings',  label: 'Settings',        icon: '⊕', shortcut: 'G ,' },
]

const ROUTE_TITLES = {
  '/dashboard':     { kicker: 'Trends',      title: 'Dashboard' },
  '/studio':        { kicker: 'Composition', title: 'Script studio' },
  '/saved':         { kicker: 'Archive',     title: 'Library' },
  '/profile':       { kicker: 'Identity',    title: 'Creator profile' },
  '/settings':      { kicker: 'Preferences', title: 'Settings' },
  '/plans':         { kicker: 'Billing',     title: 'Plans & pricing' },
  '/checkout':      { kicker: 'Billing',     title: 'Checkout' },
  '/plans/success': { kicker: 'Billing',     title: 'Upgrade complete' },
  '/admin':         { kicker: 'Admin',       title: 'Control panel' },
}

// ─── Command palette ──────────────────────────────────────────────────────────

function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30) }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (path) => { navigate(path); onClose(); setQ('') }

  const groups = [
    { label: 'Go to', items: [
      { label: 'Dashboard',       hint: "Today's trends",   action: () => go('/dashboard') },
      { label: 'Script Studio',   hint: 'Compose a script', action: () => go('/studio') },
      { label: 'Creator profile', hint: 'DNA & voice',      action: () => go('/profile') },
      { label: 'Library',         hint: 'Saved scripts',    action: () => go('/saved') },
      { label: 'Settings',        hint: 'Preferences',      action: () => go('/settings') },
    ]},
    { label: 'Actions', items: [
      { label: 'Generate a new script', hint: 'From top trend',    action: () => go('/studio') },
      { label: 'Refresh the feed',      hint: 'Fetch new signals', action: () => go('/dashboard') },
    ]},
  ]

  const filtered = groups
    .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.hint.toLowerCase().includes(q.toLowerCase())) }))
    .filter(g => g.items.length)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh', paddingLeft: 16, paddingRight: 16, background: 'rgba(10,10,10,0.28)', backdropFilter: 'blur(2px)' }}
      onMouseDown={onClose}>
      <div
        className="card fade-up"
        style={{ width: '100%', maxWidth: 540, overflow: 'hidden', boxShadow: 'var(--sh-pop)' }}
        onMouseDown={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--mute)', fontSize: 14 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Type a page, command, or trend…"
            style={{ flex: 1, fontSize: 15, background: 'none', border: 'none', outline: 'none', color: 'var(--ink)' }}
          />
          <span className="chip btn-sm" style={{ fontFamily: 'var(--mono)', fontSize: 11, padding: '4px 8px' }}>esc</span>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p className="small">Nothing matches "{q}".</p>
            </div>
          ) : filtered.map(g => (
            <div key={g.label} style={{ padding: '0 8px 8px' }}>
              <p className="label" style={{ padding: '8px 12px 4px', marginBottom: 0 }}>{g.label}</p>
              {g.items.map(it => (
                <button key={it.label} onClick={it.action}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textAlign: 'left', transition: 'background var(--tx-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <span style={{ flex: 1 }}>
                    <p style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{it.label}</p>
                    <p className="small" style={{ marginTop: 1 }}>{it.hint}</p>
                  </span>
                  <span style={{ color: 'var(--mute-2)', fontSize: 12 }}>→</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="small mono" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>↑↓ navigate</span>
          <span className="small mono" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>↵ select</span>
          <span style={{ flex: 1 }}/>
          <span className="small" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>Influensa</span>
        </div>
      </div>
    </div>
  )
}

// ─── Clerk-specific UI components (only rendered inside ClerkProvider) ────────

function ClerkUserBtn() {
  return (
    <UserButton
      afterSignOutUrl="/sign-in"
      appearance={{ elements: { userButtonTrigger: { width: '36px', height: '36px', padding: 0 }, avatarBox: { width: '36px', height: '36px' } } }}
    />
  )
}

function ClerkSignOutBtn() {
  const { signOut } = useClerk()
  return (
    <button
      onClick={() => signOut({ redirectUrl: '/sign-in' })}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 13, color: 'var(--mute)', transition: 'all var(--tx-fast)', width: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${COLORS.error}14`; e.currentTarget.style.color = COLORS.error }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--mute)' }}>
      <span>↩</span>
      <span className="side-label">Sign out</span>
    </button>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ onCommand, open, onClose, sideRef }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const name = user?.fullName || user?.firstName || 'Creator'
  const email = user?.primaryEmailAddress?.emailAddress || ''

  const recentScripts = useRecentScripts(3)
  const { isAdmin } = useMe()
  const navItems = isAdmin ? [...NAV, { to: '/admin', label: 'Admin', icon: '⚑' }] : NAV

  const go = (path) => { navigate(path); onClose?.() }

  return (
    <aside
      ref={sideRef}
      id="app-sidebar"
      aria-label="Main navigation"
      className={`side ${open ? 'mob-open' : ''}`}>
      {/* Brand */}
      <BrandLogo height={24} />

      {/* Navigation */}
      <nav className="side-nav">
        {navItems.map(({ to, label, icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <button
              key={to}
              className={`side-link ${active ? 'on' : ''}`}
              onClick={() => go(to)}>
              <span className="ic">{icon}</span>
              <span className="side-label">{label}</span>
            </button>
          )
        })}

        <div className="hr" style={{ margin: '12px 0' }}/>

        {/* Quick action */}
        <button className="side-link" onClick={() => { onCommand(); onClose?.() }}>
          <span className="ic">⌕</span>
          <span className="side-label" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            Search
            <span className="chip" style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', fontFamily: 'var(--mono)' }}>⌘K</span>
          </span>
        </button>

        {recentScripts.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ padding: '0 10px', marginBottom: 2, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--mute-2)' }}>Recent</p>
            {recentScripts.map(s => (
              <button
                key={s.id}
                title={s.topicTitle}
                onClick={() => go(`/studio?topicId=${s.topicId || s.id}&title=${encodeURIComponent(s.topicTitle)}&niche=${encodeURIComponent(s.niche || '')}`)}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.color = 'var(--ink)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)' }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontFamily: 'var(--sans)', fontSize: 12.5, textAlign: 'left', transition: 'background 0.18s, color 0.18s', overflow: 'hidden' }}>
                <span style={{ width: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--line)', display: 'block', flexShrink: 0 }}/>
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.topicTitle}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="side-foot">
        {/* Upgrade block */}
        <div className="side-up">
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Upgrade to Pro</p>
          <p className="small" style={{ marginBottom: 12 }}>Unlimited scripts, voice training, team workspace.</p>
          <div className="side-bar"><i style={{ width: '20%' }}/></div>
          <p className="small" style={{ marginTop: 6 }}>1 of 5 scripts used</p>
          <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>Upgrade</button>
        </div>

        {/* User */}
        <div className="side-user" onClick={() => go('/profile')} style={{ cursor: 'pointer' }}>
          <div className="avatar">
            {CLERK_ENABLED
              ? <ClerkUserBtn/>
              : <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', userSelect: 'none' }}>{name.charAt(0)}</span>
            }
          </div>
          <span style={{ flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            <p className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email || 'Free · Creator'}</p>
          </span>
        </div>

        {CLERK_ENABLED
          ? <ClerkSignOutBtn/>
          : (
            <button
              onClick={() => navigate('/sign-in')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, fontSize: 13, color: 'var(--mute)', transition: 'all var(--tx-fast)', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${COLORS.error}14`; e.currentTarget.style.color = COLORS.error }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--mute)' }}>
              <span>↩</span>
              <span className="side-label">Sign out</span>
            </button>
          )
        }
      </div>
    </aside>
  )
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({ onCommand, onMenu, menuRef, sideOpen }) {
  const location = useLocation()
  const t = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/dashboard']

  return (
    <header style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', position: 'sticky', top: 0, zIndex: 30 }}>
      {/* Hamburger — visible only on mobile via CSS */}
      <button
        ref={menuRef}
        className="mob-menu-btn"
        onClick={onMenu}
        aria-label={sideOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sideOpen}
        aria-controls="app-sidebar"
      >☰</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexShrink: 0 }}>
        <span style={{ color: 'var(--mute)' }}>{t.kicker}</span>
        <span style={{ color: 'var(--mute-2)' }}>›</span>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{t.title}</span>
      </div>
      <div style={{ flex: 1 }}/>
      <button
        className="topbar-search"
        onClick={onCommand}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', fontSize: 13, color: 'var(--mute)', cursor: 'pointer' }}>
        <span>⌕</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Search trends, scripts…</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>⌘K</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', flexShrink: 0 }}>
        <span className="status" style={{ fontSize: 0 }}/>{/* uses status::before for dot */}
        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>LIVE</span>
      </div>
    </header>
  )
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sideOpen, setSideOpen] = useState(false)
  const hamburgerRef = useRef(null)
  const sideRef = useRef(null)
  const location = useLocation()

  // Scroll-lock body when mobile drawer is open
  useEffect(() => {
    if (sideOpen) document.body.classList.add('sidebar-open')
    else document.body.classList.remove('sidebar-open')
    return () => document.body.classList.remove('sidebar-open')
  }, [sideOpen])

  // Move focus into sidebar on open; return it to hamburger on Escape
  useEffect(() => {
    if (sideOpen) {
      const first = sideRef.current?.querySelector('a, button, [tabindex]:not([tabindex="-1"])')
      first?.focus()
    }
  }, [sideOpen])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
      if (e.key === 'Escape') {
        setSideOpen(false)
        hamburgerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const closeSidebar = useCallback(() => {
    setSideOpen(false)
    hamburgerRef.current?.focus()
  }, [])

  return (
    <TrendsProvider>
      <Seo {...getSeo(location.pathname)} />
      <div className="app-shell">
        <Sidebar
          onCommand={() => setPaletteOpen(true)}
          open={sideOpen}
          onClose={closeSidebar}
          sideRef={sideRef}
        />
        {/* Overlay backdrop — only renders on mobile when drawer is open */}
        {sideOpen && (
          <div
            className="sidebar-overlay active"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
          <Topbar
            onCommand={() => setPaletteOpen(true)}
            onMenu={() => setSideOpen(v => !v)}
            menuRef={hamburgerRef}
            sideOpen={sideOpen}
          />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet/>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}/>
      </div>
    </TrendsProvider>
  )
}
