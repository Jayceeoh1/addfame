'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isDeleteConfirm, type Blocker } from '@/lib/account-deletion'

type ApiBody = {
  ok?: boolean
  authenticated?: boolean
  emailMasked?: string
  status?: 'unverified' | 'pending' | 'blocked' | 'completed'
  message?: string
  error?: string
  blockers?: Blocker[]
  confirmationCode?: string
  signOut?: boolean
}

export function DeletionRequestForm({ source = 'web' }: { source?: 'app' | 'web' }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [emailMasked, setEmailMasked] = useState('')
  const [email, setEmail] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [blockers, setBlockers] = useState<Blocker[]>([])
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<ApiBody['status']>()

  useEffect(() => {
    let cancelled = false
    fetch('/api/account/deletion-request')
      .then(r => r.json())
      .then((data: ApiBody) => {
        if (cancelled) return
        setAuthenticated(!!data.authenticated)
        setEmailMasked(data.emailMasked || '')
        if (data.status) setStatus(data.status)
        if (data.blockers?.length) setBlockers(data.blockers)
        if (data.confirmationCode) setCode(data.confirmationCode)
        if (data.status === 'blocked' && data.message) setMessage(data.message)
        if (!data.ok && data.error) setError(data.error)
      })
      .catch(() => { if (!cancelled) setError('Nu am putut încărca formularul. Reîncarcă pagina.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (authenticated && !isDeleteConfirm(confirm)) {
      setError('Scrie ȘTERGE pentru a confirma.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authenticated ? { source } : { source, email }),
      })
      const data: ApiBody = await res.json().catch(() => ({}))
      setStatus(data.status)
      setBlockers(data.blockers || [])
      setCode(data.confirmationCode || '')
      if (data.status) {
        setMessage(data.message || '')
      } else {
        setError(data.error || data.message || 'Nu am putut trimite cererea.')
      }
      if (data.signOut) {
        try { await createClient().auth.signOut() } catch { /* sesiunea poate fi deja închisă */ }
        if (!window.location.pathname.startsWith('/stergere-cont')) {
          window.location.assign('/stergere-cont?confirmat=1')
          return
        }
        setAuthenticated(false)
      }
    } catch {
      setError('Conexiunea a eșuat. Încearcă din nou.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="adr" onSubmit={onSubmit}>
      <style>{`
        .adr{display:flex;flex-direction:column;gap:14px;font-family:inherit;color:#14123a}
        .adr p{margin:0}
        .adr-label{font-size:14px;font-weight:700}
        .adr-input{width:100%;min-height:48px;padding:12px 14px;border:1.5px solid #dcd9ee;border-radius:12px;font-size:16px;font-family:inherit;color:#14123a;background:#fff;box-sizing:border-box}
        .adr-input:focus{outline:none;border-color:#5a35e6;box-shadow:0 0 0 4px rgba(90,53,230,.12)}
        .adr-btn{min-height:48px;border:0;border-radius:12px;background:#b42318;color:#fff;font-weight:800;font-size:15px;padding:12px 18px;cursor:pointer;font-family:inherit}
        .adr-btn:disabled{opacity:.55;cursor:not-allowed}
        .adr-note{font-size:14px;color:#4a4770;line-height:1.5}
        .adr-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:14px;padding:14px 16px;font-size:15px}
        .adr-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:14px;padding:14px 16px;font-size:15px}
        .adr-list{margin:8px 0 0;padding-left:18px}
        .adr-list li{margin:0 0 6px}
        .adr-code{font-weight:800}
      `}</style>

      {loading && <p className="adr-note">Se încarcă…</p>}

      {!loading && status === 'completed' && (
        <div className="adr-ok" role="status">
          <p>{message || 'Contul a fost închis.'}</p>
          {code && <p style={{ marginTop: 8 }}>Cod de referință: <span className="adr-code">{code}</span></p>}
        </div>
      )}

      {!loading && status !== 'completed' && authenticated && (
        <>
          <p className="adr-note">
            Ești autentificat{emailMasked ? <> ca <strong>{emailMasked}</strong></> : ''}. Cererea se aplică acestui cont
            (brand sau creator, inclusiv dacă profilul încă așteaptă aprobarea).
          </p>
          <div>
            <label className="adr-label" htmlFor="adr-confirm">Scrie ȘTERGE pentru confirmare</label>
            <input
              id="adr-confirm"
              className="adr-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder="ȘTERGE"
              style={{ marginTop: 8 }}
            />
          </div>
          <button className="adr-btn" type="submit" disabled={busy || !isDeleteConfirm(confirm)}>
            {busy ? 'Se trimite…' : 'Trimite cererea de ștergere'}
          </button>
        </>
      )}

      {!loading && status !== 'completed' && !authenticated && (
        <>
          <p className="adr-note">
            Nu ești autentificat. Poți nota cererea cu emailul contului. Contul se închide doar după ce confirmi că ești titularul:
            autentifică-te și apasă din nou, sau scrie-ne de pe aceeași adresă.
          </p>
          <div>
            <label className="adr-label" htmlFor="adr-email">Emailul contului</label>
            <input
              id="adr-email"
              className="adr-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ marginTop: 8 }}
            />
          </div>
          <button className="adr-btn" type="submit" disabled={busy}>
            {busy ? 'Se trimite…' : 'Înregistrează cererea'}
          </button>
          <p className="adr-note">
            Ai parola? <a href="/auth/login">Autentifică-te</a> și cererea se aplică direct contului tău.
          </p>
        </>
      )}

      {message && status !== 'completed' && <div className={status === 'blocked' ? 'adr-err' : 'adr-ok'} role="status">{message}</div>}
      {blockers.length > 0 && status !== 'completed' && (
        <ul className="adr-list">
          {blockers.map(b => <li key={b.code + b.message}>{b.message}</li>)}
        </ul>
      )}
      {code && status && status !== 'completed' && (
        <p className="adr-note">Cod de referință: <span className="adr-code">{code}</span></p>
      )}
      {error && <div className="adr-err" role="alert">{error}</div>}
    </form>
  )
}
