'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Sparkles, Target, Package, Users, Euro, Calendar,
  Instagram, Youtube, MessageSquare, Check, Info, AlertCircle
} from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import { createManagedCampaign } from '@/app/actions/managed-campaigns'
import { publishCampaignWithFee } from '@/app/actions/campaigns'
import { InfluencerSlotsSelector } from '@/components/brand/InfluencerSlotsSelector'

const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram', Icon: InstagramIcon, color: 'from-violet-500 to-purple-500' },
  { value: 'TIKTOK', label: 'TikTok', Icon: TikTokSVG, color: 'from-gray-800 to-gray-600' },
  { value: 'YOUTUBE', label: 'YouTube', Icon: YoutubeIcon, color: 'from-red-500 to-red-600' },
  {
    value: 'FACEBOOK', label: 'Facebook', Icon: () => (
      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ), color: 'from-blue-600 to-blue-700'
  },
]

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness', desc: 'Fă-ți brandul cunoscut unui public nou', emoji: '📣' },
  { value: 'sales', label: 'Creștere vânzări', desc: 'Generează comenzi și trafic în magazin/online', emoji: '💰' },
  { value: 'followers', label: 'Creștere followeri', desc: 'Atrage followeri noi pe paginile tale', emoji: '👥' },
  { value: 'ugc', label: 'Conținut UGC', desc: 'Primește videoclipuri/poze pentru reclamele tale', emoji: '🎬' },
  { value: 'local', label: 'Promovare locală', desc: 'Aduce clienți fizic la locația ta', emoji: '📍' },
]

const BUDGET_OPTIONS = [
  { value: 1500, label: '1.500 RON', desc: '~5 influenceri micro', popular: false },
  { value: 2500, label: '2.500 RON', desc: '~8 influenceri micro', popular: true },
  { value: 5000, label: '5.000 RON', desc: '~15 influenceri', popular: false },
  { value: 10000, label: '10.000 RON', desc: '~25 influenceri', popular: false },
  { value: 0, label: 'Altul', desc: 'Specificați suma', popular: false },
]

const NICHES = ['Fashion', 'Beauty', 'Food & Drink', 'Fitness', 'Lifestyle', 'Travel', 'Technology', 'Gaming', 'Parenting', 'Business', 'Entertainment', 'Sports']

type Step = 1 | 2 | 3 | 4

interface FormData {
  // Step 1 — Obiectiv
  objective: string
  platforms: string[]
  // Step 2 — Produs/Brand
  product_name: string
  product_description: string
  product_url: string
  target_niches: string[]
  // Step 3 — Buget & Timeline
  budget: number
  custom_budget: string
  deadline_days: number
  influencer_count: number
  // Step 4 — Brief
  key_messages: string
  content_instructions: string
  forbidden_content: string
}

const INITIAL: FormData = {
  objective: '',
  platforms: ['INSTAGRAM'],
  product_name: '',
  product_description: '',
  product_url: '',
  target_niches: [],
  budget: 2500,
  custom_budget: '',
  deadline_days: 14,
  influencer_count: 8,
  key_messages: '',
  content_instructions: '',
  forbidden_content: '',
}

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

const STEPS = [
  { n: 1, label: 'Obiectiv' },
  { n: 2, label: 'Produs' },
  { n: 3, label: 'Buget' },
  { n: 4, label: 'Brief' },
]

