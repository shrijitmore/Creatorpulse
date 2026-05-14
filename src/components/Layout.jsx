import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Clapperboard,
  BookMarked,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/studio', label: 'Script Studio', icon: Clapperboard },
  { to: '/saved', label: 'Saved Scripts', icon: BookMarked },
  { to: '/settings', label: 'Settings', icon: Settings }
]

const BREADCRUMB_MAP = {
  '/dashboard': 'Dashboard',
  '/studio': 'Script Studio',
  '/saved': 'Saved Scripts',
  '/settings': 'Settings'
}

export default function Layout({ children, nopadding = false }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const currentPage = BREADCRUMB_MAP[location.pathname] || 'TrendForge'

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile sidebar on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (mobileOpen && !e.target.closest('#sidebar') && !e.target.closest('#menu-btn')) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen" style={{ background: '#08090D' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`
          fixed lg:relative z-50 lg:z-auto
          flex flex-col
          h-screen
          border-r
          sidebar-transition
          ${collapsed ? 'w-[60px]' : 'w-[240px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'rgba(8,9,13,0.95)',
          borderColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-16 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded font-bebas text-lg font-bold flex-shrink-0"
            style={{ background: '#BFFF00', color: '#08090D' }}
          >
            TF
          </div>
          {!collapsed && (
            <span
              className="font-bebas text-xl tracking-widest"
              style={{ color: '#BFFF00', letterSpacing: '0.1em' }}
            >
              TRENDFORGE
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150
                ${isActive
                  ? 'text-[#08090D]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              style={({ isActive }) => isActive ? {
                background: '#BFFF00',
                color: '#08090D'
              } : {}}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium font-mono">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: User + Collapse */}
        <div
          className="border-t flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {/* User area */}
          {!collapsed && (
            <div className="px-4 py-3 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #BFFF00, #00D1FF)', color: '#08090D' }}
              >
                A
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate font-mono">Alex</p>
                <p className="text-xs truncate" style={{ color: '#71717a' }}>alex@creator.co</p>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center py-3 transition-colors"
            style={{ color: '#71717a' }}
            onMouseEnter={e => e.currentTarget.style.color = '#BFFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 h-16 px-4 lg:px-6 border-b flex-shrink-0 sticky top-0 z-30"
          style={{
            background: 'rgba(8,9,13,0.9)',
            borderColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Mobile menu button */}
          <button
            id="menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 rounded"
            style={{ color: '#a1a1aa' }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono" style={{ color: '#71717a' }}>
              TRENDFORGE
            </span>
            <span style={{ color: '#3f3f46' }}>/</span>
            <span
              className="text-sm font-mono font-medium truncate"
              style={{ color: '#BFFF00' }}
            >
              {currentPage.toUpperCase()}
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Live badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono"
            style={{
              background: 'rgba(191,255,0,0.08)',
              border: '1px solid rgba(191,255,0,0.2)',
              color: '#BFFF00'
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full badge-pulse"
              style={{ background: '#BFFF00' }}
            />
            LIVE DATA
          </div>

          {/* Notifications / Quick action */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono cursor-pointer transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#a1a1aa'
            }}
          >
            <Zap size={12} style={{ color: '#BFFF00' }} />
            <span className="hidden sm:inline">FORGE MODE</span>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 ${nopadding ? '' : 'p-4 lg:p-6'} overflow-auto`}>
          {children}
        </main>
      </div>
    </div>
  )
}
