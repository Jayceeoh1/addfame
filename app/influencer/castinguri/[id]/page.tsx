'use client'

// Pagina unui eveniment: detalii + „Vreau să vin” (formular) + statusul înscrierii (aprobat → cod de intrare).

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, Instagram, Youtube, Ticket, ExternalLink, Clock, XCircle, Mail } from 'lucide-react'
import { getEventForInfluencer, applyToEvent, cancelEventApplication } from '@/app/actions/event-signup'

function fmt(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtLong(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

type Form = { full_name: string; phone: string; city: string; address: string; instagram: string; message: string }
const EMPTY: Form = { full_name: '', phone: '', city: '', address: '', instagram: '', message: '' }

export default function EvenimentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [cancelAsk, setCancelAsk] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  async function load() {
    const r = await getEventForInfluencer(id)
    if (!('success' in r)) {
      if (r.error === 'Neautentificat') router.push('/auth/login')
      else router.push('/influencer/castinguri')
      return
    }
    setData(r)
    const src = r.application && r.application.status !== 'cancelled' ? r.application : r.prefill
    setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(src || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } as Form)
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  function openForm() {
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setErrors({}); setFormError(null)
    const r = await applyToEvent(id, form)
    setSending(false)
    if ('error' in r) {
      setFormError(r.error)
      if (r.fieldErrors) setErrors(r.fieldErrors as any)
      return
    }
    setShowForm(false)
    await load()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function cancel() {
    setSending(true)
    const r = await cancelEventApplication(id)
    setSending(false); setCancelAsk(false)
    if ('error' in r && r.error) { setFormError(r.error); return }
    await load()
  }

  if (loading || !data) return (
    <div className="iu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
      <Loader2 className="animate-spin" size={30} color="#7040f0" />
    </div>
  )

  const ev = data.event
  const brand = data.brand
  const app = data.application
  const status: string | null = app?.status ?? null
  const active = status === 'pending' || status === 'approved'
  const grey = { background: '#f0eff7', color: '#4a4770' }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="iu cd" style={{ maxWidth: 760 }}>
      <style>{`
        .cd-hero { height: 240px; border-radius: 20px; overflow: hidden; background: linear-gradient(135deg,#efeaff,#f6f1ff); }
        .cd-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cd-meta { display: flex; flex-wrap: wrap; gap: 8px; }
        .cd-meta .iu-chip { height: 30px; padding: 0 12px; font-size: 13px; }
        .cd-desc { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.75; font-size: 15px; margin: 0; }
        .cd-hot { border-radius: 16px; padding: 12px 16px; background: #fff1e6; color: #9a4206; display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 14px; }
        .cd-invite { border-radius: 16px; padding: 14px 16px; background: linear-gradient(135deg,#7040f0,#9030f0); color: #fff; display: flex; gap: 12px; align-items: center; }
        .cd-cta { width: 100%; height: 54px; font-size: 16px; border-radius: 14px; }
        .cd-state { padding: 22px 20px; display: flex; flex-direction: column; gap: 10px; }
        .cd-state h3 { margin: 0; }
        .cd-ticket { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border: 2px dashed #8fd6b4; border-radius: 16px; padding: 14px 16px; background: #fff; }
        .cd-ticket b { font-size: 26px; letter-spacing: .08em; font-variant-numeric: tabular-nums; color: #14532d; }
        .cd-sum { display: grid; grid-template-columns: 110px 1fr; gap: 6px 12px; font-size: 14px; }
        .cd-sum span { color: #6a6690; }
        .cd-form { display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 80px; }
        .cd-f { display: flex; flex-direction: column; gap: 6px; }
        .cd-f label { font-size: 13px; font-weight: 700; color: #2b2856; }
        .cd-f label em { font-style: normal; font-weight: 500; color: #8783a8; }
        .cd-f .iu-input { width: 100%; height: 48px; font-size: 16px; }
        .cd-f textarea.iu-input { height: auto; min-height: 96px; padding: 12px 14px; resize: vertical; line-height: 1.5; }
        .cd-f .err { font-size: 12.5px; color: #b42318; font-weight: 600; }
        .cd-f.bad .iu-input { border-color: #f04438; }
        .cd-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cd-privacy { font-size: 12.5px; color: #6a6690; background: #f7f4ff; border-radius: 12px; padding: 10px 12px; margin: 0; line-height: 1.5; }
        .cd-alert { border-radius: 12px; padding: 10px 12px; background: #fde8e6; color: #b42318; font-size: 13.5px; font-weight: 600; }
        .cd-row { display: flex; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 767px) {
          .cd-hero { height: 190px; border-radius: 16px; }
          .cd-two { grid-template-columns: 1fr; }
          .cd-sum { grid-template-columns: 1fr; gap: 2px; }
          .cd-sum span { margin-top: 6px; }
          .cd-row .iu-btn { flex: 1; height: 46px; }
        }
      `}</style>

      <div>
        <Link href="/influencer/castinguri" className="iu-btn"><ArrowLeft size={16} /> Evenimente</Link>
      </div>

      <div className="cd-hero">
        {ev.banner_url && <img src={ev.banner_url} alt={ev.title} />}
      </div>

      {brand && (
        <div className="iu-row" style={{ gap: 12 }}>
          {brand.logo ? (
            <img src={brand.logo} alt={brand.name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid #e5e3f3', flex: 'none' }} />
          ) : (
            <span className="iu-face" style={{ width: 44, height: 44, borderRadius: 12, background: '#efeaff', color: '#5b2fd0', fontSize: 18 }}>{brand.name?.[0]}</span>
          )}
          <div className="iu-col" style={{ minWidth: 0, flex: 1 }}>
            <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.name}</b>
            <span className="iu-xs iu-muted">Organizator</span>
          </div>
          {brand.verification_status === 'verified' && (
            <span className="iu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>✓ Brand verificat</span>
          )}
        </div>
      )}

      <h1>{ev.title}</h1>

      <div className="cd-meta">
        {ev.event_date && <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}><Calendar size={14} /> {fmt(ev.event_date)}</span>}
        {ev.event_location && <span className="iu-chip" style={grey}><MapPin size={14} /> {ev.event_location}</span>}
        {ev.min_followers > 0 && <span className="iu-chip" style={grey}><Users size={14} /> Min {fmtNum(ev.min_followers)} urmăritori</span>}
        {ev.slots && <span className="iu-chip" style={grey}><Ticket size={14} /> {ev.slots} locuri</span>}
        {ev.platforms?.map((p: string) => (
          <span key={p} className="iu-chip" style={grey}>
            {p === 'Instagram' && <Instagram size={14} color="#db2777" />}
            {p === 'TikTok' && <TikTokIcon />}
            {p === 'YouTube' && <Youtube size={14} color="#dc2626" />}
            {p}
          </span>
        ))}
      </div>

      {data.invited && !active && (
        <div className="cd-invite">
          <Mail size={22} style={{ flex: 'none' }} />
          <div><b style={{ display: 'block' }}>Ai fost invitat la acest eveniment</b><span style={{ fontSize: 13, opacity: .9 }}>Confirmă cu „Vreau să vin” și completează-ți datele.</span></div>
        </div>
      )}

      {/* ── Starea înscrierii ── */}
      {status === 'approved' && (
        <div className="iu-card cd-state" style={{ background: '#f1fbf6', borderColor: '#bfe8d4' }}>
          <div className="iu-row" style={{ gap: 10 }}><CheckCircle size={28} color="#16a34a" /><h3>Ești pe lista de invitați!</h3></div>
          <p className="iu-sm" style={{ margin: 0, color: '#14532d' }}>
            Te așteptăm{ev.event_date ? <> <b>{fmtLong(ev.event_date)}</b></> : null}{ev.event_location ? <> la <b>{ev.event_location}</b></> : null}. Arată codul de mai jos la intrare.
          </p>
          {app.entry_code && (
            <div className="cd-ticket">
              <span className="iu-row" style={{ gap: 8, color: '#14532d', fontWeight: 700 }}><Ticket size={18} /> Cod de intrare</span>
              <b>{app.entry_code}</b>
            </div>
          )}
        </div>
      )}
      {status === 'pending' && (
        <div className="iu-card cd-state" style={{ background: '#fffaeb', borderColor: '#f5e2a0' }}>
          <div className="iu-row" style={{ gap: 10 }}><Clock size={26} color="#d97706" /><h3>Înscriere trimisă</h3></div>
          <p className="iu-sm" style={{ margin: 0, color: '#854d0e' }}>Organizatorul alege participanții. Primești răspunsul aici, prin notificare și pe email.</p>
        </div>
      )}
      {status === 'rejected' && (
        <div className="iu-card cd-state" style={{ background: '#fff4f2', borderColor: '#f3c9c4' }}>
          <div className="iu-row" style={{ gap: 10 }}><XCircle size={26} color="#b42318" /><h3 style={{ color: '#b42318' }}>Nu ai fost selectat de data aceasta</h3></div>
          <p className="iu-sm iu-muted" style={{ margin: 0 }}>Locurile sunt limitate. Urmărește tabul Evenimente pentru următoarele ocazii.</p>
        </div>
      )}

      {active && !showForm && (
        <div className="iu-card iu-card-pad iu-col" style={{ gap: 12 }}>
          <span className="iu-label">Datele tale pentru eveniment</span>
          <div className="cd-sum">
            <span>Nume</span><b>{app.full_name}</b>
            <span>Telefon</span><b>{app.phone}</b>
            <span>Oraș</span><b>{app.city}</b>
            <span>Adresă</span><b>{app.address}</b>
            {app.instagram && <><span>Instagram</span><b>@{app.instagram}</b></>}
          </div>
          <div className="cd-row">
            <button className="iu-btn" onClick={openForm}>Modifică datele</button>
            {!cancelAsk
              ? <button className="iu-btn" style={{ color: '#b42318' }} onClick={() => setCancelAsk(true)}>Nu mai pot veni</button>
              : <button className="iu-btn" style={{ background: '#b42318', borderColor: '#b42318', color: '#fff' }} onClick={cancel} disabled={sending}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : null} Da, retrage-mă
                </button>}
          </div>
          {cancelAsk && <p className="iu-xs iu-muted" style={{ margin: 0 }}>Locul tău va fi eliberat pentru altcineva.</p>}
        </div>
      )}

      {/* ── Detalii ── */}
      {ev.description && (
        <div className="iu-card iu-card-pad iu-col" style={{ gap: 10 }}>
          <span className="iu-label">Despre eveniment</span>
          <p className="cd-desc">{ev.description}</p>
          {ev.registration_link && (
            <a href={ev.registration_link} target="_blank" rel="noopener noreferrer" className="iu-btn" style={{ width: 'fit-content' }}>
              Mai multe detalii de la organizator <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {ev.application_deadline && !active && status !== 'rejected' && (
        <div className="iu-row" style={{ gap: 10, padding: '12px 16px', borderRadius: 14, background: '#fff1c2', color: '#854d0e', fontSize: 14 }}>
          <Calendar size={16} style={{ flex: 'none' }} />
          <span>Înscrieri până pe <strong>{fmt(ev.application_deadline)}</strong></span>
        </div>
      )}

      {ev.interested > 0 && !active && (
        <div className="cd-hot">🔥 {ev.interested} {ev.interested === 1 ? 'influencer vrea să vină' : 'influenceri vor să vină'}</div>
      )}

      {/* ── „Vreau să vin” ── */}
      {!active && status !== 'rejected' && !showForm && (
        ev.open
          ? <button className="iu-btn p big cd-cta" onClick={openForm}>🎟️ Vreau să vin</button>
          : <div className="iu-card cd-state" style={{ textAlign: 'center' }}><b>Înscrierile s-au închis</b></div>
      )}

      {showForm && (
        <div ref={formRef} className="iu-card iu-card-pad">
          <form className="cd-form" onSubmit={submit} noValidate>
            <div className="iu-col" style={{ gap: 4 }}>
              <h2>{active ? 'Modifică datele' : 'Vreau să vin'}</h2>
              <span className="iu-muted iu-sm">Completează datele pentru lista de invitați. Le folosim doar pentru acest eveniment.</span>
            </div>

            <div className={`cd-f${errors.full_name ? ' bad' : ''}`}>
              <label htmlFor="ev-name">Nume și prenume</label>
              <input id="ev-name" className="iu-input" autoComplete="name" value={form.full_name} onChange={set('full_name')} placeholder="Maria Popescu" />
              {errors.full_name && <span className="err">{errors.full_name}</span>}
            </div>
            <div className="cd-two">
              <div className={`cd-f${errors.phone ? ' bad' : ''}`}>
                <label htmlFor="ev-phone">Telefon</label>
                <input id="ev-phone" className="iu-input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="0722 123 456" />
                {errors.phone && <span className="err">{errors.phone}</span>}
              </div>
              <div className={`cd-f${errors.city ? ' bad' : ''}`}>
                <label htmlFor="ev-city">Oraș</label>
                <input id="ev-city" className="iu-input" autoComplete="address-level2" value={form.city} onChange={set('city')} placeholder="București" />
                {errors.city && <span className="err">{errors.city}</span>}
              </div>
            </div>
            <div className={`cd-f${errors.address ? ' bad' : ''}`}>
              <label htmlFor="ev-addr">Adresă</label>
              <input id="ev-addr" className="iu-input" autoComplete="street-address" value={form.address} onChange={set('address')} placeholder="Stradă, număr, bloc, localitate" />
              {errors.address && <span className="err">{errors.address}</span>}
            </div>
            <div className={`cd-f${errors.instagram ? ' bad' : ''}`}>
              <label htmlFor="ev-ig">Instagram <em>(opțional)</em></label>
              <input id="ev-ig" className="iu-input" autoCapitalize="none" value={form.instagram} onChange={set('instagram')} placeholder="@numele.tau" />
              {errors.instagram && <span className="err">{errors.instagram}</span>}
            </div>
            <div className={`cd-f${errors.message ? ' bad' : ''}`}>
              <label htmlFor="ev-msg">Mesaj pentru organizator <em>(opțional)</em></label>
              <textarea id="ev-msg" className="iu-input" value={form.message} onChange={set('message')} maxLength={600} placeholder="De ce ți-ar plăcea să vii și cum ai prezenta evenimentul?" />
              {errors.message && <span className="err">{errors.message}</span>}
            </div>

            <p className="cd-privacy">🔒 Organizatorul vede numele, orașul, profilul tău AddFame și mesajul. Telefonul și adresa le vede doar echipa AddFame.</p>
            {formError && <div className="cd-alert" role="alert">{formError}</div>}

            <div className="cd-row">
              <button type="submit" className="iu-btn p big" style={{ flex: 1, height: 52 }} disabled={sending}>
                {sending ? <><Loader2 size={16} className="animate-spin" /> Se trimite…</> : active ? 'Salvează' : 'Trimite înscrierea'}
              </button>
              <button type="button" className="iu-btn big" style={{ height: 52 }} onClick={() => { setShowForm(false); setErrors({}); setFormError(null) }}>Renunță</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
