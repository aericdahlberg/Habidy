'use client'

import { useEffect } from 'react'

const CACHE_KEY = 'habidy_tz'

export function useTimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (typeof tz !== 'string' || !tz) return
    if (localStorage.getItem(CACHE_KEY) === tz) return

    fetch('/api/profile/timezone', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    })
      .then((r) => { if (r.ok) localStorage.setItem(CACHE_KEY, tz) })
      .catch(() => { /* non-critical, will retry next visit */ })
  }, [])
}
