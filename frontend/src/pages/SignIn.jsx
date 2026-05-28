import React from 'react'
import { SignIn } from '@clerk/clerk-react'

export default function SignInPage() {
  return (
    <div className="auth">
      <div className="auth-grid">
        {/* Left rail */}
        <div className="auth-side">
          <a className="brand" href="/"><span className="mark"/>Creatorpulse</a>
          <div className="auth-quote">
            <p>"The difference between creators who grow and creators who plateau is knowing what to make before they make it."</p>
            <div className="row" style={{ gap: 12, marginTop: 28 }}>
              <div className="auth-avatar"/>
              <div>
                <p className="auth-author-name">Maya Chen</p>
                <p className="auth-author-sub">1.2M on Instagram · fitness creator</p>
              </div>
            </div>
          </div>
          <ul className="auth-pts">
            <li>Trend feed updated every hour across 3 platforms</li>
            <li>Scripts in your language, in your voice</li>
            <li>Voice coaching catches what kills confidence on camera</li>
            <li>Free tier, no credit card needed</li>
          </ul>
        </div>

        {/* Right — form */}
        <div className="auth-main">
          <div style={{ width: '100%', maxWidth: 460, overflow: 'visible' }}>
            <div style={{ marginBottom: 32 }}>
              <span className="kicker">Welcome back</span>
              <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 10 }}>Sign in to Creatorpulse</h1>
            </div>
            <SignIn
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/"
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
      </div>
    </div>
  )
}
