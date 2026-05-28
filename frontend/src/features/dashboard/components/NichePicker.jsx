import React, { useState, useMemo, useRef, useEffect } from 'react'
import { NICHE_CATEGORIES, NICHES } from '../../../constants/niches.js'
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
    onSelect({
      nicheId: niche.id,
      nicheLabel: niche.label,
      isPreset: true,
    })
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
    const fullQuery = `${customText}. ${combinedAnswer}`
    handleCustomSubmit(fullQuery)
  }

  const categoryBlocks = filteredCategories.map(cat => {
    const nicheChips = cat.niches.map(n => (
      <button
        key={n.id}
        onClick={() => handlePreset(n)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 14px', borderRadius: 999,
          border: '1px solid var(--line)', background: n.color,
          fontSize: 13, fontWeight: 500, color: 'var(--ink)',
          cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none' }}>
        <span>{n.icon}</span>
        <span>{n.label}</span>
      </button>
    ))

    return (
      <div key={cat.id} style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10.5, fontFamily: 'var(--mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 10 }}>
          {cat.label}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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

      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <input
            className="input input-lg"
            value={search}
            onChange={e => { setSearch(e.target.value); setCustomMode(false) }}
            placeholder="Search niches… (fitness, sourdough baking, day trading…)"
            style={{ paddingLeft: 44 }}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--mute)', fontSize: 17, pointerEvents: 'none' }}>⌕</span>
        </div>

        {/* Preset grid */}
        <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4, marginBottom: 24 }}>
          {filteredCategories.length > 0
            ? categoryBlocks
            : (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mute)' }}>
            or type your own
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
        </div>

        {/* Custom text input */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            className="input"
            value={customText}
            onChange={e => { setCustomText(e.target.value); setInterpretError('') }}
            onKeyDown={e => e.key === 'Enter' && !interpreting && customText.trim() && handleCustomSubmit(customText)}
            placeholder="e.g. "sourdough bread baking" or "dog training for puppies""
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
    </>
  )
}
