import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ScriptStudio from './pages/ScriptStudio.jsx'
import SavedScripts from './pages/SavedScripts.jsx'
import Settings from './pages/Settings.jsx'

function AppRoutes() {
  const hasNiches = () => {
    const stored = localStorage.getItem('trendforge_niches')
    if (!stored) return false
    try {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      return false
    }
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/"
        element={
          hasNiches()
            ? <Layout><Dashboard /></Layout>
            : <Navigate to="/onboarding" replace />
        }
      />
      <Route
        path="/dashboard"
        element={
          hasNiches()
            ? <Layout><Dashboard /></Layout>
            : <Navigate to="/onboarding" replace />
        }
      />
      <Route
        path="/studio"
        element={
          hasNiches()
            ? <Layout nopadding><ScriptStudio /></Layout>
            : <Navigate to="/onboarding" replace />
        }
      />
      <Route
        path="/saved"
        element={
          hasNiches()
            ? <Layout><SavedScripts /></Layout>
            : <Navigate to="/onboarding" replace />
        }
      />
      <Route
        path="/settings"
        element={
          hasNiches()
            ? <Layout><Settings /></Layout>
            : <Navigate to="/onboarding" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
