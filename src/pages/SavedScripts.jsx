import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, Trash2, ExternalLink, Search, SlidersHorizontal, ChevronDown, Clock, Clapperboard } from 'lucide-react'
import { getSavedScripts, deleteScript } from '../lib/api.js'
import { NICHES } from '../lib/mockData.js'

const PLATFORM_LABELS = {
  instagram: { label: 'Instagram', color: '#e6683c' },
  x: { label: 'X', color: '#e5e5e5' },
  reddit: { label: 'Reddit', color: '#FF4500' }
}

const SIGNAL_COLORS = {
  storytelling: '#BFFF00',
  educational: '#00D1FF',
  entertaining: '#FF3D71',
  controversial: '#f59e0b'
}

const FORMAT_COLORS = {
  '30s': 'rgba(0,209,255,0.15)',
  '60s': 'rgba(191,255,0,0.1)',
  '90s': 'rgba(255,61,113,0.1)'
}

function timeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 rounded-lg p-3 w-48"
      style={{
        background: 'rgba(15,15,20,0.98)',
        border: '1px solid rgba(255,61,113,0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    >
      <p className="text-xs font-mono mb-3" style={{ color: '#f4f4f5' }}>Delete this script?</p>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 py-1.5 rounded text-xs font-mono transition-all"
          style={{
            background: 'rgba(255,61,113,0.15)',
            border: '1px solid rgba(255,61,113,0.4)',
            color: '#FF3D71'
          }}
        >
          DELETE
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded text-xs font-mono transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#71717a'
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}

function ScriptRow({ script, onDelete, onOpen }) {
  const [hovering, setHovering] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const platform = PLATFORM_LABELS[script.platform] || { label: script.platform, color: '#71717a' }
  const toneColor = SIGNAL_COLORS[script.tone] || '#71717a'
  const formatBg = FORMAT_COLORS[script.format] || 'rgba(255,255,255,0.05)'
  const niche = NICHES.find(n => n.id === script.niche)

  return (
    <div
      className="relative flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all cursor-pointer"
      style={{
        background: hovering ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovering ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirmDelete(false) }}
      onClick={() => onOpen(script)}
    >
      {/* Niche icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-lg"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {niche?.icon || '📝'}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p
          className="font-bebas text-base truncate"
          style={{ color: '#f4f4f5', letterSpacing: '0.03em' }}
        >
          {script.topicTitle}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Niche */}
          <span className="text-xs font-mono uppercase" style={{ color: '#71717a' }}>
            {niche?.label || script.niche}
          </span>
          <span style={{ color: '#3f3f46' }}>·</span>
          {/* Platform */}
          <span className="text-xs font-mono" style={{ color: platform.color }}>
            {platform.label}
          </span>
        </div>
      </div>

      {/* Tone badge */}
      <div
        className="hidden sm:block px-2 py-0.5 rounded text-xs font-mono capitalize flex-shrink-0"
        style={{
          background: `${toneColor}12`,
          border: `1px solid ${toneColor}25`,
          color: toneColor
        }}
      >
        {script.tone}
      </div>

      {/* Format badge */}
      <div
        className="hidden md:block px-2 py-0.5 rounded text-xs font-mono flex-shrink-0"
        style={{
          background: formatBg,
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#a1a1aa'
        }}
      >
        {script.format} REEL
      </div>

      {/* Time */}
      <div className="hidden lg:flex items-center gap-1 flex-shrink-0" style={{ color: '#3f3f46' }}>
        <Clock size={11} />
        <span className="text-xs font-mono">{timeAgo(script.createdAt)}</span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => onOpen(script)}
          className="p-1.5 rounded transition-all"
          style={{ color: '#71717a' }}
          onMouseEnter={e => e.currentTarget.style.color = '#BFFF00'}
          onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
          title="Open in Script Studio"
        >
          <ExternalLink size={14} />
        </button>
        <div className="relative">
          <button
            onClick={() => setConfirmDelete(v => !v)}
            className="p-1.5 rounded transition-all"
            style={{ color: '#71717a' }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF3D71'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
            title="Delete script"
          >
            <Trash2 size={14} />
          </button>
          {confirmDelete && (
            <DeleteConfirm
              onConfirm={() => { setConfirmDelete(false); onDelete(script.id) }}
              onCancel={() => setConfirmDelete(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ hasFilters }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'rgba(191,255,0,0.04)',
          border: '1px solid rgba(191,255,0,0.12)'
        }}
      >
        <BookMarked size={28} style={{ color: '#BFFF00', opacity: 0.4 }} />
      </div>
      <h3
        className="font-bebas text-3xl mb-2"
        style={{ color: '#f4f4f5', letterSpacing: '0.05em' }}
      >
        {hasFilters ? 'NO MATCHES' : 'NO SAVED SCRIPTS'}
      </h3>
      <p
        className="text-sm text-center max-w-xs mb-6"
        style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}
      >
        {hasFilters
          ? 'Try adjusting your filters to see more scripts'
          : 'Generate your first script from a trending topic and save it here'}
      </p>
      {!hasFilters && (
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-mono transition-all"
          style={{
            background: 'rgba(191,255,0,0.08)',
            border: '1px solid rgba(191,255,0,0.3)',
            color: '#BFFF00'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#BFFF00'; e.currentTarget.style.color = '#08090D' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(191,255,0,0.08)'; e.currentTarget.style.color = '#BFFF00' }}
        >
          <Clapperboard size={14} />
          DISCOVER TRENDS
        </button>
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
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const storedNiches = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('trendforge_niches') || '[]')
      return NICHES.filter(n => parsed.includes(n.id))
    } catch { return [] }
  }, [])

  const fetchScripts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSavedScripts()
      setScripts(Array.isArray(data) ? data : data?.data || [])
    } catch (err) {
      console.error('Failed to load scripts:', err)
      setScripts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteScript(id)
      setScripts(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }, [])

  const handleOpen = useCallback((script) => {
    navigate(`/studio?topicId=${script.topicId || script.id}&title=${encodeURIComponent(script.topicTitle)}`)
  }, [navigate])

  const filtered = useMemo(() => {
    let list = [...scripts]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.topicTitle?.toLowerCase().includes(q))
    }
    if (filterNiche !== 'all') list = list.filter(s => s.niche === filterNiche)
    if (filterFormat !== 'all') list = list.filter(s => s.format === filterFormat)
    if (filterPlatform !== 'all') list = list.filter(s => s.platform === filterPlatform)

    if (sortBy === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sortBy === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sortBy === 'title') list.sort((a, b) => a.topicTitle?.localeCompare(b.topicTitle))

    return list
  }, [scripts, search, filterNiche, filterFormat, filterPlatform, sortBy])

  const hasFilters = search || filterNiche !== 'all' || filterFormat !== 'all' || filterPlatform !== 'all'

  const SelectFilter = ({ value, onChange, options, placeholder }) => (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-mono cursor-pointer"
        style={{
          background: value !== 'all' ? 'rgba(191,255,0,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${value !== 'all' ? 'rgba(191,255,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
          color: value !== 'all' ? '#BFFF00' : '#71717a',
          outline: 'none'
        }}
      >
        <option value="all">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown
        size={10}
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: '#71717a' }}
      />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BookMarked size={20} style={{ color: '#BFFF00' }} />
          <h1 className="font-bebas text-4xl tracking-wider" style={{ color: '#f4f4f5', letterSpacing: '0.06em' }}>
            SAVED SCRIPTS
          </h1>
          {!loading && scripts.length > 0 && (
            <span
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                background: 'rgba(191,255,0,0.08)',
                border: '1px solid rgba(191,255,0,0.2)',
                color: '#BFFF00'
              }}
            >
              {scripts.length}
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}>
          Your generated scripts library — click any to reopen in Script Studio
        </p>
      </div>

      {/* Filters bar */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl mb-6"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#71717a' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search scripts..."
            className="w-full pl-8 pr-3 py-1.5 rounded text-xs font-mono"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f4f4f5',
              outline: 'none'
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={12} style={{ color: '#71717a' }} />

          <SelectFilter
            value={filterNiche}
            onChange={setFilterNiche}
            placeholder="All niches"
            options={NICHES.map(n => ({ value: n.id, label: `${n.icon} ${n.label}` }))}
          />

          <SelectFilter
            value={filterFormat}
            onChange={setFilterFormat}
            placeholder="All formats"
            options={[
              { value: '30s', label: '30s Reel' },
              { value: '60s', label: '60s Reel' },
              { value: '90s', label: '90s Reel' }
            ]}
          />

          <SelectFilter
            value={filterPlatform}
            onChange={setFilterPlatform}
            placeholder="All platforms"
            options={[
              { value: 'instagram', label: 'Instagram' },
              { value: 'x', label: 'X / Twitter' },
              { value: 'reddit', label: 'Reddit' }
            ]}
          />

          <SelectFilter
            value={sortBy}
            onChange={setSortBy}
            placeholder="Sort by"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'title', label: 'A → Z' }
            ]}
          />
        </div>
      </div>

      {/* Stats row */}
      {!loading && scripts.length > 0 && (
        <div className="flex items-center gap-6 mb-4 px-1">
          <span className="text-xs font-mono" style={{ color: '#71717a' }}>
            SHOWING <span style={{ color: '#BFFF00' }}>{filtered.length}</span> OF {scripts.length}
          </span>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterNiche('all'); setFilterFormat('all'); setFilterPlatform('all') }}
              className="text-xs font-mono transition-colors"
              style={{ color: '#71717a' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FF3D71'}
              onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
            >
              CLEAR FILTERS ×
            </button>
          )}
        </div>
      )}

      {/* Script list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`
              }}
            />
          ))}
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilters={!!hasFilters} />
      ) : (
        <div className="space-y-2">
          {filtered.map(script => (
            <ScriptRow
              key={script.id}
              script={script}
              onDelete={handleDelete}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
