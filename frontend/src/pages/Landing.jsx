import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Wordmark, Button, Chip } from '../components/ui.jsx'

const FEATURES = [
  {
    icon: <Icon.Globe size={20}/>,
    title: 'Trend Intelligence',
    desc: 'Scans Instagram, YouTube & Reddit every hour. Shows what\'s trending in your niche before anyone else.',
  },
  {
    icon: <Icon.Wand size={20}/>,
    title: 'Scripts in Your Voice',
    desc: 'AI writes complete reel scripts in your language — Hinglish, Hindi, English, regional. Sounds like you, not generic AI.',
  },
  {
    icon: <Icon.Edit size={20}/>,
    title: 'Per-Scene AI Editing',
    desc: 'Click any line. Tell AI what to change. It reasons, warns about cascade effects, lets you iterate.',
  },
  {
    icon: <Icon.Mic size={20}/>,
    title: 'Voice Coaching',
    desc: 'Record yourself reading the script. AI catches filler words, trailing confidence, wrong emphasis — scene by scene.',
  },
]

const PLATFORMS = [
  { id: 'instagram', icon: <Icon.IG size={18}/>,     label: 'Instagram' },
  { id: 'youtube',   icon: <Icon.YT size={18}/>,     label: 'YouTube' },
  { id: 'reddit',    icon: <Icon.Reddit size={18}/>, label: 'Reddit' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-paper">

      {/* Nav */}
      <header className="h-[60px] flex items-center justify-between px-6 lg:px-12 border-b border-line sticky top-0 z-30 bg-paper">
        <Wordmark withTag/>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sign-in')}>Sign in</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/sign-up')}>Get started free</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-28">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terrasoft border border-[#EBD3B6] text-terradeep text-[12px] font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-terra inline-block animate-pulse"/>
          Live trend scanning · Instagram + YouTube + Reddit
        </div>

        <h1 className="text-[40px] sm:text-[56px] lg:text-[68px] font-semibold tracking-[-0.025em] text-ink leading-[1.04] max-w-4xl mb-5">
          Make content people<br/> actually <em className="not-italic" style={{ color:'var(--terra)' }}>want</em>.
        </h1>

        <p className="text-[16px] sm:text-[18px] text-ink2 max-w-xl leading-relaxed mb-10">
          Your AI cofounder for content — discovers what's trending in your niche,
          writes scripts in your voice, and coaches you on your delivery.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button variant="primary" size="lg" iconRight={<Icon.Arrow size={15}/>}
            onClick={() => navigate('/sign-up')}
            className="px-8">
            Start for free
          </Button>
          <Button variant="soft" size="lg" onClick={() => navigate('/sign-in')}>
            Sign in
          </Button>
        </div>

        <p className="text-[12px] text-ink3 mt-4">No credit card · Free tier included</p>
      </section>

      {/* Source platforms */}
      <section className="border-t border-line py-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11.5px] text-ink3 uppercase tracking-[0.10em] font-medium mb-5">Scans trends from</p>
          <div className="flex items-center justify-center gap-8">
            {PLATFORMS.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-ink2">
                <span className="text-ink3">{p.icon}</span>
                <span className="text-[14px] font-medium">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="kicker mb-3">What it does</p>
            <h2 className="text-[32px] font-semibold tracking-[-0.015em] text-ink">
              Everything a creator needs to go viral
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="card p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background:'var(--terrasoft)', color:'var(--terradeep)' }}>
                  {f.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-ink mb-2">{f.title}</h3>
                <p className="text-[14px] text-ink2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line py-20 px-6 bg-paper2">
        <div className="max-w-3xl mx-auto text-center">
          <p className="kicker mb-3">How it works</p>
          <h2 className="text-[32px] font-semibold tracking-[-0.015em] text-ink mb-12">
            From trend to script in 60 seconds
          </h2>
          <div className="space-y-6 text-left">
            {[
              { n:'01', title:'Tell us about you', desc:'8 quick questions. Your niche, platform, language style, and goals. Paste a caption to teach it your voice.' },
              { n:'02', title:'See what\'s trending', desc:'Your personalised trend feed. Instagram + YouTube + Reddit, scored by viral potential, filtered to your niche.' },
              { n:'03', title:'Generate a script', desc:'Pick a trend. AI writes a full scene-by-scene script in your language. Edit any line with a prompt.' },
              { n:'04', title:'Practice and publish', desc:'Record yourself reading it. AI coaches your delivery. Ship the content.' },
            ].map(s => (
              <div key={s.n} className="flex gap-5 items-start">
                <span className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-[13px] font-semibold flex-shrink-0"
                  style={{ background:'var(--ink)', color:'#fff' }}>{s.n}</span>
                <div className="pt-1">
                  <p className="text-[16px] font-semibold text-ink mb-1">{s.title}</p>
                  <p className="text-[14px] text-ink2 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line py-20 px-6 text-center">
        <h2 className="text-[36px] font-semibold tracking-[-0.02em] text-ink mb-4">
          Ready to grow faster?
        </h2>
        <p className="text-[16px] text-ink2 mb-8">Join creators who let AI do the trend research, so they can focus on filming.</p>
        <Button variant="primary" size="lg" iconRight={<Icon.Arrow size={15}/>}
          onClick={() => navigate('/sign-up')}
          className="px-10">
          Get started free
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-6 px-6 flex items-center justify-between">
        <Wordmark/>
        <p className="text-[12px] text-ink3">© 2026 Creatorpulse</p>
      </footer>
    </div>
  )
}
