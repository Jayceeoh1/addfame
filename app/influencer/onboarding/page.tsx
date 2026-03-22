'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'

export default function InfluencerOnboarding() {
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await createClient().from('influencers').select('name, approval_status').eq('user_id', user.id).single()
      if (data?.name) setName(data.name)
      if (data?.approval_status === 'approved') router.push('/influencer/dashboard')
    })
  }, [])

  async function markOnboardingDone() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) await sb.from('influencers').update({ onboarding_done: true }).eq('user_id', user.id)
    router.push('/influencer/pending')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .4s ease both; }
      `}</style>

      <div className="w-full max-w-lg">
        {step === 0 && (
          <div className="text-center fu">
            <div className="text-6xl mb-5">🎉</div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">
              Bun venit{name ? `, ${name}` : ''}!
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Profilul tău a fost creat. Urmează câțiva pași simpli pentru a fi gata să câștigi bani din conținut.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-left">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-amber-800 mb-1">Aprobare în curs</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Echipa AddFame îți verifică profilul. Durează de obicei <strong>24-48 ore</strong>. Vei primi un email când ești aprobat.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8 text-left">
              {[
                { icon: '✅', title: 'Profil creat', desc: 'Informații de bază salvate', done: true },
                { icon: '⏳', title: 'Aprobare echipă', desc: 'Verificăm profilul tău', done: false, active: true },
                { icon: '📱', title: 'Completează profilul', desc: 'Adaugă platformele sociale + rate', done: false },
                { icon: '💸', title: 'Aplică la campanii', desc: 'Câștigă bani din conținut', done: false },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${item.done ? 'bg-green-50 border-green-200' :
                    item.active ? 'bg-amber-50 border-amber-200' :
                      'bg-gray-50 border-gray-100'
                  }`}>
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${item.done ? 'text-green-800' : item.active ? 'text-amber-800' : 'text-gray-400'}`}>{item.title}</p>
                    <p className={`text-xs ${item.done ? 'text-green-600' : item.active ? 'text-amber-600' : 'text-gray-300'}`}>{item.desc}</p>
                  </div>
                  {item.done && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
              ))}
            </div>

            <button onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 8px 24px rgba(139,92,246,0.35)' }}>
              Continuă <ArrowRight className="inline w-5 h-5 ml-1" />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="fu">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">📱</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Completează-ți profilul</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Un profil complet îți mărește șansele de a fi invitat la campanii premium.
              </p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { icon: '📷', title: 'Adaugă platformele sociale', desc: 'Instagram, TikTok, YouTube — cu numărul de followeri', href: '/influencer/profile' },
                { icon: '💰', title: 'Setează rate-ul per campanie', desc: 'Cât ceri per colaborare', href: '/influencer/profile' },
                { icon: '🏦', title: 'Adaugă metodă de plată', desc: 'IBAN, PayPal, Revolut — pentru retrageri', href: '/influencer/wallet' },
              ].map((item, i) => (
                <Link key={i} href={item.href}
                  className="flex items-center gap-3 bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 rounded-xl px-4 py-3 transition group">
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="font-black text-sm text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition" />
                </Link>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/influencer/profile"
                className="flex-1 py-3.5 rounded-2xl font-black text-white text-center transition hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                Completează profilul
              </Link>
              <button onClick={markOnboardingDone}
                className="flex-1 py-3.5 rounded-2xl font-black text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Mai târziu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
