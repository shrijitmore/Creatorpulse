/**
 * Platform definitions — scraping sources + display.
 */

export const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube',   scraper: 'data-api' },
  { id: 'reddit',    label: 'Reddit',    scraper: 'public-api' },
]

export const PLATFORM_FILTER_OPTS = [
  { id: 'all',       label: 'All' },
  { id: 'reddit',    label: 'Reddit' },
  { id: 'youtube',   label: 'YouTube' },
  { id: 'news',      label: 'News' },
]

export const CONTENT_FORMATS = [
  { id: 'on-camera',   label: 'On-camera',     desc: 'Face visible, talking directly' },
  { id: 'voiceover',   label: 'Voiceover only', desc: 'Anonymous, no face shown' },
  { id: 'ai-voice',    label: 'AI voice',       desc: 'AI-generated narration' },
  { id: 'faceless',    label: 'Faceless/text',  desc: 'Slideshow, text-based' },
]

export const LANGUAGE_STYLES = [
  { id: 'english',   label: 'English',   example: '"I woke up at 5AM and everything changed"' },
  { id: 'hinglish',  label: 'Hinglish',  example: '"Bhai, 5AM pe uthna literally life-changing hai"' },
  { id: 'hindi',     label: 'Hindi',     example: '"मैंने 5 बजे उठना शुरू किया"' },
  { id: 'regional',  label: 'Regional',  example: 'Marathi, Kannada, Tamil, Urdu...' },
  { id: 'other',     label: 'Other',     example: 'French, Spanish, German...' },
]

export const CREATOR_GOALS = [
  { id: 'audience',  label: 'Grow audience',    desc: 'Followers, watch time, reach.' },
  { id: 'brand',     label: 'Brand deals',      desc: 'Become a creator brands want.' },
  { id: 'sell',      label: 'Sell a product',   desc: 'Your audience is the lead funnel.' },
  { id: 'community', label: 'Build community',  desc: 'Loyalty and DMs over numbers.' },
]

export const CONTENT_TONES = [
  { id: 'educational',   label: 'Educational',   short: 'Teach' },
  { id: 'entertaining',  label: 'Entertaining',  short: 'Play' },
  { id: 'controversial', label: 'Controversial', short: 'Sharp' },
  { id: 'storytelling',  label: 'Storytelling',  short: 'Story' },
]

export const CONTENT_DURATIONS = [
  { id: '30s', label: '30s', scenes: '3-4' },
  { id: '60s', label: '60s', scenes: '5-6' },
  { id: '90s', label: '90s', scenes: '7-9' },
]
