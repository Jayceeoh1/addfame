'use client'
// @ts-nocheck
import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { getAllInfluencers, approveInfluencer, rejectInfluencer, deleteInfluencer, approveIdentityManual, adminImpersonateUser } from '@/app/actions/admin'
import { getCreatorLevel, LEVEL_CONFIG, BADGE_IMAGES } from '@/lib/creator-score'
import { Users, Search, Check, X, Trash2, Eye, Plus, RefreshCw, Instagram, Youtube, Star, Mail, Shield, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" /></svg>
)

function fmtFollowers(n: number) {
  if (!n) return null
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

const PER_PAGE = 50

export default function AdminInfluencers() {
  const [influencers, setInfluencers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selected, setSelected] = useState<any | null>(null)
  const [scoreLevel, setScoreLevel] = useState<'all' | 'starter' | 'rising' | 'pro' | 'elite'>('all')
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [page, setPage] = useState(1)
  const [showBulkReminder, setShowBulkReminder] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: number } | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Încărcăm câte 50 per request ca să nu timeout-uiască
      let all: any[] = []
      let offset = 0
      const BATCH = 50
      while (true) {
        const res = await getAllInfluencers({ limit: BATCH, offset })
        if (!res.success || !res.data?.length) break
        all = [...all, ...res.data]
        if (res.data.length < BATCH) break
        offset += BATCH
      }
      setInfluencers(all)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleIdentityApprove(id: string) {
    setActionId(id)
    const res = await approveIdentityManual(id)
    if (res.success) {
      setInfluencers(p => p.map(i => i.id === id ? { ...i, identity_verified: true } : i))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, identity_verified: true }))
      notify('✅ Identitate aprobată!')
    } else notify('❌ Eroare: ' + res.error, false)
    setActionId(null)
  }

  async function handleApprove(id: string) {
    setActionId(id)
    const res = await approveInfluencer(id)
    if (res.success) {
      setInfluencers(p => p.map(i => i.id === id ? { ...i, approval_status: 'approved' } : i))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, approval_status: 'approved' }))
      notify('✅ Influencer aprobat!')
    } else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { notify('Introdu motivul respingerii', false); return }
    setActionId(id)
    const res = await rejectInfluencer(id, rejectReason.trim())
    if (res.success) {
      setInfluencers(p => p.map(i => i.id === id ? { ...i, approval_status: 'rejected', rejection_reason: rejectReason } : i))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, approval_status: 'rejected' }))
      setRejectModal(null); setRejectReason('')
      notify('Influencer respins.')
    } else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  async function handleImpersonate(userId: string, label: string) {
    if (!confirm(`Vrei să te loghezi ca ${label}?\n\nO să fii deconectat de la contul de admin și o să intri direct pe contul lor în acest tab.\n\nPentru a reveni la admin, fă logout și loghează-te din nou cu contul tău.`)) return
    const res = await adminImpersonateUser(userId) as any
    if (res?.error) { alert('❌ ' + res.error); return }
    if (res?.magicLink) window.location.href = res.magicLink
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi definitiv? Nu poate fi anulat.')) return
    setActionId(id)
    const res = await deleteInfluencer(id)
    if (res.success) {
      setInfluencers(p => p.filter(i => i.id !== id))
      if (selected?.id === id) setSelected(null)
      notify('🗑 Șters.')
    } else notify((res as any).error || 'Failed.', false)
    setActionId(null)
  }

  function isIncomplete(inf: any) {
    const missing = []
    if (!inf.avatar) missing.push('Poză')
    if (!inf.bio) missing.push('Bio')
    if (!inf.niches?.length) missing.push('Nișe')
    if (!inf.platforms?.length) missing.push('Platforme')
    return missing
  }

  const incompleteInfluencers = influencers.filter(i => i.approval_status === 'approved' && i.email && isIncomplete(i).length > 0)

  async function sendBulkReminder() {
    if (!confirm(`Trimiți reminder la ${incompleteInfluencers.length} influenceri cu profil incomplet?`)) return
    setBulkSending(true); setBulkResult(null)
    let ok = 0, fail = 0
    for (const inf of incompleteInfluencers) {
      try {
        const res = await fetch('/api/admin/reminder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ influencer_id: inf.id }) })
        const data = await res.json()
        if (res.ok && !data.error) ok++; else fail++
      } catch { fail++ }
      await new Promise(r => setTimeout(r, 150))
    }
    setBulkResult({ ok, fail }); setBulkSending(false)
  }

  const counts = {
    all: influencers.length,
    pending: influencers.filter(i => i.approval_status === 'pending').length,
    approved: influencers.filter(i => i.approval_status === 'approved').length,
    rejected: influencers.filter(i => i.approval_status === 'rejected').length,
    strikes: influencers.filter(i => (i.strikes || 0) > 0 && !i.blacklisted).length,
    blacklisted: influencers.filter(i => i.blacklisted).length,
  }

  const filtered = influencers.filter(i => {
    const q = search.toLowerCase()
    const matchSearch = !q || i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'strikes') return (i.strikes || 0) > 0 && !i.blacklisted
    if (filter === 'blacklisted') return !!i.blacklisted
    return filter === 'all' || i.approval_status === filter
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1) }, [search, filter])

  const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
    approved: { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
    pending: { bg: '#fffbeb', color: '#b45309', dot: '#f59e0b' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', dot: '#ef4444' },
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .3s ease both; }
        .toast-anim { animation:slideD .3s ease; }
        .inf-card { background:white;border-radius:16px;border:1.5px solid #f0f0f0;padding:14px;transition:all .15s;cursor:pointer; }
        .inf-card:hover { border-color:#ddd6fe;box-shadow:0 4px 16px rgba(139,92,246,0.08);transform:translateY(-2px); }
        .inf-card.selected-card { border-color:#8b5cf6;box-shadow:0 4px 16px rgba(139,92,246,0.15); }
        .action-btn { width:30px;height:30px;border-radius:8px;border:1.5px solid #f0f0f0;background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s; }
        .action-btn:hover { background:#f9fafb;border-color:#e5e7eb; }
        .filter-btn { padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;border:1.5px solid transparent;cursor:pointer;transition:all .15s;font-family:inherit; }
        .filter-btn.active { background:#ede9fe;color:#5b21b6;border-color:#ddd6fe; }
        .filter-btn:not(.active) { background:#f9fafb;color:#6b7280;border-color:#f0f0f0; }
        .filter-btn:not(.active):hover { background:#f0f0f0; }
        .page-btn { width:36px;height:36px;border-radius:10px;border:1.5px solid #f0f0f0;background:white;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:inherit;color:#374151; }
        .page-btn:hover:not(:disabled) { border-color:#ddd6fe;background:#faf5ff; }
        .page-btn.active { background:#8b5cf6;color:white;border-color:#8b5cf6; }
        .page-btn:disabled { opacity:0.4;cursor:not-allowed; }
        .niche-pill { font-size:10px;font-weight:700;background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:99px; }
        .field { width:100%;padding:10px 14px;border:1.5px solid #f0f0f0;border-radius:12px;font-size:14px;outline:none;background:white;font-family:inherit;transition:border-color .2s; }
        .field:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.08); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="font-black text-gray-900 mb-4">Motiv respingere</h2>
            <textarea className="field mb-4" rows={3} placeholder="Motivul va fi trimis influencerului..."
              value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ resize: 'none' }} />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
              <button onClick={() => handleReject(rejectModal)} disabled={!rejectReason.trim() || actionId === rejectModal}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition">
                {actionId === rejectModal ? 'Se trimite…' : 'Respinge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelected(null)}>
          <div className="ml-auto h-full w-full max-w-sm bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="font-black text-gray-900">Detalii influencer</p>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="text-center mb-5">
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-black text-white text-2xl"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                    {selected.avatar
                      ? <img src={selected.avatar} className="w-full h-full object-cover" alt="" />
                      : selected.name?.[0]?.toUpperCase()}
                  </div>
                  {selected.creator_score != null && (
                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', border: '2.5px solid white', overflow: 'hidden', background: 'white' }}>
                      <img src={BADGE_IMAGES[getCreatorLevel(selected.creator_score || 0)]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
                <p className="font-black text-gray-900">{selected.name}</p>
                <p className="text-sm text-gray-400">{selected.email}</p>
                {selected.city && <p className="text-xs text-gray-300 mt-0.5">📍 {selected.city}, {selected.country}</p>}
                {selected.last_active_at && (() => {
                  const days = Math.floor((Date.now() - new Date(selected.last_active_at).getTime()) / 86_400_000)
                  const color = days <= 1 ? '#10b981' : days <= 7 ? '#f59e0b' : '#ef4444'
                  const label = days === 0 ? 'Activ azi' : days === 1 ? 'Activ ieri' : days <= 7 ? `Activ acum ${days} zile` : days <= 30 ? `Inactiv de ${days} zile` : 'Inactiv 30+ zile'
                  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '3px 10px', borderRadius: 99, background: `${color}20`, border: `1px solid ${color}40` }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                  </div>
                })()}
                {selected.creator_score != null && (() => {
                  const lvl = getCreatorLevel(selected.creator_score || 0)
                  const cfg = LEVEL_CONFIG[lvl]
                  return (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '5px 12px', borderRadius: 100, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: cfg.color }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, color: cfg.color, opacity: 0.7 }}>{(selected.creator_score || 0).toLocaleString('ro-RO')} pts</span>
                    </div>
                  )
                })()}
                <div className="flex items-center justify-center gap-2 mt-2">
                  {(() => {
                    const cfg = STATUS_COLORS[selected.approval_status] || STATUS_COLORS.pending
                    return (
                      <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                        {selected.approval_status}
                      </span>
                    )
                  })()}
                  {selected.identity_verified && (
                    <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>✓ ID verificat</span>
                  )}
                </div>
              </div>

              {selected.bio && (
                <div className="mb-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Bio</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selected.bio}</p>
                </div>
              )}

              {selected.niches?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Nișe</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.niches.map((n: string) => <span key={n} className="niche-pill">{n}</span>)}
                  </div>
                </div>
              )}

              {selected.platforms?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforme</p>
                  <div className="space-y-2">
                    {selected.platforms.map((p: any, i: number) => {
                      // Platformele sunt salvate cu câmpul 'url' direct
                      const rawUrl = p.url || (
                        p.username
                          ? p.platform === 'instagram'
                            ? `https://instagram.com/${p.username}`
                            : p.platform === 'tiktok'
                            ? `https://tiktok.com/@${p.username}`
                            : p.platform === 'youtube'
                            ? `https://youtube.com/@${p.username}`
                            : null
                          : null
                      )
                      // Asigura-te ca URL-ul are https://
                      const url = rawUrl
                        ? rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
                        : null
                      return (
                        <a key={i} href={url || '#'} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-purple-50 transition"
                          style={{ textDecoration: 'none', cursor: url ? 'pointer' : 'default', border: '1.5px solid transparent' }}
                          onMouseEnter={e => url && ((e.currentTarget as HTMLElement).style.borderColor = '#ddd6fe')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'transparent')}>
                          {p.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />}
                          {p.platform === 'tiktok' && <span className="flex-shrink-0"><TikTokIcon /></span>}
                          {p.platform === 'youtube' && <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          <span className="text-xs font-bold text-gray-600 capitalize">{p.platform}</span>
                          {p.username && <span className="text-xs text-gray-400">@{p.username}</span>}
                          {(p.followers || p.follower_count) && <span className="ml-auto text-xs font-black text-purple-600">{fmtFollowers(p.followers || p.follower_count)}</span>}
                          {url && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4" style={{ borderTop: '1.5px solid #f5f5f5' }}>
                {selected.approval_status === 'pending' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(selected.id)} disabled={actionId === selected.id}
                      className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {actionId === selected.id ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Aprobă</>}
                    </button>
                    <button onClick={() => setRejectModal(selected.id)} disabled={actionId === selected.id}
                      className="flex-1 py-3 rounded-xl font-black text-sm text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition flex items-center justify-center gap-2">
                      <X className="w-4 h-4" /> Respinge
                    </button>
                  </div>
                )}
                {selected.approval_status === 'approved' && (
                  <button onClick={() => setRejectModal(selected.id)}
                    className="w-full py-3 rounded-xl font-black text-sm text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Suspend
                  </button>
                )}
                {selected.approval_status === 'rejected' && (
                  <button onClick={() => handleApprove(selected.id)} disabled={actionId === selected.id}
                    className="w-full py-3 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Re-aprobă
                  </button>
                )}
                {!selected.identity_verified && (
                  <button onClick={() => handleIdentityApprove(selected.id)} disabled={actionId === selected.id}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                    <Shield className="w-4 h-4" /> Aprobă ID fără documente
                  </button>
                )}
                <Link href={`/admin/influencers/${selected.id}`} target="_blank"
                  className="w-full py-2.5 rounded-xl font-black text-sm text-purple-600 bg-purple-50 border-2 border-purple-200 hover:bg-purple-100 transition flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4" /> Vezi profil complet ↗
                </Link>
                {selected.user_id && (
                  <button onClick={() => handleImpersonate(selected.user_id, selected.name || 'acest influencer')}
                    className="w-full py-2.5 rounded-xl font-black text-sm text-indigo-600 bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 transition flex items-center justify-center gap-2">
                    🔑 Loghează-te ca acest influencer
                  </button>
                )}
                <button onClick={() => handleDelete(selected.id)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm text-red-400 bg-gray-50 hover:bg-red-50 transition flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Șterge definitiv
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fu">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Influencers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{counts.all} total · pagina {page} din {totalPages || 1}</p>
        </div>
        <div className="flex items-center gap-3">
          {incompleteInfluencers.length > 0 && (
            <button onClick={sendBulkReminder} disabled={bulkSending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm border-2 border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 transition disabled:opacity-50">
              <Mail className="w-4 h-4" />
              {bulkSending ? 'Se trimite…' : `Reminder profil (${incompleteInfluencers.length})`}
            </button>
          )}
          {bulkResult && (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl">
              ✓ {bulkResult.ok} trimise{bulkResult.fail > 0 ? `, ${bulkResult.fail} erori` : ''}
            </span>
          )}
          <button onClick={load} disabled={loading} className="w-9 h-9 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/admin/influencers/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
            <Plus className="w-4 h-4" /> Add
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 fu" style={{ animationDelay: '.04s' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="field" style={{ paddingLeft: 38 }} placeholder="Caută după nume sau email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: `Toți ${counts.all}` },
            { key: 'pending', label: `Pending ${counts.pending}` },
            { key: 'approved', label: `Approved ${counts.approved}` },
            { key: 'rejected', label: `Rejected ${counts.rejected}` },
            { key: 'strikes', label: `⚠️ Strikes ${counts.strikes}`, warn: counts.strikes > 0 },
            { key: 'blacklisted', label: `🚫 Blacklist ${counts.blacklisted}`, danger: counts.blacklisted > 0 },
          ].map(f => (
            <button key={f.key}
              className={`filter-btn ${filter === f.key ? 'active' : ''}`}
              style={filter !== f.key && (f as any).danger && counts.blacklisted > 0 ? { borderColor: '#fecaca', color: '#dc2626' } : filter !== f.key && (f as any).warn && counts.strikes > 0 ? { borderColor: '#fed7aa', color: '#c2410c' } : {}}
              onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Score Level Filter */}
        <div className="flex gap-2 flex-wrap items-center">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.05em' }}>NIVEL:</span>
          {([
            { key: 'all',     label: 'Toți' },
            { key: 'starter', label: 'Starter' },
            { key: 'rising',  label: 'Rising' },
            { key: 'pro',     label: 'Pro' },
            { key: 'elite',   label: 'Elite' },
          ] as const).map(f => {
            const cfg = f.key !== 'all' ? LEVEL_CONFIG[f.key] : null
            return (
              <button key={f.key}
                onClick={() => setScoreLevel(f.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${scoreLevel === f.key ? (cfg?.color || '#7c3aed') : '#e5e7eb'}`,
                  background: scoreLevel === f.key ? `${cfg?.color || '#7c3aed'}15` : 'white',
                  color: scoreLevel === f.key ? (cfg?.color || '#7c3aed') : '#6b7280',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                {f.key !== 'all' && <img src={BADGE_IMAGES[f.key]} alt={f.key} style={{ width: 16, height: 16, objectFit: 'contain' }} />}
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #ede9fe', borderTopColor: '#8b5cf6' }} />
        </div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-black text-gray-400">Niciun influencer găsit</p>
        </div>
      ) : (
        <div className="grid gap-4 fu" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', animationDelay: '.08s' }}>
          {paginated.map((inf: any) => {
            const busy = actionId === inf.id
            const status = STATUS_COLORS[inf.approval_status] || STATUS_COLORS.pending
            const platforms = inf.platforms || []
            const missing = isIncomplete(inf)

            return (
              <div key={inf.id}
                className={`inf-card ${selected?.id === inf.id ? 'selected-card' : ''}`}
                onClick={() => setSelected(selected?.id === inf.id ? null : inf)}>

                {/* Avatar + name + status */}
                <div className="flex items-start gap-3 mb-3">
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-black text-white text-base"
                      style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                      {inf.avatar
                        ? <img src={inf.avatar} className="w-full h-full object-cover" alt="" />
                        : inf.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    {/* Creator Score Badge */}
                    {inf.creator_score != null && (
                      <div style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: 'white' }}>
                        <img src={BADGE_IMAGES[getCreatorLevel(inf.creator_score || 0)]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                      <p className="font-black text-sm text-gray-900 truncate">{inf.name}</p>
                      {inf.creator_score != null && (() => {
                        const lvl = getCreatorLevel(inf.creator_score || 0)
                        const cfg = LEVEL_CONFIG[lvl]
                        return <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, background: `${cfg.color}18`, padding: '1px 5px', borderRadius: 99, flexShrink: 0 }}>{cfg.label}</span>
                      })()}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{inf.creator_score || 0} pts · {inf.city || inf.country || 'România'}</p>
                    {inf.last_active_at && (() => {
                      const days = Math.floor((Date.now() - new Date(inf.last_active_at).getTime()) / 86_400_000)
                      const color = days <= 1 ? '#10b981' : days <= 7 ? '#f59e0b' : '#ef4444'
                      const label = days === 0 ? 'Activ azi' : days === 1 ? 'Activ ieri' : days <= 7 ? `Activ ${days}z` : days <= 30 ? `Inactiv ${days}z` : 'Inactiv 30z+'
                      return <span style={{ fontSize: 9, fontWeight: 700, color, background: `${color}18`, padding: '1px 6px', borderRadius: 99 }}>{label}</span>
                    })()}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span style={{ background: status.bg, color: status.color, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
                      {inf.approval_status}
                    </span>
                    {inf.blacklisted && (
                      <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>🚫 Blacklist</span>
                    )}
                    {!inf.blacklisted && (inf.strikes || 0) > 0 && (
                      <span style={{ background: '#fff7ed', color: '#c2410c', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>⚠️ {inf.strikes} strike{inf.strikes > 1 ? '-uri' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Nișe */}
                {inf.niches?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {inf.niches.slice(0, 2).map((n: string) => <span key={n} className="niche-pill">{n}</span>)}
                    {inf.niches.length > 2 && <span className="niche-pill">+{inf.niches.length - 2}</span>}
                  </div>
                )}

                {/* Platforme cu followeri */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {platforms.slice(0, 3).map((p: any, i: number) => {
                    const followers = fmtFollowers(p.followers || p.follower_count || p.ig_followers || 0)
                    return (
                      <div key={i} className="flex items-center gap-1">
                        {p.platform === 'instagram' && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                        {p.platform === 'tiktok' && <span className="text-gray-700"><TikTokIcon /></span>}
                        {p.platform === 'youtube' && <Youtube className="w-3.5 h-3.5 text-red-500" />}
                        {followers && <span className="text-xs font-bold text-gray-600">{followers}</span>}
                      </div>
                    )
                  })}
                  {platforms.length === 0 && <span className="text-xs text-gray-300">— fără platforme</span>}
                  {inf.identity_verified && <Shield className="w-3.5 h-3.5 text-amber-500 ml-auto" />}
                  {missing.length > 0 && !inf.identity_verified && (
                    <span className="ml-auto text-xs font-bold text-orange-400" title={`Lipsesc: ${missing.join(', ')}`}>⚠ {missing.length}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1.5px solid #f5f5f5' }}
                  onClick={e => e.stopPropagation()}>
                  {inf.approval_status === 'pending' && (
                    <button onClick={() => handleApprove(inf.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                      {busy ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <><Check className="w-3 h-3" /> Aprobă</>}
                    </button>
                  )}
                  {inf.approval_status === 'approved' && (
                    <button onClick={() => setRejectModal(inf.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition">
                      <X className="w-3 h-3" /> Suspend
                    </button>
                  )}
                  {inf.approval_status === 'rejected' && (
                    <button onClick={() => handleApprove(inf.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-xs text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                      <Check className="w-3 h-3" /> Re-aprobă
                    </button>
                  )}
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => setSelected(inf)} className="action-btn" title="Detalii">
                      <Eye className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    {inf.user_id && (
                      <button onClick={() => handleImpersonate(inf.user_id, inf.name || 'acest influencer')} className="action-btn" title="Login ca influencer">
                        <span style={{ fontSize: 13 }}>🔑</span>
                      </button>
                    )}
                    <button onClick={() => handleDelete(inf.id)} disabled={busy} className="action-btn" title="Șterge">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginare */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 fu" style={{ animationDelay: '.12s' }}>
          <p className="text-sm text-gray-400 font-semibold">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} din {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc: (number | string)[], p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…'
                  ? <span key={i} className="text-gray-400 font-bold px-1">…</span>
                  : <button key={i} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p as number)}>{p}</button>
              )}
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
