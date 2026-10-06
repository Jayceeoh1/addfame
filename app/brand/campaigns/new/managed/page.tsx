'use client'
import { createClient } from '@/lib/supabase/client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Sparkles, Target, Package, Users, Euro, Calendar,
  Instagram, Youtube, MessageSquare, Check, Info
} from 'lucide-react'

import { createManagedCampaign } from '@/app/actions/managed-campaigns'
import { publishCampaignWithFee } from '@/app/actions/campaigns'
import { InfluencerSlotsSelector } from '@/components/brand/InfluencerSlotsSelector'

const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram', Icon: () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>, color: 'from-violet-500 to-purple-500' },
  { value: 'TIKTOK', label: 'TikTok', Icon: () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>, color: 'from-gray-800 to-gray-600' },
  { value: 'YOUTUBE', label: 'YouTube', Icon: () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, color: 'from-red-500 to-red-600' },
  { value: 'FACEBOOK', label: 'Facebook', Icon: () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>, color: 'from-blue-600 to-blue-700' },
]

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness', desc: 'Fă-ți brandul cunoscut unui public nou', emoji: '📣' },
  { value: 'sales', label: 'Creștere vânzări', desc: 'Generează comenzi și trafic în magazin/online', emoji: '💰' },
  { value: 'followers', label: 'Creștere followeri', desc: 'Atrage followeri noi pe paginile tale', emoji: '👥' },
  { value: 'ugc', label: 'Conținut UGC', desc: 'Primește videoclipuri/poze pentru reclamele tale', emoji: '🎬' },
  { value: 'local', label: 'Promovare locală', desc: 'Aduce clienți fizic la locația ta', emoji: '📍' },
]

