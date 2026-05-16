import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignInButton } from '@clerk/clerk-react'
import { Icon, Wordmark, Logomark, Button, Chip, Pill, Banner, Kbd } from '../components/ui.jsx'
import { updateNiches, completeOnboarding } from '../lib/api.js'
import { CONTENT_FORMATS, LANGUAGE_STYLES, CREATOR_GOALS } from '../constants/platforms.js'

// ─── Static step data ────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',      icon: <Icon.IG size={14}/> },
  { id: 'tiktok',    label: 'TikTok',         icon: <Icon.TikTok size={14}/> },
  { id: 'youtube',   label: 'YouTube Shorts', icon: <Icon.YT size={14}/> },
  { id: 'x',         label: 'X / Twitter',    icon: <Icon.XTwit size={14}/> },
  { id: 'linkedin',  label: 'LinkedIn',       icon: <Icon.LinkedIn size={14}/> },
]

const STYLES = [
  { id: 'educational',   title: 'Educational',   sub: 'Concept → example → takeaway.' },
  { id: 'entertaining',  title: 'Entertaining',  sub: 'Make people stay through the boring middle.' },
  { id: 'controversial', title: 'Controversial', sub: 'Take positions other people won\'t.' },
  { id: 'storytelling',  title: 'Storytelling',  sub: 'Start with a moment. Open cold.' },
]

// ─── Chat bubbles ─────────────────────────────────────────────────────────────

function AiBubble({ text, showTyping = false, delay = 200 }) {
  const [typing, setTyping] = useState(true)
  React.useEffect(() => { const t = setTimeout(() => setTyping(false), delay + 700); return () => clearTimeout(t) }, [])
  return (
    <div className="flex items-end gap-2.5 fade-up">
      <Logomark size={28}/>
      {typing && showTyping
        ? <div className="bubble-ai inline-flex items-center gap-0.5 py-3"><span className="tdot"/><span className="tdot"/><span className="tdot"/></div>
        : <div className="bubble-ai">{text}</div>}
    </div>
  )
}

function UserBubble({ text }) {
  return <div className="flex justify-end fade-up"><div className="bubble-user">{text}</div></div>
}

// ─── Step inputs ─────────────────────────────────────────────────────────────

function NameStep({ onSubmit }) {
  const [v, setV] = useState('')
  const ref = useRef(null)
  React.useEffect(() => { ref.current?.focus() }, [])
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="flex items-end gap-2.5">
        <input ref={ref} value={v} onChange={e => setV(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && v.trim() && onSubmit(v.trim())}
          className="field flex-1" placeholder="e.g. Alex Romero, FitWithJay" autoFocus/>
        <Button variant="primary" disabled={!v.trim()} icon={<Icon.Send size={13}/>}
          onClick={() => v.trim() && onSubmit(v.trim())}>Continue</Button>
      </div>
      <p className="text-[11px] text-ink3 mt-2 flex items-center gap-1.5">Press <Kbd>↵</Kbd> to send</p>
    </div>
  )
}

function PlatformsStep({ onSubmit }) {
  const [sel, setSel] = useState([])
  const toggle = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(p => <Pill key={p.id} active={sel.includes(p.id)} onClick={() => toggle(p.id)} icon={p.icon}>{p.label}</Pill>)}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="primary" disabled={!sel.length} icon={<Icon.Send size={13}/>}
          onClick={() => sel.length && onSubmit(sel.map(id => PLATFORMS.find(p => p.id === id).label).join(', '))}>Continue</Button>
        <span className="text-[11.5px] text-ink3">{sel.length ? `${sel.length} selected` : 'Pick one or more'}</span>
      </div>
    </div>
  )
}

