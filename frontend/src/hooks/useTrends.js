import { useState, useEffect, useCallback } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'

/**
 * Fetches trends for user's niches once on load.
 * Niche/signal/platform filtering is client-side (instant, no re-fetch).
 * Only re-fetches on explicit refresh().
 */
export function useTrends(userNiches = []) {
  const [allTrends, setAllTrends] = useState([])
  const [allRecommendations, setAllRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const nicheKey = userNiches.slice().sort().join(',')

  const fetchAll = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      // Pass user's selected niches so backend scrapes the right topics
      const data = await (isRefresh
        ? refreshTrends(userNiches, [])
        : getTrends(userNiches, [])
      )
      setAllTrends(data.trends || [])
      setAllRecommendations(data.recommendations || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch trends:', err)
      setError(err.message || 'Failed to load trends')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [nicheKey])  // refetch only if user's niche set changes

  useEffect(() => { fetchAll(false) }, [fetchAll])

  const refresh = useCallback(() => fetchAll(true), [fetchAll])

  return { allTrends, allRecommendations, loading, refreshing, error, lastUpdated, refresh }
}
