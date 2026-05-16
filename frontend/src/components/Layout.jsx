import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { UserButton, useUser, useClerk } from '@clerk/clerk-react'
import { Icon, Wordmark, Logomark, Button, IconButton, Tooltip, Chip, Kbd } from './ui.jsx'
import { getSavedScripts } from '../lib/api.js'

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard',     icon: Icon.Home,     shortcut: 'G D' },
      { to: '/studio',    label: 'Script Studio',  icon: Icon.Studio,   shortcut: 'G S' },
      { to: '/saved',     label: 'Library',        icon: Icon.Bookmark, shortcut: 'G L' },
    ]
  },
  {
    label: 'Account',
    items: [
      { to: '/profile',  label: 'Creator profile', icon: Icon.Profile,  shortcut: 'G P' },
      { to: '/settings', label: 'Settings',         icon: Icon.Settings, shortcut: 'G ,' },
    ]
  },
]

const ROUTE_TITLES = {
  '/dashboard': { kicker: 'Trends',       title: 'Dashboard' },
  '/studio':    { kicker: 'Composition',  title: 'Script studio' },
  '/saved':     { kicker: 'Archive',      title: 'Library' },
  '/profile':   { kicker: 'Identity',     title: 'Creator profile' },
  '/settings':  { kicker: 'Preferences',  title: 'Settings' },
}

