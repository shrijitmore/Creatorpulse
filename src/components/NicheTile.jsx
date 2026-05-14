import React from 'react'

export default function NicheTile({ niche, selected, onToggle, size = 'normal' }) {
  const handleClick = () => {
    onToggle(niche.id)
  }

  const isSmall = size === 'small'

  return (
    <button
      onClick={handleClick}
      className={`
        glass-card rounded-lg transition-all duration-200 cursor-pointer
        flex flex-col items-center justify-center gap-2 font-mono
        ${isSmall ? 'p-3' : 'p-5'}
        ${selected ? 'tile-select-anim' : ''}
      `}
      style={{
        background: selected ? 'rgba(191,255,0,0.08)' : 'rgba(255,255,255,0.03)',
        border: selected
          ? '1px solid rgba(191,255,0,0.6)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: selected
          ? '0 0 16px rgba(191,255,0,0.15), inset 0 0 12px rgba(191,255,0,0.04)'
          : 'none',
        transform: selected ? 'translateY(-1px)' : 'none'
      }}
    >
      <span className={isSmall ? 'text-xl' : 'text-3xl'}>{niche.icon}</span>
      <span
        className={`font-medium uppercase tracking-wider ${isSmall ? 'text-xs' : 'text-xs'}`}
        style={{ color: selected ? '#BFFF00' : '#a1a1aa' }}
      >
        {niche.label}
      </span>
    </button>
  )
}
