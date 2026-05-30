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
  if (saved) return <span className="chip" style={{ fontSize: 10.5 }}>✓ Posted</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
      <input
        type="number" min="0" max="100" value={score}
        onChange={e => setScore(e.target.value)}
        className="input"
        style={{ width: 64, height: 32, padding: '0 8px', fontSize: 13, textAlign: 'center' }}
        placeholder="0–100"/>
      <button
        onClick={handleSave} disabled={!score || saving}
        className="btn btn-line btn-sm">
        {saving ? '…' : 'Mark used'}
      </button>
    </div>
  )
}

function ScriptRow({ script, onDelete, onOpen }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const niche = NICHES.find(n => n.id === script.niche)
  const statusClass = script.wasUsed ? 'shipped' : 'draft'

  return (
    <div
      className={`saved-row ${statusClass}`}
      onClick={() => onOpen(script)}
      onMouseLeave={() => setConfirmDelete(false)}>
      <span className="rk">{NICHE_ICON[script.niche] || '📝'}</span>
      <div>
        <p className="tt">{script.topicTitle}</p>
        <p className="tag" style={{ marginTop: 3 }}>{niche?.label || script.niche}</p>
      </div>
      <div className="pf">
        <span className="dot"/>
        {script.wasUsed ? 'Posted' : 'Draft'}
        {script.engagementScore && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }}>{script.engagementScore}</span>}
      </div>
      {showEngagement
        ? <EngagementInput scriptId={script.id} onSave={() => setShowEngagement(false)}/>
        : <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mute)', padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 999 }}>{script.format} reel</span>}
      <span className="tag" style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{timeAgo(script.createdAt)}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button
          title="Mark as posted"
          onClick={() => setShowEngagement(v => !v)}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }}>
          ★
        </button>
        <button
          title="Open in Studio"
          onClick={() => onOpen(script)}
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }}>
          →
        </button>
        <div style={{ position: 'relative' }}>
          <button
            title="Delete"
            onClick={() => setConfirmDelete(v => !v)}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer', color: 'var(--mute)' }}>
            ×
          </button>
          {confirmDelete && (
            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, width: 160, boxShadow: 'var(--sh-pop)' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 10 }}>Delete this script?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(script.id) }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, background: 'rgba(192,74,46,0.1)', border: '1px solid rgba(192,74,46,0.2)', color: 'rgb(192,74,46)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
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

  return (
    <div className="card" style={{ borderLeft: '3px solid var(--ink)', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14 }}>⚡</span>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Performance feedback loop</p>
        <span className="chip" style={{ fontSize: 10 }}>{posted.length} posted</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Scripts posted', value: posted.length },
          { label: 'With score', value: withScore.length },
          { label: 'Avg score', value: avgScore != null ? `${avgScore}/100` : '—' },
          { label: 'Best tone', value: toneAvgs[0]?.tone || '—' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>{s.value}</p>
            <span className="label" style={{ marginBottom: 0, marginTop: 4 }}>{s.label}</span>
          </div>
        ))}
      </div>
      {toneAvgs[0] && (
        <p className="body" style={{ fontSize: 12.5 }}>
          ✦ <strong>{toneAvgs[0].tone}</strong> tone gets your highest scores ({toneAvgs[0].avg} avg)
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

  return (
    <div className="app-main">
      {/* Header */}
      <div className="app-top">
        <div>
          <span className="kicker">Archive</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>Library</h1>
          <p className="body" style={{ marginTop: 4 }}>Every saved script, sorted, tagged, ready to reopen in the studio.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>+ New from dashboard</button>
      </div>

      {!loading && scripts.length > 0 && <PerformanceFeedback scripts={scripts}/>}

      {/* Filters */}
      <div className="app-filters">
        <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 300 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mute-2)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search scripts…"
            className="input"
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
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterNiche('all'); setFilterFormat('all') }}>
              Clear ×
            </button>
          )}
        </div>
      </div>

      {!loading && scripts.length > 0 && (
        <p className="small" style={{ marginBottom: 12 }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {scripts.length} scripts
        </p>
      )}

      {/* List header */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 200px 160px 160px 40px', gap: 16, padding: '0 0 10px', borderBottom: '1px solid var(--line)', marginBottom: 0 }}>
          {['#', 'Title', 'Performance', 'Format', 'When', ''].map(h => (
            <span key={h} className="label" style={{ marginBottom: 0, fontSize: 10 }}>{h}</span>
          ))}
        </div>
      )}

      {/* Script list */}
      <div className="saved-list">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 200px 160px 160px 40px', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--line-2)' }}>
              {[36, 200, 100, 80, 60, 30].map((w, j) => (
                <div key={j} style={{ height: 14, width: '100%', background: 'var(--paper-3)', borderRadius: 4, animation: 'none', opacity: 0.5 }}/>
              ))}
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: '56px 16px', textAlign: 'center', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.3 }}>⊟</div>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>{hasFilters ? 'No matches' : 'No saved scripts yet'}</p>
            <p className="body" style={{ marginBottom: 20 }}>
              {hasFilters ? 'Try adjusting your filters.' : 'Generate your first script from a trending topic.'}
            </p>
            {!hasFilters && (
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>✦ Discover trends</button>
            )}
          </div>
        ) : (
          filtered.map(script => (
            <ScriptRow key={script.id} script={script} onDelete={handleDelete} onOpen={handleOpen}/>
          ))
        )}
      </div>
    </div>
  )
}