// ─── Command Palette ─────────────────────────────────────────────────────────

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

  const go = (path) => { navigate(path); onClose() }

  const groups = [
    { label: 'Go to', items: [
      { label: 'Dashboard',        hint: "Today's trends",   icon: <Icon.Home size={14}/>,     action: () => go('/dashboard') },
      { label: 'Script Studio',    hint: 'Compose a script', icon: <Icon.Studio size={14}/>,   action: () => go('/studio') },
      { label: 'Creator profile',  hint: 'DNA & voice',      icon: <Icon.Profile size={14}/>,  action: () => go('/profile') },
      { label: 'Library',          hint: 'Saved scripts',    icon: <Icon.Bookmark size={14}/>, action: () => go('/saved') },
      { label: 'Settings',         hint: 'Preferences',      icon: <Icon.Settings size={14}/>, action: () => go('/settings') },
    ]},
    { label: 'Actions', items: [
      { label: 'Generate a new script', hint: 'From top trend',     icon: <Icon.Wand size={14}/>,    action: () => go('/studio') },
      { label: 'Refresh the feed',      hint: 'Fetch new signals',  icon: <Icon.Refresh size={14}/>, action: () => go('/dashboard') },
    ]},
  ]

  const f = (s) => s.toLowerCase().includes(q.toLowerCase())
  const filtered = groups.map(g => ({ ...g, items: g.items.filter(i => f(i.label) || f(i.hint)) })).filter(g => g.items.length)

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[14vh] px-4 fade-in"
      style={{ background: 'rgba(26,23,20,0.32)', backdropFilter: 'blur(2px)' }}
      onMouseDown={onClose}>
      <div className="card w-full max-w-[560px] overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
        style={{ animation: 'fadeUp .2s cubic-bezier(.16,1,.3,1) forwards' }}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
          <Icon.Search size={14} className="text-ink3"/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Type a page, command, or trend…"
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-ink3" style={{ border: 'none' }}/>
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13.5px] text-ink3">Nothing matches "{q}".</p>
            </div>
          ) : filtered.map(g => (
            <div key={g.label} className="px-2 pb-2">
              <p className="px-3 pt-2 pb-1 text-[10.5px] uppercase tracking-[0.08em] font-medium text-ink3">{g.label}</p>
              {g.items.map(it => (
                <button key={it.label} onClick={it.action}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-paper2 group">
                  <span className="w-7 h-7 rounded-md bg-paper2 border border-line flex items-center justify-center text-ink2">{it.icon}</span>
                  <span className="flex-1 min-w-0">
                    <p className="text-[13.5px] text-ink truncate">{it.label}</p>
                    <p className="text-[11.5px] text-ink3 truncate">{it.hint}</p>
                  </span>
                  <Icon.Arrow size={12} className="text-ink4 opacity-0 group-hover:opacity-100 transition-opacity"/>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-line bg-paper flex items-center gap-3 text-[11px] text-ink3 font-mono">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
          <span className="flex-1"/>
          <span>Creatorpulse</span>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ profile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [recentScripts, setRecentScripts] = useState([])

  const name = user?.fullName || user?.firstName || profile?.name || 'Creator'
  const email = user?.primaryEmailAddress?.emailAddress || ''
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')

  useEffect(() => {
    getSavedScripts()
      .then(scripts => {
        const list = Array.isArray(scripts) ? scripts : scripts?.data || []
        setRecentScripts(list.slice(0, 3))
      })
      .catch(() => {})
  }, [])

  return (
    <aside className="hidden lg:flex flex-col flex-shrink-0 w-[248px] border-r border-line bg-paper">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 border-b border-line">
        <div className="flex items-center justify-between">
          <Wordmark />
          <IconButton icon={<Icon.ChevD size={13}/>} label="Switch workspace" />
        </div>
        <div className="mt-3 flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-paper2 transition-colors cursor-pointer group"
          onClick={() => navigate('/profile')}>
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{ elements: { avatarBox: 'w-6 h-6 rounded-md' } }}
          />
          <div className="flex-1 min-w-0 text-left" onClick={e => { e.stopPropagation(); navigate('/profile') }}>
            <p className="text-[12.5px] font-medium text-ink truncate">{name}</p>
            <p className="text-[10.5px] text-ink3 truncate">{email || 'Free · Creator'}</p>
          </div>
          <Icon.ChevD size={12} className="text-ink3 group-hover:text-ink"/>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="mb-5">
            <p className="px-2.5 mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.10em] text-ink3">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icn }) => {
                const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                return (
                  <button key={to} data-active={String(active)} onClick={() => navigate(to)} className="side-link w-full">
                    <Icn size={15} stroke={1.7}/>
                    <span className="flex-1">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-line my-3"/>

        {recentScripts.length > 0 && (
          <>
            <p className="px-2.5 mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.10em] text-ink3">Recent</p>
            <div className="space-y-0.5">
              {recentScripts.map(s => (
                <button key={s.id}
                  onClick={() => navigate(`/studio?topicId=${s.topicId || s.id}&title=${encodeURIComponent(s.topicTitle)}&niche=${encodeURIComponent(s.niche || '')}`)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-paper2 transition-colors text-left group">
                  <span className="w-1 h-1 rounded-full bg-ink4 flex-shrink-0"/>
                  <span className="text-[12.5px] text-ink2 truncate group-hover:text-ink">{s.topicTitle}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-line space-y-2">
        <div className="px-2.5 py-2 rounded-md bg-paper2 border border-line">
          <p className="text-[11px] font-medium text-ink mb-0.5">Upgrade to Pro</p>
          <p className="text-[10.5px] text-ink3 leading-snug mb-2">Unlimited scripts, voice training, team workspace.</p>
          <Button variant="primary" size="sm" className="w-full justify-center">Upgrade</Button>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] font-medium transition-colors hover:bg-[#F5DDD2] group"
          style={{ color: 'var(--ink3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink3)'}
        >
          <Icon.Arrow size={14} style={{ transform: 'rotate(180deg)' }}/>
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function Topbar({ onCommand }) {
  const location = useLocation()
  const t = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/dashboard']

  return (
    <header className="h-[56px] flex items-center gap-4 px-6 border-b border-line bg-paper sticky top-0 z-30">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="text-ink3">{t.kicker}</span>
        <Icon.ChevR size={12} className="text-ink4"/>
        <span className="text-ink font-medium">{t.title}</span>
      </div>

      <div className="flex-1"/>

      <button onClick={onCommand} className="topbar-search">
        <Icon.Search size={13}/>
        <span className="flex-1 text-left">Search trends, scripts, settings…</span>
        <span className="flex items-center gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
      </button>

      <div className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-line bg-card">
        <span className="w-1.5 h-1.5 rounded-full bg-successc live-dot"/>
        <span className="text-[11px] font-medium text-ink2">Live</span>
      </div>

      <IconButton icon={<Icon.Help size={15}/>} label="Help"/>
      <div className="lg:hidden">
        <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: 'w-8 h-8' } }}/>
      </div>
    </header>
  )
}

// ─── Layout shell ────────────────────────────────────────────────────────────

export default function Layout({ profile = {} }) {
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar profile={profile}/>
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onCommand={() => setPaletteOpen(true)}/>
        <main className="flex-1 overflow-y-auto"><Outlet/></main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}/>
    </div>
  )
}
