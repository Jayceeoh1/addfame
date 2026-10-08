'use client'
// Formularul public de înscriere a creatorilor dintr-o nișă (ex. creatori auto din București). Fără cont; contul e opțional după.
// Aceeași validare rulează aici (mesaje imediate) și pe server (lib/creator-signups → validateApplication).
import { useMemo, useRef, useState } from 'react'
import {
  ZONES, PLATFORMS, CONTENT_TYPES, TRAVEL, AUDIENCE_CITY, AUDIENCE_AGE, INVOICING, USAGE_RIGHTS,
  AVAILABILITY, POSTING_TIME, GENDERS, AUDIENCE_GENDERS, validateApplication, brandDisplay, type SignupFormConfig, type PlatformKey,
} from '@/lib/creator-signups'
import { parseCount } from '@/lib/tiers'

type Plat = { enabled: boolean; handle: string; followers: string; avg_views: string }
const emptyPlat = (enabled: boolean): Plat => ({ enabled, handle: '', followers: '', avg_views: '' })

const fmtDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
const fmtNum = (n: number) => n.toLocaleString('ro-RO')

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f9d6b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}><path d="M20 6 9 17l-5-5" /></svg>
)

export default function SignupForm({ form: c, open, preview }: { form: SignupFormConfig; open: boolean; preview?: boolean }) {
  const [f, setF] = useState({
    first_name: '', last_name: '', email: '', phone: '', birth_date: '', gender: '', audience_gender: '',
    zone: '', other_city: '', can_travel: '',
    main_platform: 'tiktok' as PlatformKey,
    content_types: [] as string[], sample_links: '', auto_experience: '',
    audience_city_share: '', audience_age: '',
    price_video: '', price_youtube: '', price_stories: '', invoicing: INVOICING[0], usage_rights: USAGE_RIGHTS[0], accepts_barter: false,
    availability: [] as string[], posting_time: POSTING_TIME[1], notes: '',
    consent_share: false, wants_account: true, website: '',
  })
  const [plats, setPlats] = useState<Record<PlatformKey, Plat>>({ tiktok: emptyPlat(true), instagram: emptyPlat(true), youtube: emptyPlat(false) })
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [topErr, setTopErr] = useState('')
  const [done, setDone] = useState<{ firstName: string; updated: boolean } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const set = (k: keyof typeof f, v: any) => { setF(p => ({ ...p, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k as string]; return n }) }
  const setPlat = (k: PlatformKey, field: keyof Plat, v: any) => {
    setPlats(p => ({ ...p, [k]: { ...p[k], [field]: v } }))
    setErrors(e => { const n = { ...e }; delete n[`${k}.${field}`]; delete n.platforms; return n })
  }
  const toggle = (k: 'content_types' | 'availability', v: string) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v])

  const payload = () => ({
    ...f,
    sample_links: f.sample_links.split(/\s+/).filter(Boolean),
    platforms: Object.fromEntries(Object.entries(plats).map(([k, p]) => [k, { ...p }])),
    main_platform: plats[f.main_platform]?.enabled ? f.main_platform : undefined,
  })

  const mainFollowers = useMemo(() => Math.max(0, ...PLATFORMS.filter(p => plats[p.key].enabled).map(p => parseCount(plats[p.key].followers))), [plats])
  const belowMin = c.min_followers > 0 && mainFollowers > 0 && mainFollowers < c.min_followers

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTopErr('')
    const body = payload()
    const local = validateApplication(body)
    if (!local.ok) {
      setErrors(local.errors)
      setTopErr('Verifică câmpurile marcate cu roșu.')
      const first = Object.keys(local.errors)[0]
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('slug', c.slug)
      fd.set('data', JSON.stringify(body))
      if (file) fd.set('insights', file)
      const r = await fetch('/api/inscriere', { method: 'POST', body: fd })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErrors(j.errors || {}); setTopErr(j.error || 'Nu am putut trimite. Încearcă din nou.'); return }
      setDone({ firstName: j.firstName || f.first_name, updated: !!j.updated })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setTopErr('Nu am putut trimite. Verifică conexiunea și încearcă din nou.')
    } finally { setBusy(false) }
  }

  const err = (k: string) => errors[k] ? <span className="cf-err" role="alert">{errors[k]}</span> : null
  const cls = (k: string) => errors[k] ? 'cf-bad' : undefined

  if (done) return (
    <div className="cf">
      <style>{CSS}</style>
      <section className="cf-wrap cf-done">
        <div className="cf-done-ic"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1f9d6b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></div>
        <h1 className="cf-h1 cf-ink">{done.updated ? 'Ți-am actualizat înscrierea' : `Te-ai înscris, ${done.firstName}!`}</h1>
        <p className="cf-lead cf-ink2">Ți-am trimis o confirmare pe email. Echipa AddFame îți verifică profilul și te contactăm când apare o campanie potrivită.</p>
        <ol className="cf-steps">
          <li><span className="on">1</span><div><b>Verificăm profilul</b><small>Cifrele, conținutul și linkurile trimise. Îți răspundem în maximum 5 ore.</small></div></li>
          <li><span>2</span><div><b>Te contactăm pentru campanii</b><small>Prima: cu {brandDisplay(c)}. Dacă ești ales(ă), primești pe email detaliile și contractul.</small></div></li>
          <li><span>3</span><div><b>Contul AddFame, doar dacă vrei</b><small>Nu e obligatoriu. Cu cont primești și alte campanii și îți urmărești colaborările.</small></div></li>
        </ol>
        <div className="cf-row">
          <a className="cf-btn" href={`/auth/register?type=influencer&email=${encodeURIComponent(f.email)}`}>Creează-ți contul (opțional)</a>
          <a className="cf-btn ghost" href="/pentru-influenceri">Află cum funcționează</a>
        </div>
      </section>
    </div>
  )

  return (
    <div className="cf">
      <style>{CSS}</style>

      {preview && <div className="cf-preview">Previzualizare: pagina e încă ciornă și nu e vizibilă public. O publici din Admin → Înscrieri creatori.</div>}

      {/* Hero */}
      <section className="cf-hero">
        <div className="cf-wrap cf-hero-in">
          <div className="cf-hero-main">
            <div className="cf-eyebrow">{c.eyebrow || 'Creatori AddFame'}</div>
            <h1 className="cf-h1">{c.title}</h1>
            <p className="cf-lead">Strângem creatori din {c.zone_label}. {c.intro}</p>
            <div className="cf-facts">
              <div><small>Prima campanie</small><b>Cu {brandDisplay(c)}</b></div>
              <div><small>Ce filmezi</small><b>{c.deliverable}</b></div>
              <div><small>Unde și când</small><b>{[c.location, c.shoot_period].filter(Boolean).join(' · ') || 'Stabilim împreună'}</b></div>
              <div><small>Plată</small><b>Tariful tău, prin contract</b></div>
            </div>
          </div>
          <div className="cf-req" role="complementary" aria-label="Cine se poate înscrie">
            <h2>Cine se poate înscrie</h2>
            <p><Check /><span>Ai peste 18 ani</span></p>
            {c.min_followers > 0 && <p><Check /><span>Cel puțin {fmtNum(c.min_followers)} urmăritori pe o platformă</span></p>}
            <p><Check /><span>Locuiești în {c.zone_label}</span></p>
            <p><Check /><span>Postezi pe TikTok, Instagram sau YouTube</span></p>
            <div className="cf-req-foot">
              {c.deadline && <>Înscrieri până pe <b>{fmtDate(c.deadline)}</b>. </>}
              Durează cam 4 minute și nu ai nevoie de cont AddFame. Ești din alt oraș? Înscrie-te oricum: te anunțăm la campaniile din zona ta.
            </div>
          </div>
        </div>
      </section>

      {!open ? (
        <section className="cf-wrap cf-closed">
          <h2>Înscrierile s-au închis</h2>
          <p>Mulțumim pentru interes. Fă-ți un cont pe AddFame ca să afli primul de campaniile următoare.</p>
          <a className="cf-btn" href="/auth/register?type=influencer">Creează cont</a>
        </section>
      ) : (
      <div className="cf-wrap cf-body">
        <nav className="cf-nav" aria-label="Pașii formularului">
          {[['despre', 'Despre tine'], ['social', 'Social media'], ['continut', 'Conținut și audiență'], ['tarife', 'Tarife'], ['disponibilitate', 'Disponibilitate']].map(([id, l], i) => (
            <a key={id} href={`#${id}`}><span>{i + 1}</span>{l}</a>
          ))}
        </nav>

        <form ref={formRef} onSubmit={submit} noValidate className="cf-form">
          {/* capcană boți */}
          <input type="text" name="website" value={f.website} onChange={e => set('website', e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />

          {/* 1 */}
          <section id="despre" className="cf-card">
            <header><small>Pasul 1 din 5</small><h2>Despre tine</h2></header>
            <div className="cf-grid">
              <label data-field="first_name">Prenume *<input className={cls('first_name')} value={f.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Maria" autoComplete="given-name" />{err('first_name')}</label>
              <label data-field="last_name">Nume *<input className={cls('last_name')} value={f.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Popescu" autoComplete="family-name" />{err('last_name')}</label>
              <label data-field="email">Email *<input className={cls('email')} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="maria@email.com" autoComplete="email" />{err('email')}</label>
              <label data-field="phone">Telefon *<input className={cls('phone')} type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="+40 7XX XXX XXX" autoComplete="tel" />{err('phone')}</label>
              <label data-field="zone">Unde locuiești? *
                <select className={cls('zone')} value={f.zone} onChange={e => set('zone', e.target.value)}>
                  <option value="">Alege zona</option>
                  {ZONES.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
                </select>
                <small>Campania de acum e pentru {c.zone_label}.</small>{err('zone')}
              </label>
              <label data-field="birth_date">Data nașterii *<input className={cls('birth_date')} type="date" value={f.birth_date} onChange={e => set('birth_date', e.target.value)} /><small>Doar ca să confirmăm că ai peste 18 ani.</small>{err('birth_date')}</label>
            </div>
            {f.zone === 'other' && (
              <div className="cf-grid cf-soft">
                <label data-field="other_city">Ce oraș? *<input className={cls('other_city')} value={f.other_city} onChange={e => set('other_city', e.target.value)} placeholder="ex. Ploiești" />{err('other_city')}</label>
                <label>Poți veni în București pentru filmare?
                  <select value={f.can_travel} onChange={e => set('can_travel', e.target.value)}><option value="">Alege</option>{TRAVEL.map(t => <option key={t}>{t}</option>)}</select>
                </label>
              </div>
            )}
            <fieldset data-field="gender">
              <legend>Gen *</legend>
              <div className="cf-row">
                {GENDERS.map(g => <label key={g.value} className={`cf-choice ${f.gender === g.value ? 'on' : ''}`}><input type="radio" name="gender" checked={f.gender === g.value} onChange={() => set('gender', g.value)} />{g.label}</label>)}
              </div>
              <small className="cf-muted">Unele campanii caută anume creatoare sau creatori. Nu apare public.</small>
              {err('gender')}
            </fieldset>
          </section>

          {/* 2 */}
          <section id="social" className="cf-card">
            <header><small>Pasul 2 din 5</small><h2>Social media</h2><p>Bifează platformele pe care postezi și completează cifrele de acum. Poți scrie urmăritorii ca 12400 sau 12,4K. Verificăm cifrele pe profil înainte să te propunem brandului.</p></header>
            {err('platforms') && <div data-field="platforms">{err('platforms')}</div>}
            {PLATFORMS.map(p => {
              const s = plats[p.key]
              const fol = parseCount(s.followers)
              return (
                <div key={p.key} className={`cf-plat ${s.enabled ? 'on' : ''}`}>
                  <div className="cf-plat-head">
                    <label className="cf-inline big"><input type="checkbox" checked={s.enabled} onChange={e => setPlat(p.key, 'enabled', e.target.checked)} />{p.label}</label>
                    {s.enabled && <label className="cf-inline"><input type="radio" name="principala" checked={f.main_platform === p.key} onChange={() => set('main_platform', p.key)} />Platforma mea principală</label>}
                  </div>
                  {s.enabled && (
                    <div className="cf-grid three">
                      <label data-field={`${p.key}.handle`}>{p.key === 'youtube' ? 'Canal *' : 'Cont *'}<input className={cls(`${p.key}.handle`)} value={s.handle} onChange={e => setPlat(p.key, 'handle', e.target.value)} placeholder={p.handle} />{err(`${p.key}.handle`)}</label>
                      <label data-field={`${p.key}.followers`}>{p.key === 'youtube' ? 'Abonați *' : 'Urmăritori *'}<input className={cls(`${p.key}.followers`)} value={s.followers} onChange={e => setPlat(p.key, 'followers', e.target.value)} placeholder="12,4K" inputMode="decimal" />
                        {s.followers && <small>{fol > 0 ? `= ${fmtNum(fol)}` : 'Scrie un număr, ex. 12400 sau 12,4K'}</small>}{err(`${p.key}.followers`)}</label>
                      <label>{p.viewsLabel}<input value={s.avg_views} onChange={e => setPlat(p.key, 'avg_views', e.target.value)} placeholder="8K" inputMode="decimal" /><small>{p.viewsHint}</small></label>
                    </div>
                  )}
                </div>
              )
            })}
            {belowMin && <div className="cf-note">Pentru campania asta căutăm de la {fmtNum(c.min_followers)} urmăritori. Te poți înscrie oricum: te păstrăm pentru campaniile potrivite.</div>}
          </section>

          {/* 3 */}
          <section id="continut" className="cf-card">
            <header><small>Pasul 3 din 5</small><h2>Conținut și audiență</h2></header>
            <fieldset>
              <legend>Ce fel de conținut faci? (alege tot ce se potrivește)</legend>
              <div className="cf-chips">
                {CONTENT_TYPES.map(t => <label key={t} className={`cf-chip ${f.content_types.includes(t) ? 'on' : ''}`}><input type="checkbox" checked={f.content_types.includes(t)} onChange={() => toggle('content_types', t)} />{t}</label>)}
              </div>
            </fieldset>
            <label data-field="sample_links">Linkuri spre 2–3 video-uri care te reprezintă *
              <textarea className={cls('sample_links')} value={f.sample_links} onChange={e => set('sample_links', e.target.value)} placeholder={'https://www.tiktok.com/@…/video/…\nhttps://www.instagram.com/reel/…'} />
              <small>Câte un link pe rând. Ideal unul despre o mașină sau filmat într-o mașină.</small>{err('sample_links')}
            </label>
            <label>Ai mai colaborat cu branduri auto?<input value={f.auto_experience} onChange={e => set('auto_experience', e.target.value)} placeholder="ex. un dealer, un service, o firmă de închirieri… sau „nu încă”" /></label>
            <div className="cf-grid">
              <label>Cât din audiență e din București?<select value={f.audience_city_share} onChange={e => set('audience_city_share', e.target.value)}><option value="">Alege</option>{AUDIENCE_CITY.map(a => <option key={a}>{a}</option>)}</select><small>În statistici, la „Orașe principale”.</small></label>
              <label>Audiența ta e formată din…<select value={f.audience_gender} onChange={e => set('audience_gender', e.target.value)}><option value="">Nu știu</option>{AUDIENCE_GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
              <label>Vârsta majoritară a audienței<select value={f.audience_age} onChange={e => set('audience_age', e.target.value)}><option value="">Alege</option>{AUDIENCE_AGE.map(a => <option key={a}>{a}</option>)}</select></label>
            </div>
            <label data-field="insights">Captură cu statisticile contului (opțional)
              <div className="cf-drop">
                <span>TikTok sau Instagram → Statistici → Audiență. Ne ajută să te propunem brandului mai repede.</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>
              {file && file.size > 5 * 1024 * 1024 && <span className="cf-err">Imaginea are peste 5 MB. Alege una mai mică.</span>}
              {err('insights')}
            </label>
          </section>

          {/* 4 */}
          <section id="tarife" className="cf-card">
            <header><small>Pasul 4 din 5</small><h2>Tarife</h2><p>Sumele sunt nete, pentru tine. Le arătăm brandului doar dacă te propunem pentru campanie.</p></header>
            <div className="cf-grid three">
              <label data-field="price_video">Preț / video TikTok sau Reel *<span className={`cf-money ${cls('price_video') || ''}`}><input value={f.price_video} onChange={e => set('price_video', e.target.value)} placeholder="800" inputMode="numeric" /><b>RON</b></span>{err('price_video')}</label>
              <label>Preț / integrare YouTube<span className="cf-money"><input value={f.price_youtube} onChange={e => set('price_youtube', e.target.value)} placeholder="1500" inputMode="numeric" /><b>RON</b></span></label>
              <label>Pachet 3 story-uri<span className="cf-money"><input value={f.price_stories} onChange={e => set('price_stories', e.target.value)} placeholder="300" inputMode="numeric" /><b>RON</b></span></label>
            </div>
            <div className="cf-grid">
              <label data-field="invoicing">Cum facturezi? *<select className={cls('invoicing')} value={f.invoicing} onChange={e => set('invoicing', e.target.value)}>{INVOICING.map(i => <option key={i}>{i}</option>)}</select>{err('invoicing')}</label>
              <label>Drepturi de folosire a video-ului de către brand<select value={f.usage_rights} onChange={e => set('usage_rights', e.target.value)}>{USAGE_RIGHTS.map(u => <option key={u}>{u}</option>)}</select><small>Folosirea în reclame se negociază separat.</small></label>
            </div>
            <label className="cf-inline box"><input type="checkbox" checked={f.accepts_barter} onChange={e => set('accepts_barter', e.target.checked)} />Accept și o variantă parțial barter (un produs sau un serviciu oferit de brand), dacă brandul o propune.</label>
          </section>

          {/* 5 */}
          <section id="disponibilitate" className="cf-card">
            <header><small>Pasul 5 din 5</small><h2>Disponibilitate</h2></header>
            <fieldset>
              <legend>Când poți veni la showroom?</legend>
              <div className="cf-chips">
                {AVAILABILITY.map(t => <label key={t} className={`cf-chip ${f.availability.includes(t) ? 'on' : ''}`}><input type="checkbox" checked={f.availability.includes(t)} onChange={() => toggle('availability', t)} />{t}</label>)}
              </div>
            </fieldset>
            <label>În câte zile postezi după filmare?<select value={f.posting_time} onChange={e => set('posting_time', e.target.value)}>{POSTING_TIME.map(p => <option key={p}>{p}</option>)}</select></label>
            <label>Ceva ce ar trebui să știm? (opțional)<textarea value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Idei de video, mașina pe care o ai acum, colaborări în curs…" /></label>
          </section>

          {/* Trimitere */}
          <section className="cf-card">
            <label data-field="consent_share" className="cf-inline"><input type="checkbox" checked={f.consent_share} onChange={e => set('consent_share', e.target.checked)} /><span>Sunt de acord ca AddFame să îmi trimită datele către {brandDisplay(c)} dacă sunt propus(ă) pentru campanie și am citit <a href="/politica-de-confidentialitate" target="_blank">politica de confidențialitate</a>. *</span></label>
            {err('consent_share')}
            <label className="cf-inline"><input type="checkbox" checked={f.wants_account} onChange={e => set('wants_account', e.target.checked)} /><span>Vreau să primesc pe email și alte campanii potrivite pentru mine.</span></label>
            {topErr && <div className="cf-top-err" role="alert">{topErr}</div>}
            <div className="cf-row">
              <button type="submit" className="cf-btn big" disabled={busy}>{busy ? 'Se trimite…' : 'Trimite înscrierea'}</button>
              <span className="cf-muted">Îți răspundem rapid, în maximum 5 ore.</span>
            </div>
          </section>
        </form>
      </div>
      )}
    </div>
  )
}

const CSS = `
.cf{font-family:var(--font-body),system-ui,sans-serif;color:#14123a;background:#f4f3fa}
.cf-wrap{max-width:1120px;margin:0 auto;padding-left:20px;padding-right:20px;box-sizing:border-box}
.cf-preview{background:#fff1c2;color:#854d0e;font-weight:700;font-size:14px;text-align:center;padding:10px 16px}
.cf-hero{background:#14123a;color:#fff}
.cf-hero-in{display:flex;flex-wrap:wrap;gap:36px;align-items:flex-start;padding-top:52px;padding-bottom:60px}
.cf-hero-main{flex:999 1 500px;min-width:0;display:flex;flex-direction:column;gap:18px}
.cf-eyebrow{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#b9a8ff}
.cf-h1{margin:0;font-family:var(--font-display),sans-serif;font-weight:800;font-size:clamp(34px,5vw,52px);line-height:1.05;letter-spacing:-.02em;text-wrap:balance}
.cf-lead{margin:0;font-size:18px;line-height:1.6;color:#d6d2ee;max-width:620px}
.cf-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;max-width:620px}
.cf-facts>div{border:1px solid #39355f;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.cf-facts small{font-size:12px;color:#b5b0d6;font-weight:600}.cf-facts b{font-size:15px}
.cf-req{position:static!important;flex:1 1 300px;background:#fff;color:#14123a;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:12px}
.cf-req h2{margin:0;font-family:var(--font-display),sans-serif;font-size:20px;font-weight:800}
.cf-req p{margin:0;display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.45}
.cf-req-foot{border-top:1px solid #ece9f6;padding-top:12px;font-size:13px;color:#5d5a80;line-height:1.5}
.cf-body{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start;padding-top:36px;padding-bottom:72px}
.cf-nav{flex:1 1 200px;display:flex;flex-direction:column;gap:6px;position:sticky;top:84px}
.cf-nav a{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;color:#3d3a63;text-decoration:none;font-weight:600;font-size:14px}
.cf-nav a:hover{background:#fff}
.cf-nav span{width:24px;height:24px;border-radius:50%;background:#e6e3f3;display:grid;place-items:center;font-size:12px;font-weight:800}
.cf-form{flex:999 1 600px;min-width:0;display:flex;flex-direction:column;gap:22px;position:relative}
.cf-card{background:#fff;border:1px solid #e6e3f3;border-radius:20px;padding:26px;display:flex;flex-direction:column;gap:18px;scroll-margin-top:90px}
.cf-card header small{font-size:12px;font-weight:700;color:#5a35e6;letter-spacing:.06em;text-transform:uppercase}
.cf-card h2{margin:4px 0 0;font-family:var(--font-display),sans-serif;font-size:24px;font-weight:800}
.cf-card header p{margin:6px 0 0;color:#5d5a80;font-size:14px;line-height:1.5}
.cf label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#2a2750}
.cf label small{font-weight:500;color:#5d5a80;font-size:12px}
.cf fieldset{border:0;margin:0;padding:0;min-width:0}
.cf legend{font-size:13px;font-weight:600;color:#2a2750;padding:0;margin-bottom:10px}
.cf input,.cf select,.cf textarea{font:inherit;font-size:16px;font-weight:500;color:#14123a;background:#fff;border:1.5px solid #dcd9ee;border-radius:12px;padding:0 14px;height:48px;box-sizing:border-box;width:100%;min-width:0}
.cf textarea{height:100px;padding:12px 14px;resize:vertical}
.cf input:focus,.cf select:focus,.cf textarea:focus{outline:none;border-color:#5a35e6;box-shadow:0 0 0 3px rgba(90,53,230,.15)}
.cf input::placeholder,.cf textarea::placeholder{color:#8e8bab;font-weight:400}
.cf input[type=checkbox],.cf input[type=radio]{width:20px;height:20px;padding:0;accent-color:#5a35e6;flex:none;box-shadow:none}
.cf input[type=file]{height:auto;border:0;padding:6px 0;width:auto}
.cf .cf-bad{border-color:#d92d20!important;background:#fffafa}
.cf-err{color:#b42318;font-size:12.5px;font-weight:600}
.cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.cf-grid.three{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.cf-soft{background:#f6f5fc;border-radius:14px;padding:16px}
.cf-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.cf .cf-choice{flex-direction:row;align-items:center;gap:8px;border:1.5px solid #dcd9ee;border-radius:12px;padding:12px 16px;font-size:15px;cursor:pointer}
.cf .cf-choice.on{border-color:#5a35e6;background:#f3f0ff}
.cf .cf-inline{flex-direction:row;align-items:flex-start;gap:10px;font-weight:500;font-size:14px;line-height:1.5}
.cf .cf-inline.big{font-size:16px;font-weight:700;align-items:center}
.cf .cf-inline.box{background:#f6f5fc;border-radius:12px;padding:14px}
.cf-plat{border:1.5px solid #dcd9ee;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.cf-plat.on{border-color:#5a35e6}
.cf-plat-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.cf-plat-head .cf-inline:not(.big){font-size:13px;font-weight:600;color:#4a2bd4;align-items:center}
.cf-chips{display:flex;flex-wrap:wrap;gap:8px}
.cf .cf-chip{flex-direction:row;align-items:center;gap:8px;border:1.5px solid #dcd9ee;border-radius:999px;padding:10px 16px;font-size:14px;cursor:pointer}
.cf .cf-chip.on{border-color:#5a35e6;background:#f3f0ff}
.cf-drop{border:1.5px dashed #c9c4e6;border-radius:14px;padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-weight:500}
.cf-drop span{flex:1 1 240px;color:#3d3a63;font-size:14px}
.cf-money{display:flex;align-items:center;border:1.5px solid #dcd9ee;border-radius:12px;background:#fff;overflow:hidden}
.cf-money input{border:0!important;border-radius:0;box-shadow:none!important}
.cf-money b{padding:0 14px;color:#5d5a80}
.cf-money.cf-bad{border-color:#d92d20}
.cf-note{background:#fff7e0;color:#854d0e;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.5}
.cf-top-err{background:#fff4f2;color:#b42318;border-radius:12px;padding:12px 14px;font-weight:700;font-size:14px}
.cf-btn{display:inline-flex;align-items:center;justify-content:center;height:52px;padding:0 24px;border:0;border-radius:14px;background:#5a35e6;color:#fff;font:inherit;font-size:16px;font-weight:800;text-decoration:none;cursor:pointer}
.cf-btn:hover{background:#4a2bd4;color:#fff}
.cf-btn.big{height:56px;padding:0 28px}
.cf-btn[disabled]{opacity:.6;cursor:default}
.cf-btn.ghost{background:#fff;color:#14123a;border:1.5px solid #dcd9ee}
.cf-muted{font-size:13px;color:#5d5a80}
.cf-closed{padding-top:48px;padding-bottom:72px;max-width:720px}
.cf-closed h2{font-family:var(--font-display),sans-serif;font-size:28px;margin:0 0 8px}
.cf-closed p{color:#3d3a63;font-size:16px;line-height:1.6;margin:0 0 20px}
.cf-done{max-width:720px;padding-top:56px;padding-bottom:72px;display:flex;flex-direction:column;gap:24px}
.cf-done-ic{width:64px;height:64px;border-radius:20px;background:#dcf5ec;display:grid;place-items:center}
.cf-ink{color:#14123a}.cf-ink2{color:#3d3a63}
.cf-steps{margin:0;padding:0;list-style:none;background:#fff;border:1px solid #e6e3f3;border-radius:20px;overflow:hidden}
.cf-steps li{display:flex;gap:16px;padding:18px 22px;border-bottom:1px solid #efedf8}
.cf-steps li:last-child{border-bottom:0}
.cf-steps li>span{width:28px;height:28px;border-radius:50%;background:#e6e3f3;color:#3d3a63;display:grid;place-items:center;font-weight:800;font-size:13px;flex:none}
.cf-steps li>span.on{background:#5a35e6;color:#fff}
.cf-steps b{display:block}.cf-steps small{display:block;color:#5d5a80;font-size:14px;margin-top:2px}
@media (max-width:900px){.cf-nav{display:none}.cf-card{padding:20px}.cf-facts{grid-template-columns:minmax(0,1fr)}}
`
