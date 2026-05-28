import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTrendsContext } from '../context/TrendsContext.jsx'
import { getProfile } from '../lib/api.js'
import { NICHES } from '../lib/mockData.js'

const PLATFORM_OPTS = [
  { id: 'all', label: 'All' }, { id: 'instagram', label: 'Instagram' },
  { id: 'reddit', label: 'Reddit' }, { id: 'youtube', label: 'YouTube' },
]
const SIGNAL_OPTS = [
  { id: 'all', label: 'All' }, { id: 'viral', label: 'Viral' },
  { id: 'rising', label: 'Rising' }, { id: 'new', label: 'New' },
]
const FETCH_STEPS = [
  { id: 'reddit',    label: 'Scanning Reddit',        duration: 8000  },
  { id: 'youtube',   label: 'Pulling YouTube trends', duration: 10000 },
  { id: 'instagram', label: 'Reading Instagram',      duration: 10000 },
  { id: 'ai',        label: 'AI ranking signals',     duration: 99999 },
]

function signalColor(signal) {
  if (signal === 'viral')  return '#E23B3B'
  if (signal === 'rising') return 'var(--pulse)'
  return '#8B6FDE'
}

function Sparkline({ signal, score }) {
  const pts = []
  const bias = signal === 'viral' ? 1.0 : signal === 'rising' ? 0.55 : 0.15
  for (let i = 0; i <= 12; i++) {
    const s = Math.sin(score * 13 + i * 7.13) * 1000
    const n = s - Math.floor(s)
    const v = 20 - (n * 8 + (i / 12) * bias * 14)
    pts.push(`${i * 7},${Math.max(1, Math.min(28, v))}`)
  }
  return (
    <svg width="84" height="30" viewBox="0 0 84 30" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={signalColor(signal)} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Trend card ───────────────────────────────────────────────────────────────

function TrendCard({ t, index = 0 }) {
  const navigate = useNavigate()
  const handleGenerate = () => {
    navigate(`/studio?topicId=${t.id}&title=${encodeURIComponent(t.title)}&niche=${encodeURIComponent(t.niche || '')}`)
  }
  const velLabel = t.signal === 'viral' ? '+↑ viral' : t.signal === 'rising' ? '↑ rising' : '↗ new'

  return (
    <article className="trend-card fade-up" style={{ animationDelay: `${index * 40}ms` }} onClick={handleGenerate}>
      <div className="tc-top">
        <div>
          <span className="tc-rank">{t.platform?.toUpperCase()} · {t.niche?.toUpperCase()}</span>
          <p className="tc-title" style={{ marginTop: 8 }}>{t.title}</p>
        </div>
        <span className={`tc-vel ${t.signal === 'viral' || t.signal === 'rising' ? 'up' : ''}`}>{velLabel}</span>
      </div>
      {t.summary && (
        <p className="body" style={{ fontSize: 13.5, marginTop: 4 }}>{t.summary}</p>
      )}
      <div className="tc-spark">
        <Sparkline signal={t.signal} score={t.score || 70}/>
      </div>
      <div className="tc-foot">
        <div className="tc-src">
          {(t.sources || []).slice(0, 2).map(s => <span key={s} className="s">{s}</span>)}
          {t.age && <span className="s">{t.age}</span>}
        </div>
        <span className="tc-cta">Forge script →</span>
      </div>
    </article>
  )
}

// ─── Summary tile ─────────────────────────────────────────────────────────────

function SumCard({ label, value, sub, trend }) {
  return (
    <div className="sum-card">
      <div>
        <span className="label">{label}</span>
        <p style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1, marginTop: 6 }}>{value}</p>
      </div>
      <p className="small" style={{ marginTop: 8 }}>{sub}</p>
    </div>
  )
}

// ─── Creator brief ────────────────────────────────────────────────────────────

