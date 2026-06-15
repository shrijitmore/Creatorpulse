import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Icon } from '../components/ui.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import { LOGO_HEIGHTS } from '../constants/theme.js'
import Seo from '../components/Seo.jsx'

function useCountUp(target, duration = 1800) {
  const [val, setVal] = useState(0)
  const ref = useRef(false)
  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [])
  return val
}

function StatCounter({ target, suffix = '', label, sub }) {
  const val = useCountUp(target)
  return (
    <div style={{ padding: '24px 0 8px' }}>
      <div className="ln-stat-n">{val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}{suffix}</div>
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginTop: 6 }}>{label}</p>
      <p className="small" style={{ marginTop: 2 }}>{sub}</p>
    </div>
  )
}

function Marquee() {
  const items = ['Trend Intelligence', '×', 'Script in your voice', '×', 'Delivery Coaching', '×', 'Viral Signals', '×', 'AI Memory', '×', 'Scene Editing', '×', 'Cross-platform', '×']
  const doubled = [...items, ...items]
  return (
    <div className="ln-marquee">
      <div className="ln-mq-row">
        {doubled.map((it, i) =>
          it === '×'
            ? <span key={i} className="x">×</span>
            : <span key={i}>{it}</span>
        )}
      </div>
    </div>
  )
}

function MockScript() {
  return (
    <div className="mock-script">
      <div className="ms-row">
        <span className="ms-sc">Hook</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="ms-line ms-em" style={{ height: 10, width: '88%' }}/>
          <div className="ms-line" style={{ height: 8, width: '72%' }}/>
        </div>
      </div>
      <div className="ms-row active">
        <span className="ms-sc">01</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="ms-line" style={{ height: 8, width: '92%' }}/>
          <div className="ms-line" style={{ height: 8, width: '80%' }}/>
          <div className="ms-line" style={{ height: 8, width: '60%' }}/>
        </div>
      </div>
      <div className="ms-row">
        <span className="ms-sc">02</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="ms-line" style={{ height: 8, width: '88%' }}/>
          <div className="ms-line" style={{ height: 8, width: '64%' }}/>
        </div>
      </div>
      <div className="ms-row">
        <span className="ms-sc">03</span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="ms-line" style={{ height: 8, width: '72%' }}/>
          <div className="ms-line" style={{ height: 8, width: '80%' }}/>
        </div>
      </div>
      <div className="ms-edit">
        <span className="ms-d"/>
        Edit scene with AI
      </div>
    </div>
  )
}

function WaveViz() {
  const heights = Array.from({ length: 64 }, (_, i) => {
    const t = i / 63
    const base = Math.sin(t * Math.PI * 3.2) * 0.5 + 0.5
    const noise = Math.sin(t * 47.3) * 0.2
    return Math.max(0.08, Math.min(1, base + noise))
  })
  return (
    <div className="wave">
      {heights.map((h, i) => (
        <i key={i} className={i > 26 && i < 40 ? 'em' : ''} style={{ height: `${Math.round(h * 90)}%` }}/>
      ))}
    </div>
  )
}

function VelocityViz() {
  const bars = [
    { x: 20, h: 180, lbl: 'IG', c: 'rgba(10,10,10,0.85)' },
    { x: 76, h: 120, lbl: 'YT', c: 'rgba(10,10,10,0.5)' },
    { x: 132, h: 210, lbl: 'IG', c: 'rgba(10,10,10,0.85)' },
    { x: 188, h: 90,  lbl: 'RD', c: 'rgba(10,10,10,0.5)' },
    { x: 244, h: 228, lbl: 'YT', c: 'rgba(181,200,255,0.85)' },
    { x: 300, h: 150, lbl: 'IG', c: 'rgba(10,10,10,0.85)' },
    { x: 356, h: 195, lbl: 'RD', c: 'rgba(34,197,94,0.55)' },
  ]
  return (
    <svg className="viz-svg" viewBox="0 0 420 280" fill="none">
      {[240,180,120,60].map(y => <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="rgba(10,10,10,0.07)" strokeWidth="1"/>)}
      {bars.map(b => (
        <g key={b.x}>
          <rect x={b.x} y={240 - b.h} width={44} height={b.h} fill={b.c} rx="4"/>
          <text x={b.x + 22} y={260} textAnchor="middle" fill="rgba(10,10,10,0.35)"
            style={{ fontFamily:'var(--mono)', fontSize:9.5, letterSpacing:'0.1em' }}>{b.lbl}</text>
        </g>
      ))}
      <rect x="274" y="8" width="128" height="44" rx="8" fill="var(--ink)"/>
      <text x="338" y="25" textAnchor="middle" fill="rgba(255,255,255,0.6)"
        style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em' }}>SIGNAL</text>
      <text x="338" y="44" textAnchor="middle" fill="white"
        style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:600 }}>94</text>
    </svg>
  )
}

