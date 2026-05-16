import React, { useState, useRef, useCallback } from 'react'
import { Icon, Button, Chip, Modal } from '../../components/ui.jsx'

const SCORE_COLOR = (s) => s >= 8 ? 'var(--success)' : s >= 6 ? 'var(--terra)' : 'var(--error)'
const SCORE_LABEL = (s) => s >= 8 ? 'Strong' : s >= 6 ? 'Good' : 'Needs work'

/**
 * Recording Studio — scene-by-scene teleprompter + audio recording + AI coaching.
 * Audio sent to backend /api/recording/analyse → Gemini audio analysis.
 */
export default function RecordingStudio({ open, onClose, script }) {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [phase, setPhase] = useState('teleprompter')  // teleprompter | recording | analysing | feedback | done
  const [recordings, setRecordings] = useState({})    // sceneNumber → { blob, feedback }
  const [currentFeedback, setCurrentFeedback] = useState(null)
  const [followupText, setFollowupText] = useState('')
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isRecording, setIsRecording] = useState(false)

  if (!script || !open) return null

  const allScenes = script.scenes || []
  const scene = allScenes[sceneIdx]
  const isLastScene = sceneIdx === allScenes.length - 1
  const completedCount = Object.keys(recordings).length

  // ── Recording controls ──────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => handleRecordingStop()

      mr.start(100)
      setIsRecording(true)
      setPhase('recording')
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone in browser settings.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(timerRef.current)
    setIsRecording(false)
    setPhase('analysing')
  }, [])

  const handleRecordingStop = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

    // Convert to base64 for API
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const res = await fetch('/api/recording/analyse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: 'audio/webm',
            sceneText: scene?.voiceover || '',
            sceneNumber: scene?.sceneNumber,
            scriptTone: script.tone,
            niche: script.niche,
          })
        })
        const data = await res.json()
        const feedback = data.data || data
        setCurrentFeedback(feedback)
        setRecordings(prev => ({ ...prev, [scene.sceneNumber]: { blob, feedback } }))
        setPhase('feedback')
      } catch (err) {
        setError('Analysis failed. Check your connection and try again.')
        setPhase('teleprompter')
      }
    }
    reader.readAsDataURL(blob)
  }, [scene, script])

  // Get token from Clerk (stored by TokenRegistrar in App.jsx via apiClient)
  const getToken = async () => {
    try {
      const { getAuthHeaders } = await import('../../lib/apiClient.js')
      const headers = await getAuthHeaders()
      return headers.Authorization?.replace('Bearer ', '') || ''
    } catch { return '' }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goNext = () => {
    setCurrentFeedback(null)
    setPhase('teleprompter')
    setRecordingTime(0)
    if (!isLastScene) setSceneIdx(i => i + 1)
    else setPhase('done')
  }

  const reRecord = () => {
    setCurrentFeedback(null)
    setPhase('teleprompter')
    setRecordingTime(0)
  }

  const handleClose = () => {
    stopRecording()
    setSceneIdx(0); setPhase('teleprompter'); setRecordings({}); setCurrentFeedback(null); setError(null)
    onClose()
  }

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  // ── Session summary ─────────────────────────────────────────────────────────

  if (phase === 'done') {
    const scores = Object.values(recordings).map(r => r.feedback?.overallScore || 0)
    const avg = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0
    const totalFillers = Object.values(recordings).reduce((a, r) => a + (r.feedback?.fillerWords?.count || 0), 0)
    return (
      <Modal open={open} onClose={handleClose} title="Session complete" kicker="Recording studio" width="md">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--successsoft)', border:'1px solid var(--success)' }}>
            <Icon.Check size={28} style={{ color:'var(--success)' }}/>
          </div>
          <h3 className="text-[22px] font-semibold tracking-tight text-ink mb-1">
            {allScenes.length} scenes recorded
          </h3>
          <p className="text-[13.5px] text-ink3 mb-6">Here's your session summary</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label:'Overall score', value:`${avg}/10`, color: SCORE_COLOR(avg) },
              { label:'Scenes done',   value:`${completedCount}/${allScenes.length}`, color:'var(--ink)' },
              { label:'Filler words',  value:String(totalFillers), color: totalFillers > 5 ? 'var(--error)' : 'var(--success)' },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <p className="text-[22px] font-semibold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-ink3 uppercase tracking-[0.06em] font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <Button variant="primary" onClick={handleClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Recording Studio" kicker={`Scene ${(scene?.sceneNumber || 1)} of ${allScenes.length}`} width="lg">
      <div className="space-y-4">

        {/* Progress */}
        <div className="flex items-center gap-2">
          {allScenes.map((s, i) => (
            <div key={s.sceneNumber} className="flex-1 h-1 rounded-full"
              style={{ background: recordings[s.sceneNumber] ? 'var(--success)' : i === sceneIdx ? 'var(--terra)' : 'var(--line)' }}/>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="banner banner-error text-[12.5px]">
            <Icon.Alert size={14}/> {error}
          </div>
        )}

        {/* PHASE: Teleprompter */}
        {(phase === 'teleprompter' || phase === 'recording') && scene && (
          <div className="space-y-3">
            <div>
              <p className="kicker mb-1.5">📷 Visuals — do this first</p>
              <div className="card-soft rounded-lg p-3 text-[13.5px] text-ink2 leading-relaxed">
                {scene.visuals}
              </div>
            </div>
            <div>
              <p className="kicker mb-1.5">🎙️ Voiceover — say this</p>
              <div className="card p-4 border-l-[3px] text-[16px] font-medium text-ink leading-relaxed"
                style={{ borderLeftColor:'var(--terra)', background: phase === 'recording' ? '#FFFBF7' : '#fff' }}>
                "{scene.voiceover}"
              </div>
            </div>

            {phase === 'teleprompter' ? (
              <Button variant="primary" size="lg" className="w-full justify-center"
                icon={<span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"/>}
                onClick={startRecording}>
                Start recording this scene
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="terra" size="lg" className="flex-1 justify-center"
                  icon={<Icon.Check size={15}/>} onClick={stopRecording}>
                  Stop recording
                </Button>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-paper">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                  <span className="text-[14px] font-mono text-ink">{fmt(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE: Analysing */}
        {phase === 'analysing' && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <span className="tdot"/><span className="tdot"/><span className="tdot"/>
            </div>
            <p className="text-[14px] font-medium text-ink">Analysing your delivery…</p>
            <p className="text-[12.5px] text-ink3 mt-1">Checking words, tone, energy, confidence</p>
          </div>
        )}

        {/* PHASE: Feedback */}
        {phase === 'feedback' && currentFeedback && (
          <div className="space-y-3 fade-in">
            {/* Score row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label:'Overall',    val: currentFeedback.overallScore },
                { label:'Accuracy',   val: currentFeedback.scriptAccuracy?.score },
                { label:'Confidence', val: currentFeedback.confidence?.score },
                { label:'Energy',     val: currentFeedback.energy?.score },
              ].map(s => (
                <div key={s.label} className="card p-2.5 text-center">
                  <p className="text-[20px] font-semibold tabular-nums" style={{ color: SCORE_COLOR(s.val || 0) }}>{s.val ?? '—'}</p>
                  <p className="text-[10px] text-ink3 uppercase tracking-[0.06em] font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Encouragement */}
            {currentFeedback.encouragement && (
              <div className="rounded-lg p-3 border" style={{ background:'var(--successsoft)', borderColor:'var(--success)' }}>
                <p className="text-[12.5px] flex items-start gap-2" style={{ color:'var(--success)' }}>
                  <Icon.Star size={13} className="flex-shrink-0 mt-0.5"/> {currentFeedback.encouragement}
                </p>
              </div>
            )}

            {/* Top fixes */}
            {currentFeedback.topFixes?.length > 0 && (
              <div>
                <p className="kicker mb-2">Top fixes</p>
                <div className="space-y-1.5">
                  {currentFeedback.topFixes.map((fix, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12.5px] text-ink2">
                      <span className="w-5 h-5 rounded-full bg-terra text-white flex items-center justify-center font-mono text-[9px] flex-shrink-0">{i+1}</span>
                      {fix}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filler words */}
            {(currentFeedback.fillerWords?.count || 0) > 0 && (
              <div className="card p-3">
                <p className="text-[12px] font-semibold text-ink mb-1.5">
                  {currentFeedback.fillerWords.count} filler word{currentFeedback.fillerWords.count > 1 ? 's' : ''} detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentFeedback.fillerWords.list?.map((f, i) => (
                    <span key={i} className="text-[11px] font-mono px-2 py-0.5 rounded bg-paper2 border border-line text-ink2">
                      "{f.word}" @{f.position}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Voice raise */}
            {(currentFeedback.voiceRaise?.missed?.length > 0) && (
              <div className="card p-3">
                <p className="kicker mb-1.5">Voice emphasis</p>
                {currentFeedback.voiceRaise.correct?.map((c, i) => (
                  <p key={i} className="text-[12px] text-ink3 flex items-start gap-1.5 mb-1">
                    <Icon.Check size={11} stroke={2.5} style={{ color:'var(--success)', flexShrink:0, marginTop:1 }}/>{c}
                  </p>
                ))}
                {currentFeedback.voiceRaise.missed?.map((m, i) => (
                  <p key={i} className="text-[12px] text-ink3 flex items-start gap-1.5">
                    <Icon.Alert size={11} style={{ color:'var(--warn)', flexShrink:0, marginTop:1 }}/>{m}
                  </p>
                ))}
              </div>
            )}

            {/* Improvisation detected */}
            {currentFeedback.improvisation?.detected && (
              <div className="banner banner-info text-[12.5px]">
                <Icon.Info size={13}/>
                <div>
                  <strong>You went off-script:</strong> "{currentFeedback.improvisation.improvisedText}"
                  {currentFeedback.improvisation.better && (
                    <p className="mt-1">This improvised version is actually <strong>better</strong>. Should we update the script?</p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button variant="primary" icon={<Icon.Arrow size={13}/>}
                onClick={goNext}>
                {isLastScene ? 'Finish session' : `Next: Scene ${allScenes[sceneIdx + 1]?.sceneNumber || ''}`}
              </Button>
              <Button variant="soft" icon={<Icon.Refresh size={13}/>} onClick={reRecord}>
                Re-record this scene
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
