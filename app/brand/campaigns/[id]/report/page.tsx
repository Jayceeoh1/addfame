'use client'
// @ts-nocheck
// Raportul campaniei pentru brand: aplicanți, livrări, performanța postărilor (vizualizări, interacțiuni),
// recenzii. Export CSV (aplicanți / postări) și PDF (tipărire din browser → „Salvează ca PDF”).
import { parseCount } from '@/lib/tiers'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Download, TrendingUp, Users, CheckCircle, DollarSign, Star, Instagram, Youtube, Award,
  Target, Zap, BarChart2, FileText, Eye, Heart, RefreshCw, Printer, ExternalLink, Info,
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

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'automat · Instagram', youtube: 'automat · YouTube', creator: 'raportat de creator',
  admin: 'verificat de AddFame', pending: 'în așteptare',
}
const STATUS_RO: Record<string, string> = {
  PENDING: 'În așteptare', INVITED: 'Invitat', ACTIVE: 'Acceptat', COMPLETED: 'Finalizat', REJECTED: 'Respins', CANCELLED: 'Anulat',
}

const fmtRon = (n: number) => `${Math.round(n || 0).toLocaleString('ro-RO')} RON`
const fmtNum = (n: number | null | undefined) => {
  const v = Number(n) || 0
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')}M`
  if (v >= 1e4) return `${(v / 1e3).toFixed(1).replace('.', ',')}K`
  return v.toLocaleString('ro-RO')
}
const cell = (n: number | null | undefined) => (n == null ? '—' : Number(n).toLocaleString('ro-RO'))
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })

export default function CampaignReportPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<any>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [metrics, setMetrics] = useState<{ rows: any[]; totals: any } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
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
        .select(`*, influencers(id, name, avatar, niches, platforms, avg_rating, review_count, instagram_connected, ig_followers, tt_followers)`)
        .eq('campaign_id', campaignId),
    ])

    if (!campRes.data) { router.replace('/brand/campaigns'); return }
    setCampaign(campRes.data)
    const rows = collabRes.data ?? []
    setCollabs(rows)

    const completedIds = rows.filter(c => c.status === 'COMPLETED').map(c => c.id)
    if (completedIds.length > 0) {
      const { data: revData } = await sb.from('reviews').select('*').in('collaboration_id', completedIds)
      setReviews(revData ?? [])
    }
    setLoading(false)

    fetch(`/api/brand/campaign-report?id=${campaignId}`).then(r => r.json()).then(setMetrics).catch(() => setMetrics({ rows: [], totals: null }))
  }, [campaignId, router])

  useEffect(() => { load() }, [load])

  async function refreshMetrics() {
    setRefreshing(true); setNote(null)
    try {
      const r = await fetch(`/api/brand/campaign-report?id=${campaignId}`, { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setMetrics(j); setNote('Metricile au fost actualizate.')
    } catch (e: any) { setNote(e.message || 'Nu am putut actualiza.') }
    finally { setRefreshing(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-t-violet-400 border-violet-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )
  if (!campaign) return null

  /* ── Calcule ── */
  const total = collabs.length
  const active = collabs.filter(c => c.status === 'ACTIVE').length
  const completed = collabs.filter(c => c.status === 'COMPLETED').length
  const pending = collabs.filter(c => c.status === 'PENDING').length
  const rejected = collabs.filter(c => c.status === 'REJECTED').length
  const invited = collabs.filter(c => c.status === 'INVITED').length
  const totalSpent = collabs.reduce((s, c) => s + (c.payment_amount || 0), 0)
  const convRate = total > 0 ? Math.round(((active + completed) / total) * 100) : 0
  const delivSubmit = collabs.filter(c => c.deliverable_url).length
  const isBarter = String(campaign.campaign_type || '').toUpperCase() === 'BARTER'

  const followersOf = (inf: any) => {
    const manual = (inf?.platforms ?? []).reduce((ps: number, p: any) => ps + parseCount(p.followers), 0)
    return Math.max(manual, inf?.instagram_connected ? Number(inf.ig_followers) || 0 : 0)
  }
  const audience = collabs.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status)).reduce((s, c) => s + followersOf(c.influencers), 0)

  const platformDist: Record<string, number> = {}
  collabs.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status)).forEach(c => {
    (c.influencers?.platforms ?? []).forEach((p: any) => {
      const key = p.platform?.toLowerCase() || 'altele'
      platformDist[key] = (platformDist[key] || 0) + 1
    })
  })

  const nicheDist: Record<string, number> = {}
  collabs.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status)).forEach(c => {
    (c.influencers?.niches ?? []).forEach((n: string) => { nicheDist[n] = (nicheDist[n] || 0) + 1 })
  })
  const topNiches = Object.entries(nicheDist).sort(([, a], [, b]) => b - a).slice(0, 6)

  const brandReviews = reviews.filter(r => r.reviewer_role === 'influencer')
  const avgBrandRating = brandReviews.length > 0 ? brandReviews.reduce((s, r) => s + r.rating, 0) / brandReviews.length : 0
  const costPerComplete = completed > 0 && totalSpent > 0 ? totalSpent / completed : 0

  const t = metrics?.totals
  const mRows = metrics?.rows ?? []
  const hasMetrics = !!t && t.withData > 0

  const startDate = new Date(campaign.created_at)
  const elapsed = Math.ceil((Date.now() - startDate.getTime()) / 864e5)
  const exportUrl = (type: string) => `/api/brand/export?type=${type}&campaign=${campaignId}`

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto report-root">
      <style>{`
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .brand-grad { background:linear-gradient(135deg,#2f6fe0, #5a35e6); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .4s ease both; }
        .stat-card { background:white;border:1.5px solid #f0f0f0;border-radius:16px;padding:18px; }
        .num { font-variant-numeric: tabular-nums; }
        .print-only { display:none; }
        @media print {
          @page { size: A4; margin: 12mm; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header, .fixed, .no-print { display:none !important; }
          html, body, .h-screen, div:has(> main), main { height:auto !important; overflow:visible !important; display:block !important; background:#fff !important; }
          .report-root { padding:0 !important; max-width:none !important; }
          .card, .stat-card, tr { break-inside: avoid; }
          .fu { animation:none !important; }
          .print-only { display:block; }
        }
      `}</style>

      {/* Antet */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7 fu">
        <div className="flex items-start gap-4 min-w-0">
          <Link href={`/brand/campaigns/${campaignId}`}
            className="no-print w-10 h-10 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center hover:border-violet-200 transition flex-shrink-0 mt-0.5" aria-label="Înapoi">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 brand-grad rounded-xl flex items-center justify-center"><BarChart2 className="w-4 h-4 text-white" /></div>
              <span className="text-xs font-black text-violet-600 uppercase tracking-wider">Raport campanie</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900" style={{ textWrap: 'balance' }}>{campaign.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Creată {fmtDate(campaign.created_at)}
              {campaign.deadline && ` · Termen ${fmtDate(campaign.deadline)}`}
              {elapsed > 0 && ` · ziua ${elapsed}`}
            </p>
            <p className="print-only text-xs text-gray-400 mt-1">Generat din AddFame pe {fmtDate(new Date().toISOString())}</p>
          </div>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <a href={exportUrl('applicants')} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-sm bg-white border-2 border-gray-100 text-gray-700 hover:border-violet-200 transition">
            <Download className="w-4 h-4" /> Aplicanți CSV
          </a>
          <a href={exportUrl('report')} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-sm bg-white border-2 border-gray-100 text-gray-700 hover:border-violet-200 transition">
            <Download className="w-4 h-4" /> Postări CSV
          </a>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-sm text-white brand-grad hover:opacity-90 transition">
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 fu" style={{ animationDelay: '.06s' }}>
        {[
          { icon: <Eye className="w-5 h-5 text-violet-500" />, label: 'Vizualizări', value: hasMetrics && t.views > 0 ? fmtNum(t.views) : '—', sub: hasMetrics ? `din ${t.withData} ${t.withData === 1 ? 'postare' : 'postări'} cu date` : 'apar după publicare', bg: 'bg-violet-50', border: 'border-violet-100' },
          { icon: <Heart className="w-5 h-5 text-pink-500" />, label: 'Interacțiuni', value: hasMetrics ? fmtNum(t.engagement) : '—', sub: t?.engagementRate != null ? `engagement ${String(t.engagementRate).replace('.', ',')}%` : 'like-uri, comentarii, distribuiri', bg: 'bg-pink-50', border: 'border-pink-100' },
          { icon: <Users className="w-5 h-5 text-blue-500" />, label: 'Audiență potențială', value: audience > 0 ? fmtNum(audience) : '—', sub: 'urmăritorii creatorilor acceptați', bg: 'bg-blue-50', border: 'border-blue-100' },
          { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Finalizate', value: completed, sub: `din ${active + completed} acceptați`, bg: 'bg-green-50', border: 'border-green-100' },
        ].map(k => (
          <div key={k.label} className={`stat-card border-2 ${k.border}`}>
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>{k.icon}</div>
            <p className="text-2xl font-black text-gray-900 num">{k.value}</p>
            <p className="text-xs font-bold text-gray-500 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Performanța postărilor */}
      <div className="card overflow-hidden mb-5 fu" style={{ animationDelay: '.08s' }}>
        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-gray-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" /> Performanța postărilor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Se actualizează zilnic. Sursa fiecărei cifre e afișată lângă postare.</p>
          </div>
          <button onClick={refreshMetrics} disabled={refreshing} className="no-print flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-violet-50 text-violet-700 hover:bg-violet-100 transition disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Se actualizează…' : 'Actualizează acum'}
          </button>
        </div>
        {note && <p className="no-print px-5 pt-3 text-xs font-bold text-gray-500">{note}</p>}
        {metrics === null ? (
          <p className="p-5 text-sm text-gray-400">Se încarcă metricile…</p>
        ) : mRows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-gray-500">Încă nu există postări trimise în această campanie.</p>
            <p className="text-xs text-gray-400 mt-1">Când creatorii trimit linkul postării, cifrele apar aici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#fafafa', borderBottom: '1.5px solid #f0f0f0' }}>
                <tr>
                  {['Creator', 'Postare', 'Vizualizări', 'Like-uri', 'Comentarii', 'Distribuiri', 'Sursa'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td className="px-4 py-3 font-bold text-gray-800 whitespace-nowrap">{r.influencer_name || '—'}</td>
                    <td className="px-4 py-3">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:underline">
                          {PLATFORM_ICON[r.platform] ?? <Zap className="w-4 h-4 text-gray-300" />}
                          <span className="max-w-[180px] truncate">{r.url.replace(/^https:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 no-print" />
                        </a>
                      ) : <span className="text-xs text-gray-400 capitalize">{r.platform}</span>}
                    </td>
                    <td className="px-4 py-3 num font-black text-gray-900">{cell(r.views)}</td>
                    <td className="px-4 py-3 num text-gray-700">{cell(r.likes)}</td>
                    <td className="px-4 py-3 num text-gray-700">{cell(r.comments)}</td>
                    <td className="px-4 py-3 num text-gray-700">{cell(r.shares)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${r.source === 'creator' ? 'bg-amber-50 text-amber-700' : r.source === 'pending' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-700'}`}>
                        {SOURCE_LABEL[r.source] || r.source}
                      </span>
                    </td>
                  </tr>
                ))}
                {hasMetrics && (
                  <tr style={{ background: '#fafafa' }}>
                    <td className="px-4 py-3 font-black text-gray-900" colSpan={2}>Total · {t.posts} {t.posts === 1 ? 'postare' : 'postări'}</td>
                    <td className="px-4 py-3 num font-black">{cell(t.views)}</td>
                    <td className="px-4 py-3 num font-black">{cell(t.likes)}</td>
                    <td className="px-4 py-3 num font-black">{cell(t.comments)}</td>
                    <td className="px-4 py-3 num font-black">{cell(t.shares)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
            <p className="px-5 py-3 text-[11px] text-gray-400 flex items-start gap-1.5 border-t border-gray-100">
              <Info className="w-3.5 h-3.5 flex-none mt-px" />
              Instagram: like-uri și comentarii citite automat din contul conectat al creatorului. YouTube: citite automat. TikTok și story-uri: completate de creator din statisticile aplicației.
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Aplicări */}
        <div className="card p-5 lg:col-span-2 fu" style={{ animationDelay: '.1s' }}>
          <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-violet-400" /> Aplicări</h2>
          <p className="text-xs text-gray-400 mb-5">{total} {total === 1 ? 'aplicare primită' : 'aplicări primite'} · {convRate}% acceptate</p>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Users className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-400">Nicio aplicare încă</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'În așteptare', count: pending, color: 'from-amber-400 to-amber-300', text: 'text-amber-700' },
                { label: 'Invitați', count: invited, color: 'from-blue-400 to-blue-300', text: 'text-blue-700' },
                { label: 'Acceptați', count: active, color: 'from-purple-500 to-purple-400', text: 'text-purple-700' },
                { label: 'Finalizați', count: completed, color: 'from-green-500 to-green-400', text: 'text-green-700' },
                { label: 'Respinși', count: rejected, color: 'from-gray-300 to-gray-200', text: 'text-gray-500' },
              ].filter(r => r.count > 0).map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className={`text-sm font-black w-24 flex-shrink-0 ${row.text}`}>{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className={`bg-gradient-to-r ${row.color} h-3 rounded-full`} style={{ width: `${Math.max(4, Math.round((row.count / total) * 100))}%` }} />
                  </div>
                  <span className="text-sm font-black text-gray-700 w-8 text-right num">{row.count}</span>
                </div>
              ))}
            </div>
          )}

          {(active + completed) > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Postări trimise</p>
              <p className="text-2xl font-black text-gray-900 num">{delivSubmit} <span className="text-sm font-bold text-gray-400">din {active + completed} creatori acceptați</span></p>
            </div>
          )}
        </div>

        {/* Lateral */}
        <div className="space-y-4 fu" style={{ animationDelay: '.12s' }}>
          {(!isBarter || totalSpent > 0) && (
            <div className="card p-5">
              <h3 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-violet-400" /> Buget</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Buget campanie</span><span className="font-black num">{fmtRon(campaign.budget || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400 font-bold">Plătit creatorilor</span><span className="font-black num">{fmtRon(totalSpent)}</span></div>
                {costPerComplete > 0 && <div className="flex justify-between pt-2 border-t border-gray-100"><span className="text-gray-400 font-bold">Cost / colaborare</span><span className="font-black num">{fmtRon(costPerComplete)}</span></div>}
                {hasMetrics && t.views > 0 && totalSpent > 0 && <div className="flex justify-between"><span className="text-gray-400 font-bold">Cost / 1.000 vizualizări</span><span className="font-black num">{fmtRon((totalSpent / t.views) * 1000)}</span></div>}
              </div>
            </div>
          )}

          {avgBrandRating > 0 && (
            <div className="card p-5">
              <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Nota primită de la creatori</h3>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-amber-500 num">{avgBrandRating.toFixed(1).replace('.', ',')}</p>
                <div>
                  <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgBrandRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}</div>
                  <p className="text-xs text-gray-400 mt-0.5">{brandReviews.length} {brandReviews.length === 1 ? 'recenzie' : 'recenzii'}</p>
                </div>
              </div>
            </div>
          )}

          {Object.keys(platformDist).length > 0 && (
            <div className="card p-5">
              <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" /> Platforme</h3>
              <div className="space-y-2">
                {Object.entries(platformDist).sort(([, a], [, b]) => b - a).map(([plat, count]) => (
                  <div key={plat} className="flex items-center gap-2">
                    {PLATFORM_ICON[plat] ?? <Zap className="w-4 h-4 text-gray-300" />}
                    <span className="text-sm font-bold text-gray-600 capitalize flex-1">{plat}</span>
                    <span className="text-sm font-black text-gray-800 num">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {topNiches.length > 0 && (
        <div className="card p-5 mb-5 fu" style={{ animationDelay: '.14s' }}>
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-violet-400" /> Nișele creatorilor acceptați</h2>
          <div className="flex flex-wrap gap-2">
            {topNiches.map(([niche, count]) => (
              <div key={niche} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-full">
                <span className="text-sm font-black text-violet-700">{niche}</span>
                <span className="text-xs font-bold text-violet-400 num">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creatori */}
      <div className="card overflow-hidden fu" style={{ animationDelay: '.16s' }}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-400" /> Creatori</h2>
          <span className="text-xs text-gray-400 font-bold">{collabs.filter(c => c.status !== 'REJECTED').length} în campanie</span>
        </div>
        {collabs.filter(c => c.status !== 'REJECTED').length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400">Încă nu sunt colaborări</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#fafafa', borderBottom: '1.5px solid #f0f0f0' }}>
                <tr>
                  {['Creator', 'Platforme', 'Status', 'Postare', 'Plată'].map(h => (
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
                  const f = followersOf(inf)
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center">
                            {inf?.avatar ? <img src={inf.avatar} className="w-full h-full object-cover" alt="" />
                              : <span className="font-black text-violet-500">{inf?.name?.[0]?.toUpperCase() ?? '?'}</span>}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{inf?.name ?? 'Necunoscut'}</p>
                            {f > 0 && <p className="text-xs text-purple-600 font-bold num">{fmtNum(f)} urmăritori</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {(inf?.platforms ?? []).slice(0, 3).map((p: any) => <span key={p.platform}>{PLATFORM_ICON[p.platform?.toLowerCase()] ?? null}</span>)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_RO[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {c.deliverable_url
                          ? <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-violet-600 underline hover:text-violet-800 max-w-[160px] block truncate">{c.deliverable_url}</a>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 font-black text-green-600 num whitespace-nowrap">
                        {c.payment_amount > 0 ? fmtRon(c.payment_amount) : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {brandReviews.length > 0 && (
        <div className="card p-5 mt-5 fu" style={{ animationDelay: '.18s' }}>
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Ce spun creatorii despre colaborare</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {brandReviews.map(r => {
              const collab = collabs.find(c => c.id === r.collaboration_id)
              return (
                <div key={r.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-black text-gray-800 text-sm">{collab?.influencers?.name ?? 'Creator'}</p>
                    <div className="flex gap-0.5 ml-auto">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 italic">„{r.comment}”</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
