'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllCollaborations } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/client'
import { ThumbnailUpload } from '@/components/ThumbnailUpload'
import {
  Search, RefreshCw, Handshake, CheckCircle, Clock, XCircle,
  ExternalLink, X, Copy, Eye, AlertTriangle, DollarSign,
  Link2, MessageSquare, Zap, ChevronRight, Check, RotateCcw
} from 'lucide-react'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:   { label: 'Aplicat',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  INVITED:   { label: 'Invitat',   bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  ACTIVE:    { label: 'Activ',     bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Finalizat', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  REJECTED:  { label: 'Respins',   bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
}

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition px-2 py-1 rounded-lg hover:bg-indigo-50">
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiat!' : (label || 'Copiază')}
    </button>
  )
}

export default function AdminCollaborations() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getAllCollaborations(200) as any
    if (res.success) setItems(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Aprobă deliverable
  async function approveDeliverable() {
    if (!selected) return
    setActionLoading(true)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const { error } = await sb.from('collaborations').update({
        status: 'COMPLETED',
        deliverable_approved_at: now,
        completed_at: now,
      }).eq('id', selected.id)
      if (error) throw error
      notify('✅ Deliverable aprobat și colaborare finalizată!')
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, status: 'COMPLETED', deliverable_approved_at: now, completed_at: now } : i))
      setSelected((s: any) => ({ ...s, status: 'COMPLETED', deliverable_approved_at: now }))
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setActionLoading(false) }
  }

  // Respinge deliverable
  async function rejectDeliverable() {
    if (!selected || !rejectReason.trim()) { notify('Introdu motivul respingerii', false); return }
    setActionLoading(true)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const { error } = await sb.from('collaborations').update({
        deliverable_rejected_at: now,
        deliverable_rejection_reason: rejectReason.trim(),
        deliverable_submitted_at: null,
      }).eq('id', selected.id)
      if (error) throw error
      notify('Post respins. Influencerul va fi notificat.')
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, deliverable_rejected_at: now, deliverable_rejection_reason: rejectReason, deliverable_submitted_at: null } : i))
      setSelected((s: any) => ({ ...s, deliverable_rejected_at: now, deliverable_rejection_reason: rejectReason, deliverable_submitted_at: null }))
      setShowReject(false)
      setRejectReason('')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setActionLoading(false) }
  }

  // Forțează finalizare (fără deliverable)
  async function forceComplete() {
    if (!selected) return
    if (!confirm('Forțezi finalizarea acestei colaborări? Plata va fi eliberată influencerului.')) return
    setActionLoading(true)
    try {
      const sb = createClient()
      const { error } = await sb.from('collaborations').update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      }).eq('id', selected.id)
      if (error) throw error
      notify('✅ Colaborare forțat finalizată!')
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, status: 'COMPLETED' } : i))
      setSelected((s: any) => ({ ...s, status: 'COMPLETED' }))
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setActionLoading(false) }
  }

  const filtered = items.filter(i => {
    const inf = i.influencers?.name?.toLowerCase() ?? ''
    const brand = i.brands?.name?.toLowerCase() ?? ''
    const camp = i.campaigns?.title?.toLowerCase() ?? ''
    const q = search.toLowerCase()
    const matchSearch = !search || inf.includes(q) || brand.includes(q) || camp.includes(q)
    const matchFilter = filter === 'all' || i.status === filter
    return matchSearch && matchFilter
  })

  const counts = Object.fromEntries(
    Object.keys(STATUS).map(k => [k, items.filter(i => i.status === k).length])
  )

  // Colaborări cu deliverable trimis și neaprobat — urgent!
  const pendingReview = items.filter(i => i.deliverable_submitted_at && !i.deliverable_approved_at && !i.deliverable_rejected_at && i.status !== 'COMPLETED')

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{``}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Toate Colaborările</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {items.length} colaborări totale
            {pendingReview.length > 0 && <span className="text-amber-600 font-bold ml-2">· {pendingReview.length} în așteptare verificare</span>}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizează
        </button>
      </div>

      {/* Alert deliverabile în așteptare */}
      {pendingReview.length > 0 && (
        <div className="mb-5 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black text-amber-700 text-sm">{pendingReview.length} post{pendingReview.length > 1 ? 'uri' : ''} trimis{pendingReview.length > 1 ? 'e' : ''} — necesită verificare</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingReview.slice(0, 3).map(i => (
                <button key={i.id} onClick={() => { setSelected(i); setFilter('all') }}
                  className="text-xs font-bold text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-full hover:bg-amber-100 transition">
                  {i.influencers?.name} → {i.campaigns?.title?.slice(0, 20)}…
                </button>
              ))}
              {pendingReview.length > 3 && <span className="text-xs text-amber-600 font-bold">+{pendingReview.length - 3} altele</span>}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Toate ({items.length})
        </button>
        {Object.entries(STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${filter === k ? `${v.bg} ${v.text} border border-current` : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {v.label} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută influencer, brand, campanie..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Handshake className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">Nicio colaborare găsită</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f5f5f5' }}>
                {['Influencer', 'Brand', 'Campanie', 'Deliverable', 'Plată', 'Status', 'Dată', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const st = STATUS[item.status] ?? STATUS.PENDING
                const hasDeliverable = !!item.deliverable_url
                const pendingApproval = hasDeliverable && item.deliverable_submitted_at && !item.deliverable_approved_at && !item.deliverable_rejected_at && item.status !== 'COMPLETED'
                const wasRejected = item.deliverable_rejected_at && !item.deliverable_submitted_at

                return (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition cursor-pointer" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f9f9f9' : 'none' }}
                    onClick={() => { setSelected(item); setShowReject(false); setRejectReason('') }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.influencers?.avatar
                            ? <img src={item.influencers.avatar} alt="" className="w-full h-full object-cover" />
                            : <span className="text-xs font-black text-indigo-600">{item.influencers?.name?.[0] ?? '?'}</span>
                          }
                        </div>
                        <div>
                          <p className="font-black text-sm text-gray-900">{item.influencers?.name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{item.influencers?.email ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm text-gray-700">{item.campaigns?.brand_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-sm text-gray-600 truncate">{item.campaigns?.title ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {pendingApproval && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ În așteptare
                        </span>
                      )}
                      {wasRejected && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          ✗ Respins
                        </span>
                      )}
                      {item.deliverable_approved_at && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ Aprobat
                        </span>
                      )}
                      {!hasDeliverable && item.status === 'ACTIVE' && (
                        <span className="text-xs text-gray-300">Netrimis</span>
                      )}
                      {item.ads_code && (
                        <span className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          🎯 Ads
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.payment_amount
                        ? <p className="font-black text-sm text-green-600">{fmt(item.payment_amount)}</p>
                        : item.reserved_amount
                          ? <p className="font-bold text-sm text-amber-600">🔒 {fmt(item.reserved_amount)}</p>
                          : <p className="text-xs text-gray-300">—</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-gray-500">{fmtDateShort(item.created_at)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Drawer detalii ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => { setSelected(null); setShowReject(false); setRejectReason('') }} />

          {/* Panel */}
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between z-10">
              <div>
                <h2 className="font-black text-gray-900">
                  {selected.influencers?.name} × {selected.campaigns?.brand_name ?? selected.campaigns?.title}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{selected.campaigns?.title}</p>
              </div>
              <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason('') }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {/* Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {(() => { const st = STATUS[selected.status] ?? STATUS.PENDING; return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black ${st.bg} ${st.text}`}>
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />{st.label}
                  </span>
                )})()}
                <span className="text-xs text-gray-400">{fmtDate(selected.created_at)}</span>
              </div>

              {/* Sume */}
              <div className="grid grid-cols-2 gap-3">
                {selected.reserved_amount > 0 && (
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">🔒 Escrow blocat</p>
                    <p className="font-black text-amber-700">{fmt(selected.reserved_amount)}</p>
                  </div>
                )}
                {selected.payment_amount > 0 && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">✅ Plătit influencer</p>
                    <p className="font-black text-green-700">{fmt(selected.payment_amount)}</p>
                  </div>
                )}
                {selected.platform_fee > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-3">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">💰 Comision platformă</p>
                    <p className="font-black text-indigo-700">{fmt(selected.platform_fee)}</p>
                  </div>
                )}
              </div>

              {/* Deliverable */}
              {selected.deliverable_url && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">📦 Deliverable trimis</p>

                  {/* Thumbnail — admin poate adăuga dacă influencerul a uitat */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1.5">
                      Screenshot postare
                      {!selected.thumbnail_url && <span className="text-orange-500 ml-1">(lipsă — adaugă tu)</span>}
                    </p>
                    <ThumbnailUpload
                      collabId={selected.id}
                      currentUrl={selected.thumbnail_url}
                      isAdmin={true}
                      onUploaded={url => setSelected((prev: any) => prev ? { ...prev, thumbnail_url: url } : prev)}
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-3">
                    <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <a href={selected.deliverable_url} target="_blank" rel="noreferrer"
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline truncate flex-1">
                      {selected.deliverable_url}
                    </a>
                    <a href={selected.deliverable_url} target="_blank" rel="noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition">
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                    </a>
                  </div>

                  {selected.deliverable_submitted_at && (
                    <p className="text-xs text-gray-400">Trimis: {fmtDate(selected.deliverable_submitted_at)}</p>
                  )}
                  {selected.deliverable_approved_at && (
                    <p className="text-xs text-green-600 font-bold">✅ Aprobat: {fmtDate(selected.deliverable_approved_at)}</p>
                  )}
                  {selected.deliverable_rejected_at && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs font-black text-red-600">Respins: {fmtDate(selected.deliverable_rejected_at)}</p>
                      {selected.deliverable_rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">Motiv: {selected.deliverable_rejection_reason}</p>
                      )}
                    </div>
                  )}
                  {selected.deliverable_note && (
                    <div className="bg-white border border-gray-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Notă influencer</p>
                      <p className="text-xs text-gray-600 italic">„{selected.deliverable_note}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ads Code */}
              {selected.ads_code && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">🎯 Cod Spark Ads / Partnership Ads</p>
                  <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-3 py-2">
                    <span className="font-mono font-black text-blue-700 text-sm flex-1">{selected.ads_code}</span>
                    <CopyBtn text={selected.ads_code} />
                  </div>
                  <p className="text-[10px] text-blue-500 mt-2">
                    Copiază codul și folosește-l în TikTok Ads Manager (Spark Ads) sau Meta Ads Manager (Partnership Ads).
                  </p>
                </div>
              )}

              {/* Adresa livrare - barter */}
              {selected.delivery_name && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-orange-600 uppercase tracking-wider mb-3">📦 Adresă livrare produs</p>
                  <div className="space-y-1.5">
                    <p className="text-sm font-black text-gray-800">{selected.delivery_name}</p>
                    <p className="text-sm text-gray-600">📞 {selected.delivery_phone}</p>
                    <p className="text-sm text-gray-600">🏠 {selected.delivery_address}</p>
                    <p className="text-sm text-gray-600">📍 {selected.delivery_city}, {selected.delivery_county}{selected.delivery_postal_code ? `, ${selected.delivery_postal_code}` : ''}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(
                      `${selected.delivery_name}\n${selected.delivery_phone}\n${selected.delivery_address}\n${selected.delivery_city}, ${selected.delivery_county} ${selected.delivery_postal_code || ''}`
                    )}
                    className="mt-3 flex items-center gap-1.5 text-xs font-black text-orange-600 bg-white border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
                  >
                    <Copy className="w-3 h-3" /> Copiază adresa
                  </button>
                </div>
              )}

              {/* Mesaj */}
              {selected.message && selected.message !== 'You have been invited to collaborate on a campaign.' && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Mesaj aplicare</p>
                    <p className="text-xs text-gray-600 italic">„{selected.message}"</p>
                  </div>
                </div>
              )}

              {/* Campaign deliverables */}
              {selected.campaigns?.deliverables && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Ce trebuia să facă</p>
                  <p className="text-xs text-gray-600">{selected.campaigns.deliverables}</p>
                </div>
              )}

              {/* ── Acțiuni admin ── */}
              {selected.status === 'ACTIVE' && selected.deliverable_submitted_at && !selected.deliverable_approved_at && !selected.deliverable_rejected_at && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Acțiuni admin</p>

                  {!showReject ? (
                    <div className="flex gap-2">
                      <button onClick={approveDeliverable} disabled={actionLoading}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                        Aprobă & eliberează plata
                      </button>
                      <button onClick={() => setShowReject(true)}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 transition flex items-center justify-center gap-2">
                        <X className="w-4 h-4" /> Respinge
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-black text-red-700">Motiv respingere:</p>
                      <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Ex: Postul nu conține hashtag-urile cerute. Te rugăm să corectezi și să retrimiti."
                        rows={3} className="w-full px-3 py-2 border-2 border-red-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none"
                        style={{ fontFamily: 'inherit' }} />
                      <div className="flex gap-2">
                        <button onClick={rejectDeliverable} disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition">
                          {actionLoading ? 'Se trimite…' : 'Confirmă respingerea'}
                        </button>
                        <button onClick={() => { setShowReject(false); setRejectReason('') }}
                          className="px-4 py-2.5 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition">
                          Anulează
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Forțare finalizare pentru colaborări active fără deliverable */}
              {selected.status === 'ACTIVE' && !selected.deliverable_submitted_at && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Acțiuni admin</p>
                  <button onClick={forceComplete} disabled={actionLoading}
                    className="w-full py-2.5 rounded-xl font-bold text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" /> Forțează finalizare (fără deliverable)
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-1">Folosește doar dacă colaborarea s-a încheiat offline.</p>
                </div>
              )}

              {selected.status === 'COMPLETED' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-black text-green-700">Colaborare finalizată ✓</p>
                  {selected.completed_at && <p className="text-xs text-green-500 mt-1">{fmtDate(selected.completed_at)}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
