'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Clock, Shield, Eye, X, AlertCircle, FileText } from 'lucide-react'

export default function AdminIdentityVerificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('pending')

  const notify = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const query = sb.from('influencers')
      .select('id, user_id, name, email, avatar, verification_status, verification_doc_type, verification_doc_url, verification_selfie_url, verification_full_name, verification_notes, verification_submitted_at, verification_rejection_reason')
      .not('verification_status', 'eq', 'unverified')
      .not('verification_doc_url', 'is', null)
      .order('verification_submitted_at', { ascending: false })

    const { data } = await query
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(influencerId) {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/identity-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencer_id: influencerId, action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      notify('✅ Identitate verificată!')
      setSelected(null)
      await load()
    } catch (e) {
      notify(e.message || 'Eroare', false)
    } finally {
      setActionLoading(false)
    }
  }

  async function reject(influencerId) {
    if (!rejectReason.trim()) { notify('Introdu motivul respingerii', false); return }
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/identity-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencer_id: influencerId, action: 'reject', reason: rejectReason }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      notify('Respins cu motiv.')
      setSelected(null)
      setShowReject(false)
      setRejectReason('')
      await load()
    } catch (e) {
      notify(e.message || 'Eroare', false)
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = items.filter(i =>
    filter === 'all' ? true : i.verification_status === filter
  )

  const counts = {
    pending: items.filter(i => i.verification_status === 'pending').length,
    verified: items.filter(i => i.verification_status === 'verified').length,
    rejected: items.filter(i => i.verification_status === 'rejected').length,
  }

  const DOC_LABEL = { id_card: 'Buletin / CI', passport: 'Pașaport', driving_license: 'Permis auto' }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background: white; border: 1.5px solid #f0f0f0; border-radius: 20px; }
        .tab-btn { padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; transition: all .18s; font-family: inherit; }
        .tab-btn.active { background: #6366f1; color: white; }
        .tab-btn:not(.active) { background: #f3f4f6; color: #6b7280; }
        .tab-btn:not(.active):hover { background: #eef2ff; color: #4f46e5; }
      `}</style>

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> Verificări identitate
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{counts.pending} în așteptare · {counts.verified} aprobate · {counts.rejected} respinse</p>
        </div>
        <button onClick={load} className="text-sm font-bold text-gray-400 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-gray-200 bg-white">
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'pending', label: `În așteptare (${counts.pending})` },
          { id: 'verified', label: `Aprobate (${counts.verified})` },
          { id: 'rejected', label: `Respinse (${counts.rejected})` },
          { id: 'all', label: 'Toate' },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${filter === t.id ? 'active' : ''}`} onClick={() => setFilter(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-bold text-gray-500">Nicio verificare {filter === 'pending' ? 'în așteptare' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inf => (
            <div key={inf.id} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {inf.avatar
                      ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                      : <span className="text-indigo-700 font-black">{inf.name?.[0]}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 truncate">{inf.name}</p>
                    <p className="text-xs text-gray-400">{inf.email} · {inf.verification_full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                        {DOC_LABEL[inf.verification_doc_type] || inf.verification_doc_type}
                      </span>
                      {inf.verification_submitted_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(inf.verification_submitted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${inf.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      inf.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                    {inf.verification_status === 'pending' ? '⏳ În așteptare' :
                      inf.verification_status === 'verified' ? '✅ Verificat' : '❌ Respins'}
                  </span>
                  <button
                    onClick={() => setSelected(inf)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
                  >
                    <Eye className="w-3.5 h-3.5" /> Vezi documente
                  </button>
                </div>
              </div>
              {inf.verification_rejection_reason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-600">Motiv respingere: {inf.verification_rejection_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document viewer modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-black text-gray-900">Verificare: {selected.name}</h2>
                <p className="text-xs text-gray-400">{selected.verification_full_name} · {DOC_LABEL[selected.verification_doc_type]}</p>
              </div>
              <button onClick={() => { setSelected(null); setShowReject(false); setRejectReason('') }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                <div><p className="text-xs text-gray-400">Nume complet</p><p className="font-bold text-sm">{selected.verification_full_name}</p></div>
                <div><p className="text-xs text-gray-400">Tip document</p><p className="font-bold text-sm">{DOC_LABEL[selected.verification_doc_type]}</p></div>
                <div><p className="text-xs text-gray-400">Email</p><p className="font-bold text-sm">{selected.email}</p></div>
                <div><p className="text-xs text-gray-400">Trimis la</p><p className="font-bold text-sm">{selected.verification_submitted_at ? new Date(selected.verification_submitted_at).toLocaleString('ro-RO') : '—'}</p></div>
                {selected.verification_notes && (
                  <div className="col-span-2"><p className="text-xs text-gray-400">Note</p><p className="font-bold text-sm">{selected.verification_notes}</p></div>
                )}
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Document identitate</p>
                  {selected.verification_doc_url?.startsWith('data:image') ? (
                    <img src={selected.verification_doc_url} alt="document" className="w-full rounded-xl border border-gray-200 object-contain max-h-64" />
                  ) : selected.verification_doc_url?.startsWith('data:application/pdf') ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-600 mb-3">Document PDF</p>
                      <a href={selected.verification_doc_url} download="document.pdf"
                        className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition">
                        Descarcă PDF
                      </a>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">Niciun document</div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Selfie cu documentul</p>
                  {selected.verification_selfie_url ? (
                    <img src={selected.verification_selfie_url} alt="selfie" className="w-full rounded-xl border border-gray-200 object-contain max-h-64" />
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">Niciun selfie</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selected.verification_status === 'pending' && (
                <div className="space-y-3">
                  {!showReject ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => approve(selected.id)}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprobă verificarea
                      </button>
                      <button
                        onClick={() => setShowReject(true)}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 transition flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Respinge
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-black text-red-700">Motiv respingere (influencerul va vedea acest mesaj):</p>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Ex: Documentul nu este lizibil. Te rugăm să trimiți o fotografie mai clară."
                        rows={3}
                        className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none"
                        style={{ fontFamily: 'inherit' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => reject(selected.id)} disabled={actionLoading || !rejectReason.trim()}
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

              {selected.verification_status === 'verified' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-black text-green-700">Identitate verificată ✓</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
