import { useState, useEffect, useCallback, useRef } from 'react'
import { getTrends, refreshTrends } from '../lib/api.js'

export function useTrends(niches = [], platforms = []) {
  const [trends, setTrends] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const abortRef = useRef(null)

  const fetchTrends = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await (isRefresh
        ? refreshTrends(niches, platforms)
        : getTrends(niches, platforms)
      )
      setTrends(data.trends || [])
      setRecommendations(data.recommendations || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch trends:', err)
      setError(err.message || 'Failed to load trends')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [niches.join(','), platforms.join(',')])

  useEffect(() => {
    fetchTrends(false)
  }, [fetchTrends])

  const refresh = useCallback(() => {
    fetchTrends(true)
  }, [fetchTrends])

  return {
    trends,
    recommendations,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh
  }
}
