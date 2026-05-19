import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Button, PageHeader, Chip, Tooltip } from '../components/ui.jsx'
import { getSavedScripts, deleteScript } from '../lib/api.js'
import { getAuthHeaders } from '../lib/apiClient.js'
import { NICHES } from '../lib/mockData.js'

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
    .map(([tone, scores]) => ({ tone, avg: Math.round(scores.reduce((a,b) => a+b,0) / scores.length) }))
    .sort((a,b) => b.avg - a.avg)

  const byFormat = {}
  for (const s of withScore) {
    if (!byFormat[s.format]) byFormat[s.format] = []
    byFormat[s.format].push(s.engagementScore)
  }
  const bestFormat = Object.entries(byFormat)
    .map(([format, scores]) => ({ format, avg: Math.round(scores.reduce((a,b) => a+b,0) / scores.length) }))
    .sort((a,b) => b.avg - a.avg)[0]

  return (
    <div className="card p-4 mb-5 border-l-[3px]" style={{ borderLeftColor:'var(--terra)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon.Bolt size={14} style={{ color:'var(--terra)' }}/>
        <p className="text-[13px] font-semibold text-ink">Performance feedback loop</p>
        <Chip tone="success">{posted.length} posted</Chip>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {[
          { label:'Scripts posted', value: posted.length },
          { label:'With score', value: withScore.length },
          { label:'Avg score', value: avgScore != null ? `${avgScore}/100` : '—' },
          { label:'Best tone', value: toneAvgs[0]?.tone || '—' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-line bg-paper p-2.5 text-center">
            <p className="text-[18px] font-semibold text-ink leading-none">{s.value}</p>
            <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      {(toneAvgs.length > 0 || bestFormat) && (
        <div className="text-[12.5px] text-ink2 space-y-1 pt-2 border-t border-line">
          {toneAvgs[0] && (
            <p>
              <Icon.Sparkle size={11} style={{ color:'var(--terra)', display:'inline', marginRight:4 }}/>
              <strong>{toneAvgs[0].tone}</strong> tone gets your highest scores ({toneAvgs[0].avg} avg)
              {toneAvgs.length > 1 && ` · ${toneAvgs[toneAvgs.length-1].tone} gets the lowest`}
            </p>
          )}
          {bestFormat && (
            <p>
              <Icon.Clock size={11} style={{ color:'var(--ink3)', display:'inline', marginRight:4 }}/>
              <strong>{bestFormat.format}</strong> reels perform best for you ({bestFormat.avg} avg score)
            </p>
          )}
        </div>
      )}
    </div>
  )
}

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
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="absolute right-0 top-full mt-1 z-50 card p-3 w-44"
      style={{ boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
      <p className="text-[12px] font-medium text-ink mb-2">Delete this script?</p>
      <div className="flex gap-1.5">
        <button onClick={onConfirm} className="flex-1 py-1.5 rounded-md text-[11.5px] font-medium transition-colors"
          style={{ background:'#F5DDD2', border:'1px solid #ECC6B5', color:'var(--error)' }}>Delete</button>
        <button onClick={onCancel} className="flex-1 py-1.5 rounded-md text-[11.5px] font-medium bg-paper2 border border-line text-ink2 transition-colors hover:bg-paper">Cancel</button>
      </div>
    </div>
  )
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

  if (saved) return <Chip tone="success" icon={<Icon.Check size={10} stroke={2.5}/>}>Posted</Chip>

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)}
        className="w-16 field text-[12px] py-1 text-center" placeholder="Score"/>
      <button onClick={handleSave} disabled={!score || saving}
        className="text-[11.5px] font-medium px-2 py-1 rounded-md border border-line bg-white hover:bg-paper2 text-ink2 transition-colors">
        {saving ? '…' : 'Mark used'}
      </button>
    </div>
  )
}

function ScriptRow({ script, onDelete, onOpen }) {
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const niche = NICHES.find(n => n.id === script.niche)

  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-lift transition-shadow cursor-pointer group"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setConfirmDelete(false) }}
      onClick={() => onOpen(script)}>
      <div className="w-9 h-9 rounded-md bg-paper2 border border-line flex items-center justify-center text-[16px] flex-shrink-0">
        {niche?.icon || '📝'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate">{script.topicTitle}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11.5px] text-ink3 uppercase tracking-[0.06em] font-medium">{niche?.label || script.niche}</span>
          <span className="text-ink4">·</span>
          <span className="text-[11.5px] text-ink3 capitalize">{script.tone}</span>
          {script.wasUsed && <Chip tone="success">Posted</Chip>}
          {script.engagementScore && (
            <span className="text-[11px] font-mono text-terra">{script.engagementScore} score</span>
          )}
        </div>
      </div>
      {showEngagement
        ? <EngagementInput scriptId={script.id} onSave={() => setShowEngagement(false)}/>
        : <Chip tone="line">{script.format} reel</Chip>
      }
      <span className="text-[11px] text-ink3 font-mono w-16 text-right flex-shrink-0">{timeAgo(script.createdAt)}</span>
      <div className="relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <Tooltip label="Mark as posted + add score" placement="top">
          <button onClick={() => setShowEngagement(v => !v)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink3 hover:text-terra hover:bg-terrasoft transition-colors">
            <Icon.Star size={13}/>
          </button>
        </Tooltip>
        <Tooltip label="Open in Studio" placement="top">
          <button onClick={() => onOpen(script)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink3 hover:text-ink hover:bg-paper2 transition-colors">
            <Icon.Arrow size={14}/>
          </button>
        </Tooltip>
        <Tooltip label="Delete" placement="top">
          <button onClick={() => setConfirmDelete(v => !v)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-ink3 hover:text-errorc hover:bg-[#F5DDD2] transition-colors">
            <Icon.Trash size={13}/>
          </button>
        </Tooltip>
        {confirmDelete && <DeleteConfirm onConfirm={() => { setConfirmDelete(false); onDelete(script.id) }} onCancel={() => setConfirmDelete(false)}/>}
      </div>
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
    navigate(`/studio?topicId=${script.topicId || script.id}&title=${encodeURIComponent(script.topicTitle)}&niche=${encodeURIComponent(script.niche || '')}`)
  }, [navigate])

  const filtered = useMemo(() => {
    let list = [...scripts]
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(s => s.topicTitle?.toLowerCase().includes(q)) }
    if (filterNiche !== 'all') list = list.filter(s => s.niche === filterNiche)
    if (filterFormat !== 'all') list = list.filter(s => s.format === filterFormat)
    if (sortBy === 'newest') list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sortBy === 'oldest') list.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sortBy === 'title') list.sort((a,b) => a.topicTitle?.localeCompare(b.topicTitle))
    return list
  }, [scripts, search, filterNiche, filterFormat, sortBy])

  const hasFilters = search || filterNiche !== 'all' || filterFormat !== 'all'

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[1100px] mx-auto">
      <PageHeader
        kicker="Archive"
        title="Library"
        sub="Every saved script — sorted, tagged, ready to reopen in the studio."
        right={
          <Button variant="primary" size="sm" icon={<Icon.Plus size={13}/>} onClick={() => navigate('/dashboard')}>
            New from dashboard
          </Button>
        }
      />

      {!loading && scripts.length > 0 && <PerformanceFeedback scripts={scripts}/>}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Icon.Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none"/>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search scripts…" className="field pl-8 text-[13px] py-1.5"/>
        </div>
        <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)}
          className="field text-[12.5px] py-1.5" style={{ width:'auto' }}>
          <option value="all">All niches</option>
          {NICHES.map(n => <option key={n.id} value={n.id}>{n.icon} {n.label}</option>)}
        </select>
        <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)}
          className="field text-[12.5px] py-1.5" style={{ width:'auto' }}>
          <option value="all">All formats</option>
          <option value="30s">30s</option>
          <option value="60s">60s</option>
          <option value="90s">90s</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="field text-[12.5px] py-1.5" style={{ width:'auto' }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A → Z</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterNiche('all'); setFilterFormat('all') }}
            className="text-[12px] font-medium text-ink3 hover:text-errorc transition-colors">
            Clear ×
          </button>
        )}
      </div>

      {!loading && scripts.length > 0 && (
        <p className="mt-3 text-[11.5px] text-ink3">
          Showing <strong className="text-ink">{filtered.length}</strong> of {scripts.length} scripts
        </p>
      )}

      {/* List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="skel w-9 h-9 rounded-md flex-shrink-0"/>
              <div className="flex-1 space-y-1.5"><div className="skel h-4 w-3/4 rounded"/><div className="skel h-3 w-1/3 rounded"/></div>
              <div className="skel h-5 w-16 rounded"/>
              <div className="skel h-3 w-12 rounded"/>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="card py-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-paper2 border border-line flex items-center justify-center text-ink3 mb-4">
              <Icon.Bookmark size={20}/>
            </div>
            <h3 className="text-[16px] font-semibold text-ink mb-1">{hasFilters ? 'No matches' : 'No saved scripts yet'}</h3>
            <p className="text-[13px] text-ink3 max-w-xs mx-auto mb-4">
              {hasFilters ? 'Try adjusting your filters.' : 'Generate your first script from a trending topic.'}
            </p>
            {!hasFilters && (
              <Button variant="primary" icon={<Icon.Wand size={13}/>} onClick={() => navigate('/dashboard')}>
                Discover trends
              </Button>
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
