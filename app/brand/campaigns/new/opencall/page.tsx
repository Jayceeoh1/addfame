'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, Calendar, MapPin, Users, FileText, Image as ImageIcon, Loader2, CheckCircle, Check } from 'lucide-react'
import Link from 'next/link'
import { publishCampaignWithFee } from '@/app/actions/campaigns'
import { InfluencerSlotsSelector, type FeeInfo } from '@/components/brand/InfluencerSlotsSelector'

const NW_CSS = `
.nw-top { display:flex; align-items:center; gap:14px; min-width:0; }
.nw-back { width:44px; height:44px; flex:none; border-radius:12px; border:1.5px solid #e5e3f3; background:#fff; color:#4a4770; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; text-decoration:none; font-family:inherit; padding:0; }
.nw-back:hover { background:#f7f4ff; border-color:#c9b9fb; }
.nw-top .tt { min-width:0; flex:1; }
.nw-top .tt h1 { font-size:28px; }
.nw-top .tt p { margin:4px 0 0; color:#6a6690; font-size:14px; }
.nw-steps { display:flex; align-items:center; gap:0; padding:14px 18px; overflow:hidden; }
.nw-step { display:flex; align-items:center; gap:10px; flex:none; min-width:0; }
.nw-step .b { width:30px; height:30px; flex:none; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; background:#f0eff7; color:#8783a8; font-family:var(--font-display,system-ui),system-ui,sans-serif; }
.nw-step.on .b { background:linear-gradient(135deg,#2f6fe0,#5a35e6); color:#fff; box-shadow:0 8px 16px -8px rgba(90,53,230,.8); }
.nw-step.done .b { background:#dcf5ec; color:#14532d; }
.nw-step .l { font-size:13px; font-weight:700; color:#8783a8; white-space:nowrap; }
.nw-step.on .l { color:#14123a; }
.nw-step.done .l { color:#14532d; }
.nw-line { flex:1; height:2px; min-width:14px; margin:0 10px; border-radius:2px; background:#eeecf7; }
.nw-line.done { background:#9fdcc3; }
.nw-layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
.nw-main { display:flex; flex-direction:column; gap:16px; min-width:0; }
.nw-card { padding:22px; display:flex; flex-direction:column; gap:18px; }
.nw-ch { display:flex; align-items:flex-start; gap:12px; }
.nw-ch .num { width:30px; height:30px; flex:none; border-radius:10px; background:#efeaff; color:#4423c4; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; font-family:var(--font-display,system-ui),system-ui,sans-serif; }
.nw-ch p { margin:3px 0 0; font-size:13px; color:#6a6690; }
.nw-f { display:flex; flex-direction:column; gap:7px; min-width:0; }
.nw-f > label, .nw-lab { font-size:13px; font-weight:700; color:#14123a; }
.nw-f > label small, .nw-lab small { font-weight:500; color:#8783a8; font-size:12px; }
.nw-in { width:100%; height:44px; border:1.5px solid #e5e3f3; border-radius:12px; padding:0 14px; font:inherit; font-size:15px; background:#fff; color:#14123a; outline:none; box-sizing:border-box; min-width:0; }
textarea.nw-in { height:auto; padding:11px 14px; resize:vertical; line-height:1.5; }
.nw-in:focus { border-color:#5a35e6; box-shadow:0 0 0 3px rgba(90,53,230,.1); }
.nw-hint { font-size:12px; color:#8783a8; margin:0; }
.nw-g2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.nw-tiles { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
.nw-tile { position:relative; display:flex; align-items:center; gap:12px; min-height:56px; padding:12px 14px; border-radius:14px; border:1.5px solid #e5e3f3; background:#fff; color:#14123a; text-align:left; cursor:pointer; font-family:inherit; font-size:14px; min-width:0; transition:border-color .15s, background .15s; }
.nw-tile:hover { border-color:#b9a5f5; background:#faf8ff; }
.nw-tile.on { border-color:#5a35e6; background:#f7f4ff; box-shadow:0 0 0 3px rgba(90,53,230,.08); }
.nw-tile .t { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.nw-tile .t b { font-size:14px; font-weight:700; }
.nw-tile .t span { font-size:12px; color:#6a6690; line-height:1.35; }
.nw-tile .ck { width:22px; height:22px; flex:none; border-radius:50%; border:1.5px solid #d8d5ec; display:flex; align-items:center; justify-content:center; color:#fff; }
.nw-tile.on .ck { background:#5a35e6; border-color:#5a35e6; }
.nw-tile .ic { width:38px; height:38px; flex:none; border-radius:11px; background:#f0eff7; display:flex; align-items:center; justify-content:center; font-size:19px; }
.nw-tile.on .ic { background:#efeaff; }
.nw-tile .pop { position:absolute; top:-9px; right:12px; background:#5a35e6; color:#fff; font-size:10px; font-weight:800; letter-spacing:.06em; padding:2px 8px; border-radius:99px; }
.nw-tile.c { flex-direction:column; justify-content:center; text-align:center; gap:2px; }
.nw-chips { display:flex; flex-wrap:wrap; gap:8px; }
.nw-chipbtn { display:inline-flex; align-items:center; min-height:44px; padding:0 16px; border-radius:999px; border:1.5px solid #e5e3f3; background:#fff; color:#4a4770; font-weight:600; font-size:14px; cursor:pointer; font-family:inherit; }
.nw-chipbtn:hover { border-color:#b9a5f5; }
.nw-chipbtn.on { background:#14123a; border-color:#14123a; color:#fff; }
.nw-box { border-radius:14px; padding:14px 16px; background:#f6f6fc; border:1px solid #eeecf7; display:flex; flex-direction:column; gap:8px; font-size:14px; }
.nw-box .r { display:flex; justify-content:space-between; gap:12px; }
.nw-box .r span:first-child { color:#6a6690; }
.nw-box .r b { text-align:right; min-width:0; overflow-wrap:anywhere; }
.nw-note { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; font-size:13px; line-height:1.5; }
.nw-note.blue { background:#e6f0ff; color:#1d4fb8; }
.nw-note.amber { background:#fff1c2; color:#854d0e; }
.nw-note.red { background:#fde8e6; color:#b42318; font-weight:600; }
.nw-note.violet { background:#efeaff; color:#4423c4; }
.nw-sum { position:sticky; top:20px; padding:20px; display:flex; flex-direction:column; gap:14px; }
.nw-sum h3 { display:flex; align-items:center; gap:8px; }
.nw-sum .row { display:flex; justify-content:space-between; gap:12px; font-size:14px; align-items:baseline; }
.nw-sum .row span { color:#6a6690; flex:none; }
.nw-sum .row b { text-align:right; min-width:0; overflow-wrap:anywhere; font-weight:700; }
.nw-sum .big { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:26px; font-weight:800; letter-spacing:-.02em; }
.nw-bar { position:sticky; bottom:12px; z-index:10; display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border:1px solid #e5e3f3; border-radius:16px; box-shadow:0 14px 34px -16px rgba(20,18,58,.35); }
.nw-bar .st { font-size:13px; color:#6a6690; padding-left:8px; min-width:0; }
.nw-bar .acts { display:flex; gap:10px; margin-left:auto; min-width:0; }
.nw-bar .bu-btn { height:46px; }
.nw-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height:140px; padding:18px; border:2px dashed #cfc8ee; border-radius:16px; background:rgba(247,244,255,.5); cursor:pointer; text-align:center; color:#5a35e6; position:relative; overflow:hidden; transition:background .15s; }
.nw-drop:hover { background:#f7f4ff; }
.nw-drop b { font-size:14px; color:#14123a; }
.nw-drop span { font-size:12px; color:#6a6690; }
.nw-spin { animation:nwSpin 1s linear infinite; }
@keyframes nwSpin { to { transform:rotate(360deg) } }
@media (max-width:900px) {
  .nw-layout { grid-template-columns:minmax(0,1fr); }
  .nw-sum { position:static; }
}
@media (max-width:767px) {
  .nw-top .tt h1 { font-size:24px; }
  .nw-steps { padding:12px 14px; }
  .nw-step:not(.on) .l { display:none; }
  .nw-line { margin:0 6px; min-width:8px; }
  .nw-card { padding:16px; gap:16px; }
  .nw-g2 { grid-template-columns:1fr; }
  .nw-tiles { grid-template-columns:1fr; }
  .nw-bar { bottom:8px; padding:8px; }
  .nw-bar .st { display:none; }
  .nw-bar .acts { width:100%; }
  .nw-bar .acts .bu-btn { flex:1; height:50px; }
}

.nw-bar .bu-btn { white-space:normal; text-align:center; line-height:1.2; height:auto; min-height:46px; padding-top:8px; padding-bottom:8px; }
.nw-sr { position:absolute; opacity:0; width:1px; height:1px; pointer-events:none; }
.nw-tile:focus-within { border-color:#5a35e6; }
.nw-tog { display:none; }
.wz-side { min-width:0; position:sticky; top:20px; }
@media (max-width:900px) {
  .nw-tog { display:inline-flex; height:44px; }
  .wz-side { display:none; position:static; }
  .nw-layout.wz-prev .wz-side { display:block; }
  .nw-layout.wz-prev .wz-form { display:none; }
}
@media (max-width:767px) { .nw-bar .acts .bu-btn { min-height:50px; } }
`

