import { useState, useEffect, useCallback, useRef } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'

// Cold-cache polling: when the backend reports it's warming a niche pool in the
// background, re-fetch until trends land instead of showing a flat "0 signals".
const WARM_POLL_INTERVAL_MS = 5000
const WARM_POLL_MAX_ATTEMPTS = 12 // ~60s — a cold niche scrape+analyze runs ~40s

/**
 * Fetches trends for user's niches.
 * lazy=true  → no auto-fetch; call fetchNow(niches) manually.
 * lazy=false → fetches on mount and when niches change (original behaviour).
 * Niche/signal/platform filtering is always client-side (no re-fetch).
 */
export function useTrends(userNiches = [], { lazy = false } = {}) {
  const [allTrends, setAllTrends] = useState([])
  const [allRecommendations, setAllRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [warming, setWarming] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const pollRef = useRef(null)

  const nicheKey = userNiches.slice().sort().join(',')

  const clearPoll = () => { if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null } }

  const runFetch = useCallback(async (niches, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    clearPoll() // cancel any warm poll from a previous selection
    try {
      const data = await (isRefresh
        ? refreshTrends(niches, [])
        : getTrends(niches, [])
      )
      setAllTrends(data.trends || [])
      setAllRecommendations(data.recommendations || [])
      setLastUpdated(new Date())

      // Cold cache — backend is scraping this niche now. Poll until it fills.
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
              setAllRecommendations(d.recommendations || [])
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
    } catch (err) {
      console.error('Failed to fetch trends:', err)
      setError(err.message || 'Failed to load trends')
      throw err
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!lazy && userNiches.length > 0) runFetch(userNiches, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazy, nicheKey])

  // Clean up any pending poll on unmount.
  useEffect(() => clearPoll, [])

  const fetchNow = useCallback((niches) => runFetch(niches, false), [runFetch])
  const refresh   = useCallback((niches) => runFetch(niches ?? userNiches, true), [runFetch, nicheKey])

  return { allTrends, allRecommendations, loading, refreshing, warming, error, lastUpdated, fetchNow, refresh }
}
