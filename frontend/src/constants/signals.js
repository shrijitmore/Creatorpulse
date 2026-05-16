/**
 * Signal thresholds, TTL values, scoring constants.
 * Never hardcode these numbers in components.
 */

// Score thresholds for signal classification
export const SIGNAL_THRESHOLDS = {
  viral:  80,   // score >= 80 = viral
  rising: 55,   // score >= 55 = rising
  // below 55 = new
}

// Redis TTL in seconds per signal type
export const CACHE_TTL = {
  viral:  60 * 60 * 1,    // 1 hour  — viral trends die fast
  rising: 60 * 60 * 5,    // 5 hours — rising trends last days
  new:    60 * 60 * 10,   // 10 hours — new trends build slowly
  default:60 * 60 * 2,    // 2 hours — fallback
}

// Signal display config
export const SIGNAL_CONFIG = {
  viral:  { label: 'Viral',  chip: 'error',   icon: 'Flame' },
  rising: { label: 'Rising', chip: 'success', icon: 'Rising' },
  new:    { label: 'New',    chip: 'terra',   icon: 'Sparkle' },
}

export const SIGNAL_FILTER_OPTS = [
  { id: 'all',    label: 'All' },
  { id: 'viral',  label: 'Viral' },
  { id: 'rising', label: 'Rising' },
  { id: 'new',    label: 'New' },
]

// Scraping limits
export const SCRAPING = {
  ig_hashtags_per_niche:    2,   // Instagram hashtags to search per niche
  ig_max_hashtags:          8,   // Max total Instagram hashtags per run
  ig_results_limit:         12,  // Posts to fetch per hashtag
  ig_top_posts_per_run:     8,   // Max Instagram posts to keep after dedup
  ig_rate_limit_delay_ms:   1500, // Min delay between IG requests
  yt_results_per_niche:     5,   // YouTube videos per niche
  reddit_posts_per_search:  4,   // Reddit posts from search
  reddit_hot_per_sub:       3,   // Reddit hot posts from subreddit
  max_niches_per_run:       4,   // Max niches to scrape in one run
  trend_analyst_input_cap:  15,  // Max trends sent to Gemini for analysis
  recommendations_count:    2,   // Picks per platform for editor's section
}

// Scoring weights
export const SCORING = {
  youtube: {
    views_log_multiplier: 12,
    base_score:           20,
  },
  reddit: {
    engagement_divisor:   30000,
    engagement_max_boost: 60,
    base_score:           30,
  },
  instagram: {
    base_score:           30,
    recency_2h:           25,
    recency_12h:          18,
    recency_24h:          12,
    recency_72h:          6,
    video_bonus:          18,
    sidecar_bonus:        8,
    hashtag_sweet_spot:   12,  // 10-25 hashtags
    max_score:            96,
  }
}
