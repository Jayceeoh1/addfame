'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/callback', '/']

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const settingSession = useRef(false)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const sb = createClient()

    const isPublic = () => PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))

    // Auto-refresh token înainte să expire (la fiecare 45 minute)
    async function scheduleRefresh() {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      const { data: { session } } = await sb.auth.getSession()
      if (!session) return

      const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000
      const refreshIn = Math.max(0, expiresAt - Date.now() - 5 * 60 * 1000) // 5 min înainte de expirare

      refreshTimer.current = setTimeout(async () => {
        const { error } = await sb.auth.refreshSession()
        if (!error) scheduleRefresh() // re-schedule după refresh
      }, Math.min(refreshIn, 45 * 60 * 1000))
    }

    scheduleRefresh()

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        scheduleRefresh()
      }
      if (event === 'SIGNED_OUT') {
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        if (!isPublic()) {
          router.replace('/auth/login?expired=1')
        }
      }
    })

    // Check session validity on focus (tab switch back)
    async function checkOnFocus() {
      await new Promise(r => setTimeout(r, 200))
      const { data: { session }, error } = await sb.auth.getSession()
      if (!session && !error) {
        if (!isPublic()) {
          router.replace('/auth/login?expired=1')
        }
      } else if (session) {
        // Refresh dacă expiră în mai puțin de 10 minute
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
        if (expiresAt && expiresAt - Date.now() < 10 * 60 * 1000) {
          await sb.auth.refreshSession()
        }
      }
    }

    window.addEventListener('focus', checkOnFocus)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', checkOnFocus)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [router, pathname])

  return <>{children}</>
}
