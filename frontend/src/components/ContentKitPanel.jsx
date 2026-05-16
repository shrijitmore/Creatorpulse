import React, { useState } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'

function CopyButton({ text, label = 'COPY' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all"
      style={{
        background: copied ? 'rgba(191,255,0,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${copied ? 'rgba(191,255,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? '#BFFF00' : '#71717a'
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'COPIED' : label}
    </button>
  )
}

function RegenerateButton({ onClick, loading, label = 'REGEN' }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-all"
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.1)',
        color: loading ? '#3f3f46' : '#71717a',
        cursor: loading ? 'not-allowed' : 'pointer'
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = 'rgba(191,255,0,0.3)'; e.currentTarget.style.color = '#BFFF00' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; if (!loading) e.currentTarget.style.color = '#71717a' }}
    >
      <RefreshCw size={11} className={loading ? 'spin' : ''} />
      {label}
    </button>
  )
}

function SectionHeader({ title, actions }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span
        className="text-xs font-mono font-semibold tracking-widest"
        style={{ color: '#71717a' }}
      >
        {title}
      </span>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  )
}

const HOOK_VARIANT_LABELS = ['Storytelling', 'Bold Claim', 'Question']
const HOOK_COLORS = ['#BFFF00', '#FF3D71', '#00D1FF']

export default function ContentKitPanel({ contentKit, regenerating = {}, onRegenerate }) {
  if (!contentKit) return null

  const allHashtags = [
    ...(contentKit.hashtags?.niche || []),
    ...(contentKit.hashtags?.trending || []),
    ...(contentKit.hashtags?.broad || [])
  ].join(' ')

  return (
    <div
      className="h-full overflow-y-auto p-6 border-l"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        scrollbarWidth: 'thin'
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className="font-bebas text-xl tracking-widest"
          style={{ color: '#f4f4f5', letterSpacing: '0.1em' }}
        >
          CONTENT KIT
        </h3>
        <p
          className="text-xs mt-0.5"
          style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif' }}
        >
          Everything you need to publish
        </p>
      </div>

      {/* ── Section 1: Hook Variants ── */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}
      >
        <SectionHeader
          title="3 HOOK VARIANTS"
          actions={
            <RegenerateButton
              onClick={() => onRegenerate?.('hooks')}
              loading={regenerating.hooks}
            />
          }
        />

        <div className="space-y-3">
          {(contentKit.hookVariants || []).map((hook, idx) => {
            const hookText = typeof hook === 'string' ? hook : hook.text
            const hookType = typeof hook === 'string' ? HOOK_VARIANT_LABELS[idx] : hook.type

            return (
              <div
                key={idx}
                className="rounded p-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${HOOK_COLORS[idx] || '#BFFF00'}22`
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: `${HOOK_COLORS[idx] || '#BFFF00'}15`,
                      color: HOOK_COLORS[idx] || '#BFFF00',
                      border: `1px solid ${HOOK_COLORS[idx] || '#BFFF00'}30`
                    }}
                  >
                    {hookType || HOOK_VARIANT_LABELS[idx]}
                  </span>
                  <CopyButton text={hookText} />
                </div>
                <p
                  className="text-sm leading-snug"
                  style={{
                    color: '#f4f4f5',
                    fontFamily: '"Crimson Pro", serif',
                    fontStyle: 'italic'
                  }}
                >
                  "{hookText}"
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section 2: Instagram Caption ── */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}
      >
        <SectionHeader
          title="INSTAGRAM CAPTION"
          actions={
            <>
              <CopyButton text={contentKit.caption || ''} />
              <RegenerateButton
                onClick={() => onRegenerate?.('caption')}
                loading={regenerating.caption}
              />
            </>
          }
        />
        <div
          className="rounded p-3 text-sm leading-relaxed whitespace-pre-line"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.05)',
            color: '#d4d4d8',
            fontFamily: '"Crimson Pro", serif',
            fontSize: '13px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {contentKit.caption}
        </div>
      </div>

      {/* ── Section 3: Hashtags ── */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}
      >
        <SectionHeader
          title="HASHTAGS"
          actions={
            <>
              <CopyButton text={allHashtags} label="COPY ALL" />
              <RegenerateButton
                onClick={() => onRegenerate?.('hashtags')}
                loading={regenerating.hashtags}
              />
            </>
          }
        />

        {/* Niche hashtags */}
        <div className="mb-3">
          <span
            className="text-xs font-mono block mb-2"
            style={{ color: '#3f3f46' }}
          >
            NICHE
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(contentKit.hashtags?.niche || []).map(tag => (
              <HashtagPill key={tag} tag={tag} color="#BFFF00" />
            ))}
          </div>
        </div>

        {/* Trending hashtags */}
        <div className="mb-3">
          <span
            className="text-xs font-mono block mb-2"
            style={{ color: '#3f3f46' }}
          >
            TRENDING
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(contentKit.hashtags?.trending || []).map(tag => (
              <HashtagPill key={tag} tag={tag} color="#FF3D71" />
            ))}
          </div>
        </div>

        {/* Broad hashtags */}
        <div>
          <span
            className="text-xs font-mono block mb-2"
            style={{ color: '#3f3f46' }}
          >
            BROAD
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(contentKit.hashtags?.broad || []).map(tag => (
              <HashtagPill key={tag} tag={tag} color="#00D1FF" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 4: Thumbnail Text ── */}
      <div
        className="rounded-lg p-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}
      >
        <SectionHeader
          title="THUMBNAIL TEXT"
          actions={
            <>
              <CopyButton text={contentKit.thumbnailText || ''} />
              <RegenerateButton
                onClick={() => onRegenerate?.('thumbnail')}
                loading={regenerating.thumbnail}
              />
            </>
          }
        />

        {/* Mock phone frame preview */}
        <div
          className="phone-frame mx-auto overflow-hidden"
          style={{ width: '140px', aspectRatio: '9/16', position: 'relative' }}
        >
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.7) 100%)'
            }}
          />
          {/* Grid overlay for reel aesthetic */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, transparent 1px, transparent 20px)'
            }}
          />

          {/* Thumbnail text centered */}
          <div
            className="absolute inset-0 flex items-center justify-center p-3"
          >
            <p
              className="text-center font-bebas leading-tight"
              style={{
                color: '#BFFF00',
                fontSize: '13px',
                letterSpacing: '0.05em',
                textShadow: '0 0 20px rgba(191,255,0,0.5), 0 2px 4px rgba(0,0,0,0.8)',
                wordBreak: 'break-word'
              }}
            >
              {contentKit.thumbnailText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HashtagPill({ tag, color }) {
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(tag)
    } catch {
      const el = document.createElement('textarea')
      el.value = tag
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <button
      onClick={handleClick}
      className="px-2 py-0.5 rounded text-xs font-mono transition-all duration-150"
      style={{
        background: copied ? `${color}20` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${copied ? color + '40' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? color : '#a1a1aa',
        cursor: 'pointer'
      }}
      title="Click to copy"
    >
      {tag}
    </button>
  )
}
