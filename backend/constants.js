/**
 * Backend constants — shared across agents, routes, services.
 */

export const NICHES_DEFAULT = ['fitness', 'finance', 'tech', 'lifestyle', 'food', 'travel', 'beauty', 'gaming']

// Billing — amounts in paise (INR × 100) for Razorpay
export const PLAN_AMOUNTS = {
  pro:    { monthly: 99900,   yearly: 958800  },
  agency: { monthly: 499900,  yearly: 4799040 },
}

export const COUPON_DISCOUNTS = {
  LAUNCH20: 0.20,
}

export const PLAN_IDS = ['free', 'pro', 'agency']

export const SIGNAL_THRESHOLDS = { viral: 80, rising: 55 }

export const CACHE_TTL = {
  viral:   60 * 60 * 1,
  rising:  60 * 60 * 5,
  new:     60 * 60 * 10,
  default: 60 * 60 * 2,
}

export const SCRAPING = {
  ig_hashtags_per_niche:    2,
  ig_max_hashtags:          8,
  ig_results_limit:         12,
  ig_top_posts_per_run:     8,
  ig_rate_limit_delay_ms:   1500,
  yt_results_per_niche:     5,
  reddit_posts_per_search:  4,
  reddit_hot_per_sub:       3,
  max_niches_per_run:       4,
  trend_analyst_input_cap:  15,
  recommendations_count:    2,
}

export const GEMINI = {
  model:             'gemini-2.5-flash',
  analyst_temp:      0.2,
  analyst_tokens:    8000,
  writer_temp:       0.7,
  writer_tokens:     3000,
  hooks_temp:        0.8,
  hooks_tokens:      2000,
  onboarding_temp:   0.2,
  onboarding_tokens: 2500,
}

export const SCORING = {
  youtube: { log_mult: 12, base: 20 },
  reddit:  { divisor: 30000, max_boost: 60, base: 30 },
  instagram: {
    base: 30,
    recency: { h2: 25, h12: 18, h24: 12, h72: 6 },
    video_bonus: 18,
    sidecar_bonus: 8,
    hashtag_bonus: 12,
    max: 96,
  }
}

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
