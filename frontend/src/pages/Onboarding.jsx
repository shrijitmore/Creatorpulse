import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { updateNiches, completeOnboarding, transcribeVoice } from '../lib/api.js'
import { CONTENT_FORMATS, LANGUAGE_STYLES, CREATOR_GOALS } from '../constants/platforms.js'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',      icon: 'IG' },
  { id: 'tiktok',    label: 'TikTok',         icon: 'TK' },
  { id: 'youtube',   label: 'YouTube Shorts', icon: 'YT' },
  { id: 'x',         label: 'X / Twitter',    icon: 'X' },
  { id: 'linkedin',  label: 'LinkedIn',       icon: 'LI' },
]

const STYLES = [
  { id: 'educational',   title: 'Educational',   sub: 'Concept → example → takeaway.' },
  { id: 'entertaining',  title: 'Entertaining',  sub: 'Make people stay through the boring middle.' },
  { id: 'controversial', title: 'Controversial', sub: 'Take positions other people won\'t.' },
  { id: 'storytelling',  title: 'Storytelling',  sub: 'Start with a moment. Open cold.' },
]

// ─── Step components ──────────────────────────────────────────────────────────

function NameStep({ onNext }) {
  const [v, setV] = useState('')
  const ref = useRef(null)
  React.useEffect(() => { ref.current?.focus() }, [])
  return (
    <div>
      <h2 className="h3" style={{ marginBottom: 8 }}>What should I call you?</h2>
      <p className="body" style={{ marginBottom: 32 }}>Your creator name, how you appear to your audience.</p>
      <div className="row" style={{ gap: 12 }}>
        <input
          ref={ref}
          className="input input-lg"
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && v.trim() && onNext(v.trim())}
          placeholder="e.g. Alex Romero, FitWithJay"
          style={{ flex: 1 }}
        />
        <button
          className="btn btn-primary btn-lg"
          disabled={!v.trim()}
          onClick={() => v.trim() && onNext(v.trim())}>
          Continue →
        </button>
      </div>
      <p className="small" style={{ marginTop: 10, color: 'var(--mute-2)' }}>Press Enter to continue</p>
    </div>
  )
}

function TileStep({ question, sub, items, multi = false, onNext }) {
  const [sel, setSel] = useState(multi ? [] : null)
  const toggle = (id) => {
    if (multi) {
      setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      setSel(id)
    }
  }
  const canContinue = multi ? sel.length > 0 : sel !== null
  const handleNext = () => {
    if (!canContinue) return
    const picked = multi
      ? items.filter(it => sel.includes(it.id)).map(it => it.label || it.title).join(', ')
      : (items.find(it => it.id === sel)?.label || items.find(it => it.id === sel)?.title || '')
    onNext(picked)
  }
  return (
    <div>
      <h2 className="h3" style={{ marginBottom: 8 }}>{question}</h2>
      {sub && <p className="body" style={{ marginBottom: 32 }}>{sub}</p>}
      <div className="onb-tiles">
        {items.map(it => {
          const active = multi ? sel.includes(it.id) : sel === it.id
          return (
            <button
              key={it.id}
              className={`onb-tile ${active ? 'active' : ''}`}
              onClick={() => toggle(it.id)}>
              {it.icon && <span className="tile-icon">{it.icon}</span>}
              <span className="tile-label">{it.label || it.title}</span>
              {it.sub && <span className="small" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--mute)' }}>{it.sub}</span>}
              {it.desc && <span className="small" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--mute)' }}>{it.desc}</span>}
              {it.example && <span className="mono small" style={{ fontStyle: 'italic', color: active ? 'rgba(255,255,255,0.7)' : 'var(--mute-2)', fontSize: 11 }}>{it.example}</span>}
            </button>
          )
        })}
      </div>
      <div className="onb-nav">
        <span className="small">{multi ? (sel.length > 0 ? `${sel.length} selected` : 'Pick one or more') : 'Pick one'}</span>
        <button className="btn btn-primary" disabled={!canContinue} onClick={handleNext}>
          Continue →
        </button>
      </div>
    </div>
  )
}