export default function NewOpenCallPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [slots, setSlots] = useState(10)
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null)
  const [draftNotice, setDraftNotice] = useState<{ message: string; campaignId: string } | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_location: '',
    min_followers: '1000',
    application_deadline: '',
    registration_link: '',
    platforms: [] as string[],
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p]
    }))
  }

  async function uploadBanner(file: File) {
    setUploadingBanner(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `banners/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-banners').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('campaign-banners').getPublicUrl(path)
      setBannerUrl(data.publicUrl)
      setBannerPreview(URL.createObjectURL(file))
    } catch (e: any) {
      alert('Eroare upload banner: ' + e.message)
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) return alert('Adaugă un titlu pentru campanie.')
    if (!form.description.trim()) return alert('Adaugă o descriere.')
    if (form.platforms.length === 0) return alert('Selectează cel puțin o platformă.')

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!brand) return

      const deadline = form.application_deadline
        ? new Date(form.application_deadline).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const payload = {
        brand_id: brand.id,
        title: form.title,
        campaign_type: 'OPEN_CALL',
        status: 'DRAFT', // se trimite la aprobare după plata taxei (mai jos)
        platforms: form.platforms,
        description: form.description,
        banner_url: bannerUrl,
        event_date: form.event_date || null,
        event_location: form.event_location || null,
        registration_link: form.registration_link || null,
        min_followers: parseInt(form.min_followers) || 0,
        application_deadline: deadline,
        max_influencers: slots,
        budget: 0,
        budget_per_influencer: 0,
        countries: ['Romania'],
      }

      // Draft deja salvat (sold insuficient anterior) → actualizăm și reîncercăm, fără duplicat
      if (draftNotice) {
        const { status: _ignored, ...draftFields } = payload as any  // statusul nu se schimbă de aici
        const { error: upErr } = await supabase.from('campaigns').update(draftFields)
          .eq('id', draftNotice.campaignId).in('status', ['DRAFT', 'REJECTED'])
        if (upErr) throw upErr
        const retry = await publishCampaignWithFee(draftNotice.campaignId, slots) as any
        if (!retry?.success) { setDraftNotice({ ...draftNotice, message: retry?.error || draftNotice.message }); return }
        router.push(`/brand/campaigns/${draftNotice.campaignId}`)
        return
      }

      const { data: camp, error } = await supabase.from('campaigns').insert(payload).select().single()

      if (error) throw error

      // Plata taxei (nr. influenceri × preț) și trimitere la aprobare
      const res = await publishCampaignWithFee(camp.id, slots) as any
      if (!res?.success) {
        setDraftNotice({ message: res?.error || 'Campania a fost salvată ca draft.', campaignId: camp.id })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push(`/brand/campaigns/${camp.id}`)
    } catch (e: any) {
      alert('Eroare: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const PLATFORMS = [
    { id: 'Instagram', icon: '📸', label: 'Instagram' },
    { id: 'TikTok', icon: '🎵', label: 'TikTok' },
    { id: 'YouTube', icon: '▶️', label: 'YouTube' },
  ]

  const sec = (n: number, title: string, desc: string) => (
    <div className="nw-ch">
      <span className="num">{n}</span>
      <div><h2>{title}</h2><p>{desc}</p></div>
    </div>
  )

  const feeTotal = feeInfo ? slots * feeInfo.price : null

  return (
    <div className="bu">
      <style>{NW_CSS}</style>

      {/* Header */}
      <div className="nw-top">
        <Link href="/brand/campaigns" className="nw-back" aria-label="Înapoi"><ArrowLeft size={18} /></Link>
        <div className="tt">
          <h1>Open Call / Casting</h1>
          <p>Influencerii se înscriu singuri la campania ta</p>
        </div>
        <span className="bu-chip" style={{ background: '#dff4fd', color: '#0c4a6e' }}>Open Call</span>
      </div>

      {draftNotice && (
        <div className="nw-note amber" style={{ flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 14 }}>Campania a fost salvată ca draft</b>
          <span>{draftNotice.message}</span>
          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <a href="/brand/wallet" className="bu-btn p">Adaugă credite</a>
            <a href={`/brand/campaigns/${draftNotice.campaignId}`} className="bu-btn">Deschide draft-ul</a>
          </div>
        </div>
      )}

      <div className="nw-layout">
        <div className="nw-main">

          {/* 1 — Banner */}
          <div className="bu-card nw-card">
            {sec(1, 'Banner campanie', 'Imaginea principală pe care o văd influencerii.')}
            <div className="nw-drop" role="button" tabIndex={0} onClick={() => fileRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
              style={{ minHeight: 190, padding: bannerPreview ? 0 : 18 }}>
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} alt="banner" style={{ width: '100%', height: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,18,58,.45)', opacity: 0, transition: 'opacity .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                    <b style={{ color: '#fff' }}>Schimbă banner</b>
                  </div>
                </>
              ) : (
                <>
                  <span className="bu-ico" style={{ background: '#efeaff' }}>
                    {uploadingBanner ? <Loader2 size={20} className="nw-spin" /> : <Upload size={20} />}
                  </span>
                  <b>{uploadingBanner ? 'Se uploadează...' : 'Click pentru a adăuga banner'}</b>
                  <span>JPG, PNG — recomandat 1200×600px</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
            {bannerUrl && <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d', alignSelf: 'flex-start' }}><CheckCircle size={13} /> Banner uploadat</span>}
          </div>

          {/* 2 — Detalii */}
          <div className="bu-card nw-card">
            {sec(2, 'Detalii campanie', 'Titlul și brief-ul pe care îl văd creatorii.')}
            <div className="nw-f">
              <label>Titlu campanie *</label>
              <input className="nw-in" placeholder="ex: World of Digital — Casting influenceri"
                value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="nw-f">
              <label>Descriere / Brief *</label>
              <textarea className="nw-in" placeholder="Descrie campania, ce aștepți de la influenceri, ce primesc în schimb..."
                value={form.description} onChange={e => set('description', e.target.value)} rows={8} />
              <p className="nw-hint">{form.description.length} caractere</p>
            </div>
            <div className="nw-f">
              <label>Platforme *</label>
              <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                    className={`nw-tile ${form.platforms.includes(p.id) ? 'on' : ''}`}>
                    <span className="ic">{p.icon}</span>
                    <span className="t"><b>{p.label}</b></span>
                    <span className="ck">{form.platforms.includes(p.id) && <Check size={13} strokeWidth={3} />}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3 — Eveniment */}
          <div className="bu-card nw-card">
            {sec(3, 'Eveniment', 'Când și unde are loc (opțional).')}
            <div className="nw-g2">
              <div className="nw-f">
                <label>Data eveniment</label>
                <input type="date" className="nw-in" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
              </div>
              <div className="nw-f">
                <label>Locație</label>
                <input className="nw-in" placeholder="ex: Hotel Caro, București" value={form.event_location} onChange={e => set('event_location', e.target.value)} />
              </div>
            </div>
          </div>

          {/* 4 — Cerințe */}
          <div className="bu-card nw-card">
            {sec(4, 'Cerințe și înscriere', 'Cine poate aplica și până când.')}
            <div className="nw-g2">
              <div className="nw-f">
                <label>Minim followers</label>
                <input type="number" className="nw-in" placeholder="1000" value={form.min_followers} onChange={e => set('min_followers', e.target.value)} />
              </div>
              <div className="nw-f">
                <label>Deadline aplicare</label>
                <input type="date" className="nw-in" value={form.application_deadline} onChange={e => set('application_deadline', e.target.value)} />
              </div>
            </div>
            <div className="nw-f">
              <label>Link înscriere <small>(opțional)</small></label>
              <input className="nw-in" placeholder="ex: https://forms.gle/... sau orice link de înregistrare"
                value={form.registration_link} onChange={e => set('registration_link', e.target.value)} />
              <p className="nw-hint">Influencerii vor vedea un buton "Înscrie-te" care îi duce la acest link.</p>
            </div>
          </div>

          {/* 5 — Locuri + taxă */}
          <div className="bu-card nw-card">
            {sec(5, 'Locuri și taxă de publicare', 'Câți influenceri vrei și costul taxei AddFame.')}
            <InfluencerSlotsSelector value={slots} onChange={setSlots} onInfo={setFeeInfo} />
          </div>
        </div>

        {/* Rezumat */}
        <div className="bu-card nw-sum">
          <h3><FileText size={17} color="#5a35e6" /> Rezumat</h3>
          <div className="row"><span>Tip</span><b>Open Call</b></div>
          <div className="row"><span>Titlu</span><b>{form.title || '—'}</b></div>
          <div className="row"><span>Platforme</span><b>{form.platforms.length ? form.platforms.join(', ') : '—'}</b></div>
          <div className="row"><span>Locuri</span><b>{slots}</b></div>
          <div className="row"><span>Minim followers</span><b>{form.min_followers || '—'}</b></div>
          <div className="row"><span>Deadline aplicare</span><b>{form.application_deadline ? new Date(form.application_deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : 'Automat 30 zile'}</b></div>
          <div className="bu-div" />
          <div className="row"><span>Taxă publicare</span><b className="big">{feeTotal !== null ? `${feeTotal.toLocaleString('ro-RO')} RON` : '—'}</b></div>
          {feeInfo && <p className="nw-hint">{slots} × {feeInfo.price.toLocaleString('ro-RO')} RON</p>}
          {feeInfo && !feeInfo.enough && <div className="nw-note amber">Sold insuficient — campania se salvează ca draft.</div>}
        </div>
      </div>

      {/* Bară de acțiuni */}
      <div className="nw-bar">
        <span className="st">Open Call{feeTotal !== null ? ` · taxă ${feeTotal.toLocaleString('ro-RO')} RON` : ''}</span>
        <div className="acts">
          <button type="button" className="bu-btn p big" onClick={handleSubmit} disabled={saving || uploadingBanner}>
            {saving
              ? <><Loader2 size={16} className="nw-spin" /> Se creează...</>
              : feeInfo && !feeInfo.enough
                ? 'Salvează ca draft (sold insuficient)'
                : feeInfo
                  ? `Plătește ${(slots * feeInfo.price).toLocaleString('ro-RO')} RON și trimite la aprobare`
                  : 'Lansează Open Call'}
          </button>
        </div>
      </div>
    </div>
  )
}
