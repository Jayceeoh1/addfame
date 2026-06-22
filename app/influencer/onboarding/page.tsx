'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Instagram, Youtube, Wallet, User, CheckCircle, Zap, TrendingUp, Gift, Star } from 'lucide-react'
import Link from 'next/link'

export default function InfluencerOnboarding() {
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await createClient().from('influencers')
        .select('name, approval_status, onboarding_done')
        .eq('user_id', user.id).single()
      if (data?.name) setName(data.name)
      if (data?.onboarding_done) router.push('/influencer/dashboard')
    })
  }, [])

  async function markOnboardingDone() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) await sb.from('influencers').update({ onboarding_done: true }).eq('user_id', user.id)
    router.push('/influencer/dashboard')
  }

  const firstName = name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0f2fe 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .fu { animation:fadeUp .45s ease both; }
        .pop { animation:pop .5s ease both; }
        .float { animation:float 3s ease-in-out infinite; }
        .infl-grad { background:linear-gradient(135deg,#8b5cf6,#06b6d4); }
        .card { background:white;border-radius:24px;border:1.5px solid rgba(139,92,246,0.1);box-shadow:0 20px 60px rgba(139,92,246,0.1); }
        .step-btn { width:100%;padding:14px 20px;border-radius:16px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;transition:all .15s;border:none;display:flex;align-items:center;gap:12px;text-align:left; }
        .step-btn:hover { transform:translateY(-2px); }
      `}</style>

      {/* Logo */}
      <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)' }} className="flex items-center gap-2 fu">
        <div className="w-8 h-8 rounded-xl infl-grad flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(139,92,246,.35)' }}>
          <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
        </div>
        <span className="font-black text-gray-900">Add<span className="text-purple-500">Fame</span></span>
      </div>

      <div className="w-full max-w-lg">

        {/* ── STEP 0: Welcome ── */}
        {step === 0 && (
          <div className="text-center fu">
            {/* Emoji animat */}
            <div className="text-7xl mb-5 float" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}>🎉</div>

            <h1 className="text-3xl font-black text-gray-900 mb-3">
              {firstName ? `Bun venit, ${firstName}!` : 'Bun venit pe AddFame!'}
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed text-lg">
              Contul tău este <span className="font-black text-purple-600">activ</span> și ești gata să câștigi bani din conținut! 🚀
            </p>

            {/* Ce poți face */}
            <div className="card p-6 mb-6 text-left">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Ce poți face pe AddFame</p>
              <div className="space-y-3">
                {[
                  { icon: <Zap className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50', title: 'Aplici la campanii plătite', desc: 'Branduri reale caută creatori ca tine chiar acum' },
                  { icon: <Gift className="w-5 h-5 text-pink-500" />, bg: 'bg-pink-50', title: 'Primești produse gratuite', desc: 'Campanii barter — conținut în schimbul produselor' },
                  { icon: <TrendingUp className="w-5 h-5 text-green-500" />, bg: 'bg-green-50', title: 'Câștigi și retragi bani', desc: 'Wallet propriu — retragi oricând în contul tău bancar' },
                  { icon: <Star className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50', title: 'Badge Verified Creator', desc: 'Apari primul în fața brandurilor' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fafafa', border: '1.5px solid #f0f0f0' }}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${b.bg}`}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-800">{b.title}</p>
                      <p className="text-xs text-gray-400">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '👩‍🦱', '🧔'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <p className="text-sm text-gray-500 font-semibold"><span className="font-black text-purple-600">141 creatori</span> sunt deja pe platformă</p>
            </div>

            <button onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
              Hai să începem! <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── STEP 1: Completează profilul ── */}
        {step === 1 && (
          <div className="fu">
            {/* Progress */}
            <div className="flex items-center gap-2 mb-8 justify-center">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === 0 ? 'w-8 bg-purple-500' : i === 1 ? 'w-8 bg-purple-500' : 'w-8 bg-gray-200'}`} />
              ))}
              <span className="text-xs text-gray-400 font-bold ml-2">Pasul 1 din 2</span>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl mb-4">📱</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Completează-ți profilul</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Brandurile văd profilul tău înainte să te invite. Cu cât e mai complet, cu atât primești mai multe oferte!
              </p>
            </div>

            <div className="card p-6 mb-6">
              <div className="space-y-3">
                {[
                  {
                    icon: <Instagram className="w-5 h-5 text-pink-500" />,
                    bg: 'bg-pink-50',
                    title: 'Adaugă platformele sociale',
                    desc: 'Instagram, TikTok, YouTube cu nr. de followeri',
                    href: '/influencer/profile',
                    priority: true,
                  },
                  {
                    icon: <User className="w-5 h-5 text-purple-500" />,
                    bg: 'bg-purple-50',
                    title: 'Completează bio-ul',
                    desc: 'Descrie-te în câteva cuvinte pentru branduri',
                    href: '/influencer/profile',
                    priority: false,
                  },
                  {
                    icon: <Wallet className="w-5 h-5 text-green-500" />,
                    bg: 'bg-green-50',
                    title: 'Adaugă metoda de plată',
                    desc: 'IBAN, PayPal sau Revolut pentru retrageri',
                    href: '/influencer/wallet',
                    priority: false,
                  },
                ].map((item, i) => (
                  <Link key={i} href={item.href}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 hover:border-purple-300 hover:bg-purple-50 transition group"
                    style={{ borderColor: item.priority ? '#ddd6fe' : '#f0f0f0', background: item.priority ? '#faf5ff' : 'white' }}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-gray-900">{item.title}</p>
                        {item.priority && <span className="text-[10px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Important</span>}
                      </div>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/influencer/profile"
                className="flex-1 py-4 rounded-2xl font-black text-white text-center transition hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 6px 20px rgba(139,92,246,0.35)' }}>
                Completează acum <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => setStep(2)}
                className="flex-1 py-4 rounded-2xl font-black text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition text-sm">
                Mai târziu
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Gata! ── */}
        {step === 2 && (
          <div className="text-center fu">
            <div className="text-7xl mb-5 pop">🚀</div>

            <h2 className="text-3xl font-black text-gray-900 mb-3">Ești gata!</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Intră în dashboard, explorează campaniile disponibile și aplică la primele colaborări!
            </p>

            {/* Progress final */}
            <div className="flex items-center gap-2 mb-8 justify-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-1.5 w-8 rounded-full bg-purple-500 transition-all" />
              ))}
              <span className="text-xs text-purple-600 font-black ml-2">Gata! ✓</span>
            </div>

            <div className="card p-6 mb-6 text-left">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Primii tăi pași pe platformă</p>
              <div className="space-y-3">
                {[
                  { icon: '🔍', text: 'Explorează campaniile disponibile' },
                  { icon: '✍️', text: 'Aplică la campanii care ți se potrivesc' },
                  { icon: '💬', text: 'Comunică cu brandurile prin inbox' },
                  { icon: '💰', text: 'Livrează conținut și primești plata' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <span className="text-xl">{item.icon}</span>
                    <p className="font-bold text-sm text-gray-700">{item.text}</p>
                    <CheckCircle className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={markOnboardingDone}
              className="w-full py-4 rounded-2xl font-black text-white text-lg transition hover:-translate-y-1 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
              Intră în dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
