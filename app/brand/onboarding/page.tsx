'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ArrowRight, Zap, Users, DollarSign, BarChart3, Plus } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  { id: 'welcome', title: 'Bun venit!', icon: '🎉' },
  { id: 'wallet', title: 'Adaugă credite', icon: '💳' },
  { id: 'campaign', title: 'Lansează o campanie', icon: '🚀' },
  { id: 'done', title: 'Ești gata!', icon: '✅' },
]

export default function BrandOnboarding() {
  const [step, setStep] = useState(0)
  const [brandName, setBrandName] = useState('')
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const sb = createClient()
      const { data } = await sb.from('brands').select('name').eq('user_id', user.id).single()
      if (data?.name) setBrandName(data.name)
    })
  }, [])

  async function markOnboardingDone() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from('brands').update({ onboarding_done: true }).eq('user_id', user.id)
      await new Promise(r => setTimeout(r, 300))
    }
    router.refresh()
    router.replace('/brand/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .4s ease both; }
      `}</style>

      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${i < step ? 'bg-green-500 text-white' :
                  i === step ? 'bg-orange-500 text-white shadow-lg' :
                    'bg-gray-100 text-gray-400'
                }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 transition-all ${i < step ? 'bg-green-300' : 'bg-gray-100'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center fu">
            <div className="text-6xl mb-5">🎉</div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">
              Bun venit{brandName ? `, ${brandName}` : ''}!
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Contul tău este activ. În 3 pași simpli ești gata să lansezi prima campanie cu influenceri.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-10">
              {[
                { icon: '💳', label: 'Adaugi credite', sub: 'în wallet' },
                { icon: '🎯', label: 'Creezi campania', sub: 'cu brief' },
                { icon: '💸', label: 'Plătești', sub: 'doar la rezultat' },
              ].map((item, i) => (
                <div key={i} className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-black text-sm text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
              Hai să începem <ArrowRight className="inline w-5 h-5 ml-1" />
            </button>
          </div>
        )}

        {/* Step 1: Wallet */}
        {step === 1 && (
          <div className="fu">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💳</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Adaugă credite în wallet</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Creditele sunt rezervate pentru plata influencerilor. Plătești <strong>0€</strong> acum dacă nu vrei — poți adăuga credite oricând înainte de a aproba o colaborare.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-black text-amber-800 text-sm mb-1">Cum funcționează plata</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Când aprobi un post de influencer, <strong>15%</strong> merge la AddFame și <strong>85%</strong> la influencer — automat, din creditele tale.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/brand/wallet"
                className="flex-1 py-3.5 rounded-2xl font-black text-white text-center transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                <DollarSign className="inline w-4 h-4 mr-1" /> Adaugă credite acum
              </Link>
              <button onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-2xl font-black text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Fac asta mai târziu
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Campaign */}
        {step === 2 && (
          <div className="fu">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Lansează prima campanie</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Creează un brief, setează bugetul și influencerii pot aplica imediat.
              </p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { icon: '📝', title: 'Descriere produs', desc: 'Ce vinzi și ce vrei să promovezi' },
                { icon: '💰', title: 'Buget campanie', desc: 'Cât ești dispus să plătești per influencer' },
                { icon: '📱', title: 'Platforme', desc: 'Instagram, TikTok, YouTube etc.' },
                { icon: '📅', title: 'Deadline', desc: 'Până când vrei postul live' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-black text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/brand/campaigns/new"
                className="flex-1 py-3.5 rounded-2xl font-black text-white text-center transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                <Plus className="inline w-4 h-4 mr-1" /> Creează campania
              </Link>
              <button onClick={() => setStep(3)}
                className="flex-1 py-3.5 rounded-2xl font-black text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Mai târziu
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="text-center fu">
            <div className="text-6xl mb-5">🎊</div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Ești gata!</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Contul tău de brand este configurat. Poți accesa toate funcțiile din dashboard.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { icon: BarChart3, label: 'Dashboard', href: '/brand/dashboard' },
                { icon: Zap, label: 'Campanii', href: '/brand/campaigns' },
                { icon: Users, label: 'Influenceri', href: '/brand/influencers' },
                { icon: DollarSign, label: 'Wallet', href: '/brand/wallet' },
              ].map((item, i) => (
                <Link key={i} href={item.href}
                  className="flex items-center gap-3 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-xl px-4 py-3 transition">
                  <item.icon className="w-5 h-5 text-orange-500" />
                  <span className="font-black text-sm text-gray-900">{item.label}</span>
                </Link>
              ))}
            </div>
            <button onClick={markOnboardingDone}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 8px 24px rgba(249,115,22,0.35)' }}>
              Mergi la Dashboard <ArrowRight className="inline w-5 h-5 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
