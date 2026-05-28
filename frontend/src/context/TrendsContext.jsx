import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'
import { NICHES } from '../lib/mockData.js'

const TrendsContext = createContext(null)

function getStoredNiches() {
  try {
    const stored = JSON.parse(localStorage.getItem('trendforge_niches') || '[]')
    return Array.isArray(stored) && stored.length > 0 ? stored : NICHES.map(n => n.id)
  } catch { return NICHES.map(n => n.id) }
}

export function TrendsProvider({ children }) {
  const [phase, setPhase] = useState('idle')       // idle | loading | ready
  const [selectedNiches, setSelectedNiches] = useState(getStoredNiches)
  const [allTrends, setAllTrends] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const fetchingRef = useRef(false)

  const fetchNow = useCallback(async (niches) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setPhase('loading')
    try {
      const data = await getTrends(niches, [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
      setPhase('ready')
    } catch {
      setPhase('idle')
    } finally {
      fetchingRef.current = false
    }
  }, [])

  const refresh = useCallback(async (niches) => {
    setRefreshing(true)
    try {
      const data = await refreshTrends(niches, [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
    } catch {}
    finally { setRefreshing(false) }
  }, [])

  const toggleNiche = useCallback((id) => {
    setSelectedNiches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const value = useMemo(() => ({
    phase, selectedNiches, allTrends, lastUpdated, refreshing,
    fetchNow, refresh, toggleNiche, setSelectedNiches,
  }), [phase, selectedNiches, allTrends, lastUpdated, refreshing, fetchNow, refresh, toggleNiche])

  return <TrendsContext.Provider value={value}>{children}</TrendsContext.Provider>
}

export function useTrendsContext() {
  const ctx = useContext(TrendsContext)
  if (!ctx) throw new Error('useTrendsContext must be used inside TrendsProvider')
  return ctx
}
