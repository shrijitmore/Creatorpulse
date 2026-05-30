import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSavedScripts, deleteScript } from '../lib/api.js'
import { getAuthHeaders } from '../lib/apiClient.js'
import { NICHES } from '../lib/mockData.js'

const NICHE_ICON = Object.fromEntries(NICHES.map(n => [n.id, n.icon]))

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function EngagementInput({ scriptId, onSave }) {
  const [score, setScore] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!score) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/profile/mark-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ scriptId, engagementScore: parseInt(score) })
      })
      setSaved(true); onSave?.()
    } catch {}
    finally { setSaving(false) }
  }

  if (saved) return (
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'var(--successsoft)', padding: '3px 10px', borderRadius: 999, border: '1px solid var(--success)' }}>
      ✓ Posted
    </span>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
      <input
        type="number" min="0" max="100" value={score}
        onChange={e => setScore(e.target.value)}
        style={{ width: 56, height: 28, padding: '0 8px', fontSize: 12, textAlign: 'center', border: '1px solid var(--line)', borderRadius: 6, fontFamily: 'var(--mono)', outline: 'none' }}
        placeholder="0–100"
      />
      <button
        onClick={handleSave} disabled={!score || saving}
        style={{ height: 28, padding: '0 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--ink)', color: '#fff', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', opacity: (!score || saving) ? 0.5 : 1 }}>
        {saving ? '…' : 'Save'}
      </button>
    </div>
  )
}

function ScriptRow({ script, onDelete, onOpen }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const [hovered, setHovered] = useState(false)
  const niche = NICHES.find(n => n.id === script.niche)
  const isPosted = script.wasUsed

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      onClick={() => onOpen(script)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: hovered ? 'var(--paper-2)' : 'var(--paper)',
        cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
        borderColor: hovered ? 'var(--ink-2)' : 'var(--line)',
      }}>

      {/* Niche icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'var(--paper-3)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {NICHE_ICON[script.niche] || '📝'}
      </div>

      {/* Title + niche */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3,
        }}>
          {script.topicTitle}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {niche?.label || script.niche}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--line)' }}/>
          <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--mute)' }}>
            {script.tone}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div style={{ flexShrink: 0 }}>
        {isPosted ? (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--success)', background: 'var(--successsoft)',
            padding: '3px 10px', borderRadius: 999, border: '1px solid var(--success)',
          }}>Posted</span>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: 'var(--mute)', background: 'var(--paper-3)',
            padding: '3px 10px', borderRadius: 999, border: '1px solid var(--line)',
          }}>Draft</span>
        )}
        {script.engagementScore != null && (
          <span style={{ marginLeft: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink)', fontWeight: 600 }}>
            {script.engagementScore}
          </span>
        )}
      </div>

      {/* Format pill */}
      <span style={{
        flexShrink: 0, fontSize: 11, fontFamily: 'var(--mono)',
        color: 'var(--ink-2)', background: 'var(--paper-2)',
        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)',
      }}>
        {script.format}
      </span>

      {/* Time */}
      <span style={{ flexShrink: 0, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--mute)', width: 60, textAlign: 'right' }}>
        {timeAgo(script.createdAt)}
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        {showEngagement ? (
          <EngagementInput scriptId={script.id} onSave={() => setShowEngagement(false)}/>
        ) : (
          <button
            title="Mark as posted"
            onClick={() => setShowEngagement(v => !v)}
            style={actionBtn(isPosted ? 'var(--success)' : undefined)}>
            ★
          </button>
        )}
        <button
          title="Open in Studio"
          onClick={() => onOpen(script)}
          style={actionBtn()}>
          →
        </button>
        <div style={{ position: 'relative' }}>
          <button
            title="Delete"
            onClick={() => setConfirmDelete(v => !v)}
            style={actionBtn('var(--error-muted, #c04a2e)')}>
            ×
          </button>
          {confirmDelete && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 14, width: 170, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}>
              <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>Delete this script?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(script.id) }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(192,74,46,0.1)', border: '1px solid rgba(192,74,46,0.3)', color: 'rgb(192,74,46)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function actionBtn(color) {
  return {
    width: 30, height: 30, borderRadius: 8,
    border: '1px solid var(--line)', background: 'var(--paper)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, cursor: 'pointer', color: color || 'var(--ink-2)',
    transition: 'background .12s',
  }
}

