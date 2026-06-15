import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { ToastProvider } from './components/ui.jsx'
import { setTokenGetter } from './lib/apiClient.js'
import { getOnboardingStatus } from './lib/api.js'
import BrandLogo from './components/BrandLogo.jsx'
import { LOGO_HEIGHTS } from './constants/theme.js'
import Seo from './components/Seo.jsx'
import Landing from './pages/Landing.jsx'
import SignInPage from './pages/SignIn.jsx'
import SignUpPage from './pages/SignUp.jsx'

// Authed app shell + pages — lazy so the public Landing ships a lean bundle.
const Layout       = lazy(() => import('./components/Layout.jsx'))
const Onboarding   = lazy(() => import('./pages/Onboarding.jsx'))
const Dashboard    = lazy(() => import('./pages/Dashboard.jsx'))
const ScriptStudio = lazy(() => import('./pages/ScriptStudio.jsx'))
const SavedScripts = lazy(() => import('./pages/SavedScripts.jsx'))
const Settings     = lazy(() => import('./pages/Settings.jsx'))
const Profile      = lazy(() => import('./pages/Profile.jsx'))
const Plans        = lazy(() => import('./pages/Plans.jsx'))
const Checkout     = lazy(() => import('./pages/Checkout.jsx'))
const PlanSuccess  = lazy(() => import('./pages/PlanSuccess.jsx'))
const Admin        = lazy(() => import('./pages/Admin.jsx'))

// Public marketing + legal + content pages — lazy, indexable.
const Pricing      = lazy(() => import('./pages/Pricing.jsx'))
const Terms        = lazy(() => import('./pages/legal/Terms.jsx'))
const Privacy      = lazy(() => import('./pages/legal/Privacy.jsx'))
const Refund       = lazy(() => import('./pages/legal/Refund.jsx'))
const Contact      = lazy(() => import('./pages/legal/Contact.jsx'))
const Blog         = lazy(() => import('./pages/Blog.jsx'))
const BlogPost     = lazy(() => import('./pages/BlogPost.jsx'))
const Glossary     = lazy(() => import('./pages/Glossary.jsx'))
const GlossaryTerm = lazy(() => import('./pages/GlossaryTerm.jsx'))

// ─── Loading screen ───────────────────────────────────────────────────────────

function CheckingScreen() {
  return (
    <div className="loading-screen">
      <BrandLogo height={LOGO_HEIGHTS.nav} />
      <div style={{ display:'flex', gap:4, marginTop:8 }}>
        <span className="tdot"/><span className="tdot"/><span className="tdot"/>
      </div>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--paper)' }}>
      <Seo title="404 · Page not found · Influensa" path="/404" noindex />
      <BrandLogo height={LOGO_HEIGHTS.nav} />
      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mute)', marginTop: 24 }}>404 · Page not found</p>
      <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', textAlign: 'center' }}>This page doesn't exist</h1>
      <p style={{ color: 'var(--ink-2)', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>The link may be broken or the page may have been moved.</p>
      <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 8 }}>Go home</button>
    </div>
  )
}

// ─── Onboarding gate — checks DB, not just localStorage ──────────────────────

function useOnboardingGate() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
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

    // Fetch onboarding status with a few retries. A bare token may not be ready on
    // the first tick after Clerk loads, and the global API token getter is set in a
    // sibling effect whose order isn't guaranteed — so we register it here first to
    // avoid a 401 that would wrongly latch "not onboarded" and bounce to onboarding.
    const resolveStatus = async (attempt = 0) => {
      try {
        const token = await getToken()
        if (!token) throw new Error('No token yet')
        setTokenGetter(() => getToken()) // ensure authed api calls before we fetch
        const d = await getOnboardingStatus()
        if (cancelled) return
        resolvedRef.current = true
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
      } catch (err) {
        if (cancelled) return
        // Transient (token not ready / network) — retry before giving up, so we
        // never wrongly force a completed user back through onboarding.
        if (attempt < 4) {
          setTimeout(() => { if (!cancelled) resolveStatus(attempt + 1) }, 600)
          return
        }
        resolvedRef.current = true
        const local = localStorage.getItem('trendforge_niches')
        const hasLocal = (() => { try { const p = JSON.parse(local || '[]'); return Array.isArray(p) && p.length > 0 } catch { return false } })()
        setState({ checking: false, onboarded: hasLocal })
      }
    }

    resolveStatus()

    return () => { cancelled = true }
  }, [isSignedIn, isLoaded])

  return state
}

