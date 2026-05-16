import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Icon, Button, Chip, Pill, PageHeader, IconButton, Tooltip } from '../components/ui.jsx'
import { useTrends } from '../hooks/useTrends.js'
import { getProfile } from '../lib/api.js'
import { NICHES } from '../lib/mockData.js'

const PLATFORM_OPTS = [
  { id:'all', label:'All' }, { id:'instagram', label:'Instagram' },
  { id:'reddit', label:'Reddit' }, { id:'youtube', label:'YouTube' },
]
const SIGNAL_OPTS = [
  { id:'all', label:'All' }, { id:'viral', label:'Viral' },
  { id:'rising', label:'Rising' }, { id:'new', label:'New' },
]

const FETCH_STEPS = [
  { id:'reddit',   label:'Scanning Reddit communities',   duration: 8000  },
  { id:'youtube',  label:'Pulling YouTube trends',        duration: 10000 },
  { id:'instagram',label:'Reading Instagram signals',     duration: 10000 },
  { id:'ai',       label:'AI ranking your signals',       duration: 99999 },
]

// ─── Signal pill ─────────────────────────────────────────────────────────────

function SignalPill({ kind }) {
  if (kind === 'viral')  return <Chip tone="error"   icon={<Icon.Flame size={10}/>}>Viral</Chip>
  if (kind === 'rising') return <Chip tone="success" icon={<Icon.Rising size={10}/>}>Rising</Chip>
  if (kind === 'new')    return <Chip tone="terra"   icon={<Icon.Sparkle size={10}/>}>New</Chip>
  return null
}

