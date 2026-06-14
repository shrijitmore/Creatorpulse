import React, { useState, useEffect } from 'react'
import { Icon, Chip } from '../../components/ui.jsx'
import { getRecordingStats } from '../../lib/api.js'

const METRICS = [
  { key: 'overall_score',    label: 'Overall',    color: 'var(--terra)' },
  { key: 'confidence_score', label: 'Confidence', color: 'var(--success)' },
  { key: 'energy_score',     label: 'Energy',     color: '#6366f1' },
  { key: 'accuracy_score',   label: 'Accuracy',   color: 'var(--ink2)' },
]

function MiniLineChart({ sessions, metricKey, color, height = 60 }) {
  if (!sessions?.length) return <div className="skel h-14 rounded"/>
  const w = 300
  const values = sessions.map(s => s[metricKey] || 0)
  const max = Math.max(...values, 1), min = Math.min(...values, 0)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / Math.max(values.length - 1, 1)) * (w - 8) + 4,
    y: height - 4 - ((v - min) / range) * (height - 12)
  }))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length-1].x},${height} L${pts[0].x},${height} Z`
  const last = values[values.length - 1] || 0
  const first = values[0] || 0
  const delta = last - first

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[22px] font-semibold tracking-tight leading-none" style={{ color }}>{last}/10</span>
        {delta !== 0 && (
          <span className="text-[11px] font-mono" style={{ color: delta > 0 ? 'var(--success)' : 'var(--error)' }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={area} fill={`${color}15`}/>
        <path d={line} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
        {pts[pts.length-1] && <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="3" fill={color}/>}
      </svg>
    </div>
  )
}

export default function DeliveryGrowth() {
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecordingStats()
        setSessions(data.sessions || [])
      } catch { setSessions([]) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skel h-20 rounded-lg"/>)}
      </div>
    )
  }

  if (!sessions?.length) {
    return (
      <div className="text-center py-6">
        <p className="text-[13px] text-ink3 italic">No recording sessions yet.</p>
        <p className="text-[11.5px] text-ink3 mt-1">Go to Script Studio → Practice to start coaching.</p>
      </div>
    )
  }

  const totalFillers = sessions.reduce((a, s) => a + (s.filler_count || 0), 0)
  const avgFillers = sessions.length ? (totalFillers / sessions.length).toFixed(1) : 0
  const firstFillers = sessions[0]?.filler_count || 0
  const lastFillers = sessions[sessions.length-1]?.filler_count || 0

  // Best scene — session with highest overall score
  const bestSession = sessions.reduce((best, s) => (s.overall_score > (best?.overall_score || 0) ? s : best), null)
  const latestScore = sessions[sessions.length - 1]?.overall_score || 0
  const firstScore = sessions[0]?.overall_score || 0
  const scoreImproved = latestScore > firstScore

  return (
    <div className="space-y-4">
      {/* Session count + improvement banner */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-ink3">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</span>
        <Chip tone={scoreImproved ? 'success' : 'line'} icon={scoreImproved ? <Icon.Rising size={10}/> : null}>
          {scoreImproved ? 'Improving' : 'Steady'}
        </Chip>
      </div>

      {/* Improvement metrics */}
      {sessions.length >= 2 && (
        <div className="rounded-lg border border-line bg-paper p-3 space-y-1.5">
          <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mb-2">Progress since session 1</p>
          {[
            { label:'Overall score',  from: firstScore.toFixed(1), to: latestScore.toFixed(1), up: latestScore >= firstScore },
            { label:'Filler words',   from: String(firstFillers),  to: String(lastFillers),    up: lastFillers <= firstFillers },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between text-[12px]">
              <span className="text-ink3">{m.label}</span>
              <span className="font-mono flex items-center gap-1">
                <span className="text-ink3">{m.from}</span>
                <span className="text-ink4">→</span>
                <span style={{ color: m.up ? 'var(--success)' : 'var(--error)', fontWeight:600 }}>{m.to}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Best scene ever */}
      {bestSession && (
        <div className="rounded-lg border border-line p-3" style={{ background:'var(--terrasoft)' }}>
          <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mb-1.5">Best scene ever</p>
          <div className="flex items-center gap-3">
            <span className="text-[28px] font-semibold tracking-tight" style={{ color:'var(--terra)' }}>
              {bestSession.overall_score}/10
            </span>
            <div className="text-[12px] text-ink2">
              <p>Scene {bestSession.scene_number || '—'}</p>
              <p className="text-ink3">{new Date(bestSession.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Score charts */}
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map(m => (
          <div key={m.key} className="card p-3">
            <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mb-2">{m.label}</p>
            <MiniLineChart sessions={sessions} metricKey={m.key} color={m.color} height={52}/>
          </div>
        ))}
      </div>

      {/* Filler word trend */}
      <div className="card p-3">
        <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mb-1">Filler words per session</p>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-semibold tracking-tight leading-none text-ink">{avgFillers}</span>
          <span className="text-[11px] text-ink3">avg</span>
          {firstFillers > lastFillers && (
            <span className="text-[11px] font-mono" style={{ color:'var(--success)' }}>
              ↓ {firstFillers - lastFillers} less than session 1
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
