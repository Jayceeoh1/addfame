'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Implicit flow — tokenurile vin în hash: #access_token=...&type=recovery
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.replace('#', ''))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (type === 'recovery' && access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token })
          .then(({ error }) => {
            if (error) {
              setError('Link invalid sau expirat. Te rugăm să soliciți unul nou.')
            } else {
              setReady(true)
            }
          })
        return
      }
    }

    // Fallback — verifică dacă există deja sesiune activă de tip recovery
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else if (!hash?.includes('access_token')) {
        setError('Link invalid sau expirat. Te rugăm să soliciți unul nou.')
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere.'); return }
    if (password !== confirm) { setError('Parolele nu coincid.'); return }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    setSuccess(true)
    setTimeout(() => router.replace('/auth/login?reset=success'), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50 p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', padding: '28px 28px 24px' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl">Parolă nouă</p>
              <p className="text-white/80 text-sm">AddFame.ro</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="font-black text-gray-900 text-lg">Parola a fost schimbată!</p>
              <p className="text-sm text-gray-500 mt-2">Te redirecționăm la login...</p>
            </div>
          ) : error && !ready ? (
            <div className="text-center py-4">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="font-black text-gray-900 mb-2">Link invalid</p>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <button onClick={() => router.push('/auth/forgot-password')}
                className="w-full py-3 rounded-2xl font-black text-white"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                Solicită un link nou
              </button>
            </div>
          ) : !ready ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Se verifică linkul...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-gray-900 font-black text-lg mb-1">Setează parola nouă</p>
                <p className="text-gray-500 text-sm">Minim 8 caractere.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="relative">
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Parolă nouă</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minim 8 caractere"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition pr-10"
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Confirmă parola</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repetă parola"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                {loading ? 'Se salvează...' : 'Salvează parola nouă →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