function PlatformChip({ id }) {
  const map = {
    instagram: { label:'Instagram', icon:<Icon.IG size={11}/> },
    reddit:    { label:'Reddit',    icon:<Icon.Reddit size={11}/> },
    youtube:   { label:'YouTube',   icon:<Icon.YT size={11}/> },
    x:         { label:'X',         icon:<Icon.XTwit size={11}/> },
  }
  const m = map[id]; if (!m) return null
  return <Chip tone="line" icon={m.icon}>{m.label}</Chip>
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Spark({ signal, score }) {
  const pts = []
  const bias = signal === 'viral' ? 1.0 : signal === 'rising' ? 0.55 : 0.15
  for (let i = 0; i <= 12; i++) {
    const s = Math.sin(score * 13 + i * 7.13) * 1000
    const n = s - Math.floor(s)
    const v = 14 - (n * 6 + (i / 12) * bias * 12)
    pts.push(`${i * 7},${Math.max(1, Math.min(20, v))}`)
  }
  const color = signal === 'viral' ? 'var(--error)' : signal === 'rising' ? 'var(--success)' : 'var(--terra)'
  return (
    <svg width="84" height="22" viewBox="0 0 84 22" preserveAspectRatio="none">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Trend card ───────────────────────────────────────────────────────────────

function TrendCard({ t, onGenerate, index = 0, hero = false, crossPlatforms }) {
  const navigate = useNavigate()
  const handleGenerate = () => {
    onGenerate(t)
    navigate(`/studio?topicId=${t.id}&title=${encodeURIComponent(t.title)}&niche=${encodeURIComponent(t.niche || '')}`)
  }

  const otherPlatforms = crossPlatforms
    ? [...crossPlatforms].filter(p => p !== t.platform)
    : []

  return (
    <article className="card overflow-hidden fade-up flex flex-col hover:shadow-lift transition-shadow"
      style={{ animationDelay:`${index * 40}ms` }}>
      <div className="px-5 pt-4 pb-3 flex items-center gap-2.5 border-b border-line2">
        <PlatformChip id={t.platform}/>
        <span className="text-ink4 text-[10px]">·</span>
        <span className="text-[11px] text-ink3 font-medium uppercase tracking-[0.06em]">{t.niche}</span>
        <span className="flex-1"/>
        <SignalPill kind={t.signal}/>
      </div>
      <div className="px-5 pt-4 pb-3 flex-1">
        {hero && <Chip tone="ink" className="mb-2">Editor's pick</Chip>}
        <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-ink leading-snug mb-2">{t.title}</h3>
        <p className="text-[13px] text-ink2 leading-relaxed mb-3">{t.summary}</p>
        {t.sources && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] text-ink3 font-medium uppercase tracking-[0.06em]">Sources</span>
            {(t.sources || []).slice(0, 3).map(s => (
              <span key={s} className="text-[11px] font-mono text-ink2 px-1.5 py-0.5 rounded bg-paper2 border border-line">{s}</span>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 py-3 border-t border-line bg-paper flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium">Signal</span>
          <span className="text-[14px] font-semibold tabular-nums"
            style={{ color: t.signal === 'viral' ? 'var(--error)' : t.signal === 'rising' ? 'var(--success)' : 'var(--terra)' }}>
            {t.score}
          </span>
        </div>
        <div className="flex-1 flex justify-end">
          <Spark signal={t.signal} score={t.score}/>
        </div>
        {t.age && (
          <div className="flex items-center gap-2 text-[11px] text-ink3 font-mono">
            <span>{t.posts || ''}</span>
            {t.posts && <span className="text-ink4">·</span>}
            <span>{t.age}</span>
          </div>
        )}
      </div>
      {otherPlatforms.length > 0 && (
        <div className="px-5 py-2 border-t border-line2 flex items-center gap-1.5">
          <Icon.Rising size={10} style={{ color:'var(--success)' }}/>
          <span className="text-[11px] text-ink3">Also trending on</span>
          {otherPlatforms.map(p => <PlatformChip key={p} id={p}/>)}
        </div>
      )}
      <button onClick={handleGenerate}
        className="w-full px-5 py-3 border-t border-line text-left flex items-center justify-between hover:bg-paper2 transition-colors group">
        <span className="text-[13px] font-medium text-ink flex items-center gap-2">
          <Icon.Wand size={13} style={{ color:'var(--terra)' }}/> Forge a 60-sec script
        </span>
        <Icon.Arrow size={13} className="text-ink3 group-hover:text-ink transition-colors"/>
      </button>
    </article>
  )
}

// ─── Creator Brief banner ─────────────────────────────────────────────────────

function CreatorBrief({ apiProfile, stats }) {
  const navigate = useNavigate()
  const { user } = useUser()
  const storedProfile = (() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } })()

  const name = user?.fullName || user?.firstName || apiProfile?.creatorName || storedProfile.name || 'Creator'
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')

  const voiceLabel = apiProfile?.contentStyles?.[0] || storedProfile.styles?.split(' + ')[0] || 'Storytelling'
  const goalLabel  = apiProfile?.primaryGoal || storedProfile.goal || 'Grow audience'
  const scriptsLabel = stats?.totalScripts != null ? `${stats.totalScripts} scripts` : '—'

  return (
    <div className="card overflow-hidden fade-up">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-4 p-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full text-white flex items-center justify-center text-[14px] font-semibold"
              style={{ background:'var(--terra)' }}>{initials}</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ background:'var(--success)' }}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-ink3 font-medium uppercase tracking-[0.06em]">Generating for</span>
              <span className="text-[13px] font-semibold text-ink truncate">{name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { icon:<Icon.Mic size={11}/>,    label:'Voice',   value: voiceLabel },
                { icon:<Icon.Target size={11}/>, label:'Goal',    value: goalLabel },
                { icon:<Icon.Layers size={11}/>, label:'Scripts', value: scriptsLabel },
              ].map(c => (
                <span key={c.label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-line bg-paper text-[12px]">
                  <span className="text-ink3">{c.icon}</span>
                  <span className="text-[10.5px] text-ink3 font-medium uppercase tracking-[0.06em]">{c.label}</span>
                  <span className="text-ink font-medium">{c.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="sm" icon={<Icon.Edit size={12}/>} onClick={() => navigate('/profile')}>Edit</Button>
          <Button variant="soft" size="sm" icon={<Icon.Sliders size={12}/>}>Tune voice</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Phase: Idle — niche picker ───────────────────────────────────────────────

function IdlePhase({ selectedNiches, onToggleNiche, onFetch }) {
  const todayStr = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
  const canFetch = selectedNiches.length > 0

  return (
    <div className="fade-up flex flex-col items-center justify-center py-16 px-4">
      <p className="kicker mb-3">{todayStr}</p>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink text-center mb-2">
        What's moving today?
      </h1>
      <p className="text-[14px] text-ink3 text-center max-w-md leading-relaxed mb-10">
        Pick your niches and we'll scan Reddit, YouTube, and Instagram for the
        best signals — summarised and ranked just for you.
      </p>

      <div className="card w-full max-w-xl p-6">
        <p className="text-[11px] text-ink3 font-medium uppercase tracking-[0.08em] mb-3">
          Select niches
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {NICHES.map(n => (
            <Pill key={n.id} active={selectedNiches.includes(n.id)}
              onClick={() => onToggleNiche(n.id)}>
              {n.icon} {n.label}
            </Pill>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-line">
          <span className="text-[12px] text-ink3">
            {selectedNiches.length === 0
              ? 'Select at least one niche'
              : `${selectedNiches.length} niche${selectedNiches.length > 1 ? 's' : ''} selected · ~30 sec fetch`}
          </span>
          <Button variant="primary" size="md" disabled={!canFetch}
            icon={<Icon.Sparkle size={13}/>} onClick={onFetch}>
            Get my feed
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Phase: Loading — animated step progress ──────────────────────────────────

function LoadingPhase({ selectedNiches }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(Date.now())
  const TOTAL_MS = 36000  // 36s estimated, snaps to 100% when data arrives

  useEffect(() => {
    let stepStart = Date.now()

    const advanceStep = (idx) => {
      if (idx >= FETCH_STEPS.length - 1) return
      const step = FETCH_STEPS[idx]
      const timer = setTimeout(() => {
        setStepIdx(idx + 1)
        stepStart = Date.now()
        advanceStep(idx + 1)
      }, step.duration)
      return timer
    }

    const timer = advanceStep(0)

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min(90, (elapsed / TOTAL_MS) * 100)
      setProgress(pct)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const nicheLabels = selectedNiches
    .map(id => NICHES.find(n => n.id === id)?.label)
    .filter(Boolean)

  return (
    <div className="fade-up flex flex-col items-center justify-center py-16 px-4">
      <div className="card w-full max-w-xl p-8">
        <div className="mb-6">
          <p className="text-[11px] text-ink3 font-medium uppercase tracking-[0.08em] mb-1">
            Fetching live signals
          </p>
          <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
            Finding your best content…
          </h2>
          <p className="text-[13px] text-ink3 mt-1">
            {nicheLabels.join(' · ')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-line overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width:`${progress}%`, background:'var(--terra)' }}/>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          {FETCH_STEPS.map((step, i) => {
            const done    = i < stepIdx
            const current = i === stepIdx
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {done ? (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background:'var(--successsoft)', color:'var(--success)' }}>
                      <Icon.Check size={11}/>
                    </span>
                  ) : current ? (
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor:'var(--terra)' }}>
                      <span className="w-1.5 h-1.5 rounded-full pulse-soft"
                        style={{ background:'var(--terra)' }}/>
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-line bg-paper2"/>
                  )}
                </div>
                <span className={`text-[13px] font-medium transition-colors ${
                  done ? 'text-ink3 line-through decoration-ink4' :
                  current ? 'text-ink' : 'text-ink4'
                }`}>
                  {step.label}
                </span>
                {current && (
                  <span className="flex gap-0.5 ml-auto">
                    <span className="tdot"/><span className="tdot"/><span className="tdot"/>
                  </span>
                )}
                {done && (
                  <span className="text-[11px] text-ink4 font-mono ml-auto">done</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[12px] text-ink4 text-center mt-6 leading-relaxed">
          Scanning across communities and ranking by engagement velocity.
          <br/>This takes about 30 – 40 seconds.
        </p>
      </div>
    </div>
  )
}

// ─── Phase: Ready — results ───────────────────────────────────────────────────

function SectionHeader({ kicker, title, sub }) {
  return (
    <div className="mt-10 mb-1">
      <p className="kicker mb-1">{kicker}</p>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink leading-snug">{title}</h2>
      {sub && <p className="mt-1 text-[13px] text-ink3 leading-relaxed">{sub}</p>}
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

// phase: 'idle' | 'loading' | 'ready'

export default function Dashboard() {
  const storedNiches = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('trendforge_niches') || '[]') } catch { return [] }
  }, [])

  const [phase, setPhase] = useState('idle')
  const [selectedNiches, setSelectedNiches] = useState(
    storedNiches.length > 0 ? storedNiches : NICHES.map(n => n.id)
  )
  const [platform, setPlatform] = useState('all')
  const [signal, setSignal]     = useState('all')
  const [apiProfile, setApiProfile]   = useState(null)
  const [profileStats, setProfileStats] = useState(null)

  useEffect(() => {
    getProfile()
      .then(d => { setApiProfile(d.profile); setProfileStats(d.stats) })
      .catch(() => {})
  }, [])

  const { allTrends, loading, refreshing, lastUpdated, fetchNow, refresh } =
    useTrends(selectedNiches, { lazy: true })

  // Transition to ready once fetch resolves
  useEffect(() => {
    if (phase === 'loading' && !loading && allTrends.length >= 0 && lastUpdated) {
      setPhase('ready')
    }
  }, [phase, loading, lastUpdated])

  const handleFetch = useCallback(() => {
    setPhase('loading')
    fetchNow(selectedNiches).catch(() => setPhase('idle'))
  }, [selectedNiches, fetchNow])

  const handleToggleNiche = useCallback((id) => {
    setSelectedNiches(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const handleRefresh = useCallback(() => {
    setPhase('loading')
    refresh(selectedNiches).catch(() => setPhase('ready'))
  }, [selectedNiches, refresh])

  const crossPlatformMap = useMemo(() => {
    const map = {}
    for (const t of allTrends) {
      const key = t.title?.toLowerCase().slice(0, 30)
      if (!key) continue
      if (!map[key]) map[key] = new Set()
      map[key].add(t.platform)
    }
    return map
  }, [allTrends])

  const filtered = useMemo(() => {
    let list = [...allTrends]
    if (selectedNiches.length > 0) list = list.filter(t => selectedNiches.includes(t.niche))
    if (platform !== 'all') list = list.filter(t => t.platform === platform)
    if (signal !== 'all')   list = list.filter(t => t.signal === signal)
    return list
  }, [allTrends, selectedNiches, platform, signal])

  const recommendations = useMemo(() => {
    const byPlatform = {}
    for (const t of allTrends) {
      if (!selectedNiches.includes(t.niche)) continue
      if (!byPlatform[t.platform]) byPlatform[t.platform] = []
      byPlatform[t.platform].push(t)
    }
    for (const p in byPlatform) {
      byPlatform[p].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    }
    const picks = []
    for (const p of ['instagram', 'youtube', 'reddit']) {
      if (byPlatform[p]) picks.push(...byPlatform[p].slice(0, 2))
    }
    if (picks.length < 4) {
      const seen = new Set(picks.map(p => p.id))
      const topRest = allTrends.filter(t => !seen.has(t.id)).sort((a,b)=>(b.score??0)-(a.score??0))
      picks.push(...topRest.slice(0, 6 - picks.length))
    }
    return picks.slice(0, 6)
  }, [allTrends, selectedNiches])

  if (phase === 'idle') {
    return (
      <div className="px-6 lg:px-8 py-7 max-w-[1400px] mx-auto">
        <div className="mt-4"><CreatorBrief apiProfile={apiProfile} stats={profileStats}/></div>
        <IdlePhase
          selectedNiches={selectedNiches}
          onToggleNiche={handleToggleNiche}
          onFetch={handleFetch}
        />
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="px-6 lg:px-8 py-7 max-w-[1400px] mx-auto">
        <LoadingPhase selectedNiches={selectedNiches}/>
      </div>
    )
  }

  // ── Ready ──────────────────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[1400px] mx-auto">
      <PageHeader
        kicker={`${todayStr} · ${selectedNiches.length * 2} communities watched`}
        title="What's moving today"
        sub="Sorted by signal, filtered by your niches — decide in seconds."
        right={
          <>
            <Button variant="soft" size="sm"
              icon={<Icon.Refresh size={13} className={refreshing ? 'spin' : ''}/>}
              onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Syncing…' : 'Refresh'}
            </Button>
            {lastUpdated && (
              <span className="text-[11px] text-ink3 font-mono hidden md:inline">
                {lastUpdated.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
          </>
        }
      />

      <div className="mt-6"><CreatorBrief apiProfile={apiProfile} stats={profileStats}/></div>

      {/* Filter row */}
      <div className="mt-5 flex flex-wrap items-center gap-3 fade-up" style={{ animationDelay:'60ms' }}>
        <span className="text-[10.5px] text-ink3 font-medium uppercase tracking-[0.08em]">Niches</span>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map(n => (
            <Pill key={n.id} active={selectedNiches.includes(n.id)}
              onClick={() => handleToggleNiche(n.id)}>
              {n.icon} {n.label}
            </Pill>
          ))}
        </div>
        <span className="flex-1"/>
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-ink3 font-medium uppercase tracking-[0.08em]">Platform</span>
          <select value={platform} onChange={e => setPlatform(e.target.value)}
            className="field text-[12.5px] py-1.5 pl-2.5 pr-7 w-auto" style={{ width:'auto' }}>
            {PLATFORM_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <span className="text-[10.5px] text-ink3 font-medium uppercase tracking-[0.08em] ml-1">Signal</span>
          <select value={signal} onChange={e => setSignal(e.target.value)}
            className="field text-[12.5px] py-1.5 pl-2.5 pr-7 w-auto" style={{ width:'auto' }}>
            {SIGNAL_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Editor's picks */}
      {recommendations.length > 0 && (
        <>
          <SectionHeader kicker="Editor's picks" title="Two from each platform"
            sub="Top 2 picks from Instagram · YouTube · Reddit — balanced across sources."/>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {recommendations.slice(0, 3).map((t, i) => (
              <TrendCard key={`rec-${t.id}`} t={t} onGenerate={() => {}} index={i} hero
                crossPlatforms={crossPlatformMap[t.title?.toLowerCase().slice(0,30)]}/>
            ))}
          </div>
        </>
      )}

      {/* All trends */}
      <SectionHeader kicker="The feed" title={`${filtered.length} signals across your niches`}
        sub="Pull-quote summaries with sources, posts, and a 7-day shape."/>
      {filtered.length === 0 ? (
        <div className="card mt-4">
          <div className="py-14 text-center px-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-paper2 border border-line flex items-center justify-center text-ink3 mb-4">
              <Icon.Filter size={20}/>
            </div>
            <h3 className="text-[16px] font-semibold text-ink mb-1">Nothing matches those filters</h3>
            <p className="text-[13px] text-ink3 max-w-xs mx-auto">Loosen a filter or add a niche to see more trends.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {filtered.map((t, i) => (
            <TrendCard key={t.id} t={t} onGenerate={() => {}} index={i}
              crossPlatforms={crossPlatformMap[t.title?.toLowerCase().slice(0,30)]}/>
          ))}
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-line flex items-center justify-between text-[11.5px] text-ink3">
        <span>Creatorpulse · {filtered.length} signals · synced {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '—'}</span>
        <span>You've read {filtered.length} signals today</span>
      </div>
    </div>
  )
}
