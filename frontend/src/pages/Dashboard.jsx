import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTrends } from '../features/dashboard/hooks/useTrends.js'
import { getProfile } from '../lib/api.js'
import { getNiche } from '../constants/niches.js'
import NichePicker from '../features/dashboard/components/NichePicker.jsx'

const PLATFORM_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'reddit', label: 'Reddit' }, { id: 'youtube', label: 'YouTube' },
]
const SIGNAL_OPTS = [
  { id: 'all', label: 'All' }, { id: 'viral', label: 'Viral' },
  { id: 'rising', label: 'Rising' }, { id: 'new', label: 'New' },
]
const FETCH_STEPS = [
  { id: 'reddit',    label: 'Scanning Reddit',         duration: 8000  },
  { id: 'youtube',   label: 'Pulling YouTube trends',  duration: 10000 },
  { id: 'ai',        label: 'AI ranking signals',      duration: 99999 },
]
const SIGNAL_COLORS = { viral: '#E23B3B', rising: 'var(--pulse)', new: '#8B6FDE' }

function signalColor(signal) {
  return SIGNAL_COLORS[signal] || SIGNAL_COLORS.new
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

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

function SumCard({ label, value, sub }) {
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
  const storedProfile = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} }
  }, [])
  const name = user?.fullName || user?.firstName || apiProfile?.creatorName || storedProfile.name || 'Creator'
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')
  const voiceLabel = apiProfile?.contentStyles?.[0] || storedProfile.styles?.split(' + ')[0] || 'Storytelling'
  const goalLabel = apiProfile?.primaryGoal || storedProfile.goal || 'Grow audience'

  const chips = [
    { lbl: 'Voice', val: voiceLabel },
    { lbl: 'Goal', val: goalLabel },
    stats?.totalScripts != null && { lbl: 'Scripts', val: stats.totalScripts },
  ].filter(Boolean)

  const chipEls = chips.map(c => (
    <span key={c.lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', border: '1px solid var(--line)', borderRadius: 999, fontSize: 12 }}>
      <span className="small" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>{c.lbl}</span>
      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{c.val}</span>
    </span>
  ))

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
          {chipEls}
        </div>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')} style={{ flexShrink: 0 }}>Edit profile</button>
    </div>
  )
}

// ─── Idle phase ───────────────────────────────────────────────────────────────

function IdlePhase({ onSelect }) {
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <div className="fade-up" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center', padding: '40px 16px 36px' }}>
        <span className="kicker" style={{ justifyContent: 'center', marginBottom: 10 }}>{todayStr}</span>
        <h1 style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--ink)', marginBottom: 10 }}>
          What's your niche?
        </h1>
        <p className="body" style={{ maxWidth: 440, margin: '0 auto' }}>
          Pick from 70+ presets or describe your own — AI will find the right signals for you.
        </p>
      </div>
      <NichePicker onSelect={onSelect}/>
    </div>
  )
}

// ─── Loading phase ────────────────────────────────────────────────────────────

