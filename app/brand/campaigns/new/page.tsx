'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2,
  Sparkles, Target, Package, Users, Euro, Calendar,
  Instagram, Youtube, MessageSquare, Check, Info
} from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import { createManagedCampaign } from '@/app/actions/managed-campaigns'

const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram', Icon: InstagramIcon, color: 'from-pink-500 to-purple-500' },
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
  const addfameCommission = Math.round(finalBudget * 0.25)
  const influencerPool = finalBudget - addfameCommission
  const perInfluencer = form.influencer_count > 0 ? Math.round(influencerPool / form.influencer_count) : 0

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
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
      if (!result.success) throw new Error(result.error)
      setDone(true)
      setTimeout(() => router.push('/brand/campaigns'), 3000)
    } catch (e: any) {
      setError(e.message || 'Eroare. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 12px 40px rgba(139,92,246,0.35)' }}>
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Campanie trimisă! 🎉</h2>
        <p className="text-gray-500 mb-2">Echipa AddFame va analiza brief-ul și va selecta influencerii potriviți.</p>
        <p className="text-sm text-gray-400">Vei fi notificat în 24-48h cu lista de influenceri propuși.</p>
        <div className="mt-6 flex items-center justify-center gap-2 text-purple-600">
          <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          <span className="text-sm font-bold">Redirecționare...</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/brand/campaigns/new" className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="font-black text-gray-900 text-lg">Campanie Managed</h1>
            </div>
            <p className="text-sm text-gray-400">Noi ne ocupăm de tot — tu doar urmărești rezultatele</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all flex-shrink-0 ${step > s.n ? 'bg-green-500 text-white' :
                    step === s.n ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`} style={step === s.n ? { background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' } : {}}>
                  {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                </div>
                <span className={`text-xs font-black hidden sm:block ${step === s.n ? 'text-purple-600' : step > s.n ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step > s.n ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">

          {/* ── STEP 1: Obiectiv ── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-black mb-1">Care este obiectivul campaniei?</h2>
              <p className="text-sm text-gray-400 mb-6">Selectează ce vrei să obții</p>

              <div className="space-y-3 mb-6">
                {OBJECTIVES.map(obj => (
                  <button key={obj.value} type="button"
                    onClick={() => set({ objective: obj.value })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition ${form.objective === obj.value ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                      }`}>
                    <span className="text-2xl flex-shrink-0">{obj.emoji}</span>
                    <div className="flex-1">
                      <p className="font-black text-sm text-gray-900">{obj.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{obj.desc}</p>
                    </div>
                    {form.objective === obj.value && (
                      <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-sm font-black text-gray-700 mb-3">Pe ce platforme? <span className="text-gray-400 font-normal">(selectează toate)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  {PLATFORMS.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => togglePlatform(p.value)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition ${form.platforms.includes(p.value) ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                        }`}>
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0`}>
                        <p.Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-sm text-gray-800">{p.label}</span>
                      {form.platforms.includes(p.value) && <Check className="w-4 h-4 text-purple-500 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Produs ── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-black mb-1">Despre produsul tău</h2>
              <p className="text-sm text-gray-400 mb-6">Ajută-ne să găsim influencerii cei mai potriviți</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">Numele produsului / brandului *</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition"
                    placeholder="ex. Cafenea TopFace, Supliment X, Rochie Y..."
                    value={form.product_name}
                    onChange={e => set({ product_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">Descriere scurtă *</label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
                    rows={4}
                    placeholder="Descrie produsul/serviciul tău, ce îl face special, cui se adresează..."
                    value={form.product_description}
                    onChange={e => set({ product_description: e.target.value })}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">{form.product_description.length}/500</p>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">Website / link produs <span className="text-gray-400 font-normal">(opțional)</span></label>
                  <input
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition"
                    placeholder="https://..."
                    value={form.product_url}
                    onChange={e => set({ product_url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">Nișe influenceri dorite <span className="text-gray-400 font-normal">(opțional)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map(n => (
                      <button key={n} type="button"
                        onClick={() => toggleNiche(n)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${form.target_niches.includes(n)
                            ? 'border-purple-400 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-500 hover:border-purple-200'
                          }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Buget ── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-black mb-1">Buget și timeline</h2>
              <p className="text-sm text-gray-400 mb-6">Noi distribuim bugetul optim între influenceri</p>

              <div className="space-y-5">
                {/* Budget options */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">Buget total campanie</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {BUDGET_OPTIONS.filter(b => b.value > 0).map(b => (
                      <button key={b.value} type="button"
                        onClick={() => set({ budget: b.value, custom_budget: '' })}
                        className={`relative p-3 rounded-2xl border-2 text-center transition ${form.budget === b.value ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                          }`}>
                        {b.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">POPULAR</span>
                        )}
                        <p className="font-black text-sm text-gray-900">{b.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{b.desc}</p>
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => set({ budget: 0 })}
                      className={`p-3 rounded-2xl border-2 text-center transition ${form.budget === 0 ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                        }`}>
                      <p className="font-black text-sm text-gray-900">Altul</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Suma dorită</p>
                    </button>
                  </div>
                  {form.budget === 0 && (
                    <div className="relative">

                      <input
                        type="number" min={100}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-2xl text-sm font-bold outline-none focus:border-purple-400 transition"
                        placeholder="Introduceți suma (minim 500 RON)"
                        value={form.custom_budget}
                        onChange={e => set({ custom_budget: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                {finalBudget > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-wider mb-3">💡 Cum se distribuie bugetul</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget total</span>
                        <span className="font-black text-gray-900">{finalBudget.toLocaleString('ro-RO')} RON</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Comision AddFame (25%)</span>
                        <span className="font-black text-orange-600">-{addfameCommission.toLocaleString('ro-RO')} RON</span>
                      </div>
                      <div className="flex justify-between border-t border-purple-200 pt-2">
                        <span className="font-black text-gray-700">Pentru influenceri</span>
                        <span className="font-black text-green-600">{influencerPool.toLocaleString('ro-RO')} RON</span>
                      </div>
                      {form.influencer_count > 0 && (
                        <div className="flex justify-between bg-white rounded-xl px-3 py-2 mt-1">
                          <span className="text-xs text-gray-500">Per influencer (~)</span>
                          <span className="text-xs font-black text-purple-600">{perInfluencer.toLocaleString('ro-RO')} RON</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Influencer count */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">
                    Număr de influenceri: <span className="text-purple-600">{form.influencer_count}</span>
                  </label>
                  <input type="range" min={3} max={50} step={1}
                    value={form.influencer_count}
                    onChange={e => set({ influencer_count: +e.target.value })}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>3 micro</span>
                    <span>25 mid</span>
                    <span>50 macro</span>
                  </div>
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">
                    Deadline campanie: <span className="text-purple-600">{form.deadline_days} zile</span>
                  </label>
                  <div className="flex gap-2">
                    {[7, 14, 21, 30].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ deadline_days: d })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition ${form.deadline_days === d ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-purple-200'
                          }`}>
                        {d}z
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Brief ── */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-black mb-1">Brief pentru influenceri</h2>
              <p className="text-sm text-gray-400 mb-6">Ce vrei să transmită conținutul creat</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">
                    Mesaje cheie <span className="text-gray-400 font-normal">(ce trebuie menționat obligatoriu)</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
                    rows={3}
                    placeholder="ex. Menționa că suntem deschiși L-V 9-21, prețurile pornesc de la 50 RON, oferim livrare gratuită..."
                    value={form.key_messages}
                    onChange={e => set({ key_messages: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">
                    Instrucțiuni conținut <span className="text-gray-400 font-normal">(opțional)</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
                    rows={3}
                    placeholder="ex. Vrem videoclipuri naturale, nu scriptate. Produsul să fie vizibil. Ton vesel și energic..."
                    value={form.content_instructions}
                    onChange={e => set({ content_instructions: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-700 mb-2">
                    Ce să evite <span className="text-gray-400 font-normal">(opțional)</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
                    rows={2}
                    placeholder="ex. Nu menționați concurenții, evitați limbajul vulgar..."
                    value={form.forbidden_content}
                    onChange={e => set({ forbidden_content: e.target.value })}
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-sm">
                  <p className="font-black text-gray-700 mb-3">📋 Sumar campanie</p>
                  <div className="flex justify-between"><span className="text-gray-500">Obiectiv</span><span className="font-bold capitalize">{OBJECTIVES.find(o => o.value === form.objective)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Platforme</span><span className="font-bold">{form.platforms.join(', ')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Produs</span><span className="font-bold truncate max-w-[200px]">{form.product_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Buget total</span><span className="font-bold text-green-600">{finalBudget.toLocaleString('ro-RO')} RON</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Influenceri</span><span className="font-bold">{form.influencer_count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Deadline</span><span className="font-bold">{form.deadline_days} zile</span></div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    <strong>Ce urmează:</strong> Echipa AddFame va analiza brief-ul în 24-48h și îți va trimite o listă cu influencerii propuși. Tu aprobi lista și noi ne ocupăm de tot.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button type="button"
                onClick={() => setStep(s => (s - 1) as Step)}
                className="flex-1 py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                Înapoi
              </button>
            )}
            {step < 4 ? (
              <button type="button"
                onClick={() => setStep(s => (s + 1) as Step)}
                disabled={!canNext()}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                Continuă <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Se trimite...</> : <><Sparkles className="w-4 h-4" /> Trimite campania</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
