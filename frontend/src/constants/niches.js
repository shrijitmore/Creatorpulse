/**
 * Niche definitions — single source of truth.
 * Used in onboarding, dashboard filters, scraping, profile.
 */

export const NICHES = [
  { id: 'fitness',   label: 'Fitness',   icon: '💪', color: '#E5EBDB' },
  { id: 'finance',   label: 'Finance',   icon: '💰', color: '#F5EBCF' },
  { id: 'tech',      label: 'Tech',      icon: '⚡', color: '#EDE9FE' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '✨', color: '#FEF3C7' },
  { id: 'food',      label: 'Food',      icon: '🍜', color: '#FCE7F3' },
  { id: 'travel',    label: 'Travel',    icon: '🌍', color: '#DBEAFE' },
  { id: 'beauty',    label: 'Beauty',    icon: '💄', color: '#FCE7F3' },
  { id: 'gaming',    label: 'Gaming',    icon: '🎮', color: '#EDE9FE' },
]

export const NICHE_IDS = NICHES.map(n => n.id)

export const getNiche = (id) => NICHES.find(n => n.id === id)

/** Instagram hashtags per niche (no # prefix — Apify requirement) */
export const NICHE_IG_HASHTAGS = {
  fitness:   ['fitness', 'workout', 'gym', 'fitnessmotivation', 'bodybuilding'],
  finance:   ['investing', 'personalfinance', 'money', 'stockmarket', 'crypto'],
  tech:      ['technology', 'coding', 'programming', 'ai', 'startup'],
  lifestyle: ['lifestyle', 'motivation', 'selfimprovement', 'productivity', 'mindset'],
  food:      ['food', 'foodie', 'recipe', 'cooking', 'healthyfood'],
  travel:    ['travel', 'wanderlust', 'adventure', 'backpacking', 'travelphotography'],
  beauty:    ['beauty', 'skincare', 'makeup', 'beautycare', 'skincareroutine'],
  gaming:    ['gaming', 'gamer', 'videogames', 'esports', 'pcgaming'],
}

/** Reddit subreddits per niche */
export const NICHE_SUBREDDITS = {
  fitness:   ['fitness', 'bodyweightfitness', 'loseit'],
  finance:   ['personalfinance', 'investing', 'financialindependence'],
  tech:      ['technology', 'programming', 'artificial'],
  lifestyle: ['selfimprovement', 'productivity', 'getdisciplined'],
  food:      ['food', 'cooking', 'EatCheapAndHealthy'],
  travel:    ['travel', 'solotravel', 'backpacking'],
  beauty:    ['SkincareAddiction', 'beauty', 'MakeupAddiction'],
  gaming:    ['gaming', 'pcgaming', 'indiegaming'],
}

/** YouTube Data API category IDs per niche */
export const NICHE_YT_CATEGORIES = {
  fitness:   { id: '17', query: 'fitness workout tips' },
  finance:   { id: '27', query: 'personal finance money tips' },
  tech:      { id: '28', query: 'technology ai gadgets' },
  lifestyle: { id: '26', query: 'lifestyle self improvement' },
  food:      { id: '26', query: 'cooking recipes food' },
  travel:    { id: '19', query: 'travel adventure destinations' },
  beauty:    { id: '26', query: 'beauty skincare makeup' },
  gaming:    { id: '20', query: 'gaming tips esports' },
}
