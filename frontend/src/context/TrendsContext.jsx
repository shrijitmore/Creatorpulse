import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'
import { NICHES } from '../lib/mockData.js'

const TrendsContext = createContext(null)

// Cold-cache polling: when the backend reports it's warming a niche pool in the
// background, re-fetch a few times until trends land instead of showing a flat 0.
const WARM_POLL_INTERVAL_MS = 5000
const WARM_POLL_MAX_ATTEMPTS = 12 // ~60s — a cold niche scrape+analyze runs ~40s

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
  const [warming, setWarming] = useState(false)
  const fetchingRef = useRef(false)
  const pollRef = useRef(null)

  const fetchNow = useCallback(async (niches) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setPhase('loading')
    // Cancel any in-flight warm poll from a previous niche selection.
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null }
    try {
      const data = await getTrends(niches, [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
      setPhase('ready')

      // Cold cache — backend is scraping this niche in the background. Poll until
      // the pool fills instead of leaving the user on a flat "0 signals".
      const isCold = (!data.trends || data.trends.length === 0) && data.warming
      setWarming(isCold)
      if (isCold) {
        let attempts = 0
        const poll = async () => {
          attempts++
          try {
            const d = await getTrends(niches, [])
            if (d.trends?.length > 0) {
              setAllTrends(d.trends)
              setLastUpdated(new Date())
              setWarming(false)
              pollRef.current = null
              return
            }
            if (attempts < WARM_POLL_MAX_ATTEMPTS && d.warming) {
              pollRef.current = setTimeout(poll, WARM_POLL_INTERVAL_MS)
            } else {
              setWarming(false)
              pollRef.current = null
            }
          } catch {
            setWarming(false)
            pollRef.current = null
          }
        }
        pollRef.current = setTimeout(poll, WARM_POLL_INTERVAL_MS)
      }
    } catch {
      setPhase('idle')
      setWarming(false)
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
    phase, selectedNiches, allTrends, lastUpdated, refreshing, warming,
    fetchNow, refresh, toggleNiche, setSelectedNiches,
  }), [phase, selectedNiches, allTrends, lastUpdated, refreshing, warming, fetchNow, refresh, toggleNiche])

  return <TrendsContext.Provider value={value}>{children}</TrendsContext.Provider>
}

export function useTrendsContext() {
  const ctx = useContext(TrendsContext)
  if (!ctx) throw new Error('useTrendsContext must be used inside TrendsProvider')
  return ctx
}