function ReasoningViz() {
  return (
    <svg className="viz-svg" viewBox="0 0 420 280" fill="none">
      {[
        { x:30, y:50, w:110, lbl:'Hook', bg:'var(--ink)', fg:'#fff' },
        { x:190, y:30, w:100, lbl:'Scene 01', bg:'rgba(181,200,255,0.9)', fg:'var(--ink)' },
        { x:190, y:100, w:100, lbl:'Scene 02', bg:'rgba(181,200,255,0.9)', fg:'var(--ink)' },
        { x:340, y:65, w:70, lbl:'CTA', bg:'rgba(34,197,94,0.45)', fg:'var(--ink)' },
      ].map(n => (
        <g key={n.lbl}>
          <rect x={n.x} y={n.y} width={n.w} height={36} rx="8" fill={n.bg} stroke="rgba(10,10,10,0.08)" strokeWidth="1"/>
          <text x={n.x + n.w / 2} y={n.y + 21} textAnchor="middle" fill={n.fg}
            style={{ fontFamily:'var(--mono)', fontSize:10.5, letterSpacing:'0.08em' }}>{n.lbl}</text>
        </g>
      ))}
      <line x1="140" y1="68" x2="190" y2="48" stroke="rgba(10,10,10,0.15)" strokeWidth="1" strokeDasharray="4 2"/>
      <line x1="140" y1="68" x2="190" y2="118" stroke="rgba(10,10,10,0.15)" strokeWidth="1" strokeDasharray="4 2"/>
      <line x1="290" y1="48" x2="340" y2="82" stroke="rgba(10,10,10,0.15)" strokeWidth="1" strokeDasharray="4 2"/>
      <line x1="290" y1="118" x2="340" y2="82" stroke="rgba(10,10,10,0.15)" strokeWidth="1" strokeDasharray="4 2"/>
      <rect x="150" y="178" width="220" height="52" rx="10" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5"/>
      <text x="260" y="198" textAnchor="middle" fill="var(--mute)"
        style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em' }}>AI SUGGESTION</text>
      <text x="260" y="218" textAnchor="middle" fill="var(--ink)"
        style={{ fontFamily:'var(--sans)', fontSize:12 }}>"Make the hook more urgent"</text>
    </svg>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)
  const goSignIn = () => { setMobileOpen(false); navigate(isSignedIn ? '/dashboard' : '/sign-in') }

  return (
    <div className="landing">
      <Seo path="/" />

      {/* ── Nav ── */}
      <nav className="ln-nav">
        <div className="wrap">
          <div className="row between" style={{ height: 64 }}>
            <BrandLogo height={LOGO_HEIGHTS.nav} />
            <nav className="ln-links">
              <a href="#features">Features</a>
              <a href="#process">How it works</a>
              <a href="#pricing">Pricing</a>
            </nav>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-ghost btn-sm ln-desktop-only" onClick={goSignIn}>Sign in</button>
              <button className="btn btn-primary btn-sm ln-desktop-only" onClick={() => navigate('/sign-up')}>Get started free</button>
              <button className="ln-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
                <span className={mobileOpen ? 'open' : ''}/>
                <span className={mobileOpen ? 'open' : ''}/>
                <span className={mobileOpen ? 'open' : ''}/>
              </button>
            </div>
          </div>
        </div>
        {mobileOpen && (
          <div className="ln-mobile-menu">
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#process" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '4px 0' }}/>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={goSignIn}>Sign in</button>
            <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { setMobileOpen(false); navigate('/sign-up') }}>Get started free</button>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="ln-hero">
        <div className="wrap">
          <div className="ln-meta">
            <span className="status">Live · scanning now</span>
            <span className="dim">YouTube · Reddit</span>
            <span className="ts dim">2026</span>
          </div>
          <h1 className="ln-display">
            Make content<br/>people actually<br/><em className="iri-text">want.</em>
          </h1>
          <div className="ln-belowhero">
            <div>
              <p className="ln-sub">
                Your AI cofounder for content. Discovers what's trending in your niche,
                writes scripts in your voice, and coaches you on delivery.
              </p>
              <div className="ln-hero-cta">
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/sign-up')}>
                  Start for free <span className="arrow">→</span>
                </button>
                <button className="btn btn-line btn-lg" onClick={goSignIn}>Sign in</button>
              </div>
              <p className="small" style={{ marginTop: 14, color: 'var(--mute-2)' }}>No credit card · Free tier included</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="chip" style={{ cursor: 'default' }}>
                <span className="dot"/>
                Gemini 2.5 Flash
              </span>
            </div>
          </div>

          <div className="ln-heroimg">
            <div className="ln-orb iri"/>
            <div className="ln-imgframe"><VelocityViz/></div>
            <div className="ln-imgmeta">
              <span>Influensa · Dashboard</span>
              <span>Live signals · 2 platforms</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section>
        <div className="wrap">
          <div className="ln-stats">
            <StatCounter target={70} suffix="K+" label="Creators" sub="On the free tier"/>
            <StatCounter target={4.2} suffix="M+" label="Scripts generated" sub="In 3 months"/>
            <StatCounter target={94} suffix="%" label="Script accuracy" sub="Trend-to-publish fit"/>
            <StatCounter target={3} suffix="×" label="Faster to film" sub="vs. manual research"/>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <Marquee/>

      {/* ── Features ── */}
      <section id="features" className="ln-feat">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="kicker">What it does</span>
              <h2 className="h2" style={{ marginTop: 20 }}>Four things.<br/>Deeply done.</h2>
            </div>
            <p className="body">
              Most tools try to be everything. We focus on the four moves that separate
              creators who grow from creators who post into the void.
            </p>
          </div>

          {/* Feature 1 */}
          <div className="f-row">
            <div className="f-text">
              <div className="f-ix"><span>01</span><span>Trend Intelligence</span></div>
              <h3>See what's going viral before everyone else</h3>
              <p className="body" style={{ marginTop: 16 }}>
                Scans YouTube and Reddit every hour. Scores each signal by
                engagement velocity, topic freshness, and cross-platform momentum.
              </p>
              <div className="f-tags">
                <span className="chip active">YouTube</span>
                <span className="chip active">Reddit</span>
                <span className="chip">Instagram (soon)</span>
                <span className="chip">TikTok (soon)</span>
              </div>
            </div>
            <div className="f-viz">
              <span className="viz-tag">Velocity map</span>
              <span className="viz-tag r">Live · 1h ago</span>
              <VelocityViz/>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="f-row flip">
            <div className="f-text">
              <div className="f-ix"><span>02</span><span>Voice-matched scripts</span></div>
              <h3>Scripts that sound like you, not generic AI</h3>
              <p className="body" style={{ marginTop: 16 }}>
                AI writes complete reel scripts in your language: Hinglish, Hindi, English,
                regional. Trained on your past captions so every line sounds like you.
              </p>
              <div className="f-tags">
                <span className="chip active">Storytelling</span>
                <span className="chip active">Educational</span>
                <span className="chip">Controversial</span>
                <span className="chip">Entertaining</span>
              </div>
            </div>
            <div className="f-viz">
              <span className="viz-tag">Script studio</span>
              <MockScript/>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="f-row">
            <div className="f-text">
              <div className="f-ix"><span>03</span><span>Per-scene AI editing</span></div>
              <h3>Click any line. Tell AI what to change.</h3>
              <p className="body" style={{ marginTop: 16 }}>
                Every scene is editable with a prompt. The AI reasons through your request,
                warns about cascade effects, and lets you iterate without starting over.
              </p>
              <div className="f-tags">
                <span className="chip active">Cascade detection</span>
                <span className="chip active">Inline reasoning</span>
                <span className="chip active">Version history</span>
              </div>
            </div>
            <div className="f-viz">
              <span className="viz-tag">Scene editor</span>
              <ReasoningViz/>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="f-row flip">
            <div className="f-text">
              <div className="f-ix"><span>04</span><span>Delivery Coaching</span></div>
              <h3>Record yourself. AI catches what's killing your confidence.</h3>
              <p className="body" style={{ marginTop: 16 }}>
                Record yourself reading the script. AI catches filler words, trailing
                confidence, wrong emphasis, scene by scene. Ship better content.
              </p>
              <div className="f-tags">
                <span className="chip active">Filler detection</span>
                <span className="chip active">Confidence score</span>
                <span className="chip active">Scene-by-scene</span>
              </div>
            </div>
            <div className="f-viz">
              <span className="viz-tag">Recording studio</span>
              <WaveViz/>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="ln-process">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="kicker">How it works</span>
              <h2 className="h2" style={{ marginTop: 20 }}>From trend to<br/>script in 60s.</h2>
            </div>
            <p className="body">Eight questions to set up. Then every morning your feed is ready.</p>
          </div>
          <div className="proc-grid">
            {[
              { n: '01', title: 'Tell us about you', glyph: Icon.Profile, desc: 'Eight quick questions. Niche, platform, language style, goals. Paste a caption to teach it your voice.' },
              { n: '02', title: "See what's trending", glyph: Icon.Rising, desc: 'Your personalised trend feed. YouTube + Reddit, scored by viral potential, filtered to your niche.' },
              { n: '03', title: 'Generate a script', glyph: Icon.Wand, desc: 'Pick a trend. AI writes a full scene-by-scene script in your language. Edit any line with a prompt.' },
              { n: '04', title: 'Practice and publish', glyph: Icon.Mic, desc: 'Record yourself reading it. AI coaches your delivery. Ship the content.' },
            ].map(s => (
              <div key={s.n} className="proc-step">
                <span className="proc-n">{s.n}</span>
                <div className="proc-ic"><s.glyph size={18}/></div>
                <p className="proc-title">{s.title}</p>
                <p className="body proc-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manifesto ── */}
      <section className="ln-mani">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="kicker">Why we built this</span>
              <h2 className="h2" style={{ marginTop: 20 }}>The creator<br/>is the product.</h2>
            </div>
            <p className="body">
              Every tool we've seen treats the creator as an afterthought.
              We built Influensa for the people who show up every day.
            </p>
          </div>
          <div className="mani-grid">
            {[
              { title: "Research shouldn't take 4 hours", body: "You spend more time finding what to make than actually making it. We scan multiple platforms every hour so you don't have to." },
              { title: 'Scripts should sound like you', body: "Generic AI output is obvious. We train on your past captions and writing to write scripts that sound like you on your best day." },
              { title: 'Shipping is a learnable skill', body: 'Delivery confidence comes from reps, not talent. Our coaching catches the small things that kill your authority on camera.' },
            ].map(m => (
              <div key={m.title} className="mani-card">
                <p className="mani-title">{m.title}</p>
                <p className="body">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="ln-price">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="kicker">Pricing</span>
              <h2 className="h2" style={{ marginTop: 20 }}>Start free.<br/>Scale when ready.</h2>
            </div>
            <p className="body">No surprise charges. Free tier stays free.</p>
          </div>
          <div className="price-grid">
            {[
              {
                tier: 'Free', price: '₹0', per: '/forever',
                desc: 'For creators just starting out.',
                features: ['5 scripts per month', '3 niches', 'Reddit + YouTube trends', 'English only', 'Script studio access'],
                cta: 'Start for free', hero: false,
              },
              {
                tier: 'Pro', price: '₹999', per: '/month',
                desc: 'For creators who ship consistently.',
                features: ['Unlimited scripts', 'All languages', 'Cross-platform trend signals', 'AI voice coaching', 'Priority scraping', 'Script history'],
                cta: 'Start Pro (coming soon)', hero: true,
              },
              {
                tier: 'Agency', price: '₹4,999', per: '/month',
                desc: 'For studios and creator teams.',
                features: ['Everything in Pro', 'Multiple creator profiles', 'Bulk script generation', 'Advanced analytics', 'Team workspace', 'Dedicated support'],
                cta: 'Contact us', hero: false,
              },
            ].map(plan => (
              <div key={plan.tier} className={`price-card ${plan.hero ? 'hero' : ''}`}>
                <div>
                  <span className="meta">{plan.tier}</span>
                  <div className="price-n">{plan.price}<span>{plan.per}</span></div>
                  <p className="small" style={{ marginTop: 10 }}>{plan.desc}</p>
                </div>
                <ul className="price-ul">
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <button
                  className={`btn btn-sm ${plan.hero ? 'btn-primary' : 'btn-line'}`}
                  style={{ justifyContent: 'center', width: '100%' }}
                  onClick={() => navigate('/sign-up')}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ln-cta">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <span className="kicker" style={{ justifyContent: 'center' }}>Get started</span>
          <h2 className="h1" style={{ marginTop: 24, maxWidth: 680, margin: '24px auto 0' }}>
            Ready to let AI do the research?
          </h2>
          <p className="body" style={{ maxWidth: 480, margin: '20px auto 0' }}>
            Join 70,000+ creators who use Influensa to surface trends and ship faster.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <button className="btn btn-primary btn-xl" onClick={() => navigate('/sign-up')}>
              Start for free <span className="arrow">→</span>
            </button>
          </div>
          <p className="small" style={{ marginTop: 16, color: 'var(--mute-2)' }}>No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ln-foot">
        <div className="wrap">
          <div className="row between">
            <BrandLogo height={LOGO_HEIGHTS.nav} />
            <div className="row" style={{ gap: 24, fontSize: 13, color: 'var(--mute)' }}>
              <span>© 2026 Influensa</span>
              <span>Gemini 2.5 Flash · Vertex AI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
