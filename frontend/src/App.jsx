import React, { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import { ToastProvider, Logomark } from './components/ui.jsx'
import { setTokenGetter } from './lib/apiClient.js'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScriptStudio from './pages/ScriptStudio.jsx'
import SavedScripts from './pages/SavedScripts.jsx'
import Settings from './pages/Settings.jsx'
import Profile from './pages/Profile.jsx'
import SignInPage from './pages/SignIn.jsx'
import SignUpPage from './pages/SignUp.jsx'

// ─── Loading screen ───────────────────────────────────────────────────────────

function CheckingScreen() {
  return (
    <div className="loading-screen">
      <a className="brand" href="/"><span className="mark"></span>Creatorpulse</a>
      <div style={{ display:'flex', gap:4, marginTop:8 }}>
        <span className="tdot"/><span className="tdot"/><span className="tdot"/>
      </div>
    </div>
  )
}

// ─── Onboarding gate — checks DB, not just localStorage ──────────────────────

function useOnboardingGate() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [state, setState] = useState({ checking: true, onboarded: false })
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded || resolvedRef.current) return

    if (!isSignedIn) {
      resolvedRef.current = true
      setState({ checking: false, onboarded: false })
      return
    }

    let cancelled = false

    getToken()
      .then(token => {
        if (!token) throw new Error('No token yet')
        return fetch('/api/onboarding/status', {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      })
      .then(r => { if (!r.ok) throw new Error(`Status ${r.status}`); return r.json() })
      .then(data => {
        if (cancelled) return
        resolvedRef.current = true
        const d = data.data || data
        if (d.completed) {
          if (d.niches?.length) localStorage.setItem('trendforge_niches', JSON.stringify(d.niches))
          if (d.profile) {
            const existing = (() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } })()
            localStorage.setItem('trendforge_profile', JSON.stringify({ ...existing, ...d.profile, name: d.profile.creatorName }))
          }
          setState({ checking: false, onboarded: true })
        } else {
          setState({ checking: false, onboarded: false })
        }
      })
      .catch(() => {
        if (cancelled) return
        resolvedRef.current = true
        const local = localStorage.getItem('trendforge_niches')
        const hasLocal = (() => { try { const p = JSON.parse(local || '[]'); return Array.isArray(p) && p.length > 0 } catch { return false } })()
        setState({ checking: false, onboarded: hasLocal })
      })

    return () => { cancelled = true }
  }, [isSignedIn, isLoaded])

  return state
}

// ─── App routes ───────────────────────────────────────────────────────────────

function AppRoutes() {
  const { isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()

  // Register token getter so all api.js calls attach Bearer header
  useEffect(() => {
    if (!isSignedIn || !getToken) { setTokenGetter(null); return }
    setTokenGetter(() => getToken())
    return () => setTokenGetter(null)
  }, [isSignedIn, getToken])

  const { checking, onboarded } = useOnboardingGate()

  // Redirect signed-in users to correct destination
  useEffect(() => {
    if (!isLoaded || checking) return
    if (!isSignedIn) return

    const path = window.location.pathname
    // Don't redirect on public pages
    if (['/sign-in', '/sign-up'].some(p => path.startsWith(p))) return

    if (!onboarded && path !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    } else if (onboarded && path === '/onboarding') {
      navigate('/dashboard', { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, checking, isSignedIn, onboarded])

  // Clerk still loading
  if (!isLoaded) return <CheckingScreen/>

  // Signed in but checking onboarding status
  if (isSignedIn && checking) return <CheckingScreen/>

  return (
    <ToastProvider>
      <Routes>
        {/* ── Public routes — no auth required ── */}
        <Route path="/" element={
          isSignedIn
            ? (onboarded ? null : null)  // handled by redirect above
            : <Landing/>
        }/>
        <Route path="/sign-in/*" element={<SignInPage/>}/>
        <Route path="/sign-up/*" element={<SignUpPage/>}/>

        {/* ── Auth required ── */}
        {isSignedIn && (
          <>
            <Route path="/onboarding" element={<Onboarding/>}/>
            <Route element={<Layout/>}>
              <Route path="/dashboard" element={<Dashboard/>}/>
              <Route path="/studio"    element={<ScriptStudio/>}/>
              <Route path="/saved"     element={<SavedScripts/>}/>
              <Route path="/profile"   element={<Profile/>}/>
              <Route path="/settings"  element={<Settings/>}/>
            </Route>
          </>
        )}

        {/* Catch-all: not signed in → landing, signed in → checking */}
        <Route path="*" element={isSignedIn ? <CheckingScreen/> : <Landing/>}/>
      </Routes>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes/>
    </BrowserRouter>
  )
}
