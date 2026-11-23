'use client'
// Abonamentul Academy Member: prezentare + plată cu cardul (Stripe), iar pentru membri starea și anularea.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyMembership } from '@/app/actions/academy-member'
import { ACADEMY_BADGE_LABEL } from '@/lib/academy-member'

const BENEFITS = [
  ['📚', '3 cursuri noi în fiecare luni', 'aproximativ 12 pe lună, practice și ușor de aplicat'],
  ['🎬', 'Feedback pe materialele tale', 'Reel-uri, Story-uri sau materiale de campanie'],
  ['🔎', 'Analiza profilului tău', 'puncte forte, branduri potrivite și ce poți îmbunătăți'],
  ['🎓', `Bifa ${ACADEMY_BADGE_LABEL} pe profil`, 'o văd și brandurile, cât timp ești membru'],
  ['💬', 'Comunitatea privată și ajutor în privat', 'pentru briefuri, Reel-uri și colaborări'],
] as const

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

export default function AcademyMembership({ compact = false }: { compact?: boolean }) {
  const [st, setSt] = useState<any>(null)
  const [accept, setAccept] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [returned, setReturned] = useState<string | null>(null)

  const load = useCallback(() => getMyMembership().then(setSt).catch(() => setSt({ error: 'Nu am putut încărca abonamentul.' })), [])
  useEffect(() => {
    load()
    try { setReturned(new URLSearchParams(window.location.search).get('abonament')) } catch { /* */ }
  }, [load])
  // după plată, Stripe confirmă în câteva secunde: reîncărcăm de câteva ori
  useEffect(() => {
    if (returned !== 'ok' || st?.active) return
    let n = 0
    const t = setInterval(() => { n++; load(); if (n >= 6) clearInterval(t) }, 2500)
    return () => clearInterval(t)
  }, [returned, st?.active, load])

  async function subscribe() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/academy/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accept }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.url) { setErr(j.error || 'Nu am putut porni plata.'); setBusy(false); return }
      window.location.href = j.url
    } catch { setErr('Nu am putut porni plata.'); setBusy(false) }
  }

  async function manage(action: 'cancel' | 'resume') {
    setBusy(true); setErr('')
    const r = await fetch('/api/academy/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false); setConfirmCancel(false)
    if (!r.ok) { setErr(j.error || 'Nu am putut actualiza abonamentul.'); return }
    load()
  }

  if (!st) return null
  if (st.error) return <div className="am-card"><style>{CSS}</style><p className="am-muted">{st.error}</p></div>

  if (st.active) {
    return (
      <div className="am-card am-on" id="academy-member">
        <style>{CSS}</style>
        <div className="am-row">
          <span className="am-badge">🎓 {ACADEMY_BADGE_LABEL}</span>
          <span className="am-muted">{st.price} lei / lună</span>
        </div>
        <h3>Ești membru AddFame Academy</h3>
        <p className="am-muted">
          {st.canceling
            ? <>Abonamentul nu se mai reînnoiește. Accesul și bifa rămân active până pe <b>{st.until ? fmtDate(st.until) : '—'}</b>.</>
            : <>Accesul și bifa sunt active până pe <b>{st.until ? fmtDate(st.until) : '—'}</b>, apoi abonamentul se reînnoiește automat.</>}
        </p>
        {err && <p className="am-err">{err}</p>}
        {st.hasSubscription && (
          st.canceling ? (
            <button className="am-btn" disabled={busy} onClick={() => manage('resume')}>Reactivează abonamentul</button>
          ) : confirmCancel ? (
            <div className="am-row" style={{ justifyContent: 'flex-start' }}>
              <span className="am-muted">Sigur anulezi? Rămâi membru până pe {st.until ? fmtDate(st.until) : '—'}.</span>
              <button className="am-btn am-danger" disabled={busy} onClick={() => manage('cancel')}>Da, anulează</button>
              <button className="am-btn am-ghost" disabled={busy} onClick={() => setConfirmCancel(false)}>Nu</button>
            </div>
          ) : (
            <button className="am-btn am-ghost" disabled={busy} onClick={() => setConfirmCancel(true)}>Anulează abonamentul</button>
          )
        )}
      </div>
    )
  }

  return (
    <div className="am-card" id="academy-member">
      <style>{CSS}</style>
      <div className="am-row">
        <span className="am-badge">🎓 {ACADEMY_BADGE_LABEL}</span>
        <span className="am-price"><b>{st.price} lei</b> / lună</span>
      </div>
      <h3>Devino {ACADEMY_BADGE_LABEL}</h3>
      {returned === 'ok' && <p className="am-ok">Mulțumim! Confirmăm plata, durează câteva secunde…</p>}
      {!compact && (
        <ul className="am-list">
          {BENEFITS.map(([ic, t, d]) => <li key={t}><span>{ic}</span><div><b>{t}</b><small>{d}</small></div></li>)}
        </ul>
      )}
      <label className="am-consent">
        <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} />
        <span>Vreau acces imediat la cursuri și înțeleg că, odată ce accesul la conținutul digital începe, renunț la dreptul de retragere de 14 zile. Am citit <Link href="/termeni#s-11" target="_blank">termenii abonamentului</Link>.</span>
      </label>
      {err && <p className="am-err">{err}</p>}
      <button className="am-btn" disabled={!accept || busy} onClick={subscribe}>{busy ? 'Se deschide plata…' : `Abonează-te cu cardul — ${st.price} lei / lună`}</button>
      <p className="am-muted am-small">Plata se face prin Stripe. Abonamentul se reînnoiește lunar și îl poți anula oricând de aici; accesul rămâne până la sfârșitul lunii plătite.</p>
    </div>
  )
}

const CSS = `
.am-card{background:#fff;border:1px solid #e8e5f3;border-radius:22px;padding:20px;display:flex;flex-direction:column;gap:12px;color:#14123a}
.am-card.am-on{background:linear-gradient(135deg,#f5f1ff,#eef5ff);border-color:#d9ccff}
.am-card h3{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em}
.am-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.am-badge{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;background:linear-gradient(120deg,#5b2fd0,#3a8bff);color:#fff;font-weight:800;font-size:12.5px}
.am-price{font-size:14px;color:#4a4770}.am-price b{font-size:20px;color:#14123a}
.am-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.am-list li{display:flex;gap:10px;align-items:flex-start}.am-list li>span{font-size:18px;line-height:1.2}
.am-list b{display:block;font-size:14.5px}.am-list small{display:block;font-size:12.5px;color:#6a6690}
.am-consent{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;background:#f9f7ff;border:1px solid #e6dcff;font-size:12.5px;line-height:1.5;color:#4a4770;cursor:pointer}
.am-consent input{width:18px;height:18px;accent-color:#5b2fd0;flex:none;margin-top:1px}
.am-consent a{color:#5b2fd0;font-weight:700}
.am-btn{min-height:46px;padding:0 18px;border-radius:14px;border:0;background:linear-gradient(120deg,#5b2fd0,#3a8bff);color:#fff;font:inherit;font-weight:800;font-size:15px;cursor:pointer}
.am-btn:disabled{opacity:.45;cursor:not-allowed}
.am-btn.am-ghost{background:#fff;color:#14123a;border:1px solid #e0dcf0}
.am-btn.am-danger{background:#b42318}
.am-muted{color:#6a6690;font-size:13.5px;line-height:1.5;margin:0}.am-small{font-size:12px}
.am-err{margin:0;color:#b42318;font-weight:700;font-size:13px}
.am-ok{margin:0;color:#14532d;font-weight:700;font-size:13px}
`
