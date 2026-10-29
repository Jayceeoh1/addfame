'use client'

import { useEffect, useState } from 'react'
import { readIsNativeApp } from '@/lib/native-app'

/**
 * False during SSR and the first client render, so the website HTML matches
 * hydration. The head boot script hides purchase UI with CSS before that,
 * and this flips to true as soon as the bridge or user-agent token is visible.
 * Once true it stays true for the rest of the page.
 */
export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false)

  useEffect(() => {
    const sync = () => setNative(prev => prev || readIsNativeApp())
    sync()
    const timers = [0, 50, 200, 600, 1200].map(ms => window.setTimeout(sync, ms))
    window.addEventListener('load', sync)
    return () => {
      timers.forEach(id => window.clearTimeout(id))
      window.removeEventListener('load', sync)
    }
  }, [])

  return native
}
