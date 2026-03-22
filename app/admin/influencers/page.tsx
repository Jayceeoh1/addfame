'use client'
// @ts-nocheck
import React from 'react'

import { useState, useEffect, useCallback } from 'react'
import { getAllInfluencers, approveInfluencer, rejectInfluencer, deleteInfluencer } from '@/app/actions/admin'
import { Users, Search, Check, X, Trash2, Eye, Plus, RefreshCw, Instagram, Youtube, Star, Mail, Send, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-gray-800"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" /></svg>
)
const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <Instagram className="w-3.5 h-3.5 text-pink-500" />,
  tiktok: <TikTokIcon />,
  youtube: <Youtube className="w-3.5 h-3.5 text-red-500" />,
}
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  approved: { label: 'Approved', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

export default function AdminInfluencers() {
  const [influencers, setInfluencers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selected, setSelected] = useState<any | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [reminderModal, setReminderModal] = useState<any>(null)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderSending, setReminderSending] = useState(false)
  const [reminderResult, setReminderResult] = useState<any>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getAllInfluencers({ limit: 500 })
    if (res.success) setInfluencers(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(id: string) {
    setActionId(id)
    const res = await approveInfluencer(id)
    if (res.success) {
      setInfluencers(p => p.map(i => i.id === id ? { ...i, approval_status: 'approved' } : i))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, approval_status: 'approved' }))
      notify('✅ Influencer approved!')
    } else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { notify('Please enter a rejection reason', false); return }
    setActionId(id)
    const res = await rejectInfluencer(id, rejectReason.trim())
    if (res.success) {
      setInfluencers(p => p.map(i => i.id === id ? { ...i, approval_status: 'rejected', rejection_reason: rejectReason } : i))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, approval_status: 'rejected', rejection_reason: rejectReason }))
      setRejectModal(null); setRejectReason('')
      notify('Influencer rejected.')
    } else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete permanently? Cannot be undone.')) return
    setActionId(id)
    const res = await deleteInfluencer(id)
    if (res.success) { setInfluencers(p => p.filter(i => i.id !== id)); if (selected?.id === id) setSelected(null); notify('🗑 Deleted.') }
    else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  const counts = { all: influencers.length, pending: influencers.filter(i => i.approval_status === 'pending').length, approved: influencers.filter(i => i.approval_status === 'approved').length, rejected: influencers.filter(i => i.approval_status === 'rejected').length }
  const visible = influencers.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)) && (filter === 'all' || i.approval_status === filter)
  })

  async function sendReminder() {
    if (!reminderModal) return
    setReminderSending(true)
    setReminderResult(null)
    try {
      const res = await fetch('/api/admin/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencer_id: reminderModal.id, custom_message: reminderMessage.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.error) setReminderResult({ ok: false, error: data.error })
      else { setReminderResult({ ok: true, email: data.email, missing: data.missing }); setReminderMessage('') }
    } catch (e: any) { setReminderResult({ ok: false, error: e.message }) }
    finally { setReminderSending(false) }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card{background:white;border:1.5px solid #f0f0f0;border-radius:20px}
        .tab-btn{padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;white-space:nowrap;font-family:inherit;transition:all .15s}
        .tab-btn.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 3px 10px rgba(99,102,241,.3)}
        .tab-btn:not(.on){background:#f3f4f6;color:#6b7280}
        .tab-btn:not(.on):hover{background:#eef2ff;color:#4f46e5}
        .field{padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;width:100%}
        .field:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.08)}
        .field::placeholder{color:#9ca3af;font-weight:400}
        .btn-ok{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:9px;font-size:12px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .15s;font-family:inherit}
        .btn-ok:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 3px 10px rgba(34,197,94,.3)}
        .btn-no{display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:9px;font-size:12px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .15s;font-family:inherit}
        .btn-no:hover:not(:disabled){border-color:#fca5a5;color:#ef4444}
        .btn-ic{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9px;background:white;border:2px solid #f0f0f0;cursor:pointer;transition:all .15s;color:#9ca3af}
        .btn-ic:hover:not(:disabled){border-color:#c7d2fe;color:#6366f1;background:#eef2ff}
        .btn-del:hover:not(:disabled){border-color:#fca5a5!important;color:#ef4444!important;background:#fff5f5!important}
        button:disabled{opacity:.5;cursor:not-allowed;transform:none!important}
        tr:hover td{background:#fafbff}
        @keyframes sd{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .t-anim{animation:sd .3s ease}
        @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fu .35s ease both}
      `}</style>

      {toast && (
        <div className={`t-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>{toast.msg}</div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900">Reject Influencer</h2>
              <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Give a reason — it will be shown to the influencer on their waiting screen.</p>
            <textarea autoFocus className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-red-300 transition resize-none mb-4" style={{ fontFamily: 'inherit', minHeight: '90px' }}
              placeholder="e.g. Bio is too short. Please add more detail about your niche and audience demographics."
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 border-2 border-gray-100 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => handleReject(rejectModal)} disabled={!rejectReason.trim() || actionId === rejectModal}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition">
                {actionId === rejectModal ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-gray-900 text-lg">Profile</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
                <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                  {selected.avatar ? <img src={selected.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-white text-xl">{selected.name?.[0]?.toUpperCase()}</div>}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg">{selected.name}</p>
                  <p className="text-sm text-gray-400">{selected.email}</p>
                  {selected.country && <p className="text-xs text-gray-300 mt-0.5">📍 {selected.country}</p>}
                </div>
              </div>
              {(() => {
                const cfg = STATUS_CFG[selected.approval_status] ?? STATUS_CFG.pending; return (
                  <div className="mb-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black ${cfg.bg} ${cfg.text}`}><span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}</span>
                    {selected.rejection_reason && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-xs font-black text-red-700">Reason:</p><p className="text-xs text-red-600 mt-1">{selected.rejection_reason}</p></div>}
                  </div>
                )
              })()}
              {selected.bio && <div className="mb-4"><p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Bio</p><p className="text-sm text-gray-600 leading-relaxed">{selected.bio}</p></div>}
              {selected.niches?.length > 0 && <div className="mb-4"><p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Niches</p><div className="flex flex-wrap gap-1.5">{selected.niches.map((n: string) => <span key={n} className="text-xs font-bold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">{n}</span>)}</div></div>}
              {selected.platforms?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforms</p>
                  <div className="space-y-2">{selected.platforms.map((p: any) => (
                    <div key={p.platform} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      {PLATFORM_ICON[p.platform?.toLowerCase()] ?? <Star className="w-3.5 h-3.5 text-gray-400" />}
                      <span className="text-sm font-bold text-gray-700 capitalize flex-1">{p.platform}</span>
                      {p.followers && <span className="text-xs font-black text-purple-600">{p.followers}</span>}
                    </div>
                  ))}</div>
                </div>
              )}
              <div className="flex gap-3">
                {selected.approval_status === 'pending' && <>
                  <button onClick={() => handleApprove(selected.id)} disabled={actionId === selected.id} className="btn-ok flex-1 justify-center py-3 text-sm rounded-xl">
                    {actionId === selected.id ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                  </button>
                  <button onClick={() => setRejectModal(selected.id)} disabled={actionId === selected.id} className="btn-no flex-1 justify-center py-3 text-sm rounded-xl"><X className="w-4 h-4" /> Reject</button>
                </>}
                {selected.approval_status === 'approved' && <button onClick={() => setRejectModal(selected.id)} className="btn-no flex-1 justify-center py-3 text-sm rounded-xl"><X className="w-4 h-4" /> Suspend</button>}
                {selected.approval_status === 'rejected' && <button onClick={() => handleApprove(selected.id)} disabled={actionId === selected.id} className="btn-ok w-full justify-center py-3 text-sm rounded-xl"><Check className="w-4 h-4" /> Re-approve</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 fu">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Influencers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{counts.pending > 0 && <span className="text-amber-600 font-black">{counts.pending} pending · </span>}{counts.all} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-gray-200 bg-white"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/admin/influencers/create" className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 3px 10px rgba(99,102,241,.3)' }}><Plus className="w-4 h-4" /> Add</Link>
        </div>
      </div>

      <div className="card p-4 mb-5 fu" style={{ animationDelay: '.05s' }}>
        <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input className="field" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} className={`tab-btn flex-shrink-0 ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {counts[f] > 0 && <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/25' : f === 'pending' ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{counts[f]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden fu" style={{ animationDelay: '.1s' }}>
        {loading ? <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} /></div>
          : visible.length === 0 ? <div className="text-center py-16"><Users className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="font-bold text-gray-400">No influencers found</p></div>
            : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead style={{ borderBottom: '1.5px solid #f0f0f0', background: '#fafafa' }}>
                <tr>{['Influencer', 'Niches', 'Platforms', 'Status', 'Actions'].map(h => <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>)}</tr>
              </thead>
              <tbody>{visible.map(inf => {
                const cfg = STATUS_CFG[inf.approval_status] ?? STATUS_CFG.pending
                const busy = actionId === inf.id
                return (
                  <tr key={inf.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.12))' }}>
                          {inf.avatar ? <img src={inf.avatar} className="w-full h-full object-cover" alt="" /> : <span className="font-black text-purple-500 text-sm">{inf.name?.[0]?.toUpperCase()}</span>}
                        </div>
                        <div>
                          <button onClick={() => setSelected(inf)} className="font-black text-gray-900 hover:text-indigo-600 transition text-left">{inf.name}</button>
                          <p className="text-xs text-gray-400">{inf.country || inf.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><div className="flex flex-wrap gap-1 max-w-[150px]">{(inf.niches ?? []).slice(0, 2).map((n: string) => <span key={n} className="text-[11px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{n}</span>)}{(inf.niches?.length ?? 0) > 2 && <span className="text-[11px] text-gray-400">+{inf.niches.length - 2}</span>}</div></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-1.5">{(inf.platforms ?? []).slice(0, 3).map((p: any) => <span key={p.platform}>{PLATFORM_ICON[p.platform?.toLowerCase()] ?? <Star className="w-3.5 h-3.5 text-gray-300" />}</span>)}{!inf.platforms?.length && <span className="text-xs text-gray-300">—</span>}</div></td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}><span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button className="btn-ic" onClick={() => setSelected(inf)} title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                        {inf.approval_status === 'pending' && <>
                          <button className="btn-ok" onClick={() => handleApprove(inf.id)} disabled={busy}>{busy ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Approve</>}</button>
                          <button className="btn-no" onClick={() => setRejectModal(inf.id)} disabled={busy}><X className="w-3.5 h-3.5" /> Reject</button>
                        </>}
                        {inf.approval_status === 'approved' && <button className="btn-no" onClick={() => setRejectModal(inf.id)} disabled={busy}><X className="w-3.5 h-3.5" /> Suspend</button>}
                        {inf.approval_status === 'rejected' && <button className="btn-ok" onClick={() => handleApprove(inf.id)} disabled={busy}><Check className="w-3.5 h-3.5" /> Re-approve</button>}
                        <button className="btn-ic btn-del" onClick={() => handleDelete(inf.id)} disabled={busy} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        <button className="btn-ic" onClick={() => { setReminderModal(inf); setReminderResult(null) }} title="Trimite reminder completare profil" style={{ borderColor: '#ddd6fe', color: '#8b5cf6' }}><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table></div>}
      </div>

      {/* Reminder Modal */}
      {reminderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900">Reminder completare profil</h2>
                  <p className="text-xs text-gray-400">{reminderModal.name}</p>
                </div>
              </div>
              <button onClick={() => { setReminderModal(null); setReminderResult(null) }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {reminderResult?.ok ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Send className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="font-black text-green-700 mb-1">Email trimis cu succes! ✅</p>
                  <p className="text-sm text-gray-400">Trimis la: {reminderResult.email}</p>
                  {reminderResult.missing?.length > 0 && (
                    <div className="mt-3 text-left bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-bold text-gray-500 mb-2">Elemente lipsă incluse în email:</p>
                      {reminderResult.missing.map((m: string, i: number) => (
                        <p key={i} className="text-xs text-gray-500">● {m}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setReminderModal(null); setReminderResult(null) }}
                    className="mt-4 px-6 py-2.5 rounded-xl font-black text-sm text-white w-full"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>Închide</button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Se va trimite un email la <strong>{reminderModal.name}</strong> cu elementele lipsă din profil și un link direct.</p>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Mesaj personalizat (opțional)</label>
                    <textarea value={reminderMessage} onChange={e => setReminderMessage(e.target.value)}
                      placeholder="Ex: Salut! Te rugăm să completezi profilul pentru a fi vizibil brandurilor..."
                      rows={3} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition resize-none"
                      style={{ fontFamily: 'inherit' }} />
                  </div>
                  {reminderResult?.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600">{reminderResult.error}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { setReminderModal(null); setReminderResult(null) }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
                    <button onClick={sendReminder} disabled={reminderSending}
                      className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                      {reminderSending
                        ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Trimit…</>
                        : <><Send className="w-4 h-4" /> Trimite email</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
