export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Start building your creator presence.',
    price: 0,
    cta: 'Get started',
    recommended: false,
    features: [
      '5 scripts per month',
      '3 niche categories',
      'English only',
      'Reddit + YouTube trends',
      'Basic script templates',
    ],
    limits: { scripts: 5, niches: 3 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Everything a full-time creator needs.',
    price: 999,
    cta: 'Upgrade to Pro',
    recommended: true,
    features: [
      'Unlimited scripts',
      'All platforms + 10 languages',
      'Recording Studio + AI coaching',
      'Instagram + TikTok trends',
      'Priority trend scraping',
      'Voice profile training',
      'Content calendar export',
    ],
    limits: { scripts: Infinity, niches: Infinity },
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'For teams managing multiple creators.',
    price: 4999,
    cta: 'Upgrade to Agency',
    recommended: false,
    features: [
      'Everything in Pro',
      'Up to 10 creator profiles',
      'Bulk script generation',
      'Advanced engagement analytics',
      'White-label exports',
      'Dedicated onboarding call',
      'Priority support (< 4h response)',
    ],
    limits: { scripts: Infinity, niches: Infinity },
  },
]

export const COMPARE_ROWS = [
  { feature: 'Scripts per month',    free: '5',             pro: 'Unlimited',    agency: 'Unlimited' },
  { feature: 'Niche categories',     free: '3',             pro: 'All',          agency: 'All' },
  { feature: 'Languages',            free: 'English',       pro: '10+',          agency: '10+' },
  { feature: 'Trend sources',        free: 'Reddit · YT',   pro: 'All platforms',agency: 'All platforms' },
  { feature: 'Recording Studio',     free: false,           pro: true,           agency: true },
  { feature: 'AI coaching',          free: false,           pro: true,           agency: true },
  { feature: 'Instagram trends',     free: false,           pro: true,           agency: true },
  { feature: 'Priority scraping',    free: false,           pro: true,           agency: true },
  { feature: 'Voice profile',        free: false,           pro: true,           agency: true },
  { feature: 'Creator profiles',     free: '1',             pro: '1',            agency: 'Up to 10' },
  { feature: 'Bulk generation',      free: false,           pro: false,          agency: true },
  { feature: 'White-label exports',  free: false,           pro: false,          agency: true },
  { feature: 'Dedicated support',    free: false,           pro: false,          agency: true },
]

export const USAGE_THRESHOLDS = {
  danger:  80,
  warning: 60,
}

export const PLAN_FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your settings at any time — you keep Pro access until the end of the billing period. No lock-ins, no questions asked.',
  },
  {
    q: 'What happens when I hit the script limit on Free?',
    a: "You'll see a prompt to upgrade. Your existing scripts are never deleted — you just can't generate new ones until the next month or you upgrade.",
  },
  {
    q: 'Is billing yearly or monthly?',
    a: 'Both. Monthly billing gives you flexibility; yearly billing saves you 20% — that\'s roughly 2 months free.',
  },
  {
    q: 'Do you store my payment details?',
    a: 'No. Payments are handled entirely by Razorpay (PCI-DSS Level 1 certified). We never see or store your card information.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes — upgrade or downgrade anytime. Downgrades take effect at the end of your current billing cycle.',
  },
  {
    q: "What counts as a 'script'?",
    a: "Each time you generate a full script (hook + scenes + CTA) in Script Studio, it counts as one. Regenerating a single scene section doesn't use a credit.",
  },
]
