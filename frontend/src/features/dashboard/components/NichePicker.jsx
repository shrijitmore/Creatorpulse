import React, { useState, useMemo, useRef, useEffect } from 'react'
import { NICHE_CATEGORIES, NICHES, TRENDING_NICHES, getNiche } from '../../../constants/niches.js'
import { interpretNiche } from '../../../lib/api.js'

// ─── AI clarification modal ───────────────────────────────────────────────────

function ClarifyModal({ questions, onAnswer, onCancel }) {
  const [answers, setAnswers] = useState(questions.map(() => ''))

  const inputs = questions.map((q, i) => (
    <div key={i} style={{ marginBottom: 20 }}>
      <label className="label" style={{ marginBottom: 8 }}>{q}</label>
      <input
        className="input"
        value={answers[i]}
        onChange={e => setAnswers(prev => prev.map((a, j) => j === i ? e.target.value : a))}
        placeholder="Your answer…"
        autoFocus={i === 0}
      />
    </div>
  ))

  const canSubmit = answers.some(a => a.trim().length > 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,10,10,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 32, background: 'var(--paper)' }}>
        <span className="kicker" style={{ marginBottom: 12 }}>Help us understand</span>
        <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)', marginBottom: 6 }}>
          A couple of quick questions
        </h2>
        <p className="body" style={{ fontSize: 13.5, marginBottom: 28 }}>
          Your niche could go a few ways — your answers help the AI fetch the right signals.
        </p>
        {inputs}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!canSubmit}
            onClick={() => onAnswer(answers.filter(Boolean).join('. '))}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Trending panel (right column) ───────────────────────────────────────────

function TrendingPanel({ onPreset }) {
  const rows = TRENDING_NICHES.map(({ id, growth }, i) => {
    const n = getNiche(id)
    if (!n) return null
    const barPct = Math.round((growth / 50) * 100)
    return (
      <button
        key={id}
        onClick={() => onPreset(n)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '9px 10px', borderRadius: 10,
          border: '1px solid transparent', background: 'transparent',
          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = n.color; e.currentTarget.style.borderColor = 'var(--line)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
      >
        <span style={{ width: 18, fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--mute)', flexShrink: 0, textAlign: 'right' }}>
          {String(i + 1).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 17, flexShrink: 0 }}>{n.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
            {n.label}
          </p>
          <div style={{ height: 3, borderRadius: 999, background: 'var(--line)' }}>
            <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 999, background: 'var(--ink)', opacity: 0.6, transition: 'width 0.6s ease-out' }}/>
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
          +{growth}%
        </span>
      </button>
    )
  })

  return (
    <div className="card niche-trend-panel" style={{ padding: '18px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, paddingLeft: 4 }}>
        <span style={{ fontSize: 15 }}>🔥</span>
        <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 600 }}>
          Trending this week
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows}
      </div>
      <p style={{ fontSize: 10.5, color: 'var(--mute)', textAlign: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)', fontFamily: 'var(--mono)' }}>
        Community growth · last 7 days
      </p>
    </div>
  )
}

// ─── NichePicker ─────────────────────────────────────────────────────────────