function AudienceStep({ onNext }) {
  const [v, setV] = useState('')
  return (
    <div>
      <h2 className="h3" style={{ marginBottom: 8 }}>Who's your ideal viewer?</h2>
      <p className="body" style={{ marginBottom: 32 }}>One sentence, or let AI infer from your niche + style.</p>
      <textarea
        className="textarea"
        rows={4}
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder="e.g. 25–35 year olds building solo brands — they want shortcuts that don't feel like shortcuts."
      />
      <p className="small" style={{ marginTop: 8, color: 'var(--mute-2)' }}>Leave blank, AI will infer from your niche + style.</p>
      <div className="onb-nav">
        <button className="btn btn-ghost" onClick={() => onNext('(ai-infer)')}>Skip → AI will infer</button>
        <button className="btn btn-primary" onClick={() => onNext(v.trim() || '(ai-infer)')}>Continue →</button>
      </div>
    </div>
  )
}

const SUPPORTED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

function VoiceStep({ onNext, onSkip }) {
  const [mode, setMode] = useState('text')         // 'text' | 'mic'
  const [v, setV] = useState('')
  const [recState, setRecState] = useState('idle') // 'idle' | 'recording' | 'processing' | 'error'
  const [duration, setDuration] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const mimeRef = useRef('audio/webm')

  const MAX_SECONDS = 90
  const hasMicSupport = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  React.useEffect(() => () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const startRecording = async () => {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      const supportedMime = SUPPORTED_MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : {})
      mimeRef.current = mr.mimeType || 'audio/webm'
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleStop
      mr.start(250)
      mediaRef.current = mr
      setRecState('recording')
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d + 1 >= MAX_SECONDS) { stopRecording(); return d + 1 }
          return d + 1
        })
      }, 1000)
    } catch (err) {
      setErrorMsg(err.name === 'NotAllowedError'
        ? 'Mic access denied — allow microphone in your browser settings.'
        : 'Could not access microphone.')
    }
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    setRecState('processing')
  }

  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current })
    if (blob.size < 500) {
      setRecState('idle')
      setErrorMsg('Recording too short — hold for at least 3 seconds.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const result = await transcribeVoice(base64, mimeRef.current.split(';')[0])
        setV(result.transcript || '')
        setMode('text')
        setRecState('idle')
        if (!result.transcript) setErrorMsg('No speech detected — paste your script instead.')
      } catch {
        setMode('text')
        setRecState('idle')
        setErrorMsg('Transcription failed — paste your script instead.')
      }
    }
    reader.readAsDataURL(blob)
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div>
      <h2 className="h3" style={{ marginBottom: 8 }}>Optional: capture your voice</h2>
      <p className="body" style={{ marginBottom: 24 }}>
        AI learns your tone, energy, sentence rhythm and writes scripts that sound like YOU.
        Without a sample, scripts use your style + goal settings.
      </p>

      <div className="voice-tabs">
        <button className={`voice-tab ${mode === 'text' ? 'active' : ''}`} onClick={() => { setMode('text'); setErrorMsg('') }}>
          Paste text
        </button>
        {hasMicSupport && (
          <button className={`voice-tab ${mode === 'mic' ? 'active' : ''}`} onClick={() => { setMode('mic'); setErrorMsg('') }}>
            Record voice
          </button>
        )}
      </div>

      {mode === 'text' && (
        <>
          <textarea
            className="textarea mono"
            rows={7}
            value={v}
            onChange={e => setV(e.target.value)}
            style={{ fontFamily: 'var(--mono)', fontSize: 13 }}
            placeholder="Paste a recent caption, reel script, or how you talk on camera..."
          />
          <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <p className="small"><strong style={{ color: 'var(--ink)' }}>Tip:</strong> Even 2–3 sentences helps. The more you paste, the more the scripts sound like you.</p>
          </div>
        </>
      )}

      {mode === 'mic' && (
        <div className="voice-recorder">
          {recState === 'idle' && (
            <>
              <button className="mic-btn" onClick={startRecording} aria-label="Start recording">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              <p className="body" style={{ marginTop: 16, color: 'var(--ink)', fontWeight: 500 }}>Click to start recording</p>
              <p className="small" style={{ marginTop: 8, color: 'var(--mute)', maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
                Explain a topic in your niche, read a past script, or just talk for 15–30 seconds.
              </p>
            </>
          )}

          {recState === 'recording' && (
            <>
              <button className="mic-btn recording" onClick={stopRecording} aria-label="Stop recording">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              </button>
              <p className="body" style={{ marginTop: 16, color: 'var(--ink)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(duration)}
              </p>
              <p className="small" style={{ marginTop: 6, color: 'var(--mute)' }}>Recording… click to stop</p>
              {duration >= MAX_SECONDS - 10 && (
                <p className="small" style={{ marginTop: 4, color: '#f59e0b' }}>Stopping soon ({MAX_SECONDS - duration}s left)</p>
              )}
            </>
          )}

          {recState === 'processing' && (
            <>
              <div className="mic-btn" style={{ cursor: 'default', opacity: 0.5 }}>
                <span className="tdot" style={{ margin: 0 }}/>
              </div>
              <p className="body" style={{ marginTop: 16, color: 'var(--mute)' }}>Analysing your voice…</p>
              <p className="small" style={{ marginTop: 6, color: 'var(--mute-2)' }}>Transcribing + extracting style traits</p>
            </>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="small" style={{ marginTop: 10, color: '#ef4444' }}>{errorMsg}</p>
      )}

      <div className="onb-nav">
        <button className="btn btn-ghost" onClick={onSkip}>Skip for now</button>
        <button
          className="btn btn-primary"
          disabled={!v.trim() || recState === 'recording' || recState === 'processing'}
          onClick={() => onNext(`Trained on your sample (${v.trim().length} chars)`)}>
          Train my voice →
        </button>
      </div>
    </div>
  )
}

// ─── Processing ────────────────────────────────────────────────────────────────

function Processing({ name, onDone }) {
  const STAGES = [
    { label: 'Analysing your content style',    sub: 'Extracting voice traits, energy, tone patterns' },
    { label: 'Inferring your audience',         sub: 'Based on niche, platform and content style' },
    { label: 'Calibrating the AI voice model',  sub: 'Tuning language, rhythm, sentence patterns' },
    { label: 'Mapping your niche communities',  sub: 'Reading trending content in your topics' },
    { label: 'Wiring up your dashboard',        sub: 'Personalising trend feed and recommendations' },
  ]
  const [step, setStep] = useState(0)
  React.useEffect(() => {
    if (step >= STAGES.length) { setTimeout(() => onDone?.(), 500); return }
    const t = setTimeout(() => setStep(s => s + 1), 1100)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="fade-up">
      <span className="kicker" style={{ marginBottom: 16 }}>Setting up</span>
      <h2 className="h3" style={{ marginBottom: 6 }}>Building your profile, {name || 'creator'}</h2>
      <p className="body" style={{ marginBottom: 36 }}>A minute, tops.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {STAGES.map((s, i) => {
          const done = i < step; const active = i === step
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, opacity: done || active ? 1 : 0.4, transition: 'opacity .3s' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'var(--ink)' : active ? 'var(--paper-2)' : 'var(--paper-3)', border: `1px solid ${done ? 'var(--ink)' : active ? 'var(--ink)' : 'var(--line)'}`, transition: 'all .3s' }}>
                {done
                  ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : active
                  ? <span className="tdot" style={{ margin: 0 }}/>
                  : <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mute-2)', display: 'block' }}/>}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: done || active ? 500 : 400, color: done || active ? 'var(--ink)' : 'var(--ink-2)' }}>{s.label}</p>
                <p className="small" style={{ marginTop: 2 }}>{s.sub}</p>
              </div>
              {done && <span className="chip" style={{ marginLeft: 'auto', flexShrink: 0 }}>Done</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

function Welcome({ name, answers, onLaunch }) {
  return (
    <div className="fade-up">
      <span className="chip active" style={{ marginBottom: 20 }}>Profile ready</span>
      <h2 className="h2" style={{ marginBottom: 12 }}>
        Welcome, {name || 'creator'}.<br/>
        <span style={{ color: 'var(--mute)' }}>Your AI cofounder is calibrated.</span>
      </h2>
      <p className="body" style={{ marginBottom: 32, maxWidth: 480 }}>
        I'll scan your niches every morning and surface the 3 trends most worth your time,
        in your language, for your platform, in your voice.
      </p>
      <div className="card" style={{ marginBottom: 32, maxWidth: 560 }}>
        <span className="label" style={{ marginBottom: 16 }}>What I now know about you</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Style', val: answers.styles || '—' },
            { label: 'Goal', val: answers.goal || '—' },
            { label: 'Language', val: answers.language || '—' },
            { label: 'Format', val: answers.format || '—' },
            { label: 'Platforms', val: (answers.platforms || '—').slice(0, 36) },
          ].map(r => (
            <div key={r.label}>
              <span className="label">{r.label}</span>
              <p style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{r.val}</p>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-primary btn-lg" onClick={onLaunch}>
        Open my dashboard →
      </button>
    </div>
  )
}

// ─── Launching ────────────────────────────────────────────────────────────────

function Launching({ name }) {
  const LINES = [
    'Fetching live trends for your niches…',
    'Calibrating your AI voice model…',
    'Personalising your feed…',
    'Almost there…',
  ]
  const [idx, setIdx] = useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, LINES.length - 1)), 1400)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 0', gap: 20 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--paper-3)', borderTopColor: 'var(--ink)', animation: 'spin 0.8s linear infinite' }}/>
      <div>
        <h2 className="h3" style={{ marginBottom: 8 }}>Opening your dashboard</h2>
        <p className="small" style={{ color: 'var(--mute)', minHeight: 18, transition: 'opacity .3s' }}>{LINES[idx]}</p>
      </div>
    </div>
  )
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('asking') // 'asking' | 'processing' | 'welcome'
  const [answers, setAnswers] = useState({})

  const STEPS = [
    { key: 'name' },
    { key: 'platforms' },
    { key: 'format' },
    { key: 'language' },
    { key: 'styles' },
    { key: 'audience' },
    { key: 'goal' },
    { key: 'voice' },
  ]

  const submit = (key, display) => {
    const next = { ...answers, [key]: display }
    setAnswers(next)
    if (step + 1 < STEPS.length) {
      setTimeout(() => setStep(s => s + 1), 200)
    } else {
      setPhase('processing')
    }
  }

  const handleLaunch = async () => {
    setPhase('launching')

    const styleNicheMap = { educational: 'tech', entertaining: 'lifestyle', controversial: 'finance', storytelling: 'fitness' }
    const selectedStyles = (answers.styles || '').split(', ').map(s => s.trim().toLowerCase())
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

    navigate('/dashboard', { replace: true })
  }

  const progress = phase === 'asking' ? step / STEPS.length : phase === 'processing' ? 0.88 : 1

  const renderStep = () => {
    const k = STEPS[step].key
    if (k === 'name') return <NameStep onNext={v => submit('name', v)}/>
    if (k === 'platforms') return (
      <TileStep
        question="Which platforms are you creating for?"
        sub="Pick all that apply. This shapes where we look for trends."
        items={PLATFORMS}
        multi
        onNext={v => submit('platforms', v)}
      />
    )
    if (k === 'format') return (
      <TileStep
        question="How do you create content?"
        sub="This shapes how I write your scripts."
        items={CONTENT_FORMATS}
        onNext={v => submit('format', v)}
      />
    )
    if (k === 'language') return (
      <TileStep
        question="What language style do you create in?"
        items={LANGUAGE_STYLES.filter(l => l.id !== 'other')}
        onNext={v => submit('language', v)}
      />
    )
    if (k === 'styles') return (
      <TileStep
        question="How would you describe your content style?"
        sub="Pick what fits. Your scripts will match."
        items={STYLES}
        multi
        onNext={v => submit('styles', v)}
      />
    )
    if (k === 'audience') return <AudienceStep onNext={v => submit('audience', v)}/>
    if (k === 'goal') return (
      <TileStep
        question="What's the main thing you want from your content?"
        items={CREATOR_GOALS}
        onNext={v => submit('goal', v)}
      />
    )
    if (k === 'voice') return (
      <VoiceStep
        onNext={v => submit('voice', v)}
        onSkip={() => submit('voice', '(skipped)')}
      />
    )
  }

  return (
    <div className="onb">
      {/* Top bar */}
      <div className="onb-top">
        <a className="brand" href="/"><span className="mark"/>Creatorpulse</a>
        <div className="onb-progress">
          <div className="onb-bar">
            <span className="onb-bar-fill" style={{ width: `${progress * 100}%` }}/>
          </div>
          {phase === 'asking' && (
            <span className="small" style={{ color: 'var(--mute)', whiteSpace: 'nowrap' }}>
              {step + 1} / {STEPS.length}
            </span>
          )}
        </div>
        {!isSignedIn && (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/sign-in')}>Sign in</button>
        )}
      </div>

      {/* Main */}
      <div className="onb-main">
        <div className="onb-card">
          {phase === 'processing'
            ? <Processing name={answers.name} onDone={() => setPhase('welcome')}/>
            : phase === 'launching'
            ? <Launching name={answers.name}/>
            : phase === 'welcome'
            ? <Welcome name={answers.name} answers={answers} onLaunch={handleLaunch}/>
            : (
              <div className="onb-step active">
                {renderStep()}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
