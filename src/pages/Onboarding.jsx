import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import NicheTile from '../components/NicheTile.jsx'
import { NICHES } from '../lib/mockData.js'
import { updateNiches } from '../lib/api.js'

export default function Onboarding() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // If niches already set, redirect
  useEffect(() => {
    const stored = localStorage.getItem('trendforge_niches')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          navigate('/dashboard', { replace: true })
        }
      } catch {}
    }
  }, [navigate])

  const handleToggle = (nicheId) => {
    setSelected(prev =>
      prev.includes(nicheId)
        ? prev.filter(id => id !== nicheId)
        : [...prev, nicheId]
    )
    setError('')
  }

  const handleSubmit = async () => {
    if (selected.length === 0) {
      setError('Pick at least one niche to continue.')
      return
    }
    setSubmitting(true)
    try {
      await updateNiches(selected)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: '#08090D' }}
    >
      {/* Animated gradient mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: 'hidden' }}
      >
        <div
          className="gradient-mesh absolute"
          style={{
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            opacity: 0.6
          }}
        />
        {/* Radial vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, #08090D 80%)'
          }}
        />
      </div>

      {/* Decorative grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(191,255,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(191,255,0,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12 fade-up">
          <div
            className="flex items-center justify-center w-10 h-10 rounded font-bebas text-xl font-bold"
            style={{ background: '#BFFF00', color: '#08090D' }}
          >
            TF
          </div>
          <span
            className="font-bebas text-2xl tracking-widest"
            style={{ color: '#BFFF00', letterSpacing: '0.12em' }}
          >
            TRENDFORGE
          </span>
        </div>

        {/* Main heading */}
        <div className="text-center mb-2 fade-up" style={{ animationDelay: '0.1s' }}>
          <h1
            className="font-bebas text-6xl sm:text-8xl leading-none tracking-wider"
            style={{ color: '#f4f4f5', letterSpacing: '0.06em' }}
          >
            WHAT DO YOU
          </h1>
          <h1
            className="font-bebas text-6xl sm:text-8xl leading-none tracking-wider"
            style={{
              letterSpacing: '0.06em',
              WebkitTextStroke: '2px #BFFF00',
              color: 'transparent'
            }}
          >
            CREATE?
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-center mb-10 text-lg fade-up"
          style={{
            color: '#71717a',
            fontFamily: '"Crimson Pro", serif',
            fontStyle: 'italic',
            animationDelay: '0.2s'
          }}
        >
          Pick your niches to unlock personalised trends
        </p>

        {/* Niche grid */}
        <div
          className="grid grid-cols-4 gap-3 mb-6 fade-up"
          style={{ animationDelay: '0.3s' }}
        >
          {NICHES.map(niche => (
            <NicheTile
              key={niche.id}
              niche={niche}
              selected={selected.includes(niche.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Selection count */}
        <div
          className="text-center mb-6 fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          {selected.length > 0 ? (
            <div className="flex items-center justify-center gap-2">
              {selected.map(id => {
                const niche = NICHES.find(n => n.id === id)
                return niche ? (
                  <span
                    key={id}
                    className="text-xs font-mono px-2 py-1 rounded"
                    style={{
                      background: 'rgba(191,255,0,0.1)',
                      border: '1px solid rgba(191,255,0,0.25)',
                      color: '#BFFF00'
                    }}
                  >
                    {niche.icon} {niche.label.toUpperCase()}
                  </span>
                ) : null
              })}
            </div>
          ) : (
            <p className="text-xs font-mono" style={{ color: '#3f3f46' }}>
              SELECT 1–8 NICHES
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-center text-sm font-mono mb-4"
            style={{ color: '#FF3D71' }}
          >
            {error}
          </p>
        )}

        {/* CTA Button */}
        <div className="fade-up" style={{ animationDelay: '0.5s' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-lg font-bebas text-2xl tracking-widest transition-all duration-200"
            style={{
              background: selected.length > 0 ? '#BFFF00' : 'rgba(255,255,255,0.05)',
              color: selected.length > 0 ? '#08090D' : '#3f3f46',
              cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.12em',
              boxShadow: selected.length > 0 ? '0 0 32px rgba(191,255,0,0.3)' : 'none',
              transform: submitting ? 'scale(0.99)' : 'none'
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={20} className="spin" />
                LOADING...
              </>
            ) : (
              <>
                START DISCOVERING
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        {/* Bottom note */}
        <p
          className="text-center text-xs font-mono mt-6 fade-up"
          style={{ color: '#3f3f46', animationDelay: '0.6s' }}
        >
          YOU CAN CHANGE YOUR NICHES AT ANY TIME IN SETTINGS
        </p>
      </div>
    </div>
  )
}

// Quick inline RefreshCw since we're not importing it above
function RefreshCw({ size, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
