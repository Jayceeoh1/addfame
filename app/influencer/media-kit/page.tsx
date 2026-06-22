'use client'
// @ts-nocheck

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MediaKitRedirect() {
  const router = useRouter()

  useEffect(() => {
    async function go() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: inf } = await sb
        .from('influencers')
        .select('id, slug, name')
        .eq('user_id', user.id)
        .single()

      if (!inf) { router.replace('/influencer/profile'); return }

      // Are slug — merge direct
      if (inf.slug) {
        router.replace(`/influencer/media-kit/${inf.slug}`)
        return
      }

      // Nu are slug — generează și salvează prin API (service role, bypasses RLS)
      const generated = (inf.name || 'creator')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-' + inf.id.slice(0, 6)

      try {
        await fetch('/api/influencer/generate-slug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: generated }),
        })
      } catch (_) { }

      router.replace(`/influencer/media-kit/${generated}`)
    }
    go()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-t-purple-500 border-purple-100 animate-spin mx-auto mb-3"
          style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm text-gray-400 font-semibold">Se pregătește media kit-ul...</p>
      </div>
    </div>
  )
}
