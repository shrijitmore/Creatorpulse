import React, { useState, useMemo, useRef } from 'react'
import { RefreshCw, TrendingUp, Zap, Filter, Flame } from 'lucide-react'
import TrendCard from '../components/TrendCard.jsx'
import { useTrends } from '../hooks/useTrends.js'
import { NICHES } from '../lib/mockData.js'

const PLATFORMS = [
  { id: 'all', label: 'All' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'reddit', label: 'Reddit' }
]

function SkeletonCard() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        minHeight: '280px'
      }}
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-6 w-16 rounded" />
        </div>
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-8 w-full rounded" />
        <div className="skeleton h-8 w-4/5 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-2 w-full rounded mt-4" />
        <div className="skeleton h-10 w-full rounded mt-2" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      {/* CSS-drawn editorial illustration */}
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(191,255,0,0.06)',
            border: '1px solid rgba(191,255,0,0.15)'
          }}
        >
          <TrendingUp size={32} style={{ color: '#BFFF00', opacity: 0.5 }} />
        </div>
        {/* Decorative rings */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: 'scale(1.3)',
            border: '1px dashed rgba(191,255,0,0.1)'
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            transform: 'scale(1.6)',
            border: '1px dashed rgba(191,255,0,0.06)'
          }}
        />
      </div>
      <h3
        className="font-bebas text-2xl mb-2"
        style={{ color: '#f4f4f5', letterSpacing: '0.05em' }}
      >
        NO TRENDS YET
      </h3>
      <p
        className="text-sm text-center max-w-xs"
        style={{
          color: '#71717a',
          fontFamily: '"Crimson Pro", serif',
          fontStyle: 'italic'
        }}
      >
        Adjust your niche filters or hit refresh to discover new trends
      </p>
    </div>
  )
}

