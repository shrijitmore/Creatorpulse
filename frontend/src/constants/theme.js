/**
 * Design tokens — single source of truth for all visual values.
 * Import from here, never hardcode colors/sizes/shadows.
 */

export const COLORS = {
  // Backgrounds
  paper:      '#FBF9F4',
  paper2:     '#F4EFE5',
  card:       '#FFFFFF',

  // Text
  ink:        '#1A1714',
  ink2:       '#524A3F',
  ink3:       '#8B8170',
  ink4:       '#BBB4A4',

  // Borders
  line:       '#E8E2D2',
  line2:      '#F0EBDF',

  // Brand accent
  terra:      '#C47338',
  terrasoft:  '#F5E4D0',
  terradeep:  '#A35C26',

  // Status
  success:    '#5E8049',
  successsoft:'#E5EBDB',
  warn:       '#C28A2F',
  warnsoft:   '#F5EBCF',
  error:      '#C04A2E',
  errorsoft:  '#F5DDD2',
}

export const SHADOWS = {
  card: '0 1px 0 rgba(26,23,20,0.04), 0 1px 2px rgba(26,23,20,0.04)',
  lift: '0 4px 16px -4px rgba(26,23,20,0.10), 0 1px 0 rgba(26,23,20,0.04)',
  pop:  '0 12px 32px -8px rgba(26,23,20,0.14), 0 2px 4px rgba(26,23,20,0.04)',
}

export const RADIUS = {
  sm:   '6px',
  md:   '8px',
  lg:   '10px',
  xl:   '12px',
  xxl:  '16px',
  full: '999px',
}

export const FONT = {
  sans: 'Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", monospace',
  size: {
    xs:   '10.5px',
    sm:   '11.5px',
    base: '13.5px',
    md:   '14px',
    lg:   '16px',
    xl:   '20px',
    xxl:  '28px',
  }
}

export const ANIMATION = {
  fast:   '0.12s ease',
  normal: '0.2s ease',
  slow:   '0.35s cubic-bezier(.16,1,.3,1)',
}
