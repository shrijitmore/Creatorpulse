import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Icon, Button, Chip, Tooltip, Segmented, Confirm, useToast, Logomark, ProLock } from '../components/ui.jsx'
import { useScriptGeneration } from '../hooks/useScriptGeneration.js'
import { getMemorySummary } from '../lib/api.js'
import SceneEditModal from '../features/studio/SceneEditModal.jsx'
import RecordingStudio from '../features/studio/RecordingStudio.jsx'
import ScriptDiff from '../features/studio/ScriptDiff.jsx'

const AGENT_STEPS = [
  { key:'fetch',   label:'Scanning source posts',       sub:'Reading posts across 3 communities' },
  { key:'cluster', label:'Clustering the conversation', sub:'Grouping themes, picking the strongest angle' },
  { key:'angle',   label:'Choosing an editorial angle', sub:'Matching to your voice and audience' },
  { key:'script',  label:'Writing the script',          sub:'Hook, scenes, CTA' },
  { key:'kit',     label:'Drafting the publish kit',    sub:'Hook variants, caption, hashtags, cover text' },
]

// ─── Copy chip ───────────────────────────────────────────────────────────────

function CopyChip({ text, label = 'Copy' }) {
  const [c, setC] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(text) } catch {}
    setC(true); setTimeout(() => setC(false), 900)
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all"
      style={{ background: c ? 'var(--paper2)':'#fff', borderColor: c ? 'var(--ink2)':'var(--line)', color: c ? 'var(--ink)':'var(--ink2)', fontSize:11.5, fontWeight:500 }}>
      {c ? <Icon.Check size={11} stroke={2.5}/> : <Icon.Copy size={11}/>}
      {c ? 'Copied' : label}
    </button>
  )
}

// ─── Agent overlay ────────────────────────────────────────────────────────────

