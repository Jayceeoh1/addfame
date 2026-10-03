'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Inbox } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'

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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f6fc' }}><div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e2dcff', borderTopColor: '#7040f0' }} /></div>}>
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

  const provider = getEmailProvider(email)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Te rugăm să introduci emailul'); return }
    setLoading(true); setError(null)
    try {
      // Apelăm API-ul nostru care generează link cu token_hash și trimite prin Resend
      // Evităm astfel ca Yahoo/Outlook link-preview să consume token-ul PKCE
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      if (!res.ok) throw new Error('Server error')
      setSent(true)
    } catch (e: any) { setError(e.message || 'Nu s-a putut trimite emailul de resetare. Încearcă din nou.') }
    finally { setLoading(false) }
  }

  async function handleResend() {
    setResending(true)
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } catch (_) {}
    finally { setResending(false) }
  }

  return (
    <AuthShell variant="reset">
      {sent ? (
        /* ── Email trimis, cu deschidere directă a aplicației de email ── */
        <div className="au-stack au-enter">
          <div>
            <span className="au-role-icon" style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#22c8f0,#7040f0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
              <CheckCircle size={26} />
            </span>
            <h1 className="au-h1">Email trimis!</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>
              Am trimis un link de resetare la <b style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>{email}</b>
            </p>
          </div>

          {provider ? (
            <a href={provider.url} target="_blank" rel="noopener noreferrer" className="au-btn">
              <Mail size={18} /> Deschide {provider.name} <ExternalLink size={15} style={{ opacity: 0.75 }} />
            </a>
          ) : (
            <a href={`mailto:${email}`} className="au-btn">
              <Inbox size={18} /> Deschide aplicația de email
            </a>
          )}

          <div className="au-alert au-alert-warn" style={{ marginBottom: 0 }}>
            <AlertCircle size={18} />
            <div><b>Nu găsești emailul?</b><br />Verifică folderul <b>Spam / Junk</b> — uneori emailurile de resetare ajung acolo.</div>
          </div>

          <div style={{ borderTop: '1px solid #ecebf5', paddingTop: 16, textAlign: 'center' }}>
            <p className="au-hint" style={{ margin: '0 0 8px' }}>Nu ai primit nimic după 2 minute?</p>
            {resent ? (
              <p style={{ margin: 0, fontWeight: 800, color: '#047857', display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} /> Email retrimis!</p>
            ) : (
              <button type="button" onClick={handleResend} disabled={resending} className="au-btn-ghost" style={{ color: 'var(--ac)' }}>
                <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Se retrimite…' : 'Retrimite emailul'}
              </button>
            )}
          </div>

          <Link href="/auth/login" className="au-btn-ghost" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Înapoi la login
          </Link>
        </div>
      ) : (
        /* ── Formular ── */
        <div className="au-enter">
          <h1 className="au-h1">Resetează parola</h1>
          <p className="au-sub">Introdu emailul și îți trimitem un link de resetare.</p>

          <form onSubmit={handleSubmit} className="au-stack">
            <div className="au-field">
              <label htmlFor="fp-email" className="au-label">Adresă de email</label>
              <div className="au-city">
                <Mail size={18} className="au-city-icon" />
                <input
                  id="fp-email"
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@companie.com" disabled={loading}
                  autoComplete="email" inputMode="email"
                  className="au-input" style={{ paddingRight: 16 }}
                />
              </div>
              {provider && (
                <p className="au-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> Vom trimite la {provider.name}
                </p>
              )}
            </div>

            {error && (
              <div className="au-alert au-alert-err" role="alert" style={{ marginBottom: 0 }}>
                <AlertCircle size={18} /> <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="au-btn">
              {loading ? <><span className="au-spin" /> Se trimite…</> : 'Trimite link de resetare'}
            </button>
          </form>

          <Link href="/auth/login" className="au-btn-ghost" style={{ textDecoration: 'none', marginTop: 12 }}>
            <ArrowLeft size={16} /> Înapoi la login
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