// Public marketing/legal/content paths — accessible signed-in OR signed-out,
// and never auto-redirected away (so logged-in users can read pricing/legal).
const PUBLIC_PATHS = ['/pricing', '/terms', '/privacy', '/refund', '/contact', '/blog', '/glossary']
const isPublicPath = (p) => PUBLIC_PATHS.some(x => p === x || p.startsWith(x + '/'))

// ─── App routes ───────────────────────────────────────────────────────────────

function AppRoutes() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const navigate = useNavigate()
  const [clerkTimedOut, setClerkTimedOut] = useState(false)

  // If Clerk hasn't loaded in 10s, redirect to sign-in instead of infinite spinner
  useEffect(() => {
    if (isLoaded) return
    const t = setTimeout(() => setClerkTimedOut(true), 10000)
    return () => clearTimeout(t)
  }, [isLoaded])

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
    if (['/sign-in', '/sign-up'].some(p => path.startsWith(p))) return
    if (isPublicPath(path)) return  // let signed-in users browse public marketing pages

    if (!onboarded) {
      if (path !== '/onboarding') navigate('/onboarding', { replace: true })
    } else {
      if (path === '/onboarding' || path === '/') navigate('/dashboard', { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, checking, isSignedIn, onboarded])

  // Clerk still loading — after 10s redirect to sign-in
  if (!isLoaded) {
    if (clerkTimedOut) return <Navigate to="/sign-in" replace/>
    return <CheckingScreen/>
  }

  // Signed in but checking onboarding status
  if (isSignedIn && checking) return <CheckingScreen/>

  return (
    <ToastProvider>
      <Suspense fallback={<CheckingScreen/>}>
        <Routes>
          {/* ── Public routes — no auth required ── */}
          <Route path="/" element={isSignedIn ? <Navigate to="/dashboard" replace /> : <Landing/>}/>
          <Route path="/sign-in/*" element={<SignInPage/>}/>
          <Route path="/sign-up/*" element={<SignUpPage/>}/>

          {/* ── Public marketing / legal / content (indexable) ── */}
          <Route path="/pricing"        element={<Pricing/>}/>
          <Route path="/terms"          element={<Terms/>}/>
          <Route path="/privacy"        element={<Privacy/>}/>
          <Route path="/refund"         element={<Refund/>}/>
          <Route path="/contact"        element={<Contact/>}/>
          <Route path="/blog"           element={<Blog/>}/>
          <Route path="/blog/:slug"     element={<BlogPost/>}/>
          <Route path="/glossary"       element={<Glossary/>}/>
          <Route path="/glossary/:slug" element={<GlossaryTerm/>}/>

          {/* ── Auth required ── */}
          {isSignedIn && <Route path="/onboarding" element={<Onboarding/>}/>}
          {isSignedIn && (
            <Route element={<Layout/>}>
              <Route path="/dashboard" element={<Dashboard/>}/>
              <Route path="/studio"    element={<ScriptStudio/>}/>
              <Route path="/saved"     element={<SavedScripts/>}/>
              <Route path="/profile"   element={<Profile/>}/>
              <Route path="/settings"  element={<Settings/>}/>
              <Route path="/plans"     element={<Plans/>}/>
              <Route path="/checkout"  element={<Checkout/>}/>
              <Route path="/plans/success" element={<PlanSuccess/>}/>
              <Route path="/admin"     element={<Admin/>}/>
            </Route>
          )}

          {/* Catch-all → 404 */}
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </Suspense>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes/>
    </BrowserRouter>
  )
}
