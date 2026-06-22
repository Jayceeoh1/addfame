'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const code = searchParams.get('code')

  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.hash.replace(/^#/, ''))
  }, [])

  useEffect(() => {
    async function initRecoverySession() {
      setChecking(true)
      setError(null)

      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        // Caz 1: Supabase PKCE link: /auth/reset-password?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error

          setReady(true)
          setChecking(false)
          return
        }

        // Caz 2: Supabase implicit link: /auth/reset-password#access_token=...&refresh_token=...
        const access_token = hashParams?.get('access_token')
        const refresh_token = hashParams?.get('refresh_token')
        const type = hashParams?.get('type')

        if (access_token && refresh_token && type === 'recovery') {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) throw error

          // Curățăm URL-ul ca să nu rămână tokenurile în browser
          window.history.replaceState(null, '', '/auth/reset-password')

          setReady(true)
          setChecking(false)
          return
        }

        // Caz 3: deja există sesiune validă
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setReady(true)
        } else {
          setError('Link-ul de resetare este invalid sau a expirat. Cere un link nou.')
        }
      } catch (e: any) {
        setError(e.message || 'Link-ul de resetare este invalid sau a expirat. Cere un link nou.')
      } finally {
        setChecking(false)
      }
    }

    initRecoverySession()
  }, [code, hashParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Parola trebuie să aibă minimum 8 caractere.')
      return
    }

    if (password !== confirmPassword) {
      setError('Parolele nu coincid.')
      return
    }

    setLoading(true)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      await supabase.auth.signOut()

      setSuccess(true)
      setTimeout(() => router.push('/auth/login?reset=success'), 1500)
    } catch (e: any) {
      setError(e.message || 'Nu am putut actualiza parola. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8" style={{ border: '1.5px solid #f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 12px rgba(249,115,22,.35)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
            </div>
            <span className="font-black text-gray-900">AddFame</span>
          </div>

          {checking ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-500">Verificăm link-ul de resetare…</p>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Parola a fost schimbată!</h1>
              <p className="text-sm text-gray-500">Te redirecționăm către login…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-8">
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-left mb-5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>

              <Link href="/auth/forgot-password" className="w-full block py-3.5 rounded-xl text-sm font-black text-white transition text-center" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                Cere un link nou
              </Link>

              <Link href="/auth/login" className="text-sm font-bold text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1.5 mt-5">
                <ArrowLeft className="w-4 h-4" /> Înapoi la login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Alege parola nouă</h1>
              <p className="text-sm text-gray-400 mb-7">Introdu o parolă nouă pentru contul tău.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Parolă nouă</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 caractere"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 text-sm font-medium outline-none transition focus:border-orange-400 disabled:opacity-60"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Confirmă parola</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repetă parola nouă"
                      disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 text-sm font-medium outline-none transition focus:border-orange-400 disabled:opacity-60"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}
                >
                  {loading ? 'Se salvează…' : 'Schimbă parola'}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link href="/auth/login" className="text-sm font-bold text-gray-400 hover:text-gray-700 flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Înapoi la login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
