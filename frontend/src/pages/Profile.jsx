import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, resetOnboarding } from '../lib/api.js'
import AudienceAgeEditor from '../features/profile/AudienceAgeEditor.jsx'
import DeliveryGrowth from '../features/profile/DeliveryGrowth.jsx'

const VOICE_AXIS_KEYS = ['energy', 'formality', 'emotion', 'controversy', 'storytelling', 'humor']
const VOICE_AXIS_LABELS = { energy: 'Energy', formality: 'Formality', emotion: 'Emotion', controversy: 'Controversy', storytelling: 'Storytelling', humor: 'Humor' }

// ─── Radar chart ─────────────────────────────────────────────────────────────

function RadarChart({ axes }) {
  const size = 280, cx = size / 2, cy = size / 2, r = size / 2 - 48
  const n = axes.length
  const angle = i => (-Math.PI / 2) + (i * 2 * Math.PI / n)
  const point = (i, v) => ({ x: cx + Math.cos(angle(i)) * r * v, y: cy + Math.sin(angle(i)) * r * v })
  const labelPt = i => ({ x: cx + Math.cos(angle(i)) * (r + 28), y: cy + Math.sin(angle(i)) * (r + 28) })

  const [reveal, setReveal] = useState(0)
  useEffect(() => { const t = setTimeout(() => setReveal(1), 150); return () => clearTimeout(t) }, [])

  const poly = axes.map((a, i) => { const p = point(i, (a.value / 100) * reveal); return `${p.x},${p.y}` }).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, height: 'auto' }}>
      {[0.33, 0.66, 1].map((rr, idx) => (
        <polygon key={idx}
          points={axes.map((_, i) => { const p = point(i, rr); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="var(--line)" strokeWidth="1"/>
      ))}
      {axes.map((_, i) => { const p = point(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--line-2)" strokeWidth="1"/> })}
      <polygon points={poly} fill="rgba(10,10,10,0.06)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round"
        style={{ transition: 'all 1s cubic-bezier(.16,1,.3,1)' }}/>
      {axes.map((a, i) => { const p = point(i, (a.value / 100) * reveal); return <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--ink)" style={{ transition: 'all 1s cubic-bezier(.16,1,.3,1)' }}/> })}
      {axes.map((a, i) => {
        const p = labelPt(i); const ax = Math.cos(angle(i))
        return (
          <text key={i} x={p.x} y={p.y}
            textAnchor={ax > 0.3 ? 'start' : ax < -0.3 ? 'end' : 'middle'}
            dominantBaseline="central"
            style={{ fill: 'var(--ink-2)', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 500 }}>
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function LineChart({ data, height = 88 }) {
  if (!data || data.length < 2) return <div style={{ height, background: 'var(--paper-3)', borderRadius: 8 }}/>
  const w = 400
  const max = Math.max(...data.map(d => d.v)); const min = Math.min(...data.map(d => d.v))
  const range = max - min || 1
  const pts = data.map((d, i) => ({ x: 4 + (i / (data.length - 1)) * (w - 8), y: height - 14 - ((d.v - min) / range) * (height - 26) }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${height - 2} L${pts[0].x},${height - 2} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={area} fill="rgba(10,10,10,0.06)"/>
      <path d={line} stroke="var(--ink)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 1.8} fill="var(--ink)"/>)}
    </svg>
  )
}

// ─── Profile screen ───────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [audienceAge, setAudienceAge] = useState(null)
  const [recalibrating, setRecalibrating] = useState(false)

  const handleRecalibrate = async () => {
    setRecalibrating(true)
    try {
      await resetOnboarding()
      navigate('/onboarding')
    } catch (e) {
      setError('Failed to reset profile. Please try again.')
      setRecalibrating(false)
    }
  }

  const loadProfile = () => {
    setLoading(true)
    getProfile()
      .then(d => { setData(d); setAudienceAge(d?.profile?.audienceAge || null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProfile() }, [])

  const storedProfile = (() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } })()
  const profile = data?.profile || null
  const stats = data?.stats || {}
  const topTopics = data?.topTopics || []
  const topHooks = data?.topHooks || []
  const scriptHistory = data?.scriptHistory || []
  const chartData = scriptHistory.filter(s => s.engagementScore != null).map(s => ({ v: s.engagementScore, label: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))

  const name = profile?.creatorName || storedProfile.name || 'Creator'
  const handle = '@' + name.toLowerCase().replace(/\s+/g, '')
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('')

  const voiceTraits = profile?.voiceTraits || []
  const voiceAxes = VOICE_AXIS_KEYS.map((key, idx) => {
    const traitMatch = voiceTraits.some(t => t?.toLowerCase().includes(key))
    const seed = (profile?.contentStyles || []).join('').charCodeAt(idx % 3 || 0) || 65
    const baseVal = ((seed * (idx + 7)) % 45) + 30
    return { key, label: VOICE_AXIS_LABELS[key], value: traitMatch ? 75 + (idx * 3) % 20 : baseVal }
  })

  const nicheStrengths = profile?.nicheStrengths || {}
  const nicheMap = Object.entries(nicheStrengths).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => ({ name: n.charAt(0).toUpperCase() + n.slice(1), value: v }))

  const topicCloud = topTopics.map((t, i) => ({ tag: t.topic?.charAt(0).toUpperCase() + t.topic?.slice(1) || '', weight: Math.max(0.2, 1 - i * 0.07), count: t.count }))

  if (error) {
    return (
      <div className="app-main">
        <div style={{ padding: '12px 16px', background: 'rgba(192,74,46,0.08)', border: '1px solid rgba(192,74,46,0.2)', borderRadius: 10, fontSize: 13, color: 'rgb(192,74,46)' }}>
          ⚠ Failed to load profile: {error}
        </div>
      </div>
    )
  }

  const SkelBox = ({ h = 16 }) => <div style={{ height: h, background: 'var(--paper-3)', borderRadius: 6, animation: 'none' }}/>

  return (
    <div className="app-main" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div className="app-top">
        <div>
          <span className="kicker">Creator profile</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>{name}</h1>
          <p className="body" style={{ marginTop: 4 }}>{handle} · {profile?.onboardingDone ? 'trained · forge-ready' : 'onboarding incomplete'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-line btn-sm" onClick={handleRecalibrate} disabled={recalibrating}>
            {recalibrating ? '↻ Resetting…' : '↻ Recalibrate'}
          </button>
          <button className="btn btn-line btn-sm" onClick={() => navigate('/settings')}>✎ Edit profile</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>Open dashboard →</button>
        </div>
      </div>

      {/* Identity strip */}
      <div className="prof-hero">
        <div className="prof-id">
          <div className="prof-av iri"/>
          <div>
            <p style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{name}</p>
            <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 4 }}>{handle}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {profile?.onboardingDone
                ? <span className="chip active" style={{ fontSize: 10 }}>Voice trained</span>
                : <span className="chip" style={{ fontSize: 10 }}>Setup incomplete</span>}
              <span className="chip" style={{ fontSize: 10 }}>Free tier</span>
            </div>
          </div>
        </div>
        <div className="prof-key">
          {[
            { label: 'Scripts', value: loading ? '—' : String(stats.totalScripts ?? 0) },
            { label: 'Topics', value: loading ? '—' : String(topTopics.length || 0) },
            { label: 'Signal', value: loading ? '—' : String(stats.avgScore ?? '—'), suffix: stats.avgScore ? '/100' : '' },
            { label: 'Format', value: loading ? '—' : (stats.favFormat || '—') },
          ].map(s => (
            <div key={s.label}>
              <span className="label" style={{ marginBottom: 6 }}>{s.label}</span>
              <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>
                {s.value}<span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 400 }}>{s.suffix}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Creator DNA */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="kicker">Identity</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Creator DNA</h2>
              <p className="small" style={{ marginTop: 4 }}>The pattern we see in your work: style, audience, goal.</p>
            </div>
            <div style={{ padding: 20 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <SkelBox h={20}/><SkelBox h={16}/><SkelBox h={16}/>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                    {voiceTraits.length > 0
                      ? voiceTraits.map(t => <span key={t} className="chip active" style={{ fontSize: 10.5 }}>{t}</span>)
                      : (profile?.contentStyles || []).map(s => <span key={s} className="chip active" style={{ fontSize: 10.5 }}>{s}</span>)}
                  </div>
                  <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Audience', value: profile?.audiencePersona },
                      { label: 'Goal', value: profile?.primaryGoal },
                      { label: 'Platforms', value: (profile?.platforms || []).join(', ') },
                      { label: 'Language', value: profile?.languageStyle || '—' },
                      { label: 'Format', value: profile?.contentFormat?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—' },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'start' }}>
                        <span className="label" style={{ marginBottom: 0 }}>{r.label}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>{r.value || '—'}</span>
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'start' }}>
                      <span className="label" style={{ marginBottom: 0 }}>Age range</span>
                      <AudienceAgeEditor initialAge={audienceAge} aiInferred={!profile?.audienceAge} onUpdate={setAudienceAge}/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'start' }}>
                      <span className="label" style={{ marginBottom: 0 }}>Voice sample</span>
                      <span style={{ fontSize: 13.5, color: profile?.rawVoiceSample ? 'var(--pulse)' : 'var(--mute)' }}>
                        {profile?.rawVoiceSample ? '✓ Trained · fingerprint active' : 'No sample. Add one to improve scripts'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {[
              { label: 'Scripts generated', value: stats.totalScripts ?? '—', sub: 'All time' },
              { label: 'Topics covered', value: topTopics.length || '—', sub: 'Unique topics' },
              { label: 'Avg signal score', value: stats.avgScore ?? '—', sub: 'Generated scripts' },
              { label: 'Favourite format', value: stats.favFormat ?? '—', sub: 'Most used' },
            ].map(s => (
              <div key={s.label} className="card">
                <span className="label" style={{ marginBottom: 6 }}>{s.label}</span>
                {loading ? <SkelBox h={24}/> : <p style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', lineHeight: 1 }}>{s.value}</p>}
                <p className="small" style={{ marginTop: 6 }}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Topic memory */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="kicker">Memory</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Topic memory</h2>
              <p className="small" style={{ marginTop: 4 }}>Topics from your generated scripts, sized by frequency.</p>
            </div>
            <div style={{ padding: 20 }}>
              {loading ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 6 }).map((_, i) => <SkelBox key={i} h={28}/>)}</div>
                : topicCloud.length === 0
                ? <p className="body" style={{ fontStyle: 'italic' }}>Generate some scripts to build your topic memory.</p>
                : (
                  <div className="topic-cloud">
                    {topicCloud.map(t => (
                      <span
                        key={t.tag}
                        title={`${t.count} scripts mention this`}
                        className={t.weight > 0.7 ? 't1' : t.weight > 0.4 ? 't2' : 't3'}
                        style={{ cursor: 'default' }}>
                        {t.tag}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Voice fingerprint */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="kicker">Voice fingerprint</span>
                <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>How your AI writes</h2>
              </div>
              <button className="btn btn-ghost btn-sm">✎ Tune</button>
            </div>
            <div style={{ padding: 20 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 160, height: 160, borderRadius: '50%', background: 'var(--paper-3)' }}/>
                </div>
              ) : (
                <>
                  <div className="radar-wrap"><RadarChart axes={voiceAxes}/></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16 }}>
                    {voiceAxes.map(a => (
                      <div key={a.key} style={{ textAlign: 'center', padding: '8px 4px', border: '1px solid var(--line)', borderRadius: 8 }}>
                        <p style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1 }}>{a.value}</p>
                        <span className="label" style={{ marginBottom: 0, marginTop: 4, fontSize: 9.5 }}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Best hooks */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="kicker">Top performers</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Your best hooks</h2>
            </div>
            <div style={{ padding: 20 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{Array.from({ length: 3 }).map((_, i) => <SkelBox key={i} h={56}/>)}</div>
              ) : topHooks.length === 0 ? (
                <p className="body" style={{ fontStyle: 'italic' }}>No scripts yet. Generate your first from the dashboard.</p>
              ) : (
                <ul className="best-ul">
                  {topHooks.map((h, i) => (
                    <li key={h.id} style={{ borderLeft: `3px solid ${['var(--ink)', 'rgba(10,10,10,0.3)', 'var(--pulse)'][i % 3]}`, paddingLeft: 12, borderTop: 'none' }}>
                      <span className="small mono">{String(i + 1).padStart(2, '0')}</span>
                      <p style={{ fontSize: 14.5, fontWeight: 500, fontStyle: 'italic', color: 'var(--ink)', gridColumn: '2', lineHeight: 1.35 }}>"{h.hookLine}"</p>
                      <div style={{ display: 'flex', gap: 6, gridColumn: '3' }}>
                        <span className="chip" style={{ fontSize: 10 }}>{h.format}</span>
                        {h.engagementScore && <span className="chip active" style={{ fontSize: 10 }}>{h.engagementScore}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Delivery growth */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="kicker">Voice coaching</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Delivery growth</h2>
            </div>
            <div style={{ padding: 20 }}><DeliveryGrowth/></div>
          </div>

          {/* Signal over time */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
              <span className="kicker">Engagement</span>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Signal over time</h2>
            </div>
            <div style={{ padding: 20 }}>
              {loading ? <SkelBox h={56}/>
                : chartData.length < 2
                ? <p className="body" style={{ fontStyle: 'italic' }}>Mark scripts as posted and add engagement scores to build this chart.</p>
                : (
                  <>
                    <LineChart data={chartData} height={88}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                      <span className="small">{chartData[0]?.label}</span>
                      <span className="small mono">{chartData[chartData.length - 1]?.v}/100</span>
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Niche map */}
          {nicheMap.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <span className="kicker">Niche mix</span>
                <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginTop: 4 }}>Where you live</h2>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {nicheMap.map(n => (
                    <div key={n.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                      <span style={{ width: 80, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', flexShrink: 0 }}>{n.name}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 999, background: 'var(--ink)', width: `${n.value}%`, transition: 'width .7s cubic-bezier(.2,.7,.2,1)' }}/>
                      </div>
                      <span className="small mono" style={{ width: 36, textAlign: 'right' }}>{n.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
