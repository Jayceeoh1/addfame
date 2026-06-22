'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Inbox } from 'lucide-react'

// Detectare client email după domeniu
function getEmailProvider(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  if (domain.includes('gmail') || domain.includes('googlemail')) return {
    name: 'Gmail', color: '#EA4335', bg: '#fef2f2', border: '#fca5a5',
    url: 'https://mail.google.com',
    icon: '📧'
  }
  if (domain.includes('yahoo') || domain.includes('ymail')) return {
    name: 'Yahoo Mail', color: '#6001D2', bg: '#f5f3ff', border: '#c4b5fd',
    url: 'https://mail.yahoo.com',
    icon: '📩'
  }
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) return {
    name: 'Outlook', color: '#0078D4', bg: '#eff6ff', border: '#93c5fd',
    url: 'https://outlook.live.com',
    icon: '📬'
  }
  if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com')) return {
    name: 'iCloud Mail', color: '#1a73e8', bg: '#eff6ff', border: '#93c5fd',
    url: 'https://www.icloud.com/mail',
    icon: '📭'
  }
  if (domain.includes('proton') || domain.includes('pm.me')) return {
    name: 'ProtonMail', color: '#6d4aff', bg: '#f5f3ff', border: '#c4b5fd',
    url: 'https://mail.proton.me',
    icon: '🔒'
  }
  return null
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}

function ForgotPasswordContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'link_expirat') {
      setError('Link-ul de resetare a expirat. Te rugăm să soliciți un link nou.')
    }
  }, [searchParams])

  const provider = getEmailProvider(email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Te rugăm să introduci emailul'); return }
    setLoading(true); setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      // Inițializăm o sesiune dummy ca să genereze code_verifier în localStorage
      // înainte de a trimite emailul de resetare
      await sb.auth.getSession()
      const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://addfame.ro/auth/reset-password'
      })
      if (err) throw err
      setSent(true)
    } catch (e: any) { setError(e.message || 'Nu s-a putut trimite emailul de resetare. Încearcă din nou.') }
    finally { setLoading(false) }
  }

  async function handleResend() {
    setResending(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://addfame.ro/auth/reset-password'
      })
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (_) {}
    finally { setResending(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8" style={{ border: '1.5px solid #f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 12px rgba(249,115,22,.35)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
            </div>
            <span className="font-black text-gray-900">AddFame</span>
          </div>

          {sent ? (
            /* ── MODAL SUCCESS cu deschidere email direct ── */
            <div className="text-center">
              {/* Icon animat */}
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ animation: 'bounceIn .4s ease' }}>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-1">Email trimis!</h1>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                Am trimis un link de resetare la<br />
                <span className="font-black text-gray-800">{email}</span>
              </p>

              {/* Buton deschide email — dacă știm providerul */}
              {provider ? (
                <a
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm mb-3 transition hover:opacity-90 active:scale-95"
                  style={{ background: provider.bg, color: provider.color, border: `2px solid ${provider.border}` }}
                >
                  <span className="text-lg">{provider.icon}</span>
                  Deschide {provider.name}
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              ) : (
                <a
                  href={`mailto:${email}`}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm mb-3 transition hover:opacity-90"
                  style={{ background: '#fff7ed', color: '#f97316', border: '2px solid #fed7aa' }}
                >
                  <Inbox className="w-4 h-4" />
                  Deschide aplicația de email
                </a>
              )}

              {/* Avertizare spam */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                <span className="text-base flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-black text-amber-800">Nu găsești emailul?</p>
                  <p className="text-xs text-amber-700 mt-0.5">Verifică folderul <strong>Spam / Junk</strong> — uneori emailurile de resetare ajung acolo.</p>
                </div>
              </div>

              {/* Re-trimitere */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs text-gray-400 mb-2">Nu ai primit nimic după 2 minute?</p>
                {resent ? (
                  <p className="text-xs font-black text-green-600">✓ Email retrimis!</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="flex items-center gap-1.5 text-xs font-black text-orange-500 hover:text-orange-700 transition mx-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Se retrimite…' : 'Retrimite emailul'}
                  </button>
                )}
              </div>

              <Link href="/auth/login" className="text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mt-4">
                <ArrowLeft className="w-3.5 h-3.5" /> Înapoi la login
              </Link>
            </div>
          ) : (
            /* ── FORM ── */
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Resetează parola</h1>
              <p className="text-sm text-gray-400 mb-7">Introdu emailul și îți trimitem un link de resetare</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Adresă de email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@companie.com" disabled={loading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 text-sm font-medium outline-none transition focus:border-orange-400 disabled:opacity-60"
                      style={{ fontFamily: 'inherit' }}
                    />
                  </div>
                  {/* Preview provider detectat */}
                  {provider && (
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <span>{provider.icon}</span> Vom trimite la {provider.name}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
                  {loading ? 'Se trimite…' : 'Trimite link de resetare'}
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
