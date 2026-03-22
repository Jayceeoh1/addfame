'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Download, TrendingUp, Users, CheckCircle,
  DollarSign, Star, Clock, Instagram, Youtube, Award,
  Target, Zap, BarChart2, FileText
} from 'lucide-react'
import Link from 'next/link'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  tiktok: <TikTokIcon className="w-4 h-4 text-gray-800" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
}

const fmt = (n: number) => `€${(n || 0).toLocaleString('en', { minimumFractionDigits: 0 })}`
const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function CampaignReportPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<any>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }

    const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
    if (!brand) return

    const [campRes, collabRes] = await Promise.all([
      sb.from('campaigns').select('*').eq('id', campaignId).eq('brand_id', brand.id).single(),
      sb.from('collaborations')
        .select(`*, influencers(id, name, avatar, niches, platforms, avg_rating, review_count)`)
        .eq('campaign_id', campaignId),
    ])

    if (!campRes.data) { router.replace('/brand/campaigns'); return }
    setCampaign(campRes.data)

    const rows = collabRes.data ?? []
    setCollabs(rows)

    // Load reviews for completed collabs
    const completedIds = rows.filter(c => c.status === 'COMPLETED').map(c => c.id)
    if (completedIds.length > 0) {
      const { data: revData } = await sb.from('reviews').select('*').in('collaboration_id', completedIds)
      setReviews(revData ?? [])
    }

    setLoading(false)
  }, [campaignId, router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )
  if (!campaign) return null

  /* ── Computed stats ── */
  const total = collabs.length
  const active = collabs.filter(c => c.status === 'ACTIVE').length
  const completed = collabs.filter(c => c.status === 'COMPLETED').length
  const pending = collabs.filter(c => c.status === 'PENDING').length
  const rejected = collabs.filter(c => c.status === 'REJECTED').length
  const invited = collabs.filter(c => c.status === 'INVITED').length
  const totalSpent = collabs.reduce((s, c) => s + (c.payment_amount || 0), 0)
  const convRate = total > 0 ? Math.round(((active + completed) / total) * 100) : 0
  const delivSubmit = collabs.filter(c => c.deliverable_url).length
  const completedCollabs = collabs.filter(c => c.status === 'COMPLETED')

  // Estimated total reach from influencer platforms
  const totalFollowers = collabs
    .filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status))
    .reduce((sum, c) => {
      const platforms: any[] = c.influencers?.platforms ?? []
      return sum + platforms.reduce((ps: number, p: any) => {
        const f = parseInt((p.followers || '0').replace(/[^0-9]/g, '')) || 0
        return ps + f
      }, 0)
    }, 0)

  // Platform distribution among active/completed
  const platformDist: Record<string, number> = {}
  collabs.filter(c => ['ACTIVE', 'COMPLETED', 'INVITED'].includes(c.status)).forEach(c => {
    (c.influencers?.platforms ?? []).forEach((p: any) => {
      const key = p.platform?.toLowerCase() || 'other'
      platformDist[key] = (platformDist[key] || 0) + 1
    })
  })

  // Niche distribution
  const nicheDist: Record<string, number> = {}
  collabs.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status)).forEach(c => {
    (c.influencers?.niches ?? []).forEach((n: string) => {
      nicheDist[n] = (nicheDist[n] || 0) + 1
    })
  })
  const topNiches = Object.entries(nicheDist).sort(([, a], [, b]) => b - a).slice(0, 5)

  // Average review rating from influencers
  const brandReviews = reviews.filter(r => r.reviewer_role === 'influencer')
  const avgBrandRating = brandReviews.length > 0
    ? brandReviews.reduce((s, r) => s + r.rating, 0) / brandReviews.length
    : 0

  // Cost per completed collab
  const costPerComplete = completed > 0 && totalSpent > 0 ? totalSpent / completed : 0

  // Timeline — days since campaign started
  const startDate = new Date(campaign.created_at)
  const endDate = campaign.deadline ? new Date(campaign.deadline) : null
  const duration = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 864e5) : null
  const elapsed = Math.ceil((Date.now() - startDate.getTime()) / 864e5)

  function downloadCSV() {
    const headers = ['Influencer', 'Status', 'Platforms', 'Followers', 'Deliverable URL', 'Payment', 'Submitted At']
    const rows = collabs.map(c => [
      c.influencers?.name ?? 'Unknown',
      c.status,
      (c.influencers?.platforms ?? []).map((p: any) => p.platform).join(';'),
      (c.influencers?.platforms ?? []).reduce((s: number, p: any) => s + (parseInt((p.followers || '0').replace(/\D/g, '')) || 0), 0),
      c.deliverable_url ?? '',
      c.payment_amount ?? 0,
      c.deliverable_submitted_at ? fmtDate(c.deliverable_submitted_at) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${campaign.title.replace(/\s+/g, '-')}-report.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@1&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .4s ease both; }
        .stat-card { background:white;border:1.5px solid #f0f0f0;border-radius:16px;padding:20px; }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-7 fu">
        <div className="flex items-start gap-4">
          <Link href={`/brand/campaigns/${campaignId}`}
            className="w-10 h-10 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center hover:border-orange-200 transition flex-shrink-0 mt-0.5">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 brand-grad rounded-xl flex items-center justify-center" style={{ boxShadow: '0 3px 10px rgba(249,115,22,.3)' }}>
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black text-orange-500 uppercase tracking-wider">Performance Report</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">{campaign.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Started {fmtDate(campaign.created_at)}
              {endDate && ` · Deadline ${fmtDate(campaign.deadline)}`}
              {elapsed > 0 && ` · Day ${elapsed}`}
            </p>
          </div>
        </div>
        <button onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white brand-grad hover:opacity-90 transition"
          style={{ boxShadow: '0 3px 12px rgba(249,115,22,.3)' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fu" style={{ animationDelay: '.06s' }}>
        {[
          { icon: <Users className="w-5 h-5 text-purple-500" />, label: 'Total Reach', value: totalFollowers > 0 ? fmtNum(totalFollowers) : '—', sub: 'est. followers', bg: 'bg-purple-50', border: 'border-purple-100' },
          { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Completed', value: completed, sub: `of ${total} collabs`, bg: 'bg-green-50', border: 'border-green-100' },
          { icon: <DollarSign className="w-5 h-5 text-orange-500" />, label: 'Total Spent', value: fmt(totalSpent), sub: 'campaign budget', bg: 'bg-orange-50', border: 'border-orange-100' },
          { icon: <TrendingUp className="w-5 h-5 text-blue-500" />, label: 'Conv. Rate', value: `${convRate}%`, sub: 'applications → active', bg: 'bg-blue-50', border: 'border-blue-100' },
        ].map(k => (
          <div key={k.label} className={`stat-card border-2 ${k.border}`}>
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>{k.icon}</div>
            <p className="text-2xl font-black text-gray-900">{k.value}</p>
            <p className="text-xs font-bold text-gray-400 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">

        {/* Application funnel */}
        <div className="card p-5 lg:col-span-2 fu" style={{ animationDelay: '.1s' }}>
          <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" /> Application Funnel
          </h2>
          <p className="text-xs text-gray-400 mb-5">{total} total applications received</p>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400">No applications yet</p>
              <p className="text-xs text-gray-300 mt-1">Publish the campaign so influencers can apply</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Applied', count: pending, color: 'from-amber-400 to-amber-300', text: 'text-amber-700', icon: '📥' },
                { label: 'Invited', count: invited, color: 'from-blue-400 to-blue-300', text: 'text-blue-700', icon: '✉️' },
                { label: 'Active', count: active, color: 'from-purple-500 to-purple-400', text: 'text-purple-700', icon: '⚡' },
                { label: 'Completed', count: completed, color: 'from-green-500 to-green-400', text: 'text-green-700', icon: '✅' },
                { label: 'Declined', count: rejected, color: 'from-gray-300 to-gray-200', text: 'text-gray-500', icon: '❌' },
              ].filter(r => r.count > 0).map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-base w-6 flex-shrink-0">{row.icon}</span>
                  <span className={`text-sm font-black w-20 flex-shrink-0 ${row.text}`}>{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`bg-gradient-to-r ${row.color} h-3 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(4, Math.round((row.count / total) * 100))}%` }} />
                  </div>
                  <span className="text-sm font-black text-gray-700 w-8 text-right">{row.count}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{Math.round((row.count / total) * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Deliverables progress */}
          {(active + completed) > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Deliverables Progress</p>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f97316" strokeWidth="3"
                      strokeDasharray={`${(active + completed) > 0 ? Math.round((delivSubmit / (active + completed)) * 100) : 0} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-gray-800">
                      {(active + completed) > 0 ? Math.round((delivSubmit / (active + completed)) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{delivSubmit} <span className="text-sm font-bold text-gray-400">/ {active + completed}</span></p>
                  <p className="text-xs font-bold text-gray-400">deliverables submitted</p>
                  {completedCollabs.length > 0 && <p className="text-xs text-green-600 font-bold mt-1">✅ {completedCollabs.length} approved by you</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar stats */}
        <div className="space-y-4 fu" style={{ animationDelay: '.12s' }}>

          {/* Cost breakdown */}
          <div className="card p-5">
            <h3 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-400" /> Budget Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">Campaign budget</span>
                <span className="font-black text-gray-800">{fmt(campaign.budget || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-bold">Total paid out</span>
                <span className="font-black text-orange-600">{fmt(totalSpent)}</span>
              </div>
              {costPerComplete > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-bold">Cost per completed</span>
                  <span className="font-black text-purple-600">{fmt(costPerComplete)}</span>
                </div>
              )}
              {(campaign.budget || 0) > 0 && (
                <div className="mt-2">
                  <div className="bg-gray-100 rounded-full h-2">
                    <div className="bg-gradient-to-r from-orange-400 to-pink-400 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((totalSpent / (campaign.budget || 1)) * 100))}%` }} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">{Math.min(100, Math.round((totalSpent / (campaign.budget || 1)) * 100))}% of budget used</p>
                </div>
              )}
            </div>
          </div>

          {/* Brand rating from influencers */}
          {avgBrandRating > 0 && (
            <div className="card p-5">
              <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Brand Rating
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-amber-500">{avgBrandRating.toFixed(1)}</p>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgBrandRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{brandReviews.length} review{brandReviews.length !== 1 ? 's' : ''} from influencers</p>
                </div>
              </div>
            </div>
          )}

          {/* Platform dist */}
          {Object.keys(platformDist).length > 0 && (
            <div className="card p-5">
              <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" /> Platforms
              </h3>
              <div className="space-y-2">
                {Object.entries(platformDist).sort(([, a], [, b]) => b - a).map(([plat, count]) => (
                  <div key={plat} className="flex items-center gap-2">
                    {PLATFORM_ICON[plat] ?? <Zap className="w-4 h-4 text-gray-300" />}
                    <span className="text-sm font-bold text-gray-600 capitalize flex-1">{plat}</span>
                    <span className="text-sm font-black text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top niches */}
      {topNiches.length > 0 && (
        <div className="card p-5 mb-5 fu" style={{ animationDelay: '.14s' }}>
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-400" /> Top Niches Reached
          </h2>
          <div className="flex flex-wrap gap-2">
            {topNiches.map(([niche, count]) => (
              <div key={niche} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full">
                <span className="text-sm font-black text-orange-700">{niche}</span>
                <span className="text-xs font-bold text-orange-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Influencer breakdown table */}
      <div className="card overflow-hidden fu" style={{ animationDelay: '.16s' }}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" /> Influencer Breakdown
          </h2>
          <span className="text-xs text-gray-400 font-bold">{collabs.filter(c => c.status !== 'REJECTED').length} collaborators</span>
        </div>
        {collabs.filter(c => c.status !== 'REJECTED').length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">No active collaborations yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#fafafa', borderBottom: '1.5px solid #f0f0f0' }}>
                <tr>
                  {['Influencer', 'Platforms', 'Status', 'Deliverable', 'Payment'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collabs.filter(c => c.status !== 'REJECTED').map(c => {
                  const inf = c.influencers
                  const statusColors: Record<string, string> = {
                    ACTIVE: 'bg-purple-50 text-purple-700', COMPLETED: 'bg-green-50 text-green-700',
                    PENDING: 'bg-amber-50 text-amber-700', INVITED: 'bg-blue-50 text-blue-700',
                  }
                  const totalF = (inf?.platforms ?? []).reduce((s: number, p: any) => s + (parseInt((p.followers || '0').replace(/\D/g, '')) || 0), 0)
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                            {inf?.avatar ? <img src={inf.avatar} className="w-full h-full object-cover" alt="" />
                              : <span className="font-black text-orange-500">{inf?.name?.[0]?.toUpperCase() ?? '?'}</span>}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{inf?.name ?? 'Unknown'}</p>
                            {totalF > 0 && <p className="text-xs text-purple-600 font-bold">{fmtNum(totalF)} followers</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {(inf?.platforms ?? []).slice(0, 3).map((p: any) => (
                            <span key={p.platform}>{PLATFORM_ICON[p.platform?.toLowerCase()] ?? null}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {c.deliverable_url
                          ? <a href={c.deliverable_url} target="_blank" className="text-xs font-bold text-orange-600 underline hover:text-orange-800 max-w-[160px] block truncate">{c.deliverable_url}</a>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 font-black text-green-600">
                        {c.payment_amount > 0 ? fmt(c.payment_amount) : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="card p-5 mt-5 fu" style={{ animationDelay: '.18s' }}>
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Influencer Reviews of Your Brand
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {reviews.filter(r => r.reviewer_role === 'influencer').map(r => {
              const collab = collabs.find(c => c.id === r.collaboration_id)
              return (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {collab?.influencers?.avatar
                        ? <img src={collab.influencers.avatar} className="w-full h-full object-cover" alt="" />
                        : <span className="font-black text-orange-500 text-xs">{collab?.influencers?.name?.[0]?.toUpperCase() ?? '?'}</span>}
                    </div>
                    <p className="font-black text-gray-800 text-sm">{collab?.influencers?.name ?? 'Influencer'}</p>
                    <div className="flex gap-0.5 ml-auto">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 italic">"{r.comment}"</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