function CreatorBrief({ apiProfile, stats }) {
  const navigate = useNavigate()
  const { user } = useUser()
  const storedProfile = useMemo(() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } }, [])
  const name = user?.fullName || user?.firstName || apiProfile?.creatorName || storedProfile.name || 'Creator'
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const voiceLabel = apiProfile?.contentStyles?.[0] || storedProfile.styles?.split(' + ')[0] || 'Storytelling'
  const goalLabel = apiProfile?.primaryGoal || storedProfile.goal || 'Grow audience'

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
          {[
            { lbl: 'Voice', val: voiceLabel },
            { lbl: 'Goal', val: goalLabel },
            stats?.totalScripts != null && { lbl: 'Scripts', val: stats.totalScripts },
          ].filter(Boolean).map(c => (
            <span key={c.lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', border: '1px solid var(--line)', borderRadius: 999, fontSize: 12 }}>
              <span className="small" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>{c.lbl}</span>
              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{c.val}</span>
            </span>
          ))}
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')} style={{ flexShrink: 0 }}>Edit profile</button>
    </div>
  )
}

// ─── Idle phase ───────────────────────────────────────────────────────────────

function IdlePhase({ selectedNiches, onToggleNiche, onFetch }) {
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
      <span className="kicker" style={{ justifyContent: 'center', marginBottom: 12 }}>{todayStr}</span>
      <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
        What's moving today?
      </h1>
      <p className="body" style={{ textAlign: 'center', maxWidth: 440, marginBottom: 40 }}>
        Pick your niches and we'll scan Reddit, YouTube, and Instagram for the best signals, summarised and ranked just for you.
      </p>
      <div className="card" style={{ width: '100%', maxWidth: 580 }}>
        <span className="label" style={{ marginBottom: 12 }}>Select niches</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {NICHES.map(n => (
            <button
              key={n.id}
              className={`chip ${selectedNiches.includes(n.id) ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onToggleNiche(n.id)}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <span className="small">
            {selectedNiches.length === 0 ? 'Select at least one niche' : `${selectedNiches.length} niche${selectedNiches.length > 1 ? 's' : ''} · ~30 sec fetch`}
          </span>
          <button className="btn btn-primary" disabled={selectedNiches.length === 0} onClick={onFetch}>
            Get my feed →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Loading phase ────────────────────────────────────────────────────────────

function LoadingPhase({ selectedNiches }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(Date.now())
  const TOTAL_MS = 36000

  useEffect(() => {
    const advanceStep = (idx) => {
      if (idx >= FETCH_STEPS.length - 1) return
      const timer = setTimeout(() => {
        setStepIdx(idx + 1)
        advanceStep(idx + 1)
      }, FETCH_STEPS[idx].duration)
      return timer
    }
    const timer = advanceStep(0)
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      setProgress(Math.min(90, (elapsed / TOTAL_MS) * 100))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current) }
  }, [])

  const nicheLabels = selectedNiches.map(id => NICHES.find(n => n.id === id)?.label).filter(Boolean)

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 32 }}>
        <span className="label" style={{ marginBottom: 6 }}>Fetching live signals</span>
        <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 4 }}>Finding your best content…</h2>
        <p className="small" style={{ marginBottom: 20 }}>{nicheLabels.join(' · ')}</p>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'var(--ink)', transition: 'width .5s ease-out', width: `${progress}%` }}/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FETCH_STEPS.map((step, i) => {
            const done = i < stepIdx; const current = i === stepIdx
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {done
                    ? <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span>
                    : current
                    ? <span style={{ display: 'flex', gap: 2 }}><span className="tdot"/><span className="tdot"/><span className="tdot"/></span>
                    : <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper-3)' }}/>}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: done || current ? 500 : 400, color: done ? 'var(--mute)' : current ? 'var(--ink)' : 'var(--mute-2)', textDecoration: done ? 'line-through' : 'none' }}>{step.label}</span>
                {done && <span className="small mono" style={{ marginLeft: 'auto' }}>done</span>}
              </div>
            )
          })}
        </div>
        <p className="small" style={{ textAlign: 'center', marginTop: 24 }}>Scanning across communities. About 30–40 seconds.</p>
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { phase, selectedNiches, allTrends, lastUpdated, refreshing, fetchNow, refresh, toggleNiche } = useTrendsContext()
  const [platform, setPlatform] = useState('all')
  const [signal, setSignal] = useState('all')
  const [apiProfile, setApiProfile] = useState(null)
  const [profileStats, setProfileStats] = useState(null)

  useEffect(() => {
    getProfile()
      .then(d => { setApiProfile(d.profile); setProfileStats(d.stats) })
      .catch(() => {})
  }, [])

  const handleFetch = useCallback(() => fetchNow(selectedNiches), [selectedNiches, fetchNow])
  const handleRefresh = useCallback(() => refresh(selectedNiches), [selectedNiches, refresh])

  const filtered = useMemo(() => {
    let list = [...allTrends]
    if (selectedNiches.length > 0) list = list.filter(t => selectedNiches.includes(t.niche))
    if (platform !== 'all') list = list.filter(t => t.platform === platform)
    if (signal !== 'all') list = list.filter(t => t.signal === signal)
    return list
  }, [allTrends, selectedNiches, platform, signal])

  const recommendations = useMemo(() => {
    const byPlatform = {}
    for (const t of allTrends) {
      if (!selectedNiches.includes(t.niche)) continue
      if (!byPlatform[t.platform]) byPlatform[t.platform] = []
      byPlatform[t.platform].push(t)
    }
    for (const p in byPlatform) byPlatform[p].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const picks = []
    for (const p of ['instagram', 'youtube', 'reddit']) {
      if (byPlatform[p]) picks.push(...byPlatform[p].slice(0, 2))
    }
    if (picks.length < 4) {
      const seen = new Set(picks.map(p => p.id))
      picks.push(...allTrends.filter(t => !seen.has(t.id)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 6 - picks.length))
    }
    return picks.slice(0, 6)
  }, [allTrends, selectedNiches])

  if (phase === 'idle') {
    return (
      <div className="app-main">
        <div style={{ marginBottom: 20 }}><CreatorBrief apiProfile={apiProfile} stats={profileStats}/></div>
        <IdlePhase selectedNiches={selectedNiches} onToggleNiche={toggleNiche} onFetch={handleFetch}/>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="app-main">
        <LoadingPhase selectedNiches={selectedNiches}/>
      </div>
    )
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="app-main">
      {/* Header */}
      <div className="app-top">
        <div>
          <span className="kicker">{todayStr} · {selectedNiches.length * 2} communities</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>What's moving today</h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button
            className="btn btn-line btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ gap: 8 }}>
            {refreshing ? <><span className="tdot"/> Syncing…</> : '↻ Refresh'}
          </button>
          {lastUpdated && (
            <span className="small mono">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      </div>

      {/* Creator brief */}
      <div style={{ marginBottom: 20 }}>
        <CreatorBrief apiProfile={apiProfile} stats={profileStats}/>
      </div>

      {/* Summary tiles */}
      <div className="dash-sum" style={{ marginBottom: 24 }}>
        <SumCard label="Total signals" value={allTrends.length} sub="Across all platforms"/>
        <SumCard label="Viral" value={allTrends.filter(t => t.signal === 'viral').length} sub="Breaking now"/>
        <SumCard label="Rising" value={allTrends.filter(t => t.signal === 'rising').length} sub="Gaining momentum"/>
        <SumCard label="Niches watched" value={selectedNiches.length} sub="Active communities"/>
      </div>

      {/* Filters */}
      <div className="app-filters">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span className="label" style={{ marginBottom: 0, marginRight: 4 }}>Niches</span>
          {NICHES.map(n => (
            <button
              key={n.id}
              className={`chip ${selectedNiches.includes(n.id) ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleNiche(n.id)}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="input"
            style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            {PLATFORM_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <select
            value={signal}
            onChange={e => setSignal(e.target.value)}
            className="input"
            style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            {SIGNAL_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Editor's picks */}
      {recommendations.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <span className="kicker">Editor's picks</span>
            <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginTop: 4 }}>
              Two from each platform
            </h2>
          </div>
          <div className="trend-grid" style={{ marginBottom: 36 }}>
            {recommendations.slice(0, 3).map((t, i) => <TrendCard key={`rec-${t.id}`} t={t} index={i}/>)}
          </div>
        </>
      )}

      {/* All trends */}
      <div style={{ marginBottom: 16 }}>
        <span className="kicker">The feed</span>
        <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginTop: 4 }}>
          {filtered.length} signals across your niches
        </h2>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '56px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Nothing matches those filters</p>
          <p className="body">Loosen a filter or add a niche to see more trends.</p>
        </div>
      ) : (
        <div className="trend-grid">
          {filtered.map((t, i) => <TrendCard key={t.id} t={t} index={i}/>)}
        </div>
      )}

      <div style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="small mono">Creatorpulse · {filtered.length} signals · synced {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        <span className="small">You've seen {filtered.length} signals today</span>
      </div>
    </div>
  )
}