export default function NewManagedCampaign() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Sold insuficient → campania e salvată ca draft; reîncercarea o publică pe aceeași, fără duplicat
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = (patch: Partial<FormData>) => setForm(f => ({ ...f, ...patch }))

  const togglePlatform = (p: string) => {
    set({ platforms: form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p] })
  }
  const toggleNiche = (n: string) => {
    set({ target_niches: form.target_niches.includes(n) ? form.target_niches.filter(x => x !== n) : [...form.target_niches, n] })
  }

  const canNext = () => {
    if (step === 1) return !!form.objective && form.platforms.length > 0
    if (step === 2) return !!form.product_name.trim() && !!form.product_description.trim()
    if (step === 3) return (form.budget > 0 || +form.custom_budget > 0) && form.influencer_count >= 1
    return true
  }

  const finalBudget = form.budget > 0 ? form.budget : +form.custom_budget || 0
  const addfameCommission = 0 // fără comision procentual: taxa AddFame e fixă per influencer
  const influencerPool = finalBudget - addfameCommission
  const perInfluencer = form.influencer_count > 0 ? Math.round(influencerPool / form.influencer_count) : 0

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      if (savedDraftId) {
        const retry = await publishCampaignWithFee(savedDraftId, form.influencer_count) as any
        if (!retry?.success) throw new Error(retry?.error || 'Sold insuficient. Campania a rămas salvată ca draft.')
        setDone(true)
        setTimeout(() => router.push('/brand/campaigns'), 3000)
        return
      }
      const result = await createManagedCampaign({
        objective: form.objective,
        platforms: form.platforms,
        product_name: form.product_name,
        product_description: form.product_description,
        product_url: form.product_url,
        target_niches: form.target_niches,
        budget: finalBudget,
        influencer_count: form.influencer_count,
        deadline_days: form.deadline_days,
        key_messages: form.key_messages,
        content_instructions: form.content_instructions,
        forbidden_content: form.forbidden_content,
      })
      if (!result.success) {
        if ((result as any).savedAsDraft && (result as any).campaignId) setSavedDraftId((result as any).campaignId)
        throw new Error((result as any).savedAsDraft
          ? `${result.error} Poți adăuga credite din Wallet și apoi apăsa din nou butonul, sau publica draft-ul din lista de campanii.`
          : result.error)
      }
      setDone(true)
      setTimeout(() => router.push('/brand/campaigns'), 3000)
    } catch (e: any) {
      setError(e.message || 'Eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  const PLAT_BG: Record<string, string> = {
    INSTAGRAM: 'linear-gradient(135deg,#8b5cf6,#d946ef)',
    TIKTOK: 'linear-gradient(135deg,#14123a,#4a4770)',
    YOUTUBE: 'linear-gradient(135deg,#ef4444,#dc2626)',
    FACEBOOK: 'linear-gradient(135deg,#2563eb,#1d4fb8)',
  }
  const platLabel = (v: string) => PLATFORMS.find(p => p.value === v)?.label || v

  if (done) return (
    <div className="bu">
      <style>{NW_CSS}</style>
      <div className="bu-card" style={{ maxWidth: 520, margin: '40px auto', padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="bu-ico" style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', boxShadow: '0 14px 30px -14px rgba(90,53,230,.7)' }}>
          <CheckCircle2 size={32} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24 }}>Campanie trimisă!</h2>
        <p className="bu-muted" style={{ margin: 0 }}>Echipa AddFame va analiza brief-ul și va selecta influencerii potriviți.</p>
        <p className="bu-muted bu-sm" style={{ margin: 0 }}>Vei fi notificat în 24-48h cu lista de influenceri propuși.</p>
        <div className="bu-row" style={{ gap: 8, color: '#5a35e6', marginTop: 8 }}>
          <Loader2 size={16} className="nw-spin" />
          <b className="bu-sm">Redirecționare...</b>
        </div>
      </div>
    </div>
  )

  const HEADS: Record<number, { t: string; d: string }> = {
    1: { t: 'Care este obiectivul campaniei?', d: 'Selectează ce vrei să obții' },
    2: { t: 'Despre produsul tău', d: 'Ajută-ne să găsim influencerii cei mai potriviți' },
    3: { t: 'Buget și timeline', d: 'Noi distribuim bugetul optim între influenceri' },
    4: { t: 'Brief pentru influenceri', d: 'Ce vrei să transmită conținutul creat' },
  }
  const head = (n: number) => (
    <div className="nw-ch">
      <span className="num">{n}</span>
      <div><h2>{HEADS[n].t}</h2><p>{HEADS[n].d}</p></div>
    </div>
  )

  return (
    <div className="bu">
      <style>{NW_CSS}</style>

      {/* Header */}
      <div className="nw-top">
        <Link href="/brand/campaigns/new" className="nw-back" aria-label="Înapoi"><ArrowLeft size={18} /></Link>
        <div className="tt">
          <h1>Campanie Managed</h1>
          <p>Noi ne ocupăm de tot — tu doar urmărești rezultatele</p>
        </div>
        <span className="bu-chip" style={{ background: '#14123a', color: '#fff' }}><Sparkles size={13} /> Managed</span>
      </div>

      {/* Stepper */}
      <div className="bu-card nw-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className={`nw-step ${step === s.n ? 'on' : step > s.n ? 'done' : ''}`}>
              <span className="b">{step > s.n ? <Check size={15} strokeWidth={3} /> : s.n}</span>
              <span className="l">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`nw-line ${step > s.n ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="nw-layout">
        <div className="nw-main">

          {/* ── STEP 1: Obiectiv ── */}
          {step === 1 && (
            <>
              <div className="bu-card nw-card">
                {head(1)}
                <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
                  {OBJECTIVES.map(obj => (
                    <button key={obj.value} type="button" onClick={() => set({ objective: obj.value })}
                      className={`nw-tile ${form.objective === obj.value ? 'on' : ''}`}>
                      <span className="ic">{obj.emoji}</span>
                      <span className="t"><b>{obj.label}</b><span>{obj.desc}</span></span>
                      <span className="ck">{form.objective === obj.value && <Check size={13} strokeWidth={3} />}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bu-card nw-card">
                <div className="nw-f">
                  <span className="nw-lab">Pe ce platforme? <small>(selectează toate)</small></span>
                </div>
                <div className="nw-tiles">
                  {PLATFORMS.map(p => (
                    <button key={p.value} type="button" onClick={() => togglePlatform(p.value)}
                      className={`nw-tile ${form.platforms.includes(p.value) ? 'on' : ''}`}>
                      <span className="ic" style={{ background: PLAT_BG[p.value] }}><p.Icon className="w-4 h-4 text-white" /></span>
                      <span className="t"><b>{p.label}</b></span>
                      <span className="ck">{form.platforms.includes(p.value) && <Check size={13} strokeWidth={3} />}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Produs ── */}
          {step === 2 && (
            <div className="bu-card nw-card">
              {head(2)}
              <div className="nw-f">
                <label>Numele produsului / brandului *</label>
                <input className="nw-in" placeholder="ex. Cafenea TopFace, Supliment X, Rochie Y..."
                  value={form.product_name} onChange={e => set({ product_name: e.target.value })} />
              </div>
              <div className="nw-f">
                <label>Descriere scurtă *</label>
                <textarea className="nw-in" rows={4}
                  placeholder="Descrie produsul/serviciul tău, ce îl face special, cui se adresează..."
                  value={form.product_description} onChange={e => set({ product_description: e.target.value })} maxLength={500} />
                <p className="nw-hint" style={{ textAlign: 'right' }}>{form.product_description.length}/500</p>
              </div>
              <div className="nw-f">
                <label>Website / link produs <small>(opțional)</small></label>
                <input className="nw-in" placeholder="https://..." value={form.product_url} onChange={e => set({ product_url: e.target.value })} />
              </div>
              <div className="nw-f">
                <label>Nișe influenceri dorite <small>(opțional)</small></label>
                <div className="nw-chips">
                  {NICHES.map(n => (
                    <button key={n} type="button" onClick={() => toggleNiche(n)}
                      className={`nw-chipbtn ${form.target_niches.includes(n) ? 'on' : ''}`}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Buget ── */}
          {step === 3 && (
            <>
              <div className="bu-card nw-card">
                {head(3)}
                <div className="nw-f">
                  <label>Buget total campanie</label>
                  <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                    {BUDGET_OPTIONS.filter(b => b.value > 0).map(b => (
                      <button key={b.value} type="button" onClick={() => set({ budget: b.value, custom_budget: '' })}
                        className={`nw-tile c ${form.budget === b.value ? 'on' : ''}`} style={{ minHeight: 70 }}>
                        {b.popular && <span className="pop">POPULAR</span>}
                        <span className="t" style={{ alignItems: 'center' }}><b>{b.label}</b><span>{b.desc}</span></span>
                      </button>
                    ))}
                    <button type="button" onClick={() => set({ budget: 0 })}
                      className={`nw-tile c ${form.budget === 0 ? 'on' : ''}`} style={{ minHeight: 70 }}>
                      <span className="t" style={{ alignItems: 'center' }}><b>Altul</b><span>Suma dorită</span></span>
                    </button>
                  </div>
                  {form.budget === 0 && (
                    <input type="number" min={100} className="nw-in" style={{ borderColor: '#b9a5f5', fontWeight: 700 }}
                      placeholder="Introduceți suma (minim 500 RON)"
                      value={form.custom_budget} onChange={e => set({ custom_budget: e.target.value })} />
                  )}
                </div>

                {finalBudget > 0 && (
                  <div className="nw-box" style={{ background: '#efeaff', borderColor: '#e0d6ff' }}>
                    <span className="bu-label" style={{ color: '#4423c4' }}>Cum se distribuie bugetul</span>
                    <div className="r"><span>Buget total</span><b>{finalBudget.toLocaleString('ro-RO')} RON</b></div>
                    <div className="r bu-div" style={{ paddingTop: 8 }}><span style={{ fontWeight: 700, color: '#14123a' }}>Pentru influenceri</span><b style={{ color: '#14532d' }}>{influencerPool.toLocaleString('ro-RO')} RON</b></div>
                    {form.influencer_count > 0 && (
                      <div className="r"><span className="bu-sm">Per influencer (~)</span><b className="bu-sm" style={{ color: '#4423c4' }}>{perInfluencer.toLocaleString('ro-RO')} RON</b></div>
                    )}
                  </div>
                )}
              </div>

              <div className="bu-card nw-card">
                <InfluencerSlotsSelector value={form.influencer_count} onChange={v => set({ influencer_count: v })} />
              </div>

              <div className="bu-card nw-card">
                <div className="nw-f">
                  <label>Deadline campanie: <b style={{ color: '#5a35e6' }}>{form.deadline_days} zile</b></label>
                  <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
                    {[7, 14, 21, 30].map(d => (
                      <button key={d} type="button" onClick={() => set({ deadline_days: d })}
                        className={`nw-tile c ${form.deadline_days === d ? 'on' : ''}`} style={{ minHeight: 48, padding: '8px' }}>
                        <b>{d}z</b>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 4: Brief ── */}
          {step === 4 && (
            <>
              <div className="bu-card nw-card">
                {head(4)}
                <div className="nw-f">
                  <label>Mesaje cheie <small>(ce trebuie menționat obligatoriu)</small></label>
                  <textarea className="nw-in" rows={3}
                    placeholder="ex. Menționa că suntem deschiși L-V 9-21, prețurile pornesc de la 50 RON, oferim livrare gratuită..."
                    value={form.key_messages} onChange={e => set({ key_messages: e.target.value })} />
                </div>
                <div className="nw-f">
                  <label>Instrucțiuni conținut <small>(opțional)</small></label>
                  <textarea className="nw-in" rows={3}
                    placeholder="ex. Vrem videoclipuri naturale, nu scriptate. Produsul să fie vizibil. Ton vesel și energic..."
                    value={form.content_instructions} onChange={e => set({ content_instructions: e.target.value })} />
                </div>
                <div className="nw-f">
                  <label>Ce să evite <small>(opțional)</small></label>
                  <textarea className="nw-in" rows={2}
                    placeholder="ex. Nu menționați concurenții, evitați limbajul vulgar..."
                    value={form.forbidden_content} onChange={e => set({ forbidden_content: e.target.value })} />
                </div>
              </div>

              <div className="nw-note blue">
                <Info size={16} style={{ flex: 'none', marginTop: 2 }} />
                <span><strong>Ce urmează:</strong> Echipa AddFame va analiza brief-ul în 24-48h și îți va trimite o listă cu influencerii propuși. Tu aprobi lista și noi ne ocupăm de tot.</span>
              </div>
            </>
          )}

          {error && (
            <div className="nw-note red"><AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} /><span>{error}</span></div>
          )}
        </div>

        {/* Rezumat */}
        <div className="bu-card nw-sum">
          <h3><Target size={17} color="#5a35e6" /> Rezumat</h3>
          <div className="row"><span>Tip</span><b>Managed</b></div>
          <div className="row"><span>Obiectiv</span><b>{OBJECTIVES.find(o => o.value === form.objective)?.label || '—'}</b></div>
          <div className="row"><span>Platforme</span><b>{form.platforms.length ? form.platforms.map(platLabel).join(', ') : '—'}</b></div>
          <div className="row"><span>Produs</span><b>{form.product_name || '—'}</b></div>
          <div className="row"><span>Influenceri</span><b>{form.influencer_count}</b></div>
          <div className="row"><span>Deadline</span><b>{form.deadline_days} zile</b></div>
          <div className="bu-div" />
          <div className="row"><span>Buget total</span><b className="big" style={{ color: finalBudget > 0 ? '#14123a' : '#8783a8' }}>{finalBudget.toLocaleString('ro-RO')} RON</b></div>
          {finalBudget > 0 && form.influencer_count > 0 && (
            <div className="row"><span>Per influencer (~)</span><b>{perInfluencer.toLocaleString('ro-RO')} RON</b></div>
          )}
          <div className="bu-bar"><i style={{ width: `${(step / 4) * 100}%` }} /></div>
          <p className="nw-hint">Pasul {step} din 4</p>
        </div>
      </div>

      {/* Bară de acțiuni */}
      <div className="nw-bar">
        <span className="st">Pasul {step} din 4 — {STEPS[step - 1].label}</span>
        <div className="acts">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => (s - 1) as Step)} className="bu-btn big">
              <ArrowLeft size={16} /> Înapoi
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={() => setStep(s => (s + 1) as Step)} disabled={!canNext()} className="bu-btn p big">
              Continuă <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className="bu-btn p big">
              {loading ? <><Loader2 size={16} className="nw-spin" /> Se trimite...</> : <><Sparkles size={16} /> Trimite campania</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
