import { useState, useCallback, useRef } from 'react'
import { getTrends, refreshTrends } from '../../../lib/api.js'

export function useTrends(nicheIds = [], { lazy = false } = {}) {
  const [allTrends, setAllTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchingRef = useRef(false)

  const fetchNow = useCallback(async (niches = nicheIds) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    try {
      const data = await getTrends(niches, [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
    } finally {
      fetchingRef.current = false
      setLoading(false)
    }
  }, [nicheIds])

  const refresh = useCallback(async (niches = nicheIds) => {
    setRefreshing(true)
    try {
      const data = await refreshTrends(niches, [])
      setAllTrends(data.trends || [])
      setLastUpdated(new Date())
    } finally {
      setRefreshing(false)
    }
  }, [nicheIds])

  return { allTrends, loading, refreshing, lastUpdated, fetchNow, refresh }
}
