import { useState, useEffect, useCallback } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'

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
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const nicheKey = userNiches.slice().sort().join(',')

  const runFetch = useCallback(async (niches, isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const data = await (isRefresh
        ? refreshTrends(niches, [])
        : getTrends(niches, [])
      )
      setAllTrends(data.trends || [])
      setAllRecommendations(data.recommendations || [])
      setLastUpdated(new Date())
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

  const fetchNow = useCallback((niches) => runFetch(niches, false), [runFetch])
  const refresh   = useCallback((niches) => runFetch(niches ?? userNiches, true), [runFetch, nicheKey])

  return { allTrends, allRecommendations, loading, refreshing, error, lastUpdated, fetchNow, refresh }
}
