// Single source of truth for SEO metadata. No hardcoded strings in components.

export const SITE = {
  name: 'Influensa',
  url: 'https://influensa.xyz',
  defaultTitle: 'Influensa — AI content intelligence for creators',
  description:
    'Influensa is your AI cofounder for content. Discover viral trends across YouTube and Reddit, then generate scripts that sound like you — in 60 seconds.',
  ogImage: 'https://influensa.xyz/og-image.png',
  themeColor: '#0A0A0A',
  twitter: '@influensa',
  locale: 'en_US',
}

// Per-route metadata. Public routes are indexable; app/auth/utility routes are not.
export const ROUTE_SEO = {
  '/': {
    title: 'Influensa — AI content intelligence for creators',
    description: SITE.description,
    noindex: false,
  },
  '/pricing':  { title: 'Pricing — Influensa', description: 'Simple, creator-friendly pricing. Start free, upgrade to Pro for unlimited AI scripts, voice training, and cross-platform trend signals.', noindex: false },
  '/blog':     { title: 'Blog — Influensa', description: 'Playbooks on viral trends, AI scriptwriting, and growing as a creator.', noindex: false },
  '/glossary': { title: 'Creator glossary — Influensa', description: 'Plain-English definitions of the content, trend, and growth terms every creator should know.', noindex: false },
  '/terms':    { title: 'Terms of Service — Influensa', description: 'The terms governing use of Influensa.', noindex: false },
  '/privacy':  { title: 'Privacy Policy — Influensa', description: 'How Influensa collects, uses, and protects your data.', noindex: false },
  '/refund':   { title: 'Refund & Cancellation Policy — Influensa', description: 'How cancellations and refunds work on Influensa.', noindex: false },
  '/contact':  { title: 'Contact — Influensa', description: 'Get in touch with the Influensa team.', noindex: false },
  '/sign-in':  { title: 'Sign in · Influensa',        noindex: true },
  '/sign-up':  { title: 'Create your account · Influensa', noindex: true },
  '/onboarding': { title: 'Set up your profile · Influensa', noindex: true },
  '/dashboard': { title: 'Dashboard · Influensa',     noindex: true },
  '/studio':    { title: 'Script studio · Influensa',  noindex: true },
  '/saved':     { title: 'Library · Influensa',        noindex: true },
  '/profile':   { title: 'Creator profile · Influensa', noindex: true },
  '/settings':  { title: 'Settings · Influensa',       noindex: true },
  '/plans':     { title: 'Plans & pricing · Influensa', noindex: true },
  '/checkout':  { title: 'Checkout · Influensa',       noindex: true },
  '/plans/success': { title: 'Upgrade complete · Influensa', noindex: true },
  '/admin':     { title: 'Admin · Influensa',          noindex: true },
}

export function getSeo(pathname) {
  const route = ROUTE_SEO[pathname] || { title: 'Influensa', noindex: true }
  return {
    title: route.title || SITE.defaultTitle,
    description: route.description || SITE.description,
    noindex: route.noindex ?? true,
    path: pathname,
  }
}
