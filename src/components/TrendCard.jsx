import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const PLATFORM_BADGES = {
  instagram: {
    label: 'Instagram',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433"/>
            <stop offset="25%" stopColor="#e6683c"/>
            <stop offset="50%" stopColor="#dc2743"/>
            <stop offset="75%" stopColor="#cc2366"/>
            <stop offset="100%" stopColor="#bc1888"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="url(#ig-grad)"/>
        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" fill="none"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
      </svg>
    ),
    color: '#e6683c'
  },
  x: {
    label: 'X / Twitter',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#e5e5e5'
  },
  reddit: {
    label: 'Reddit',
    icon: (
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#FF4500"/>
        <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .98-1.08 1 1 0 0 0-.95.68l-2.37-.5a.26.26 0 0 0-.3.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .39c0 2 2.33 3.61 5.2 3.61s5.2-1.61 5.2-3.61a2.87 2.87 0 0 0 0-.39 1.46 1.46 0 0 0 .91-1.51zm-9.38 1.39a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.55 2.65a3.45 3.45 0 0 1-2.84.73 3.45 3.45 0 0 1-2.84-.73.26.26 0 0 1 .37-.37 2.94 2.94 0 0 0 2.47.55 2.94 2.94 0 0 0 2.47-.55.26.26 0 0 1 .37.37zm-.13-1.65a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
      </svg>
    ),
    color: '#FF4500'
  }
}

const SIGNAL_CONFIG = {
  viral: {
    label: '🔥 VIRAL',
    bg: '#FF3D71',
    text: '#fff'
  },
  rising: {
    label: '📈 RISING',
    bg: '#BFFF00',
    text: '#08090D'
  },
  new: {
    label: '🆕 NEW',
    bg: '#00D1FF',
    text: '#08090D'
  }
}

export default function TrendCard({ trend, index = 0, featured = false }) {
  const navigate = useNavigate()
  const [hovering, setHovering] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  const platform = PLATFORM_BADGES[trend.platform] || PLATFORM_BADGES.instagram
  const signal = SIGNAL_CONFIG[trend.signal] || SIGNAL_CONFIG.new

  const handleGenerate = () => {
    navigate(`/studio?topicId=${trend.id}&title=${encodeURIComponent(trend.title)}`)
  }

  return (
    <div
      className="fade-up relative flex flex-col rounded-lg cursor-default"
      style={{
        animationDelay: `${0.05 * index}s`,
        background: hovering
          ? 'rgba(255,255,255,0.06)'
          : featured
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(255,255,255,0.03)',
        border: featured
          ? '1px solid transparent'
          : hovering
            ? '1px solid rgba(255,255,255,0.14)'
            : '1px solid rgba(255,255,255,0.07)',
        backgroundImage: featured
          ? 'linear-gradient(rgba(8,9,13,0.95), rgba(8,9,13,0.95)), linear-gradient(135deg, #BFFF00, #00D1FF)'
          : 'none',
        backgroundOrigin: featured ? 'border-box' : 'padding-box',
        backgroundClip: featured ? 'padding-box, border-box' : 'padding-box',
        boxShadow: hovering
          ? '0 0 24px rgba(191,255,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'
          : featured
            ? '0 0 20px rgba(0,209,255,0.05)'
            : 'none',
        transition: 'all 0.2s ease',
        minHeight: '280px'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {featured && (
        <div
          className="absolute -top-px left-4 px-2 py-0.5 text-xs font-mono font-medium"
          style={{
            background: 'linear-gradient(135deg, #BFFF00, #00D1FF)',
            color: '#08090D',
            borderRadius: '0 0 4px 4px'
          }}
        >
          AI PICK
        </div>
      )}

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Header row: platform + signal */}
        <div className="flex items-center justify-between gap-2">
          {/* Platform badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: platform.color
            }}
          >
            {platform.icon}
            <span className="hidden sm:inline">{platform.label}</span>
          </div>

          {/* Signal badge */}
          <div
            className="px-2 py-0.5 rounded text-xs font-mono font-bold"
            style={{
              background: signal.bg,
              color: signal.text
            }}
          >
            {signal.label}
          </div>
        </div>

        {/* Niche tag */}
        <div
          className="inline-flex self-start px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wider"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#71717a',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {trend.niche}
        </div>

        {/* Title */}
        <h3
          className="font-bebas text-xl leading-tight flex-1"
          style={{ color: '#f4f4f5', letterSpacing: '0.03em' }}
        >
          {trend.title}
        </h3>

        {/* Summary */}
        <p
          className="text-sm leading-snug"
          style={{
            color: '#a1a1aa',
            fontFamily: '"Crimson Pro", serif',
            fontStyle: 'italic'
          }}
        >
          {trend.summary}
        </p>

        {/* Engagement score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: '#71717a' }}>
              SIGNAL SCORE
            </span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: trend.score > 90 ? '#BFFF00' : trend.score > 80 ? '#00D1FF' : '#a1a1aa' }}
            >
              {trend.score}
            </span>
          </div>
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${trend.score}%`,
                background: trend.score > 90
                  ? '#BFFF00'
                  : trend.score > 80
                    ? '#00D1FF'
                    : 'rgba(255,255,255,0.3)',
                boxShadow: trend.score > 90
                  ? '0 0 8px rgba(191,255,0,0.6)'
                  : trend.score > 80
                    ? '0 0 8px rgba(0,209,255,0.4)'
                    : 'none'
              }}
            />
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-mono font-medium uppercase tracking-wider transition-all duration-150"
          style={{
            background: btnHover ? '#BFFF00' : 'transparent',
            border: '1px solid rgba(191,255,0,0.5)',
            color: btnHover ? '#08090D' : '#BFFF00',
            transform: btnHover ? 'translateY(-1px)' : 'none',
            boxShadow: btnHover ? '0 4px 16px rgba(191,255,0,0.2)' : 'none'
          }}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
        >
          GENERATE REEL
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