export default function NichePicker({ onSelect }) {
  const [search, setSearch] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customText, setCustomText] = useState('')
  const [interpreting, setInterpreting] = useState(false)
  const [interpretError, setInterpretError] = useState('')
  const [clarifyQuestions, setClarifyQuestions] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (customMode && inputRef.current) inputRef.current.focus()
  }, [customMode])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return NICHE_CATEGORIES
    const q = search.toLowerCase()
    return NICHE_CATEGORIES.map(cat => ({
      ...cat,
      niches: cat.niches.filter(n =>
        n.label.toLowerCase().includes(q) ||
        n.id.replace(/-/g, ' ').includes(q)
      ),
    })).filter(cat => cat.niches.length > 0)
  }, [search])

  const handlePreset = (niche) => {
    onSelect({ nicheId: niche.id, nicheLabel: niche.label, isPreset: true })
  }

  const handleCustomSubmit = async (text) => {
    const query = text.trim()
    if (!query) return
    setInterpreting(true)
    setInterpretError('')
    setClarifyQuestions(null)
    try {
      const result = await interpretNiche(query)
      if (!result.understood) {
        setClarifyQuestions(result.questions || ['Can you describe your content niche in more detail?'])
        setInterpreting(false)
        return
      }
      onSelect({
        nicheId: result.nicheId,
        nicheLabel: result.nicheLabel,
        hashtags: result.hashtags,
        subreddits: result.subreddits,
        ytQuery: result.ytQuery,
        isPreset: result.isPreset ?? false,
      })
    } catch {
      setInterpretError('Could not interpret your niche. Please try a clearer description.')
      setInterpreting(false)
    }
  }

  const handleClarifyAnswer = (combinedAnswer) => {
    setClarifyQuestions(null)
    handleCustomSubmit(`${customText}. ${combinedAnswer}`)
  }

  const categoryBlocks = filteredCategories.map(cat => {
    const nicheChips = cat.niches.map(n => (
      <button
        key={n.id}
        onClick={() => handlePreset(n)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 13px', borderRadius: 999,
          border: '1px solid var(--line)', background: n.color,
          fontSize: 12.5, fontWeight: 500, color: 'var(--ink)',
          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none' }}>
        <span>{n.icon}</span>
        <span>{n.label}</span>
      </button>
    ))

    return (
      <div key={cat.id} style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 9 }}>
          {cat.label}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {nicheChips}
        </div>
      </div>
    )
  })

  return (
    <>
      {clarifyQuestions && (
        <ClarifyModal
          questions={clarifyQuestions}
          onAnswer={handleClarifyAnswer}
          onCancel={() => { setClarifyQuestions(null); setInterpreting(false) }}
        />
      )}

      <div className="niche-layout">
        {/* ── LEFT: browse ── */}
        <div>
          <p style={{ fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 14 }}>
            Browse 70+ presets
          </p>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input
              className="input"
              value={search}
              onChange={e => { setSearch(e.target.value); setCustomMode(false) }}
              placeholder="Search niches… (fitness, sourdough baking, day trading…)"
              style={{ paddingLeft: 40 }}
            />
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--mute)', fontSize: 16, pointerEvents: 'none' }}>⌕</span>
          </div>

          {/* Preset grid */}
          <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4, marginBottom: 20 }}>
            {filteredCategories.length > 0
              ? categoryBlocks
              : (
                <div style={{ padding: '28px 0', textAlign: 'center' }}>
                  <p className="body" style={{ marginBottom: 12 }}>No preset matches "{search}"</p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setCustomMode(true); setCustomText(search); setSearch('') }}>
                    Use "{search}" as custom niche →
                  </button>
                </div>
              )
            }
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)' }}>
              or type your own
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          </div>

          {/* Custom input */}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              ref={inputRef}
              className="input"
              value={customText}
              onChange={e => { setCustomText(e.target.value); setInterpretError('') }}
              onKeyDown={e => e.key === 'Enter' && !interpreting && customText.trim() && handleCustomSubmit(customText)}
              placeholder='e.g. "sourdough bread baking" or "dog training for puppies"'
              disabled={interpreting}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              disabled={!customText.trim() || interpreting}
              onClick={() => handleCustomSubmit(customText)}
              style={{ flexShrink: 0, gap: 8 }}>
              {interpreting
                ? <><span className="tdot"/><span className="tdot"/><span className="tdot"/></>
                : 'Analyse →'}
            </button>
          </div>

          {interpretError && (
            <p style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 8 }}>{interpretError}</p>
          )}
        </div>

        {/* ── RIGHT: trending ── */}
        <TrendingPanel onPreset={handlePreset}/>
      </div>
    </>
  )
}
