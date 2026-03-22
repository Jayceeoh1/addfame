'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllBrands, deleteBrand, approveBrandVerification, rejectBrandVerification, adminAdjustCredits } from '@/app/actions/admin'
import {
  Building2, Search, Trash2, RefreshCw, Shield, Clock,
  CheckCircle, XCircle, AlertCircle, ChevronDown, ExternalLink,
  FileText, Globe, Linkedin, X
} from 'lucide-react'

const VERIF_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  unverified: { label: 'Unverified', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  verified: { label: 'Verified', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

const TABS = ['All', 'Pending', 'Verified', 'Unverified', 'Rejected'] as const
type Tab = typeof TABS[number]

export default function AdminBrands() {
  const [brands, setBrands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('All')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [selected, setSelected] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [creditAdjust, setCreditAdjust] = useState<{ amount: string; reason: string; type: 'add' | 'subtract' }>({ amount: '', reason: '', type: 'add' })
  const [savingCredits, setSavingCredits] = useState(false)


  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }



  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAllBrands()
      if (res.success) setBrands(res.data ?? [])
      else notify((res as any).error || 'Eroare la încărcarea brandurilor.', false)
    } catch (e: any) {
      notify('Eroare: ' + e.message, false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this brand permanently? This cannot be undone.')) return
    setActionId(id)
    const res = await deleteBrand(id)
    if (res.success) { setBrands(p => p.filter(b => b.id !== id)); notify('🗑 Brand deleted.') }
    else notify((res as any).error || 'Delete failed.', false)
    setActionId(null)
  }

  async function handleApprove(id: string) {
    setActionId(id)
    const res = await approveBrandVerification(id)
    if (res.success) {
      setBrands(p => p.map(b => b.id === id ? { ...b, verification_status: 'verified', approval_status: 'approved' } : b))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, verification_status: 'verified' }))
      notify('✅ Brand verified successfully!')
    } else notify((res as any).error || 'Failed', false)
    setActionId(null)
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { notify('Please enter a rejection reason', false); return }
    setActionId(id)
    const res = await rejectBrandVerification(id, rejectReason.trim())
    if (res.success) {
      setBrands(p => p.map(b => b.id === id ? { ...b, verification_status: 'rejected', verification_rejection_reason: rejectReason } : b))
      if (selected?.id === id) setSelected((p: any) => ({ ...p, verification_status: 'rejected' }))
      setShowRejectModal(null)
      setRejectReason('')
      notify('Brand verification rejected.')
    } else notify((res as any).error || 'Failed', false)
    setActionId(null)
  }

  const counts = {
    All: brands.length,
    Pending: brands.filter(b => b.verification_status === 'pending').length,
    Verified: brands.filter(b => b.verification_status === 'verified').length,
    Unverified: brands.filter(b => b.verification_status === 'unverified').length,
    Rejected: brands.filter(b => b.verification_status === 'rejected').length,
  }

  async function handleAdjustCredits() {
    if (!selected || !creditAdjust.amount || !creditAdjust.reason.trim()) return
    setSavingCredits(true)
    try {
      const amount = parseFloat(creditAdjust.amount)
      if (isNaN(amount) || amount <= 0) { notify('Sumă invalidă.', false); setSavingCredits(false); return }

      const res = await adminAdjustCredits(selected.id, amount, creditAdjust.type, creditAdjust.reason)
      if (!res.success) throw new Error((res as any).error || 'Eroare')

      const newBalance = res.newBalance
      setBrands(p => p.map(b => b.id === selected.id ? { ...b, credits_balance: newBalance } : b))
      setSelected((p: any) => ({ ...p, credits_balance: newBalance }))
      setCreditAdjust({ amount: '', reason: '', type: 'add' })
      notify(`✅ Credite ${creditAdjust.type === 'add' ? 'adăugate' : 'scăzute'}: ${amount.toLocaleString('ro-RO')} RON`)
    } catch (e: any) {
      notify(e.message || 'Eroare.', false)
    } finally {
      setSavingCredits(false)
    }
  }

  const visible = brands.filter(b => {
    const q = search.toLowerCase()
    const matchQ = !q || b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q) || b.industry?.toLowerCase().includes(q)
    const matchT = tab === 'All' || b.verification_status === tab.toLowerCase()
    return matchQ && matchT
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .field { padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;width:100%; }
        .field:focus { border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.08); }
        .field::placeholder { color:#9ca3af;font-weight:400; }
        .tab-btn { padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s;white-space:nowrap; }
        .tab-btn.on { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 3px 10px rgba(99,102,241,.3); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#ede9fe;color:#6366f1; }
        .btn-approve { display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:9px;font-size:12px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .15s;font-family:inherit; }
        .btn-approve:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 3px 10px rgba(34,197,94,.3); }
        .btn-reject { display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:9px;font-size:12px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .15s;font-family:inherit; }
        .btn-reject:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444; }
        .btn-del { display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:white;border:2px solid #f0f0f0;cursor:pointer;transition:all .15s;color:#9ca3af; }
        .btn-del:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444;background:#fff5f5; }
        button:disabled { opacity:.5;cursor:not-allowed;transform:none!important; }
        tr:hover td { background:#fafbff; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900">Reject Verification</h2>
              <button onClick={() => { setShowRejectModal(null); setRejectReason('') }}
                className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Provide a reason so the brand knows what to fix when resubmitting.</p>
            <textarea
              className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-red-300 transition resize-none mb-4"
              style={{ fontFamily: 'inherit', minHeight: '100px' }}
              placeholder="e.g. Could not verify the business registration document. Please upload a clearer copy or provide your VAT certificate."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(null); setRejectReason('') }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-100 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || actionId === showRejectModal}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition">
                {actionId === showRejectModal ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-black text-gray-900 text-lg">Brand Details</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Brand info */}
              <div className="flex items-center gap-3 mb-6 pb-6" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selected.logo ? <img src={selected.logo} className="w-full h-full object-cover" alt="" />
                    : <span className="font-black text-indigo-600 text-xl">{selected.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg">{selected.name}</p>
                  <p className="text-sm text-gray-400">{selected.email}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{selected.industry} · {selected.company_size || 'Size not set'}</p>
                </div>
              </div>

              {/* Verification status */}
              <div className="mb-5">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Verification Status</p>
                {(() => {
                  const cfg = VERIF_CFG[selected.verification_status || 'unverified']
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                  )
                })()}
                {selected.verification_submitted_at && (
                  <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(selected.verification_submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                )}
                {selected.verification_rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-black text-red-700">Rejection reason:</p>
                    <p className="text-xs text-red-600 mt-1">{selected.verification_rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Submitted links */}
              <div className="space-y-2 mb-5">
                {selected.website && (
                  <a href={selected.website} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-700 flex-1 truncate">{selected.website}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  </a>
                )}
                {selected.verification_linkedin && (
                  <a href={selected.verification_linkedin} target="_blank" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition">
                    <Linkedin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-blue-700 flex-1 truncate">{selected.verification_linkedin}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  </a>
                )}
              </div>

              {/* Document preview */}
              {selected.verification_document_url && (() => {
                const doc = selected.verification_document_url
                const isPdf = doc.startsWith('data:application/pdf') || doc.toLowerCase().endsWith('.pdf')
                const isBase64 = doc.startsWith('data:')
                const isImage = doc.startsWith('data:image') || /\.(jpg|jpeg|png|webp)$/i.test(doc)
                return (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Business Document
                      </p>
                      {isBase64 && (
                        <a href={doc} download="verification-document"
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
                          Download <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {isPdf && (
                      <div className="rounded-2xl overflow-hidden border-2 border-gray-200" style={{ height: '420px' }}>
                        <iframe src={doc} className="w-full h-full" title="Business document PDF" />
                      </div>
                    )}

                    {!isPdf && isImage && (
                      <div className="rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                        <img src={doc} alt="Business document"
                          className="w-full object-contain"
                          style={{ maxHeight: '420px' }} />
                      </div>
                    )}

                    {!isPdf && !isImage && (
                      <div className="flex flex-col items-center justify-center h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 gap-2">
                        <FileText className="w-5 h-5 text-gray-300" />
                        <p className="text-xs text-gray-400 font-bold">Unknown document format</p>
                        <a href={doc} target="_blank" className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )
              })()}

              {!selected.website && !selected.verification_linkedin && !selected.verification_document_url && (
                <div className="p-4 bg-gray-50 rounded-xl text-center mb-5">
                  <p className="text-sm text-gray-400">No verification materials submitted yet</p>
                </div>
              )}

              {selected.verification_notes && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Brand notes</p>
                  <p className="text-sm text-gray-600">{selected.verification_notes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.verification_status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selected.id)}
                    disabled={actionId === selected.id}
                    className="btn-approve flex-1 justify-center py-3 text-sm">
                    {actionId === selected.id
                      ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><CheckCircle className="w-4 h-4" /> Approve</>}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(selected.id)}
                    disabled={actionId === selected.id}
                    className="btn-reject flex-1 justify-center py-3 text-sm">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
              {selected.verification_status === 'verified' && (
                <div className="p-4 bg-green-50 rounded-xl text-center border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-black text-green-700">Verified ✓</p>
                </div>
              )}
              {['unverified', 'rejected'].includes(selected.verification_status || 'unverified') && (
                <p className="text-xs text-center text-gray-400">Waiting for brand to submit verification</p>
              )}

              {/* ── CREDITE MANAGEMENT ── */}
              <div className="mt-6 pt-6" style={{ borderTop: '1.5px solid #f5f5f5' }}>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">💳 Management Credite</p>

                {/* Sold curent */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 mb-4">
                  <p className="text-xs font-black text-green-700 mb-1">Sold curent</p>
                  <p className="text-2xl font-black text-green-600">{(selected.credits_balance || 0).toLocaleString('ro-RO')} RON</p>
                  {selected.credits_expires_at && (
                    <p className="text-[11px] text-green-600/70 mt-1">
                      Expiră: {new Date(selected.credits_expires_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Ajustare manuală */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreditAdjust(p => ({ ...p, type: 'add' }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-black transition ${creditAdjust.type === 'add' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      + Adaugă
                    </button>
                    <button
                      onClick={() => setCreditAdjust(p => ({ ...p, type: 'subtract' }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-black transition ${creditAdjust.type === 'subtract' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      − Scade
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="Sumă (RON)"
                      value={creditAdjust.amount}
                      onChange={e => setCreditAdjust(p => ({ ...p, amount: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 transition"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Motiv (ex: restituire campanie, bonus, etc.)"
                    value={creditAdjust.reason}
                    onChange={e => setCreditAdjust(p => ({ ...p, reason: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition"
                  />

                  {/* Preview */}
                  {creditAdjust.amount && parseFloat(creditAdjust.amount) > 0 && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2 flex justify-between text-sm">
                      <span className="text-gray-500">Sold după ajustare</span>
                      <span className="font-black text-gray-900">
                        {(creditAdjust.type === 'add'
                          ? (selected.credits_balance || 0) + parseFloat(creditAdjust.amount || '0')
                          : Math.max(0, (selected.credits_balance || 0) - parseFloat(creditAdjust.amount || '0'))
                        ).toLocaleString('ro-RO')} RON
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleAdjustCredits}
                    disabled={savingCredits || !creditAdjust.amount || !creditAdjust.reason.trim()}
                    className="w-full py-3 rounded-xl text-sm font-black text-white transition disabled:opacity-40"
                    style={{ background: creditAdjust.type === 'add' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                    {savingCredits ? 'Se salvează...' : creditAdjust.type === 'add' ? `Adaugă ${creditAdjust.amount || '0'} RON` : `Scade ${creditAdjust.amount || '0'} RON`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Brands</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {brands.length} total
            {counts.Pending > 0 && <span className="ml-2 font-black text-amber-600">· {counts.Pending} pending review</span>}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-gray-200 bg-white">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card p-4 mb-5 fade-up" style={{ animationDelay: '.05s' }}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="field" placeholder="Search by name, email or industry…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t} className={`tab-btn flex-shrink-0 ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t}
              {counts[t] > 0 && <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/25' : t === 'Pending' ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{counts[t]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden fade-up" style={{ animationDelay: '.1s' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-t-indigo-400 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-400">No brands found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1.5px solid #f0f0f0', background: '#fafafa' }}>
                <tr>
                  {['Brand', 'Email', 'Industry', 'Credits', 'Verification', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const vCfg = VERIF_CFG[b.verification_status || 'unverified']
                  const busy = actionId === b.id
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {b.logo ? <img src={b.logo} className="w-full h-full object-cover" alt="" />
                              : <span className="font-black text-indigo-600">{b.name?.[0]?.toUpperCase() || '?'}</span>}
                          </div>
                          <div>
                            <button onClick={() => setSelected(b)} className="font-black text-gray-900 hover:text-indigo-600 transition text-left">{b.name}</button>
                            <p className="text-xs text-gray-400">{b.company_size || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">{b.email}</td>
                      <td className="px-5 py-4 text-xs text-gray-500">{b.industry || '—'}</td>
                      <td className="px-5 py-4 font-black text-green-600 text-sm">{(b.credits_balance || 0).toLocaleString('ro-RO')} RON</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${vCfg.bg} ${vCfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${vCfg.dot}`} />{vCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {b.verification_status === 'pending' && (
                            <>
                              <button className="btn-approve" onClick={() => handleApprove(b.id)} disabled={busy}>
                                {busy ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                              </button>
                              <button className="btn-reject" onClick={() => setShowRejectModal(b.id)} disabled={busy}>
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {b.verification_status !== 'pending' && (
                            <button onClick={() => setSelected(b)}
                              className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition px-2 py-1 rounded-lg hover:bg-indigo-50">
                              View →
                            </button>
                          )}
                          <button className="btn-del" onClick={() => handleDelete(b.id)} disabled={busy} title="Delete">
                            {busy ? <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