function PerformanceFeedback({ scripts }) {
  const posted = scripts.filter(s => s.wasUsed)
  const withScore = scripts.filter(s => s.engagementScore != null)
  if (scripts.length < 3 || posted.length === 0) return null

  const avgScore = withScore.length
    ? Math.round(withScore.reduce((a, s) => a + s.engagementScore, 0) / withScore.length)
    : null

  const byTone = {}
  for (const s of withScore) {
    if (!byTone[s.tone]) byTone[s.tone] = []
    byTone[s.tone].push(s.engagementScore)
  }
  const toneAvgs = Object.entries(byTone)
    .map(([tone, scores]) => ({ tone, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    .sort((a, b) => b.avg - a.avg)

  const stats = [
    { label: 'Scripts posted', value: posted.length },
    { label: 'With score', value: withScore.length },
    { label: 'Avg score', value: avgScore != null ? `${avgScore}/100` : '—' },
    { label: 'Best tone', value: toneAvgs[0]?.tone || '—' },
  ]

  return (
    <div style={{ marginBottom: 24, padding: 20, borderRadius: 14, border: '1px solid var(--line)', borderLeft: '3px solid var(--ink)', background: 'var(--paper)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Performance loop</p>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--mute)', background: 'var(--paper-3)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--line)' }}>{posted.length} posted</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {stats.map(s => (
          <div key={s.label} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, textAlign: 'center', background: 'var(--paper-2)' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{s.value}</p>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mute)', fontWeight: 500, marginTop: 4, display: 'block' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {toneAvgs[0] && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 12 }}>
          ✦ <strong style={{ color: 'var(--ink)' }}>{toneAvgs[0].tone}</strong> tone gets your highest scores ({toneAvgs[0].avg} avg)
        </p>
      )}
    </div>
  )
}

export default function SavedScripts() {
  const navigate = useNavigate()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterNiche, setFilterNiche] = useState('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const fetchScripts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSavedScripts()
      setScripts(Array.isArray(data) ? data : data?.data || [])
    } catch { setScripts([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  const handleDelete = useCallback(async (id) => {
    try { await deleteScript(id); setScripts(prev => prev.filter(s => s.id !== id)) } catch {}
  }, [])

  const handleOpen = useCallback((script) => {
    navigate(`/studio?scriptId=${script.id}&topicId=${script.topicId || script.id}&title=${encodeURIComponent(script.topicTitle)}&niche=${encodeURIComponent(script.niche || '')}`)
  }, [navigate])

  const filtered = useMemo(() => {
    let list = [...scripts]
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(s => s.topicTitle?.toLowerCase().includes(q)) }
    if (filterNiche !== 'all') list = list.filter(s => s.niche === filterNiche)
    if (filterFormat !== 'all') list = list.filter(s => s.format === filterFormat)
    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sortBy === 'title') list.sort((a, b) => a.topicTitle?.localeCompare(b.topicTitle))
    return list
  }, [scripts, search, filterNiche, filterFormat, sortBy])

  const hasFilters = search || filterNiche !== 'all' || filterFormat !== 'all'

  const skeletonRows = Array.from({ length: 4 }).map((_, i) => (
    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--paper-3)', flexShrink: 0 }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 13, width: '60%', background: 'var(--paper-3)', borderRadius: 4 }}/>
        <div style={{ height: 10, width: '30%', background: 'var(--paper-3)', borderRadius: 4 }}/>
      </div>
      <div style={{ height: 22, width: 50, background: 'var(--paper-3)', borderRadius: 999 }}/>
      <div style={{ height: 22, width: 36, background: 'var(--paper-3)', borderRadius: 6 }}/>
      <div style={{ height: 12, width: 48, background: 'var(--paper-3)', borderRadius: 4 }}/>
      <div style={{ height: 30, width: 94, background: 'var(--paper-3)', borderRadius: 8 }}/>
    </div>
  ))

  return (
    <div className="app-main">
      {/* Header */}
      <div className="app-top">
        <div>
          <span className="kicker">Archive</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>Library</h1>
          <p className="body" style={{ marginTop: 4 }}>Every saved script, sorted and ready to reopen in the studio.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>+ New from dashboard</button>
      </div>

      {!loading && scripts.length > 0 && <PerformanceFeedback scripts={scripts}/>}

      {/* Filters */}
      <div className="app-filters" style={{ marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mute-2)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search scripts…" className="input"
            style={{ paddingLeft: 34, height: 36 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} className="input" style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            <option value="all">All niches</option>
            {NICHES.map(n => <option key={n.id} value={n.id}>{n.icon} {n.label}</option>)}
          </select>
          <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} className="input" style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            <option value="all">All formats</option>
            <option value="30s">30s</option>
            <option value="60s">60s</option>
            <option value="90s">90s</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input" style={{ height: 36, padding: '0 10px', width: 'auto' }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">A → Z</option>
          </select>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterNiche('all'); setFilterFormat('all') }}>Clear ×</button>
          )}
        </div>
      </div>

      {!loading && scripts.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 12 }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {scripts.length} scripts
        </p>
      )}

      {/* Script list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? skeletonRows
          : filtered.length === 0 ? (
            <div style={{ padding: '56px 16px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.25 }}>⊟</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
                {hasFilters ? 'No matches' : 'No saved scripts yet'}
              </p>
              <p className="body" style={{ marginBottom: 20 }}>
                {hasFilters ? 'Try adjusting your filters.' : 'Generate your first script from a trending topic.'}
              </p>
              {!hasFilters && (
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>✦ Discover trends</button>
              )}
            </div>
          ) : filtered.map(script => (
            <ScriptRow key={script.id} script={script} onDelete={handleDelete} onOpen={handleOpen}/>
          ))
        }
      </div>
    </div>
  )
}
