import React from 'react'
import { SignUp } from '@clerk/clerk-react'

export default function SignUpPage() {
  return (
    <div className="auth">
      <div className="auth-grid">
        {/* Left — form */}
        <div className="auth-main" style={{ order: 1 }}>
          <div style={{ width: '100%', maxWidth: 500, overflow: 'visible' }}>
            <div style={{ marginBottom: 32 }}>
              <a className="brand" href="/" style={{ marginBottom: 32, display: 'inline-flex' }}><span className="mark"/>Influensa</a>
              <span className="kicker" style={{ display: 'block', marginTop: 24 }}>Get started free</span>
              <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 10 }}>Create your account</h1>
            </div>
            <SignUp
              signInUrl="/sign-in"
              fallbackRedirectUrl="/onboarding"
              appearance={{
                variables: {
                  colorPrimary: '#0A0A0A',
                  colorBackground: '#FFFFFF',
                  colorInputBackground: '#FFFFFF',
                  colorInputText: '#0A0A0A',
                  borderRadius: '10px',
                  fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif",
                  fontSize: '14px',
                },
                elements: {
                  rootBox: { width: '100%' },
                  card: { boxShadow: 'none', border: 'none', padding: 0, overflow: 'visible', background: 'transparent' },
                  cardBox: { boxShadow: 'none', border: 'none' },
                  headerTitle: { display: 'none' },
                  headerSubtitle: { display: 'none' },
                  formButtonPrimary: { background: 'var(--ink)', borderRadius: '999px', fontFamily: "'Geist', sans-serif", fontSize: '13.5px', fontWeight: 500 },
                  formFieldInput: { border: '1px solid var(--line)', borderRadius: '10px', fontFamily: "'Geist', sans-serif" },
                  footerActionLink: { color: 'var(--ink)', fontWeight: 500 },
                }
              }}
            />
          </div>
        </div>

        {/* Right rail — stats + trust */}
        <div className="auth-side reverse" style={{ order: 2 }}>
          <div/>
          <div className="auth-quote">
            <p>"Influensa is the unfair advantage I wish I had when I started. Every trend, every script, every coaching note in one place."</p>
            <div className="row" style={{ gap: 12, marginTop: 28 }}>
              <div className="auth-avatar"/>
              <div>
                <p className="auth-author-name">Rohan Verma</p>
                <p className="auth-author-sub">850K on YouTube · finance creator</p>
              </div>
            </div>
          </div>
          <ul className="auth-pts">
            <li>70,000+ creators on the free tier</li>
            <li>4.2M scripts generated in 3 months</li>
            <li>94% trend-to-publish accuracy</li>
            <li>No credit card to get started</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
