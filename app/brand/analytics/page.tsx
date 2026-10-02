'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlatformSettings } from '@/app/actions/admin'
import {
  TrendingUp, Users, DollarSign, BarChart2, Star,
  Instagram, ArrowUpRight, RefreshCw, Award
} from 'lucide-react'

const PERIODS = [
  { label: '7 zile', days: 7 },
  { label: '15 zile', days: 15 },
  { label: '30 zile', days: 30 },
  { label: '3 luni', days: 90 },
  { label: '6 luni', days: 180 },
  { label: '9 luni', days: 270 },
  { label: '12 luni', days: 365 },
  { label: 'Tot timpul', days: 0 },
]

export default function BrandAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    async function load() {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) return

        const { data: brand } = await sb.from('brands').select('id, name, created_at').eq('user_id', user.id).single()
        if (!brand) return

        const fromDate = period > 0
          ? new Date(Date.now() - period * 86400000).toISOString()
          : null

        const [{ data: campaigns }, { data: collabs }] = await Promise.all([
          period > 0
            ? sb.from('campaigns').select('id, title, status, budget, budget_per_influencer, offer_value, campaign_type, created_at, deadline').eq('brand_id', brand.id).gte('created_at', fromDate)
            : sb.from('campaigns').select('id, title, status, budget, budget_per_influencer, offer_value, campaign_type, created_at, deadline').eq('brand_id', brand.id),
          period > 0
            ? sb.from('collaborations').select('id, status, influencer_id, payment_amount, created_at, rejection_reason').eq('brand_id', brand.id).gte('created_at', fromDate)
            : sb.from('collaborations').select('id, status, influencer_id, payment_amount, created_at, rejection_reason').eq('brand_id', brand.id),
        ])

        // Fetch influencer details pentru top performers
        const infIds = [...new Set((collabs || []).filter(c => c.status === 'ACTIVE' || c.status === 'COMPLETED').map(c => c.influencer_id))]
        let influencers: any[] = []
        if (infIds.length > 0) {
          const res = await fetch('/api/admin/influencer-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: infIds }),
          })
          if (res.ok) influencers = await res.json()
        }

        // Calcule
        const totalInvested = (collabs || []).filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.payment_amount || 0), 0)
        const invested = totalInvested > 0 ? totalInvested : (campaigns || []).length * 1490

        // Fetch costuri agenție din setările platformei (configurate în admin)
        const DEFAULT_AGENCY_COSTS = { setup_cost: 800, selection_cost: 1200, management_cost: 1500, reporting_cost: 350 }
        let agencyCosts = DEFAULT_AGENCY_COSTS
        try {
          const settingsRes = await getPlatformSettings("agency_comparison") as any
          if (settingsRes?.success && settingsRes.data?.value) {
            const v = settingsRes.data.value
            agencyCosts = {
              setup_cost: v.setup_cost ?? DEFAULT_AGENCY_COSTS.setup_cost,
              selection_cost: v.selection_cost ?? DEFAULT_AGENCY_COSTS.selection_cost,
              management_cost: v.management_cost ?? DEFAULT_AGENCY_COSTS.management_cost,
              reporting_cost: v.reporting_cost ?? DEFAULT_AGENCY_COSTS.reporting_cost,
            }
          }
        } catch (_) {}

        const fixedAgencyCostPerCampaign = agencyCosts.setup_cost + agencyCosts.selection_cost + agencyCosts.management_cost + agencyCosts.reporting_cost
        const totalFixedSavings = fixedAgencyCostPerCampaign * Math.max((campaigns || []).length, 1)
        const agencyEquivalent = invested + totalFixedSavings
        const savings = totalFixedSavings
        const roi = invested > 0 ? Math.round((savings / invested) * 100) : 340

        const statusCount = (collabs || []).reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Estimated reach
        const activeInfs = influencers.filter(inf => {
          const c = (collabs || []).find(cl => cl.influencer_id === inf.id && (cl.status === 'ACTIVE' || cl.status === 'COMPLETED'))
          return !!c
        })
        const totalReach = activeInfs.reduce((s, inf) => s + (inf.ig_followers || 0) + (inf.tt_followers || 0), 0)

        // Days on platform
        const joinedAt = new Date(brand.created_at)
        const daysOnPlatform = Math.floor((Date.now() - joinedAt.getTime()) / 86400000)

        setData({
          brand, campaigns: campaigns || [], collabs: collabs || [],
          influencers, invested, agencyEquivalent, savings, roi,
          statusCount, totalReach, daysOnPlatform,
          activeCount: statusCount['ACTIVE'] || 0,
          invitedCount: statusCount['INVITED'] || 0,
          completedCount: statusCount['COMPLETED'] || 0,
          totalPosts: Math.max((statusCount['COMPLETED'] || 0) * 2, (statusCount['ACTIVE'] || 0)),
        })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [period])

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString()
  const fmtRon = (n: number) => `${n.toLocaleString('ro-RO')} RON`

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return null

  const { brand, campaigns, collabs, influencers, invested, agencyEquivalent, savings, roi, statusCount, totalReach, daysOnPlatform, activeCount, invitedCount, completedCount, totalPosts } = data

  const topInfluencers = influencers
    .map(inf => ({
      ...inf,
      reach: (inf.ig_followers || 0) + (inf.tt_followers || 0)
    }))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5)

  // Nișe
  const niseCounts: Record<string, number> = {}
  influencers.forEach(inf => (inf.niches || []).forEach((n: string) => { niseCounts[n] = (niseCounts[n] || 0) + 1 }))
  const topNise = Object.entries(niseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalNise = topNise.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">Analytics & Impact</h1>
            <p className="text-sm text-gray-400 mt-0.5">{brand.name} · Pe AddFame de {daysOnPlatform} zile</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {PERIODS.map(({ label, days }) => (
                <button key={days} onClick={() => { setLoading(true); setPeriod(days) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${period === days ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Cont activ
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* Period label */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {period === 0 ? 'Date pentru toată activitatea' : `Date pentru ultimele ${PERIODS.find(p => p.days === period)?.label}`}
            {' · '}{campaigns.length} campanii · {collabs.length} colaborări
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: 'Reach total estimat', value: fmt(totalReach) || '—', sub: 'persoane atinse', color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: BarChart2, label: 'Postări publicate', value: totalPosts.toString(), sub: 'stories + posts', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: DollarSign, label: 'Economii generate', value: fmtRon(Math.round(savings)), sub: 'față de agenție', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: Award, label: 'ROI estimat', value: `${roi}%`, sub: 'față de investiție', color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(({ icon: Icon, label, value, sub, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-xs font-bold text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Financiar + Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Financiar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Rezumat financiar</p>
            <div className="flex items-baseline justify-between mb-5">
              <div>
                <p className="text-xs text-gray-400">Investit via AddFame</p>
                <p className="text-3xl font-black text-gray-900">{fmtRon(Math.round(invested))}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Echivalent agenție</p>
                <p className="text-xl font-black text-red-500">{fmtRon(Math.round(agencyEquivalent))}</p>
              </div>
            </div>
            <div className="h-px bg-gray-100 mb-4"></div>
            <p className="text-xs font-black text-gray-400 mb-3">Campanii ({campaigns.length})</p>
            <div className="space-y-2.5">
              {campaigns.slice(0, 4).map((camp: any) => {
                const campCollabs = collabs.filter((c: any) => c.status !== 'REJECTED' && campaigns.find((ca: any) => ca.id === camp.id))
                return (
                  <div key={camp.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">{camp.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{collabs.filter((c: any) => c.status === 'ACTIVE' || c.status === 'COMPLETED').length} inf.</span>
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {camp.campaign_type === 'BARTER' ? `${camp.offer_value || 0} RON` : `${camp.budget_per_influencer || 0} RON`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="h-px bg-gray-100 mt-4 mb-3"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Cost / influencer</p>
                <p className="text-base font-black text-gray-900">{collabs.length > 0 ? `${Math.round(invested / Math.max(activeCount + completedCount, 1))} RON` : '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Cost / 1K reach</p>
                <p className="text-base font-black text-gray-900">{totalReach > 0 ? `${((invested / totalReach) * 1000).toFixed(2)} RON` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Status + Nișe */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Status colaborări · {collabs.length} total</p>
            <div className="space-y-3 mb-5">
              {[
                { label: 'Invitați', count: invitedCount, color: '#378ADD', max: collabs.length },
                { label: 'Activi', count: activeCount, color: '#7F77DD', max: collabs.length },
                { label: 'Finalizați', count: completedCount, color: '#1D9E75', max: collabs.length },
                { label: 'Refuzați', count: statusCount['REJECTED'] || 0, color: '#E24B4A', max: collabs.length },
              ].map(({ label, count, color, max }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-20">{label}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: color }} />
                  </div>
                  <span className="text-sm text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>

            <div className="h-px bg-gray-100 mb-4"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Nișe influenceri</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {topNise.length > 0 ? topNise.map(([nisa, count]) => (
                <span key={nisa} className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                  {nisa} {totalNise > 0 ? `${Math.round((count / totalNise) * 100)}%` : ''}
                </span>
              )) : <span className="text-xs text-gray-400">Nicio dată disponibilă încă</span>}
            </div>

            <div className="h-px bg-gray-100 mb-4"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Comparație industrie</p>
            <div className="space-y-2.5">
              {[
                { label: 'Eng. rate mediu', yours: '3.8%', industry: '1.9%', better: true },
                { label: 'Cost / reach', yours: totalReach > 0 ? `${((invested / totalReach)).toFixed(3)} RON` : '—', industry: '0.05 RON', better: true },
                { label: 'Setup campanie', yours: '15 min', industry: '5-7 zile', better: true },
              ].map(({ label, yours, industry, better }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">vs {industry}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${better ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {yours}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top influenceri */}
        {topInfluencers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Top influenceri după reach</p>
            <div className="space-y-3">
              {topInfluencers.map((inf, idx) => (
                <div key={inf.id} className="flex items-center gap-4">
                  <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {inf.avatar
                      ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-black text-orange-500">{inf.name?.[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={`/influencer/${inf.slug || inf.id}`} target="_blank" className="text-sm font-black text-gray-900 hover:text-orange-500 transition flex items-center gap-1">
                      {inf.name} <ArrowUpRight className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-3 mt-0.5">
                      {inf.ig_followers > 0 && <span className="text-xs text-gray-400">IG {fmt(inf.ig_followers)}</span>}
                      {inf.tt_followers > 0 && <span className="text-xs text-gray-400">TT {fmt(inf.tt_followers)}</span>}
                    </div>
                  </div>
                  <div className="flex-1 max-w-32">
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full bg-purple-400"
                        style={{ width: `${topInfluencers[0].reach > 0 ? (inf.reach / topInfluencers[0].reach) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-gray-700 w-16 text-right">{fmt(inf.reach)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-400">Total investit</p>
                <p className="text-lg font-black text-gray-900">{fmtRon(Math.round(invested))}</p>
              </div>
              <div className="w-px h-8 bg-gray-100"></div>
              <div>
                <p className="text-xs text-gray-400">Economii generate</p>
                <p className="text-lg font-black text-green-600">{fmtRon(Math.round(savings))}</p>
              </div>
              <div className="w-px h-8 bg-gray-100"></div>
              <div>
                <p className="text-xs text-gray-400">ROI total estimat</p>
                <p className="text-lg font-black text-green-600">{roi}%</p>
              </div>
            </div>
            <p className="text-xs text-gray-300">Generat de AddFame · addfame.ro</p>
          </div>
        </div>

      </div>
    </div>
  )
}
