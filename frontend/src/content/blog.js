// Blog content store. Add an entry here → a new indexable /blog/:slug page exists
// and is picked up by the sitemap generator. Body blocks: {h2}, {p}, {ul:[...]}.

export const POSTS = [
  {
    slug: 'how-to-find-viral-content-ideas',
    title: 'How to Find Viral Content Ideas Before They Peak',
    description: 'A repeatable system for spotting trending topics early using engagement velocity across YouTube and Reddit — so you post while a trend is still rising.',
    date: '2026-06-10',
    updated: '2026-06-10',
    author: 'Influensa',
    tags: ['trends', 'content strategy'],
    readMins: 6,
    body: [
      { p: 'Most creators find trends too late — after a topic has already peaked and the feed is saturated. The creators who grow consistently do the opposite: they catch a signal while it is still rising. Here is the system.' },
      { h2: 'Why timing beats quality' },
      { p: 'A good video on a rising trend outperforms a great video on a dead one. The algorithm rewards early movers because they satisfy a demand the platform is already seeing spike. Your job is to detect that spike before everyone else does.' },
      { h2: 'Measure engagement velocity, not raw views' },
      { p: 'Raw view counts tell you what already won. Engagement velocity — how fast a topic is gaining likes, comments, and shares per hour — tells you what is about to win. Track the rate of change, not the total.' },
      { ul: [
        'Scan multiple platforms hourly (YouTube + Reddit cover most niches).',
        'Score each topic by recent engagement growth, not lifetime totals.',
        'Filter to your niche so you only see relevant, on-brand signals.',
      ] },
      { h2: 'Turn a signal into a script in minutes' },
      { p: 'Speed compounds. Once you spot a rising topic, the bottleneck becomes writing. This is exactly what Influensa automates: it surfaces scored trends for your niche and drafts a full scene-by-scene script in your voice, so you can ship while the trend is still climbing.' },
      { h2: 'A simple weekly cadence' },
      { ul: [
        'Daily: skim your scored trend feed for rising signals.',
        'Pick one topic with strong velocity and clear relevance.',
        'Generate and edit a script, then record the same day.',
      ] },
    ],
  },
  {
    slug: 'ai-script-writing-for-reels',
    title: 'AI Script Writing for Reels: A Creator\'s Guide',
    description: 'How to use AI to write short-form scripts that actually sound like you — covering hooks, structure, voice training, and the edits that matter.',
    date: '2026-06-12',
    updated: '2026-06-12',
    author: 'Influensa',
    tags: ['ai', 'scriptwriting'],
    readMins: 7,
    body: [
      { p: 'Generic AI output is obvious — and audiences scroll past it. The goal is not to let AI replace your voice, but to draft in your voice so you spend your time editing, not staring at a blank page.' },
      { h2: 'Start with the hook' },
      { p: 'The first two seconds decide everything. A strong hook makes a promise or creates a gap the viewer needs closed. Generate several hook variants and pick the one that is most specific.' },
      { h2: 'Train the model on your voice' },
      { p: 'Paste a few of your best past captions or scripts. A good tool uses these to match your phrasing, rhythm, and energy — the difference between "AI wrote this" and "this sounds like me on my best day."' },
      { h2: 'Structure for retention' },
      { ul: [
        'Hook — promise or pattern interrupt.',
        'Payoff stack — deliver value in tight, scannable beats.',
        'CTA — one clear next action.',
      ] },
      { h2: 'Edit like a director' },
      { p: 'AI gives you the draft; you give it judgment. Cut filler, sharpen the hook, and make every line earn the next. With Influensa you can edit any line with a prompt and it reasons through cascade effects so the script stays coherent.' },
    ],
  },
  {
    slug: 'youtube-vs-reddit-trend-research',
    title: 'YouTube vs Reddit for Trend Research: Which Wins?',
    description: 'Both surfaces reveal what audiences want — but in different ways. Here is how to use each for creator trend research, and why you should combine them.',
    date: '2026-06-14',
    updated: '2026-06-14',
    author: 'Influensa',
    tags: ['trends', 'research'],
    readMins: 5,
    body: [
      { p: 'YouTube and Reddit answer two different questions. Used together, they give you both demand and language — what people want, and how they talk about it.' },
      { h2: 'YouTube: proven format demand' },
      { p: 'YouTube shows you which formats and topics already convert attention into watch time. Rising videos in your niche reveal angles the audience is actively rewarding right now.' },
      { h2: 'Reddit: raw language and pain points' },
      { p: 'Reddit shows you the exact words your audience uses, the questions they ask, and the frustrations they vent. That language makes your hooks and scripts resonate.' },
      { h2: 'Combine them' },
      { ul: [
        'Use YouTube to confirm a format has demand.',
        'Use Reddit to find the specific angle and phrasing.',
        'Score both by recent engagement growth to catch rising topics early.',
      ] },
      { p: 'Influensa scans both every hour, scores each signal for your niche, and turns the winner into a script — so research and writing become one fast step.' },
    ],
  },
]

export const getPost = (slug) => POSTS.find(p => p.slug === slug)
