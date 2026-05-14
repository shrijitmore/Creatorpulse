import React, { useState } from 'react'
import { Copy, Check, Zap } from 'lucide-react'

function CopyButton({ text, size = 'sm' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded transition-all duration-150"
      style={{
        background: copied ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(191,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? '#BFFF00' : '#71717a'
      }}
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {size === 'sm' && <span className="text-xs font-mono">{copied ? 'COPIED' : 'COPY'}</span>}
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <span
      className="text-xs font-mono font-semibold tracking-widest"
      style={{ color: '#71717a' }}
    >
      {children}
    </span>
  )
}

export default function ScriptPanel({ script }) {
  if (!script) return null

  const allText = [
    `HOOK: ${script.hookLine}`,
    '',
    ...script.scenes.map(s =>
      `SCENE ${s.sceneNumber}:\nVISUALS: ${s.visuals}\nVOICEOVER: ${s.voiceover}`
    ),
    '',
    `CTA: ${script.cta}`
  ].join('\n')

  return (
    <div
      className="h-full overflow-y-auto p-6"
      style={{ scrollbarWidth: 'thin' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2
            className="font-bebas text-2xl leading-tight"
            style={{ color: '#f4f4f5', letterSpacing: '0.04em' }}
          >
            {script.topicTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-xs font-mono px-2 py-0.5 rounded uppercase"
              style={{
                background: 'rgba(191,255,0,0.08)',
                border: '1px solid rgba(191,255,0,0.2)',
                color: '#BFFF00'
              }}
            >
              {script.tone}
            </span>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                background: 'rgba(0,209,255,0.08)',
                border: '1px solid rgba(0,209,255,0.2)',
                color: '#00D1FF'
              }}
            >
              {script.format} REEL
            </span>
          </div>
        </div>
        <CopyButton text={allText} />
      </div>

      {/* Hook Section */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: 'rgba(191,255,0,0.04)',
          border: '1px solid rgba(191,255,0,0.15)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: '#BFFF00' }} />
            <SectionLabel>HOOK (0–3 SEC)</SectionLabel>
          </div>
          <CopyButton text={script.hookLine} />
        </div>
        <p
          className="text-lg leading-snug"
          style={{
            color: '#f4f4f5',
            fontFamily: '"Crimson Pro", serif',
            fontStyle: 'italic'
          }}
        >
          "{script.hookLine}"
        </p>
      </div>

      {/* Scene breakdown */}
      <div className="space-y-3 mb-4">
        <SectionLabel>SCENE BREAKDOWN</SectionLabel>

        {script.scenes.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="rounded-lg p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)'
            }}
          >
            <div className="flex items-start gap-3">
              {/* Scene number badge */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold mt-0.5"
                style={{
                  background: '#BFFF00',
                  color: '#08090D'
                }}
              >
                {scene.sceneNumber}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Visuals */}
                <div>
                  <SectionLabel>VISUALS:</SectionLabel>
                  <p
                    className="text-sm mt-0.5 leading-relaxed"
                    style={{
                      color: '#a1a1aa',
                      fontFamily: '"Crimson Pro", serif'
                    }}
                  >
                    {scene.visuals}
                  </p>
                </div>

                {/* Voiceover */}
                <div>
                  <SectionLabel>VOICEOVER:</SectionLabel>
                  <p
                    className="text-sm mt-0.5 leading-relaxed"
                    style={{
                      color: '#f4f4f5',
                      fontFamily: '"Crimson Pro", serif',
                      fontStyle: 'italic'
                    }}
                  >
                    "{scene.voiceover}"
                  </p>
                </div>
              </div>

              {/* Duration chip + copy */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#71717a',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {scene.duration}
                </span>
                <CopyButton text={`VISUALS: ${scene.visuals}\nVOICEOVER: ${scene.voiceover}`} size="icon" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        className="rounded-lg p-4"
        style={{
          background: 'rgba(255,61,113,0.04)',
          border: '1px solid rgba(255,61,113,0.2)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>CALL TO ACTION</SectionLabel>
          <CopyButton text={script.cta} />
        </div>
        <p
          className="text-sm leading-relaxed"
          style={{
            color: '#f4f4f5',
            fontFamily: '"Crimson Pro", serif',
            fontStyle: 'italic'
          }}
        >
          "{script.cta}"
        </p>
      </div>
    </div>
  )
}
