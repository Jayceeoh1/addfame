'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getCampaignPerformance, getCampaignForReport } from '@/app/actions/performance'

import { downloadReportPDF } from '@/components/report/ReportPDF'

const fmtNum = (n: number) => (n || 0).toLocaleString('ro-RO')

export default function CampaignReportPage() {
  const params = useParams()
  const search = useSearchParams()
  const campaignId = params?.id as string
  const shouldPrint = search?.get('print') === '1'

  const [campaign, setCampaign] = useState<any>(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [manualTraditionalCost, setManualTraditionalCost] = useState<number | null>(null)
  const [manualPlatformCost, setManualPlatformCost] = useState<number | null>(null)
  const [campaignImageUrl, setCampaignImageUrl] = useState('')
  const [collabs, setCollabs] = useState<any[]>([])
  const [performance, setPerformance] = useState<Record<string, any>>({})
  const [posts, setPosts] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // PDF generat via window.print()


  // Citim valorile manuale din URL (transmise de tab-ul parinte)
  useEffect(() => {
    const tradCost = search?.get('tradCost')
    const platCost = search?.get('platCost')
    const imgUrl = search?.get('imgUrl')
    if (tradCost) setManualTraditionalCost(Number(tradCost))
    if (platCost) setManualPlatformCost(Number(platCost))
    if (imgUrl) setCampaignImageUrl(imgUrl)
  }, [])

  useEffect(() => {
    const load = async () => {
      // Folosim server action cu admin client pentru a evita probleme RLS
      const [campaignResult, perfResult] = await Promise.all([
        getCampaignForReport(campaignId),
        getCampaignPerformance(campaignId)
      ])

      if (!campaignResult.error && campaignResult.campaign) {
        setCampaign(campaignResult.campaign)
      }

      const result = perfResult as any
      if (!result.error) {
        setCollabs(result.collabs)
        const perfMap: Record<string, any> = {}
        result.performance.forEach((p: any) => { perfMap[p.collaboration_id] = p })
        setPerformance(perfMap)
        const postsMap: Record<string, any[]> = {}
        result.posts.forEach((p: any) => {
          if (!postsMap[p.collaboration_id]) postsMap[p.collaboration_id] = []
          postsMap[p.collaboration_id].push(p)
        })
        setPosts(postsMap)
      }
      setLoading(false)
    }
    load()
  }, [campaignId])

  useEffect(() => {
    if (shouldPrint && !loading) setTimeout(() => window.print(), 600)
  }, [shouldPrint, loading])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter' }}>Se încarcă raportul...</div>

  const allPosts = Object.values(posts).flat()
  const totalReach = allPosts.reduce((s, p) => s + (p.reach || 0), 0)
  const totalViews = allPosts.reduce((s, p) => s + (p.views || 0), 0)
  const totalEngagement = allPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0), 0)
  const avgER = allPosts.length > 0 ? allPosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / allPosts.length : 0
  const hasData = allPosts.length > 0
  const totalAudience = collabs.reduce((s: number, c: any) => {
    const ig = c.influencers?.ig_followers || 0
    const tt = c.influencers?.tt_followers || 0
    return s + Math.max(ig, tt)
  }, 0)
  const dataCompleteness = collabs.length > 0 ? Math.round((Object.keys(posts).filter(k => posts[k].length > 0).length / collabs.length) * 100) : 0

  const totalPromoSales = Object.values(performance).reduce((s, p) => s + (Number(p.promo_sales_ron) || 0), 0)
  const totalPromoUses = Object.values(performance).reduce((s, p) => s + (p.promo_uses || 0), 0)
  const totalUGC = Object.values(performance).reduce((s, p) => s + (p.ugc_reusable_count || 0), 0)

  const sentiments = Object.values(performance).map(p => p.sentiment).filter(Boolean)
  const positiveCnt = sentiments.filter(s => s === 'positive').length
  const sentimentPct = sentiments.length > 0 ? Math.round((positiveCnt / sentiments.length) * 100) : 0

  const postTypes = allPosts.reduce((acc: Record<string, number>, p) => { acc[p.post_type] = (acc[p.post_type] || 0) + 1; return acc }, {})
  const postTypesStr = Object.entries(postTypes).map(([k, v]) => `${v} ${k}`).join(' · ')

  const numInfluencers = collabs.length
  const platformCost = (campaign?.budget || 0) * 0.15
  const traditionalCost = numInfluencers * 800 + 2500 + 1800 + 3500 + 500
  const savings = traditionalCost - platformCost
  const savingsPct = traditionalCost > 0 ? Math.round((savings / traditionalCost) * 100) : 0

  const collabStats = collabs.map(c => {
    const ps = posts[c.id] || []
    const reach = ps.reduce((s, p) => s + (p.reach || 0), 0)
    const avgEr = ps.length > 0 ? ps.reduce((s, p) => s + (p.engagement_rate || 0), 0) / ps.length : 0
    return { ...c, reach, avgEr, postsCount: ps.length }
  }).sort((a, b) => b.avgEr - a.avgEr)

  return (
    <div className="report-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @page { size: A4 portrait; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          .report-wrap { padding: 0 !important; background: white !important; display: block !important; }
          .report-page-cover {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            max-width: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .report-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }
          .report-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .report-wrap { background: #d1d5db; min-height: 100vh; padding: 28px 16px; font-family: 'Inter', -apple-system, sans-serif; }
        .report-page { background: white; width: 794px; max-width: 100%; min-height: 1122px; margin: 0 auto 24px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.14); display: flex; flex-direction: column; }
        .report-page-cover { background: #0f0f1a; width: 794px; max-width: 100%; min-height: 680px; margin: 0 auto 24px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.2); }

        /* ── COVER ── */
        .cover { min-height: 680px; display: grid; grid-template-rows: auto 1fr auto; background: #0a0a0a; position: relative; overflow: hidden; }
        .cover-accent { position: absolute; top: 0; right: 0; width: 340px; height: 340px; background: radial-gradient(circle at top right, #7c3aed 0%, transparent 70%); opacity: 0.6; }
        .cover-accent2 { position: absolute; bottom: 0; left: 0; width: 260px; height: 260px; background: radial-gradient(circle at bottom left, #f97316 0%, transparent 70%); opacity: 0.4; }
        .cover-accent3 { position: absolute; top: 180px; left: 40%; width: 200px; height: 2px; background: linear-gradient(90deg, transparent, #7c3aed, transparent); }
        .cover-top { padding: 36px 44px; display: flex; align-items: center; justify-content: space-between; position: relative; }
        .cover-logo { display: flex; align-items: center; gap: 10px; }
        .cover-logo-mark { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #f97316, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; }
        .cover-logo-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: -0.01em; }
        .cover-badge { padding: 5px 12px; background: rgba(124,58,237,0.3); border: 1px solid rgba(124,58,237,0.5); border-radius: 100px; font-size: 10px; font-weight: 600; color: #c4b5fd; letter-spacing: 0.08em; text-transform: uppercase; }
        .cover-body { padding: 0 44px 40px; display: flex; flex-direction: column; justify-content: flex-end; position: relative; }
        .cover-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #f97316; margin-bottom: 14px; }
        .cover-title { font-size: clamp(28px, 4.5vw, 42px); font-weight: 700; color: white; line-height: 1.1; letter-spacing: -0.025em; margin-bottom: 32px; max-width: 580px; word-break: break-word; }
        .cover-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; }
        .cover-stat { background: rgba(255,255,255,0.04); padding: 18px 20px; backdrop-filter: blur(4px); }
        .cover-stat-label { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 6px; }
        .cover-stat-value { font-size: 22px; font-weight: 700; color: white; letter-spacing: -0.02em; line-height: 1; }
        .cover-stat-sub { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px; font-weight: 500; }
        .cover-bottom { padding: 16px 44px; background: rgba(255,255,255,0.03); border-top: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; position: relative; }
        .cover-brand { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 500; }
        .cover-date { font-size: 11px; color: rgba(255,255,255,0.25); }

        /* ── BODY PAGES ── */
        .page-header { padding: 36px 44px 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 28px; margin-bottom: 36px; }
        .page-section-label { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #7c3aed; margin-bottom: 6px; }
        .page-title { font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2; }
        .page-subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; font-weight: 400; line-height: 1.5; max-width: 420px; }
        .page-num-badge { padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 100px; font-size: 10px; font-weight: 600; color: #94a3b8; white-space: nowrap; flex-shrink: 0; }
        .page-body { padding: 0 44px 44px; flex: 1; }

        /* ── STAT CARDS ── */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .stat-card { padding: 22px 24px; border-radius: 14px; border: 1.5px solid #f1f5f9; background: #fafafa; position: relative; overflow: hidden; }
        .stat-card-accent { position: absolute; top: 0; right: 0; width: 60px; height: 60px; border-radius: 0 0 0 100%; }
        .stat-card-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
        .stat-card-value { font-size: clamp(28px, 5vw, 38px); font-weight: 700; color: #0f172a; letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
        .stat-card-sub { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .stat-card-tag { display: inline-flex; align-items: center; gap: 4px; margin-top: 10px; padding: 4px 10px; border-radius: 100px; font-size: 10px; font-weight: 600; }
        .tag-green { background: #ecfdf5; color: #047857; }
        .tag-purple { background: #f5f3ff; color: #7c3aed; }
        .tag-orange { background: #fff7ed; color: #c2410c; }

        /* Wide stat card */
        .stat-card-wide { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 20px 24px; border-radius: 14px; border: 1.5px solid #f1f5f9; background: #fafafa; }
        .stat-card-wide-content { display: flex; gap: 40px; align-items: center; flex-wrap: wrap; }
        .stat-mini { text-align: left; }
        .stat-mini-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px; }
        .stat-mini-value { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
        .stat-mini-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }

        /* ── ER BAR ── */
        .er-bar-wrap { margin-top: 28px; padding: 20px 24px; background: #0f172a; border-radius: 14px; }
        .er-bar-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 16px; }
        .er-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .er-bar-row:last-child { margin-bottom: 0; }
        .er-bar-name { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 500; width: 60px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .er-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
        .er-bar-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #7c3aed, #f97316); }
        .er-bar-pct { font-size: 11px; font-weight: 600; color: white; width: 36px; text-align: right; flex-shrink: 0; }

        /* ── ECONOMY ── */
        .economy-split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
        .econ-card { padding: 22px 22px; border-radius: 14px; }
        .econ-classic { background: #f8fafc; border: 1.5px solid #e2e8f0; }
        .econ-addfame { background: #0f172a; }
        .econ-label { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
        .econ-label-classic { color: #94a3b8; }
        .econ-label-af { color: #f97316; }
        .econ-amount { font-size: clamp(26px, 4vw, 34px); font-weight: 700; letter-spacing: -0.025em; line-height: 1; margin-bottom: 4px; }
        .econ-amount-classic { color: #cbd5e1; text-decoration: line-through; }
        .econ-amount-af { color: white; }
        .econ-desc { font-size: 11px; margin-bottom: 18px; }
        .econ-desc-classic { color: #94a3b8; }
        .econ-desc-af { color: rgba(255,255,255,0.4); }
        .econ-divider { height: 1px; background: rgba(255,255,255,0.06); margin-bottom: 14px; }
        .econ-divider-classic { height: 1px; background: #f1f5f9; margin-bottom: 14px; }
        .econ-line { display: flex; justify-content: space-between; font-size: 11px; padding: 3.5px 0; gap: 8px; }
        .econ-line-classic span:first-child { color: #94a3b8; }
        .econ-line-classic span:last-child { color: #475569; font-weight: 600; flex-shrink: 0; }
        .econ-line-af span:first-child { color: rgba(255,255,255,0.35); }
        .econ-line-af span:last-child { color: #34d399; font-weight: 600; flex-shrink: 0; }
        .savings-banner { padding: 22px 28px; border-radius: 14px; background: linear-gradient(135deg, #7c3aed 0%, #f97316 50%, #ec4899 100%); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .savings-banner-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 4px; }
        .savings-banner-amount { font-size: clamp(22px, 4vw, 30px); font-weight: 700; color: white; letter-spacing: -0.02em; }
        .savings-banner-icon { font-size: 36px; opacity: 0.8; flex-shrink: 0; }

        /* ── INFLUENCERS ── */
        .inf-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .inf-row td { padding: 14px 16px; background: #fafafa; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .inf-row td:first-child { border-left: 1px solid #f1f5f9; border-radius: 12px 0 0 12px; }
        .inf-row td:last-child { border-right: 1px solid #f1f5f9; border-radius: 0 12px 12px 0; }
        .inf-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #f97316); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; overflow: hidden; flex-shrink: 0; }
        .inf-rank { width: 24px; height: 24px; border-radius: 50%; background: #0f172a; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; flex-shrink: 0; }
        .inf-rank-1 { background: linear-gradient(135deg, #f97316, #ec4899); }
        .inf-er-pill { padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; }

        /* ── FOOTER ── */
        .page-footer { padding: 14px 44px; background: #0f172a; display: flex; align-items: center; justify-content: space-between; }
        .footer-logo { display: flex; align-items: center; gap: 8px; }
        .footer-logo-mark { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, #f97316, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: white; }
        .footer-logo-name { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.6); }
        .footer-date { font-size: 10px; color: rgba(255,255,255,0.25); }

        /* ── PRINT BUTTON ── */
        .print-bar { display: none; }
        .print-btn { background: linear-gradient(135deg, #7c3aed, #f97316); color: white; padding: 10px 20px; border-radius: 10px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 20px rgba(124,58,237,0.4); font-family: inherit; }
        .data-warn { max-width: 794px; margin: 0 auto 16px; padding: 12px 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; font-size: 12px; color: #92400e; text-align: center; font-weight: 500; }

        /* ── EDITABLE COSTS ── */
        @media print {
          input[type="number"] { display: none !important; }
          #plat-cost-display { display: inline !important; }
          #trad-cost-display { display: inline !important; }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }

        /* ── EMPTY STATE ── */
        .empty { padding: 48px 24px; text-align: center; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px; }
        .empty-icon { font-size: 40px; margin-bottom: 12px; }
        .empty-title { font-size: 15px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .empty-desc { font-size: 12px; color: #94a3b8; line-height: 1.6; max-width: 360px; margin: 0 auto; }
      `}</style>

      {!shouldPrint && (
        <div className="no-print" style={{ maxWidth: 794, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px', flex: 1, maxWidth: 320 }}>
            <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>🖼 URL imagine cover:</span>
            <input
              type="text"
              placeholder="https://... (optional)"
              value={campaignImageUrl}
              onChange={e => setCampaignImageUrl(e.target.value)}
              style={{ flex: 1, padding: '2px 6px', border: 'none', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'transparent', color: '#111827' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px' }}>
            <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>Cost agenție:</span>
            <input
              type="number"
              min={0}
              placeholder={String(traditionalCost)}
              value={manualTraditionalCost ?? ''}
              onChange={e => setManualTraditionalCost(e.target.value ? Number(e.target.value) : null)}
              style={{ width: 80, padding: '2px 6px', border: 'none', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'transparent', fontWeight: 600, color: '#111827' }}
            />
            <span style={{ fontSize: 11, color: '#6b7280' }}>RON</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px' }}>
            <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>Cost AddFame:</span>
            <input
              type="number"
              min={0}
              placeholder={String(platformCost)}
              value={manualPlatformCost ?? ''}
              onChange={e => setManualPlatformCost(e.target.value ? Number(e.target.value) : null)}
              style={{ width: 80, padding: '2px 6px', border: 'none', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'transparent', fontWeight: 600, color: '#111827' }}
            />
            <span style={{ fontSize: 11, color: '#6b7280' }}>RON</span>
          </div>
          <button
            onClick={async () => {
              setDownloadingPDF(true)
              try {
                // Fetch avatare ca base64 (non-blocking, fallback la initiale)
                const toBase64 = async (url: string) => {
                  try {
                    const r = await fetch(url, { mode: 'cors' })
                    if (!r.ok) return ''
                    const b = await r.blob()
                    return await new Promise<string>((res) => {
                      const fr = new FileReader()
                      fr.onloadend = () => res(fr.result as string)
                      fr.readAsDataURL(b)
                    })
                  } catch { return '' }
                }

                const collabsWithAvatars = await Promise.all(
                  (collabStats || []).map(async (c: any) => ({
                    ...c,
                    avatarBase64: c.influencers?.avatar ? await toBase64(c.influencers.avatar) : ''
                  }))
                )

                const brandSlug = (campaign?.brands?.name || campaign?.brand_name || 'brand').toLowerCase().replace(/[^a-z0-9]/gi, '-')
                const filename = `addfame-raport-${brandSlug}-${new Date().toISOString().split('T')[0]}.pdf`
                // Fetch campaign image as base64 if provided
                let campaignImageBase64 = ''
                if (campaignImageUrl) {
                  try {
                    const r = await fetch(campaignImageUrl, { mode: 'cors' })
                    if (r.ok) {
                      const b = await r.blob()
                      campaignImageBase64 = await new Promise<string>((res) => {
                        const fr = new FileReader()
                        fr.onloadend = () => res(fr.result as string)
                        fr.readAsDataURL(b)
                      })
                    }
                  } catch {}
                }

                await downloadReportPDF({
                  campaign, collabStats: collabsWithAvatars, allPosts, totalReach, totalViews,
                  campaignImageBase64,
                  totalEngagement, avgER, hasData, numInfluencers,
                  traditionalCost: manualTraditionalCost ?? traditionalCost,
                  platformCost: manualPlatformCost ?? platformCost,
                  savings: (manualTraditionalCost ?? traditionalCost) - (manualPlatformCost ?? platformCost),
                  savingsPct: (manualTraditionalCost ?? traditionalCost) === 0 ? 0 : Math.round(((manualTraditionalCost ?? traditionalCost) - (manualPlatformCost ?? platformCost)) / (manualTraditionalCost ?? traditionalCost) * 100),
                  postTypesStr, sentimentPct, sentiments,
                }, filename)
              } catch (e) {
                console.error('PDF error:', e)
                alert('Eroare la generarea PDF. Încearcă din nou.')
              } finally {
                setDownloadingPDF(false)
              }
            }}
            className="print-btn"
          >
            📥 Descărcă PDF
          </button>
        </div>
      )}

      {!hasData && collabs.length > 0 && (
        <div className="no-print data-warn">
          ⚠️ Raportul nu conține încă date — adaugă postări și statistici din pagina <strong>Performance</strong>.
        </div>
      )}
      {hasData && dataCompleteness < 100 && (
        <div className="no-print data-warn">
          ⏳ {dataCompleteness}% din influenceri au date. Adaugă restul în pagina <strong>Performance</strong>.
        </div>
      )}

      <div id="report-content">

        {/* ── PAGINA 1: COVER ── */}
        <div className="report-page-cover">
          <div style={{ background: '#0f0f1a', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
            {/* Decorative blobs — mai mici și contained */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 140, height: 140, background: '#2d1b69', borderRadius: '0 0 0 100%', opacity: 0.7, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 100, height: 100, background: '#7c2d12', borderRadius: '0 100% 0 0', opacity: 0.5, pointerEvents: 'none' }} />

            {/* Header */}
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, borderBottom: '1px solid rgba(255,255,255,0.07)', boxSizing: 'border-box', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>AF</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap' }}>AddFame</span>
              </div>
              <span style={{ padding: '3px 10px', background: '#2d1b69', border: '1px solid #4c1d95', borderRadius: 100, fontSize: 9, fontWeight: 600, color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase' as const, flexShrink: 0 }}>Raport campanie</span>
            </div>

            {/* Brand + titlu */}
            <div style={{ padding: '16px 24px 12px', position: 'relative', zIndex: 1, boxSizing: 'border-box', width: '100%' }}>
              {(() => {
                const brandName = campaign?.brands?.name || campaign?.brand_name
                if (!brandName) return null
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '3px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: 100, border: '1px solid rgba(255,255,255,0.12)', maxWidth: '100%' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: 'white', flexShrink: 0 }}>{brandName[0]}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brandName}</span>
                  </div>
                )
              })()}
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#f97316', margin: '0 0 6px' }}>Raport de performanță</p>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1.2, letterSpacing: '-0.01em', margin: '0 0 6px', maxWidth: '100%', wordBreak: 'break-word' as const }}>{campaign?.title || campaign?.name || 'Campanie'}</h1>
              {campaign?.description && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0, maxWidth: '100%', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {campaign.description}
                </p>
              )}
            </div>

            {/* Stats grid — 3 coloane în loc de 6, mai sigur */}
            <div style={{ margin: '0 24px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden', position: 'relative', zIndex: 1, boxSizing: 'border-box' }}>
              {[
                { label: 'Brand', value: campaign?.brands?.name || campaign?.brand_name || '—' },
                { label: 'Influenceri', value: String(numInfluencers), sub: 'creatori' },
                { label: 'Audiență totală', value: totalAudience > 0 ? fmtNum(totalAudience) : '—', sub: 'urmăritori cumulați', highlight2: totalAudience > 0 },
                { label: 'Reach', value: hasData ? fmtNum(totalReach) : '—', sub: 'utilizatori unici' },
                { label: 'Engagement', value: hasData ? fmtNum(totalEngagement) : '—', sub: 'interacțiuni' },
                { label: 'ER mediu', value: hasData ? `${avgER.toFixed(1)}%` : '—', sub: hasData && avgER > 1.8 ? '↑ peste industrie' : 'rata angajament', highlight: hasData && avgER > 1.8 },
              ].map((s: any, i: number) => (
                <div key={i} style={{ background: '#1a1a2e', padding: '10px 12px', boxSizing: 'border-box' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: s.highlight ? '#f97316' : s.highlight2 ? '#a78bfa' : 'white', margin: 0, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', margin: '3px 0 0' }}>{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Pilluri info */}
            <div style={{ margin: '0 24px 12px', display: 'flex', flexWrap: 'wrap' as const, gap: 6, position: 'relative', zIndex: 1, boxSizing: 'border-box' }}>
              {campaign?.campaign_type && (
                <span style={{ padding: '3px 10px', background: '#2d1b69', border: '1px solid #4c1d95', borderRadius: 100, fontSize: 9, color: '#c4b5fd', fontWeight: 500 }}>
                  {campaign.campaign_type === 'BARTER' ? 'Barter' : 'Plătită'}
                </span>
              )}
              {campaign?.platforms?.map((p: string) => (
                <span key={p} style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{p}</span>
              ))}
              {campaign?.deadline && (
                <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  Deadline: {new Date(campaign.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Carduri */}
            <div style={{ margin: '0 24px 18px', display: 'grid', gridTemplateColumns: campaign?.offer_name ? '1fr 1fr' : '1fr', gap: 8, position: 'relative', zIndex: 1, boxSizing: 'border-box' }}>
              {campaign?.deliverables && (
                <div style={{ padding: '10px 12px', background: '#1e1b4b', border: '1px solid #312e81', borderRadius: 8, boxSizing: 'border-box', overflow: 'hidden' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#a78bfa', margin: '0 0 5px' }}>Ce trebuie să posteze</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>{campaign.deliverables}</p>
                </div>
              )}
              {campaign?.offer_name && (
                <div style={{ padding: '10px 12px', background: '#431407', border: '1px solid #7c2d12', borderRadius: 8, boxSizing: 'border-box', overflow: 'hidden' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#fb923c', margin: '0 0 5px' }}>Ce primesc influencerii</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '0 0 2px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{campaign.offer_name}</p>
                  {campaign.offer_value > 0 && (
                    <p style={{ fontSize: 10, color: '#fb923c', margin: 0, fontWeight: 500 }}>Valoare: {campaign.offer_value} RON</p>
                  )}
                </div>
              )}
              {!campaign?.offer_name && campaign?.budget_per_influencer > 0 && (
                <div style={{ padding: '10px 12px', background: '#052e16', border: '1px solid #166534', borderRadius: 8, boxSizing: 'border-box' }}>
                  <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#34d399', margin: '0 0 5px' }}>Buget per influencer</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#34d399', margin: 0 }}>{campaign.budget_per_influencer} RON</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 24px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, boxSizing: 'border-box', width: '100%' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Generat de AddFame.ro</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* ── PAGINA 2: CIFRE ── */}
        <div className="report-page">
          <div className="page-header">
            <div>
              <p className="page-section-label">01 · Performanță</p>
              <h2 className="page-title">Cifrele campaniei</h2>
              <p className="page-subtitle">Indicatorii cheie colectați de la influencerii care au livrat conținut.</p>
            </div>
            <span className="page-num-badge">1 / {collabStats.length > 0 ? '4' : '3'}</span>
          </div>
          <div className="page-body">
            {!hasData ? (
              <div className="empty">
                <div className="empty-icon">📊</div>
                <p className="empty-title">Date de performanță indisponibile</p>
                <p className="empty-desc">Adaugă manual statisticile din pagina <strong>Performance</strong>. Raportul se va popula automat pe măsură ce influencerii publică conținut.</p>
              </div>
            ) : (
              <>
                {/* Banner audienta totala */}
                {totalAudience > 0 && (
                  <div style={{ marginBottom: 16, padding: '16px 20px', borderRadius: 14, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Audiență totală atinsă</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa', margin: 0, letterSpacing: '-0.02em' }}>
                        Te-ai adresat unei audiențe de <span style={{ color: 'white' }}>{fmtNum(totalAudience)}</span> urmăritori
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
                        prin {numInfluencers} influencer{numInfluencers !== 1 ? 'i' : ''} · {totalAudience > 0 && totalReach > 0 ? `reach real ${Math.round(totalReach/totalAudience*100)}% din audiență` : 'reach în colectare'}
                      </p>
                    </div>
                    {totalReach > 0 && totalAudience > 0 && (
                      <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>Penetrare</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: '#f97316', margin: 0 }}>{Math.round(totalReach/totalAudience*100)}%</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>din audiența totală</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'linear-gradient(135deg, #7c3aed22, #7c3aed08)' }} />
                    <p className="stat-card-label">Reach total</p>
                    <p className="stat-card-value">{fmtNum(totalReach)}</p>
                    <p className="stat-card-sub">utilizatori unici expuși</p>
                    {totalViews > totalReach && (
                      <span className="stat-card-tag tag-purple">↗ {fmtNum(totalViews)} views totale</span>
                    )}
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'linear-gradient(135deg, #f9731622, #f9731608)' }} />
                    <p className="stat-card-label">Engagement total</p>
                    <p className="stat-card-value">{fmtNum(totalEngagement)}</p>
                    <p className="stat-card-sub">interacțiuni reale</p>
                    {avgER > 1.8 && (
                      <span className="stat-card-tag tag-green">★ ER {avgER.toFixed(1)}% · industrie 1.8%</span>
                    )}
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'linear-gradient(135deg, #06b6d422, #06b6d408)' }} />
                    <p className="stat-card-label">Conținut livrat</p>
                    <p className="stat-card-value">{allPosts.length}</p>
                    <p className="stat-card-sub">{postTypesStr || 'postări create'}</p>
                    {totalUGC > 0 && <span className="stat-card-tag tag-purple">{totalUGC} refolosibile ca UGC</span>}
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'linear-gradient(135deg, #ec489922, #ec489908)' }} />
                    <p className="stat-card-label">Sentiment audiență</p>
                    <p className="stat-card-value">{sentiments.length > 0 ? `${sentimentPct}%` : '—'}</p>
                    <p className="stat-card-sub">{sentiments.length > 0 ? 'feedback pozitiv' : 'nedisponibil'}</p>
                    {sentimentPct >= 90 && <span className="stat-card-tag tag-green">✓ Excelent</span>}
                  </div>
                </div>

                {totalPromoSales > 0 && (
                  <div className="stat-card-wide">
                    <p className="stat-card-label">Vânzări generate via coduri promo</p>
                    <div className="stat-card-wide-content">
                      <div className="stat-mini">
                        <p className="stat-mini-label">Valoare totală</p>
                        <p className="stat-mini-value">{fmtNum(totalPromoSales)} RON</p>
                      </div>
                      <div className="stat-mini">
                        <p className="stat-mini-label">Utilizări cod</p>
                        <p className="stat-mini-value">{totalPromoUses}×</p>
                      </div>
                    </div>
                    <span className="stat-card-tag tag-orange">conversii atribuite</span>
                  </div>
                )}

                {collabStats.filter(c => c.avgEr > 0).length > 0 && (
                  <div className="er-bar-wrap">
                    <p className="er-bar-label">ER per influencer</p>
                    {collabStats.filter(c => c.avgEr > 0).slice(0, 6).map((c, i) => {
                      const maxEr = Math.max(...collabStats.map(x => x.avgEr))
                      const pct = maxEr > 0 ? (c.avgEr / maxEr) * 100 : 0
                      return (
                        <div key={c.id} className="er-bar-row">
                          <span className="er-bar-name">{c.influencers?.name?.split(' ')[0] || 'Inf.'}</span>
                          <div className="er-bar-track">
                            <div style={{ height: '100%', borderRadius: 100, background: '#7c3aed', width: `${pct}%` }} />
                          </div>
                          <span className="er-bar-pct">{c.avgEr.toFixed(1)}%</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── PAGINA 3: INFLUENCERI ── */}
        {collabStats.length > 0 && (
          <div className="report-page">
            <div className="page-header">
              <div>
                <p className="page-section-label">02 · Echipă</p>
                <h2 className="page-title">{collabStats.length} creatori. {allPosts.length} postări.</h2>
                <p className="page-subtitle">Influenceri selectați și performanța individuală.</p>
              </div>
              <span className="page-num-badge">2 / {collabStats.length > 0 ? '4' : '3'}</span>
            </div>
            <div className="page-body">
              <table className="inf-table">
                <tbody>
                  {collabStats.map((c, i) => {
                    const inf = c.influencers
                    const er = c.avgEr
                    const erColor = er > 10 ? '#f97316' : er > 5 ? '#7c3aed' : er > 0 ? '#0ea5e9' : '#cbd5e1'
                    const erBg = er > 10 ? '#fff7ed' : er > 5 ? '#f5f3ff' : er > 0 ? '#f0f9ff' : '#f8fafc'
                    return (
                      <tr key={c.id} className="inf-row">
                        <td style={{ width: 28 }}>
                          <div className={`inf-rank ${i === 0 ? 'inf-rank-1' : ''}`}>{i + 1}</div>
                        </td>
                        <td style={{ width: 46 }}>
                          <div className="inf-avatar">
                            {inf?.avatar
                              ? <img src={inf.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (inf?.name?.[0] || '?')}
                          </div>
                        </td>
                        <td style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{inf?.name || 'Unknown'}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                            {inf?.ig_followers ? `IG ${fmtNum(inf.ig_followers)}` : ''}
                            {inf?.ig_followers && inf?.tt_followers ? ' · ' : ''}
                            {inf?.tt_followers ? `TT ${fmtNum(inf.tt_followers)}` : ''}
                          </p>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{c.postsCount > 0 ? `${fmtNum(c.reach)} reach` : '—'}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{c.postsCount} postări</p>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 20 }}>
                          <span className="inf-er-pill" style={{ background: erBg, color: erColor }}>
                            {er > 0 ? `${er.toFixed(1)}% ER` : 'Fără date'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 28px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "white" }}>AF</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>AddFame.ro</span>
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        )}

        {/* ── PAGINA 4: ECONOMIE ── */}
        <div className="report-page">
          <div className="page-header">
            <div>
              <p className="page-section-label">03 · Economie</p>
              <h2 className="page-title">Cost vs. piață</h2>
              <p className="page-subtitle">Aceeași campanie. Cost zero față de metoda clasică cu agenție.</p>
            </div>
            <span className="page-num-badge">{collabStats.length > 0 ? '4' : '3'} / {collabStats.length > 0 ? '4' : '3'}</span>
          </div>
          <div className="page-body">
            {numInfluencers === 0 ? (
              <div className="empty">
                <div className="empty-icon">💰</div>
                <p className="empty-title">Comparația necesită influenceri activi</p>
                <p className="empty-desc">Trebuie cel puțin un influencer acceptat în campanie pentru a calcula economia față de metoda clasică.</p>
              </div>
            ) : (
              <>
                <div className="economy-split">
                  <div className="econ-card econ-classic">
                    <p className="econ-label econ-label-classic">Metoda clasică</p>
                    <p className="econ-amount econ-amount-classic">{fmtNum(manualTraditionalCost ?? traditionalCost)} RON</p>
                    <p className="econ-desc econ-desc-classic">cu agenție + outreach manual</p>
                    <div className="econ-divider-classic" />
                    {(() => {
                      const total = manualTraditionalCost ?? traditionalCost
                      const base = 12300
                      const scale = (v: number) => Math.round(total * (v / base))
                      const setup = scale(2500)
                      const outreach = scale(1800)
                      const mgmt = scale(3500)
                      const fee = scale(numInfluencers * 800)
                      const raportare = total - setup - outreach - mgmt - fee
                      return [
                        { l: 'Setup & strategie', v: `${fmtNum(setup)} RON` },
                        { l: `Outreach (${numInfluencers} inf.)`, v: `${fmtNum(outreach)} RON` },
                        { l: 'Management', v: `${fmtNum(mgmt)} RON` },
                        { l: `Fee ${numInfluencers}×800`, v: `${fmtNum(fee)} RON` },
                        { l: 'Raportare', v: `${fmtNum(raportare)} RON` },
                      ]
                    })().map(l => (
                      <div key={l.l} className="econ-line econ-line-classic">
                        <span>{l.l}</span><span>{l.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="econ-card econ-addfame">
                    <p className="econ-label econ-label-af">★ Cu AddFame</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                      <input
                        type="number"
                        min={0}
                        value={manualPlatformCost ?? platformCost}
                        onChange={e => setManualPlatformCost(e.target.value ? Number(e.target.value) : 0)}
                        className="no-print-hide"
                        style={{
                          fontSize: 26, fontWeight: 700, color: 'white', background: 'transparent',
                          border: 'none', borderBottom: '1px dashed rgba(255,255,255,0.3)',
                          outline: 'none', width: 120, fontFamily: 'inherit', letterSpacing: '-0.5px'
                        }}
                      />
                      <span className="econ-amount econ-amount-af" style={{ display: 'none' }} id="plat-cost-display">{fmtNum(manualPlatformCost ?? platformCost)}</span>
                      <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>RON</span>
                    </div>
                    <p className="econ-desc econ-desc-af">cost real cu AddFame</p>
                    <div className="econ-divider" />
                    {['Setup & strategie', 'Outreach automat', 'Management', 'Produse barter', 'Raportare'].map(l => (
                      <div key={l} className="econ-line econ-line-af">
                        <span>{l}</span><span>incluse</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '22px 28px', borderRadius: 14, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p className="savings-banner-label">Total economisit cu AddFame</p>
                    <p className="savings-banner-amount">{fmtNum((manualTraditionalCost ?? traditionalCost) - (manualPlatformCost ?? platformCost))} RON · {(manualTraditionalCost ?? traditionalCost) === 0 ? 0 : Math.round(((manualTraditionalCost ?? traditionalCost) - (manualPlatformCost ?? platformCost)) / (manualTraditionalCost ?? traditionalCost) * 100)}%</p>
                  </div>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.8}}>
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '12px 28px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white' }}>AF</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>AddFame.ro</span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
