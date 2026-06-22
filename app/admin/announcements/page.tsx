'use client'
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Eye, Star, MousePointer, X, Check, AlertCircle, Bell } from 'lucide-react'

const TYPE_CFG: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
  info:     { label: 'Info',      bg: '#ede9fe', color: '#5b21b6', emoji: '📢' },
  urgent:   { label: 'Urgent',    bg: '#fef2f2', color: '#b91c1c', emoji: '🚨' },
  campaign: { label: 'Campanie',  bg: '#f0fdf4', color: '#15803d', emoji: '🚀' },
  tip:      { label: 'Sfat',      bg: '#fef3c7', color: '#92400e', emoji: '💡' },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [totalInfluencers, setTotalInfluencers] = useState(0)
  const [viewersModal, setViewersModal] = useState<any | null>(null)
  const [viewers, setViewers] = useState<any[]>([])
  const [viewersLoading, setViewersLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    cta_text: '',
    cta_url: '',
    expires_at: '',
    is_active: true,
  })

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcement-stats')
      const json = await res.json()
      setAnnouncements(json.announcements ?? [])
      setTotalInfluencers(json.totalInfluencers ?? 0)
    } catch (e) {
      console.error('Failed to load announcements:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function fetchViewers(announcement: any) {
    setViewersModal(announcement)
    setViewersLoading(true)
    try {
      const res = await fetch('/api/admin/announcement-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement_id: announcement.id }),
      })
      const json = await res.json()
      setViewers(json.reads ?? [])
    } catch (e) {
      console.error('Failed to fetch viewers:', e)
      setViewers([])
    }
    setViewersLoading(false)
  }

  function resetForm() {
    setForm({ title: '', message: '', type: 'info', cta_text: '', cta_url: '', expires_at: '', is_active: true })
    setEditId(null)
    setShowForm(false)
  }

  function startEdit(a: any) {
    setForm({
      title: a.title,
      message: a.message,
      type: a.type || 'info',
      cta_text: a.cta_text || '',
      cta_url: a.cta_url || '',
      expires_at: a.expires_at ? a.expires_at.slice(0, 16) : '',
      is_active: a.is_active,
    })
    setEditId(a.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) { notify('Titlu și mesaj sunt obligatorii', false); return }
    const sb = createClient()
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      cta_text: form.cta_text.trim() || null,
      cta_url: form.cta_url.trim() || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    }
    if (editId) {
      const { error } = await sb.from('announcements').update(payload).eq('id', editId)
      if (error) { notify('Eroare: ' + error.message, false); return }
      notify('✅ Anunț actualizat!')
    } else {
      const { error } = await sb.from('announcements').insert(payload)
      if (error) { notify('Eroare: ' + error.message, false); return }
      notify('✅ Anunț publicat!')
    }
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi anunțul definitiv?')) return
    const sb = createClient()
    await sb.from('announcements').delete().eq('id', id)
    notify('Anunț șters.')
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    const sb = createClient()
    await sb.from('announcements').update({ is_active: !current }).eq('id', id)
    setAnnouncements(p => p.map(a => a.id === id ? { ...a, is_active: !current } : a))
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation: slideD .3s ease; }
        .field { width:100%;padding:10px 14px;border:1.5px solid #f0f0f0;border-radius:12px;font-size:14px;outline:none;background:white;font-family:inherit;transition:border-color .2s; }
        .field:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.08); }
        .card { background:white;border-radius:16px;border:1.5px solid #f0f0f0;padding:16px; }
        .stat-box { background:#faf5ff;border-radius:10px;padding:10px;text-align:center; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Anunțuri</h1>
          <p className="text-sm text-gray-400 mt-0.5">Mesaje vizibile pe dashboard-ul influencerilor</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
          <Plus className="w-4 h-4" /> Anunț nou
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6" style={{ border: '1.5px solid #ddd6fe' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-black text-gray-900">{editId ? 'Editează anunț' : 'Anunț nou'}</p>
            <button onClick={resetForm} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Tip */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Tip anunț</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-10 font-bold text-xs transition"
                    style={{ borderRadius: 10, border: form.type === key ? '2px solid #8b5cf6' : '1.5px solid #f0f0f0', background: form.type === key ? '#ede9fe' : 'white', color: form.type === key ? '#5b21b6' : '#6b7280' }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Titlu */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Titlu *</label>
              <input className="field" placeholder="ex: Primele campanii se lansează săptămâna viitoare!"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Mesaj */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Mesaj *</label>
              <textarea className="field" rows={3} placeholder="Detalii anunț..."
                style={{ resize: 'none' }}
                value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Text buton CTA (opțional)</label>
                <input className="field" placeholder="ex: Completează profilul →"
                  value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Link CTA (opțional)</label>
                <input className="field" placeholder="ex: /influencer/profile"
                  value={form.cta_url} onChange={e => setForm(f => ({ ...f, cta_url: e.target.value }))} />
              </div>
            </div>

            {/* Expirare + activ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Expiră la (opțional)</label>
                <input type="datetime-local" className="field"
                  value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{ background: form.is_active ? '#8b5cf6' : '#e5e7eb' }}>
                    <div className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                      style={{ left: form.is_active ? '24px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{form.is_active ? 'Activ — vizibil' : 'Inactiv — ascuns'}</span>
                </label>
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full py-3 rounded-xl font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
              {editId ? 'Salvează modificările' : 'Publică anunțul'}
            </button>
          </div>
        </div>
      )}

      {/* Lista anunțuri */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #ede9fe', borderTopColor: '#8b5cf6' }} />
        </div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-16">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-black text-gray-400">Niciun anunț creat încă</p>
          <p className="text-sm text-gray-300 mt-1">Apasă "Anunț nou" pentru a crea primul</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => {
            const reads = a.announcement_reads ?? []
            const totalReads = reads.filter((r: any) => !r.dismissed).length
            const stars = reads.filter((r: any) => r.starred).length
            const clicks = reads.filter((r: any) => r.clicked_cta).length
            const rateRead = totalInfluencers > 0 ? Math.round((totalReads / totalInfluencers) * 100) : 0
            const rateStar = totalReads > 0 ? Math.round((stars / totalReads) * 100) : 0
            const cfg = TYPE_CFG[a.type] || TYPE_CFG.info
            const expired = a.expires_at && new Date(a.expires_at) < new Date()

            return (
              <div key={a.id} className="card" style={{ border: a.is_active && !expired ? '1.5px solid #ddd6fe' : '1.5px solid #f0f0f0', opacity: !a.is_active || expired ? 0.7 : 1 }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: cfg.bg }}>{cfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-black text-gray-900 text-sm">{a.title}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      {!a.is_active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiv</span>}
                      {expired && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500">Expirat</span>}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{a.message}</p>
                    <p className="text-xs text-gray-300 mt-1">{fmt(a.created_at)}{a.expires_at && ` · Expiră: ${fmt(a.expires_at)}`}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleActive(a.id, a.is_active)}
                      className="px-3 py-1.5 rounded-lg font-bold text-xs transition"
                      style={{ background: a.is_active ? '#f0fdf4' : '#f9fafb', color: a.is_active ? '#15803d' : '#6b7280', border: '1.5px solid #bbf7d0' }}>
                      {a.is_active ? 'Activ' : 'Activează'}
                    </button>
                    <button onClick={() => startEdit(a)} className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition">
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Statistici */}
                <div className="grid grid-cols-4 gap-3 pt-4" style={{ borderTop: '1.5px solid #f5f5f5' }}>
                  <div className="stat-box">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Eye className="w-3.5 h-3.5 text-purple-500" />
                      <p className="text-lg font-black text-purple-600">{totalReads}</p>
                    </div>
                    <p className="text-xs text-gray-400 font-bold">Văzut</p>
                    <p className="text-xs text-purple-500 font-black">{rateRead}%</p>
                  </div>
                  <div className="stat-box">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <p className="text-lg font-black text-amber-600">{stars}</p>
                    </div>
                    <p className="text-xs text-gray-400 font-bold">Aprecieri ⭐</p>
                    <p className="text-xs text-amber-500 font-black">{rateStar}%</p>
                  </div>
                  <div className="stat-box">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <MousePointer className="w-3.5 h-3.5 text-green-500" />
                      <p className="text-lg font-black text-green-600">{clicks}</p>
                    </div>
                    <p className="text-xs text-gray-400 font-bold">Click CTA</p>
                    <p className="text-xs text-green-500 font-black">{totalReads > 0 ? Math.round(clicks/totalReads*100) : 0}%</p>
                  </div>
                  <div className="stat-box">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <p className="text-lg font-black text-gray-600">{totalInfluencers - totalReads}</p>
                    </div>
                    <p className="text-xs text-gray-400 font-bold">Nevăzut</p>
                    <p className="text-xs text-gray-400 font-black">{totalInfluencers > 0 ? Math.round((totalInfluencers-totalReads)/totalInfluencers*100) : 0}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-400">Rată de citire</span>
                    <span className="text-xs font-black text-purple-600">{totalReads}/{totalInfluencers}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${rateRead}%`, background: 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />
                  </div>
                  <button onClick={() => fetchViewers(a)} className="mt-2 flex items-center gap-1.5 text-xs font-black text-purple-600 hover:text-purple-800 transition">
                    <Eye className="w-3.5 h-3.5" /> Vezi cine a văzut ({totalReads})
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal viewers */}
      {viewersModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontWeight: 900, fontSize: 15, color: '#1e1b4b', margin: 0 }}>Cine a văzut anunțul</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{viewersModal.title}</p>
              </div>
              <button onClick={() => setViewersModal(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {viewersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #ede9fe', borderTopColor: '#8b5cf6', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : viewers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <p style={{ fontSize: 24, margin: '0 0 6px' }}>👀</p>
                <p style={{ fontWeight: 800, color: '#6b7280', fontSize: 13 }}>Nimeni nu a văzut încă</p>
              </div>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {viewers.map((v: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                      {v.influencers?.avatar ? <img src={v.influencers.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : v.influencers?.name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.influencers?.name || 'Unknown'}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0' }}>{new Date(v.read_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {v.starred && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99 }}>⭐</span>}
                      {v.clicked_cta && <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99 }}>👆 CTA</span>}
                      {v.dismissed && <span style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 99 }}>✕</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