function LoadingPhase({ nicheLabel }) {
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

  const stepItems = FETCH_STEPS.map((step, i) => {
    const done = i < stepIdx
    const current = i === stepIdx
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
  })

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 32 }}>
        <span className="label" style={{ marginBottom: 6 }}>Fetching live signals</span>
        <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 4 }}>Finding your best content…</h2>
        <p className="small" style={{ marginBottom: 20 }}>{nicheLabel}</p>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'var(--ink)', transition: 'width .5s ease-out', width: `${progress}%` }}/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stepItems}
        </div>
        <p className="small" style={{ textAlign: 'center', marginTop: 24 }}>Scanning across communities. About 30–40 seconds.</p>
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const storedNicheRaw = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('trendforge_active_niche') || 'null') } catch { return null }
  }, [])

  const [phase, setPhase] = useState('idle')
  const [activeNiche, setActiveNiche] = useState(storedNicheRaw)
  const [platform, setPlatform] = useState('all')
  const [signal, setSignal] = useState('all')
  const [apiProfile, setApiProfile] = useState(null)
  const [profileStats, setProfileStats] = useState(null)

  useEffect(() => {
    getProfile()
      .then(d => { setApiProfile(d.profile); setProfileStats(d.stats) })
      .catch(() => {})
  }, [])

  const nicheIds = useMemo(() => activeNiche ? [activeNiche.nicheId] : [], [activeNiche])

  const { allTrends, refreshing, lastUpdated, fetchNow, refresh } = useTrends(nicheIds, { lazy: true })

  const handleNicheSelect = useCallback(async (niche) => {
    setActiveNiche(niche)
    localStorage.setItem('trendforge_active_niche', JSON.stringify(niche))
    setPhase('loading')
    try {
      await fetchNow([niche.nicheId])
      setPhase('ready')
    } catch {
      setPhase('idle')
    }
  }, [fetchNow])

  const handleRefresh = useCallback(() => {
    refresh(nicheIds).catch(() => {})
  }, [nicheIds, refresh])

  const handleChangeNiche = useCallback(() => {
    setPhase('idle')
    setActiveNiche(null)
    localStorage.removeItem('trendforge_active_niche')
  }, [])

  const filtered = useMemo(() => {
    let list = [...allTrends]
    if (platform !== 'all') list = list.filter(t => t.platform === platform)
    if (signal !== 'all') list = list.filter(t => t.signal === signal)
    return list
  }, [allTrends, platform, signal])

  const topPicks = useMemo(() => {
    const byPlatform = {}
    for (const t of allTrends) {
      if (!byPlatform[t.platform]) byPlatform[t.platform] = []
      byPlatform[t.platform].push(t)
    }
    for (const p in byPlatform) byPlatform[p].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const picks = []
    for (const p of ['youtube', 'reddit']) {
      if (byPlatform[p]) picks.push(...byPlatform[p].slice(0, 2))
    }
    return picks.slice(0, 6)
  }, [allTrends])

  const nichePreset = activeNiche ? getNiche(activeNiche.nicheId) : null
  const nicheLabel = activeNiche?.nicheLabel || nichePreset?.label || activeNiche?.nicheId || ''
  const nicheIcon  = nichePreset?.icon || ''

  if (phase === 'idle') {
    return (
      <div className="app-main">
        <div style={{ marginBottom: 20 }}><CreatorBrief apiProfile={apiProfile} stats={profileStats}/></div>
        <IdlePhase onSelect={handleNicheSelect}/>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="app-main">
        <LoadingPhase nicheLabel={nicheLabel}/>
      </div>
    )
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const platformOptions = PLATFORM_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)
  const signalOptions   = SIGNAL_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)
  const trendCards      = filtered.map((t, i) => <TrendCard key={t.id} t={t} index={i}/>)
  const topPickCards    = topPicks.slice(0, 3).map((t, i) => <TrendCard key={`rec-${t.id}`} t={t} index={i}/>)

  return (
    <div className="app-main">
      {/* Header */}
      <div className="app-top">
        <div>
          <span className="kicker">{todayStr}</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>
            {nicheIcon && <span style={{ marginRight: 8 }}>{nicheIcon}</span>}
            {nicheLabel}
          </h1>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleChangeNiche}>
            ← Change niche
          </button>
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
        <SumCard label="Avg score" value={allTrends.length ? Math.round(allTrends.reduce((s, t) => s + (t.score || 0), 0) / allTrends.length) : '—'} sub="Signal strength"/>
      </div>

      {/* Filters */}
      <div className="app-filters">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="label" style={{ marginBottom: 0 }}>Platform</span>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="input" style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            {platformOptions}
          </select>
          <span className="label" style={{ marginBottom: 0, marginLeft: 8 }}>Signal</span>
          <select value={signal} onChange={e => setSignal(e.target.value)} className="input" style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            {signalOptions}
          </select>
        </div>
        <span className="small">{filtered.length} signal{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Top picks */}
      {topPicks.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <span className="kicker">Top picks</span>
            <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginTop: 4 }}>
              Best from each platform
            </h2>
          </div>
          <div className="trend-grid" style={{ marginBottom: 36 }}>
            {topPickCards}
          </div>
        </>
      )}

      {/* All trends */}
      <div style={{ marginBottom: 16 }}>
        <span className="kicker">The feed</span>
        <h2 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginTop: 4 }}>
          {filtered.length} signals in {nicheLabel}
        </h2>
      </div>

      {allTrends.length === 0 ? (
        <div className="card" style={{ padding: '52px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 24, marginBottom: 12 }}>📡</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>No signals found for {nicheLabel}</p>
          <p className="body" style={{ marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
            Scrapers may still be warming up, or API credentials need setup. Try refreshing.
          </p>
          <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <><span className="tdot"/><span className="tdot"/><span className="tdot"/></> : '↻ Try again'}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '52px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>Nothing matches those filters</p>
          <p className="body">Try a different platform or signal filter.</p>
        </div>
      ) : (
        <div className="trend-grid">
          {trendCards}
        </div>
      )}

      <div style={{ marginTop: 56, paddingTop: 20, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="small mono">Creatorpulse · {filtered.length} signals · synced {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        <button className="btn btn-ghost btn-sm" onClick={handleChangeNiche}>Switch niche →</button>
      </div>
    </div>
  )
}
