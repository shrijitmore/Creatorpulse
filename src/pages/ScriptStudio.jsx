import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Wand2, Save, BookMarked } from 'lucide-react'
import AgentProgress from '../components/AgentProgress.jsx'
import ScriptPanel from '../components/ScriptPanel.jsx'
import ContentKitPanel from '../components/ContentKitPanel.jsx'
import { useScriptGeneration } from '../hooks/useScriptGeneration.js'
import { saveScript } from '../lib/api.js'

const TONES = [
  { id: 'educational', label: 'Educational' },
  { id: 'entertaining', label: 'Entertaining' },
  { id: 'controversial', label: 'Controversial' },
  { id: 'storytelling', label: 'Storytelling' }
]

const FORMATS = [
  { id: '30s', label: '30s' },
  { id: '60s', label: '60s' },
  { id: '90s', label: '90s' }
]

export default function ScriptStudio() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const topicId = searchParams.get('topicId') || ''
  const topicTitle = searchParams.get('title') ? decodeURIComponent(searchParams.get('title')) : ''

  const [tone, setTone] = useState('storytelling')
  const [format, setFormat] = useState('60s')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [activeTab, setActiveTab] = useState('script') // for mobile

  const {
    isGenerating,
    steps,
    script,
    contentKit,
    error,
    regenerating,
    generate,
    cancelGeneration,
    regenerateContentSection
  } = useScriptGeneration()

  // Auto-generate when topicId is available and no script yet
  useEffect(() => {
    if (topicId && !script && !isGenerating) {
      generate(topicId, tone, format)
    }
  }, []) // Only on mount

  const handleGenerate = () => {
    if (!topicId) return
    setSaved(false)
    generate(topicId, tone, format)
  }

  const handleSave = async () => {
    if (!script) return
    setSaveError('')
    try {
      await saveScript({
        topicTitle: script.topicTitle || topicTitle,
        niche: script.niche || 'general',
        format,
        tone,
        platform: script.platform || 'instagram'
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError('Failed to save script')
    }
  }

  // If no topicId, show topic selector
  if (!topicId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center px-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'rgba(191,255,0,0.06)',
              border: '1px solid rgba(191,255,0,0.15)'
            }}
          >
            <Wand2 size={24} style={{ color: '#BFFF00' }} />
          </div>
          <h2
            className="font-bebas text-3xl mb-2"
            style={{ color: '#f4f4f5', letterSpacing: '0.05em' }}
          >
            NO TOPIC SELECTED
          </h2>
          <p
            className="mb-6 text-sm"
            style={{
              color: '#71717a',
              fontFamily: '"Crimson Pro", serif',
              fontStyle: 'italic'
            }}
          >
            Head to the Dashboard to pick a trending topic
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-md text-sm font-mono transition-all"
            style={{
              background: 'rgba(191,255,0,0.08)',
              border: '1px solid rgba(191,255,0,0.25)',
              color: '#BFFF00'
            }}
          >
            <ArrowLeft size={14} />
            GO TO DASHBOARD
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Studio top bar */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-shrink-0 p-1.5 rounded transition-colors"
            style={{ color: '#71717a' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f4f4f5'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
          >
            <ArrowLeft size={18} />
          </button>
          <h1
            className="font-bebas text-2xl leading-tight truncate"
            style={{ color: '#f4f4f5', letterSpacing: '0.04em' }}
          >
            {topicTitle || 'SCRIPT STUDIO'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tone selector */}
          <div className="flex gap-1">
            {TONES.map(t => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className="pill-btn px-2.5 py-1.5 rounded text-xs font-mono transition-all"
                style={{
                  background: tone === t.id ? '#BFFF00' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${tone === t.id ? '#BFFF00' : 'rgba(255,255,255,0.08)'}`,
                  color: tone === t.id ? '#08090D' : '#a1a1aa'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Format selector */}
          <div className="flex gap-1">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className="pill-btn px-2.5 py-1.5 rounded text-xs font-mono transition-all"
                style={{
                  background: format === f.id ? 'rgba(0,209,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${format === f.id ? 'rgba(0,209,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: format === f.id ? '#00D1FF' : '#a1a1aa'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Regenerate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
            style={{
              background: isGenerating ? 'rgba(255,255,255,0.04)' : 'rgba(191,255,0,0.1)',
              border: `1px solid ${isGenerating ? 'rgba(255,255,255,0.08)' : 'rgba(191,255,0,0.3)'}`,
              color: isGenerating ? '#3f3f46' : '#BFFF00',
              cursor: isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            <Wand2 size={12} />
            REGENERATE
          </button>

          {/* Save button */}
          {script && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all"
              style={{
                background: saved ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${saved ? 'rgba(191,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: saved ? '#BFFF00' : '#a1a1aa'
              }}
            >
              {saved ? <BookMarked size={12} /> : <Save size={12} />}
              {saved ? 'SAVED!' : 'SAVE'}
            </button>
          )}
        </div>
      </div>

      {/* Mobile tabs */}
      {script && (
        <div
          className="lg:hidden flex border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          {[
            { id: 'script', label: 'SCRIPT' },
            { id: 'kit', label: 'CONTENT KIT' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 text-xs font-mono transition-all"
              style={{
                color: activeTab === tab.id ? '#BFFF00' : '#71717a',
                borderBottom: `2px solid ${activeTab === tab.id ? '#BFFF00' : 'transparent'}`
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div
          className="mx-6 mt-3 px-3 py-2 rounded text-xs font-mono"
          style={{
            background: 'rgba(255,61,113,0.08)',
            border: '1px solid rgba(255,61,113,0.2)',
            color: '#FF3D71'
          }}
        >
          {saveError}
        </div>
      )}

      {/* Error state */}
      {error && !isGenerating && (
        <div
          className="mx-6 mt-3 px-3 py-2 rounded text-xs font-mono"
          style={{
            background: 'rgba(255,61,113,0.08)',
            border: '1px solid rgba(255,61,113,0.2)',
            color: '#FF3D71'
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Main split layout */}
      {script ? (
        <>
          {/* Desktop split */}
          <div className="hidden lg:grid studio-split flex-1 overflow-hidden">
            <ScriptPanel script={script} />
            <ContentKitPanel
              contentKit={contentKit}
              regenerating={regenerating}
              onRegenerate={regenerateContentSection}
            />
          </div>

          {/* Mobile single panel */}
          <div className="lg:hidden flex-1 overflow-hidden">
            {activeTab === 'script'
              ? <ScriptPanel script={script} />
              : <ContentKitPanel
                  contentKit={contentKit}
                  regenerating={regenerating}
                  onRegenerate={regenerateContentSection}
                />
            }
          </div>
        </>
      ) : !isGenerating ? (
        /* Waiting state */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(191,255,0,0.04)',
                border: '1px solid rgba(191,255,0,0.1)'
              }}
            >
              <Wand2 size={24} style={{ color: '#BFFF00', opacity: 0.4 }} />
            </div>
            <p
              className="text-sm"
              style={{
                color: '#71717a',
                fontFamily: '"Crimson Pro", serif',
                fontStyle: 'italic'
              }}
            >
              Click REGENERATE to forge your script
            </p>
          </div>
        </div>
      ) : null}

      {/* Agent progress overlay */}
      {isGenerating && (
        <AgentProgress steps={steps} onCancel={cancelGeneration} />
      )}
    </div>
  )
}
