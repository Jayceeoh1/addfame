'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ImpersonateCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Te logăm...')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient()

        // Tokenurile vin în fragment URL (#access_token=...)
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (!access_token || !refresh_token) {
          // Verifică și search params (token_hash)
          const sp = new URLSearchParams(window.location.search)
          const token_hash = sp.get('token_hash')
          const type = sp.get('type')

          if (token_hash && type) {
            const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
            if (error) throw error
          } else {
            throw new Error('Lipsesc tokenurile de autentificare')
          }
        } else {
          // Setăm sesiunea direct cu tokenurile primite
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) throw error
        }

        setStatus('Sesiune creată! Te redirecționăm...')

        // Curăță fragment-ul din URL
        window.history.replaceState(null, '', window.location.pathname)

        // Determină destinația
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: brand } = await supabase.from('brands').select('id').eq('user_id', user.id).maybeSingle()
          if (brand) {
            window.location.href = '/brand/dashboard'
            return
          }

          const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
          if (inf) {
            window.location.href = '/influencer/dashboard'
            return
          }

          const { data: adm } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
          if (adm) {
            window.location.href = '/admin/dashboard'
            return
          }
        }

        window.location.href = '/'
      } catch (e: any) {
        console.error('Impersonation error:', e)
        setStatus('❌ Eroare: ' + (e.message || 'necunoscută'))
        setTimeout(() => router.push('/auth/login?error=impersonation_failed'), 2000)
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-purple-100 border-t-purple-500 animate-spin" />
        <h1 className="text-lg font-black text-gray-900 mb-2">Login ca user</h1>
        <p className="text-sm text-gray-500">{status}</p>
      </div>
    </div>
  )
}