const BUDGET_OPTIONS = [
  { value: 50, label: '50 RON', desc: 'per influencer', popular: false },
  { value: 100, label: '100 RON', desc: 'per influencer', popular: true },
  { value: 150, label: '150 RON', desc: 'per influencer', popular: false },
  { value: 200, label: '200 RON', desc: 'per influencer', popular: false },
  { value: 300, label: '300 RON', desc: 'per influencer', popular: false },
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
  product_image_url: string
  target_niches: string[]
  // Step 3 — Buget & Timeline
  budget: number
  custom_budget: string
  negotiable: boolean
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
  product_image_url: '',
  target_niches: [],
  budget: 100,
  custom_budget: '',
  negotiable: false,
  deadline_days: 14,
  influencer_count: 8,
  key_messages: '',
  content_instructions: '',
  forbidden_content: '',
}

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
    if (step === 3) return (form.negotiable || form.budget > 0 || +form.custom_budget > 0) && form.influencer_count >= 1
    return true
  }

  const finalBudget = form.budget > 0 ? form.budget : +form.custom_budget || 0
  const perInfluencer = finalBudget  // finalBudget = suma per influencer
  const totalBudget = perInfluencer * form.influencer_count
  const addfameCommission = 0 // fără comision procentual: taxa AddFame e fixă per influencer
  const influencerPool = totalBudget - addfameCommission

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
        product_image_url: form.product_image_url,
        product_description: form.product_description,
        product_url: form.product_url,
        target_niches: form.target_niches,
        budget: form.negotiable ? 0 : totalBudget,
        payment_negotiable: form.negotiable,
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

  const objLabel = OBJECTIVES.find(o => o.value === form.objective)?.label
  const platLabels = form.platforms.map(v => PLATFORMS.find(p => p.value === v)?.label || v).join(', ')
  const STEP_TITLES: Record<number, string> = { 1: 'Obiectiv și platforme', 2: 'Despre produsul tău', 3: 'Buget și timeline', 4: 'Brief pentru influenceri' }
  const STEP_HELP: Record<number, string> = {
    1: 'Selectează ce vrei să obții și unde vrei să apară campania.',
    2: 'Ajută-ne să găsim influencerii cei mai potriviți.',
    3: 'Noi distribuim bugetul optim între influenceri.',
    4: 'Ce vrei să transmită conținutul creat.',
  }

  const styles = `
    .mg-wrap { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 22px; align-items: start; }
    .mg-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .mg-side { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .mg-back { width: 44px; height: 44px; border-radius: 12px; border: 1.5px solid #e5e3f3; background: #fff; display: inline-flex; align-items: center; justify-content: center; color: #14123a; flex: none; }
    .mg-steps { display: flex; align-items: center; gap: 8px; }
    .mg-step { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .mg-dot { width: 30px; height: 30px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; background: #f0eff7; color: #8783a8; }
    .mg-step.on .mg-dot { background: linear-gradient(135deg,#2f6fe0,#5a35e6); color: #fff; }
    .mg-step.done .mg-dot { background: #dcf5ec; color: #14532d; }
    .mg-step span.t { font-size: 13px; font-weight: 700; color: #8783a8; }
    .mg-step.on span.t { color: #5a35e6; }
    .mg-step.done span.t { color: #14532d; }
    .mg-line { flex: 1; height: 2px; border-radius: 99px; background: #e5e3f3; min-width: 10px; }
    .mg-line.done { background: #9bdcc3; }
    .mg-sec { padding: 22px; }
    .mg-sech { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
    .mg-num { width: 30px; height: 30px; border-radius: 10px; flex: none; display: flex; align-items: center; justify-content: center; background: #efeaff; color: #4423c4; font-weight: 800; font-size: 14px; }
    .mg-fl { display: block; font-size: 13px; font-weight: 700; color: #14123a; margin-bottom: 8px; }
    .mg-fl small { font-weight: 500; color: #8783a8; font-size: 12px; }
    .mg-tiles { display: grid; gap: 10px; }
    .mg-tile { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 12px 14px; border: 1.5px solid #e5e3f3; border-radius: 14px; background: #fff; text-align: left; cursor: pointer; font: inherit; color: #14123a; transition: border-color .15s, background .15s; width: 100%; box-sizing: border-box; }
    .mg-tile:hover { border-color: #c9b9fb; }
    .mg-tile.on { border-color: #5a35e6; background: #f7f4ff; box-shadow: 0 0 0 3px rgba(90,53,230,.08); }
    .mg-tile .em { font-size: 22px; flex: none; }
    .mg-tile .tt { font-weight: 700; font-size: 14px; }
    .mg-tile .ds { font-size: 12px; color: #6a6690; margin-top: 1px; }
    .mg-tick { margin-left: auto; width: 22px; height: 22px; border-radius: 50%; background: #5a35e6; color: #fff; display: flex; align-items: center; justify-content: center; flex: none; }
    .mg-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .mg-g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .mg-tile.c { flex-direction: column; justify-content: center; text-align: center; gap: 2px; position: relative; }
    .mg-pop { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 800; background: #5a35e6; color: #fff; padding: 2px 8px; border-radius: 99px; }
    .mg-pico { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex: none; background: #14123a; }
    .mg-field { width: 100%; box-sizing: border-box; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 11px 14px; font: inherit; font-size: 14px; color: #14123a; background: #fff; outline: none; min-height: 44px; }
    .mg-field:focus { border-color: #5a35e6; box-shadow: 0 0 0 3px rgba(90,53,230,.1); }
    textarea.mg-field { resize: none; line-height: 1.5; }
    .mg-stack { display: flex; flex-direction: column; gap: 18px; }
    .mg-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; border: 2px dashed #d8d5ec; border-radius: 16px; background: #fbfaff; cursor: pointer; text-align: center; min-height: 44px; }
    .mg-drop:hover { border-color: #5a35e6; background: #f7f4ff; }
    .mg-img { position: relative; border-radius: 16px; overflow: hidden; border: 1.5px solid #e5e3f3; }
    .mg-img img { width: 100%; height: 190px; object-fit: cover; display: block; }
    .mg-img button { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; border-radius: 12px; border: 0; background: rgba(255,255,255,.94); font-weight: 800; cursor: pointer; color: #14123a; }
    .mg-note { background: #efeaff; color: #4423c4; border-radius: 14px; padding: 14px 16px; font-size: 13px; line-height: 1.55; }
    .mg-calc { background: #f6f6fc; border: 1px solid #e5e3f3; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .mg-r { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .mg-r b { font-weight: 800; text-align: right; min-width: 0; overflow-wrap: anywhere; }
    .mg-err { display: flex; gap: 10px; align-items: flex-start; background: #fff4f2; border: 1px solid #f3c9c4; color: #b42318; border-radius: 14px; padding: 12px 14px; font-size: 13px; }
    .mg-bar { position: sticky; bottom: 0; z-index: 20; display: flex; gap: 10px; padding: 12px 0; background: linear-gradient(180deg, rgba(246,246,252,0), #f6f6fc 30%); }
    .mg-bar .bu-btn { flex: 1; height: 48px; }
    .mg-sumc { padding: 18px; }
    .mg-done { min-height: 70vh; display: flex; align-items: center; justify-content: center; text-align: center; }
    @media (max-width: 900px) {
      .mg-wrap { grid-template-columns: minmax(0,1fr); }
      .mg-side { position: static; order: 2; }
      .mg-step span.t { display: none; }
    }
    @media (max-width: 480px) {
      .mg-sec { padding: 18px 16px; }
      .mg-g3 { grid-template-columns: 1fr 1fr; }
      .mg-bar { margin: 0 -16px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); border-top: 1px solid #eeecf7; backdrop-filter: blur(6px); }
    }
  `

  if (done) return (
    <div className="bu">
      <style>{styles}</style>
      <div className="mg-done">
        <div style={{ maxWidth: 440 }}>
          <div className="bu-ico" style={{ width: 72, height: 72, borderRadius: 22, margin: '0 auto 20px', background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', boxShadow: '0 14px 34px -14px rgba(90,53,230,.7)' }}>
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <h1 style={{ fontSize: 28 }}>Campanie trimisă! 🎉</h1>
          <p className="bu-muted" style={{ margin: '12px 0 4px' }}>Echipa AddFame va analiza brief-ul și va selecta influencerii potriviți.</p>
          <p className="bu-muted bu-sm" style={{ margin: 0 }}>Vei fi notificat în 24-48h cu lista de influenceri propuși.</p>
          <div className="bu-row" style={{ justifyContent: 'center', gap: 8, marginTop: 22, color: '#5a35e6' }}>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="bu-sm" style={{ fontWeight: 700 }}>Redirecționare...</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="bu">
      <style>{styles}</style>

      {/* Header */}
      <div className="bu-head" style={{ alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'nowrap' }}>
        <Link href="/brand/campaigns/new" className="mg-back" aria-label="Înapoi">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div style={{ minWidth: 0 }}>
          <div className="bu-label">Campanie nouă · Managed by AddFame</div>
          <h1 style={{ fontSize: 28 }}>Campanie Managed</h1>
          <p className="bu-muted bu-sm" style={{ margin: '4px 0 0' }}>Noi ne ocupăm de tot — tu doar urmărești rezultatele</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bu-card" style={{ padding: '14px 18px' }}>
        <div className="mg-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'contents' }}>
              <div className={`mg-step ${step === s.n ? 'on' : step > s.n ? 'done' : ''}`}>
                <div className="mg-dot">{step > s.n ? <Check className="w-4 h-4" /> : s.n}</div>
                <span className="t">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mg-line ${step > s.n ? 'done' : ''}`} />}
            </div>
          ))}
        </div>
        <div className="bu-bar" style={{ marginTop: 12 }}><i style={{ width: `${(step / 4) * 100}%` }} /></div>
        <div className="bu-muted bu-xs" style={{ marginTop: 6 }}>Pasul {step} din 4 · {STEPS[step - 1].label}</div>
      </div>

      <div className="mg-wrap">
        <div className="mg-main">
          <div className="bu-card mg-sec">
            <div className="mg-sech">
              <div className="mg-num">{step}</div>
              <div>
                <h2>{STEP_TITLES[step]}</h2>
                <p className="bu-muted bu-sm" style={{ margin: '2px 0 0' }}>{STEP_HELP[step]}</p>
              </div>
            </div>

            {/* ── STEP 1: Obiectiv ── */}
            {step === 1 && (
              <div className="mg-stack">
                <div className="mg-tiles">
                  {OBJECTIVES.map(obj => (
                    <button key={obj.value} type="button"
                      onClick={() => set({ objective: obj.value })}
                      className={`mg-tile ${form.objective === obj.value ? 'on' : ''}`}>
                      <span className="em">{obj.emoji}</span>
                      <div style={{ minWidth: 0 }}>
                        <div className="tt">{obj.label}</div>
                        <div className="ds">{obj.desc}</div>
                      </div>
                      {form.objective === obj.value && <span className="mg-tick"><Check className="w-3 h-3" /></span>}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="mg-fl">Pe ce platforme? <small>(selectează toate)</small></label>
                  <div className="mg-g2">
                    {PLATFORMS.map(p => (
                      <button key={p.value} type="button"
                        onClick={() => togglePlatform(p.value)}
                        className={`mg-tile ${form.platforms.includes(p.value) ? 'on' : ''}`}>
                        <div className="mg-pico"><p.Icon /></div>
                        <span className="tt">{p.label}</span>
                        {form.platforms.includes(p.value) && <span className="mg-tick"><Check className="w-3 h-3" /></span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Produs ── */}
            {step === 2 && (
              <div className="mg-stack">
                <div>
                  <label className="mg-fl">Numele produsului / brandului *</label>
                  <input
                    className="mg-field"
                    placeholder="ex. Cafenea TopFace, Supliment X, Rochie Y..."
                    value={form.product_name}
                    onChange={e => set({ product_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mg-fl">Descriere scurtă *</label>
                  <textarea
                    className="mg-field"
                    rows={4}
                    placeholder="Descrie produsul/serviciul tău, ce îl face special, cui se adresează..."
                    value={form.product_description}
                    onChange={e => set({ product_description: e.target.value })}
                    maxLength={500}
                  />
                  <p className="bu-muted bu-xs" style={{ textAlign: 'right', margin: '4px 0 0' }}>{form.product_description.length}/500</p>
                </div>

                <div>
                  <label className="mg-fl">Website / link produs <small>(opțional)</small></label>
                  <input
                    className="mg-field"
                    placeholder="https://..."
                    value={form.product_url}
                    onChange={e => set({ product_url: e.target.value })}
                  />
                </div>

                {/* Imagine produs */}
                <div>
                  <label className="mg-fl">Poza produsului / brandului <small>(opțional)</small></label>
                  {form.product_image_url ? (
                    <div className="mg-img">
                      <img src={form.product_image_url} alt="Produs" />
                      <button type="button" aria-label="Șterge poza" onClick={() => set({ product_image_url: '' })}>✕</button>
                    </div>
                  ) : (
                    <label className="mg-drop">
                      <div className="bu-ico" style={{ background: '#efeaff', color: '#5a35e6' }}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Încarcă o poză</div>
                        <div className="bu-muted bu-xs" style={{ marginTop: 2 }}>PNG, JPG până la 5MB</div>
                      </div>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) { alert('Poza trebuie să fie sub 5MB'); return }
                          try {
                            const sb = createClient()
                            const ext = file.name.split('.').pop()
                            const path = `managed/${Date.now()}.${ext}`
                            const { error } = await sb.storage.from('campaign-images').upload(path, file, { upsert: true })
                            if (error) throw error
                            const { data } = sb.storage.from('campaign-images').getPublicUrl(path)
                            set({ product_image_url: data.publicUrl })
                          } catch (err: any) {
                            alert('Eroare la încărcare: ' + err.message)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="mg-fl">Nișe influenceri dorite <small>(opțional)</small></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {NICHES.map(n => (
                      <button key={n} type="button"
                        onClick={() => toggleNiche(n)}
                        className={`bu-pill ${form.target_niches.includes(n) ? 'on' : ''}`}
                        style={{ minHeight: 44 }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Buget ── */}
            {step === 3 && (
              <div className="mg-stack">
                {/* Mod de plată: fix vs de discutat */}
                <div className="mg-g2">
                  <button type="button" onClick={() => set({ negotiable: false })}
                    className={`mg-tile c ${!form.negotiable ? 'on' : ''}`}>
                    <span className="tt">💵 Preț fix</span>
                    <span className="ds">Setezi suma per influencer</span>
                  </button>
                  <button type="button" onClick={() => set({ negotiable: true })}
                    className={`mg-tile c ${form.negotiable ? 'on' : ''}`}>
                    <span className="tt">💬 De discutat</span>
                    <span className="ds">Prețul se stabilește cu influencerul</span>
                  </button>
                </div>

                {form.negotiable && (
                  <div className="mg-note">
                    Nu setezi un buget acum. Prețul se discută individual cu fiecare influencer, iar echipa AddFame stabilește sumele la momentul alocării.
                  </div>
                )}

                {!form.negotiable && (<>
                {/* Budget options */}
                <div>
                  <label className="mg-fl">Suma per influencer <small>(cât primește fiecare)</small></label>
                  <div className="mg-g3" style={{ marginBottom: 12 }}>
                    {BUDGET_OPTIONS.filter(b => b.value > 0).map(b => (
                      <button key={b.value} type="button"
                        onClick={() => set({ budget: b.value, custom_budget: '' })}
                        className={`mg-tile c ${form.budget === b.value ? 'on' : ''}`}>
                        {b.popular && <span className="mg-pop">POPULAR</span>}
                        <span className="tt">{b.label}</span>
                        <span className="ds">{b.desc}</span>
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => set({ budget: 0 })}
                      className={`mg-tile c ${form.budget === 0 ? 'on' : ''}`}>
                      <span className="tt">Altul</span>
                      <span className="ds">Suma dorită</span>
                    </button>
                  </div>
                  {form.budget === 0 && (
                    <input
                      type="number" min={100}
                      className="mg-field"
                      placeholder="Introduceți suma (minim 100 RON)"
                      value={form.custom_budget}
                      onChange={e => set({ custom_budget: e.target.value })}
                    />
                  )}
                </div>

                {/* Breakdown */}
                {finalBudget > 0 && (
                  <div className="mg-calc">
                    <div className="bu-label">Cum se distribuie bugetul</div>
                    <div className="mg-r"><span>Fiecare influencer primește</span><b style={{ color: '#14532d' }}>{perInfluencer.toLocaleString('ro-RO')} RON</b></div>
                    <div className="mg-r"><span className="bu-muted">Nr. influenceri</span><b>× {form.influencer_count}</b></div>
                    <div className="mg-r bu-div" style={{ paddingTop: 8 }}><span className="bu-muted">Total plătit influenceri</span><b>{influencerPool.toLocaleString('ro-RO')} RON</b></div>
                    <div className="mg-r bu-div" style={{ paddingTop: 8 }}><b>Total de plătit</b><b style={{ color: '#5a35e6', fontSize: 15 }}>{totalBudget.toLocaleString('ro-RO')} RON</b></div>
                  </div>
                )}
                </>)}

                {/* Influencer count + taxă AddFame */}
                <div>
                  <InfluencerSlotsSelector
                    value={form.influencer_count}
                    onChange={v => set({ influencer_count: v })}
                  />
                </div>

                {/* Timeline */}
                <div>
                  <label className="mg-fl">Deadline campanie: <span style={{ color: '#5a35e6' }}>{form.deadline_days} zile</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {[7, 14, 21, 30].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ deadline_days: d })}
                        className={`mg-tile c ${form.deadline_days === d ? 'on' : ''}`}>
                        <span className="tt">{d}z</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Brief ── */}
            {step === 4 && (
              <div className="mg-stack">
                <div>
                  <label className="mg-fl">Mesaje cheie <small>(ce trebuie menționat obligatoriu)</small></label>
                  <textarea
                    className="mg-field"
                    rows={3}
                    placeholder="ex. Menționa că suntem deschiși L-V 9-21, prețurile pornesc de la 50 RON, oferim livrare gratuită..."
                    value={form.key_messages}
                    onChange={e => set({ key_messages: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mg-fl">Instrucțiuni conținut <small>(opțional)</small></label>
                  <textarea
                    className="mg-field"
                    rows={3}
                    placeholder="ex. Vrem videoclipuri naturale, nu scriptate. Produsul să fie vizibil. Ton vesel și energic..."
                    value={form.content_instructions}
                    onChange={e => set({ content_instructions: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mg-fl">Ce să evite <small>(opțional)</small></label>
                  <textarea
                    className="mg-field"
                    rows={2}
                    placeholder="ex. Nu menționați concurenții, evitați limbajul vulgar..."
                    value={form.forbidden_content}
                    onChange={e => set({ forbidden_content: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mg-err" style={{ marginTop: 18 }}>
                <span>⚠️</span> <span>{error}</span>
              </div>
            )}
          </div>

          {/* Navigation (sticky) */}
          <div className="mg-bar">
            {step > 1 && (
              <button type="button" className="bu-btn big"
                onClick={() => setStep(s => (s - 1) as Step)}>
                Înapoi
              </button>
            )}
            {step < 4 ? (
              <button type="button" className="bu-btn p big"
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canNext()}>
                Continuă <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" className="bu-btn p big"
                onClick={handleSubmit}
                disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Se trimite...</> : <><Sparkles className="w-4 h-4" /> Trimite campania</>}
              </button>
            )}
          </div>
        </div>

        {/* Rezumat */}
        <div className="mg-side">
          <div className="bu-card mg-sumc">
            <div className="bu-label" style={{ marginBottom: 12 }}>Rezumat</div>
            <div className="bu-col" style={{ gap: 10, fontSize: 13 }}>
              <div className="mg-r"><span className="bu-muted">Tip</span><span className="bu-chip" style={{ background: '#efeaff', color: '#4423c4' }}>Managed by AddFame</span></div>
              <div className="mg-r"><span className="bu-muted">Obiectiv</span><b>{objLabel || '—'}</b></div>
              <div className="mg-r"><span className="bu-muted">Platforme</span><b>{platLabels || '—'}</b></div>
              <div className="mg-r"><span className="bu-muted">Produs</span><b>{form.product_name || '—'}</b></div>
              <div className="mg-r"><span className="bu-muted">Influenceri</span><b>{form.influencer_count}</b></div>
              <div className="mg-r"><span className="bu-muted">Deadline</span><b>{form.deadline_days} zile</b></div>
              <div className="bu-div" />
              {form.negotiable ? (
                <div className="mg-r"><span className="bu-muted">Buget</span><span className="bu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>De discutat</span></div>
              ) : (<>
                <div className="mg-r"><span className="bu-muted">Per influencer</span><b style={{ color: '#14532d' }}>{perInfluencer.toLocaleString('ro-RO')} RON</b></div>
                <div className="mg-r"><span className="bu-muted">Total campanie</span><b style={{ color: '#5a35e6', fontSize: 15 }}>{totalBudget.toLocaleString('ro-RO')} RON</b></div>
              </>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
