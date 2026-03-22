'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import { VerificationBanner } from '@/components/shared/verification-banner'
import {
  Zap, Users, TrendingUp, DollarSign, Plus, ArrowRight,
  Briefcase, Clock, CheckCircle, AlertCircle, RefreshCw,
  BarChart3, Eye, ChevronRight, Star, X
} from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PAUSED: { label: 'Paused', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  COMPLETED: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  LIVE: { label: 'Live', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
}

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function BrandDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [collabs, setCollabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
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
        const { data: colls } = await sb.from('collaborations').select('*, campaigns(title)').in('campaign_id', campIds).order('created_at', { ascending: false }).limit(5)
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
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0)
  const creditsBalance = profile?.credits_balance || 0
  const totalSpent = profile?.total_spent || 0

  const onboardingSteps = [
    { id: 'profile', label: 'Complete your brand profile', desc: 'Add logo, description and contact info', href: '/brand/settings', done: !!(profile?.logo || profile?.description) },
    { id: 'verify', label: 'Verify your brand', desc: 'Submit verification to unlock publishing', href: '/brand/verify', done: profile?.verification_status === 'verified' },
    { id: 'campaign', label: 'Create your first campaign', desc: 'Define your goals, budget and deliverables', href: '/brand/campaigns/new', done: campaigns.length > 0 },
    { id: 'publish', label: 'Publish a campaign', desc: 'Go live so influencers can apply', href: '/brand/campaigns', done: activeCampaigns.length > 0 },
    { id: 'wallet', label: 'Add credits to your wallet', desc: 'Fund your account to pay collaborators', href: '/brand/wallet', done: (creditsBalance + totalSpent) > 0 },
  ]
  const onboardingDone = onboardingSteps.filter(s => s.done).length === onboardingSteps.length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .stat-card { background:white;border:1.5px solid #f0f0f0;border-radius:20px;padding:22px;transition:all .2s; }
        .stat-card:hover { box-shadow:0 8px 24px rgba(0,0,0,0.06);transform:translateY(-2px); }
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
        .row-hover:hover { background:#fafbff; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-7 fade-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Welcome back, <span style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{profile?.name}</span> 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Here's what's happening with your campaigns</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Campaigns', value: activeCampaigns.length, icon: Zap, bg: 'bg-orange-50', ic: 'text-orange-500', val: 'text-orange-600', href: '/brand/campaigns' },
          { label: 'Pending Applications', value: pendingCollabs.length, icon: Clock, bg: 'bg-amber-50', ic: 'text-amber-500', val: 'text-amber-600', href: '/brand/collaborations' },
          { label: 'Credits Balance', value: fmt(creditsBalance), icon: DollarSign, bg: 'bg-green-50', ic: 'text-green-500', val: 'text-green-600', href: '/brand/wallet' },
          { label: 'Total Spent', value: fmt(totalSpent), icon: TrendingUp, bg: 'bg-blue-50', ic: 'text-blue-500', val: 'text-blue-600', href: '/brand/wallet' },
        ].map((s, i) => (
          <Link key={s.label} href={s.href} className="stat-card fade-up block" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.ic}`} />
            </div>
            <p className={`text-2xl font-black ${s.val}`}>{s.value}</p>
            <p className="text-xs font-bold text-gray-400 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Campaigns list */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card overflow-hidden fade-up" style={{ animationDelay: '.28s' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
              <h2 className="font-black text-gray-900 flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-400" /> Recent Campaigns</h2>
              <Link href="/brand/campaigns" className="text-xs font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-14">
                <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-400 mb-4">No campaigns yet</p>
                <button
                  onClick={() => setShowSheet(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white brand-grad"
                >
                  <Plus className="w-4 h-4" /> Create First Campaign
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead style={{ borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
                  <tr>
                    {['Campaign', 'Budget', 'Deadline', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 6).map(c => {
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
            )}
          </div>

          {/* Recent applications */}
          <div className="card overflow-hidden fade-up" style={{ animationDelay: '.34s' }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
              <h2 className="font-black text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" /> Recent Applications</h2>
              <Link href="/brand/collaborations" className="text-xs font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></Link>
            </div>
            {collabs.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-400 text-sm">No applications yet</p>
                <p className="text-xs text-gray-300 mt-1">Publish a campaign to start receiving applications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {collabs.map(c => {
                  const cfg = STATUS_CFG[c.status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: c.status }
                  return (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3.5 row-hover transition">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {c.influencer?.avatar
                            ? <img src={c.influencer.avatar} className="w-full h-full object-cover" />
                            : <span className="font-black text-orange-500 text-sm">{c.influencer?.name?.[0]?.toUpperCase() || '?'}</span>
                          }
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{c.influencer?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{c.campaigns?.title}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="card p-5 fade-up" style={{ animationDelay: '.32s' }}>
            <h2 className="font-black text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => setShowSheet(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition bg-orange-50 text-orange-600 hover:bg-orange-100"
              >
                <Plus className="w-4 h-4" /> Create Campaign
              </button>
              {[
                { label: 'Find Influencers', href: '/brand/influencers', icon: Users, color: 'bg-pink-50 text-pink-600 hover:bg-pink-100' },
                { label: 'View Collaborations', href: '/brand/collaborations', icon: Briefcase, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
                { label: 'Top Up Credits', href: '/brand/wallet', icon: DollarSign, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
              ].map(a => (
                <Link key={a.href} href={a.href} className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition ${a.color}`}>
                  <a.icon className="w-4 h-4" /> {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats summary */}
          <div className="card p-5 fade-up" style={{ animationDelay: '.38s' }}>
            <h2 className="font-black text-gray-900 mb-4">Campaign Summary</h2>
            <div className="space-y-3">
              {[
                { label: 'Total campaigns', value: campaigns.length, color: 'text-gray-700' },
                { label: 'Active / Live', value: activeCampaigns.length, color: 'text-green-600' },
                { label: 'Drafts', value: draftCampaigns.length, color: 'text-amber-600' },
                { label: 'Completed', value: campaigns.filter(c => c.status === 'COMPLETED').length, color: 'text-blue-600' },
                { label: 'Total budget', value: fmt(totalBudget), color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <p className="text-sm text-gray-500 font-semibold">{s.label}</p>
                  <p className={`font-black text-sm ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Alege tipul campaniei</p>
              <button onClick={() => setShowSheet(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Free Offer */}
            <button
              onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/barter') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition mb-3 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 text-3xl group-hover:scale-105 transition">
                🎁
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-base">Free Offer</p>
                <p className="text-sm text-gray-500 mt-0.5">Produs sau serviciu gratuit în schimbul postărilor</p>
                <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Fără cost monetar</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition flex-shrink-0" />
            </button>

            {/* Paid Campaign */}
            <button
              onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-3xl group-hover:scale-105 transition">
                💰
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-base">Paid Campaign</p>
                <p className="text-sm text-gray-500 mt-0.5">Plătești influencerii per conținut livrat</p>
                <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Buget per influencer</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-400 transition flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