function AgentOverlay({ open, steps, onCancel }) {
  if (!open) return null
  const doneCount = steps.filter(s => s.status === 'done').length
  const pct = Math.round((doneCount / steps.length) * 100)
  const activeStep = steps.find(s => s.status === 'active')

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 fade-in"
      style={{ background:'rgba(26,23,20,0.35)', backdropFilter:'blur(2px)' }}>
      <div className="card w-full max-w-[460px] overflow-hidden"
        style={{ animation:'fadeUp .25s cubic-bezier(.16,1,.3,1) forwards' }}>
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-center gap-2.5 mb-2">
            <Logomark size={28}/>
            <Chip tone="terra" icon={<span className="w-1.5 h-1.5 rounded-full bg-terra pulse-soft inline-block"/>}>Generating</Chip>
          </div>
          <h3 className="text-[18px] font-semibold tracking-tight text-ink leading-snug mb-0.5">Forging your script</h3>
          <p className="text-[12.5px] text-ink2">{activeStep ? activeStep.label + '…' : pct === 100 ? 'All set.' : 'Initialising…'}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-paper2 overflow-hidden">
              <div className="h-full rounded-full bg-terra transition-all" style={{ width:`${pct}%` }}/>
            </div>
            <span className="text-[10.5px] text-ink3 font-mono tabular-nums w-9 text-right">{pct}%</span>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          {steps.map((s, i) => {
            const done = s.status === 'done'; const active = s.status === 'active'
            return (
              <div key={s.step} className="flex items-start gap-3" style={{ opacity: done || active ? 1 : 0.5, transition:'opacity .25s' }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 font-mono text-[10px] font-semibold"
                  style={{ background: done ? 'var(--ink)' : active ? 'var(--terrasoft)' : 'var(--paper2)', border:'1px solid', borderColor: done ? 'var(--ink)' : active ? 'var(--terra)' : 'var(--line)', color: done ? '#fff' : active ? 'var(--terradeep)' : 'var(--ink3)' }}>
                  {done ? <Icon.Check size={11} stroke={2.5}/> : active ? <Icon.Refresh size={10} className="spin"/> : String(i + 1).padStart(2,'0')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${done || active ? 'text-ink' : 'text-ink2'}`}>{AGENT_STEPS[i]?.label || s.label}</p>
                  <p className="text-[11.5px] text-ink3">{AGENT_STEPS[i]?.sub || ''}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="px-6 py-3 border-t border-line bg-paper flex items-center justify-between">
          <span className="text-[11px] text-ink3 font-mono">Powered by Creatorpulse engine</span>
          <Button variant="ghost" size="sm" icon={<Icon.X size={12}/>} onClick={onCancel}>Cancel</Button>
        </div>
      </div>
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
    <div className="overflow-y-auto px-6 lg:px-8 py-7" style={{ maxHeight:'calc(100vh - 56px - 70px)' }}>
      <div className="max-w-[640px] mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Chip tone="terra">{script.tone}</Chip>
          <Chip tone="line">{script.format} reel</Chip>
          <Chip tone="line" icon={<Icon.IG size={11}/>}>Instagram</Chip>
          <span className="flex-1"/>
          <CopyChip text={fullText} label="Copy script"/>
        </div>
        <h2 className="text-[24px] font-semibold tracking-[-0.015em] text-ink leading-tight mb-4">{script.topicTitle}</h2>

        <div className="border-t border-line my-5"/>

        {/* Hook */}
        <div className="flex items-end justify-between gap-3 mb-3">
          <div><p className="kicker mb-1">0–3 seconds</p><h3 className="text-[16px] font-semibold text-ink">The hook</h3></div>
          <div className="flex items-center gap-1.5">
            <Tooltip label="Edit with AI" placement="top">
              <button onClick={() => onEditElement?.({ scene: null, element: 'hook' })}
                className="w-7 h-7 rounded-md flex items-center justify-center border border-line bg-white hover:bg-paper2 text-ink3 hover:text-ink transition-colors">
                <Icon.Edit size={12}/>
              </button>
            </Tooltip>
            <CopyChip text={script.hookLine}/>
          </div>
        </div>
        <div className="card-soft p-5 border-l-[3px]" style={{ borderLeftColor:'var(--terra)' }}>
          <p className="text-[18px] font-medium tracking-tight text-ink leading-snug">"{script.hookLine}"</p>
        </div>

        {/* Scenes */}
        <div className="flex items-end justify-between gap-3 mt-8 mb-3">
          <div><p className="kicker mb-1">Beats</p><h3 className="text-[16px] font-semibold text-ink">The scenes</h3></div>
        </div>
        <div className="space-y-4">
          {(script.scenes || []).map(s => (
            <div key={s.sceneNumber} className="flex gap-3 group">
              <div className="flex-shrink-0 flex flex-col items-center pt-0.5">
                <div className="w-9 h-9 rounded-md bg-ink text-white flex items-center justify-center font-mono text-[12px] font-semibold">
                  {String(s.sceneNumber).padStart(2,'0')}
                </div>
                <span className="mt-1.5 text-[10px] font-mono text-ink3">{s.duration}</span>
              </div>
              <div className="flex-1 card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="kicker mb-1">Visuals</p>
                    <p className="text-[13.5px] text-ink2 leading-relaxed">{s.visuals}</p>
                  </div>
                  <Tooltip label="Edit visual with AI" placement="left">
                    <button onClick={() => onEditElement?.({ scene: s, element: 'visual' })}
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-line bg-white hover:bg-paper2 text-ink3 hover:text-ink transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <Icon.Edit size={11}/>
                    </button>
                  </Tooltip>
                </div>
                <div className="border-t border-line2"/>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="kicker mb-1">Voiceover <span style={{ color:'var(--terra)', textTransform:'none', letterSpacing:'normal' }}>· spoken</span></p>
                    <p className="text-[14px] text-ink leading-relaxed italic">"{s.voiceover}"</p>
                  </div>
                  <Tooltip label="Edit voiceover with AI" placement="left">
                    <button onClick={() => onEditElement?.({ scene: s, element: 'voiceover' })}
                      className="w-7 h-7 rounded-md flex items-center justify-center border border-line bg-white hover:bg-paper2 text-ink3 hover:text-ink transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                      <Icon.Edit size={11}/>
                    </button>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyChip text={`VISUALS: ${s.visuals}\nVOICEOVER: ${s.voiceover}`}/>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-end justify-between gap-3 mt-8 mb-3">
          <div><p className="kicker mb-1">The close</p><h3 className="text-[16px] font-semibold text-ink">Call to action</h3></div>
          <CopyChip text={script.cta}/>
        </div>
        <div className="card-soft p-5 border-l-[3px]" style={{ borderLeftColor:'var(--ink2)' }}>
          <p className="text-[15px] text-ink leading-relaxed italic">"{script.cta}"</p>
        </div>

        <div className="border-t border-line border-dashed mt-8 mb-4"/>
        <p className="text-[11px] font-mono text-ink3 text-center">
          End of draft · {(script.scenes || []).length} scenes · ~{script.format}
        </p>
      </div>
    </div>
  )
}

// ─── Content kit ─────────────────────────────────────────────────────────────

function ContentKit({ contentKit, regenerating, onRegenerate }) {
  if (!contentKit) return null
  const allTags = [...(contentKit.hashtags?.niche || []), ...(contentKit.hashtags?.trending || []), ...(contentKit.hashtags?.broad || [])].join(' ')

  return (
    <div className="overflow-y-auto border-l border-line bg-paper" style={{ maxHeight:'calc(100vh - 56px - 70px)' }}>
      <div className="px-5 py-6 max-w-[420px]">
        <p className="kicker mb-1">Publish kit</p>
        <h3 className="text-[18px] font-semibold tracking-tight text-ink">Everything to ship this</h3>
        <p className="text-[12.5px] text-ink3 mt-1">Hook variants, caption, hashtags, and cover text — ready to paste.</p>

        <div className="border-t border-line mt-5 mb-5"/>

        {/* Hook variants */}
        <KitSection title="Three hook variants" subtitle="One angle each" onRegen={() => onRegenerate?.('hooks')} regenLoading={regenerating?.hooks}>
          <div className="space-y-2">
            {(contentKit.hookVariants || []).map((h, i) => {
              const tones = ['var(--terra)','var(--ink2)','var(--successc)']
              const hookText = typeof h === 'string' ? h : h?.text || ''
              const hookType = typeof h === 'string' ? ['Storytelling','Bold claim','Question'][i] : h?.type || ''
              return (
                <div key={i} className="card p-3.5 border-l-[3px]" style={{ borderLeftColor: tones[i] }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-medium uppercase tracking-[0.06em]" style={{ color: tones[i] }}>{hookType}</span>
                    <CopyChip text={hookText}/>
                  </div>
                  <p className="text-[13.5px] text-ink leading-snug italic">"{hookText}"</p>
                </div>
              )
            })}
          </div>
        </KitSection>

        {/* Caption */}
        <KitSection title="Instagram caption" right={<CopyChip text={contentKit.caption || ''}/>} onRegen={() => onRegenerate?.('caption')} regenLoading={regenerating?.caption}>
          <div className="card p-3.5 max-h-[180px] overflow-y-auto">
            <p className="text-[13px] text-ink2 leading-relaxed whitespace-pre-line">{contentKit.caption}</p>
          </div>
        </KitSection>

        {/* Hashtags */}
        <KitSection title="Hashtags" right={<CopyChip text={allTags} label="Copy all"/>} onRegen={() => onRegenerate?.('hashtags')} regenLoading={regenerating?.hashtags}>
          <TagRow label="Niche"    tags={contentKit.hashtags?.niche || []}    color="var(--terra)"/>
          <TagRow label="Trending" tags={contentKit.hashtags?.trending || []} color="var(--successc)"/>
          <TagRow label="Broad"    tags={contentKit.hashtags?.broad || []}    color="var(--ink2)"/>
        </KitSection>

        {/* Cover text */}
        <KitSection title="Cover text" subtitle="9:16 preview" right={<CopyChip text={contentKit.thumbnailText || ''}/>} onRegen={() => onRegenerate?.('thumbnail')} regenLoading={regenerating?.thumbnail}>
          <CoverPreview text={contentKit.thumbnailText || ''}/>
        </KitSection>
      </div>
    </div>
  )
}

function KitSection({ title, subtitle, right, onRegen, regenLoading, children }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-[13px] font-semibold text-ink">{title}</p>
          {subtitle && <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {right}
          {onRegen && (
            <Tooltip label="Regenerate" placement="left">
              <button onClick={onRegen} disabled={regenLoading}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-line bg-white hover:bg-paper2 text-ink3 hover:text-ink transition-colors">
                <Icon.Refresh size={11} className={regenLoading ? 'spin' : ''}/>
              </button>
            </Tooltip>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function TagRow({ label, tags, color }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] mb-1.5" style={{ color }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => <TagPill key={t} tag={t} color={color}/>)}
      </div>
    </div>
  )
}

function TagPill({ tag, color }) {
  const [c, setC] = useState(false)
  return (
    <button onClick={() => { try { navigator.clipboard.writeText(tag) } catch {} setC(true); setTimeout(() => setC(false), 800) }}
      className="px-2 py-0.5 rounded-md border bg-white text-[11.5px] font-mono transition-all"
      style={{ borderColor: c ? color : 'var(--line)', color: c ? color : 'var(--ink2)' }}>
      {tag}
    </button>
  )
}

function CoverPreview({ text }) {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="relative rounded-xl overflow-hidden border border-line bg-ink" style={{ width:160, aspectRatio:'9 / 16' }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize:'4px 4px' }}/>
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-terra"/>
          <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-white/70">creatorpulse</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="text-center text-white font-semibold leading-tight" style={{ fontSize:15 }}>{text}</p>
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 h-px opacity-70" style={{ background:'var(--terra)' }}/>
      </div>
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

  function timeAgo(d) {
    const diff = Date.now() - new Date(d).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days}d ago`
  }

  return (
    <aside className="overflow-y-auto border-l border-line bg-paper" style={{ maxHeight:'calc(100vh - 56px - 70px)' }}>
      <div className="px-5 py-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-terrasoft border border-[#EBD3B6] text-terradeep">
                <Icon.Brain size={13}/>
              </span>
              <p className="text-[13px] font-semibold text-ink">AI Memory</p>
            </div>
            <p className="text-[11.5px] text-ink3 leading-snug">What I'm using to write this — pulled from your archive.</p>
          </div>
          <Chip tone="success" icon={<span className="w-1.5 h-1.5 rounded-full bg-successc live-dot inline-block"/>}>Live</Chip>
        </div>
        <div className="border-t border-line mb-4"/>

        <MemorySection icon={<Icon.Layers size={11}/>} title="Similar past scripts" hint={recentScripts.length ? `${recentScripts.length} found` : ''}>
          {loading ? (
            <div className="space-y-2">{Array.from({length:2}).map((_,i)=><div key={i} className="skel h-14 rounded-lg"/>)}</div>
          ) : recentScripts.length === 0 ? (
            <p className="text-[12px] text-ink3 italic">No scripts yet — generate some to build memory.</p>
          ) : (
            <div className="space-y-2">
              {recentScripts.slice(0,3).map((s, i) => (
                <div key={i} className="card p-3 hover:bg-paper2 transition-colors cursor-pointer group"
                  onClick={() => navigate('/saved')}>
                  <p className="text-[12.5px] font-medium text-ink leading-snug mb-1.5 truncate">{s.topicTitle || s.topic_title}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Chip tone="soft">{s.tone}</Chip>
                      <span className="text-[10.5px] text-ink3 font-mono">{timeAgo(s.createdAt || s.created_at)}</span>
                    </div>
                    <Chip tone="terra">{s.format}</Chip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MemorySection>

        <MemorySection icon={<Icon.Hash size={11}/>} title="Topics you've covered" hint={topTopics.length ? `${topTopics.length} topics` : ''}>
          {loading ? (
            <div className="flex flex-wrap gap-1.5">{Array.from({length:5}).map((_,i)=><div key={i} className="skel h-6 w-16 rounded"/>)}</div>
          ) : topTopics.length === 0 ? (
            <p className="text-[12px] text-ink3 italic">Generate scripts to track covered topics.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topTopics.map(t => (
                <span key={t.topic} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-line bg-white text-[11.5px] text-ink2 hover:border-ink3 hover:text-ink transition-colors cursor-pointer">
                  {t.topic}
                  <span className="text-[9px] text-ink4 font-mono">{t.count}</span>
                </span>
              ))}
            </div>
          )}
        </MemorySection>

        <div className="pt-4 mt-2 border-t border-line flex items-center justify-between">
          <span className="text-[10.5px] text-ink3 font-mono">{topTopics.length} topics · {total} scripts indexed</span>
          <button onClick={() => navigate('/profile')} className="text-[11.5px] font-medium text-ink2 hover:text-ink flex items-center gap-1">
            Full profile <Icon.Arrow size={11}/>
          </button>
        </div>
      </div>
    </aside>
  )
}

function MemorySection({ icon, title, hint, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between mb-2.5 group">
        <div className="flex items-center gap-2">
          <span className="text-ink3">{icon}</span>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink2 group-hover:text-ink">{title}</span>
          {hint && <span className="text-[10.5px] text-ink3 font-mono">{hint}</span>}
        </div>
        <Icon.ChevD size={12} className="text-ink3" style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition:'transform .15s' }}/>
      </button>
      {open && <div className="fade-in">{children}</div>}
    </div>
  )
}

// ─── Studio screen ────────────────────────────────────────────────────────────

export default function ScriptStudio() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const topicId    = searchParams.get('topicId') || ''
  const topicTitle = searchParams.get('title') ? decodeURIComponent(searchParams.get('title')) : ''
  const topicNiche = searchParams.get('niche') ? decodeURIComponent(searchParams.get('niche')) : 'general'

  const [tone, setTone]     = useState('Storytelling')
  const [format, setFormat] = useState('60s')
  const [saved, setSaved]   = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [recordingOpen, setRecordingOpen] = useState(false)
  const [diffOpen, setDiffOpen] = useState(false)

  // Scene editing modal state
  const [editTarget, setEditTarget] = useState(null)  // { scene, element }
  const [localScript, setLocalScript] = useState(null)  // tracks user edits

  const { isGenerating, steps, script: generatedScript, contentKit, error, regenerating, generate, cancelGeneration, regenerateContentSection } = useScriptGeneration()

  // Use localScript if user has made edits, otherwise use generated
  const script = localScript || generatedScript

  const handleEditElement = ({ scene, element }) => {
    setEditTarget({ scene, element })
  }

  const handleApplyEdit = ({ element, suggestion, scene, cascading }) => {
    setLocalScript(prev => {
      const base = prev || generatedScript
      if (!base) return base
      const updated = { ...base }

      if (element === 'hook') updated.hookLine = suggestion
      else if (element === 'cta') updated.cta = suggestion
      else if (element === 'visual' && scene) {
        updated.scenes = (updated.scenes || []).map(s =>
          s.sceneNumber === scene.sceneNumber ? { ...s, visuals: suggestion } : s
        )
      } else if (element === 'voiceover' && scene) {
        updated.scenes = (updated.scenes || []).map(s =>
          s.sceneNumber === scene.sceneNumber ? { ...s, voiceover: suggestion } : s
        )
      }

      // Apply cascading change if present
      if (cascading?.needed && cascading.suggestion) {
        if (cascading.element === 'voiceover' && scene) {
          updated.scenes = (updated.scenes || []).map(s =>
            s.sceneNumber === scene.sceneNumber ? { ...s, voiceover: cascading.suggestion } : s
          )
        } else if (cascading.element === 'visual' && scene) {
          updated.scenes = (updated.scenes || []).map(s =>
            s.sceneNumber === scene.sceneNumber ? { ...s, visuals: cascading.suggestion } : s
          )
        } else if (cascading.element === 'voiceover' && element === 'hook') {
          if (updated.scenes?.[0]) updated.scenes[0] = { ...updated.scenes[0], voiceover: cascading.suggestion }
        }
      }

      return updated
    })
    toast?.success('Scene updated')
  }

  useEffect(() => {
    if (topicId && !script && !isGenerating) generate(topicId, topicTitle, topicNiche, tone.toLowerCase(), format)
  }, [])

  const handleRegen = () => { setConfirmRegen(false); generate(topicId, topicTitle, topicNiche, tone.toLowerCase(), format) }

  if (!topicId && !script) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-8">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto rounded-xl bg-paper2 border border-line flex items-center justify-center text-ink3 mb-4">
            <Icon.Wand size={22}/>
          </div>
          <h2 className="text-[20px] font-semibold tracking-tight text-ink mb-1">No topic in the press yet</h2>
          <p className="text-[13.5px] text-ink3 leading-relaxed mb-4">Pick a trend from the dashboard and we'll set the type and run a draft.</p>
          <Button variant="primary" icon={<Icon.Arrow size={13}/>} onClick={() => navigate('/dashboard')}>Open dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Studio top bar */}
      <div className="px-6 lg:px-8 py-4 border-b border-line bg-paper flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/dashboard')}
          className="text-ink3 hover:text-ink p-1.5 rounded-md hover:bg-paper2 transition-colors">
          <Icon.ChevL size={16}/>
        </button>
        <div className="flex-1 min-w-0">
          <p className="kicker mb-0.5">Composition</p>
          <h2 className="text-[16px] font-semibold tracking-tight text-ink truncate leading-snug">{topicTitle || script?.topicTitle || 'Script Studio'}</h2>
        </div>

        <Tooltip label="The voice of the draft" placement="bottom">
          <span>
            <Segmented value={tone} onChange={setTone} options={[
              { value:'Storytelling', label:'Story' },
              { value:'Educational',  label:'Teach' },
              { value:'Entertaining', label:'Play' },
              { value:'Controversial',label:'Sharp' },
            ]}/>
          </span>
        </Tooltip>

        <Tooltip label="Target length" placement="bottom">
          <span>
            <Segmented value={format} onChange={setFormat} options={[
              { value:'30s', label:'30s' }, { value:'60s', label:'60s' }, { value:'90s', label:'90s' },
            ]}/>
          </span>
        </Tooltip>

        {script && (
          <ProLock locked={false} feature="Voice coaching">
            <Button variant="soft" size="sm" icon={<Icon.Mic size={13}/>} onClick={() => setRecordingOpen(true)}>
              Practice
            </Button>
          </ProLock>
        )}
        {localScript && generatedScript && (
          <Button variant="ghost" size="sm" icon={<Icon.Eye size={13}/>} onClick={() => setDiffOpen(true)}>
            Changes
          </Button>
        )}
        <Button variant="soft" size="sm" icon={<Icon.Refresh size={13}/>} onClick={() => setConfirmRegen(true)}>Re-forge</Button>

        {script && (
          <Button variant="primary" size="sm"
            icon={saved ? <Icon.Check size={13} stroke={2.5}/> : <Icon.Save size={13}/>}
            onClick={() => {
              setSaved(true)
              toast?.success('Script saved to library', { action:{ label:'Open', onClick:() => navigate('/saved') } })
              setTimeout(() => setSaved(false), 2500)
            }}>
            {saved ? 'Saved' : 'Save to library'}
          </Button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-3 banner banner-error text-[12.5px]">
          <Icon.Alert size={14}/> {error}
        </div>
      )}

      {/* 3-column split */}
      {script ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px_300px] flex-1 overflow-hidden">
          <ScriptPanel script={script} onEditElement={handleEditElement}/>
          <ContentKit contentKit={contentKit} regenerating={regenerating} onRegenerate={regenerateContentSection}/>
          <MemorySidebar niche={topicNiche}/>
        </div>
      ) : !isGenerating ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-14 h-14 mx-auto rounded-xl bg-paper2 border border-line flex items-center justify-center text-ink3 mb-4 opacity-40">
              <Icon.Wand size={22}/>
            </div>
            <p className="text-[13px] text-ink3">Click Re-forge to generate a new script</p>
          </div>
        </div>
      ) : null}

      <AgentOverlay open={isGenerating} steps={steps} onCancel={cancelGeneration}/>

      {/* Script diff view */}
      <ScriptDiff
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        original={generatedScript}
        edited={localScript}
      />

      {/* Recording Studio */}
      <RecordingStudio
        open={recordingOpen}
        onClose={() => setRecordingOpen(false)}
        script={script}
      />

      {/* Per-scene AI edit modal */}
      <SceneEditModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        scene={editTarget?.scene}
        element={editTarget?.element}
        script={script}
        onApply={handleApplyEdit}
      />

      <Confirm
        open={confirmRegen}
        onCancel={() => setConfirmRegen(false)}
        onConfirm={handleRegen}
        kicker="Reset the press"
        title="Re-forge from scratch?"
        message="Your current draft will be replaced with a new one using the selected voice and length. The saved version in your library is safe."
        confirmLabel="Re-forge"
      />
    </div>
  )
}
