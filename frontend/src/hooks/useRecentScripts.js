import { useState, useEffect } from 'react'
import { getSavedScripts } from '../lib/api.js'

export function useRecentScripts(limit = 3) {
  const [scripts, setScripts] = useState([])

  useEffect(() => {
    getSavedScripts()
      .then(data => {
        const list = Array.isArray(data) ? data : data?.data || []
        setScripts(list.slice(0, limit))
      })
      .catch(() => {})
  }, [limit])

  return scripts
}
