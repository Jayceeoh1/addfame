'use client'
// @ts-nocheck

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle, Clock, Eye, EyeOff, ArrowRight, TrendingUp, User } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  const emailConfirmed = searchParams.get('confirmed') === '1'
  const passwordReset = searchParams.get('reset') === 'success'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || 'Autentificare eșuată')
        if (result.missingProfile) router.replace('/register')
        return
      }
      if (!result?.success || !result?.session) {
        setError('Autentificare eșuată. Încearcă din nou.')
        return
      }
      const supabase = createClient()
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      })
      // Folosim rolul din metadata JWT ca fallback sigur
      const { data: { user: authedUser } } = await supabase.auth.getUser()
      const role = result.userRole || authedUser?.user_metadata?.role
      const destination = role === 'influencer' ? '/influencer/dashboard' : role === 'admin' ? '/admin' : '/brand/dashboard'
      router.replace(destination)
    } catch (err) {
      setError('A apărut o eroare neașteptată')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell variant="login">
      <div className="au-enter">
        <h1 className="au-h1">Autentificare</h1>
        <p className="au-sub">
          Nu ai cont? <Link href="/auth/register" className="au-link">Creează unul gratuit</Link>
        </p>
      </div>

      {emailConfirmed && (
        <div className="au-alert au-alert-ok au-enter" role="status">
          <CheckCircle size={18} />
          <div><b>Email confirmat cu succes!</b><br />Contul tău e activ. Loghează-te pentru a continua.</div>
        </div>
      )}
      {passwordReset && !error && (
        <div className="au-alert au-alert-ok au-enter" role="status">
          <CheckCircle size={18} />
          <div><b>Parola a fost schimbată.</b><br />Intră în cont cu parola nouă.</div>
        </div>
      )}
      {sessionExpired && !error && (
        <div className="au-alert au-alert-warn au-enter" role="status">
          <Clock size={18} />
          <div><b>Sesiunea a expirat.</b><br />Intră din nou în cont ca să continui.</div>
        </div>
      )}
      {error && (
        <div className="au-alert au-alert-err au-enter" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="au-stack au-enter">
        <div className="au-field">
          <label htmlFor="login-email" className="au-label">Adresă de email</label>
          <input
            id="login-email"
            type="email"
            className="au-input"
            placeholder="tu@exemplu.com"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="au-field">
          <div className="au-label-row">
            <label htmlFor="login-password" className="au-label">Parolă</label>
            <Link href="/auth/forgot-password" className="au-link" style={{ fontSize: 14 }}>Ai uitat parola?</Link>
          </div>
          <div className="au-pw">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="au-input"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="au-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="au-btn" style={{ marginTop: 4 }}>
          {loading ? <><span className="au-spin" /> Se autentifică…</> : <>Intră în cont <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="au-divider">CONT NOU</div>

      <div className="au-roles au-roles-compact au-enter">
        <Link href="/auth/register?type=brand" className="au-role au-role-brand au-role-mini">
          <span className="au-role-icon"><TrendingUp size={18} /></span>
          <b>Sunt brand</b>
        </Link>
        <Link href="/auth/register?type=influencer" className="au-role au-role-infl au-role-mini">
          <span className="au-role-icon"><User size={18} /></span>
          <b>Sunt influencer</b>
        </Link>
      </div>

      <p className="au-legal">
        Autentificându-te ești de acord cu <a href="/termeni">Termeni și Condiții</a> și{' '}
        <a href="/politica-de-confidentialitate">Politica de Confidențialitate</a>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f6fc' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e2dcff', borderTopColor: '#7040f0' }} />
        <p className="text-sm font-medium text-gray-600">Se încarcă...</p>
      </div>
    </div>
  )
}
