'use client'
// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, Briefcase, CheckCircle, Clock, Wallet,
  ArrowRight, Star, Bell, Zap, Target, AlertCircle,
  Upload, ChevronRight, Award, Calendar, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`
const fmtShort = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K RON` : `${(n || 0).toFixed(0)} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })

function daysUntil(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function profileCompletion(p: any) {
  if (!p) return { pct: 0, missing: [] }
  const checks = [
    { done: !!p.name, label: 'Nume complet' },
    { done: !!p.bio, label: 'Bio' },
    { done: !!p.avatar, label: 'Poză profil' },
    { done: p.niches?.length > 0, label: 'Nișe' },
    { done: Array.isArray(p.platforms) && p.platforms.length > 0, label: 'Platforme sociale' },
    { done: !!p.identity_verified, label: 'Verificare identitate' },
  ]
  return {
    pct: Math.round(checks.filter(c => c.done).length / checks.length * 100),
    missing: checks.filter(c => !c.done).map(c => c.label),
  }
}

function buildMonthlyEarnings(collabs: any[]) {
  const map: Record<string, number> = {}
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })
    map[key] = 0
    months.push(key)
  }
  ; (collabs || []).filter(c => c.status === 'COMPLETED').forEach((c: any) => {
    const d = new Date(c.completed_at || c.created_at)
    const key = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' })
    if (key in map) map[key] += c.payment_amount || c.reserved_amount || 0
  })
  return months.map(m => ({ luna: m, castigat: Math.round((map[m] || 0) * 100) / 100 }))
}

export default function InfluencerDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [thisMonthEarned, setThisMonthEarned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAll = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: inf } = await supabase.from('influencers').select('*').eq('user_id', user.id).single()
      if (!inf) return
      setProfile(inf)

      const [collabRes, txRes, campRes] = await Promise.all([
        supabase.from('collaborations')
          .select('*, campaigns(title, brand_name, budget, budget_per_influencer, deadline, platforms, niches)')
          .eq('influencer_id', inf.id)
          .order('created_at', { ascending: false }),
        supabase.from('transactions')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('campaigns')
          .select('id, title, brand_name, budget_per_influencer, deadline, platforms, niches')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false }).limit(4),
      ])

      setCollabs(collabRes.data ?? [])
      setTransactions(txRes.data ?? [])
      setCampaigns(campRes.data ?? [])

      // Notifications — optional, ignore if table doesn't exist
      try {
        const { data: notifs } = await supabase
          .from('notifications')
          .select('*').eq('user_id', user.id).eq('read', false)
          .order('created_at', { ascending: false }).limit(5)
        setNotifications(notifs ?? [])
      } catch (_) { setNotifications([]) }

      if (txRes.data) {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        setThisMonthEarned(
          txRes.data
            .filter((t: any) => t.type === 'EARN' && new Date(t.created_at) >= start)
            .reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
        )
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleInvite(collabId: string, action: 'accept' | 'decline') {
    setActionLoading(collabId)
    try {
      const supabase = createClient()
      const newStatus = action === 'accept' ? 'ACTIVE' : 'REJECTED'
      await supabase.from('collaborations').update({ status: newStatus }).eq('id', collabId)
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: newStatus } : c))
      showToast(action === 'accept' ? 'Invitație acceptată! 🎉' : 'Invitație refuzată.', action === 'accept' ? 'success' : 'error')
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setActionLoading(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  const walletBalance = profile?.wallet_balance || 0
  const totalEarned = profile?.total_earned || 0
  const activeCollabs = collabs.filter(c => c.status === 'ACTIVE')
  const pendingCollabs = collabs.filter(c => c.status === 'PENDING')
  const invitedCollabs = collabs.filter(c => c.status === 'INVITED')
  const completedCollabs = collabs.filter(c => c.status === 'COMPLETED')
  const needsDeliverable = activeCollabs.filter(c => !c.deliverable_submitted_at)
  const urgentCollabs = activeCollabs.filter(c => c.campaigns?.deadline && daysUntil(c.campaigns.deadline) <= 7)
  const successRate = collabs.length > 0 ? Math.round(completedCollabs.length / collabs.length * 100) : 0
  const monthlyData = buildMonthlyEarnings(collabs)
  const { pct: profilePct, missing: profileMissing } = profileCompletion(profile)

  const onboardingSteps = [
    { id: 'name', label: 'Completează profilul', desc: 'Nume, bio și poză', href: '/influencer/profile', done: !!(profile?.name && profile?.bio && profile?.avatar) },
    { id: 'social', label: 'Adaugă platformele sociale', desc: 'Instagram, TikTok etc.', href: '/influencer/profile', done: profile?.platforms?.length > 0 },
    { id: 'niches', label: 'Selectează nișele', desc: 'Fashion, Food, Tech etc.', href: '/influencer/profile', done: profile?.niches?.length > 0 },
    { id: 'verify', label: 'Verifică identitatea', desc: 'Necesar pentru a aplica', href: '/influencer/verify', done: !!profile?.identity_verified },
    { id: 'apply', label: 'Aplică la o campanie', desc: 'Prima colaborare', href: '/influencer/campaigns', done: collabs.length > 0 },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background: white; border: 1.5px solid #f0f0f0; border-radius: 20px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .3s ease both; }
        .row-hover:hover { background: #fafbff; border-radius: 12px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-lg"
          style={{ background: toast.type === 'success' ? '#10b981' : '#ef4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Bună, <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {profile?.name?.split(' ')[0]}
            </span> 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {needsDeliverable.length > 0
              ? `${needsDeliverable.length} colaborare(i) așteaptă deliverable-ul tău`
              : 'Totul e la zi ✓'}
          </p>
        </div>
        <Link href="/influencer/campaigns"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
          <Zap className="w-4 h-4" /> Campanii noi
        </Link>
      </div>

      {/* Onboarding */}
      {profilePct < 100 && (
        <OnboardingChecklist steps={onboardingSteps} className="mb-5" />
      )}

      {/* Notificări */}
      {notifications.length > 0 && (
        <div className="card p-4 mb-5 fade-up" style={{ animationDelay: '.03s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-purple-500" />
            <p className="text-sm font-black text-gray-900">Notificări ({notifications.length})</p>
          </div>
          <div className="space-y-1.5">
            {notifications.map(n => (
              <Link key={n.id} href={n.link || '#'}
                className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-purple-50 transition">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Urgent — deadline în mai puțin de 7 zile */}
      {urgentCollabs.length > 0 && (
        <div className="mb-5 px-4 py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 flex items-center justify-between fade-up">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-bold text-red-700">
              {urgentCollabs.length} colaborare(i) cu deadline în mai puțin de 7 zile!
            </p>
          </div>
          <Link href="/influencer/collaborations" className="text-xs font-black text-red-600 flex items-center gap-1">
            Vezi <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 fade-up" style={{ animationDelay: '.05s' }}>

        {/* Wallet card — golden */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
            border: '1px solid rgba(251,191,36,0.3)',
            boxShadow: '0 8px 24px rgba(251,191,36,0.12)',
          }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(251,191,36,0.07)' }} />
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4" style={{ color: 'rgba(251,191,36,0.8)' }} />
            <p className="text-xs font-bold" style={{ color: 'rgba(251,191,36,0.7)' }}>Sold disponibil</p>
          </div>
          <p className="text-2xl font-black mb-0.5" style={{ color: '#fbbf24' }}>{fmt(walletBalance)}</p>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Luna aceasta: {fmt(thisMonthEarned)}</p>
          <Link href="/influencer/wallet"
            className="text-xs font-black px-3 py-1.5 rounded-lg inline-block"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', color: '#1a1a2e' }}>
            Wallet →
          </Link>
        </div>

        {[
          { icon: Briefcase, label: 'Active', value: activeCollabs.length, sub: `${pendingCollabs.length} aplicate`, color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Upload, label: 'De livrat', value: needsDeliverable.length, sub: 'deliverable pending', color: needsDeliverable.length > 0 ? '#f97316' : '#10b981', bg: needsDeliverable.length > 0 ? '#fff7ed' : '#f0fdf4' },
          { icon: Target, label: 'Succes', value: `${successRate}%`, sub: `${completedCollabs.length} finalizate`, color: '#06b6d4', bg: '#ecfeff' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-5" style={{ transition: 'all .2s' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Progres profil */}
      {profilePct < 100 && (
        <div className="card p-4 mb-5 fade-up" style={{ animationDelay: '.07s' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-gray-800">Completare profil</p>
            <span className="text-sm font-black" style={{ color: profilePct >= 80 ? '#10b981' : '#f97316' }}>{profilePct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mb-2">
            <div className="h-full rounded-full transition-all" style={{
              width: `${profilePct}%`,
              background: profilePct >= 80 ? 'linear-gradient(90deg,#10b981,#06b6d4)' : 'linear-gradient(90deg,#f97316,#ec4899)'
            }} />
          </div>
          {profileMissing.length > 0 && (
            <p className="text-xs text-gray-400">Lipsește: {profileMissing.join(', ')}</p>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-5 mb-5">

        {/* Colaborări active — ce trebuie făcut */}
        <div className="card p-5 fade-up" style={{ animationDelay: '.08s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900">Colaborări active</h2>
            <Link href="/influencer/collaborations" className="text-xs font-black text-purple-500 flex items-center gap-1">
              Toate <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Invitații în așteptare */}
          {invitedCollabs.length > 0 && invitedCollabs.slice(0, 2).map(c => (
            <div key={c.id} className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2">
              <p className="text-xs font-black text-blue-700 mb-0.5">📩 Invitație nouă</p>
              <p className="text-sm font-bold text-gray-800">{c.campaigns?.title}</p>
              <p className="text-xs text-gray-400 mb-2">{c.campaigns?.brand_name}</p>
              <div className="flex gap-2">
                <button onClick={() => handleInvite(c.id, 'accept')} disabled={actionLoading === c.id}
                  className="flex-1 py-1.5 rounded-lg text-xs font-black text-white bg-blue-500 hover:bg-blue-600 transition">
                  {actionLoading === c.id ? '…' : '✓ Acceptă'}
                </button>
                <button onClick={() => handleInvite(c.id, 'decline')} disabled={actionLoading === c.id}
                  className="flex-1 py-1.5 rounded-lg text-xs font-black text-gray-500 border border-gray-200 hover:bg-gray-50 transition">
                  Refuză
                </button>
              </div>
            </div>
          ))}

          {/* Active cu deliverable */}
          {activeCollabs.length > 0 ? activeCollabs.slice(0, 3).map(c => {
            const days = c.campaigns?.deadline ? daysUntil(c.campaigns.deadline) : null
            const needsDeliv = !c.deliverable_submitted_at
            return (
              <div key={c.id} className="row-hover transition p-3 mb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.campaigns?.title}</p>
                    <p className="text-xs text-gray-400">{c.campaigns?.brand_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {days !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${days <= 3 ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                        {days > 0 ? `${days}z` : 'Expirat'}
                      </span>
                    )}
                    {needsDeliv && (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Upload
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          }) : (
            <div className="py-8 text-center text-gray-300">
              <Briefcase className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Nicio colaborare activă</p>
              <Link href="/influencer/campaigns" className="text-xs font-bold text-purple-400 hover:text-purple-600 mt-1 inline-block">
                Aplică la campanii →
              </Link>
            </div>
          )}
        </div>

        {/* Campanii recomandate */}
        <div className="card p-5 fade-up" style={{ animationDelay: '.09s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900">Campanii disponibile</h2>
            <Link href="/influencer/campaigns" className="text-xs font-black text-purple-500 flex items-center gap-1">
              Toate <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {campaigns.length > 0 ? campaigns.map(c => (
            <Link key={c.id} href="/influencer/campaigns"
              className="row-hover transition p-3 mb-1 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{c.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">{c.brand_name}</p>
                  {c.platforms?.slice(0, 2).map((p: string) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{p}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-green-600">{c.budget_per_influencer ? `\${c.budget_per_influencer} RON` : '—'}</p>
                <p className="text-xs text-gray-400">{c.deadline ? fmtDate(c.deadline) : ''}</p>
              </div>
            </Link>
          )) : (
            <div className="py-8 text-center text-gray-300">
              <Zap className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Nicio campanie activă acum</p>
            </div>
          )}
        </div>
      </div>

      {/* Earnings chart */}
      <div className="card p-5 mb-5 fade-up" style={{ animationDelay: '.1s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-gray-900">Câștiguri lunare</h2>
            <p className="text-xs text-gray-400">Ultimele 6 luni</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-purple-600">{fmtShort(totalEarned)}</p>
            <p className="text-xs text-gray-400">total câștigat</p>
          </div>
        </div>
        {monthlyData.some(d => d.castigat > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorEarn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="luna" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `\${v} RON`} />
              <Tooltip formatter={(v: any) => [`\${v} RON`, 'Câștigat']} contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="castigat" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorEarn)" dot={{ fill: '#8b5cf6', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex flex-col items-center justify-center text-gray-300">
            <BarChart3 className="w-10 h-10 mb-2" />
            <p className="text-sm">Finalizează colaborări pentru a vedea graficul</p>
          </div>
        )}
      </div>

      {/* Ultimele tranzacții */}
      {transactions.length > 0 && (
        <div className="card p-5 fade-up" style={{ animationDelay: '.11s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900">Ultimele tranzacții</h2>
            <Link href="/influencer/wallet" className="text-xs font-black text-purple-500 flex items-center gap-1">
              Wallet <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {transactions.map(tx => (
              <div key={tx.id} className="row-hover transition flex items-center justify-between p-2.5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.type === 'EARN' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'EARN'
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <ArrowRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{(tx.description || '').slice(0, 36)}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
                <span className={`text-sm font-black ${tx.type === 'EARN' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'EARN' ? '+' : '-'}{Math.abs(tx.amount || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
