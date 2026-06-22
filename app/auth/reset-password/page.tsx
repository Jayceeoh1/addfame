'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()

    const searchParams = new URLSearchParams(window.location.search)
    const tokenHash = searchParams.get('token_hash')
    const typeParam = searchParams.get('type')
    const code = searchParams.get('code')

    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.replace('#', ''))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    if (tokenHash && typeParam === 'recovery') {
      // Flow 1: token_hash direct în URL
      sb.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error: err }) => {
          if (err) setError('Link-ul a expirat sau a fost deja folosit. Solicită un nou link de resetare.')
          else setSessionReady(true)
          setSessionLoading(false)
        })
    } else if (accessToken && type === 'recovery') {
      // Flow 2: token în #hash
      sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ error: err }) => {
          if (err) setError('Link-ul a expirat sau a fost deja folosit. Solicită un nou link de resetare.')
          else setSessionReady(true)
          setSessionLoading(false)
        })
    } else if (code) {
      // Flow 3: PKCE ?code= (când Site URL e addfame.ro și Supabase trimite codul acolo,
      // app/page.tsx îl redirecționează aici cu ?code=)
      sb.auth.exchangeCodeForSession(code)
        .then(({ data, error: err }) => {
          if (!err && data?.session) setSessionReady(true)
          else setError('Link-ul a expirat sau a fost deja folosit. Solicită un nou link de resetare.')
          setSessionLoading(false)
        })
    } else {
      // Flow 4: verifică dacă există sesiune activă
      sb.auth.getSession().then(({ data }) => {
        if (data.session) setSessionReady(true)
        else setError('Link invalid sau expirat. Te rugăm să soliciți un nou link de resetare a parolei.')
        setSessionLoading(false)
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Parola trebuie să aibă cel puțin 8 caractere'); return }
    if (password !== confirm) { setError('Parolele nu coincid'); return }
    setLoading(true); setError(null)
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      setTimeout(() => router.replace('/auth/login'), 2500)
    } catch (e: any) {
      setError(e.message || 'Eroare la resetarea parolei')
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

          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Parolă actualizată!</h1>
              <p className="text-sm text-gray-400">Te redirecționăm către login…</p>
            </div>

          ) : sessionLoading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Se verifică link-ul…</p>
            </div>

          ) : !sessionReady ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Link expirat</h1>
              <p className="text-sm text-gray-400 mb-6">
                {error || 'Link-ul de resetare a expirat sau a fost deja folosit.'}
              </p>
              <Link href="/auth/forgot-password"
                className="inline-block w-full py-3.5 rounded-xl text-sm font-black text-white text-center"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                Solicită un nou link
              </Link>
              <p className="text-xs text-gray-400 mt-4">
                Link-urile de resetare sunt valabile <strong>1 oră</strong> și pot fi folosite o singură dată.
              </p>
            </div>

          ) : (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Setează parola nouă</h1>
              <p className="text-sm text-gray-400 mb-7">Alege o parolă puternică pentru contul tău</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'Parolă nouă', value: password, setter: setPassword, placeholder: 'Minim 8 caractere' },
                  { label: 'Confirmă parola', value: confirm, setter: setConfirm, placeholder: 'Repetă parola' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">{f.label}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPw ? 'text' : 'password'} value={f.value}
                        onChange={e => f.setter(e.target.value)}
                        placeholder={f.placeholder} disabled={loading}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-100 text-sm font-medium outline-none transition focus:border-orange-400 disabled:opacity-60"
                        style={{ fontFamily: 'inherit' }} />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
                  {loading ? 'Se actualizează…' : 'Actualizează parola'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
