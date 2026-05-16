import React, { useState, useRef } from 'react'
import { Icon, Button, Modal, Chip } from '../../components/ui.jsx'
import { editScene, followupScene } from '../../lib/api.js'

const DATA_SOURCE_LABELS = {
  platform_pattern:    { label: 'Platform data',      color: 'success' },
  audience_psychology: { label: 'Audience psychology', color: 'terra' },
  content_structure:   { label: 'Content structure',   color: 'line' },
  style_suggestion:    { label: 'Style suggestion',    color: 'soft' },
}

const CONFIDENCE_COLORS = {
  high:   'var(--success)',
  medium: 'var(--terra)',
  low:    'var(--ink3)',
}

/**
 * Per-scene conversational edit modal.
 * User clicks ✏️ on any scene element → types what they want to change →
 * AI reasons, warns about cascading changes, shows followup chain.
 */
export default function SceneEditModal({ open, onClose, scene, element, script, onApply }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [thread, setThread] = useState([])  // conversation history
  const [followupText, setFollowupText] = useState('')
  const [followupLoading, setFollowupLoading] = useState(false)
  const promptRef = useRef(null)

  if (!scene && !element) return null

  const currentValue = element === 'visual'    ? scene?.visuals
                     : element === 'voiceover' ? scene?.voiceover
                     : element === 'hook'      ? script?.hookLine
                     : element === 'cta'       ? script?.cta
                     : ''

  const elementLabel = {
    visual:    'Visual instruction',
    voiceover: 'Voiceover',
    hook:      'Hook (0–3 seconds)',
    cta:       'Call to action',
  }[element] || element

  const handleSubmit = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await editScene({
        sceneNumber: scene?.sceneNumber,
        element,
        currentValue,
        userPrompt: prompt.trim(),
        tone: script?.tone,
        niche: script?.niche,
        fullScript: script,
      })
      setResult(data)
      setThread([{ prompt: prompt.trim(), suggestion: data.suggestion }])
    } catch (err) {
      console.error('[SceneEditModal] edit error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowup = async () => {
    if (!followupText.trim() || !result) return
    setFollowupLoading(true)
    try {
      const data = await followupScene({
        previousSuggestion: result.suggestion,
        followupPrompt: followupText.trim(),
        element,
        tone: script?.tone,
        niche: script?.niche,
      })
      setResult(prev => ({ ...prev, ...data }))
      setThread(prev => [...prev, { prompt: followupText.trim(), suggestion: data.suggestion }])
      setFollowupText('')
    } catch (err) {
      console.error('[SceneEditModal] followup error:', err)
    } finally {
      setFollowupLoading(false)
    }
  }

  const handleApply = (suggestion, cascading) => {
    onApply({ element, suggestion, scene, cascading })
    onClose()
  }

  const handleClose = () => {
    setPrompt(''); setResult(null); setThread([]); setFollowupText('')
    onClose()
  }

  const src = result ? DATA_SOURCE_LABELS[result.dataSource] || DATA_SOURCE_LABELS.style_suggestion : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Edit ${elementLabel}`}
      kicker={scene ? `Scene ${scene.sceneNumber}` : 'Script'}
      width="lg"
    >
      <div className="space-y-4">
        {/* Current value */}
        <div>
          <p className="kicker mb-1.5">Current</p>
          <div className="card-soft rounded-lg p-3 text-[13.5px] text-ink2 leading-relaxed italic">
            "{currentValue}"
          </div>
        </div>

        {/* Prompt input */}
        {!result && (
          <div>
            <p className="kicker mb-1.5">What do you want to change?</p>
            <div className="flex items-end gap-2.5">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                className="field flex-1"
                rows={2}
                placeholder={
                  element === 'visual'    ? 'e.g. "what if I start in the bathroom instead?"' :
                  element === 'voiceover' ? 'e.g. "make it more aggressive" or "say in Hinglish"' :
                  element === 'hook'      ? 'e.g. "make it a question" or "more controversial"' :
                  'e.g. "stronger CTA, more direct"'
                }
                autoFocus
              />
              <Button variant="primary" icon={loading ? <Icon.Refresh size={13} className="spin"/> : <Icon.Wand size={13}/>}
                disabled={!prompt.trim() || loading} onClick={handleSubmit}>
                {loading ? 'Thinking…' : 'Ask AI'}
              </Button>
            </div>
          </div>
        )}

        {/* AI Result */}
        {result && (
          <div className="space-y-3 fade-in">
            {/* Suggestion */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="kicker">AI suggestion</p>
                <div className="flex items-center gap-2">
                  {src && <Chip tone={src.color}>{src.label}</Chip>}
                  {result.confidence && (
                    <span className="text-[11px] font-mono font-medium" style={{ color: CONFIDENCE_COLORS[result.confidence] }}>
                      {result.confidence.toUpperCase()} confidence
                    </span>
                  )}
                </div>
              </div>
              <div className="card p-4 border-l-[3px]" style={{ borderLeftColor: 'var(--terra)' }}>
                <p className="text-[14px] text-ink leading-snug italic">"{result.suggestion}"</p>
              </div>
            </div>

            {/* Reasoning */}
            {result.reasoning && (
              <div className="rounded-lg bg-paper2 border border-line p-3">
                <p className="text-[12.5px] text-ink2 leading-relaxed">{result.reasoning}</p>
                {result.pros?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.pros.map((p, i) => (
                      <p key={i} className="text-[11.5px] text-ink3 flex items-start gap-1.5">
                        <Icon.Check size={10} stroke={2.5} className="mt-0.5 flex-shrink-0" style={{ color:'var(--success)' }}/>{p}
                      </p>
                    ))}
                    {result.cons?.filter(Boolean).map((c, i) => (
                      <p key={i} className="text-[11.5px] text-ink3 flex items-start gap-1.5">
                        <Icon.Alert size={10} className="mt-0.5 flex-shrink-0" style={{ color:'var(--warn)' }}/>{c}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cascading change warning */}
            {result.cascadingChange?.needed && (
              <div className="rounded-lg p-3 border" style={{ background:'#F5EBCF', borderColor:'#E6D7AE' }}>
                <div className="flex items-start gap-2">
                  <Icon.Alert size={14} style={{ color:'var(--warn)', flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p className="text-[12.5px] font-semibold" style={{ color:'#8B6313' }}>
                      Changing this affects your {result.cascadingChange.element}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color:'#8B6313' }}>{result.cascadingChange.reason}</p>
                    {result.cascadingChange.suggestion && (
                      <div className="mt-2 rounded p-2 bg-white border border-[#E6D7AE]">
                        <p className="text-[11.5px] text-ink3 font-medium uppercase tracking-[0.06em] mb-1">Updated {result.cascadingChange.element}:</p>
                        <p className="text-[13px] text-ink italic">"{result.cascadingChange.suggestion}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {result.cascadingChange?.needed ? (
                <>
                  <Button variant="primary" size="sm" icon={<Icon.Check size={13}/>}
                    onClick={() => handleApply(result.suggestion, result.cascadingChange)}>
                    Apply both changes
                  </Button>
                  <Button variant="soft" size="sm"
                    onClick={() => handleApply(result.suggestion, null)}>
                    Change {element} only
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" icon={<Icon.Check size={13}/>}
                  onClick={() => handleApply(result.suggestion, null)}>
                  Apply change
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setResult(null); setThread([]); setPrompt('') }}>
                Start over
              </Button>
            </div>

            {/* Followup chain */}
            <div className="border-t border-line pt-3">
              <p className="text-[11.5px] text-ink3 mb-2">Not quite right? Give more context:</p>
              <div className="flex items-end gap-2">
                <input
                  value={followupText}
                  onChange={e => setFollowupText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFollowup()}
                  className="field flex-1 text-[13px]"
                  placeholder='e.g. "more aggressive" or "keep it under 8 words"'
                />
                <Button variant="soft" size="sm"
                  icon={followupLoading ? <Icon.Refresh size={12} className="spin"/> : <Icon.Arrow size={12}/>}
                  disabled={!followupText.trim() || followupLoading}
                  onClick={handleFollowup}>
                  Followup
                </Button>
              </div>

              {/* Thread history */}
              {thread.length > 1 && (
                <div className="mt-3 space-y-2">
                  <p className="kicker">Revision history</p>
                  {thread.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11.5px]">
                      <span className="w-5 h-5 rounded-full bg-paper2 border border-line flex items-center justify-center font-mono text-[9px] text-ink3 flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-ink3">You: "{t.prompt}"</p>
                        <p className="text-ink2 mt-0.5 italic">→ "{t.suggestion?.slice(0, 80)}{(t.suggestion?.length || 0) > 80 ? '…' : ''}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
