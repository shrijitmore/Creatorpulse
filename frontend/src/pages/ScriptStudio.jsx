import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useScriptGenerationContext } from '../context/ScriptGenerationContext.jsx'
import { getMemorySummary, getScript } from '../lib/api.js'
import SceneEditModal from '../features/studio/SceneEditModal.jsx'
import RecordingStudio from '../features/studio/RecordingStudio.jsx'
import ScriptDiff from '../features/studio/ScriptDiff.jsx'

const AGENT_STEPS = [
  { key: 'fetch',   label: 'Scanning source posts',       sub: 'Reading posts across 3 communities' },
  { key: 'cluster', label: 'Clustering conversation',     sub: 'Grouping themes, picking the angle' },
  { key: 'angle',   label: 'Choosing editorial angle',    sub: 'Matching to your voice and audience' },
  { key: 'script',  label: 'Writing the script',          sub: 'Hook, scenes, CTA' },
  { key: 'kit',     label: 'Drafting publish kit',        sub: 'Hook variants, caption, hashtags' },
]

function CopyBtn({ text, label = 'Copy' }) {
  const [c, setC] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(text) } catch {}
    setC(true); setTimeout(() => setC(false), 900)
  }
  return (
    <button
      onClick={copy}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${c ? 'var(--ink)' : 'var(--line)'}`, background: c ? 'var(--paper-2)' : '#fff', fontSize: 11.5, fontWeight: 500, color: c ? 'var(--ink)' : 'var(--mute)', fontFamily: 'var(--mono)', cursor: 'pointer', transition: 'all .18s' }}>
      {c ? '✓ Copied' : label}
    </button>
  )
}

// ─── Agent strip (generation progress) ───────────────────────────────────────

function AgentStrip({ steps }) {
  const doneCount = steps.filter(s => s.status === 'done').length
  const activeStep = steps.find(s => s.status === 'active')

  return (
    <div className="agent-strip">
      {steps.slice(0, 4).map((s, i) => {
        const done = s.status === 'done'; const now = s.status === 'active'
        return (
          <div key={s.step} className={`agent ${done ? 'done' : now ? 'now' : ''}`}>
            <span className="ag-ix">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <b>{AGENT_STEPS[i]?.label || s.label}</b>
              <span className="meta">{AGENT_STEPS[i]?.sub}</span>
            </div>
            {now && <span style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}><span className="tdot"/><span className="tdot"/><span className="tdot"/></span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Script panel ─────────────────────────────────────────────────────────────

function ScriptPanel({ script, onEditElement }) {
  const fullText = useMemo(() => {
    if (!script) return ''
    return [
      `HOOK: ${script.hookLine}`, '',
      ...(script.scenes || []).map(s => `SCENE ${s.sceneNumber} (${s.duration})\nVISUALS: ${s.visuals}\nVOICEOVER: ${s.voiceover}`),
      '', `CTA: ${script.cta}`,
    ].join('\n\n')
  }, [script])

  return (
    <div className="studio-script">
      <div className="ss-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{script.tone}</span>
          <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{script.format} reel</span>
          <div style={{ marginLeft: 'auto' }}><CopyBtn text={fullText} label="Copy script"/></div>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink)' }}>{script.topicTitle}</h2>
      </div>

      {/* Hook */}
      <div className="scene active">
        <div className="sc-head">
          <span className="sc-ix">Hook · 0–3 sec</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="sc-edit-btn" onClick={() => onEditElement?.({ scene: null, element: 'hook' })}>Edit with AI</button>
            <CopyBtn text={script.hookLine}/>
          </div>
        </div>
        <p className="sc-line">"{script.hookLine}"</p>
      </div>

      {/* Scenes */}
      {(script.scenes || []).map(s => (
        <div key={s.sceneNumber} className="scene">
          <div className="sc-head">
            <span className="sc-ix">Scene {String(s.sceneNumber).padStart(2, '0')} · {s.duration}</span>
            <div style={{ display: 'flex', gap: 8 }} className="sc-actions">
              <button className="sc-edit-btn" onClick={() => onEditElement?.({ scene: s, element: 'visual' })}>Edit visual</button>
              <button className="sc-edit-btn" onClick={() => onEditElement?.({ scene: s, element: 'voiceover' })}>Edit VO</button>
              <CopyBtn text={s.voiceover} label="Copy VO" />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span className="label" style={{ marginBottom: 4 }}>Visuals</span>
            <p className="body" style={{ fontSize: 14 }}>{s.visuals}</p>
          </div>
          <div>
            <span className="label" style={{ marginBottom: 4 }}>Voiceover <em style={{ fontStyle: 'normal', color: 'var(--mute)' }}>· spoken</em></span>
            <p className="sc-line" style={{ fontStyle: 'italic' }}>"{s.voiceover}"</p>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div className="scene">
        <div className="sc-head">
          <span className="sc-ix">CTA · The close</span>
          <CopyBtn text={script.cta}/>
        </div>
        <p className="sc-line" style={{ fontStyle: 'italic' }}>"{script.cta}"</p>
      </div>

      <div style={{ borderTop: '1px dashed var(--line)', marginTop: 20, paddingTop: 14, textAlign: 'center' }}>
        <span className="small mono">{(script.scenes || []).length} scenes · ~{script.format}</span>
      </div>
    </div>
  )
}

// ─── Content kit sidebar ──────────────────────────────────────────────────────

function ContentKit({ contentKit, regenerating, onRegenerate }) {
  if (!contentKit) return null
  const allTags = [...(contentKit.hashtags?.niche || []), ...(contentKit.hashtags?.trending || []), ...(contentKit.hashtags?.broad || [])].join(' ')
  const tones = ['rgba(181,200,255,0.9)', 'rgba(10,10,10,0.08)', 'rgba(34,197,94,0.3)']

  return (
    <div className="studio-side">
      <div className="card">
        <span className="label" style={{ marginBottom: 6 }}>Publish kit</span>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>Everything to ship this</h3>
        <p className="small">Hook variants, caption, hashtags, cover text.</p>
      </div>

      {/* Hook variants */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="label" style={{ marginBottom: 0 }}>Hook variants</span>
          <button className="sc-edit-btn" onClick={() => onRegenerate?.('hooks')} style={{ fontSize: 10 }}>↻ Regen</button>
        </div>
        <div className="hook-list">
          {(contentKit.hookVariants || []).map((h, i) => {
            const hookText = typeof h === 'string' ? h : h?.text || ''
            const hookType = typeof h === 'string' ? ['Storytelling', 'Bold claim', 'Question'][i] : h?.type || ''
            return (
              <div key={i} style={{ padding: '12px', border: `1px solid var(--line)`, borderLeft: `3px solid ${tones[i] || 'var(--line)'}`, borderRadius: 10, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="small" style={{ fontWeight: 500, color: 'var(--mute)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{hookType}</span>
                  <CopyBtn text={hookText}/>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--ink)', fontStyle: 'italic' }}>"{hookText}"</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Caption */}
      {contentKit.caption && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Instagram caption</span>
            <CopyBtn text={contentKit.caption}/>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-line' }}>{contentKit.caption}</p>
        </div>
      )}

      {/* Hashtags */}
      {contentKit.hashtags && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Hashtags</span>
            <CopyBtn text={allTags} label="Copy all"/>
          </div>
          {[
            { label: 'Niche', tags: contentKit.hashtags?.niche || [], c: 'rgba(181,200,255,0.9)' },
            { label: 'Trending', tags: contentKit.hashtags?.trending || [], c: 'rgba(34,197,94,0.35)' },
            { label: 'Broad', tags: contentKit.hashtags?.broad || [], c: 'rgba(10,10,10,0.08)' },
          ].map(row => row.tags.length > 0 && (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <span className="label" style={{ color: 'var(--mute)', marginBottom: 6 }}>{row.label}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {row.tags.map(t => (
                  <button
                    key={t}
                    onClick={() => { try { navigator.clipboard.writeText(t) } catch {} }}
                    style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)', background: row.c, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--ink-2)', cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── AI Memory sidebar ────────────────────────────────────────────────────────

function MemorySidebar({ niche }) {
  const navigate = useNavigate()
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemorySummary(niche)
      .then(d => setMemory(d))
      .catch(() => setMemory(null))
      .finally(() => setLoading(false))
  }, [niche])

  const recentScripts = memory?.recentScripts || []
  const topTopics = memory?.topTopics || []
  const total = memory?.totalScripts ?? 0

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  return (
    <div className="studio-side">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--paper-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⊙</span>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>AI Memory</p>
          <span className="chip" style={{ marginLeft: 'auto', fontSize: 10 }}><span className="dot"/> Live</span>
        </div>
        <p className="small">What I'm using to write this, pulled from your archive.</p>
      </div>

      {loading ? (
        <div className="card">
          <div style={{ height: 80, background: 'var(--paper-3)', borderRadius: 8 }}/>
        </div>
      ) : recentScripts.length === 0 ? (
        <div className="card">
          <p className="small" style={{ fontStyle: 'italic' }}>No past scripts yet. Generate some to build memory.</p>
        </div>
      ) : (
        <div className="card">
          <span className="label" style={{ marginBottom: 12 }}>Similar past scripts</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentScripts.slice(0, 3).map((s, i) => (
              <div key={i}
                onClick={() => navigate('/saved')}
                style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer', transition: 'background var(--tx-fast)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--paper-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topicTitle || s.topic_title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.tone}</span>
                  <span className="small mono">{timeAgo(s.createdAt || s.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topTopics.length > 0 && (
        <div className="card">
          <span className="label" style={{ marginBottom: 10 }}>Topics covered</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {topTopics.map(t => (
              <span key={t.topic} style={{ padding: '3px 10px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                {t.topic} <span className="small mono">{t.count}</span>
              </span>
            ))}
          </div>
          <p className="small" style={{ marginTop: 12 }}>{topTopics.length} topics · {total} scripts indexed</p>
        </div>
      )}
    </div>
  )
}

// ─── Script Studio ────────────────────────────────────────────────────────────

export default function ScriptStudio() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const scriptId   = searchParams.get('scriptId') || ''
  const topicId    = searchParams.get('topicId') || ''
  const topicTitle = searchParams.get('title') ? decodeURIComponent(searchParams.get('title')) : ''
  const topicNiche = searchParams.get('niche') ? decodeURIComponent(searchParams.get('niche')) : 'general'

  const [tone, setTone]     = useState('Storytelling')
  const [format, setFormat] = useState('60s')
  const [saved, setSaved]   = useState(!!scriptId)  // already saved if opened from library
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [savedScriptLoading, setSavedScriptLoading] = useState(false)

  // Global context — generation survives navigation and page-refresh (via localStorage cache)
  const {
    isGenerating, steps, script: generatedScript, contentKit: generatedKit,
    error, regenerating, generate, cancelGeneration, regenerateContentSection,
    setScript, setContentKit,
  } = useScriptGenerationContext()

  const [localScript, setLocalScript] = useState(null)
  const [savedContentKit, setSavedContentKit] = useState(null)
  const script = localScript || generatedScript
  const contentKit = savedContentKit || generatedKit

  // Load saved script by ID (from SavedScripts page) — skip auto-generation
  useEffect(() => {
    if (!scriptId) return
    setSavedScriptLoading(true)
    getScript(scriptId)
      .then(data => {
        setLocalScript(data)
        if (data.contentKit) setSavedContentKit(data.contentKit)
        if (data.tone) setTone(data.tone.charAt(0).toUpperCase() + data.tone.slice(1))
        if (data.format) setFormat(data.format)
      })
      .catch(() => {})
      .finally(() => setSavedScriptLoading(false))
  }, [scriptId])

  const handleApplyEdit = ({ element, suggestion, scene, cascading }) => {
    // Apply edits to local override; falls back to the globally-generated script
    setLocalScript(prev => {
      const base = prev || generatedScript
      if (!base) return base
      const updated = { ...base }
      if (element === 'hook') updated.hookLine = suggestion
      else if (element === 'cta') updated.cta = suggestion
      else if (element === 'visual' && scene)
        updated.scenes = (updated.scenes || []).map(s => s.sceneNumber === scene.sceneNumber ? { ...s, visuals: suggestion } : s)
      else if (element === 'voiceover' && scene)
        updated.scenes = (updated.scenes || []).map(s => s.sceneNumber === scene.sceneNumber ? { ...s, voiceover: suggestion } : s)
      if (cascading?.needed && cascading.suggestion) {
        if (cascading.element === 'voiceover' && scene)
          updated.scenes = (updated.scenes || []).map(s => s.sceneNumber === scene.sceneNumber ? { ...s, voiceover: cascading.suggestion } : s)
        else if (cascading.element === 'visual' && scene)
          updated.scenes = (updated.scenes || []).map(s => s.sceneNumber === scene.sceneNumber ? { ...s, visuals: cascading.suggestion } : s)
        else if (cascading.element === 'voiceover' && element === 'hook' && updated.scenes?.[0])
          updated.scenes[0] = { ...updated.scenes[0], voiceover: cascading.suggestion }
      }
      return updated
    })
  }

  useEffect(() => {
    if (scriptId) return  // loading a saved script — don't auto-generate
    if (topicId && !script && !isGenerating) generate(topicId, topicTitle, topicNiche, tone.toLowerCase(), format)
  }, [])

  if (!topicId && !scriptId && !script) {
    return (
      <div className="app-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--paper-3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>✦</div>
          <h2 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 8 }}>No topic in the press yet</h2>
          <p className="body" style={{ marginBottom: 24 }}>Pick a trend from the dashboard and we'll set the type and run a draft.</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Open dashboard →</button>
        </div>
      </div>
    )
  }

  const TONE_OPTS  = ['Storytelling', 'Educational', 'Entertaining', 'Controversial']
  const FORMAT_OPTS = ['30s', '60s', '90s']

  return (
    <div className="studio">
      {/* Top bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '0 0 24px', borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
        <button onClick={() => navigate('/dashboard')} style={{ padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper-2)', fontSize: 14, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="label" style={{ marginBottom: 2 }}>Composition</span>
          <h2 style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topicTitle || script?.topicTitle || 'Script Studio'}</h2>
        </div>

        {/* Tone */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TONE_OPTS.map(t => (
            <button
              key={t}
              onClick={() => setTone(t)}
              style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${tone === t ? 'var(--ink)' : 'var(--line)'}`, background: tone === t ? 'var(--ink)' : 'var(--paper)', color: tone === t ? '#fff' : 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all .18s' }}>
              {t === 'Storytelling' ? 'Story' : t === 'Educational' ? 'Teach' : t === 'Entertaining' ? 'Play' : 'Sharp'}
            </button>
          ))}
        </div>

        {/* Format */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FORMAT_OPTS.map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${format === f ? 'var(--ink)' : 'var(--line)'}`, background: format === f ? 'var(--ink)' : 'var(--paper)', color: format === f ? '#fff' : 'var(--ink-2)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all .18s' }}>
              {f}
            </button>
          ))}
        </div>

        {script && (
          <button className="btn btn-line btn-sm" onClick={() => setRecordingOpen(true)}>🎙 Practice</button>
        )}
        {localScript && generatedScript && (
          <button className="btn btn-line btn-sm" onClick={() => setDiffOpen(true)}>Changes</button>
        )}
        <button className="btn btn-line btn-sm" onClick={() => generate(topicId, topicTitle, topicNiche, tone.toLowerCase(), format)}>↻ Re-forge</button>
        {script && (
          <button
            className={`btn btn-sm ${saved ? 'btn-line' : 'btn-primary'}`}
            onClick={() => { setSaved(true); setTimeout(() => navigate('/saved'), 800) }}>
            {saved ? '✓ In library' : 'Save to library'}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(192,74,46,0.08)', border: '1px solid rgba(192,74,46,0.2)', borderRadius: 10, fontSize: 13, color: 'rgb(192,74,46)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading saved script */}
      {savedScriptLoading && (
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper-2)' }}>
          <span style={{ display: 'flex', gap: 3 }}><span className="tdot"/><span className="tdot"/><span className="tdot"/></span>
          <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Loading saved script…</span>
        </div>
      )}

      {/* Agent strip during generation */}
      {isGenerating && steps?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <AgentStrip steps={steps}/>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={cancelGeneration}>Cancel</button>
          </div>
        </div>
      )}

      {/* Studio grid */}
      {script ? (
        <div className="studio-grid">
          <div>
            <ScriptPanel script={script} onEditElement={({ scene, element }) => setEditTarget({ scene, element })}/>
          </div>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr', alignContent: 'start' }}>
            <ContentKit contentKit={contentKit} regenerating={regenerating} onRegenerate={regenerateContentSection}/>
            <MemorySidebar niche={topicNiche}/>
          </div>
        </div>
      ) : !isGenerating ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>✦</div>
            <p className="body">Click Re-forge to generate a new script</p>
          </div>
        </div>
      ) : null}

      <ScriptDiff open={diffOpen} onClose={() => setDiffOpen(false)} original={generatedScript} edited={localScript}/>
      <RecordingStudio open={recordingOpen} onClose={() => setRecordingOpen(false)} script={script}/>
      <SceneEditModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        scene={editTarget?.scene}
        element={editTarget?.element}
        script={script}
        onApply={handleApplyEdit}
      />
    </div>
  )
}