export default function Dashboard() {
  const storedNiches = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trendforge_niches') || '[]')
    } catch {
      return []
    }
  }, [])

  const [selectedNiches, setSelectedNiches] = useState(storedNiches)
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [refreshSpin, setRefreshSpin] = useState(false)
  const refreshRef = useRef(null)

  const platforms = selectedPlatform === 'all' ? [] : [selectedPlatform]

  const { trends, recommendations, loading, refreshing, error, lastUpdated, refresh } = useTrends(
    selectedNiches,
    platforms
  )

  const handleRefresh = () => {
    setRefreshSpin(true)
    refresh()
    setTimeout(() => setRefreshSpin(false), 700)
  }

  const toggleNiche = (nicheId) => {
    setSelectedNiches(prev =>
      prev.includes(nicheId)
        ? prev.filter(id => id !== nicheId)
        : [...prev, nicheId]
    )
  }

  const userNiches = NICHES.filter(n => storedNiches.includes(n.id))

  const isLoading = loading || refreshing

  return (
    <div className="flex gap-6 min-h-full">
      {/* Sidebar filters (left panel) */}
      <aside className="hidden lg:flex flex-col gap-6 w-56 flex-shrink-0">
        {/* Refresh */}
        <div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-mono font-medium uppercase tracking-wider transition-all"
            style={{
              background: 'rgba(191,255,0,0.08)',
              border: '1px solid rgba(191,255,0,0.25)',
              color: '#BFFF00',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw
              size={14}
              className={refreshSpin || refreshing ? 'spin' : ''}
            />
            {refreshing ? 'REFRESHING...' : 'REFRESH'}
          </button>
          {lastUpdated && (
            <p className="text-xs font-mono mt-1.5 text-center" style={{ color: '#3f3f46' }}>
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Niche filters */}
        {userNiches.length > 0 && (
          <div>
            <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
              NICHES
            </p>
            <div className="space-y-1.5">
              {userNiches.map(niche => (
                <label
                  key={niche.id}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all flex-shrink-0"
                    style={{
                      background: selectedNiches.includes(niche.id)
                        ? '#BFFF00'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${selectedNiches.includes(niche.id)
                        ? '#BFFF00'
                        : 'rgba(255,255,255,0.1)'}`
                    }}
                    onClick={() => toggleNiche(niche.id)}
                  >
                    {selectedNiches.includes(niche.id) && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="#08090D">
                        <path d="M1 4l2 2 4-4" stroke="#08090D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm font-mono"
                    style={{
                      color: selectedNiches.includes(niche.id) ? '#f4f4f5' : '#71717a'
                    }}
                    onClick={() => toggleNiche(niche.id)}
                  >
                    {niche.icon} {niche.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Platform filters */}
        <div>
          <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
            PLATFORM
          </p>
          <div className="space-y-1.5">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className="w-full text-left px-3 py-2 rounded text-sm font-mono transition-all"
                style={{
                  background: selectedPlatform === p.id
                    ? 'rgba(0,209,255,0.1)'
                    : 'transparent',
                  border: `1px solid ${selectedPlatform === p.id
                    ? 'rgba(0,209,255,0.3)'
                    : 'transparent'}`,
                  color: selectedPlatform === p.id ? '#00D1FF' : '#71717a'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div
          className="rounded-lg p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
            STATS
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono" style={{ color: '#71717a' }}>TRENDS</span>
              <span className="text-xs font-mono font-bold" style={{ color: '#BFFF00' }}>
                {isLoading ? '—' : trends.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono" style={{ color: '#71717a' }}>VIRAL</span>
              <span className="text-xs font-mono font-bold" style={{ color: '#FF3D71' }}>
                {isLoading ? '—' : trends.filter(t => t.signal === 'viral').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono" style={{ color: '#71717a' }}>RISING</span>
              <span className="text-xs font-mono font-bold" style={{ color: '#00D1FF' }}>
                {isLoading ? '—' : trends.filter(t => t.signal === 'rising').length}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile filters */}
        <div className="lg:hidden mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Filter size={14} style={{ color: '#71717a', flexShrink: 0 }} />
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className="pill-btn flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-mono"
              style={{
                background: selectedPlatform === p.id ? 'rgba(0,209,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${selectedPlatform === p.id ? 'rgba(0,209,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: selectedPlatform === p.id ? '#00D1FF' : '#71717a'
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="pill-btn flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-1"
            style={{
              background: 'rgba(191,255,0,0.08)',
              border: '1px solid rgba(191,255,0,0.2)',
              color: '#BFFF00'
            }}
          >
            <RefreshCw size={11} className={refreshSpin ? 'spin' : ''} />
            REFRESH
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm font-mono"
            style={{
              background: 'rgba(255,61,113,0.08)',
              border: '1px solid rgba(255,61,113,0.2)',
              color: '#FF3D71'
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* AI Picks section */}
        {!isLoading && recommendations.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} style={{ color: '#BFFF00' }} />
              <h2
                className="font-bebas text-2xl tracking-wider"
                style={{ color: '#f4f4f5', letterSpacing: '0.06em' }}
              >
                AI PICKS FOR YOU
              </h2>
              <span
                className="ml-2 px-2 py-0.5 rounded text-xs font-mono"
                style={{
                  background: 'rgba(191,255,0,0.1)',
                  border: '1px solid rgba(191,255,0,0.2)',
                  color: '#BFFF00'
                }}
              >
                TOP {recommendations.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((trend, idx) => (
                <TrendCard
                  key={`rec-${trend.id}`}
                  trend={trend}
                  index={idx}
                  featured
                />
              ))}
            </div>
          </section>
        )}

        {/* All trends */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} style={{ color: '#FF3D71' }} />
            <h2
              className="font-bebas text-2xl tracking-wider"
              style={{ color: '#f4f4f5', letterSpacing: '0.06em' }}
            >
              ALL TRENDS
            </h2>
            {!isLoading && (
              <span className="text-xs font-mono ml-2" style={{ color: '#71717a' }}>
                {trends.length} FOUND
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : trends.length === 0
                ? <EmptyState />
                : trends.map((trend, idx) => (
                    <TrendCard
                      key={trend.id}
                      trend={trend}
                      index={idx}
                    />
                  ))
            }
          </div>
        </section>
      </div>
    </div>
  )
}
