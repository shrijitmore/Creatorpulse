import React from 'react'

/**
 * Single source of truth for the Influensa brand lockup.
 * variant="light" uses the inverted (white) logo for dark backgrounds.
 * The logo is a full icon + wordmark, so no separate text node is needed.
 */
export default function BrandLogo({ variant = 'dark', height = 24, href = '/', className = 'brand', style }) {
  const base = variant === 'light' ? '/logo-influensa-light' : '/logo-influensa'
  return (
    <a className={className} href={href} aria-label="Influensa — home" style={style}>
      <img
        src={`${base}.png`}
        srcSet={`${base}.png 1x, ${base}@2x.png 2x`}
        alt="Influensa"
        width={Math.round(height * 1.5)}
        height={height}
        style={{ height, width: 'auto', display: 'block' }}
      />
    </a>
  )
}
