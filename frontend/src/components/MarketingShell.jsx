import React from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'

const FOOTER_GROUPS = [
  { title: 'Product', links: [
    { to: '/', label: 'Home' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/sign-up', label: 'Get started free' },
  ] },
  { title: 'Resources', links: [
    { to: '/blog', label: 'Blog' },
    { to: '/glossary', label: 'Creator glossary' },
    { to: '/contact', label: 'Contact' },
  ] },
  { title: 'Legal', links: [
    { to: '/terms', label: 'Terms of Service' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/refund', label: 'Refund Policy' },
  ] },
]

export default function MarketingShell({ children }) {
  const footerCols = FOOTER_GROUPS.map(g => (
    <div key={g.title}>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute-2)', marginBottom: 12 }}>{g.title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {g.links.map(l => (
          <Link key={l.to + l.label} to={l.to} style={{ fontSize: 13.5, color: 'var(--mute)' }}>{l.label}</Link>
        ))}
      </div>
    </div>
  ))

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="ln-nav">
        <div className="wrap">
          <div className="row between" style={{ height: 64 }}>
            <BrandLogo height={26} />
            <nav className="ln-links">
              <Link to="/pricing">Pricing</Link>
              <Link to="/blog">Blog</Link>
              <Link to="/glossary">Glossary</Link>
            </nav>
            <div className="row" style={{ gap: 10 }}>
              <Link to="/sign-in" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/sign-up" className="btn btn-primary btn-sm">Get started free</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="wrap" style={{ paddingTop: 56, paddingBottom: 96, maxWidth: 920 }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="ln-foot">
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div>
              <BrandLogo height={24} />
              <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 12, maxWidth: 220 }}>Your AI cofounder for content.</p>
            </div>
            {footerCols}
          </div>
          <div className="row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 20, fontSize: 12.5, color: 'var(--mute)' }}>
            <span>© 2026 Influensa</span>
            <span>Built for creators worldwide</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
