import { useState, useCallback, useRef } from 'react'
import { getTrends, refreshTrends } from '../../../lib/api.js'

const POLL_MAX = 3
const POLL_DELAY_MS = 7000 // bounded ~21s total — never polls forever

export function useTrends(nicheIds = [], { lazy = false } = {}) {
  const [allTrends, setAllTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [warming, setWarming] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchingRef = useRef(false)

  const fetchNow = useCallback(async (niches = nicheIds) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    try {
      let data = await getTrends(niches, [])
      let attempt = 0
      // First load of an un-warmed niche: backend warms its pool in the
      // background. Poll a bounded number of times so results appear without a
      // manual refresh — but never spin forever.
      while (data.warming && (data.trends?.length ?? 0) === 0 && attempt < POLL_MAX) {
        setWarming(true)
        await new Promise(r => setTimeout(r, POLL_DELAY_MS))
        data = await getTrends(niches, [])
        attempt++
      }
      setWarming(false)
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

  return { allTrends, loading, warming, refreshing, lastUpdated, fetchNow, refresh }
}
