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
    <div className="bu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#5a35e6', borderTopColor: 'transparent' }} />
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

  const kpis = [
    { icon: TrendingUp, label: 'Reach total estimat', value: fmt(totalReach) || '—', sub: 'persoane atinse', bg: '#efeaff', fg: '#4423c4' },
    { icon: BarChart2, label: 'Postări publicate', value: totalPosts.toString(), sub: 'stories + posts', bg: '#e6f0ff', fg: '#1d4fb8' },
    { icon: DollarSign, label: 'Economii generate', value: fmtRon(Math.round(savings)), sub: 'față de agenție', bg: '#dcf5ec', fg: '#14532d' },
    { icon: Award, label: 'ROI estimat', value: `${roi}%`, sub: 'față de investiție', bg: '#fff1c2', fg: '#854d0e' },
  ]
  const statuses = [
    { label: 'Invitați', count: invitedCount, color: '#2f6fe0' },
    { label: 'Activi', count: activeCount, color: '#5a35e6' },
    { label: 'Finalizați', count: completedCount, color: '#1d9e75' },
    { label: 'Refuzați', count: statusCount['REJECTED'] || 0, color: '#c9c6e0' },
  ]
  const periodLabel = PERIODS.find(p => p.days === period)?.label

  return (
    <div className="bu">
      <style>{`
        .an-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
        .an-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        @media(max-width:1023px){.an-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:767px){.an-two{grid-template-columns:minmax(0,1fr)}.an-kpis{gap:12px}}
        .an-num{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:1.1}
        .an-kpi-v{font-size:28px;overflow-wrap:anywhere}
        @media(max-width:767px){.an-kpi-v{font-size:22px}}
        .an-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eeecf7;min-width:0}
        .an-row:last-child{border-bottom:0}
        .an-per{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;max-width:100%;scrollbar-width:none}
        .an-per::-webkit-scrollbar{display:none}
        .an-mini{background:#f6f6fc;border-radius:14px;padding:12px 14px;min-width:0}
        .an-top{display:grid;grid-template-columns:20px 40px minmax(0,1fr) minmax(60px,140px) 56px;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eeecf7}
        .an-top:last-child{border-bottom:0}
        @media(max-width:560px){.an-top{grid-template-columns:18px 40px minmax(0,1fr) 52px}.an-top .an-bar{display:none}}
      `}</style>

      {/* Header */}
      <div className="bu-head">
        <div>
          <h1>Analytics & Impact</h1>
          <p className="bu-muted" style={{ margin: '6px 0 0' }}>{brand.name} · Pe AddFame de {daysOnPlatform} zile</p>
        </div>
        <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: '#1d9e75' }} /> Cont activ
        </span>
      </div>

      {/* Period selector */}
      <div>
        <div className="an-per">
          {PERIODS.map(({ label, days }) => (
            <button key={days} onClick={() => { setLoading(true); setPeriod(days) }}
              className={`bu-pill${period === days ? ' on' : ''}`} style={{ height: 44, flex: 'none' }}>
              {label}
            </button>
          ))}
        </div>
        <p className="bu-muted bu-sm" style={{ margin: '10px 0 0' }}>
          {period === 0 ? 'Date pentru toată activitatea' : `Date pentru ultimele ${periodLabel}`}
          {' · '}{campaigns.length} campanii · {collabs.length} colaborări
        </p>
      </div>

      {/* KPI Row */}
      <div className="an-kpis">
        {kpis.map(({ icon: Icon, label, value, sub, bg, fg }) => (
          <div key={label} className="bu-card bu-card-pad">
            <div className="bu-ico" style={{ background: bg, color: fg, marginBottom: 12 }}><Icon className="w-5 h-5" /></div>
            <div className="bu-label" style={{ marginBottom: 6 }}>{label}</div>
            <div className="an-num an-kpi-v">{value}</div>
            <div className="bu-muted bu-xs" style={{ marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Financiar + Status */}
      <div className="an-two">
        <div className="bu-card bu-card-pad">
          <div className="bu-label" style={{ marginBottom: 14 }}>Rezumat financiar</div>
          <div className="bu-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <div style={{ minWidth: 0 }}>
              <div className="bu-muted bu-xs">Investit via AddFame</div>
              <div className="an-num" style={{ fontSize: 30 }}>{fmtRon(Math.round(invested))}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bu-muted bu-xs">Echivalent agenție</div>
              <div className="an-num" style={{ fontSize: 20, color: '#6a6690', textDecoration: 'line-through', textDecorationColor: '#c9c6e0' }}>{fmtRon(Math.round(agencyEquivalent))}</div>
            </div>
          </div>
          <div className="bu-div" style={{ paddingTop: 14 }}>
            <div className="bu-label" style={{ marginBottom: 4 }}>Campanii ({campaigns.length})</div>
            {campaigns.length === 0 && <p className="bu-muted bu-sm" style={{ margin: '8px 0 0' }}>Nicio campanie în perioada aleasă</p>}
            {campaigns.slice(0, 4).map((camp: any) => (
              <div key={camp.id} className="an-row">
                <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{camp.title}</span>
                <span className="bu-row" style={{ gap: 8, flex: 'none' }}>
                  <span className="bu-muted bu-xs">{collabs.filter((c: any) => c.status === 'ACTIVE' || c.status === 'COMPLETED').length} inf.</span>
                  <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>
                    {camp.campaign_type === 'BARTER' ? `${camp.offer_value || 0} RON` : `${camp.budget_per_influencer || 0} RON`}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
            <div className="an-mini">
              <div className="bu-muted bu-xs">Cost / influencer</div>
              <div className="an-num" style={{ fontSize: 18, marginTop: 2 }}>{collabs.length > 0 ? `${Math.round(invested / Math.max(activeCount + completedCount, 1))} RON` : '—'}</div>
            </div>
            <div className="an-mini">
              <div className="bu-muted bu-xs">Cost / 1K reach</div>
              <div className="an-num" style={{ fontSize: 18, marginTop: 2 }}>{totalReach > 0 ? `${((invested / totalReach) * 1000).toFixed(2)} RON` : '—'}</div>
            </div>
          </div>
        </div>

        <div className="bu-card bu-card-pad">
          <div className="bu-label" style={{ marginBottom: 14 }}>Status colaborări · {collabs.length} total</div>
          <div className="bu-col" style={{ gap: 14, marginBottom: 18 }}>
            {statuses.map(({ label, count, color }) => (
              <div key={label} className="bu-row" style={{ gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, width: 76, flex: 'none' }}>{label}</span>
                <div className="bu-bar" style={{ flex: 1, height: 8 }}>
                  <i style={{ width: `${collabs.length > 0 ? (count / collabs.length) * 100 : 0}%`, background: color }} />
                </div>
                <b className="an-num" style={{ fontSize: 16, width: 28, textAlign: 'right' }}>{count}</b>
              </div>
            ))}
          </div>

          <div className="bu-div" style={{ paddingTop: 14, marginBottom: 14 }}>
            <div className="bu-label" style={{ marginBottom: 10 }}>Nișe influenceri</div>
            <div className="bu-row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {topNise.length > 0 ? topNise.map(([nisa, count]) => (
                <span key={nisa} className="bu-chip" style={{ background: '#efeaff', color: '#4423c4' }}>
                  {nisa} {totalNise > 0 ? `${Math.round((count / totalNise) * 100)}%` : ''}
                </span>
              )) : <span className="bu-muted bu-sm">Nicio dată disponibilă încă</span>}
            </div>
          </div>

          <div className="bu-div" style={{ paddingTop: 14 }}>
            <div className="bu-label" style={{ marginBottom: 4 }}>Comparație industrie</div>
            {[
              { label: 'Eng. rate mediu', yours: '3.8%', industry: '1.9%' },
              { label: 'Cost / reach', yours: totalReach > 0 ? `${((invested / totalReach)).toFixed(3)} RON` : '—', industry: '0.05 RON' },
              { label: 'Setup campanie', yours: '15 min', industry: '5-7 zile' },
            ].map(({ label, yours, industry }) => (
              <div key={label} className="an-row" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                <span className="bu-row" style={{ gap: 8 }}>
                  <span className="bu-muted bu-xs">vs {industry}</span>
                  <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>{yours}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top influenceri */}
      {topInfluencers.length > 0 && (
        <div className="bu-card bu-card-pad">
          <div className="bu-label" style={{ marginBottom: 6 }}>Top influenceri după reach</div>
          <div>
            {topInfluencers.map((inf, idx) => (
              <div key={inf.id} className="an-top">
                <span className="an-num" style={{ fontSize: 14, color: '#8783a8' }}>{idx + 1}</span>
                <span className="bu-face" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#e6f0ff,#efeaff)', color: '#4423c4', fontSize: 15 }}>
                  {inf.avatar
                    ? <img src={inf.avatar} alt={inf.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : inf.name?.[0]}
                </span>
                <div style={{ minWidth: 0 }}>
                  <a href={`/influencer/${inf.slug || inf.id}`} target="_blank" style={{ fontWeight: 700, fontSize: 14, color: '#14123a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inf.name}</span> <ArrowUpRight className="w-3 h-3" style={{ flex: 'none' }} />
                  </a>
                  <div className="bu-row bu-muted bu-xs" style={{ gap: 10 }}>
                    {inf.ig_followers > 0 && <span>IG {fmt(inf.ig_followers)}</span>}
                    {inf.tt_followers > 0 && <span>TT {fmt(inf.tt_followers)}</span>}
                  </div>
                </div>
                <div className="bu-bar an-bar">
                  <i style={{ width: `${topInfluencers[0].reach > 0 ? (inf.reach / topInfluencers[0].reach) * 100 : 0}%` }} />
                </div>
                <b className="an-num" style={{ fontSize: 16, textAlign: 'right' }}>{fmt(inf.reach)}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bu-card bu-card-pad">
        <div className="bu-row" style={{ justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div className="bu-row" style={{ gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div className="bu-muted bu-xs">Total investit</div>
              <div className="an-num" style={{ fontSize: 20 }}>{fmtRon(Math.round(invested))}</div>
            </div>
            <div>
              <div className="bu-muted bu-xs">Economii generate</div>
              <div className="an-num" style={{ fontSize: 20, color: '#14532d' }}>{fmtRon(Math.round(savings))}</div>
            </div>
            <div>
              <div className="bu-muted bu-xs">ROI total estimat</div>
              <div className="an-num" style={{ fontSize: 20, color: '#14532d' }}>{roi}%</div>
            </div>
          </div>
          <span className="bu-muted bu-xs">Generat de AddFame · addfame.ro</span>
        </div>
      </div>
    </div>
  )
}
