'use client'
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInfluencer, approveInfluencer, rejectInfluencer, deleteInfluencer } from '@/app/actions/admin'
import {
  ArrowLeft, User, Globe, Tag, Instagram, Youtube,
  CheckCircle, AlertCircle, Trash2, Check, X, Edit2,
  Save, Calendar, DollarSign, RefreshCw, Mail, Phone,
  AlertTriangle, ShieldBan, ShieldCheck, Clock, Trash
} from 'lucide-react'
import Link from 'next/link'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  tiktok: <TikTokIcon className="w-4 h-4 text-gray-800" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  approved: { label: 'Approved', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
  pending: { label: 'Pending', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
  rejected: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', border: 'border-red-200' },
}

function StrikesPanel({ influencerId, inf, onUpdated }: { influencerId: string; inf: any; onUpdated: () => void }) {
  const [strikes, setStrikes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [addReason, setAddReason] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/strikes?influencer_id=${influencerId}`)
      .then(r => r.json())
      .then(d => { setStrikes(d.strikes ?? []); setLoading(false) })
  }, [influencerId])

  async function call(body: any) {
    setWorking(true)
    const res = await fetch('/api/admin/strikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ influencer_id: influencerId, ...body }),
    })
    setWorking(false)
    return res.json()
  }

  async function addStrike() {
    if (!addReason.trim()) return
    await call({ action: 'add', reason: addReason })
    setShowAdd(false)
    setAddReason('')
    onUpdated()
  }

  async function removeStrike(strike_id: string) {
    if (!confirm('Sigur ștergi acest strike?')) return
    await call({ action: 'remove', strike_id })
    onUpdated()
  }

  async function toggleBlacklist() {
    const msg = inf.blacklisted ? 'Ridici suspendarea pentru acest influencer?' : 'Suspendezi acest influencer?'
    if (!confirm(msg)) return
    await call({ action: 'toggle_blacklist' })
    onUpdated()
  }

  const currentStrikes = inf.strikes || 0

  return (
    <div className="card p-5 fade-up" style={{ animationDelay: '.18s' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h2 className="font-black text-gray-900">Strike-uri</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Strike badges */}
          {[1, 2].map(n => (
            <div key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${currentStrikes >= n ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Status blacklist */}
      <div className={`rounded-xl p-3 mb-4 flex items-center justify-between ${inf.blacklisted ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <div className="flex items-center gap-2">
          {inf.blacklisted ? <ShieldBan className="w-4 h-4 text-red-500" /> : <ShieldCheck className="w-4 h-4 text-green-500" />}
          <span className={`text-sm font-bold ${inf.blacklisted ? 'text-red-700' : 'text-green-700'}`}>
            {inf.blacklisted ? 'Cont suspendat' : 'Cont activ'}
          </span>
          {inf.blacklisted && inf.blacklisted_reason && (
            <span className="text-xs text-red-500">— {inf.blacklisted_reason}</span>
          )}
        </div>
        <button
          onClick={toggleBlacklist}
          disabled={working}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${inf.blacklisted ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
        >
          {inf.blacklisted ? 'Ridică suspendarea' : 'Suspendă'}
        </button>
      </div>

      {/* Lista strikes active */}
      {loading ? (
        <p className="text-xs text-gray-400 text-center py-3">Se încarcă...</p>
      ) : strikes.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">Niciun strike activ</p>
      ) : (
        <div className="space-y-2 mb-4">
          {strikes.map((s: any) => (
            <div key={s.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-orange-700">{s.reason}</p>
                {s.collaborations?.campaigns?.title && (
                  <p className="text-[10px] text-orange-500 mt-0.5">Campanie: {s.collaborations.campaigns.title}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('ro-RO')} · {s.given_by ? 'Admin' : 'Automat'}
                </p>
              </div>
              <button
                onClick={() => removeStrike(s.id)}
                disabled={working}
                className="flex-shrink-0 text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg transition"
                title="Șterge strike"
              >
                <Trash className="w-3 h-3" /> Șterge
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add strike manual */}
      {showAdd ? (
        <div className="space-y-2">
          <textarea
            value={addReason}
            onChange={e => setAddReason(e.target.value)}
            placeholder="Motivul strike-ului..."
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-xl p-2.5 outline-none focus:border-orange-400 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={addStrike} disabled={working || !addReason.trim()}
              className="flex-1 bg-orange-500 text-white text-xs font-bold py-2 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition">
              Acordă strike
            </button>
            <button onClick={() => { setShowAdd(false); setAddReason('') }}
              className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Anulează
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="w-full text-xs font-bold text-orange-600 border-2 border-orange-200 border-dashed py-2 rounded-xl hover:bg-orange-50 transition flex items-center justify-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> Acordă strike manual
        </button>
      )}
    </div>
  )
}

export default function InfluencerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [inf, setInf] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getInfluencer(id)
      if (res.success && res.data) setInf(res.data)
      else setError((res as any).error || 'Influencer not found')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  async function doAction(action: 'approve' | 'reject' | 'delete') {
    if (action === 'delete' && !confirm('Delete this influencer? Cannot be undone.')) return
    setActionLoading(true)
    try {
      const res = action === 'approve' ? await approveInfluencer(id)
        : action === 'reject' ? await rejectInfluencer(id)
          : await deleteInfluencer(id)
      if (res.success) {
        if (action === 'delete') { notify('🗑 Deleted.'); router.replace('/admin/influencers'); return }
        setInf((p: any) => ({ ...p, approval_status: action === 'approve' ? 'approved' : 'rejected' }))
        notify(action === 'approve' ? '✅ Influencer approved!' : 'Influencer rejected.')
      } else notify((res as any).error || 'Action failed.', false)
    } catch (e: any) { notify(e.message, false) }
    finally { setActionLoading(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AlertCircle className="w-12 h-12 text-red-300 mb-4" />
      <p className="font-black text-gray-700 text-lg mb-2">Could not load influencer</p>
      <p className="text-sm text-gray-400 mb-6">{error}</p>
      <div className="flex gap-3">
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <Link href="/admin/influencers" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    </div>
  )

  if (!inf) return null

  const cfg = STATUS_CFG[inf.approval_status] ?? STATUS_CFG.pending
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .field-label { font-size:10px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px; }
        .field-val { font-size:14px;font-weight:600;color:#111827; }
        .btn-approve { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-approve:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 6px 16px rgba(34,197,94,.35); }
        .btn-reject { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-reject:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444;background:#fff5f5; }
        .btn-delete { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:700;background:white;color:#ef4444;border:2px solid #fecaca;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-delete:hover:not(:disabled) { background:#fff5f5;border-color:#ef4444; }
        button:disabled { opacity:.5;cursor:not-allowed;transform:none!important; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <Link href="/admin/influencers" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Influencers
      </Link>

      {/* Hero */}
      <div className="card p-6 mb-5 fade-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ boxShadow: '0 4px 14px rgba(99,102,241,0.15)' }}>
              {inf.avatar
                ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                : <span className="font-black text-indigo-500 text-2xl">{inf.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">{inf.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {inf.email && <span className="flex items-center gap-1 text-sm text-gray-400"><Mail className="w-3.5 h-3.5" />{inf.email}</span>}
                {inf.country && <span className="flex items-center gap-1 text-sm text-gray-400"><Globe className="w-3.5 h-3.5" />{inf.country}</span>}
              </div>
            </div>
          </div>

          {/* Status + actions */}
          <div className="flex flex-col items-end gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
            <div className="flex gap-2">
              {inf.approval_status === 'pending' && (
                <>
                  <button className="btn-approve" onClick={() => doAction('approve')} disabled={actionLoading}>
                    {actionLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />} Approve
                  </button>
                  <button className="btn-reject" onClick={() => doAction('reject')} disabled={actionLoading}>
                    <X className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {inf.approval_status === 'approved' && (
                <button className="btn-reject" onClick={() => doAction('reject')} disabled={actionLoading}>
                  <X className="w-4 h-4" /> Suspend
                </button>
              )}
              {inf.approval_status === 'rejected' && (
                <button className="btn-approve" onClick={() => doAction('approve')} disabled={actionLoading}>
                  <Check className="w-4 h-4" /> Re-approve
                </button>
              )}
              <button className="btn-delete" onClick={() => doAction('delete')} disabled={actionLoading}>
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>

        {/* Bio */}
        {inf.bio && (
          <div className="mt-5 pt-5" style={{ borderTop: '1.5px solid #f5f5f5' }}>
            <p className="field-label">Bio</p>
            <p className="text-sm text-gray-600 leading-relaxed">{inf.bio}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="md:col-span-2 space-y-5">
          {/* Profile info */}
          <div className="card p-6 fade-up" style={{ animationDelay: '.06s' }}>
            <h2 className="font-black text-gray-900 mb-4">Profile Details</h2>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'Slug', value: inf.slug, mono: true },
                { label: 'Phone', value: inf.phone || '—' },
                { label: 'Country', value: inf.country || '—' },
                { label: 'Price From', value: inf.price_from ? `${inf.price_from} RON` : '—' },
                { label: 'Price To', value: inf.price_to ? `${inf.price_to} RON` : '—' },
                { label: 'Total Earned', value: inf.total_earned ? `${inf.total_earned} RON` : '0 RON' },
              ].map(f => (
                <div key={f.label}>
                  <p className="field-label">{f.label}</p>
                  <p className={`field-val ${f.mono ? 'font-mono text-xs' : ''}`}>{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Social platforms */}
          {inf.platforms && inf.platforms.length > 0 && (
            <div className="card p-6 fade-up" style={{ animationDelay: '.1s' }}>
              <h2 className="font-black text-gray-900 mb-4">Social Platforms</h2>
              <div className="space-y-3">
                {inf.platforms.map((p: any) => (
                  <div key={p.platform} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                    <div className="flex items-center gap-3">
                      {PLATFORM_ICON[p.platform?.toLowerCase()] ?? <Tag className="w-4 h-4 text-gray-400" />}
                      <span className="font-bold text-gray-700 capitalize">{p.platform}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {p.followers && <span className="text-sm font-black text-gray-500">{p.followers} followers</span>}
                      {p.url && <a href={p.url} target="_blank" className="text-xs font-bold text-indigo-500 hover:underline">{p.url.replace(/^https?:\/\//, '').slice(0, 30)}</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Niches */}
          {inf.niches && inf.niches.length > 0 && (
            <div className="card p-6 fade-up" style={{ animationDelay: '.14s' }}>
              <h2 className="font-black text-gray-900 mb-3">Niches</h2>
              <div className="flex flex-wrap gap-2">
                {inf.niches.map((n: string) => (
                  <span key={n} className="text-sm font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="card p-5 fade-up" style={{ animationDelay: '.08s' }}>
            <h2 className="font-black text-gray-900 mb-4">Stats</h2>
            <div className="space-y-3">
              {[
                { label: 'Wallet Balance', value: `${(inf.wallet_balance || 0).toLocaleString('ro-RO')} RON`, color: 'text-green-600' },
                { label: 'Total Earned', value: `${(inf.total_earned || 0).toLocaleString('ro-RO')} RON`, color: 'text-blue-600' },
                { label: 'Pending Payout', value: `${(inf.pending_payout || 0).toLocaleString('ro-RO')} RON`, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <p className="text-sm font-semibold text-gray-500">{s.label}</p>
                  <p className={`font-black text-sm ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="card p-5 fade-up" style={{ animationDelay: '.12s' }}>
            <h2 className="font-black text-gray-900 mb-4">Metadata</h2>
            <div className="space-y-3">
              {[
                { label: 'Joined', value: fmtDate(inf.created_at) },
                { label: 'Updated', value: fmtDate(inf.updated_at) },
                { label: 'Approved at', value: fmtDate(inf.approved_at) },
                { label: 'User ID', value: inf.user_id?.slice(0, 16) + '…', mono: true },
              ].map(m => (
                <div key={m.label}>
                  <p className="field-label">{m.label}</p>
                  <p className={`text-sm font-semibold text-gray-600 ${m.mono ? 'font-mono text-xs' : ''}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Edit link */}
          <Link href={`/admin/influencers/${id}/edit`}
            className="card p-4 flex items-center justify-between hover:border-indigo-200 transition fade-up block"
            style={{ animationDelay: '.16s' }}>
            <span className="font-black text-gray-700">Edit Profile</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-indigo-500" />
            </div>
          </Link>

          {/* ── STRIKES ── */}
          <StrikesPanel influencerId={id} inf={inf} onUpdated={() => window.location.reload()} />
        </div>
      </div>
    </div>
  )
}
