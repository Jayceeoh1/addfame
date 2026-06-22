'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Search, Check, X, Clock, CheckCircle, Zap,
  RefreshCw, MessageSquare, ExternalLink, AlertCircle,
  Link2, ThumbsUp, ThumbsDown, Eye, Calendar, DollarSign,
  AlertTriangle, ChevronRight, FileText, Download, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { approveApplication, approveDeliverable, rejectDeliverable, cancelCollaboration } from '@/app/actions/collaborations'
import { LeaveReview } from '@/components/shared/leave-review'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: 'Aplicat',     bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  INVITED:   { label: 'Invitat',     bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  ACTIVE:    { label: 'Activ',       bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Finalizat',   bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  REJECTED:  { label: 'Refuzat',     bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  CANCELLED: { label: 'Anulat',      bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400' },
}

function getSubStatus(c: any) {
  if (c.status !== 'ACTIVE') return null
  const now = new Date()
  const isLate = c.package_received_at && !c.deliverable_submitted_at &&
    c.post_deadline_days &&
    (now.getTime() - new Date(c.package_received_at).getTime()) > c.post_deadline_days * 86400000
  if (isLate) return { label: '⏰ Întârziat', cls: 'text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full' }
  if (c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at)
    return { label: '📝 Postat', cls: 'text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full' }
  if (c.package_received_at && !c.deliverable_submitted_at)
    return { label: '📦 La influencer', cls: 'text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full' }
  if (c.package_sent_at && !c.package_received_at)
    return { label: '🚚 Colet trimis', cls: 'text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full' }
  return null
}

const TABS = ['All', 'Applied', 'Invited', 'Active', 'Pending Review', 'Completed', 'Declined'] as const
type Tab = typeof TABS[number]
const TAB_FILTER: Record<Tab, (c: any) => boolean> = {
  'All':            c => true,
  'Applied':        c => c.status === 'PENDING',
  'Invited':        c => c.status === 'INVITED',
  'Active':         c => c.status === 'ACTIVE',
  'Pending Review': c => c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at,
  'Completed':      c => c.status === 'COMPLETED',
  'Declined':       c => c.status === 'REJECTED',
}

// ─── Contract Button ──────────────────────────────────────────────────────────
function generateContractPDF(contractText: string, campaignTitle: string) {
  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <title>Contract — ${campaignTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; color: #1a1a1a; padding: 60px; background: white; font-size: 13px; line-height: 1.8; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #f97316; }
    .logo { font-size: 28px; font-weight: 900; font-family: Arial, sans-serif; }
    .logo span { color: #f97316; }
    .badge { text-align: right; }
    .badge .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; font-family: Arial, sans-serif; }
    .badge .title { font-size: 15px; font-weight: 700; color: #1a1a1a; font-family: Arial, sans-serif; margin-top: 2px; }
    .contract-text { white-space: pre-wrap; font-size: 13px; line-height: 1.9; color: #2d2d2d; }
    .footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; font-family: Arial, sans-serif; }
    @media print { body { padding: 40px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Add<span>Fame</span></div>
    <div class="badge">
      <div class="label">Contract de colaborare</div>
      <div class="title">${campaignTitle}</div>
    </div>
  </div>
  <div class="contract-text">${contractText}</div>
  <div class="footer">Generat automat de platforma AddFame · addfame.ro · contact@addfame.ro</div>
</body>
</html>`

  // Descarca direct ca fisier HTML (se deschide in browser si poate fi salvat ca PDF)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = campaignTitle.replace(/[^a-zA-Z0-9\-_\s]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
  a.download = `contract-addfame-${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function ContractButton({ collabId, campaignTitle }: { collabId: string; campaignTitle?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [contractText, setContractText] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const sb = createClient()
      const { data } = await sb
        .from('contracts')
        .select('id, contract_text')
        .eq('collaboration_id', collabId)
        .maybeSingle()
      if (data?.contract_text) {
        setContractText(data.contract_text)
        setState('done')
      }
    }
    check()
  }, [collabId])

  async function generate() {
    setState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', collaboration_id: collabId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Eroare la generare contract')
        setState('error')
        return
      }
      // Fetch contract_text direct din Supabase
      const sb = createClient()
      const { data: c } = await sb.from('contracts').select('contract_text').eq('collaboration_id', collabId).maybeSingle()
      setContractText(c?.contract_text || '')
      setState('done')
    } catch (e: any) {
      setErrorMsg(e.message || 'Eroare de rețea')
      setState('error')
    }
  }

  if (state === 'done' && contractText) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <FileText className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-bold text-green-700">Contract generat</span>
        </div>
        <button
          onClick={() => generateContractPDF(contractText, campaignTitle || 'Campanie')}
          className="flex items-center gap-1.5 bg-white border-2 border-purple-200 hover:border-purple-400 text-purple-600 hover:bg-purple-50 rounded-xl px-3 py-2 text-xs font-bold transition"
        >
          <Download className="w-3.5 h-3.5" /> Descarcă PDF
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 bg-white border-2 border-purple-200 hover:border-purple-400 text-purple-600 hover:bg-purple-50 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-50"
      >
        {state === 'loading'
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generez…</>
          : <><FileText className="w-3.5 h-3.5" /> Generează contract</>
        }
      </button>
      {state === 'error' && errorMsg && (
        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
      )}
    </div>
  )
}

