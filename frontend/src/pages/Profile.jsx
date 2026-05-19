import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Button, Chip, Tooltip, PageHeader } from '../components/ui.jsx'
import { getProfile } from '../lib/api.js'
import AudienceAgeEditor from '../features/profile/AudienceAgeEditor.jsx'
import DeliveryGrowth from '../features/profile/DeliveryGrowth.jsx'

const VOICE_AXIS_KEYS = ['energy','formality','emotion','controversy','storytelling','humor']
const VOICE_AXIS_LABELS = { energy:'Energy', formality:'Formality', emotion:'Emotion', controversy:'Controversy', storytelling:'Storytelling', humor:'Humor' }

// ─── Radar chart ─────────────────────────────────────────────────────────────

function RadarChart({ axes }) {
  const size = 240, cx = size/2, cy = size/2, r = size/2 - 36
  const n = axes.length
  const angle = i => (-Math.PI/2) + (i * 2 * Math.PI / n)
  const point = (i, v) => ({ x: cx + Math.cos(angle(i)) * r * v, y: cy + Math.sin(angle(i)) * r * v })
  const labelPt = i => ({ x: cx + Math.cos(angle(i)) * (r + 20), y: cy + Math.sin(angle(i)) * (r + 20) })

  const [reveal, setReveal] = useState(0)
  useEffect(() => { const t = setTimeout(() => setReveal(1), 150); return () => clearTimeout(t) }, [])

  const poly = axes.map((a, i) => { const p = point(i, (a.value/100) * reveal); return `${p.x},${p.y}` }).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" style={{ maxWidth:size }}>
      {[0.33,0.66,1].map((rr, idx) => (
        <polygon key={idx} points={axes.map((_,i) => { const p = point(i,rr); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="var(--line)" strokeWidth="1"/>
      ))}
      {axes.map((_,i) => { const p = point(i,1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--line2)" strokeWidth="1"/> })}
      <polygon points={poly} fill="rgba(196,115,56,0.14)" stroke="var(--terra)" strokeWidth="1.5" strokeLinejoin="round"
        style={{ transition:'all 1s cubic-bezier(.16,1,.3,1)' }}/>
      {axes.map((a,i) => { const p = point(i,(a.value/100)*reveal); return <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--terra)" style={{ transition:'all 1s cubic-bezier(.16,1,.3,1)' }}/> })}
      {axes.map((a,i) => {
        const p = labelPt(i); const ax = Math.cos(angle(i))
        return (
          <text key={i} x={p.x} y={p.y} textAnchor={ax > 0.3 ? 'start' : ax < -0.3 ? 'end' : 'middle'} dominantBaseline="central"
            style={{ fill:'var(--ink2)', fontFamily:'Inter', fontSize:10.5, fontWeight:500 }}>{a.label}</text>
        )
      })}
    </svg>
  )
}

// ─── Line chart ───────────────────────────────────────────────────────────────

function LineChart({ data, height = 88 }) {
  if (!data || data.length < 2) return <div className="skel h-14 rounded"/>
  const w = 380
  const max = Math.max(...data.map(d => d.v)), min = Math.min(...data.map(d => d.v))
  const range = max - min || 1
  const pts = data.map((d,i) => ({ x:4 + (i/(data.length-1))*(w-8), y: height-14-((d.v-min)/range)*(height-26) }))
  const line = pts.map((p,i) => `${i?'L':'M'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length-1].x},${height-2} L${pts[0].x},${height-2} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={area} fill="rgba(196,115,56,0.10)"/>
      <path d={line} stroke="var(--terra)" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?3:1.8} fill="var(--terra)"/>)}
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ kicker, title, sub, children, right }) {
  return (
    <section className="card overflow-hidden fade-up">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4 border-b border-line">
        <div className="min-w-0">
          {kicker && <p className="kicker mb-1">{kicker}</p>}
          <h2 className="text-[16.5px] font-semibold tracking-[-0.005em] text-ink leading-snug">{title}</h2>
          {sub && <p className="mt-1 text-[12.5px] text-ink3 leading-relaxed">{sub}</p>}
        </div>
        {right && <div className="flex-shrink-0 pt-0.5">{right}</div>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

function ProfileRow({ label, value, chip }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="w-28 text-[11px] text-ink3 font-medium uppercase tracking-[0.06em] flex-shrink-0 pt-0.5">{label}</span>
      <span className="flex-1 text-[13px] text-ink leading-relaxed">{value || '—'}</span>
      {chip && <span className="flex-shrink-0">{chip === 'success' && <Chip tone="success" icon={<Icon.Check size={10} stroke={2.6}/>}>Active</Chip>}{chip === 'terra' && <Chip tone="terra">Primary</Chip>}</span>}
    </div>
  )
}

function IdentityStat({ label, value, suffix }) {
  return (
    <div className="text-right sm:text-left border-l border-line pl-6 first:border-l-0 first:pl-0">
      <p className="text-[11px] text-ink3 font-medium uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[22px] font-semibold tracking-tight text-ink leading-none">
        {value}<span className="text-[12px] text-ink3 ml-0.5 font-normal">{suffix}</span>
      </p>
    </div>
  )
}

function Skel({ h = 4, w = 'full' }) {
  return <div className={`skel h-${h} w-${w} rounded`}/>
}

// ─── Profile screen ───────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [audienceAge, setAudienceAge] = useState(null)

  useEffect(() => {
    getProfile()
      .then(d => {
        setData(d)
        setAudienceAge(d?.profile?.audienceAge || null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Fallback to localStorage while loading
  const storedProfile = (() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } })()
  const profile = data?.profile || null
  const stats = data?.stats || {}
  const topTopics = data?.topTopics || []
  const topHooks = data?.topHooks || []
  const scriptHistory = data?.scriptHistory || []
  const chartData = scriptHistory
    .filter(s => s.engagementScore != null)
    .map(s => ({ v: s.engagementScore, label: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }))

  const name = profile?.creatorName || storedProfile.name || 'Creator'
  const handle = '@' + name.toLowerCase().replace(/\s+/g, '')
  const initials = name.split(' ').map(w => w[0]).slice(0,2).join('')

  // Build voice axes from profile traits — deterministic hash so values are stable
  const voiceTraits = profile?.voiceTraits || []
  const voiceAxes = VOICE_AXIS_KEYS.map((key, idx) => {
    const traitMatch = voiceTraits.some(t => t?.toLowerCase().includes(key))
    // Deterministic fallback: derive a stable value from content styles + goal hash
    const seed = (profile?.contentStyles || []).join('').charCodeAt(idx % 3 || 0) || 65
    const baseVal = ((seed * (idx + 7)) % 45) + 30
    return { key, label: VOICE_AXIS_LABELS[key], value: traitMatch ? 75 + (idx * 3) % 20 : baseVal }
  })

  // Build niche strengths from nicheStrengths map
  const nicheStrengths = profile?.nicheStrengths || {}
  const nicheMap = Object.entries(nicheStrengths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  // Build topic cloud from topic memory
  const topicCloud = topTopics.map((t, i) => ({
    tag: t.topic?.charAt(0).toUpperCase() + t.topic?.slice(1) || '',
    weight: Math.max(0.2, 1 - i * 0.07),
    count: t.count
  }))

  const statsCards = [
    { label:'Scripts generated', value: stats.totalScripts ?? '—', sub:'All time', trend:'up' },
    { label:'Topics covered',    value: topTopics.length || '—', sub:'Unique topics', trend:'up' },
    { label:'Avg signal score',  value: stats.avgScore ?? '—', sub:'Generated scripts', trend:'up' },
    { label:'Favourite format',  value: stats.favFormat ?? '—', sub:'Most used', trend:'flat' },
  ]

  if (error) {
    return (
      <div className="px-6 py-7 max-w-[1280px] mx-auto">
        <div className="banner banner-error">
          <Icon.Alert size={14}/> Failed to load profile: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[1280px] mx-auto">
      <PageHeader
        kicker="Creator profile"
        title={name}
        sub={`${handle} · ${profile?.onboardingDone ? 'trained · forge-ready' : 'onboarding incomplete'}. Edit any of this to recalibrate your AI cofounder.`}
        right={
          <>
            <Button variant="soft" size="sm" icon={<Icon.Refresh size={13}/>}>Recalibrate</Button>
            <Button variant="soft" size="sm" icon={<Icon.Edit size={13}/>}>Edit profile</Button>
            <Button variant="primary" size="sm" iconRight={<Icon.Arrow size={13}/>} onClick={() => navigate('/dashboard')}>Open dashboard</Button>
          </>
        }
      />

      {/* Identity strip */}
      <div className="mt-6 card p-5 flex flex-wrap items-center gap-4 fade-up">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full text-white flex items-center justify-center text-[20px] font-semibold flex-shrink-0"
            style={{ background:'var(--terra)' }}>{initials}</div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-ink truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-ink3">{handle}</span>
              <span className="text-ink4">·</span>
              {profile?.onboardingDone
                ? <Chip tone="success" icon={<span className="w-1.5 h-1.5 rounded-full bg-successc live-dot inline-block"/>}>Voice trained</Chip>
                : <Chip tone="warn">Setup incomplete</Chip>}
              <Chip tone="line">Free tier</Chip>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <IdentityStat label="Scripts" value={loading ? '—' : String(stats.totalScripts ?? 0)}/>
          <IdentityStat label="Topics"  value={loading ? '—' : String(topTopics.length || 0)}/>
          <IdentityStat label="Signal"  value={loading ? '—' : String(stats.avgScore ?? '—')} suffix="/100"/>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5">

        {/* ── LEFT ── */}
        <div className="space-y-5">

          <SectionCard kicker="Identity" title="Creator DNA"
            sub="The pattern we see in your work — your style, your audience, your goal.">
            {loading ? (
              <div className="space-y-2"><Skel h={5}/><Skel h={4} w="3/4"/></div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {voiceTraits.length > 0
                    ? voiceTraits.map(t => <Chip key={t} tone="terra">{t}</Chip>)
                    : (profile?.contentStyles || []).map(s => <Chip key={s} tone="terra">{s}</Chip>)}
                  <button className="chip chip-line hover:bg-paper2"><Icon.Plus size={10}/> Add trait</button>
                </div>
                <div className="space-y-3 rounded-lg border border-line bg-paper p-3.5">
                  <ProfileRow label="Audience" value={profile?.audiencePersona}/>
                  <div className="flex items-start gap-3 py-1">
                    <span className="w-28 text-[11px] text-ink3 font-medium uppercase tracking-[0.06em] flex-shrink-0 pt-0.5">Age range</span>
                    <AudienceAgeEditor
                      initialAge={audienceAge}
                      aiInferred={!profile?.audienceAge}
                      onUpdate={setAudienceAge}
                    />
                  </div>
                  <ProfileRow label="Goal" value={profile?.primaryGoal} chip="terra"/>
                  <ProfileRow label="Platforms" value={(profile?.platforms || []).join(', ')}/>
                  <ProfileRow label="Language" value={profile?.languageStyle || '—'}/>
                  <ProfileRow label="Format" value={profile?.contentFormat ? profile.contentFormat.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : '—'}/>
                  <ProfileRow label="Voice sample"
                    value={profile?.rawVoiceSample ? 'Trained · voice fingerprint active' : 'No sample — add one to improve scripts'}
                    chip={profile?.rawVoiceSample ? 'success' : null}/>
                </div>
              </>
            )}
          </SectionCard>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up">
            {statsCards.map(s => (
              <div key={s.label} className="card p-4">
                <p className="text-[11px] text-ink3 font-medium uppercase tracking-[0.06em] mb-1.5">{s.label}</p>
                {loading
                  ? <Skel h={8}/>
                  : <p className="text-[28px] font-semibold tracking-tight text-ink leading-none">{s.value}</p>}
                <p className="text-[11px] text-ink3 mt-1 flex items-center gap-1">
                  {s.trend === 'up' && <Icon.Rising size={10} className="text-successc"/>}{s.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Topic memory */}
          <SectionCard kicker="Memory" title="Topic memory"
            sub="Topics from your generated scripts — sized by frequency.">
            {loading ? (
              <div className="flex flex-wrap gap-2">{Array.from({length:8}).map((_,i)=><Skel key={i} h={7}/>)}</div>
            ) : topicCloud.length === 0 ? (
              <p className="text-[13px] text-ink3 italic">Generate some scripts to build your topic memory.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {topicCloud.map(t => {
                    const fs = 11 + t.weight * 6
                    const fw = t.weight > 0.6 ? 600 : 500
                    return (
                      <Tooltip key={t.tag} label={`${t.count} scripts mention this`}>
                        <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-white hover:border-ink3 transition-colors"
                          style={{ color:'var(--ink2)', opacity: 0.5 + t.weight * 0.5 }}>
                          <span style={{ fontSize:fs, fontWeight:fw, color: t.weight > 0.7 ? 'var(--ink)' : 'var(--ink2)' }}>{t.tag}</span>
                          <span className="text-[10px] text-ink3 font-mono">{t.count}</span>
                        </button>
                      </Tooltip>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between text-[11.5px] text-ink3">
                  <span>{topTopics.length} topics tracked · ranked by recurrence</span>
                </div>
              </>
            )}
          </SectionCard>
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-5">

          {/* Voice fingerprint */}
          <SectionCard kicker="Voice fingerprint" title="How your AI writes"
            sub="Six dials that match your voice. Re-train anytime by pasting more samples."
            right={<Button variant="ghost" size="sm" icon={<Icon.Edit size={12}/>}>Tune</Button>}>
            {loading ? (
              <div className="flex items-center justify-center py-8"><div className="skel w-40 h-40 rounded-full"/></div>
            ) : (
              <>
                <div className="flex items-center justify-center py-2">
                  <RadarChart axes={voiceAxes}/>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {voiceAxes.map(a => (
                    <div key={a.key} className="text-center rounded-md bg-paper border border-line py-2">
                      <p className="text-[18px] font-semibold tracking-tight text-ink leading-none tabular-nums">{a.value}</p>
                      <p className="text-[10px] text-ink3 uppercase tracking-[0.06em] font-medium mt-0.5">{a.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* Best hooks from saved scripts */}
          <SectionCard kicker="Top performers" title="Your best hooks"
            sub="Opening lines from your highest-scored scripts.">
            {loading ? (
              <div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="card p-3"><Skel h={4}/></div>)}</div>
            ) : topHooks.length === 0 ? (
              <p className="text-[13px] text-ink3 italic">No scripts yet — generate your first from the dashboard.</p>
            ) : (
              <div className="space-y-2.5">
                {topHooks.map((h, i) => {
                  const tones = ['var(--terra)', 'var(--ink2)', 'var(--successc)']
                  return (
                    <div key={h.id} className="border border-line rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="text-[10.5px] text-ink3 font-mono uppercase tracking-[0.06em] truncate flex-1">{h.topicTitle}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Chip tone="line">{h.format}</Chip>
                          {h.engagementScore && <Chip tone="terra">{h.engagementScore}</Chip>}
                        </div>
                      </div>
                      <p className="text-[13.5px] text-ink leading-snug italic" style={{ borderLeft: `3px solid ${tones[i % 3]}`, paddingLeft: 8 }}>
                        "{h.hookLine}"
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Delivery growth */}
          <SectionCard kicker="Voice coaching" title="Delivery growth"
            sub="Your scores across recorded practice sessions.">
            <DeliveryGrowth/>
          </SectionCard>

          {/* Signal over time */}
          <SectionCard kicker="Engagement" title="Signal over time"
            sub="Your engagement scores across posted scripts — higher is better.">
            {loading ? (
              <div className="skel h-14 rounded"/>
            ) : chartData.length < 2 ? (
              <p className="text-[13px] text-ink3 italic">
                Mark scripts as posted and add engagement scores to build this chart.
              </p>
            ) : (
              <>
                <LineChart data={chartData} height={88}/>
                <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink3">
                  <span>Earliest · {chartData[0]?.label}</span>
                  <span className="font-mono tabular-nums">Latest · {chartData[chartData.length - 1]?.v}/100</span>
                </div>
              </>
            )}
          </SectionCard>

          {/* Niche map */}
          <SectionCard kicker="Niche mix" title="Where you live"
            sub="Stronger bar means more scripts in that niche.">
            {loading ? (
              <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skel key={i} h={4}/>)}</div>
            ) : nicheMap.length === 0 ? (
              <p className="text-[13px] text-ink3 italic">Complete onboarding to build your niche map.</p>
            ) : (
              <>
                <div className="space-y-0.5 mt-1">
                  {nicheMap.map(n => (
                    <div key={n.name} className="flex items-center gap-3 py-1.5">
                      <span className="w-28 text-[12.5px] text-ink2 font-medium flex-shrink-0">{n.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-paper2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width:`${n.value}%`, background:'var(--terra)' }}/>
                      </div>
                      <span className="w-10 text-right text-[12px] font-mono tabular-nums text-ink2">{n.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <span className="text-[11.5px] text-ink3">Strongest · {nicheMap[0]?.name} {nicheMap[0]?.value}%</span>
                  <Button variant="soft" size="sm" icon={<Icon.Plus size={12}/>}>Add niche</Button>
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
