'use client'

// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Shield, Eye, X, AlertCircle, FileText, Sparkles, Loader2, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react'

const DOC_LABEL = {
  id_card: 'Buletin / CI',
  passport: 'Pașaport',
  driving_license: 'Permis auto',
}

// ── Componenta rezultat AI ────────────────────────────────────────────────────
function AIAnalysisResult({ analysis, onApprove, onReject, loading }: any) {
  if (!analysis) return null

  const rec = analysis.recommendation
  const recColor = rec === 'APPROVE' ? 'border-green-300 bg-green-50' : rec === 'REJECT' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
  const recIcon = rec === 'APPROVE' ? '✅' : rec === 'REJECT' ? '❌' : '⚠️'
  const recText = rec === 'APPROVE' ? 'Aprobă' : rec === 'REJECT' ? 'Respinge' : 'Revizuire manuală'
  const recTextColor = rec === 'APPROVE' ? 'text-green-700' : rec === 'REJECT' ? 'text-red-700' : 'text-amber-700'
  const confColor = analysis.confidence === 'HIGH' ? 'text-green-600 bg-green-50' : analysis.confidence === 'MEDIUM' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-indigo-200">
      {/* Header */}
      <div className="bg-indigo-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <p className="text-xs font-black text-indigo-700 uppercase tracking-wider">Analiză AI — Gemini Vision</p>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${confColor}`}>
          Confidență: {analysis.confidence}
        </span>
      </div>

      <div className="bg-white p-4 space-y-3">
        {/* Recomandare principală */}
        <div className={`flex items-start gap-3 p-3 rounded-xl border-2 ${recColor}`}>
          <span className="text-xl">{recIcon}</span>
          <div className="flex-1">
            <p className={`font-black text-sm ${recTextColor}`}>{recText}</p>
            <p className={`text-xs mt-0.5 ${recTextColor} opacity-80`}>{analysis.reason}</p>
          </div>
        </div>

        {/* Grid detalii */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Document detectat</p>
            <p className="text-sm font-bold text-gray-700">{analysis.document_type || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Nume pe document</p>
            <p className="text-sm font-bold text-gray-700">{analysis.name_on_doc || '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Document lizibil</p>
            <p className={`text-sm font-black ${analysis.document_readable ? 'text-green-600' : 'text-red-600'}`}>
              {analysis.document_readable ? '✓ Da' : '✗ Nu'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Selfie = document</p>
            <p className={`text-sm font-black ${analysis.selfie_matches_doc === true ? 'text-green-600' : analysis.selfie_matches_doc === false ? 'text-red-600' : 'text-gray-400'}`}>
              {analysis.selfie_matches_doc === true ? '✓ Potrivire' : analysis.selfie_matches_doc === false ? '✗ Nu corespunde' : '— Fără selfie'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Nume declarat = doc</p>
            <p className={`text-sm font-black ${analysis.name_matches === true ? 'text-green-600' : analysis.name_matches === false ? 'text-red-600' : 'text-gray-400'}`}>
              {analysis.name_matches === true ? '✓ Identic' : analysis.name_matches === false ? '✗ Diferit' : '— Neclar'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-1">Document expirat</p>
            <p className={`text-sm font-black ${analysis.document_expired === true ? 'text-red-600' : analysis.document_expired === false ? 'text-green-600' : 'text-gray-400'}`}>
              {analysis.document_expired === true ? '✗ Expirat' : analysis.document_expired === false ? '✓ Valid' : '— Neclar'}
            </p>
          </div>
        </div>

        {/* Suspiciuni */}
        {analysis.suspicions?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-black text-red-700 mb-2">⚠️ Suspiciuni detectate:</p>
            <ul className="space-y-1">
              {analysis.suspicions.map((s: string, i: number) => (
                <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                  <span className="flex-shrink-0 mt-0.5">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Butoane rapide bazate pe recomandare */}
        {rec === 'APPROVE' && (
          <button onClick={onApprove} disabled={loading}
            className="w-full py-2.5 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Aprobă conform recomandării AI
          </button>
        )}
        {rec === 'REJECT' && (
          <button onClick={() => onReject(analysis.reason)} disabled={loading}
            className="w-full py-2.5 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Respinge conform recomandării AI
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminIdentityVerificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [zoomedImg, setZoomedImg] = useState<string | null>(null)

  // AI state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const notify = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data, error } = await sb
        .from('influencers')
        .select('id, user_id, name, email, avatar, verification_status, verification_doc_type, verification_full_name, verification_notes, verification_submitted_at, verification_rejection_reason')
        .not('verification_status', 'eq', 'unverified')
        .not('verification_doc_url', 'is', null)
        .order('verification_submitted_at', { ascending: false })
      if (error) throw error
      setItems(data || [])
    } catch (e) {
      notify(e.message || 'Eroare la încărcarea verificărilor', false)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Resetează AI când se schimbă selected
  useEffect(() => {
    setAiResult(null)
    setAiLoading(false)
  }, [selected?.id])

  async function analyzeWithAI() {
    if (!selected) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch('/api/admin/ai-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_url: selected.verification_doc_url,
          selfie_url: selected.verification_selfie_url,
          doc_type: selected.verification_doc_type,
          declared_name: selected.verification_full_name,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Eroare AI')
      if (data.parse_error) {
        notify('AI a răspuns dar nu am putut parsa rezultatul. Verifică manual.', false)
        return
      }
      setAiResult(data.analysis)
    } catch (e: any) {
      notify(e.message || 'Eroare la analiza AI', false)
    } finally {
      setAiLoading(false)
    }
  }

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
      setZoomedImg(null)
      setAiResult(null)
      await load()
    } catch (e) {
      notify(e.message || 'Eroare', false)
    } finally {
      setActionLoading(false)
    }
  }

  async function reject(influencerId, reason?: string) {
    const finalReason = reason || rejectReason
    if (!finalReason?.trim()) {
      notify('Introdu motivul respingerii', false)
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/identity-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ influencer_id: influencerId, action: 'reject', reason: finalReason }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      notify('Respins cu motiv.')
      setSelected(null)
      setZoomedImg(null)
      setShowReject(false)
      setRejectReason('')
      setAiResult(null)
      await load()
    } catch (e) {
      notify(e.message || 'Eroare', false)
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = items.filter((i) =>
    filter === 'all' ? true : i.verification_status === filter
  )

  const counts = {
    pending: items.filter((i) => i.verification_status === 'pending').length,
    verified: items.filter((i) => i.verification_status === 'verified').length,
    rejected: items.filter((i) => i.verification_status === 'rejected').length,
  }

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

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-500" /> Verificări identitate
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {counts.pending} în așteptare · {counts.verified} aprobate · {counts.rejected} respinse
          </p>
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
        ].map((t) => (
          <button key={t.id} className={`tab-btn ${filter === t.id ? 'active' : ''}`} onClick={() => setFilter(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
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
          {filtered.map((inf) => (
            <div key={inf.id} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {inf.avatar
                      ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                      : <span className="text-indigo-700 font-black">{inf.name?.[0]}</span>}
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
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${inf.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : inf.verification_status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {inf.verification_status === 'pending' ? '⏳ În așteptare' : inf.verification_status === 'verified' ? '✅ Verificat' : '❌ Respins'}
                  </span>
                  <button onClick={async () => {
                      const sb = createClient()
                      const { data } = await sb
                        .from('influencers')
                        .select('verification_doc_url, verification_selfie_url')
                        .eq('id', inf.id)
                        .single()
                      setSelected({ ...inf, ...data })
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition">
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

      {/* ── Modal detalii ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-gray-900">Verificare: {selected.name}</h2>
                <p className="text-xs text-gray-400">{selected.verification_full_name} · {DOC_LABEL[selected.verification_doc_type]}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setShowReject(false); setRejectReason(''); setZoomedImg(null); setAiResult(null) }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Date declarate */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-400">Nume complet</p>
                  <p className="font-bold text-sm">{selected.verification_full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tip document</p>
                  <p className="font-bold text-sm">{DOC_LABEL[selected.verification_doc_type]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-bold text-sm">{selected.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Trimis la</p>
                  <p className="font-bold text-sm">
                    {selected.verification_submitted_at
                      ? new Date(selected.verification_submitted_at).toLocaleString('ro-RO')
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Imagini */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Document de identitate</p>
                  {selected.verification_doc_url && !selected.verification_doc_url.startsWith('data:application/pdf') ? (
                    <div>
                      <div className="relative group cursor-zoom-in" onClick={() => setZoomedImg(selected.verification_doc_url)}>
                        <img src={selected.verification_doc_url} alt="document" className="w-full rounded-xl border border-gray-200 object-contain max-h-64" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-black bg-black/60 px-3 py-1.5 rounded-full transition">🔍 Click pentru zoom</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setZoomedImg(selected.verification_doc_url)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 transition text-gray-700">🔍 Zoom</button>
                        <a href={selected.verification_doc_url} download="document-identitate.jpg" className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 transition text-indigo-700 text-center">⬇️ Descarcă</a>
                      </div>
                    </div>
                  ) : selected.verification_doc_url?.startsWith('data:application/pdf') ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-600 mb-3">Document PDF</p>
                      <a href={selected.verification_doc_url} download="document.pdf" className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition">Descarcă PDF</a>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">Niciun document</div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Selfie cu documentul</p>
                  {selected.verification_selfie_url ? (
                    <div>
                      <div className="relative group cursor-zoom-in" onClick={() => setZoomedImg(selected.verification_selfie_url)}>
                        <img src={selected.verification_selfie_url} alt="selfie" className="w-full rounded-xl border border-gray-200 object-contain max-h-64" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-black bg-black/60 px-3 py-1.5 rounded-full transition">🔍 Click pentru zoom</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => setZoomedImg(selected.verification_selfie_url)} className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 transition text-gray-700">🔍 Zoom</button>
                        <a href={selected.verification_selfie_url} download="selfie-identitate.jpg" className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 transition text-indigo-700 text-center">⬇️ Descarcă</a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">Niciun selfie</div>
                  )}
                </div>
              </div>

              {/* ── Buton AI + Rezultat ──────────────────────────────────── */}
              {selected.verification_status === 'pending' && (
                <div>
                  {/* Buton analiză AI */}
                  {!aiResult && (
                    <button
                      onClick={analyzeWithAI}
                      disabled={aiLoading}
                      className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                    >
                      {aiLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizez cu Gemini AI…</>
                        : <><Sparkles className="w-4 h-4" /> Analizează cu AI</>
                      }
                    </button>
                  )}

                  {/* Rezultat AI */}
                  {aiResult && (
                    <AIAnalysisResult
                      analysis={aiResult}
                      loading={actionLoading}
                      onApprove={() => approve(selected.id)}
                      onReject={(reason) => {
                        setRejectReason(reason)
                        reject(selected.id, reason)
                      }}
                    />
                  )}

                  {/* Dacă AI a rulat, afișăm și butoanele manuale */}
                  {aiResult && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 text-center mb-2 font-semibold">— sau decide manual —</p>
                    </div>
                  )}

                  {/* Butoane manuale */}
                  {!showReject ? (
                    <div className={`flex gap-3 ${aiResult ? '' : 'mt-3'}`}>
                      <button onClick={() => approve(selected.id)} disabled={actionLoading}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprobă manual
                      </button>
                      <button onClick={() => setShowReject(true)}
                        className="flex-1 py-3 rounded-xl font-black text-sm text-red-600 bg-red-50 hover:bg-red-100 border-2 border-red-200 transition flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> Respinge manual
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 mt-3">
                      <p className="text-sm font-black text-red-700">Motiv respingere (influencerul va vedea acest mesaj):</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
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

              {selected.verification_status === 'rejected' && selected.verification_rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-black text-red-700 mb-1">Motiv respingere:</p>
                  <p className="text-sm text-red-600">{selected.verification_rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zoom modal */}
      {zoomedImg && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setZoomedImg(null)}>
          <div className="relative max-w-4xl max-h-full w-full">
            <button onClick={() => setZoomedImg(null)} className="absolute -top-10 right-0 text-white font-black text-sm hover:text-gray-300 transition">✕ Închide</button>
            <img src={zoomedImg} alt="zoom" className="w-full h-full object-contain rounded-2xl" style={{ maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()} />
            <div className="flex justify-center mt-4">
              <a href={zoomedImg} download="document.jpg" onClick={(e) => e.stopPropagation()} className="px-6 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-black hover:bg-gray-100 transition">⬇️ Descarcă imaginea</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
