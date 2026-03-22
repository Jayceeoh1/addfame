'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Clock, XCircle, LogOut, RefreshCw } from 'lucide-react'

export default function InfluencerPendingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      const { data } = await sb.from('influencers').select('*').eq('user_id', user.id).single()
      if (!data) { router.replace('/auth/login'); return }
      if (data.approval_status === 'approved') { router.replace('/influencer/dashboard'); return }
      setProfile(data)
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .5s ease both; }
        .infl-grad { background:linear-gradient(135deg,#8b5cf6,#06b6d4); }
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:.5} 70%{transform:scale(1.5);opacity:0} 100%{transform:scale(1.5);opacity:0} }
        .pulse::before { content:'';position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(139,92,246,.4);animation:pulse-ring 2.5s ease-out infinite; }
      `}</style>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8 fade-up">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm infl-grad" style={{ boxShadow: '0 4px 12px rgba(139,92,246,.35)' }}><img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} /></div>
          <span className="font-black text-gray-900 text-lg">AddFame</span>
        </div>

        <div className="bg-white rounded-3xl p-8 text-center fade-up" style={{ border: '1.5px solid #f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.06)', animationDelay: '.06s' }}>

          {status === 'pending' && (
            <>
              <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="pulse relative w-20 h-20 rounded-full flex items-center justify-center bg-purple-50">
                  <Clock className="w-9 h-9 text-purple-500" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Profile under review</h1>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Our team is reviewing your application — usually <span className="font-bold text-gray-600">24–48 hours</span>. You'll get access once approved.
              </p>

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
                      <p className="text-xs text-gray-400">{profile.country || profile.email}</p>
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

              <div className="grid grid-cols-3 gap-3 mb-6 text-xs">
                {[
                  { icon: '🔍', label: 'Review', desc: 'Profile checked' },
                  { icon: '✅', label: 'Approved', desc: 'Access granted' },
                  { icon: '🚀', label: 'Go live', desc: 'Apply & earn' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                    <span className="text-lg">{s.icon}</span>
                    <p className="font-black text-gray-700 mt-1">{s.label}</p>
                    <p className="text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <button onClick={checkStatus} disabled={checking}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white infl-grad disabled:opacity-60 transition"
                  style={{ boxShadow: '0 4px 14px rgba(139,92,246,.3)' }}>
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                  {checking ? 'Checking…' : 'Check status'}
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 transition">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </>
          )}

          {status === 'rejected' && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle className="w-9 h-9 text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Application not approved</h1>
              <p className="text-gray-400 text-sm mb-4">Your profile didn't meet our requirements at this time.</p>
              {profile?.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-xs font-black text-red-700 mb-1">Reason:</p>
                  <p className="text-sm text-red-600">{profile.rejection_reason}</p>
                </div>
              )}
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white bg-gray-800 hover:bg-gray-900 transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
