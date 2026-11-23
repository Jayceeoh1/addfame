'use client'
// Abonamentul Academy Member: prezentare + plată cu cardul (Stripe), iar pentru membri starea și anularea.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyMembership } from '@/app/actions/academy-member'
import { ACADEMY_BADGE_LABEL } from '@/lib/academy-member'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  const [clientSecret, setClientSecret] = useState<string | null>(null)

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
      if (!r.ok || !j.clientSecret) { setErr(j.error || 'Nu am putut porni plata.'); setBusy(false); return }
      setClientSecret(j.clientSecret)
    } catch { setErr('Nu am putut porni plata.') }
    setBusy(false)
  }

  // plata s-a încheiat în fereastră: o închidem și așteptăm confirmarea de la Stripe
  const onComplete = useCallback(() => {
    setClientSecret(null)
    setReturned('ok')
    load()
  }, [load])

  const modal = clientSecret && (
    <div className="am-modal" role="dialog" aria-modal="true" aria-label="Plata abonamentului Academy Member">
      <div className="am-modal-box">
        <div className="am-modal-head">
          <b>🎓 {ACADEMY_BADGE_LABEL}</b>
          <button className="am-x" aria-label="Închide" onClick={() => setClientSecret(null)}>✕</button>
        </div>
        <div className="am-modal-body">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret, onComplete }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  )

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
        {st.community && (
          <div className="am-comm">
            <div><b>💬 Comunitatea privată AddFame Academy</b><span>Intră cu numărul de telefon din profil. Un admin te aprobă în câteva ore.</span></div>
            <a className="am-btn am-wa" href={st.community} target="_blank" rel="noopener noreferrer">Intră în grup</a>
          </div>
        )}
        <Invoices list={st.invoices} />
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
      <button className="am-btn" disabled={!accept || busy} onClick={subscribe}>{busy ? 'Se pregătește plata…' : `Abonează-te cu cardul — ${st.price} lei / lună`}</button>
      {modal}
      <Invoices list={st.invoices} />
      <p className="am-muted am-small">Plata se face prin Stripe. Abonamentul se reînnoiește lunar și îl poți anula oricând de aici; accesul rămâne până la sfârșitul lunii plătite.</p>
    </div>
  )
}

function Invoices({ list }: { list?: { id: string; at: string; amount: number; ready: boolean }[] }) {
  if (!list?.length) return null
  return (
    <details className="am-inv">
      <summary>🧾 Facturile tale ({list.length})</summary>
      <ul>
        {list.map(x => (
          <li key={x.id}>
            <span>{fmtDate(x.at)}</span><b>{x.amount.toLocaleString('ro-RO')} lei</b>
            {x.ready
              ? <a href={`/api/smartbill/academy-invoice-pdf?id=${x.id}`} target="_blank" rel="noopener noreferrer">Descarcă PDF</a>
              : <em>Se emite…</em>}
          </li>
        ))}
      </ul>
    </details>
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
.am-inv{border:1px solid #e6dcff;border-radius:14px;background:#fff;padding:0 12px}
.am-inv summary{cursor:pointer;font-weight:800;font-size:13.5px;padding:11px 0;color:#14123a}
.am-inv ul{list-style:none;margin:0;padding:0 0 10px;display:flex;flex-direction:column;gap:6px}
.am-inv li{display:flex;gap:12px;align-items:center;font-size:13px;color:#4a4770;font-variant-numeric:tabular-nums;flex-wrap:wrap}
.am-inv li span{min-width:110px}.am-inv li b{min-width:70px;color:#14123a}
.am-inv a{color:#5b2fd0;font-weight:800;margin-left:auto}.am-inv em{margin-left:auto;font-style:normal;color:#8a87a8}
.am-comm{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px;border-radius:16px;background:#fff;border:1px solid #d9ccff}
.am-comm b{display:block;font-size:14.5px}.am-comm span{display:block;font-size:12.5px;color:#6a6690;margin-top:2px}
.am-wa{background:#1f9d55;display:inline-flex;align-items:center;text-decoration:none;min-height:42px}
.am-modal{position:fixed;inset:0;z-index:1000;background:rgba(20,18,58,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.am-modal-box{background:#fff;border-radius:22px;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(20,18,58,.35)}
.am-modal-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #eee;color:#14123a}
.am-x{width:34px;height:34px;border-radius:10px;border:0;background:#f3f1fa;font-size:16px;cursor:pointer;color:#14123a}
.am-modal-body{overflow-y:auto;padding:8px 4px}
@media (max-width:520px){.am-modal{padding:0;align-items:flex-end}.am-modal-box{border-radius:22px 22px 0 0;max-height:95vh}}
`
