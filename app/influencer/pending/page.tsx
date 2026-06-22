'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Clock, XCircle, LogOut, RefreshCw, Star, Zap, TrendingUp, Users, CheckCircle, Instagram, Gift } from 'lucide-react'

export default function InfluencerPendingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [checking, setChecking] = useState(false)
  const [waitMinutes, setWaitMinutes] = useState(0)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      const { data } = await sb.from('influencers').select('*').eq('user_id', user.id).single()
      if (!data) { router.replace('/auth/login'); return }
      if (data.approval_status === 'approved') { router.replace('/influencer/dashboard'); return }
      setProfile(data)

      // Calculează cât timp a trecut de la înregistrare
      if (data.created_at) {
        const mins = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 60000)
        setWaitMinutes(mins)
      }
    }
    load()
  }, [router])

  async function checkStatus() {
    setChecking(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data } = await sb.from('influencers').select('approval_status').eq('user_id', user.id).single()
    if (data?.approval_status === 'approved') router.replace('/influencer/dashboard')
    setChecking(false)
  }

  async function handleLogout() { await logout(); router.replace('/auth/login') }

  const status = profile?.approval_status || 'pending'

  const waitText = waitMinutes < 60
    ? `${waitMinutes} minute`
    : waitMinutes < 1440
    ? `${Math.floor(waitMinutes / 60)} ore`
    : `${Math.floor(waitMinutes / 1440)} zile`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #e0f2fe 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.6} 70%{transform:scale(1.6);opacity:0} 100%{transform:scale(1.6);opacity:0} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .fade-up { animation:fadeUp .5s ease both; }
        .float { animation:float 3s ease-in-out infinite; }
        .infl-grad { background:linear-gradient(135deg,#8b5cf6,#06b6d4); }
        .pulse-ring::before { content:'';position:absolute;inset:-12px;border-radius:50%;border:2px solid rgba(139,92,246,.35);animation:pulse-ring 2.5s ease-out infinite; }
        .shimmer { background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:shimmer 1.5s infinite; }
        .card { background:white;border-radius:24px;border:1.5px solid rgba(139,92,246,0.1);box-shadow:0 20px 60px rgba(139,92,246,0.1); }
        .benefit-card { background:linear-gradient(135deg,#faf5ff,#f0f9ff);border:1.5px solid rgba(139,92,246,0.15);border-radius:16px;padding:16px; }
      `}</style>

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8 fade-up">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm infl-grad" style={{ boxShadow: '0 4px 12px rgba(139,92,246,.35)' }}>
          <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
        </div>
        <span className="font-black text-gray-900 text-lg">Add<span className="text-purple-500">Fame</span></span>
      </div>

      <div className="w-full max-w-md">

        {status === 'pending' && (
          <>
            {/* Card principal */}
            <div className="card p-8 text-center mb-4 fade-up" style={{ animationDelay: '.06s' }}>

              {/* Icon animat */}
              <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center float">
                <div className="pulse-ring relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.15))' }}>
                  <div className="w-16 h-16 rounded-full infl-grad flex items-center justify-center" style={{ boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">
                {profile?.name ? `${profile.name.split(' ')[0]}, ești aproape!` : 'Ești aproape!'}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-1">
                Profilul tău este în curs de verificare de echipa AddFame.
              </p>
              <p className="text-purple-600 font-black text-sm mb-6">
                ⚡ De obicei aprobăm în mai puțin de 24 de ore!
              </p>

              {/* Timer */}
              {waitMinutes > 0 && (
                <div className="bg-purple-50 rounded-2xl px-4 py-3 mb-6 inline-flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-600 font-bold">Ai așteptat {waitText} — suntem pe faz!</span>
                </div>
              )}

              {/* Profil mini */}
              {profile && (
                <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 infl-grad flex items-center justify-center">
                      {profile.avatar
                        ? <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                        : <span className="font-black text-white">{profile.name?.[0]?.toUpperCase()}</span>}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-sm">{profile.name}</p>
                      <p className="text-xs text-gray-400">{profile.city || profile.country || 'România'}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="text-xs font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">⏳ În verificare</span>
                    </div>
                  </div>
                  {profile.niches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.niches.slice(0, 4).map((n: string) => (
                        <span key={n} className="text-xs font-bold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">{n}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Pași */}
              <div className="flex items-center gap-2 mb-6">
                {[
                  { label: 'Înregistrat', done: true },
                  { label: 'În verificare', active: true },
                  { label: 'Aprobat 🚀', done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex-1 text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 text-xs font-black ${step.done ? 'bg-green-500 text-white' : step.active ? 'infl-grad text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {step.done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <p className={`text-[10px] font-black ${step.active ? 'text-purple-600' : step.done ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                    {i < 2 && <div className={`h-0.5 flex-1 mx-1 rounded ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>

              {/* Butoane */}
              <div className="space-y-2.5">
                <button onClick={checkStatus} disabled={checking}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white infl-grad disabled:opacity-60 transition"
                  style={{ boxShadow: '0 4px 14px rgba(139,92,246,.3)' }}>
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Verificare…' : 'Verifică statusul'}
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 transition">
                  <LogOut className="w-4 h-4" /> Ieși din cont
                </button>
              </div>
            </div>

            {/* Card beneficii — ce te așteaptă după aprobare */}
            <div className="card p-6 fade-up" style={{ animationDelay: '.15s' }}>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Ce te așteaptă după aprobare 🎉</p>
              <div className="space-y-3">
                {[
                  { icon: <Zap className="w-4 h-4 text-yellow-500" />, bg: 'bg-yellow-50', title: 'Campanii plătite', desc: 'Aplici la campanii de la branduri reale și câștigi bani' },
                  { icon: <TrendingUp className="w-4 h-4 text-green-500" />, bg: 'bg-green-50', title: 'Wallet propriu', desc: 'Încasezi direct în platformă și retragi oricând' },
                  { icon: <Star className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50', title: 'Badge Verified Creator', desc: 'Devii prioritar în fața brandurilor față de ceilalți' },
                  { icon: <Users className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50', title: 'Comunitate de 141+ creatori', desc: 'Faci parte din cea mai mare comunitate de influenceri din România' },
                  { icon: <Gift className="w-4 h-4 text-pink-500" />, bg: 'bg-pink-50', title: 'Campanii barter', desc: 'Primești produse gratuite în schimbul conținutului tău' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fafafa', border: '1.5px solid #f0f0f0' }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${b.bg}`}>
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-800">{b.title}</p>
                      <p className="text-xs text-gray-400">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof */}
            <p className="text-center text-xs text-gray-400 font-semibold mt-4 fade-up" style={{ animationDelay: '.2s' }}>
              🇷🇴 Alături de tine, 141 de creatori români au ales AddFame
            </p>
          </>
        )}

        {status === 'rejected' && (
          <div className="card p-8 text-center fade-up">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-9 h-9 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Cerere neaprobată</h1>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Din păcate profilul tău nu îndeplinește cerințele noastre momentan. Îți mulțumim că ai încercat!
            </p>
            {profile?.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs font-black text-red-700 mb-1">Motiv:</p>
                <p className="text-sm text-red-600">{profile.rejection_reason}</p>
              </div>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white bg-gray-800 hover:bg-gray-900 transition">
              <LogOut className="w-4 h-4" /> Ieși din cont
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
