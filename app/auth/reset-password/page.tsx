'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Dacă Supabase a redirectat cu eroare (token expirat)
    const urlError = searchParams.get('error')
    const urlErrorCode = searchParams.get('error_code')
    if (urlError || urlErrorCode) {
      setError('Link-ul a expirat sau a fost deja folosit. Te rugăm să soliciți unul nou.')
      setChecking(false)
      return
    }

    // Verificăm dacă există sesiune serverside (setată de /auth/callback prin cookie)
    // Facem un call la API-ul nostru server — dacă returnează 401, nu e sesiune
    fetch('/api/auth/check-session')
      .then(res => {
        if (res.ok) {
          setReady(true)
        } else {
          setError('Link invalid sau expirat. Te rugăm să soliciți unul nou.')
        }
      })
      .catch(() => setError('Eroare de rețea. Încearcă din nou.'))
      .finally(() => setChecking(false))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere.'); return }
    if (password !== confirm) { setError('Parolele nu coincid.'); return }

    setLoading(true)
    setError(null)

    try {
      // Trimitem parola la API-ul server care folosește sesiunea din cookie
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Nu s-a putut schimba parola. Încearcă din nou.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.replace('/auth/login?reset=success'), 2000)
    } catch {
      setError('Eroare de rețea. Încearcă din nou.')
      setLoading(false)
    }
  }

  return (
    <AuthShell variant="reset">
      {success ? (
        <div className="au-stack au-enter" role="status">
          <span style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#22c8f0,#7040f0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={26} />
          </span>
          <div>
            <h1 className="au-h1">Parola a fost schimbată!</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>Te redirecționăm la login...</p>
          </div>
        </div>

      ) : checking ? (
        <div className="au-stack au-enter" style={{ alignItems: 'center', textAlign: 'center', paddingBlock: 24 }} role="status">
          <span className="au-spin" style={{ width: 36, height: 36, borderWidth: 3, borderColor: '#e2dcff', borderTopColor: '#7040f0' }} />
          <p className="au-sub" style={{ margin: 0 }}>Se verifică sesiunea...</p>
        </div>

      ) : error && !ready ? (
        <div className="au-stack au-enter">
          <span style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={26} />
          </span>
          <div>
            <h1 className="au-h1">Link invalid</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>{error}</p>
          </div>
          <button type="button" onClick={() => router.push('/auth/forgot-password')} className="au-btn">
            Solicită un link nou
          </button>
        </div>

      ) : (
        <form onSubmit={handleSubmit} className="au-stack au-enter">
          <div>
            <span style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#22c8f0,#7040f0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <Lock size={24} />
            </span>
            <h1 className="au-h1">Setează parola nouă</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>Minim 8 caractere.</p>
          </div>

          {error && (
            <div className="au-alert au-alert-err" role="alert" style={{ marginBottom: 0 }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="au-field">
            <label htmlFor="rp-pass" className="au-label">Parolă nouă</label>
            <div className="au-pw">
              <input
                id="rp-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minim 8 caractere"
                autoComplete="new-password"
                required
                className="au-input"
              />
              <button type="button" onClick={() => setShowPass(p => !p)} className="au-eye" aria-label={showPass ? 'Ascunde parola' : 'Arată parola'}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="au-field">
            <label htmlFor="rp-confirm" className="au-label">Confirmă parola</label>
            <input
              id="rp-confirm"
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repetă parola"
              autoComplete="new-password"
              required
              className="au-input"
            />
          </div>

          <button type="submit" disabled={loading} className="au-btn">
            {loading ? <><span className="au-spin" /> Se salvează...</> : <>Salvează parola nouă <ArrowRight size={18} /></>}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f6fc' }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e2dcff', borderTopColor: '#7040f0' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
