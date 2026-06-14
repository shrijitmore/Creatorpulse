import { useState, useEffect } from 'react'
import { getMe } from '../lib/api.js'

// Module-level cache so the sidebar and admin guard share one /me fetch per session.
let cache = null
let inflight = null

export function useMe() {
  const [me, setMe] = useState(cache)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return
    let cancelled = false
    inflight = inflight || getMe()
    inflight
      .then(d => { cache = d; if (!cancelled) { setMe(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
      .finally(() => { inflight = null })
    return () => { cancelled = true }
  }, [])

  return { me, loading, isAdmin: Boolean(me?.isAdmin) }
}
