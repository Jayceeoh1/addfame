'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { VerificationBanner } from '@/components/shared/verification-banner'
import {
  Zap, Users, TrendingUp, DollarSign, Plus, ArrowRight,
  Briefcase, Clock, AlertCircle, RefreshCw,
  ChevronRight, X, Coins, Sparkles, Search
} from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PAUSED: { label: 'Pausat', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  COMPLETED: { label: 'Finalizat', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  LIVE: { label: 'Live', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PENDING: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  REJECTED: { label: 'Respins', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
}

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function BrandDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [collabs, setCollabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: brand } = await sb.from('brands').select('*').eq('user_id', user.id).single()
      if (!brand) { router.replace('/auth/login'); return }
      setProfile(brand)

      const { data: camps } = await sb.from('campaigns').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false })
      setCampaigns(camps || [])

      const campIds = (camps || []).map((c: any) => c.id)
      if (campIds.length > 0) {
        const { data: colls } = await sb.from('collaborations').select('*, campaigns(title)').in('campaign_id', campIds).order('created_at', { ascending: false }).limit(8)
        if (colls && colls.length > 0) {
          const infIds = [...new Set(colls.map((c: any) => c.influencer_id).filter(Boolean))]
          const { data: infs } = await sb.from('influencers').select('id, name, avatar').in('id', infIds as string[])
          const infMap = Object.fromEntries((infs || []).map((i: any) => [i.id, i]))
          setCollabs(colls.map((c: any) => ({ ...c, influencer: infMap[c.influencer_id] || null })))
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  const activeCampaigns = campaigns.filter(c => ['ACTIVE', 'LIVE'].includes(c.status))
  const draftCampaigns = campaigns.filter(c => c.status === 'DRAFT')
  const pendingCollabs = collabs.filter(c => c.status === 'PENDING')
  const totalApplications = collabs.length
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0)
  const creditsBalance = profile?.credits_balance || 0
  const totalSpent = profile?.total_spent || 0

  // Featured: campania activă (sau prima dacă nu e niciuna)
  const featuredCampaign = activeCampaigns[0] || campaigns[0]
  const featuredStats = featuredCampaign ? {
    total: collabs.filter(c => c.campaign_id === featuredCampaign.id).length,
    accepted: collabs.filter(c => c.campaign_id === featuredCampaign.id && c.status === 'ACTIVE').length,
    pending: collabs.filter(c => c.campaign_id === featuredCampaign.id && c.status === 'PENDING').length,
  } : null

  const onboardingSteps = [
    { id: 'profile', label: 'Completează profilul brandului', desc: 'Adaugă logo, descriere și informații de contact', href: '/brand/settings', done: !!(profile?.logo || profile?.description) },
    { id: 'verify', label: 'Verifică-ți brandul', desc: 'Trimite verificarea pentru a debloca publicarea', href: '/brand/verify', done: profile?.verification_status === 'verified' },
    { id: 'campaign', label: 'Creează prima ta campanie', desc: 'Definește obiectivele, bugetul și livrabilele', href: '/brand/campaigns/new', done: campaigns.length > 0 },
    { id: 'publish', label: 'Publică o campanie', desc: 'Lansează pentru ca influencerii să poată aplica', href: '/brand/campaigns', done: activeCampaigns.length > 0 },
    { id: 'wallet', label: 'Adaugă credite în wallet', desc: 'Finanțează contul pentru a plăti colaboratorii', href: '/brand/wallet', done: (creditsBalance + totalSpent) > 0 },
  ]
  const onboardingDone = onboardingSteps.filter(s => s.done).length === onboardingSteps.length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
        .row-hover:hover { background:#fafbff; }
        .hero-bg { background: linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 50%, #4c1d3d 100%); }
        .glow-orb { position: absolute; top: -80px; right: -40px; width: 280px; height: 280px; background: radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%); border-radius: 50%; pointer-events: none; }
        .stat-mini { background:white;border:1.5px solid #f0f0f0;border-radius:16px;padding:16px 18px;transition:all .2s; }
        .stat-mini:hover { box-shadow:0 8px 24px rgba(0,0,0,0.05);transform:translateY(-1px); }
      `}</style>

      {/* ── TOP BAR ─────────────── */}
      <div className="flex items-center justify-between mb-5 fade-up flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Welcome back, <span style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile?.name}</span> 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Iată ce se întâmplă cu campaniile tale</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/brand/wallet" className="flex items-center gap-2 bg-white border-2 border-gray-100 hover:border-orange-200 transition pl-1.5 pr-3 py-1.5 rounded-full">
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="font-black text-sm text-gray-900">{fmt(creditsBalance)}</span>
            <span className="text-xs font-bold text-orange-500">+ Top-up</span>
          </Link>
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-orange-500 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSheet(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white brand-grad"
            style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* Draft warning */}
      {draftCampaigns.length > 0 && (
        <div className="mb-5 fade-up px-5 py-3.5 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-between" style={{ animationDelay: '.03s' }}>
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-700">{draftCampaigns.length} campaign{draftCampaigns.length > 1 ? 's' : ''} in draft — not visible to influencers</p>
          </div>
          <Link href="/brand/campaigns" className="text-xs font-black text-amber-600 hover:underline">Publish →</Link>
        </div>
      )}

      {/* Onboarding checklist */}
      {!onboardingDone && (
        <div className="fade-up" style={{ animationDelay: '.02s' }}>
          <OnboardingChecklist role="brand" steps={onboardingSteps} />
        </div>
      )}

      {/* Verification banner */}
      {profile && profile.verification_status !== 'verified' && (
        <div className="mb-5 fade-up" style={{ animationDelay: '.04s' }}>
          <VerificationBanner
            status={profile.verification_status || 'unverified'}
            rejectionReason={profile.verification_rejection_reason}
          />
        </div>
      )}

      {/* ── HERO ─────────────── */}
      {featuredCampaign ? (
        <div className="hero-bg rounded-3xl p-7 mb-5 text-white relative overflow-hidden fade-up" style={{ animationDelay: '.06s' }}>
          <div className="glow-orb" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider opacity-70 mb-2 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${featuredCampaign.status === 'ACTIVE' || featuredCampaign.status === 'LIVE' ? 'bg-green-400' : 'bg-amber-400'}`} />
                {featuredCampaign.status === 'ACTIVE' || featuredCampaign.status === 'LIVE' ? 'Campanie activă' : `Campanie ${STATUS_CFG[featuredCampaign.status]?.label || 'în lucru'}`}
              </p>
              <h2 className="text-2xl font-black mb-1.5 leading-tight">{featuredCampaign.title}</h2>
              <p className="text-sm opacity-70 mb-5">
                {featuredCampaign.platforms?.join(' · ')}
                {featuredCampaign.deadline && <> · Deadline {fmtDate(featuredCampaign.deadline)}</>}
              </p>
              {featuredStats && (
                <div className="flex gap-7 flex-wrap">
                  <div>
                    <p className="text-xl font-black">{featuredStats.total}</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Aplicații totale</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-300">{featuredStats.accepted}</p>
                    <p className="text-[11px] opacity-60 mt-0.5">Acceptate</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-amber-300">{featuredStats.pending}</p>
                    <p className="text-[11px] opacity-60 mt-0.5">În așteptare</p>
                  </div>
                  {featuredCampaign.max_influencers > 0 && (
                    <div>
                      <p className="text-xl font-black">{featuredStats.accepted} <span className="opacity-50">/ {featuredCampaign.max_influencers}</span></p>
                      <p className="text-[11px] opacity-60 mt-0.5">Slot-uri</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Link href={`/brand/campaigns/${featuredCampaign.id}`} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 transition px-5 py-3 rounded-xl font-black text-sm flex-shrink-0 self-end lg:self-center">
              Gestionează <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="hero-bg rounded-3xl p-10 mb-5 text-white relative overflow-hidden fade-up text-center" style={{ animationDelay: '.06s' }}>
          <div className="glow-orb" />
          <div className="relative">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-orange-300" />
            <h2 className="text-2xl font-black mb-2">Lansează prima ta campanie</h2>
            <p className="text-sm opacity-70 mb-5 max-w-md mx-auto">Conectează-te cu influenceri reali, pe barter. Setezi campania în sub 5 minute.</p>
            <button onClick={() => setShowSheet(true)} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 transition px-6 py-3 rounded-xl font-black text-sm">
              <Plus className="w-4 h-4" /> Creează campanie
            </button>
          </div>
        </div>
      )}

      {/* ── KPI mini cards ─────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Campanii active', value: activeCampaigns.length, icon: Zap, color: 'bg-orange-50 text-orange-500', href: '/brand/campaigns', trend: null as string | null },
          { label: 'În așteptare', value: pendingCollabs.length, icon: Clock, color: 'bg-amber-50 text-amber-500', href: '/brand/collaborations', trend: pendingCollabs.length > 0 ? `${pendingCollabs.length} noi` : null },
          { label: 'Total aplicații', value: totalApplications, icon: Users, color: 'bg-purple-50 text-purple-500', href: '/brand/collaborations', trend: null },
          { label: 'Total cheltuit', value: fmt(totalSpent), icon: TrendingUp, color: 'bg-green-50 text-green-500', href: '/brand/wallet', trend: null },
        ].map((s, i) => (
          <Link key={s.label} href={s.href} className="stat-mini fade-up block" style={{ animationDelay: `${0.08 + i * 0.04}s` }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              {s.trend && <span className="text-[10px] font-black bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{s.trend}</span>}
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
            <p className="text-[11px] font-bold text-gray-400 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Two-column section ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — Recent applications */}
        <div className="card overflow-hidden fade-up" style={{ animationDelay: '.32s' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
            <h2 className="font-black text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /> Aplicații recente</h2>
            <Link href="/brand/collaborations" className="text-xs font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1">Vezi toate <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          {collabs.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-400 text-sm">Nicio aplicație încă</p>
              <p className="text-xs text-gray-300 mt-1">Publică o campanie pentru a primi aplicații</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {collabs.slice(0, 5).map(c => {
                const cfg = STATUS_CFG[c.status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: c.status }
                return (
                  <Link key={c.id} href="/brand/collaborations" className="flex items-center gap-3 px-5 py-3 row-hover transition">
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {c.influencer?.avatar
                        ? <img src={c.influencer.avatar} className="w-full h-full object-cover" alt="" />
                        : <span className="font-black text-orange-500 text-sm">{c.influencer?.name?.[0]?.toUpperCase() || '?'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm truncate">{c.influencer?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 truncate">{c.campaigns?.title}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                      <span className={`w-1 h-1 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Quick actions + Summary stacked */}
        <div className="space-y-4">
          <div className="card p-5 fade-up" style={{ animationDelay: '.36s' }}>
            <h2 className="font-black text-gray-900 mb-3 text-sm">Acțiuni rapide</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSheet(true)}
                className="flex flex-col items-start gap-2 px-3 py-3 rounded-xl font-bold text-xs transition bg-orange-50 text-orange-600 hover:bg-orange-100 text-left"
              >
                <Plus className="w-4 h-4" /> Creează campanie
              </button>
              {[
                { label: 'Caută influenceri', href: '/brand/influencers', icon: Search, color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
                { label: 'Colaborări', href: '/brand/collaborations', icon: Briefcase, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
                { label: 'Top-up credite', href: '/brand/wallet', icon: DollarSign, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              ].map(a => (
                <Link key={a.href} href={a.href} className={`flex flex-col items-start gap-2 px-3 py-3 rounded-xl font-bold text-xs transition ${a.color}`}>
                  <a.icon className="w-4 h-4" /> {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5 fade-up" style={{ animationDelay: '.4s' }}>
            <h2 className="font-black text-gray-900 mb-3 text-sm">Rezumat campanii</h2>
            <div className="space-y-2">
              {[
                { label: 'Total campanii', value: campaigns.length, color: 'text-gray-700' },
                { label: 'Active / Live', value: activeCampaigns.length, color: 'text-green-600' },
                { label: 'Drafts', value: draftCampaigns.length, color: 'text-amber-600' },
                { label: 'Finalizate', value: campaigns.filter(c => c.status === 'COMPLETED').length, color: 'text-blue-600' },
                { label: 'Buget total', value: fmt(totalBudget), color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
                  <p className={`font-black text-xs ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent campaigns table ─────────────── */}
      {campaigns.length > 0 && (
        <div className="card overflow-hidden fade-up mt-4" style={{ animationDelay: '.44s' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
            <h2 className="font-black text-gray-900 flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-400" /> Campanii recente</h2>
            <Link href="/brand/campaigns" className="text-xs font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1">Vezi toate <ChevronRight className="w-3.5 h-3.5" /></Link>
          </div>
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
              <tr>
                {['Campanie', 'Buget', 'Deadline', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map(c => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                return (
                  <tr key={c.id} className="row-hover transition" style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td className="px-5 py-3.5">
                      <Link href={`/brand/campaigns/${c.id}`} className="font-black text-gray-900 hover:text-orange-500 transition">{c.title}</Link>
                      <p className="text-xs text-gray-400">{c.platforms?.join(', ')}</p>
                    </td>
                    <td className="px-5 py-3.5 font-black text-green-600">{fmt(c.budget)}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{fmtDate(c.deadline)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Campaign type bottom sheet ─────────────────────────────────────── */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl border-t border-gray-100 px-4 pt-4 pb-12"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Cum vrei să creezi campania?</p>
              <button onClick={() => setShowSheet(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Wizard — Rapid */}
            <button
              onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/wizard') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100 transition mb-3 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center flex-shrink-0 text-3xl group-hover:scale-105 transition">🚀</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-black text-gray-900 text-base">Rapid — Wizard</p>
                  <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">RECOMANDAT</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Pas cu pas, gata în 5 minute</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition flex-shrink-0" />
            </button>

            <p className="text-xs text-gray-400 text-center mb-3 font-medium">sau alege tipul manual</p>
            <div className="flex gap-3 mb-3">
              <button onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/barter') }}
                className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition text-left group">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-105 transition">🎁</div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-sm">Barter</p>
                  <p className="text-xs text-gray-500">Produs gratuit</p>
                </div>
              </button>
              <button onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new') }}
                className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition text-left group">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-xl group-hover:scale-105 transition">💰</div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 text-sm">Plătită</p>
                  <p className="text-xs text-gray-500">Cash per post</p>
                </div>
              </button>
            </div>

            {/* Paid Campaign — în curând */}
            <div className="relative w-full rounded-2xl overflow-hidden">
              <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 text-left opacity-60 pointer-events-none select-none" style={{ filter: 'blur(1.5px)' }}>
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-3xl">💰</div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-900 text-base">Paid Campaign</p>
                  <p className="text-sm text-gray-500 mt-0.5">Plătești influencerii per conținut livrat</p>
                  <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Buget per influencer</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/60">
                <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200">🚀 În curând</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
