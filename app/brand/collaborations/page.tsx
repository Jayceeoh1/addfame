'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Search, Check, X, Clock, CheckCircle, Zap,
  RefreshCw, MessageSquare, ExternalLink, AlertCircle,
  Link2, ThumbsUp, ThumbsDown, Eye, Calendar, DollarSign,
  AlertTriangle, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { approveApplication, approveDeliverable, rejectDeliverable, cancelCollaboration } from '@/app/actions/collaborations'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: 'Applied', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  INVITED: { label: 'Invited', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { label: 'Active', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  REJECTED: { label: 'Declined', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
}

const TABS = ['All', 'Applied', 'Invited', 'Active', 'Pending Review', 'Completed', 'Declined'] as const
type Tab = typeof TABS[number]
const TAB_FILTER: Record<Tab, (c: any) => boolean> = {
  'All': c => true,
  'Applied': c => c.status === 'PENDING',
  'Invited': c => c.status === 'INVITED',
  'Active': c => c.status === 'ACTIVE',
  'Pending Review': c => c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at,
  'Completed': c => c.status === 'COMPLETED',
  'Declined': c => c.status === 'REJECTED',
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
    ? new Date(collab.deliverable_submitted_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-orange-200">
      {/* Header */}
      <div className="bg-orange-50 px-4 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <p className="text-xs font-black text-orange-700 uppercase tracking-wider flex-1">Dovadă post trimisă de influencer</p>
        <span className="text-xs text-gray-400">{submittedAt}</span>
      </div>

      <div className="bg-white p-4 space-y-3">
        {/* Post link — prominent preview */}
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

        {/* Note from influencer */}
        {collab.deliverable_note && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">Notă de la influencer</p>
            <p className="text-sm text-gray-600 italic">„{collab.deliverable_note}"</p>
          </div>
        )}

        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

        {/* Reject reason form */}
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

        {/* Action buttons */}
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
      const { data: colls } = await sb.from('collaborations').select('*, reserved_amount, payment_amount').in('campaign_id', campIds).order('created_at', { ascending: false })
      if (colls && colls.length > 0) {
        const infIds = [...new Set(colls.map((c: any) => c.influencer_id).filter(Boolean))]
        const { data: infs } = await sb.from('influencers').select('id, name, avatar, niches, platforms, country').in('id', infIds as string[])
        const infMap = Object.fromEntries((infs || []).map((i: any) => [i.id, i]))
        setCollabs(colls.map((c: any) => ({ ...c, influencer: infMap[c.influencer_id] || null, campaign: campMap[c.campaign_id] || null })))
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

  const pendingReviews = collabs.filter(c => c.status === 'ACTIVE' && c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at).length

  const counts: Record<Tab, number> = {
    'All': collabs.length,
    'Applied': collabs.filter(c => c.status === 'PENDING').length,
    'Invited': collabs.filter(c => c.status === 'INVITED').length,
    'Active': collabs.filter(c => c.status === 'ACTIVE').length,
    'Pending Review': pendingReviews,
    'Completed': collabs.filter(c => c.status === 'COMPLETED').length,
    'Declined': collabs.filter(c => c.status === 'REJECTED').length,
  }

  const visible = collabs.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.influencer?.name?.toLowerCase().includes(q) || c.campaign?.title?.toLowerCase().includes(q)
    return matchQ && TAB_FILTER[tab](c)
  })

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

      {/* Alert: low balance */}
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

      {/* Alert: posts waiting review */}
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

      {/* List */}
      <div className="space-y-3 fade-up" style={{ animationDelay: '.1s' }}>
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
                      <span>{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.status === 'ACTIVE' && c.reserved_amount ? (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        🔒 Plată garantată
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        ✅ Campanie finalizată
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
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Aplicat: {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                      {c.campaign?.title && (
                        <Link href={`/brand/campaigns/${c.campaign_id}`}
                          className="font-bold text-orange-500 hover:underline flex items-center gap-1">
                          Campania <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {/* Approve/decline application */}
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

                    {/* Active — waiting for deliverable */}
                    {c.status === 'ACTIVE' && !hasPendingDeliverable && !c.deliverable_rejected_at && (
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
                        <p className="text-xs text-purple-700 font-semibold">
                          Așteptăm ca influencerul să trimită dovada postului…
                        </p>
                      </div>
                    )}

                    {/* Active — deliverable rejected, waiting resubmission */}
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

                    {/* Completed */}
                    {c.status === 'COMPLETED' && (
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
                        {c.deliverable_approved_at && (
                          <p className="text-xs text-gray-400 mt-2">
                            Aprobat: {new Date(c.deliverable_approved_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
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
