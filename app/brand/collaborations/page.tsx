'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Search, Check, X, Clock, CheckCircle, Zap,
  RefreshCw, MessageSquare, ExternalLink, AlertCircle,
  Link2, ThumbsUp, ThumbsDown, Eye, Calendar, DollarSign,
  AlertTriangle, ChevronRight, FileText, Download, Loader2, Truck, Star, Play
} from 'lucide-react'
import Link from 'next/link'
import { approveApplication, approveDeliverable, rejectDeliverable, cancelCollaboration } from '@/app/actions/collaborations'
import { LeaveReview } from '@/components/shared/leave-review'
import DraftReview from '@/components/shared/DraftReview'
import DisputeButton from '@/components/shared/DisputeButton'

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
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 24px; border-bottom: 2px solid #5a35e6; }
    .logo { font-size: 28px; font-weight: 900; font-family: Arial, sans-serif; }
    .logo span { color: #5a35e6; }
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

  if (state === 'done' && contractText) {
    return (
      <div className="cl-contract">
        <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>
          <FileText size={13} /> Contract generat
        </span>
        <button
          onClick={() => generateContractPDF(contractText, campaignTitle || 'Campanie')}
          className="bu-btn"
          style={{ height: 34, padding: '0 12px', fontSize: 13 }}
        >
          <Download size={14} /> Descarcă PDF
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={state === 'loading'}
        className="bu-btn"
        style={{ height: 34, padding: '0 12px', fontSize: 13 }}
      >
        {state === 'loading'
          ? <><Loader2 size={14} className="cl-spin" /> Generez…</>
          : <><FileText size={14} /> Generează contract</>
        }
      </button>
      {state === 'error' && errorMsg && (
        <p className="bu-xs" style={{ color: '#b42318', margin: '6px 0 0' }}>{errorMsg}</p>
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

  const amount = collab.reserved_amount || collab.payment_amount

  return (
    <div className="cl-col" style={{ gap: 12 }}>
      <div className="cl-linkbox">
        <Link2 size={16} style={{ flex: 'none' }} />
        <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer" className="cl-linktxt">
          {collab.deliverable_url}
        </a>
        <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer" className="cl-linkgo">
          <Eye size={14} /> Verifică
        </a>
      </div>
      {submittedAt && <span className="bu-xs bu-muted">Trimis: {submittedAt}</span>}

      {collab.ads_code && (
        <div className="cl-note blue">
          <b className="bu-label" style={{ color: '#1d4fb8' }}>Cod Spark Ads / Partnership Ads</b>
          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="cl-mono">{collab.ads_code}</span>
            <button onClick={() => navigator.clipboard.writeText(collab.ads_code)} className="bu-btn" style={{ height: 34, padding: '0 12px', fontSize: 13 }}>
              Copiază
            </button>
          </div>
          <span className="bu-xs">Folosește acest cod în TikTok Ads Manager (Spark Ads) sau Meta Ads Manager (Partnership Ads) pentru a promova postul influencerului.</span>
        </div>
      )}

      {collab.deliverable_note && (
        <div className="cl-note blue">
          <b className="bu-label" style={{ color: '#1d4fb8' }}>Notă de la influencer</b>
          <span className="bu-sm" style={{ fontStyle: 'italic' }}>„{collab.deliverable_note}"</span>
        </div>
      )}

      {error && <p className="bu-sm" style={{ color: '#b42318', fontWeight: 700, margin: 0, display: 'flex', gap: 6, alignItems: 'center' }}><AlertCircle size={14} />{error}</p>}

      {showReject && (
        <div className="cl-note red">
          <b className="bu-sm" style={{ color: '#b42318' }}>Ce trebuie modificat? (motivul respingerii)</b>
          <textarea value={rejReason} onChange={e => { setRejReason(e.target.value); setError(null) }}
            placeholder="Ex: Postul nu conține hashtag-ul #brand, nu respectă cerințele convenite..."
            rows={3}
            className="cl-ta" />
          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button onClick={reject} disabled={loading} className="bu-btn danger" style={{ flex: 1, background: '#b42318', color: '#fff', borderColor: '#b42318' }}>
              {loading ? <Loader2 size={15} className="cl-spin" /> : <ThumbsDown size={15} />}
              Respinge & cere retrimitere
            </button>
            <button onClick={() => { setShowReject(false); setRejReason('') }} className="bu-btn">
              Anulează
            </button>
          </div>
        </div>
      )}

      {!showReject && (
        <div className="cl-btns">
          <button onClick={approve} disabled={loading} className="bu-btn p big">
            {loading ? <Loader2 size={16} className="cl-spin" /> : <Check size={16} strokeWidth={2.6} />}
            {loading ? 'Se procesează…' : amount ? `Aprobă și plătește ${Number(amount).toLocaleString('ro-RO')} RON` : 'Aprobă & Eliberează plata'}
          </button>
          <button onClick={() => setShowReject(true)} disabled={loading} className="bu-btn big">
            Cere modificări
          </button>
          <button onClick={() => setShowReject(true)} disabled={loading} className="bu-btn big danger" style={{ borderColor: 'transparent' }}>
            <ThumbsDown size={15} /> Respinge
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers de afișare (design "Centrul de comandă") ────────────────────────
const TAB_LABEL: Record<Tab, string> = {
  'All': 'Toate', 'Pending Review': 'De revizuit', 'Applied': 'Aplicări', 'Invited': 'Invitate',
  'Active': 'Active', 'Completed': 'Finalizate', 'Declined': 'Refuzate',
}
const TAB_ORDER: Tab[] = ['All', 'Pending Review', 'Applied', 'Invited', 'Active', 'Completed', 'Declined']
const STEPS = ['Selectat', 'Pachet', 'Postare', 'Aprobare', 'Gata']

const isPendingReview = (c: any) =>
  c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
const needsAwb = (c: any) => c.status === 'ACTIVE' && !c.package_sent_at && !!c.delivery_name

// Pasul curent din cei 5 (null = fără progres; 5 = totul bifat)
function collabStage(c: any): number | null {
  if (c.status === 'COMPLETED') return 5
  if (c.status !== 'ACTIVE') return null
  if (isPendingReview(c)) return 3
  if (c.delivery_name && !c.package_received_at) return 1
  return 2
}

type Pastel = { label: string; bg: string; fg: string }
const GRN = { bg: '#dcf5ec', fg: '#14532d' }, AMB = { bg: '#fff1c2', fg: '#854d0e' }, BLU = { bg: '#e6f0ff', fg: '#1d4fb8' }
const VIO = { bg: '#efeaff', fg: '#4423c4' }, GRY = { bg: '#f0eff7', fg: '#4a4770' }, ORG = { bg: '#fff1e6', fg: '#9a4206' }

function collabStatus(c: any): Pastel {
  if (c.status === 'PENDING') return { label: 'Aplicare nouă', ...ORG }
  if (c.status === 'INVITED') return { label: 'Invitat', ...GRY }
  if (c.status === 'COMPLETED') return { label: 'Finalizat', ...VIO }
  if (c.status === 'REJECTED') return { label: 'Refuzat', ...GRY }
  if (c.status === 'CANCELLED') return { label: 'Anulat', ...GRY }
  if (c.status === 'ACTIVE') {
    if (isPendingReview(c)) return { label: 'Postare de aprobat', ...AMB }
    const sub = getSubStatus(c)
    if (sub && sub.label.includes('Întârziat')) return { label: 'Întârziat', ...ORG }
    if (needsAwb(c)) return { label: 'Pachet de trimis', ...BLU }
    if (c.package_sent_at && !c.package_received_at) return { label: 'Pachet în drum', ...BLU }
    if (c.deliverable_rejected_at && !c.deliverable_submitted_at) return { label: 'Modificări cerute', ...AMB }
    return { label: 'Activă', ...GRN }
  }
  return { label: c.status || '—', ...GRY }
}

function Track({ cur }: { cur: number }) {
  const lineW = Math.min(Math.max(cur, 0), 4) * 20
  return (
    <div className="cl-trk" role="img" aria-label={`Pas ${Math.min(cur + 1, 5)} din 5`}>
      <div className="cl-trk-line" /><div className="cl-trk-fill" style={{ width: `${lineW}%` }} />
      {STEPS.map((s, i) => {
        const done = i < cur, now = i === cur
        return (
          <div key={s} className="cl-trk-step">
            <span className="cl-trk-dot" style={{
              background: done ? '#5a35e6' : now ? '#efeaff' : '#f0eff7',
              color: done ? '#fff' : now ? '#4423c4' : '#8783a8',
              boxShadow: now ? '0 0 0 3px #d9ccff' : 'none',
            }}>{done ? <Check size={11} strokeWidth={3.2} /> : i + 1}</span>
            <span className="cl-trk-lbl" style={{ fontWeight: 700, color: '#14123a', whiteSpace: 'nowrap', visibility: now ? 'visible' : 'hidden', height: now ? undefined : 0 }}>{s}</span>
          </div>
        )
      })}
    </div>
  )
}

const FACE_BG = ['#efeaff', '#e6f0ff', '#dcf5ec', '#fff1c2', '#fff1e6']
const FACE_FG = ['#4423c4', '#1d4fb8', '#14532d', '#854d0e', '#9a4206']
function Face({ inf, size = 40 }: { inf: any; size?: number }) {
  const name = inf?.name || '?'
  const k = (name.charCodeAt(0) || 0) % 5
  return (
    <span className="bu-face" style={{ width: size, height: size, background: FACE_BG[k], color: FACE_FG[k], fontSize: Math.round(size * 0.38) }}>
      {inf?.avatar
        ? <img src={inf.avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name[0]?.toUpperCase()}
    </span>
  )
}

const fmtDate = (d: string, o: any = { day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('ro-RO', o)

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

  // Linkuri directe din dashboard: /brand/collaborations?tab=review | applied | active
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    const map: Record<string, Tab> = { review: 'Pending Review', applied: 'Applied', active: 'Active', completed: 'Completed', invited: 'Invited' }
    if (t && map[t]) { setTab(map[t]); setViewMode('list') }
  }, [])

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
        notify(result.reservedAmount > 0
          ? `🔒 Aprobat! ${result.reservedAmount.toLocaleString('ro-RO')} RON rezervați escrow — influencerul știe că plata e garantată.`
          : '✅ Influencer selectat!')
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

  // ── Stare UI suplimentară (design) ──
  const [reviewIdx, setReviewIdx] = useState(0)
  const reviewItems = collabs.filter(isPendingReview)
  const reviewCardVisible = reviewItems.length > 0 && (tab === 'All' || tab === 'Pending Review')
  const reviewCur = reviewItems.length ? reviewItems[Math.min(reviewIdx, reviewItems.length - 1)] : null
  const awbQueue = collabs.filter(needsAwb)
  const activeCollabs = collabs.filter(c => c.status === 'ACTIVE')
  const completedCollabs = collabs.filter(c => c.status === 'COMPLETED')

  function openAwb(id: string) {
    setAwbResult(null); setAwbPrices([]); setAwbCarrierId(null); setAwbServiceId(null); setAwbError('')
    setAwbModal(id)
  }
  function openReview(c: any) {
    if (reviewCardVisible) {
      const i = reviewItems.findIndex(x => x.id === c.id)
      if (i >= 0) setReviewIdx(i)
      setTimeout(() => document.getElementById('cl-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    } else {
      setExpandedId(c.id)
    }
  }
  const campTitle = (c: any) => (c.campaign?.title || '').replace(/^\[Barter\]\s*/i, '') || 'Campanie'
  const isBarterCampaign = (cs: any[]) => cs.some(c => c.campaign?.campaign_type === 'BARTER' || /^\[Barter\]/i.test(c.campaign?.title || ''))

  const renderDetails = (c: any) => {
    const inf = c.influencer
    const busy = actionId === c.id
    const hasPendingDeliverable = isPendingReview(c)
    return (
      <div className="cl-col" style={{ gap: 12 }}>
        <div className="bu-row bu-xs bu-muted" style={{ gap: 14, flexWrap: 'wrap' }}>
          <span>Aplicat: {fmtDate(c.created_at, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          {c.campaign?.title && (
            <Link href={`/brand/campaigns/${c.campaign_id}`} style={{ fontWeight: 700, color: '#5a35e6', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              Campania <ExternalLink size={12} />
            </Link>
          )}
          {inf?.niches?.length > 0 && (
            <span className="bu-chip" style={{ background: '#f0eff7', color: '#4a4770', height: 22 }}>{inf.niches.slice(0, 2).join(', ')}</span>
          )}
        </div>

        {c.message && c.status === 'PENDING' && (
          <div className="cl-note blue">
            <b className="bu-label" style={{ color: '#1d4fb8' }}>Mesaj de la influencer</b>
            <span className="bu-sm" style={{ fontStyle: 'italic' }}>„{c.message}"</span>
          </div>
        )}

        {c.delivery_name && (
          <div className="cl-note orange">
            <b className="bu-label" style={{ color: '#9a4206' }}>Adresă livrare produs</b>
            <div className="bu-col bu-sm" style={{ gap: 2 }}>
              <b>{c.delivery_name}</b>
              <span>{c.delivery_phone}</span>
              <span>{c.delivery_address}</span>
              <span>{c.delivery_city}, {c.delivery_county}{c.delivery_postal_code ? `, ${c.delivery_postal_code}` : ''}</span>
            </div>
            <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="bu-btn cl-sm" onClick={() => navigator.clipboard.writeText(`${c.delivery_name}\n${c.delivery_phone}\n${c.delivery_address}\n${c.delivery_city}, ${c.delivery_county} ${c.delivery_postal_code || ''}`)}>
                Copiază adresa
              </button>
              {!c.package_sent_at && c.status === 'ACTIVE' && (
                <>
                  <button className="bu-btn p cl-sm" onClick={() => openAwb(c.id)}><Truck size={14} /> Generează AWB</button>
                  <button className="bu-btn cl-sm" onClick={() => setPackageModal(c.id)}>Marchează ca trimis</button>
                </>
              )}
            </div>
          </div>
        )}

        {c.package_sent_at && (
          <div className={`cl-note ${c.package_received_at ? 'green' : 'blue'}`}>
            <div className="bu-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <b className="bu-label" style={{ color: c.package_received_at ? '#14532d' : '#1d4fb8' }}>
                {c.package_received_at ? 'Colet primit de influencer' : 'Pachet în drum'}
              </b>
              {!c.package_received_at && (
                <button onClick={() => { setProblemModal(c); setProblemReason('') }} className="bu-btn danger cl-sm">
                  <AlertTriangle size={13} /> Problemă?
                </button>
              )}
            </div>
            <div className="bu-col bu-sm" style={{ gap: 2 }}>
              <span>Trimis: {fmtDate(c.package_sent_at, { day: 'numeric', month: 'long' })}</span>
              {c.package_courier && <span>Curier: <b>{c.package_courier}</b></span>}
              {c.package_tracking && <b>AWB: {c.package_tracking}</b>}
              {c.package_received_at && (
                <b style={{ color: '#14532d' }}>
                  Primit: {fmtDate(c.package_received_at, { day: 'numeric', month: 'long' })}
                  {' · '}Deadline post: {new Date(new Date(c.package_received_at).getTime() + (c.post_deadline_days || 5) * 86400000).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}
                </b>
              )}
            </div>
          </div>
        )}

        {Array.isArray(c.package_history) && c.package_history.length > 0 && (
          <div>
            <button onClick={() => setShowHistory(p => ({ ...p, [c.id]: !p[c.id] }))} className="cl-linkbtn">
              Istoric expedieri ({c.package_history.length}) {showHistory[c.id] ? '▲' : '▼'}
            </button>
            {showHistory[c.id] && (
              <div className="cl-col" style={{ gap: 8, marginTop: 8, borderLeft: '2px solid #e5e3f3', paddingLeft: 12 }}>
                {c.package_history.map((h: any, i: number) => (
                  <div key={i} className="cl-note grey">
                    <div className="bu-row bu-xs" style={{ justifyContent: 'space-between' }}>
                      <b>Expediere #{i + 1}</b>
                      <span className="bu-muted">{h.sent_at ? fmtDate(h.sent_at) : '—'}</span>
                    </div>
                    {h.courier && <span className="bu-xs">Curier: <b>{h.courier}</b></span>}
                    {h.awb && <b className="bu-xs">AWB: {h.awb}</b>}
                    {h.problem && <span className="bu-xs" style={{ color: '#b42318', fontWeight: 700 }}>{h.problem}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {c.status === 'PENDING' && (
          <div className="cl-btns">
            <button className="bu-btn p" onClick={() => doAction(c.id, 'ACTIVE')} disabled={busy}>
              {busy ? <Loader2 size={15} className="cl-spin" /> : <Check size={15} strokeWidth={2.6} />}
              Aprobă aplicația
            </button>
            <button className="bu-btn danger" onClick={() => doAction(c.id, 'REJECTED')} disabled={busy}>
              <X size={15} /> Refuză
            </button>
          </div>
        )}

        {(c.status === 'ACTIVE' || c.status === 'COMPLETED') && (
          <>
          <DraftReview collabId={c.id} role="brand" />
          <DisputeButton collabId={c.id} role="brand" />
          </>
        )}

        {c.status === 'ACTIVE' && !hasPendingDeliverable && !c.deliverable_rejected_at && (
          <div className="cl-col" style={{ gap: 10 }}>
            <div className="cl-note violet" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <span className="cl-pulse" />
              <span className="bu-sm" style={{ fontWeight: 600 }}>Așteptăm ca influencerul să trimită dovada postului…</span>
            </div>
            <ContractButton collabId={c.id} campaignTitle={c.campaign?.title || c.campaigns?.title} />
          </div>
        )}

        {c.status === 'ACTIVE' && !!c.deliverable_rejected_at && !c.deliverable_submitted_at && (
          <div className="cl-note red" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle size={16} style={{ color: '#b42318', flex: 'none', marginTop: 2 }} />
            <div className="cl-col">
              <b className="bu-sm" style={{ color: '#b42318' }}>Post respins — așteptăm retrimitere</b>
              {c.deliverable_rejection_reason && <span className="bu-xs" style={{ color: '#b42318' }}>Motiv: „{c.deliverable_rejection_reason}"</span>}
            </div>
          </div>
        )}

        {hasPendingDeliverable && !reviewCardVisible && (
          <div className="cl-note amber">
            <b className="bu-label" style={{ color: '#854d0e' }}>Dovadă post trimisă de influencer</b>
            <DeliverableReview key={c.id} collab={c} onUpdated={handleDeliverableUpdate} />
          </div>
        )}

        {c.status === 'COMPLETED' && (
          <div className="cl-col" style={{ gap: 12 }}>
            <div className="cl-note green">
              <b className="bu-sm" style={{ color: '#14532d', display: 'flex', gap: 6, alignItems: 'center' }}>
                <CheckCircle size={15} /> Colaborare finalizată
              </b>
              {c.deliverable_url && (
                <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer" className="cl-linkbox" style={{ textDecoration: 'none' }}>
                  <Link2 size={14} style={{ flex: 'none' }} />
                  <span className="cl-linktxt">{c.deliverable_url}</span>
                  <ExternalLink size={13} style={{ flex: 'none' }} />
                </a>
              )}
              {c.payment_amount && (
                <span className="bu-xs bu-muted">
                  Plată eliberată: <b style={{ color: '#14532d' }}>{c.payment_amount.toLocaleString('ro-RO')} RON</b>
                  {c.deliverable_approved_at && ` · ${fmtDate(c.deliverable_approved_at, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
              )}
            </div>
            <LeaveReview collaborationId={c.id} reviewerRole="brand" targetName={inf?.name ?? 'influencer'} />
          </div>
        )}
      </div>
    )
  }

  const renderRow = (c: any, showCampaign: boolean) => {
    const inf = c.influencer
    const st = collabStatus(c)
    const cur = collabStage(c)
    const busy = actionId === c.id
    const isExp = expandedId === c.id
    const pend = isPendingReview(c)
    const subParts = [
      showCampaign ? campTitle(c) : null,
      inf?.avg_rating > 0 ? `★ ${inf.avg_rating.toFixed(1)}` : null,
      inf?.niches?.length ? inf.niches.slice(0, 2).join(', ') : null,
      inf?.country || null,
      !showCampaign && c.created_at ? fmtDate(c.created_at) : null,
    ].filter(Boolean)
    return (
      <div key={c.id} className={`cl-rw${pend ? ' hot' : ''}`}>
        <div className="cl-row">
          <Face inf={inf} size={40} />
          <div className="cl-who">
            <b>{inf?.name || '—'}</b>
            <span className="bu-xs bu-muted">{subParts.join(' · ')}</span>
          </div>
          <div className="cl-trkwrap">
            {cur !== null
              ? <Track cur={cur} />
              : <span className="bu-sm bu-muted">{c.status === 'PENDING' || c.status === 'INVITED' ? 'Încă nu a început' : '—'}</span>}
          </div>
          <div className="cl-stat">
            <span className="bu-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            {c.status === 'ACTIVE' && c.reserved_amount ? <span className="bu-xs bu-muted">Plată garantată</span> : null}
          </div>
          <div className="cl-act">
            {c.status === 'PENDING' && (
              <>
                <button className="bu-btn p" onClick={() => doAction(c.id, 'ACTIVE')} disabled={busy}>
                  {busy ? <Loader2 size={15} className="cl-spin" /> : null}Alege
                </button>
                <button className="bu-btn danger" onClick={() => doAction(c.id, 'REJECTED')} disabled={busy}>Refuză</button>
              </>
            )}
            {c.status === 'ACTIVE' && pend && <button className="bu-btn p" onClick={() => openReview(c)}>Revizuiește</button>}
            {c.status === 'ACTIVE' && !pend && needsAwb(c) && <button className="bu-btn p" onClick={() => openAwb(c.id)}>Generează AWB</button>}
            {c.status === 'ACTIVE' && !pend && !needsAwb(c) && <Link href={`/brand/inbox?collab=${c.id}`} className="bu-btn">Deschide chat</Link>}
            {c.status === 'INVITED' && <Link href={`/brand/inbox?collab=${c.id}`} className="bu-btn">Deschide chat</Link>}
            {c.status === 'COMPLETED' && <button className="bu-btn" onClick={() => setExpandedId(isExp ? null : c.id)}>Lasă o evaluare</button>}
            <button className="bu-btn cl-chev" aria-label="Detalii" aria-expanded={isExp} onClick={() => setExpandedId(isExp ? null : c.id)}>
              <ChevronRight size={16} style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
            </button>
          </div>
        </div>
        {isExp && <div className="cl-det">{renderDetails(c)}</div>}
      </div>
    )
  }

  const selAwb = collabs.find(c => c.id === awbModal)

  return (
    <div className="bu">
      <style>{CL_CSS}</style>

      {/* ── Modal Problemă colet ── */}
      {problemModal && (
        <div className="cl-ov" onClick={() => setProblemModal(null)}>
          <div className="cl-mod" onClick={e => e.stopPropagation()}>
            <div className="cl-mh">
              <div className="cl-col">
                <h2>Problemă cu coletul</h2>
                <span className="bu-xs bu-muted">{problemModal.influencer?.name}</span>
              </div>
              <button onClick={() => setProblemModal(null)} className="cl-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="cl-mb">
              <div className="cl-note blue">
                <b className="bu-label" style={{ color: '#1d4fb8' }}>Colet curent</b>
                <b className="bu-sm">{problemModal.package_courier} · AWB: {problemModal.package_tracking || '—'}</b>
                <span className="bu-xs bu-muted">Trimis: {problemModal.package_sent_at ? fmtDate(problemModal.package_sent_at, { day: 'numeric', month: 'long' }) : '—'}</span>
              </div>
              <div className="cl-col" style={{ gap: 8 }}>
                <b className="bu-label">Care e problema?</b>
                {[
                  { id: 'lost', label: 'Colet pierdut de curier', sub: 'AWB-ul nu mai are actualizări de câteva zile' },
                  { id: 'damaged', label: 'Produs deteriorat la livrare', sub: 'Influencerul a primit produsul stricat' },
                  { id: 'returned', label: 'Colet returnat la expeditor', sub: 'Influencerul nu a ridicat sau adresa era greșită' },
                  { id: 'wrong', label: 'Produs greșit trimis', sub: 'Am trimis un alt produs decât cel din campanie' },
                  { id: 'other', label: 'Altul', sub: 'Altă problemă nespecificată' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setProblemReason(opt.id)} className={`cl-opt${problemReason === opt.id ? ' on' : ''}`}>
                    <span className="cl-col" style={{ flex: 1, textAlign: 'left' }}>
                      <b className="bu-sm">{opt.label}</b>
                      <span className="bu-xs bu-muted">{opt.sub}</span>
                    </span>
                    {problemReason === opt.id && <Check size={16} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              {problemReason && (
                <div className="cl-note amber">
                  <span className="bu-xs" style={{ fontWeight: 600 }}>AWB-ul curent va fi salvat în istoricul colaborării. Vei putea genera un nou AWB imediat după confirmare.</span>
                </div>
              )}
              <div className="cl-btns">
                <button onClick={() => setProblemModal(null)} className="bu-btn big">Anulează</button>
                <button onClick={() => reportPackageProblem(problemModal.id, problemReason)} disabled={!problemReason} className="bu-btn big p" style={{ background: '#b42318', borderColor: '#b42318', boxShadow: 'none' }}>
                  Confirmă problema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal AWB eAWB ── */}
      {awbModal && (
        <div className="cl-ov">
          <div className="cl-mod">
            <div className="cl-mh">
              <div className="cl-col">
                <h2>Generează AWB eAWB</h2>
                <span className="bu-xs bu-muted">{selAwb?.delivery_name} · {selAwb?.delivery_city}</span>
              </div>
              <button onClick={() => setAwbModal(null)} className="cl-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="cl-mb">
              {awbResult ? (
                <div className="cl-col" style={{ gap: 14 }}>
                  <div className="cl-col" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
                    <span className="bu-ico" style={{ background: '#dcf5ec', color: '#14532d', width: 52, height: 52, borderRadius: 16 }}><CheckCircle size={26} /></span>
                    <h3>AWB generat cu succes!</h3>
                  </div>
                  <div className="cl-note grey">
                    <span className="bu-sm"><span className="bu-muted">AWB:</span> <b style={{ color: '#4423c4', fontSize: 18, letterSpacing: '.04em' }}>{awbResult.awb_number}</b></span>
                    <span className="bu-sm"><span className="bu-muted">Curier:</span> <b>{awbResult.carrier}</b></span>
                    <span className="bu-sm"><span className="bu-muted">Preț:</span> <b>{awbResult.price?.total} {awbResult.price?.currency}</b></span>
                    <span className="bu-sm"><span className="bu-muted">Livrare estimată:</span> <b>{awbResult.estimated_delivery_date}</b></span>
                  </div>
                  <div className="cl-btns">
                    <a href={`/api/eawb?action=label&order_id=${awbResult.order_id}&t=${awbResult.label_token || ''}`} target="_blank" className="bu-btn big" style={{ flex: 1 }}>
                      <Download size={16} /> Descarcă AWB PDF
                    </a>
                    <button onClick={() => setAwbModal(null)} className="bu-btn big p" style={{ flex: 1 }}>Gata</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="cl-col" style={{ gap: 8 }}>
                    <b className="bu-label">Greutate colet (kg)</b>
                    <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      {['0.5', '1', '2', '5'].map(w => (
                        <button key={w} onClick={() => setAwbWeight(w)} className={`bu-pill${awbWeight === w ? ' on' : ''}`} style={{ flex: 1, justifyContent: 'center', padding: '0 10px' }}>
                          {w} kg
                        </button>
                      ))}
                      <input type="number" step="0.1" min="0.1" value={awbWeight} onChange={e => setAwbWeight(e.target.value)}
                        className="bu-input" style={{ width: 84, textAlign: 'center', fontWeight: 700 }} />
                    </div>
                  </div>

                  {awbPrices.length === 0 && !awbPriceLoading && (
                    <button onClick={() => fetchAwbPrices(awbModal!, awbWeight)} className="bu-btn big p" style={{ width: '100%' }}>
                      <Search size={16} /> Vezi prețuri curieri
                    </button>
                  )}

                  {awbPriceLoading && (
                    <div className="bu-row bu-sm bu-muted" style={{ justifyContent: 'center', gap: 8, padding: '14px 0' }}>
                      <Loader2 size={18} className="cl-spin" /> Se obțin prețurile...
                    </div>
                  )}

                  {awbPrices.length > 0 && (
                    <div className="cl-col" style={{ gap: 8 }}>
                      <b className="bu-label">Alege curierul</b>
                      {awbPrices.map((p: any) => {
                        const on = awbCarrierId === p.carrier_id && awbServiceId === p.service_id
                        return (
                          <button key={`${p.carrier_id}-${p.service_id}`}
                            onClick={() => { setAwbCarrierId(p.carrier_id); setAwbServiceId(p.service_id) }}
                            className={`cl-opt${on ? ' on' : ''}`}>
                            <span className="cl-col" style={{ flex: 1, textAlign: 'left' }}>
                              <b className="bu-sm">{p.carrier}</b>
                              <span className="bu-xs bu-muted">{p.service_name} · {p.estimated_delivery_date || 'Standard'}</span>
                            </span>
                            <span className="cl-col" style={{ alignItems: 'flex-end' }}>
                              <b style={{ color: '#4423c4' }}>{p.price?.total} RON</b>
                              {on && <span className="bu-xs" style={{ color: '#5a35e6', fontWeight: 700 }}>Selectat</span>}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {awbError && (
                    <div className="cl-note red"><span className="bu-sm" style={{ color: '#b42318', fontWeight: 700 }}>{awbError}</span></div>
                  )}

                  {awbCarrierId && awbServiceId && (
                    <button onClick={() => createAwbOrder(awbModal!)} disabled={awbCreating} className="bu-btn big p" style={{ width: '100%' }}>
                      {awbCreating
                        ? <><Loader2 size={16} className="cl-spin" /> Se generează AWB...</>
                        : <><Truck size={16} /> Generează AWB & trimite coletul</>}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal marchează pachet trimis ── */}
      {packageModal && (
        <div className="cl-ov">
          <div className="cl-mod">
            <div className="cl-mh">
              <div className="cl-col">
                <h2>Marchează pachetul ca trimis</h2>
                <span className="bu-xs bu-muted">Influencerul va primi o notificare că pachetul e în drum.</span>
              </div>
              <button onClick={() => { setPackageModal(null); setTrackingNum(''); setCourierName('') }} className="cl-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="cl-mb">
              <label className="cl-col" style={{ gap: 6 }}>
                <b className="bu-label">Curier</b>
                <input value={courierName} onChange={e => setCourierName(e.target.value)} placeholder="ex. Fan Courier, DPD, Cargus..." className="bu-input" />
              </label>
              <label className="cl-col" style={{ gap: 6 }}>
                <b className="bu-label">Număr AWB <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>(opțional)</span></b>
                <input value={trackingNum} onChange={e => setTrackingNum(e.target.value)} placeholder="ex. RO123456789" className="bu-input" />
              </label>
              <div className="cl-btns">
                <button onClick={() => { setPackageModal(null); setTrackingNum(''); setCourierName('') }} className="bu-btn big">Anulează</button>
                <button onClick={() => markPackageSent(packageModal)} disabled={packageLoading} className="bu-btn big p">
                  {packageLoading ? <Loader2 size={16} className="cl-spin" /> : <Truck size={16} />}
                  Confirmă trimiterea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`cl-toast ${toast.ok ? 'ok' : 'err'}`} role="status">
          {toast.ok ? <CheckCircle size={16} style={{ flex: 'none' }} /> : <AlertCircle size={16} style={{ flex: 'none' }} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <section className="bu-head">
        <div className="bu-col" style={{ gap: 4, minWidth: 0 }}>
          <h1>Colaborări</h1>
          <p style={{ margin: 0, color: '#4a4770' }}>
            {pendingReviews > 0 && <><b style={{ color: '#5a35e6' }}>{pendingReviews} {pendingReviews === 1 ? 'postare' : 'postări'}</b> de aprobat · </>}
            {counts.Applied > 0 && <>{counts.Applied} {counts.Applied === 1 ? 'aplicare nouă' : 'aplicări noi'} · </>}
            {awbQueue.length > 0 && <>{awbQueue.length} {awbQueue.length === 1 ? 'pachet' : 'pachete'} de trimis · </>}
            {collabs.length} în total
          </p>
        </div>
        <div className="bu-row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button onClick={load} className="bu-btn" aria-label="Reîncarcă" style={{ width: 44, padding: 0 }}>
            <RefreshCw size={16} className={loading ? 'cl-spin' : ''} />
          </button>
          {collabs.length > 0 && (
            <a href="/api/brand/export?type=collaborations" className="bu-btn" title="Toate colaborările, din toate campaniile (Excel / CSV)">
              <Download size={16} /> Export CSV
            </a>
          )}
          <div className="cl-seg" role="tablist" aria-label="Mod de afișare">
            <button className={viewMode === 'grouped' ? 'on' : ''} onClick={() => setViewMode('grouped')}>Pe campanii</button>
            <button className={viewMode === 'list' ? 'on' : ''} onClick={() => setViewMode('list')}>Listă</button>
          </div>
        </div>
      </section>

      {/* Alert: sold scăzut */}
      {brandBalance !== null && brandBalance.available < 50 && (
        <div className="cl-note amber" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 16, borderRadius: 16 }}>
          <span className="bu-ico" style={{ background: '#fff1c2', color: '#854d0e', fontWeight: 800, fontSize: 12 }}>RON</span>
          <div className="cl-col" style={{ flex: 1, minWidth: 200 }}>
            <b className="bu-sm" style={{ color: '#854d0e' }}>
              {brandBalance.available <= 0 ? 'Sold 0 RON — nu poți aproba aplicații la campaniile plătite' : `Sold disponibil scăzut: ${brandBalance.available.toFixed(2)} RON`}
            </b>
            <span className="bu-xs" style={{ color: '#854d0e' }}>
              {brandBalance.reserved > 0 && `${brandBalance.reserved.toFixed(2)} RON rezervați escrow · `}
              La campaniile barter poți selecta influenceri și fără sold. Pentru campaniile plătite, adaugă credite.
            </span>
          </div>
          <a href="/brand/wallet" className="bu-btn p">Adaugă credite</a>
        </div>
      )}

      {/* Filtre */}
      <div className="cl-col" style={{ gap: 12 }}>
        <div className="bu-search">
          <Search size={16} />
          <input placeholder="Caută după influencer sau campanie…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="bu-tabs cl-tabs">
          {TAB_ORDER.map(t => (
            <button key={t} className={`bu-pill${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
              {counts[t] > 0 && <span className="n">{counts[t]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="cl-layout">
        <div className="cl-main">
          {/* Postări de aprobat */}
          {reviewCardVisible && reviewCur && (
            <section id="cl-review" className="bu-card cl-review">
              <div className="cl-rvh">
                <div className="bu-row" style={{ gap: 10, minWidth: 0 }}>
                  <span className="bu-ico" style={{ width: 32, height: 32, borderRadius: 10, background: '#5a35e6', color: '#fff' }}><Eye size={17} /></span>
                  <b className="bu-d" style={{ fontSize: 18 }}>
                    {reviewItems.length === 1 ? '1 postare așteaptă' : `${reviewItems.length} postări așteaptă`} aprobarea ta
                  </b>
                </div>
                <div className="bu-row" style={{ gap: 6 }}>
                  {reviewItems.length > 1 && (
                    <button className="cl-nav" aria-label="Anterioara" onClick={() => setReviewIdx(i => (Math.min(i, reviewItems.length - 1) - 1 + reviewItems.length) % reviewItems.length)}>
                      <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  )}
                  <span className="bu-sm" style={{ color: '#4423c4', fontWeight: 700 }}>{Math.min(reviewIdx, reviewItems.length - 1) + 1} din {reviewItems.length}</span>
                  {reviewItems.length > 1 && (
                    <button className="cl-nav" aria-label="Următoarea" onClick={() => setReviewIdx(i => (Math.min(i, reviewItems.length - 1) + 1) % reviewItems.length)}>
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="cl-rvb">
                <a href={reviewCur.deliverable_url} target="_blank" rel="noopener noreferrer" className="cl-thumb" aria-label="Deschide postarea">
                  <span className="cl-play"><Play size={22} fill="#fff" /></span>
                </a>
                <div className="cl-col" style={{ flex: 1, minWidth: 0, gap: 14 }}>
                  <div className="bu-row" style={{ gap: 12 }}>
                    <Face inf={reviewCur.influencer} size={44} />
                    <div className="cl-col" style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 16 }}>{reviewCur.influencer?.name || '—'}</b>
                      <span className="bu-sm bu-muted">{campTitle(reviewCur)}</span>
                    </div>
                  </div>
                  <DeliverableReview key={reviewCur.id} collab={reviewCur} onUpdated={handleDeliverableUpdate} />
                </div>
              </div>
            </section>
          )}

          {loading ? (
            <div className="bu-card" style={{ display: 'flex', justifyContent: 'center', padding: '56px 0' }}>
              <Loader2 size={30} className="cl-spin" style={{ color: '#5a35e6' }} />
            </div>
          ) : visible.length === 0 ? (
            <div className="bu-card" style={{ textAlign: 'center', padding: '56px 20px' }}>
              <Users size={40} style={{ color: '#d8d5ec', margin: '0 auto 10px' }} />
              <b style={{ color: '#6a6690' }}>{collabs.length === 0 ? 'Nicio colaborare încă' : 'Niciun rezultat'}</b>
              {collabs.length === 0 && <p className="bu-sm bu-muted" style={{ margin: '4px 0 0' }}>Publică o campanie pentru a primi aplicații</p>}
            </div>
          ) : viewMode === 'grouped' ? (
            groupedList.map(([campaignId, group]) => {
              const isCollapsed = expandedCampaigns.has(campaignId)
              const unsentCount = group.collabs.filter(c => c.status === 'ACTIVE' && !c.package_sent_at && c.delivery_name).length
              const barter = isBarterCampaign(group.collabs)
              return (
                <section key={campaignId} className="bu-card" style={{ overflow: 'hidden' }}>
                  <button className="cl-gh" onClick={() => toggleCampaign(campaignId)} aria-expanded={!isCollapsed}>
                    <span className="bu-row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                      <span className="bu-chip" style={barter ? { background: '#fff1c2', color: '#854d0e' } : { background: '#efeaff', color: '#4423c4' }}>{barter ? 'Barter' : 'Plătită'}</span>
                      <h3 className="cl-gt">{group.campaign?.title?.replace(/^\[Barter\]\s*/i, '') || 'Campanie'}</h3>
                    </span>
                    <span className="bu-row" style={{ gap: 10, flex: 'none' }}>
                      {unsentCount > 0 && <span className="bu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>{unsentCount} {unsentCount === 1 ? 'colet netrimis' : 'colete netrimise'}</span>}
                      <span className="bu-sm bu-muted" style={{ fontWeight: 600 }}>{group.collabs.length} {group.collabs.length === 1 ? 'creator' : 'creatori'}</span>
                      <ChevronRight size={16} style={{ color: '#8783a8', transform: isCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform .15s' }} />
                    </span>
                  </button>
                  {!isCollapsed && group.collabs.map(c => renderRow(c, false))}
                </section>
              )
            })
          ) : (
            <section className="bu-card" style={{ overflow: 'hidden' }}>
              <div className="cl-gh" style={{ cursor: 'default' }}>
                <h3 className="cl-gt">Toate colaborările</h3>
                <span className="bu-sm bu-muted" style={{ fontWeight: 600 }}>{visible.length} colaborări</span>
              </div>
              {visible.map(c => renderRow(c, true))}
            </section>
          )}
        </div>

        {/* Coloana laterală */}
        <div className="cl-side">
          <div className="bu-card cl-sc">
            <div className="bu-row" style={{ gap: 10 }}>
              <span className="bu-ico" style={{ width: 34, height: 34, borderRadius: 10, background: '#e6f0ff', color: '#1d4fb8' }}><Truck size={18} /></span>
              <b className="bu-d" style={{ fontSize: 17 }}>Pachete de trimis</b>
              {awbQueue.length > 0 && <span className="bu-chip" style={{ background: '#5a35e6', color: '#fff', marginLeft: 'auto' }}>{awbQueue.length}</span>}
            </div>
            {awbQueue.length === 0 ? (
              <span className="bu-sm bu-muted">Niciun pachet de trimis acum.</span>
            ) : awbQueue.slice(0, 4).map(c => (
              <div key={c.id} className="cl-pk">
                <div className="bu-row" style={{ gap: 10 }}>
                  <Face inf={c.influencer} size={32} />
                  <div className="cl-col" style={{ flex: 1, minWidth: 0 }}>
                    <b className="bu-sm">{c.influencer?.name || c.delivery_name}</b>
                    <span className="bu-xs bu-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[c.delivery_address, c.delivery_city].filter(Boolean).join(', ')}</span>
                  </div>
                </div>
                <div className="cl-col" style={{ gap: 6 }}>
                  <span className="bu-row bu-xs" style={{ gap: 8, color: '#14532d' }}><Check size={14} strokeWidth={2.8} />Adresă primită</span>
                  <span className="bu-row bu-xs" style={{ gap: 8, color: '#4423c4', fontWeight: 700 }}><i className="cl-ring on" />Generează AWB</span>
                  <span className="bu-row bu-xs bu-muted" style={{ gap: 8 }}><i className="cl-ring" />Predă coletul curierului</span>
                </div>
                <button className="bu-btn p" style={{ width: '100%' }} onClick={() => openAwb(c.id)}>Generează AWB</button>
                <button className="cl-linkbtn" style={{ textAlign: 'center' }} onClick={() => setPackageModal(c.id)}>Marchează ca trimis (fără AWB)</button>
              </div>
            ))}
            {awbQueue.length > 4 && <span className="bu-xs bu-muted">+ încă {awbQueue.length - 4} pachete în listă</span>}
          </div>

          <div className="bu-card cl-sc">
            <div className="bu-row" style={{ gap: 10 }}>
              <span className="bu-ico" style={{ width: 34, height: 34, borderRadius: 10, background: '#efeaff', color: '#4423c4' }}><FileText size={18} /></span>
              <b className="bu-d" style={{ fontSize: 17 }}>Contracte</b>
            </div>
            {activeCollabs.length === 0 ? (
              <span className="bu-sm bu-muted">Contractele apar după ce selectezi un creator.</span>
            ) : activeCollabs.slice(0, 5).map(c => (
              <div key={c.id} className="cl-col" style={{ gap: 6 }}>
                <span className="bu-sm" style={{ fontWeight: 600 }}>{c.influencer?.name || '—'}</span>
                <ContractButton collabId={c.id} campaignTitle={c.campaign?.title || c.campaigns?.title} />
              </div>
            ))}
            {activeCollabs.length > 5 && <span className="bu-xs bu-muted">+ încă {activeCollabs.length - 5} în lista de colaborări</span>}
          </div>

          <div className="bu-card cl-sc">
            <div className="bu-row" style={{ gap: 10 }}>
              <span className="bu-ico" style={{ width: 34, height: 34, borderRadius: 10, background: '#fff1c2', color: '#854d0e' }}><Star size={18} /></span>
              <b className="bu-d" style={{ fontSize: 17 }}>Evaluări de lăsat</b>
            </div>
            {completedCollabs.length === 0 ? (
              <span className="bu-sm bu-muted">Când o colaborare se finalizează, o poți evalua aici.</span>
            ) : (
              <>
                <span className="bu-sm bu-muted">Evaluarea ta ajută și alte branduri.</span>
                {completedCollabs.slice(0, 3).map(c => (
                  <div key={c.id} className="bu-row" style={{ gap: 10, justifyContent: 'space-between' }}>
                    <span className="bu-sm" style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.influencer?.name || '—'}</span>
                    <button className="bu-btn cl-sm" style={{ flex: 'none' }} onClick={() => { setTab('Completed'); setExpandedId(c.id) }}>Evaluează</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const CL_CSS = `
.cl-col { display:flex; flex-direction:column; min-width:0; }
.cl-spin { animation: clspin .8s linear infinite; }
@keyframes clspin { to { transform: rotate(360deg); } }
.cl-sm { height:34px !important; padding:0 12px !important; font-size:13px !important; }
.cl-tabs { overflow-x:auto; flex-wrap:nowrap; scrollbar-width:none; padding-bottom:2px; }
.cl-tabs::-webkit-scrollbar { display:none; }
.cl-tabs .bu-pill { flex:none; }
.cl-seg { display:flex; gap:6px; padding:4px; border-radius:12px; background:#fff; border:1.5px solid #e5e3f3; }
.cl-seg button { height:34px; padding:0 14px; border:0; border-radius:8px; background:transparent; color:#6a6690; font:inherit; font-weight:700; font-size:14px; cursor:pointer; }
.cl-seg button.on { background:#efeaff; color:#4423c4; }
.cl-layout { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:20px; align-items:start; }
.cl-main { display:flex; flex-direction:column; gap:18px; min-width:0; }
.cl-side { display:flex; flex-direction:column; gap:18px; min-width:0; }
.cl-sc { padding:18px; display:flex; flex-direction:column; gap:12px; }
.cl-pk { display:flex; flex-direction:column; gap:10px; padding:12px; border-radius:14px; background:#f6f6fc; }
.cl-ring { width:14px; height:14px; border-radius:50%; border:2px solid #d8d5ec; display:inline-block; flex:none; }
.cl-ring.on { border-color:#5a35e6; }
.cl-review { overflow:hidden; border-color:#c9b9fb; box-shadow:0 18px 36px -24px rgba(90,53,230,.55); }
.cl-rvh { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; padding:14px 20px; background:#f7f4ff; border-bottom:1px solid #e6dcff; }
.cl-rvb { display:flex; gap:22px; padding:20px; align-items:stretch; }
.cl-thumb { flex:none; width:150px; aspect-ratio:9/14; border-radius:16px; background:linear-gradient(160deg,#ffe0cc,#f3a5ff 55%,#7040f0); display:flex; align-items:center; justify-content:center; text-decoration:none; }
.cl-play { width:50px; height:50px; border-radius:50%; background:rgba(20,18,58,.5); display:flex; align-items:center; justify-content:center; padding-left:3px; }
.cl-nav { width:36px; height:36px; border-radius:10px; border:1.5px solid #d8d5ec; background:#fff; color:#14123a; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.cl-linkbox { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; background:#f6f6fc; border:1px solid #e5e3f3; color:#4a4770; min-width:0; }
.cl-linktxt { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; color:#4a4770; text-decoration:none; }
.cl-linkgo { flex:none; display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:13px; color:#5a35e6; text-decoration:none; min-height:32px; }
.cl-mono { font-family:ui-monospace,monospace; font-weight:800; font-size:14px; color:#1d4fb8; background:#fff; padding:6px 12px; border-radius:10px; border:1px solid #cfe0fb; word-break:break-all; }
.cl-ta { width:100%; box-sizing:border-box; padding:10px 12px; border-radius:12px; border:1.5px solid #f3c9c4; background:#fff; font:inherit; font-size:14px; color:#14123a; outline:none; resize:vertical; }
.cl-ta:focus { border-color:#b42318; }
.cl-btns { display:flex; gap:10px; flex-wrap:wrap; }
.cl-contract { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cl-note { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border-radius:14px; border:1px solid transparent; min-width:0; }
.cl-note.blue { background:#e6f0ff; border-color:#cfe0fb; color:#1d4fb8; }
.cl-note.orange { background:#fff1e6; border-color:#fbd9bd; color:#9a4206; }
.cl-note.green { background:#dcf5ec; border-color:#b8e8d3; color:#14532d; }
.cl-note.amber { background:#fff1c2; border-color:#f3dd8c; color:#854d0e; }
.cl-note.violet { background:#efeaff; border-color:#ddd1ff; color:#4423c4; }
.cl-note.red { background:#fff4f2; border-color:#f3c9c4; color:#b42318; }
.cl-note.grey { background:#f6f6fc; border-color:#e5e3f3; color:#14123a; }
.cl-note.blue .bu-sm, .cl-note.orange .bu-sm, .cl-note.green .bu-sm { color:#14123a; }
.cl-pulse { width:8px; height:8px; border-radius:50%; background:#5a35e6; flex:none; animation:clpulse 1.4s ease-in-out infinite; }
@keyframes clpulse { 50% { opacity:.3; } }
.cl-linkbtn { background:none; border:0; padding:6px 0; font:inherit; font-size:13px; font-weight:700; color:#6a6690; cursor:pointer; min-height:32px; width:100%; text-align:left; }
.cl-linkbtn:hover { color:#4423c4; }
.cl-gh { width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px 12px; background:none; border:0; font:inherit; color:inherit; cursor:pointer; text-align:left; }
.cl-gt { font-size:18px !important; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.cl-rw { border-top:1px solid #eeecf7; }
.cl-rw.hot { background:#fffdf5; }
.cl-row { display:grid; grid-template-columns:40px minmax(120px,190px) minmax(180px,1fr) 128px auto; gap:16px; align-items:center; padding:14px 20px; }
.cl-who { display:flex; flex-direction:column; min-width:0; }
.cl-who b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cl-who .bu-xs { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cl-trkwrap { min-width:0; max-width:380px; }
.cl-stat { display:flex; flex-direction:column; align-items:flex-start; gap:4px; }
.cl-act { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
.cl-chev { width:40px; padding:0 !important; }
.cl-det { padding:4px 20px 20px; }
.cl-trk { position:relative; display:flex; align-items:flex-start; width:100%; min-width:0; }
.cl-trk-line { position:absolute; left:10%; right:10%; top:10px; height:2px; background:#e5e3f3; }
.cl-trk-fill { position:absolute; left:10%; top:10px; height:2px; background:#5a35e6; max-width:80%; }
.cl-trk-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; min-width:0; position:relative; }
.cl-trk-dot { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; position:relative; z-index:1; }
.cl-trk-lbl { font-size:11px; }
.cl-ov { position:fixed; inset:0; z-index:60; background:rgba(20,18,58,.5); display:flex; align-items:center; justify-content:center; padding:16px; }
.cl-mod { background:#fff; border-radius:22px; width:100%; max-width:440px; max-height:92vh; overflow:auto; box-shadow:0 30px 60px -20px rgba(20,18,58,.5); }
.cl-mh { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 20px; border-bottom:1px solid #eeecf7; }
.cl-mb { display:flex; flex-direction:column; gap:16px; padding:20px; }
.cl-x { flex:none; width:40px; height:40px; border-radius:12px; border:0; background:#f0eff7; color:#4a4770; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.cl-opt { display:flex; align-items:center; gap:10px; width:100%; padding:12px 14px; border-radius:14px; border:1.5px solid #e5e3f3; background:#fff; font:inherit; color:#14123a; cursor:pointer; min-height:44px; }
.cl-opt:hover { border-color:#c9b9fb; }
.cl-opt.on { border-color:#5a35e6; background:#f7f4ff; color:#4423c4; }
.cl-toast { position:fixed; top:20px; right:20px; z-index:70; display:flex; gap:10px; align-items:center; padding:12px 16px; border-radius:14px; background:#fff; font-size:14px; font-weight:700; max-width:min(380px, calc(100vw - 32px)); box-shadow:0 18px 36px -18px rgba(20,18,58,.4); animation:clin .25s ease; }
.cl-toast.ok { border:1.5px solid #b8e8d3; color:#14532d; }
.cl-toast.err { border:1.5px solid #f3c9c4; color:#b42318; }
@keyframes clin { from { opacity:0; transform:translateY(-8px); } }
@media (max-width: 1023px) {
  .cl-layout { grid-template-columns:minmax(0,1fr); }
  .cl-row { grid-template-columns:40px minmax(0,1fr) auto; gap:12px 12px; }
  .cl-trkwrap { grid-column:1 / -1; max-width:none; order:5; }
  .cl-act { grid-column:1 / -1; order:6; justify-content:stretch; }
  .cl-act > * { flex:1; }
  .cl-act .cl-chev { flex:none; }
  .cl-stat { order:3; grid-column:auto; align-items:flex-end; }
}
@media (max-width: 767px) {
  .bu-pill { height:44px; }
  .cl-act .bu-btn, .cl-btns .bu-btn, .cl-sm { min-height:44px; height:44px !important; }
  .cl-chev { width:44px; }
  .cl-seg button { height:40px; }
  .cl-rvb { flex-direction:column; padding:14px; gap:14px; }
  .cl-thumb { width:100%; aspect-ratio:16/9; }
  .cl-rvh { padding:12px 14px; }
  .cl-gh { padding:14px 14px 10px; }
  .cl-gt { font-size:16px !important; }
  .cl-row { padding:14px; }
  .cl-det { padding:4px 14px 16px; }
  .cl-btns > * { flex:1 1 100%; }
  .cl-toast { left:16px; right:16px; top:12px; max-width:none; }
  .cl-ov { align-items:flex-end; padding:0; }
  .cl-mod { max-width:none; border-radius:22px 22px 0 0; max-height:92vh; }
  .cl-nav { width:44px; height:44px; }
}
`