// ─── Deliverable Review Component ────────────────────────────────────────────
function DeliverableReview({ collab, onUpdated }: { collab: any; onUpdated: (id: string, action: 'approved' | 'rejected') => void }) {
  const [rejReason, setRejReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setLoading(true); setError(null)
    const result = await approveDeliverable(collab.id)
    if (result.error) { setError(result.error); setLoading(false); return }
    onUpdated(collab.id, 'approved')
    setLoading(false)
  }

  async function reject() {
    if (!rejReason.trim()) { setError('Introdu motivul respingerii'); return }
    setLoading(true); setError(null)
    const result = await rejectDeliverable(collab.id, rejReason.trim())
    if (result.error) { setError(result.error); setLoading(false); return }
    onUpdated(collab.id, 'rejected')
    setLoading(false)
    setShowReject(false)
  }

  const submittedAt = collab.deliverable_submitted_at
    ? new Date(collab.deliverable_submitted_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-orange-200">
      <div className="bg-orange-50 px-4 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-xs font-black text-orange-700 uppercase tracking-wider flex-1">Dovadă post trimisă de influencer</p>
        <span className="text-xs text-gray-400">{submittedAt}</span>
      </div>

      <div className="bg-white p-4 space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Link post public</p>
            <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold text-orange-600 hover:text-orange-800 underline truncate block">
              {collab.deliverable_url}
            </a>
          </div>
          <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
            <Eye className="w-3.5 h-3.5" /> Verifică
          </a>
        </div>

        {collab.ads_code && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1.5">
              🎯 Cod Spark Ads / Partnership Ads
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-black text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                {collab.ads_code}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(collab.ads_code)}
                className="text-xs font-bold text-blue-500 hover:text-blue-700 transition px-2 py-1.5 rounded-lg hover:bg-blue-100"
              >
                Copiază
              </button>
            </div>
            <p className="text-[10px] text-blue-500 mt-1.5">
              Folosește acest cod în TikTok Ads Manager (Spark Ads) sau Meta Ads Manager (Partnership Ads) pentru a promova postul influencerului.
            </p>
          </div>
        )}

        {collab.deliverable_note && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">Notă de la influencer</p>
            <p className="text-sm text-gray-600 italic">„{collab.deliverable_note}"</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        {showReject && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-black text-red-700">Motivul respingerii</p>
            <textarea value={rejReason} onChange={e => { setRejReason(e.target.value); setError(null) }}
              placeholder="Ex: Postul nu conține hashtag-ul #brand, nu respectă cerințele convenite..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border-2 border-red-200 bg-white text-sm outline-none focus:border-red-400 transition resize-none"
              style={{ fontFamily: 'inherit' }} />
            <div className="flex gap-2">
              <button onClick={reject} disabled={loading}
                className="flex-1 py-2 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                Respinge & cere retrimitere
              </button>
              <button onClick={() => { setShowReject(false); setRejReason('') }}
                className="px-4 py-2 rounded-xl font-bold text-sm text-gray-600 bg-white border-2 border-gray-200 hover:border-gray-300 transition">
                Anulează
              </button>
            </div>
          </div>
        )}

        {!showReject && (
          <div className="flex gap-2">
            <button onClick={approve} disabled={loading}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 12px rgba(34,197,94,.3)' }}>
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <ThumbsUp className="w-4 h-4" />
              }
              {loading ? 'Se procesează…' : 'Aprobă & Eliberează plata'}
            </button>
            <button onClick={() => setShowReject(true)} disabled={loading}
              className="px-4 py-3 rounded-xl font-bold text-sm text-red-600 bg-white border-2 border-red-200 hover:border-red-300 hover:bg-red-50 flex items-center gap-2 transition disabled:opacity-50">
              <ThumbsDown className="w-4 h-4" /> Respinge
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrandCollaborations() {
  const [collabs, setCollabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [brandBalance, setBrandBalance] = useState<{ available: number; reserved: number } | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: brand } = await sb.from('brands').select('id, credits_balance, credits_reserved').eq('user_id', user.id).single()
      if (brand) {
        setBrandBalance({
          available: Math.max(0, (brand.credits_balance || 0) - (brand.credits_reserved || 0)),
          reserved: brand.credits_reserved || 0,
        })
      }
      if (!brand) return
      const { data: camps } = await sb.from('campaigns').select('id, title, budget').eq('brand_id', brand.id)
      const campIds = (camps || []).map((c: any) => c.id)
      const campMap = Object.fromEntries((camps || []).map((c: any) => [c.id, c]))
      if (campIds.length === 0) { setCollabs([]); setLoading(false); return }
      const { data: colls } = await sb
        .from('collaborations')
        .select('*, reserved_amount, payment_amount, delivery_name, delivery_phone, delivery_address, delivery_city, delivery_county, delivery_postal_code, package_sent_at, package_tracking, package_courier, package_received_at, post_deadline_days, package_history')
        .in('campaign_id', campIds)
        .order('created_at', { ascending: false })
      if (colls && colls.length > 0) {
        const infIds = [...new Set(colls.map((c: any) => c.influencer_id).filter(Boolean))]
        const { data: infs } = await sb
          .from('influencers')
          .select('id, name, avatar, niches, platforms, country, avg_rating, review_count')
          .in('id', infIds as string[])
        const infMap = Object.fromEntries((infs || []).map((i: any) => [i.id, i]))
        setCollabs(colls.map((c: any) => ({
          ...c,
          influencer: infMap[c.influencer_id] || null,
          campaign: campMap[c.campaign_id] || null,
        })))
      } else setCollabs([])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function doAction(collabId: string, status: 'ACTIVE' | 'REJECTED') {
    setActionId(collabId)
    try {
      if (status === 'ACTIVE') {
        const result = await approveApplication(collabId) as any
        if (result.error) {
          if (result.insufficientFunds) {
            notify(`❌ Sold insuficient! Disponibil: ${result.available?.toLocaleString('ro-RO')} RON, necesar: ${result.required?.toLocaleString('ro-RO')} RON. Adaugă credite în wallet.`, false)
          } else {
            notify(result.error, false)
          }
          return
        }
        setCollabs(p => p.map(c => c.id === collabId ? { ...c, status, reserved_amount: result.reservedAmount } : c))
        notify(`🔒 Aprobat! ${result.reservedAmount?.toLocaleString('ro-RO')} RON rezervați escrow — influencerul știe că plata e garantată.`)
      } else {
        const sb = createClient()
        const { error } = await sb.from('collaborations').update({ status }).eq('id', collabId)
        if (error) throw error
        setCollabs(p => p.map(c => c.id === collabId ? { ...c, status } : c))
        notify('Aplicație refuzată.')
      }
    } catch (e: any) { notify(e.message || 'Ceva a mers greșit.', false) }
    finally { setActionId(null) }
  }

  function handleDeliverableUpdate(collabId: string, action: 'approved' | 'rejected') {
    if (action === 'approved') {
      setCollabs(p => p.map(c => c.id === collabId ? { ...c, status: 'COMPLETED', deliverable_approved_at: new Date().toISOString() } : c))
      notify('✅ Plată eliberată! Colaborare finalizată cu succes.')
    } else {
      setCollabs(p => p.map(c => c.id === collabId ? { ...c, deliverable_url: null, deliverable_submitted_at: null, deliverable_rejected_at: new Date().toISOString() } : c))
      notify('Post respins. Influencerul va retrimite dovada.', false)
    }
    setExpandedId(null)
  }

  const [packageModal, setPackageModal] = useState<string | null>(null)
  const [trackingNum, setTrackingNum] = useState('')
  const [courierName, setCourierName] = useState('')
  const [packageLoading, setPackageLoading] = useState(false)
  const [awbModal, setAwbModal] = useState<string | null>(null)
  const [awbWeight, setAwbWeight] = useState('0.5')
  const [awbCarrierId, setAwbCarrierId] = useState<number | null>(null)
  const [awbServiceId, setAwbServiceId] = useState<number | null>(null)
  const [awbPrices, setAwbPrices] = useState<any[]>([])
  const [awbPriceLoading, setAwbPriceLoading] = useState(false)
  const [awbCreating, setAwbCreating] = useState(false)
  const [awbResult, setAwbResult] = useState<any>(null)
  const [awbError, setAwbError] = useState('')
  const [problemModal, setProblemModal] = useState<any | null>(null)
  const [problemReason, setProblemReason] = useState('')
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({})

  async function markPackageSent(collabId: string) {
    setPackageLoading(true)
    try {
      const sb = createClient()
      const { error } = await sb.from('collaborations').update({
        package_sent_at: new Date().toISOString(),
        package_tracking: trackingNum || null,
        package_courier: courierName || null,
      }).eq('id', collabId)
      if (error) throw error
      setCollabs(p => p.map(c => c.id === collabId ? {
        ...c,
        package_sent_at: new Date().toISOString(),
        package_tracking: trackingNum,
        package_courier: courierName,
      } : c))
      // Notifica influencerul
      const collab = collabs.find(c => c.id === collabId)
      if (collab) {
        const { data: inf } = await sb.from('influencers').select('user_id').eq('id', collab.influencer_id).single()
        if (inf?.user_id) {
          await sb.from('notifications').insert({
            user_id: inf.user_id,
            title: '📦 Pachetul tău a fost trimis!',
            body: `${courierName ? `${courierName}${trackingNum ? ` · AWB: ${trackingNum}` : ''}` : 'Coletul este în drum spre tine'}. Confirmă primirea când ajunge!`,
            link: '/influencer/collaborations',
            read: false,
          })
        }
      }
      setPackageModal(null)
      setTrackingNum('')
      setCourierName('')
      notify('📦 Pachetul a fost marcat ca trimis! Influencerul a fost notificat.')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setPackageLoading(false) }
  }

  async function fetchAwbPrices(collabId: string, weight: string) {
    const collab = collabs.find(c => c.id === collabId)
    if (!collab?.delivery_postal_code) { setAwbError('Codul poștal al influencerului lipsește.'); return }
    setAwbPriceLoading(true); setAwbError(''); setAwbPrices([]); setAwbCarrierId(null); setAwbServiceId(null)
    try {
      // Citeste adresa expeditorului pentru calcul pret
      const sb2 = createClient()
      const { data: { user: u2 } } = await sb2.auth.getUser()
      let fromPostal = ''
      if (u2) {
        const { data: brandData } = await sb2.from('brands').select('settings').eq('user_id', u2.id).single()
        fromPostal = brandData?.settings?.shipping_address?.postal_code || ''
      }
      const priceUrl = `/api/eawb?action=price&to_postal=${collab.delivery_postal_code}&weight=${weight || '0.5'}${fromPostal ? `&from_postal=${fromPostal}` : ''}`
      const res = await fetch(priceUrl)
      const data = await res.json()
      if (!res.ok || data.error) { setAwbError(data.error || 'Eroare prețuri'); return }
      setAwbPrices(data.data || data || [])
    } catch { setAwbError('Eroare conexiune') }
    finally { setAwbPriceLoading(false) }
  }

  async function createAwbOrder(collabId: string) {
    const collab = collabs.find(c => c.id === collabId)
    if (!collab || !awbCarrierId || !awbServiceId) return
    setAwbCreating(true); setAwbError('')
    try {
      // Citeste adresa expeditorului din brand settings
      const sb2 = createClient()
      const { data: { user: u2 } } = await sb2.auth.getUser()
      let sender: any = {}
      if (u2) {
        const { data: brandData } = await sb2.from('brands').select('settings').eq('user_id', u2.id).single()
        sender = brandData?.settings?.shipping_address || {}
      }
      const res = await fetch('/api/eawb', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', carrier_id: awbCarrierId, service_id: awbServiceId,
          billing_address_id: 1,
          from_contact: sender.contact || '', from_phone: sender.phone || '',
          from_email: sender.email || '', from_street: sender.street || '',
          from_street_number: sender.street_number || '1',
          from_postal_code: sender.postal_code || '', from_locality_name: sender.city || '',
          from_county_name: sender.county || '',
          to_contact: collab.delivery_name, to_phone: collab.delivery_phone,
          to_street: collab.delivery_address, to_street_number: '0',
          to_postal_code: collab.delivery_postal_code || '',
          to_locality_name: collab.delivery_city, to_county_name: collab.delivery_county,
          weight: awbWeight, parcel_content: 'Produs barter AddFame',
          internal_identifier: collabId, sms_recipient: true,
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) { setAwbError(data.error || 'Eroare AWB'); return }
      setAwbResult(data.data || data)
      const sb = createClient()
      const awbNum = data.data?.awb_number || data.awb_number
      const carrier = data.data?.carrier || ''
      await sb.from('collaborations').update({
        package_sent_at: new Date().toISOString(),
        package_tracking: awbNum, package_courier: carrier,
      }).eq('id', collabId)
      setCollabs(p => p.map(c => c.id === collabId ? { ...c, package_sent_at: new Date().toISOString(), package_tracking: awbNum, package_courier: carrier } : c))
      const { data: inf } = await sb.from('influencers').select('user_id').eq('id', collab.influencer_id).single()
      if (inf?.user_id) {
        await sb.from('notifications').insert({
          user_id: inf.user_id, title: '📦 Coletul tău a fost expediat!',
          body: `${carrier} · AWB: ${awbNum}. Countdown de postare pornit!`,
          link: '/influencer/collaborations', read: false,
        })
      }
      notify('✅ AWB generat! Coletul e marcat ca trimis.')
    } catch (e: any) { setAwbError(e.message || 'Eroare') }
    finally { setAwbCreating(false) }
  }

  async function reportPackageProblem(collabId: string, reason: string) {
    const collab = collabs.find(c => c.id === collabId)
    if (!collab) return
    const sb = createClient()
    const now = new Date().toISOString()

    // Salveaza AWB-ul curent in istoric
    const currentEntry = {
      awb: collab.package_tracking,
      courier: collab.package_courier,
      sent_at: collab.package_sent_at,
      problem: reason,
      problem_reported_at: now,
    }
    const history = Array.isArray(collab.package_history) ? collab.package_history : []
    const newHistory = [...history, currentEntry]

    // Reseteaza campul curent pentru a permite un nou colet
    await sb.from('collaborations').update({
      package_tracking: null,
      package_courier: null,
      package_sent_at: null,
      package_received_at: null,
      package_history: newHistory,
    }).eq('id', collabId)

    setCollabs(p => p.map(c => c.id === collabId ? {
      ...c,
      package_tracking: null, package_courier: null,
      package_sent_at: null, package_received_at: null,
      package_history: newHistory,
    } : c))

    setProblemModal(null)
    setProblemReason('')

    // Notifica influencerul
    if (collab.influencer?.user_id) {
      await sb.from('notifications').insert({
        user_id: collab.influencer.user_id,
        title: '📦 Se trimite un nou colet',
        body: `A apărut o problemă cu coletul anterior (${reason}). Un nou colet va fi expediat în curând.`,
        link: '/influencer/collaborations', read: false,
      })
    }
  }

  const pendingReviews = collabs.filter(c =>
    c.status === 'ACTIVE' && c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
  ).length

  const counts: Record<Tab, number> = {
    'All':            collabs.length,
    'Applied':        collabs.filter(c => c.status === 'PENDING').length,
    'Invited':        collabs.filter(c => c.status === 'INVITED').length,
    'Active':         collabs.filter(c => c.status === 'ACTIVE').length,
    'Pending Review': pendingReviews,
    'Completed':      collabs.filter(c => c.status === 'COMPLETED').length,
    'Declined':       collabs.filter(c => c.status === 'REJECTED').length,
  }

  const visible = collabs.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.influencer?.name?.toLowerCase().includes(q) || c.campaign?.title?.toLowerCase().includes(q)
    return matchQ && TAB_FILTER[tab](c)
  })

  // Grupare pe campanie
  const grouped: Record<string, { campaign: any; collabs: any[] }> = visible.reduce((acc: Record<string, { campaign: any; collabs: any[] }>, c) => {
    const cid = c.campaign_id || 'unknown'
    if (!acc[cid]) acc[cid] = { campaign: c.campaign, collabs: [] }
    acc[cid].collabs.push(c)
    return acc
  }, {})
  const groupedList = Object.entries(grouped).sort(([, a], [, b]) => {
    const aUnsent = a.collabs.filter(c => c.status === 'ACTIVE' && !c.package_sent_at).length
    const bUnsent = b.collabs.filter(c => c.status === 'ACTIVE' && !c.package_sent_at).length
    return bUnsent - aUnsent
  })

  const toggleCampaign = (cid: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(cid)) next.delete(cid)
      else next.add(cid)
      return next
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .tab-btn { padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;white-space:nowrap;font-family:inherit;transition:all .15s; }
        .tab-btn.on { background:linear-gradient(135deg,#f97316,#ec4899);color:white;box-shadow:0 3px 10px rgba(249,115,22,.3); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#fff7ed;color:#ea580c; }
        .field { padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;width:100%; }
        .field:focus { border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.08); }
        .btn-approve { display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .15s;font-family:inherit; }
        .btn-approve:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 3px 10px rgba(34,197,94,.3); }
        .btn-red { display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:700;background:white;color:#ef4444;border:2px solid #fca5a5;cursor:pointer;transition:all .15s;font-family:inherit; }
        .btn-red:hover:not(:disabled) { background:#fff5f5;border-color:#ef4444; }
        button:disabled { opacity:.5;cursor:not-allowed;transform:none!important; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
      `}</style>

      {/* Modal — Marchează pachet trimis */}
      {/* ── Modal Problemă colet ── */}
      {problemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">⚠️ Problemă cu coletul</h2>
                <p className="text-xs text-gray-400 mt-0.5">{problemModal.influencer?.name}</p>
              </div>
              <button onClick={() => setProblemModal(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* AWB curent */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Colet curent</p>
                <p className="text-sm font-bold text-gray-800">{problemModal.package_courier} · AWB: {problemModal.package_tracking || '—'}</p>
                <p className="text-xs text-gray-500">Trimis: {problemModal.package_sent_at ? new Date(problemModal.package_sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : '—'}</p>
              </div>

              {/* Motiv */}
              <div>
                <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Care e problema?</p>
                <div className="space-y-2">
                  {[
                    { id: 'lost', label: '📦 Colet pierdut de curier', sub: 'AWB-ul nu mai are actualizări de câteva zile' },
                    { id: 'damaged', label: '💔 Produs deteriorat la livrare', sub: 'Influencerul a primit produsul stricat' },
                    { id: 'returned', label: '↩️ Colet returnat la expeditor', sub: 'Influencerul nu a ridicat sau adresa era greșită' },
                    { id: 'wrong', label: '🔄 Produs greșit trimis', sub: 'Am trimis un alt produs decât cel din campanie' },
                    { id: 'other', label: '❓ Altul', sub: 'Altă problemă nespecificată' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setProblemReason(opt.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl border-2 transition text-left ${problemReason === opt.id ? 'border-red-400 bg-red-50' : 'border-gray-100 hover:border-red-200 hover:bg-red-50/30'}`}>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                      </div>
                      {problemReason === opt.id && <span className="text-red-500 font-black mt-0.5">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {problemReason && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs text-amber-700 font-semibold">
                  ℹ️ AWB-ul curent va fi salvat în istoricul colaborării. Vei putea genera un nou AWB imediat după confirmare.
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setProblemModal(null)}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                  Anulează
                </button>
                <button onClick={() => reportPackageProblem(problemModal.id, problemReason)} disabled={!problemReason}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition">
                  Confirmă problema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal AWB eAWB ── */}
      {awbModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">📦 Generează AWB eAWB</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {collabs.find(c => c.id === awbModal)?.delivery_name} · {collabs.find(c => c.id === awbModal)?.delivery_city}
                </p>
              </div>
              <button onClick={() => setAwbModal(null)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {awbResult ? (
                // ── Succes ──
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="font-black text-gray-900 mb-1">AWB generat cu succes!</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 mb-4">
                    <p className="text-sm"><span className="text-gray-400">AWB:</span> <strong className="font-black text-indigo-700 text-lg tracking-wider">{awbResult.awb_number}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Curier:</span> <strong>{awbResult.carrier}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Preț:</span> <strong>{awbResult.price?.total} {awbResult.price?.currency}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Livrare estimată:</span> <strong>{awbResult.estimated_delivery_date}</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <a href={`/api/eawb?action=label&order_id=${awbResult.order_id}`} target="_blank"
                      className="flex-1 py-3 rounded-2xl font-black text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition text-center">
                      🖨️ Descarcă AWB PDF
                    </a>
                    <button onClick={() => setAwbModal(null)}
                      className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-green-600 hover:bg-green-700 transition">
                      Gata ✓
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Greutate */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Greutate colet (kg)</label>
                    <div className="flex gap-2">
                      {['0.5', '1', '2', '5'].map(w => (
                        <button key={w} onClick={() => setAwbWeight(w)}
                          className={`flex-1 py-2 rounded-xl text-sm font-black transition ${awbWeight === w ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {w} kg
                        </button>
                      ))}
                      <input type="number" step="0.1" min="0.1" value={awbWeight}
                        onChange={e => setAwbWeight(e.target.value)}
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-400" />
                    </div>
                  </div>

                  {/* Buton obține prețuri */}
                  {awbPrices.length === 0 && !awbPriceLoading && (
                    <button onClick={() => fetchAwbPrices(awbModal!, awbWeight)}
                      className="w-full py-3 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition">
                      🔍 Vezi prețuri curieri
                    </button>
                  )}

                  {awbPriceLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
                      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                      Se obțin prețurile...
                    </div>
                  )}

                  {/* Lista prețuri */}
                  {awbPrices.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Alege curierul</p>
                      <div className="space-y-2">
                        {awbPrices.map((p: any) => (
                          <button key={`${p.carrier_id}-${p.service_id}`}
                            onClick={() => { setAwbCarrierId(p.carrier_id); setAwbServiceId(p.service_id) }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition ${awbCarrierId === p.carrier_id && awbServiceId === p.service_id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                            <div className="text-left">
                              <p className="font-black text-sm text-gray-900">{p.carrier}</p>
                              <p className="text-xs text-gray-400">{p.service_name} · {p.estimated_delivery_date || 'Standard'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-indigo-700">{p.price?.total} RON</p>
                              {awbCarrierId === p.carrier_id && awbServiceId === p.service_id && (
                                <span className="text-xs text-indigo-500">✓ Selectat</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {awbError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-bold">
                      ⚠ {awbError}
                    </div>
                  )}

                  {/* Buton generează */}
                  {awbCarrierId && awbServiceId && (
                    <button onClick={() => createAwbOrder(awbModal!)} disabled={awbCreating}
                      className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {awbCreating
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Se generează AWB...</>
                        : <><span>📦</span> Generează AWB & trimite coletul</>
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {packageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚚</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 text-center mb-1">Marchează pachetul ca trimis</h2>
            <p className="text-sm text-gray-500 text-center mb-5">Influencerul va primi o notificare că pachetul e în drum.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Curier</label>
                <input value={courierName} onChange={e => setCourierName(e.target.value)}
                  placeholder="ex. Fan Courier, DPD, Cargus..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-400 transition" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Număr AWB <span className="text-gray-400">(opțional)</span></label>
                <input value={trackingNum} onChange={e => setTrackingNum(e.target.value)}
                  placeholder="ex. RO123456789"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-400 transition" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setPackageModal(null); setTrackingNum(''); setCourierName('') }}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={() => markPackageSent(packageModal)} disabled={packageLoading}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {packageLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '🚚'}
                Confirmă trimiterea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Colaborări</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {counts.Applied > 0 && <span className="text-amber-600 font-bold">{counts.Applied} aplicate · </span>}
            {pendingReviews > 0 && <span className="text-orange-600 font-bold">{pendingReviews} de revizuit · </span>}
            {collabs.length} total
          </p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-orange-500 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alert: sold scăzut */}
      {brandBalance !== null && brandBalance.available < 50 && (
        <div className="mb-5 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-4 fade-up">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-lg">RON</span>
          </div>
          <div className="flex-1">
            <p className="font-black text-amber-800 text-sm">
              {brandBalance.available <= 0 ? '❌ Sold insuficient pentru a aproba aplicații' : `⚠️ Sold disponibil scăzut: ${brandBalance.available.toFixed(2)} RON`}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {brandBalance.reserved > 0 && `${brandBalance.reserved.toFixed(2)} RON rezervați escrow · `}
              Adaugă credite pentru a putea aproba aplicațiile influencerilor.
            </p>
          </div>
          <a href="/brand/wallet" className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 transition">
            Adaugă credite →
          </a>
        </div>
      )}

      {/* Alert: posturi de revizuit */}
      {pendingReviews > 0 && (
        <div className="mb-5 bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex items-center gap-4 fade-up">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 4px 12px rgba(249,115,22,.35)' }}>
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-orange-800">
              {pendingReviews} post{pendingReviews > 1 ? 'uri' : ''} trimis{pendingReviews > 1 ? 'e' : ''} — verifică și aprobă
            </p>
            <p className="text-sm text-orange-600 mt-0.5">
              Influencer{pendingReviews > 1 ? 'ii au' : 'ul a'} trimis dovada postului. Verifică linkul și eliberează plata.
            </p>
          </div>
          <button onClick={() => setTab('Pending Review')}
            className="px-4 py-2.5 rounded-xl font-black text-sm text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            Revizuiește →
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-5 fade-up" style={{ animationDelay: '.05s' }}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="field" placeholder="Caută după influencer sau campanie…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(Object.keys(TAB_FILTER) as Tab[]).map(t => (
            <button key={t} className={`tab-btn flex-shrink-0 ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t}
              {counts[t] > 0 && (
                <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/25 text-white' : t === 'Pending Review' ? 'bg-orange-200 text-orange-700' : 'bg-gray-200 text-gray-500'}`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle view */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <p className="text-xs text-gray-400 font-semibold">{visible.length} colaborări</p>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setViewMode('list')}
            className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            ☰ Listă
          </button>
          <button onClick={() => setViewMode('grouped')}
            className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'grouped' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            📁 Pe campanie
          </button>
        </div>
      </div>

      {/* Grouped view */}
      {viewMode === 'grouped' && !loading && (
        <div className="space-y-3 fade-up" style={{ animationDelay: '.1s' }}>
          {groupedList.length === 0 ? (
            <div className="card text-center py-16">
              <p className="font-bold text-gray-400">Niciun rezultat</p>
            </div>
          ) : groupedList.map(([campaignId, group]) => {
            const isOpen = expandedCampaigns.has(campaignId)
            const unsentCount = group.collabs.filter(c => c.status === 'ACTIVE' && !c.package_sent_at && c.delivery_name).length
            const isBarter = group.collabs.some(c => c.campaign?.campaign_type === 'BARTER')
            return (
              <div key={campaignId} className="card overflow-hidden">
                {/* Campaign header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition select-none"
                  onClick={() => toggleCampaign(campaignId)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{group.campaign?.title?.replace(/^\[Barter\]\s*/i, '') || 'Campanie'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isBarter && <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Barter</span>}
                      <span className="text-xs text-gray-400">{group.collabs.length} colaborări</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {unsentCount > 0 ? (
                      <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                        📦 {unsentCount} colete netrimise
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Toate trimise</span>
                    )}
                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Influencers list */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    {group.collabs.map(c => {
                      const inf = c.influencer
                      const isActive = c.status === 'ACTIVE'
                      const hasPending = isActive && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
                      const noPackage = isActive && !c.package_sent_at && c.delivery_name
                      const packageSent = isActive && !!c.package_sent_at && !c.package_received_at
                      const packageReceived = isActive && !!c.package_received_at
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.PENDING
                      return (
                        <div key={c.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${hasPending ? 'bg-orange-50/60' : ''}`}>
                          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {inf?.avatar
                              ? <img src={inf.avatar} className="w-full h-full object-cover" alt={inf.name} />
                              : <span className="font-black text-orange-500 text-xs">{inf?.name?.[0]?.toUpperCase() || '?'}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900 truncate">{inf?.name || '—'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                              {c.delivery_city && <span className="text-[10px] text-gray-400">{c.delivery_city}</span>}
                              {hasPending && <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full animate-pulse">Post trimis ⚡</span>}
                              {packageSent && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">🚚 {c.package_courier || 'În drum'} · {c.package_tracking}</span>}
                              {packageReceived && <span className="text-[10px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✅ Primit</span>}
                              {(() => { const sub = getSubStatus(c); return sub ? <span className={sub.cls}>{sub.label}</span> : null })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">

                            {hasPending && (
                              <button onClick={() => { setExpandedId(c.id); setViewMode('list') }}
                                className="text-[11px] font-black text-orange-700 bg-orange-100 hover:bg-orange-200 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                                ✓ Aprobă post
                              </button>
                            )}
                            <button onClick={() => { setExpandedId(c.id); setViewMode('list') }}
                              className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg transition">
                              ···
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* List */}
      <div className={`space-y-3 fade-up ${viewMode !== 'list' ? 'hidden' : ''}`} style={{ animationDelay: '.1s' }}>
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-400">{collabs.length === 0 ? 'Nicio colaborare încă' : 'Niciun rezultat'}</p>
            {collabs.length === 0 && <p className="text-xs text-gray-300 mt-1">Publică o campanie pentru a primi aplicații</p>}
          </div>
        ) : (
          visible.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.PENDING
            const busy = actionId === c.id
            const inf = c.influencer
            const isExpanded = expandedId === c.id
            const hasPendingDeliverable = c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at

            return (
              <div key={c.id}
                className={`card overflow-hidden transition-all ${hasPendingDeliverable ? 'border-orange-300 ring-2 ring-orange-100' : ''}`}>

                {/* Row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/60 transition"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {inf?.avatar
                      ? <img src={inf.avatar} className="w-full h-full object-cover" alt={inf.name} />
                      : <span className="font-black text-orange-500 text-sm">{inf?.name?.[0]?.toUpperCase() || '?'}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-sm text-gray-900">{inf?.name || 'Unknown'}</p>
                      {/* Rating influencer */}
                      {inf?.avg_rating > 0 && (
                        <span className="text-xs text-amber-500 font-bold">⭐ {inf.avg_rating.toFixed(1)}</span>
                      )}
                      {hasPendingDeliverable && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Post trimis
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-400">
                      <span>{c.campaign?.title || '—'}</span>
                      {inf?.country && <><span className="text-gray-200">·</span><span>{inf.country}</span></>}
                      <span className="text-gray-200">·</span>
                      <span>{new Date(c.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.status === 'ACTIVE' && c.reserved_amount ? (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        🔒 Plată garantată
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        ✅ Finalizat
                      </span>
                    ) : null}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${hasPendingDeliverable ? 'bg-orange-50 text-orange-700' : `${cfg.bg} ${cfg.text}`}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${hasPendingDeliverable ? 'bg-orange-500 animate-pulse' : cfg.dot}`} />
                      {hasPendingDeliverable ? 'Revizuire' : cfg.label}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>Aplicat: {new Date(c.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                      {c.campaign?.title && (
                        <Link href={`/brand/campaigns/${c.campaign_id}`}
                          className="font-bold text-orange-500 hover:underline flex items-center gap-1">
                          Campania <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {inf?.niches?.length > 0 && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                          {inf.niches.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Mesaj aplicație */}
                    {c.message && c.status === 'PENDING' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">Mesaj de la influencer</p>
                        <p className="text-sm text-gray-600 italic">„{c.message}"</p>
                      </div>
                    )}

                    {/* Adresa de livrare - barter cu delivery */}
                    {c.delivery_name && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-2">📦 Adresă livrare produs</p>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-gray-800">{c.delivery_name}</p>
                          <p className="text-sm text-gray-600">📞 {c.delivery_phone}</p>
                          <p className="text-sm text-gray-600">🏠 {c.delivery_address}</p>
                          <p className="text-sm text-gray-600">📍 {c.delivery_city}, {c.delivery_county}{c.delivery_postal_code ? `, ${c.delivery_postal_code}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => navigator.clipboard.writeText(`${c.delivery_name}\n${c.delivery_phone}\n${c.delivery_address}\n${c.delivery_city}, ${c.delivery_county} ${c.delivery_postal_code || ''}`)}
                            className="text-[10px] font-black text-orange-600 hover:text-orange-800 transition">
                            📋 Copiază adresa
                          </button>
                          {!c.package_sent_at && c.status === 'ACTIVE' && (
                            <button onClick={() => setPackageModal(c.id)}
                              className="ml-auto text-[11px] font-black text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition">
                              🚚 Marchează ca trimis
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status livrare pachet */}
                    {/* Status colet activ */}
                    {c.package_sent_at && (
                      <div className={`rounded-xl p-3 border ${c.package_received_at ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${c.package_received_at ? 'text-green-600' : 'text-blue-600'}`}>
                            {c.package_received_at ? '✅ Colet primit de influencer' : '🚚 Pachet în drum'}
                          </p>
                          {!c.package_received_at && (
                            <button onClick={() => { setProblemModal(c); setProblemReason('') }}
                              className="text-[10px] font-black text-red-500 bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-0.5 rounded-full transition whitespace-nowrap flex-shrink-0">
                              ⚠️ Problemă?
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600">Trimis: {new Date(c.package_sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}</p>
                          {c.package_courier && <p className="text-xs text-gray-600">Curier: <span className="font-bold">{c.package_courier}</span></p>}
                          {c.package_tracking && <p className="text-xs font-bold text-blue-600">AWB: {c.package_tracking}</p>}
                          {c.package_received_at && (
                            <p className="text-xs text-green-700 font-bold">
                              Primit: {new Date(c.package_received_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
                              {' · '}Deadline post: {new Date(new Date(c.package_received_at).getTime() + (c.post_deadline_days || 5) * 86400000).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Istoric expedieri */}
                    {Array.isArray(c.package_history) && c.package_history.length > 0 && (
                      <div>
                        <button onClick={() => setShowHistory(p => ({ ...p, [c.id]: !p[c.id] }))}
                          className="text-[10px] font-black text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1 transition">
                          📋 Istoric expedieri ({c.package_history.length})
                          <span>{showHistory[c.id] ? '▲' : '▼'}</span>
                        </button>
                        {showHistory[c.id] && (
                          <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                            {c.package_history.map((h: any, i: number) => (
                              <div key={i} className="bg-gray-50 rounded-xl p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-black text-gray-500">Expediere #{i + 1}</p>
                                  <p className="text-[10px] text-gray-400">{h.sent_at ? new Date(h.sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '—'}</p>
                                </div>
                                {h.courier && <p className="text-xs text-gray-600">Curier: <span className="font-bold">{h.courier}</span></p>}
                                {h.awb && <p className="text-xs font-bold text-blue-600">AWB: {h.awb}</p>}
                                {h.problem && (
                                  <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ {h.problem}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Aprobă / Refuză aplicație */}
                    {c.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button className="btn-approve" onClick={() => doAction(c.id, 'ACTIVE')} disabled={busy}>
                          {busy ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Aprobă aplicația
                        </button>
                        <button className="btn-red" onClick={() => doAction(c.id, 'REJECTED')} disabled={busy}>
                          <X className="w-3.5 h-3.5" /> Refuză
                        </button>
                      </div>
                    )}

                    {/* Activ — contract + așteptare deliverable */}
                    {c.status === 'ACTIVE' && !hasPendingDeliverable && !c.deliverable_rejected_at && (
                      <div className="space-y-2">
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
                          <p className="text-xs text-purple-700 font-semibold flex-1">
                            Așteptăm ca influencerul să trimită dovada postului…
                          </p>
                        </div>
                        {/* Buton contract */}
                        <ContractButton collabId={c.id} campaignTitle={c.campaign?.title || c.campaigns?.title} />
                      </div>
                    )}

                    {/* Activ — post respins, așteptare retrimitere */}
                    {c.status === 'ACTIVE' && !!c.deliverable_rejected_at && !c.deliverable_submitted_at && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-black text-red-700">Post respins — așteptăm retrimitere</p>
                          {c.deliverable_rejection_reason && (
                            <p className="text-xs text-red-600 mt-0.5">Motiv: „{c.deliverable_rejection_reason}"</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Deliverable review */}
                    {hasPendingDeliverable && (
                      <DeliverableReview collab={c} onUpdated={handleDeliverableUpdate} />
                    )}

                    {/* Completat — post aprobat + review */}
                    {c.status === 'COMPLETED' && (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <p className="text-xs font-black text-green-700 flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4" /> Colaborare finalizată
                          </p>
                          {c.deliverable_url && (
                            <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-white border border-green-200 rounded-xl p-2.5 hover:bg-green-50 transition group">
                              <Link2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              <span className="text-xs font-bold text-green-700 truncate flex-1">{c.deliverable_url}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-green-600 transition" />
                            </a>
                          )}
                          {c.payment_amount && (
                            <p className="text-xs text-gray-400 mt-2">
                              Plată eliberată: <span className="font-bold text-green-600">{c.payment_amount.toLocaleString('ro-RO')} RON</span>
                              {c.deliverable_approved_at && ` · ${new Date(c.deliverable_approved_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </p>
                          )}
                        </div>

                        {/* Review brand → influencer */}
                        <LeaveReview
                          collaborationId={c.id}
                          reviewerRole="brand"
                          targetName={inf?.name ?? 'influencer'}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