function ContentFormatStep({ onSubmit }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CONTENT_FORMATS.map(f => {
          const on = sel === f.id
          return (
            <button key={f.id} onClick={() => setSel(f.id)} className="text-left p-3.5 rounded-xl border transition-all"
              style={{ background:'#fff', borderColor: on ? 'var(--terra)' : 'var(--line)', boxShadow: on ? '0 0 0 1px var(--terra)' : 'none' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-semibold text-ink">{f.label}</span>
                {on && <span className="w-4 h-4 rounded-full bg-terra flex items-center justify-center"><Icon.Check size={10} stroke={2.6} style={{ color:'#fff' }}/></span>}
              </div>
              <p className="text-[12.5px] text-ink3 leading-relaxed">{f.desc}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-4">
        <Button variant="primary" disabled={!sel} icon={<Icon.Send size={13}/>}
          onClick={() => sel && onSubmit(CONTENT_FORMATS.find(f => f.id === sel).label)}>Continue</Button>
      </div>
    </div>
  )
}

function LanguageStep({ onSubmit }) {
  const [sel, setSel] = useState(null)
  const [custom, setCustom] = useState('')
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {LANGUAGE_STYLES.filter(l => l.id !== 'other').map(l => {
          const on = sel === l.id
          return (
            <button key={l.id} onClick={() => setSel(l.id)} className="text-left p-3.5 rounded-xl border transition-all"
              style={{ background:'#fff', borderColor: on ? 'var(--ink)' : 'var(--line)', boxShadow: on ? '0 0 0 1px var(--ink)' : 'none' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-semibold text-ink">{l.label}</span>
                {on && <span className="w-4 h-4 rounded-full bg-ink flex items-center justify-center"><Icon.Check size={10} stroke={2.6} style={{ color:'#fff' }}/></span>}
              </div>
              <p className="text-[11px] text-ink3 font-mono italic">{l.example}</p>
            </button>
          )
        })}
      </div>
      <div className="flex items-end gap-2.5">
        <input value={custom} onChange={e => { setCustom(e.target.value); setSel(null) }}
          className="field flex-1" placeholder="Or type your language — e.g. Marathi, French, Urdu..."/>
      </div>
      <div className="mt-3">
        <Button variant="primary" disabled={!sel && !custom.trim()} icon={<Icon.Send size={13}/>}
          onClick={() => {
            const val = custom.trim() || LANGUAGE_STYLES.find(l => l.id === sel)?.label || ''
            if (val) onSubmit(val)
          }}>Continue</Button>
      </div>
    </div>
  )
}

function StyleStep({ onSubmit }) {
  const [sel, setSel] = useState([])
  const toggle = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {STYLES.map(s => {
          const on = sel.includes(s.id)
          return (
            <button key={s.id} onClick={() => toggle(s.id)} className="text-left p-3.5 rounded-xl border transition-all"
              style={{ background:'#fff', borderColor: on ? 'var(--terra)' : 'var(--line)', boxShadow: on ? '0 0 0 1px var(--terra)' : 'none' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-semibold text-ink">{s.title}</span>
                {on && <span className="w-4 h-4 rounded-full bg-terra flex items-center justify-center"><Icon.Check size={10} stroke={2.6} style={{ color:'#fff' }}/></span>}
              </div>
              <p className="text-[12.5px] text-ink3 leading-relaxed">{s.sub}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-4">
        <Button variant="primary" disabled={!sel.length} icon={<Icon.Send size={13}/>}
          onClick={() => sel.length && onSubmit(sel.map(id => STYLES.find(s => s.id === id).title).join(' + '))}>Continue</Button>
      </div>
    </div>
  )
}

function AudienceStep({ onSubmit }) {
  const [v, setV] = useState('')
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <textarea className="field" rows={3} value={v} onChange={e => setV(e.target.value)}
        placeholder="e.g. 25–35 year olds building solo brands — they want shortcuts that don't feel like shortcuts."/>
      <p className="text-[11.5px] text-ink3 mt-1.5">Not sure? Leave blank — AI will infer from your niche + style.</p>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" icon={<Icon.Send size={13}/>}
          onClick={() => onSubmit(v.trim() || '(ai-infer)')}>Continue</Button>
        {v.trim().length === 0 && (
          <span className="text-[11.5px] text-ink3">AI will infer if left blank</span>
        )}
      </div>
    </div>
  )
}

function GoalStep({ onSubmit }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CREATOR_GOALS.map(g => {
          const on = sel === g.id
          return (
            <button key={g.id} onClick={() => setSel(g.id)} className="text-left p-3.5 rounded-xl border transition-all"
              style={{ background:'#fff', borderColor: on ? 'var(--ink)' : 'var(--line)', boxShadow: on ? '0 0 0 1px var(--ink)' : 'none' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-semibold text-ink">{g.label}</span>
                {on && <span className="w-4 h-4 rounded-full bg-ink flex items-center justify-center"><Icon.Check size={10} stroke={2.6} style={{ color:'#fff' }}/></span>}
              </div>
              <p className="text-[12.5px] text-ink3 leading-relaxed">{g.desc}</p>
            </button>
          )
        })}
      </div>
      <div className="mt-4">
        <Button variant="primary" disabled={!sel} icon={<Icon.Send size={13}/>}
          onClick={() => sel && onSubmit(CREATOR_GOALS.find(g => g.id === sel).label)}>Continue</Button>
      </div>
    </div>
  )
}

function VoiceStep({ onSubmit, onSkip }) {
  const [v, setV] = useState('')
  return (
    <div className="fade-up pt-3" style={{ animationDelay:'120ms' }}>
      <textarea className="field font-mono" rows={6} value={v} onChange={e => setV(e.target.value)} style={{ fontSize:12.5 }}
        placeholder="Paste a recent caption, reel script, or how you talk on camera. AI will learn your tone, energy, sentence rhythm — and write scripts that sound like YOU."/>
      <Banner kind="info" title="Optional but recommended">
        Without a sample the AI uses your style + goal. With one, your scripts read like you wrote them — not generic AI.
      </Banner>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="primary" disabled={!v.trim()} icon={<Icon.Bolt size={13}/>}
          onClick={() => onSubmit('Trained on your sample (' + v.trim().length + ' chars)')}>Train my voice</Button>
        <button onClick={onSkip} className="text-[12.5px] font-medium text-ink2 hover:text-ink flex items-center gap-1">
          Skip for now <Icon.Arrow size={12}/>
        </button>
      </div>
    </div>
  )
}

// ─── Processing screen ────────────────────────────────────────────────────────

function Processing({ name, onDone }) {
  const STAGES = [
    { label:'Analysing your content style',      sub:'Extracting voice traits, energy, tone patterns' },
    { label:'Inferring your audience',           sub:'Based on niche, platform and content style' },
    { label:'Calibrating the AI voice model',    sub:'Tuning language, rhythm, sentence patterns' },
    { label:'Mapping your niche communities',    sub:'Reading trending content in your topics' },
    { label:'Wiring up your dashboard',          sub:'Personalising trend feed and recommendations' },
  ]
  const [step, setStep] = useState(0)
  React.useEffect(() => {
    if (step >= STAGES.length) { setTimeout(() => onDone?.(), 500); return }
    const t = setTimeout(() => setStep(s => s + 1), 1100)
    return () => clearTimeout(t)
  }, [step])
  return (
    <div className="fade-up py-2">
      <div className="flex items-center gap-2.5 mb-1"><Logomark size={28}/><span className="kicker">Setting up</span></div>
      <h2 className="text-[22px] font-semibold tracking-tight text-ink leading-snug mb-1">Building your profile, {name || 'creator'}</h2>
      <p className="text-[13.5px] text-ink2 mb-5">A minute, tops.</p>
      <div className="space-y-2.5">
        {STAGES.map((s, i) => {
          const done = i < step; const active = i === step
          return (
            <div key={i} className="flex items-start gap-3" style={{ opacity: done || active ? 1 : 0.5, transition:'opacity .3s' }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: done ? 'var(--ink)' : 'var(--paper2)', border:'1px solid', borderColor: done ? 'var(--ink)' : active ? 'var(--terra)' : 'var(--line)' }}>
                {done ? <Icon.Check size={12} stroke={2.5} style={{ color:'#fff' }}/>
                  : active ? <Icon.Refresh size={11} className="spin" style={{ color:'var(--terra)' }}/>
                  : <span className="w-1.5 h-1.5 rounded-full bg-ink4"/>}
              </span>
              <div>
                <p className={`text-[13.5px] font-medium ${done || active ? 'text-ink' : 'text-ink2'}`}>{s.label}</p>
                <p className="text-[11.5px] text-ink3">{s.sub}</p>
              </div>
              {done && <Chip tone="success" icon={<Icon.Check size={10} stroke={2.6}/>}>Done</Chip>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function Welcome({ name, answers, onLaunch }) {
  const rows = [
    { icon:<Icon.Mic size={12}/>,        label:'Style',    val: answers.styles || '—' },
    { icon:<Icon.Target size={12}/>,     label:'Goal',     val: answers.goal || '—' },
    { icon:<Icon.Globe size={12}/>,      label:'Language', val: answers.language || '—' },
    { icon:<Icon.Clapperboard size={12}/>, label:'Format', val: answers.format || '—' },
    { icon:<Icon.Globe size={12}/>,      label:'Platforms', val: (answers.platforms || '—').slice(0, 40) },
  ]
  return (
    <div className="fade-up py-2">
      <div className="flex items-center gap-2.5 mb-1">
        <Logomark size={28}/>
        <Chip tone="success" icon={<Icon.Check size={10} stroke={2.6}/>}>Profile ready</Chip>
      </div>
      <h2 className="text-[26px] font-semibold tracking-[-0.015em] text-ink leading-tight mb-2">
        Welcome, {name || 'creator'}. <span style={{ color:'var(--terra)' }}>Your AI cofounder is calibrated.</span>
      </h2>
      <p className="text-[14px] text-ink2 leading-relaxed mb-5 max-w-md">
        I'll scan your niches every morning and surface the 3 trends most worth your time — in your language, for your platform, in your voice.
      </p>
      <div className="card p-4 mb-5">
        <p className="kicker mb-2.5">What I now know about you</p>
        <div className="grid grid-cols-2 gap-3">
          {rows.map(r => (
            <div key={r.label} className="flex items-start gap-2">
              <span className="mt-0.5 text-ink3">{r.icon}</span>
              <div>
                <p className="text-[10.5px] text-ink3 uppercase tracking-[0.10em] font-medium mb-0.5">{r.label}</p>
                <p className="text-[12.5px] text-ink leading-snug">{r.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button variant="primary" size="lg" iconRight={<Icon.Arrow size={14}/>} onClick={onLaunch}>Open my dashboard</Button>
    </div>
  )
}

// Helper icon (not in Icon object yet)
function ClapperboardIcon(p) {
  return (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z"/>
      <path d="M4 11L2 6l4.5-1.5 2 4"/>
      <path d="M11.5 4.5L14 9h3l-2-4.5"/>
    </svg>
  )
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('asking')
  const [answers, setAnswers] = useState({})
  const scrollerRef = useRef(null)

  const STEPS = [
    { key:'name',      ask:"Let's get acquainted. What should I call you?" },
    { key:'platforms', ask:"Which platforms are you creating for?" },
    { key:'format',    ask:"How do you create content? This shapes how I write your scripts." },
    { key:'language',  ask:"What language style do you create in?" },
    { key:'styles',    ask:"How would you describe your content style? Pick what fits." },
    { key:'audience',  ask:"Who's your ideal viewer? One sentence — or let me infer." },
    { key:'goal',      ask:"What's the main thing you want from your content?" },
    { key:'voice',     ask:"Optional: paste a caption or script so I can learn your voice." },
  ]

  React.useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior:'smooth' })
  }, [step, phase, answers])

  const submit = (key, display) => {
    setAnswers(prev => ({ ...prev, [key]: display }))
    setTimeout(() => {
      if (step + 1 < STEPS.length) setStep(step + 1)
      else setPhase('processing')
    }, 380)
  }

  const handleLaunch = async () => {
    const styleNicheMap = { educational:'tech', entertaining:'lifestyle', controversial:'finance', storytelling:'fitness' }
    const selectedStyles = (answers.styles || '').split(' + ').map(s => s.trim().toLowerCase())
    const niches = [...new Set(selectedStyles.map(s => styleNicheMap[s]).filter(Boolean))]
    const finalNiches = niches.length > 0 ? niches : ['fitness', 'tech', 'finance']

    localStorage.setItem('trendforge_niches', JSON.stringify(finalNiches))
    localStorage.setItem('trendforge_profile', JSON.stringify(answers))

    try {
      await Promise.all([
        updateNiches(finalNiches),
        completeOnboarding({
          creatorName: answers.name || 'Creator',
          platforms: (answers.platforms || '').split(', ').filter(Boolean),
          contentStyles: selectedStyles,
          contentFormat: answers.format || 'on-camera',
          languageStyle: answers.language || 'English',
          audiencePersona: answers.audience === '(ai-infer)' ? '' : (answers.audience || ''),
          primaryGoal: answers.goal || 'Grow audience',
          rawVoiceSample: answers.voice !== '(skipped)' ? answers.voice || '' : '',
        })
      ])
    } catch (err) {
      console.warn('[onboarding] Backend save failed (continuing):', err.message)
    }

    navigate('/dashboard', { replace:true })
  }

  const renderInput = () => {
    const k = STEPS[step].key
    if (k === 'name')      return <NameStep onSubmit={v => submit('name', v)}/>
    if (k === 'platforms') return <PlatformsStep onSubmit={v => submit('platforms', v)}/>
    if (k === 'format')    return <ContentFormatStep onSubmit={v => submit('format', v)}/>
    if (k === 'language')  return <LanguageStep onSubmit={v => submit('language', v)}/>
    if (k === 'styles')    return <StyleStep onSubmit={v => submit('styles', v)}/>
    if (k === 'audience')  return <AudienceStep onSubmit={v => submit('audience', v)}/>
    if (k === 'goal')      return <GoalStep onSubmit={v => submit('goal', v)}/>
    if (k === 'voice')     return <VoiceStep onSubmit={v => submit('voice', v)} onSkip={() => submit('voice','(skipped)')}/>
  }

  const transcript = []
  for (let i = 0; i <= step && i < STEPS.length; i++) {
    transcript.push({ kind:'ai', text: STEPS[i].ask, key:`ai-${i}` })
    if (answers[STEPS[i].key]) transcript.push({ kind:'user', text: answers[STEPS[i].key], key:`user-${i}` })
  }

  const progress = phase === 'asking' ? (step / STEPS.length) : phase === 'processing' ? 0.88 : 1

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="h-[56px] flex items-center justify-between px-6 border-b border-line">
        <Wordmark/>
        <SignInButton forceRedirectUrl="/onboarding">
          <Button variant="soft" size="sm">Sign in</Button>
        </SignInButton>
      </header>
      <div className="h-[2px] bg-paper2">
        <div className="h-full bg-terra transition-all duration-500" style={{ width:`${progress * 100}%` }}/>
      </div>
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[640px]">
          {step === 0 && phase === 'asking' && Object.keys(answers).length === 0 && (
            <div className="text-center mb-8 fade-up">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terrasoft border border-[#EBD3B6] text-terradeep text-[12px] font-medium mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-terra inline-block"/> Setting up your AI cofounder
              </div>
              <h1 className="text-[36px] sm:text-[44px] font-semibold tracking-[-0.02em] text-ink leading-[1.05] mb-3">
                Make content people actually <em>want</em>.
              </h1>
              <p className="text-[15px] text-ink2 max-w-md mx-auto leading-relaxed">
                Eight questions. Two minutes. Then I'll scan your niches every morning and surface the trends most worth your time — in your language, in your voice.
              </p>
            </div>
          )}
          <div className="card overflow-hidden">
            <div ref={scrollerRef} className="p-5 sm:p-7 space-y-3 overflow-y-auto" style={{ maxHeight:'64vh', minHeight:400 }}>
              {phase === 'processing' ? <Processing name={answers.name} onDone={() => setPhase('welcome')}/>
               : phase === 'welcome'  ? <Welcome name={answers.name} answers={answers} onLaunch={handleLaunch}/>
               : (
                <>
                  {transcript.map((m, i) =>
                    m.kind === 'ai'
                      ? <AiBubble key={m.key} text={m.text} showTyping={i === transcript.length - 1 && !answers[STEPS[step]?.key]}/>
                      : <UserBubble key={m.key} text={m.text}/>
                  )}
                  {!answers[STEPS[step]?.key] && renderInput()}
                </>
              )}
            </div>
            {phase === 'asking' && (
              <div className="px-5 sm:px-7 py-3 border-t border-line bg-paper flex items-center justify-between">
                <span className="text-[11px] text-ink3 font-medium">Step {step + 1} of {STEPS.length}</span>
                <span className="text-[11px] text-ink3">Skip anytime</span>
              </div>
            )}
          </div>
          {step === 0 && phase === 'asking' && Object.keys(answers).length === 0 && (
            <p className="mt-6 text-center text-[11px] text-ink3 fade-up" style={{ animationDelay:'200ms' }}>
              Industry-standard encryption · Trusted by 70,000+ creators
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
