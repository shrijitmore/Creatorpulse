import React, { useState, useEffect } from 'react'
import { Icon, Chip } from '../../components/ui.jsx'
import { getAuthHeaders } from '../../lib/apiClient.js'

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
        const headers = await getAuthHeaders()
        const res = await fetch('/api/recording/stats', { headers })
        const data = await res.json()
        setSessions(data.data?.sessions || [])
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

  return (
    <div className="space-y-4">
      {/* Session count banner */}
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-ink3">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</span>
        <Chip tone="success" icon={<Icon.Rising size={10}/>}>Improving</Chip>
      </div>

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
