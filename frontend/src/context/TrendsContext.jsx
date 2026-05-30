import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'

const TrendsContext = createContext(null)

function readStoredNiche() {
  try { return JSON.parse(localStorage.getItem('trendforge_active_niche') || 'null') } catch { return null }
}

export function TrendsProvider({ children }) {
  // phase: 'idle' | 'loading' | 'ready'
  // activeNiche: { nicheId, nicheLabel, ... } | null
  const [phase, setPhase] = useState('idle')
  const [activeNiche, setActiveNiche] = useState(readStoredNiche)
  const [allTrends, setAllTrends] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const fetchingRef = useRef(false)

  // Start a scan for a niche. Called by the niche picker.
  // Keeps running even if the user navigates away — state lives here, not in Dashboard.
  const selectNiche = useCallback(async (niche) => {
    if (fetchingRef.current) return
    setActiveNiche(niche)
    localStorage.setItem('trendforge_active_niche', JSON.stringify(niche))
    setPhase('loading')
    fetchingRef.current = true
    try {
      const data = await getTrends([niche.nicheId], [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
      setPhase('ready')
    } catch {
      setPhase('idle')
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!activeNiche) return
    setRefreshing(true)
    try {
      const data = await refreshTrends([activeNiche.nicheId], [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
    } catch {}
    finally { setRefreshing(false) }
  }, [activeNiche])

  const resetNiche = useCallback(() => {
    setPhase('idle')
    setActiveNiche(null)
    setAllTrends([])
    localStorage.removeItem('trendforge_active_niche')
  }, [])

  const value = useMemo(() => ({
    phase, activeNiche, allTrends, lastUpdated, refreshing,
    selectNiche, refresh, resetNiche,
  }), [phase, activeNiche, allTrends, lastUpdated, refreshing, selectNiche, refresh, resetNiche])

  return <TrendsContext.Provider value={value}>{children}</TrendsContext.Provider>
}

export function useTrendsContext() {
  const ctx = useContext(TrendsContext)
  if (!ctx) throw new Error('useTrendsContext must be used inside TrendsProvider')
  return ctx
}
