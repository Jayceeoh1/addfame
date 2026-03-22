'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, Check, X, Clock, CheckCircle, AlertCircle,
  MessageSquare, ChevronRight, ArrowRight, Zap, Search,
  RefreshCw, ExternalLink, Link2, Send, Upload, Eye,
  RotateCcw, AlertTriangle, Calendar, DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import { LeaveReview } from '@/components/shared/leave-review'

type Collaboration = {
  id: string
  campaign_id: string
  status: string
  created_at: string
  message?: string
  deliverable_url?: string
  deliverable_note?: string
  deliverable_submitted_at?: string
  deliverable_approved_at?: string
  deliverable_rejected_at?: string
  deliverable_rejection_reason?: string
  campaigns: {
    id: string
    title: string
    brand_name: string
    budget: number
    deadline: string
    platforms: string[]
    description?: string
    deliverables?: string
  } | null
}

const fmt = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <InstagramIcon className="w-4 h-4" />,
  tiktok: <TikTokSVG className="w-4 h-4" />,
  youtube: <YoutubeIcon className="w-4 h-4" />,
  twitter: <TwitterXIcon className="w-4 h-4" />,
  x: <TwitterXIcon className="w-4 h-4" />,
  linkedin: <LinkedInIcon className="w-4 h-4" />,
}

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string; label: string; icon: React.ReactElement }> = {
  INVITED: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Invited', icon: <MessageSquare className="w-4 h-4 text-blue-500" /> },
  PENDING: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Applied', icon: <Clock className="w-4 h-4 text-amber-500" /> },
  ACTIVE: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Active', icon: <Zap className="w-4 h-4 text-purple-500" /> },
  COMPLETED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500', label: 'Completed', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  REJECTED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Declined', icon: <X className="w-4 h-4 text-gray-400" /> },
}

const TABS = ['All', 'Invited', 'Active', 'Applied', 'Completed', 'Declined'] as const
type Tab = typeof TABS[number]
const TAB_FILTER: Record<Tab, string[]> = {
  'All': ['INVITED', 'PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED'],
  'Invited': ['INVITED'],
  'Active': ['ACTIVE'],
  'Applied': ['PENDING'],
  'Completed': ['COMPLETED'],
  'Declined': ['REJECTED'],
}

// ─── Deliverable Submit Component ────────────────────────────────────────────
function DeliverableSection({ collab, onUpdated }: { collab: Collaboration; onUpdated: (updated: Partial<Collaboration> & { id: string }) => void }) {
  const [url, setUrl] = useState(collab.deliverable_url || '')
  const [note, setNote] = useState(collab.deliverable_note || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const wasRejected = !!collab.deliverable_rejected_at && !collab.deliverable_submitted_at
  const isSubmitted = !!collab.deliverable_submitted_at && !collab.deliverable_approved_at && !collab.deliverable_rejected_at
  const isApproved = !!collab.deliverable_approved_at

  async function submit() {
    if (!url.trim()) { setError('Introdu link-ul postului tău'); return }
    try { new URL(url.trim()) } catch { setError('URL invalid — ex: https://instagram.com/p/...'); return }
    setSaving(true); setError(null)
    const sb = createClient()
    const { error: err } = await sb.from('collaborations').update({
      deliverable_url: url.trim(),
      deliverable_note: note.trim() || null,
      deliverable_submitted_at: new Date().toISOString(),
      deliverable_rejected_at: null,
      deliverable_rejection_reason: null,
    }).eq('id', collab.id)
    if (err) { setError(err.message); setSaving(false); return }
    onUpdated({
      id: collab.id,
      deliverable_url: url.trim(),
      deliverable_note: note.trim() || undefined,
      deliverable_submitted_at: new Date().toISOString(),
      deliverable_rejected_at: undefined,
      deliverable_rejection_reason: undefined,
    })
    setSaving(false)
    setEditing(false)
  }

  // Was rejected — show rejection reason + resubmit form
  if (wasRejected || editing) return (
    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-red-200">
      {wasRejected && !editing && (
        <div className="bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-700">Post respins de brand</p>
            {collab.deliverable_rejection_reason && (
              <p className="text-xs text-red-600 mt-0.5">„{collab.deliverable_rejection_reason}"</p>
            )}
          </div>
        </div>
      )}
      <div className="bg-white p-4 space-y-3">
        <p className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          {wasRejected ? 'Retrimite dovada postului' : 'Editează dovada'}
        </p>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Link post public *</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
              placeholder="https://instagram.com/p/..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">
            Notă pentru brand <span className="font-normal text-gray-400">(opțional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ex: Am postat marți, am atins 15k views în primele 24h, engagement rate 8%..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        <div className="flex gap-2">
          {editing && (
            <button onClick={() => { setEditing(false); setUrl(collab.deliverable_url || ''); setNote(collab.deliverable_note || '') }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
              Anulează
            </button>
          )}
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Trimite…</>
              : <><Send className="w-3.5 h-3.5" /> {wasRejected ? 'Retrimite dovada' : 'Trimite dovada'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )

  // Submitted, waiting for brand
  if (isSubmitted) return (
    <div className="mt-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Dovadă trimisă — în așteptarea aprobării</p>
      </div>
      <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center gap-3">
        <Link2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer"
          className="text-sm font-bold text-amber-700 hover:text-amber-900 underline truncate flex-1">
          {collab.deliverable_url}
        </a>
        <a href={collab.deliverable_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 transition">
          <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
        </a>
      </div>
      {collab.deliverable_note && (
        <p className="text-xs text-gray-500 italic">„{collab.deliverable_note}"</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Trimis: {fmtDateTime(collab.deliverable_submitted_at!)}</p>
        <button onClick={() => setEditing(true)}
          className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition">
          <RotateCcw className="w-3 h-3" /> Editează
        </button>
      </div>
    </div>
  )

  // Not yet submitted — show submit form
  return (
    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-purple-200">
      <div className="bg-purple-50 px-4 py-3 flex items-center gap-2">
        <Upload className="w-4 h-4 text-purple-600" />
        <p className="text-xs font-black text-purple-700 uppercase tracking-wider">Trimite dovada postului</p>
      </div>
      <div className="bg-white p-4 space-y-3">
        {collab.campaigns?.deliverables && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Ce trebuie să faci</p>
            <p className="text-xs text-gray-600">{collab.campaigns.deliverables}</p>
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Link post public *</label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
              placeholder="https://instagram.com/p/..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Pastează link-ul direct la postul publicat (Instagram, TikTok, YouTube etc.)</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">
            Notă pentru brand <span className="font-normal text-gray-400">(opțional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ex: Am postat marți, am atins 15k views în primele 24h, engagement rate 8%..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        <button onClick={submit} disabled={saving}
          className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Trimite…</>
            : <><Send className="w-3.5 h-3.5" /> Trimite dovada postului</>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CollaborationsPage() {
  const [collabs, setCollabs] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const fetchCollabs = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: inf } = await sb.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) return
      const { data, error } = await sb
        .from('collaborations')
        .select('*, reserved_amount, payment_amount, campaigns(id, title, brand_name, budget, budget_per_influencer, max_influencers, deadline, platforms, description, product_name, content_type, content_tone, min_duration, required_caption, required_hashtags, min_days_online, forbidden_mentions, forbidden_content, proof_requirements, key_messages)')
        .eq('influencer_id', inf.id)
        .order('created_at', { ascending: false })
      if (!error && data) setCollabs(data as Collaboration[])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCollabs()
    const setup = async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: inf } = await sb.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) return
      const channel = sb.channel('collabs-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborations', filter: `influencer_id=eq.${inf.id}` }, fetchCollabs)
        .subscribe()
      return () => { sb.removeChannel(channel) }
    }
    setup()
  }, [fetchCollabs])

  async function handleAction(collabId: string, action: 'accept' | 'decline') {
    setActionLoading(collabId)
    try {
      const sb = createClient()
      const newStatus = action === 'accept' ? 'ACTIVE' : 'REJECTED'
      const { error } = await sb.from('collaborations').update({ status: newStatus }).eq('id', collabId)
      if (error) throw error
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: newStatus } : c))
      notify(action === 'accept' ? '🎉 Invitație acceptată! Ești activ pe această campanie.' : 'Invitație refuzată.', action === 'accept')
    } catch (e: any) { notify(e.message || 'Ceva a mers greșit.', false) }
    finally { setActionLoading(null) }
  }

  function updateCollab(updated: Partial<Collaboration> & { id: string }) {
    setCollabs(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }

  const filtered = collabs.filter(c => {
    const matchTab = TAB_FILTER[activeTab].includes(c.status)
    const q = search.toLowerCase()
    const matchSearch = !q || c.campaigns?.title?.toLowerCase().includes(q) || c.campaigns?.brand_name?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const counts: Record<Tab, number> = {
    'All': collabs.length,
    'Invited': collabs.filter(c => c.status === 'INVITED').length,
    'Active': collabs.filter(c => c.status === 'ACTIVE').length,
    'Applied': collabs.filter(c => c.status === 'PENDING').length,
    'Completed': collabs.filter(c => c.status === 'COMPLETED').length,
    'Declined': collabs.filter(c => c.status === 'REJECTED').length,
  }

  const invitations = collabs.filter(c => c.status === 'INVITED')
  // Active collabs that need deliverable submitted (not yet submitted, not rejected)
  const needsDeliverable = collabs.filter(c =>
    c.status === 'ACTIVE' && !c.deliverable_submitted_at && !c.deliverable_rejected_at
  )
  // Active collabs that were rejected and need resubmission
  const needsResubmit = collabs.filter(c =>
    c.status === 'ACTIVE' && !!c.deliverable_rejected_at && !c.deliverable_submitted_at
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm text-gray-400 font-semibold">Se încarcă colaborările…</p>
      </div>
    </div>
  )

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
        .tab-btn { padding:7px 16px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .18s;white-space:nowrap; }
        .tab-btn.on { background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;box-shadow:0 4px 12px rgba(139,92,246,.3); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#ede9fe;color:#7c3aed; }
        .btn-accept { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-accept:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 6px 18px rgba(139,92,246,.4); }
        .btn-decline { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-decline:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444;background:#fff5f5; }
        .btn-accept:disabled,.btn-decline:disabled { opacity:.55;cursor:not-allowed;transform:none;box-shadow:none; }
        .search-box { width:100%;padding:10px 16px 10px 42px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s;font-family:inherit; }
        .search-box:focus { border-color:#8b5cf6;box-shadow:0 0 0 4px rgba(139,92,246,.08); }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideDown .3s ease; }
        @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,.4)} 50%{box-shadow:0 0 0 6px rgba(59,130,246,0)} }
        .pulse-ring { animation:pulse-ring 2s ease-in-out infinite; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Colaborările mele</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {collabs.length} total
            {invitations.length > 0 && <> · <span className="text-blue-600 font-bold">{invitations.length} invitații noi</span></>}
            {needsResubmit.length > 0 && <> · <span className="text-red-500 font-bold">{needsResubmit.length} respinse</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCollabs} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition" title="Refresh">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <Link href="/influencer/campaigns"
            className="inline-flex items-center gap-2 infl-grad text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:-translate-y-0.5 transition"
            style={{ boxShadow: '0 4px 14px rgba(139,92,246,.3)' }}>
            <Briefcase className="w-4 h-4" /> Găsește campanii
          </Link>
        </div>
      </div>

      {/* ── Alert: posts rejected ──────────────────────────── */}
      {needsResubmit.length > 0 && (
        <div className="mb-5 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-red-700 text-sm">
              {needsResubmit.length} post{needsResubmit.length > 1 ? 'uri' : ''} respins{needsResubmit.length > 1 ? 'e' : ''} de brand
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Deschide colaborarea activă și retrimite dovada corectată.
            </p>
          </div>
          <button onClick={() => setActiveTab('Active')} className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 whitespace-nowrap transition">
            Vezi active →
          </button>
        </div>
      )}

      {/* ── Alert: needs deliverable ───────────────────────── */}
      {needsDeliverable.length > 0 && needsResubmit.length === 0 && (
        <div className="mb-5 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex items-start gap-3">
          <Upload className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-purple-700 text-sm">
              {needsDeliverable.length} colaborare{needsDeliverable.length > 1 ? 'i' : ''} active — trimite dovada postului
            </p>
            <p className="text-xs text-purple-600 mt-0.5">Publică postul și trimite link-ul pentru a primi plata.</p>
          </div>
          <button onClick={() => { setActiveTab('Active'); setExpandedId(needsDeliverable[0]?.id) }} className="ml-auto text-xs font-bold text-purple-600 hover:text-purple-800 whitespace-nowrap transition">
            Trimite →
          </button>
        </div>
      )}

      {/* ── Pending invitations ────────────────────────────── */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-ring" />
            <h2 className="font-black text-gray-900">Invitații în așteptare</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-0.5 rounded-full">Răspuns necesar</span>
          </div>
          <div className="space-y-4">
            {invitations.map(inv => (
              <div key={inv.id} className="relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-white" style={{ boxShadow: '0 4px 24px rgba(59,130,246,.12)' }}>
                <div className="h-1 w-full infl-grad" />
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Brand Invitation
                        </span>
                        <span className="text-xs text-gray-400">{fmtDate(inv.created_at)}</span>
                      </div>
                      <h3 className="font-black text-gray-900 text-lg leading-tight">{inv.campaigns?.title || 'Campaign Invitation'}</h3>
                      <p className="text-sm font-semibold text-gray-500 mt-0.5">{inv.campaigns?.brand_name}</p>
                      {inv.message && inv.message !== 'You have been invited to collaborate on a campaign.' && (
                        <div className="mt-3 flex items-start gap-2 bg-blue-50 rounded-xl p-3">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-600 italic">„{inv.message}"</p>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        {inv.campaigns?.deadline && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            Deadline: <span className="text-gray-700">{fmtDateShort(inv.campaigns.deadline)}</span>
                          </div>
                        )}
                        {inv.campaigns?.platforms?.map(p => (
                          <span key={p} className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                            {PLATFORM_ICON[p.toLowerCase()] || null}
                            <span className="text-xs font-semibold text-gray-600 capitalize">{p}</span>
                          </span>
                        ))}
                      </div>
                      {/* Brief preview */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inv.campaigns?.product_name && (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">📦 Produs</p>
                            <p className="text-xs font-bold text-gray-700">{inv.campaigns.product_name}</p>
                          </div>
                        )}
                        {inv.campaigns?.content_type?.length > 0 && (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">🎬 Tip conținut</p>
                            <p className="text-xs font-bold text-gray-700">{inv.campaigns.content_type.join(', ')}</p>
                          </div>
                        )}
                        {inv.campaigns?.min_duration && (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">⏱️ Durată minimă</p>
                            <p className="text-xs font-bold text-gray-700">{inv.campaigns.min_duration} secunde</p>
                          </div>
                        )}
                        {inv.campaigns?.min_days_online && (
                          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">📅 Online minim</p>
                            <p className="text-xs font-bold text-gray-700">{inv.campaigns.min_days_online} zile</p>
                          </div>
                        )}
                        {inv.campaigns?.required_caption && (
                          <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100 sm:col-span-2">
                            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-wider mb-1">✍️ Caption obligatoriu</p>
                            <p className="text-xs font-bold text-gray-700">{inv.campaigns.required_caption}</p>
                          </div>
                        )}
                        {inv.campaigns?.required_hashtags?.length > 0 && (
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 sm:col-span-2">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1"># Hashtag-uri obligatorii</p>
                            <p className="text-xs font-bold text-blue-700">#{inv.campaigns.required_hashtags.join(' #')}</p>
                          </div>
                        )}
                        {inv.campaigns?.key_messages?.length > 0 && (
                          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 sm:col-span-2">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">⭐ Mesaje cheie</p>
                            <ul className="space-y-0.5">{inv.campaigns.key_messages.map((m: string, i: number) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1"><span className="text-purple-400 flex-shrink-0">•</span>{m}</li>
                            ))}</ul>
                          </div>
                        )}
                        {inv.campaigns?.forbidden_mentions?.length > 0 && (
                          <div className="bg-red-50 rounded-xl p-3 border border-red-100 sm:col-span-2">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1">🚫 Nu este permis</p>
                            <p className="text-xs text-red-700">{inv.campaigns.forbidden_mentions.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-4 flex-shrink-0">
                      {(inv.campaigns?.budget_per_influencer || inv.campaigns?.budget) && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center sm:text-right">
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Câștigul tău</p>
                          <p className="text-2xl font-black text-green-600">{fmt((inv.campaigns.budget_per_influencer || inv.campaigns.budget) * 0.85)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">din {fmt(inv.campaigns.budget_per_influencer || inv.campaigns.budget)} (85%)</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => handleAction(inv.id, 'decline')} disabled={actionLoading === inv.id} className="btn-decline flex-1 sm:flex-none">
                          {actionLoading === inv.id ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                          Refuz
                        </button>
                        <button onClick={() => handleAction(inv.id, 'accept')} disabled={actionLoading === inv.id} className="btn-accept flex-1 sm:flex-none">
                          {actionLoading === inv.id ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                          Accept
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search + Tabs ──────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="search-box" placeholder="Caută campanie sau brand…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-btn ${activeTab === tab ? 'on' : ''}`}>
              {tab}
              {counts[tab] > 0 && (
                <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Collaboration List ──────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
          <div className="w-16 h-16 rounded-2xl infl-grad flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 4px 16px rgba(139,92,246,.25)' }}>
            <Zap className="w-8 h-8 text-white" />
          </div>
          <p className="font-black text-gray-700 text-lg mb-2">
            {activeTab === 'All' ? 'Nicio colaborare încă' : `Nicio colaborare ${activeTab.toLowerCase()}`}
          </p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            {activeTab === 'All' ? 'Aplică la campanii sau așteaptă invitații de la branduri.' : `Nu ai colaborări ${activeTab.toLowerCase()} în acest moment.`}
          </p>
          <Link href="/influencer/campaigns"
            className="inline-flex items-center gap-2 infl-grad text-white font-bold text-sm px-6 py-3 rounded-xl"
            style={{ boxShadow: '0 4px 14px rgba(139,92,246,.3)' }}>
            Caută campanii <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.PENDING
            const isExpanded = expandedId === c.id
            const isInvited = c.status === 'INVITED'
            const hasDeliverablePending = c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
            const wasRejected = c.status === 'ACTIVE' && !!c.deliverable_rejected_at && !c.deliverable_submitted_at

            if (isInvited) return null

            return (
              <div key={c.id}
                className={`rounded-2xl border-2 bg-white overflow-hidden transition-all ${wasRejected ? 'border-red-200' : hasDeliverablePending ? 'border-amber-200' : cfg.border}`}
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>

                {/* Main row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50/60 transition" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${wasRejected ? 'bg-red-50' : hasDeliverablePending ? 'bg-amber-50' : cfg.bg}`}>
                    {wasRejected ? <AlertTriangle className="w-4 h-4 text-red-500" /> : hasDeliverablePending ? <Eye className="w-4 h-4 text-amber-500" /> : cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{c.campaigns?.title || 'Campaign'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-gray-400 font-medium">{c.campaigns?.brand_name}</p>
                      {c.campaigns?.deadline && (
                        <>
                          <span className="text-gray-200">·</span>
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDateShort(c.campaigns.deadline)}</p>
                        </>
                      )}
                      {wasRejected && <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Post respins</span>}
                      {hasDeliverablePending && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">În așteptare</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.campaigns?.platforms?.slice(0, 2).map(p => (
                      <span key={p}>{PLATFORM_ICON[p.toLowerCase()] || null}</span>
                    ))}
                    {c.status === 'ACTIVE' && c.reserved_amount ? (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        🔒 {c.reserved_amount.toLocaleString('ro-RO')} RON garantat
                      </span>
                    ) : c.status === 'COMPLETED' && c.payment_amount ? (
                      <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                        ✅ {c.payment_amount.toLocaleString('ro-RO')} RON plătit
                      </span>
                    ) : (
                      <span className="text-sm font-black text-green-600">
                        {(() => {
                          const camp = c.campaigns
                          if (!camp) return null
                          // budget_per_influencer dacă există, altfel calculat din budget / max_influencers
                          const perInf = camp.budget_per_influencer
                            ? camp.budget_per_influencer * 0.85
                            : camp.max_influencers && camp.max_influencers > 0
                              ? (camp.budget / camp.max_influencers) * 0.85
                              : camp.budget * 0.85
                          return perInf > 0 ? fmt(perInf) : null
                        })()}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${wasRejected ? 'bg-red-50 text-red-600' : hasDeliverablePending ? 'bg-amber-50 text-amber-600' : `${cfg.bg} ${cfg.text}`}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${wasRejected ? 'bg-red-500' : hasDeliverablePending ? 'bg-amber-400' : cfg.dot}`} />
                      {wasRejected ? 'Respins' : hasDeliverablePending ? 'Revizuire' : cfg.label}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-5 border-t border-gray-100">
                    <div className="pt-4 space-y-4">

                      {/* Campaign details */}
                      {(c.campaigns?.description || c.campaigns?.deliverables) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {c.campaigns?.description && (
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Despre campanie</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{c.campaigns.description}</p>
                            </div>
                          )}
                          {c.campaigns?.deliverables && (
                            <div className="bg-purple-50 rounded-xl p-3">
                              <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">Ce trebuie să faci</p>
                              <p className="text-xs text-gray-600 leading-relaxed">{c.campaigns.deliverables}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message from brand */}
                      {c.message && c.message !== 'You have been invited to collaborate on a campaign.' && (
                        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mb-1">Mesaj de la brand</p>
                            <p className="text-xs text-gray-600 italic">„{c.message}"</p>
                          </div>
                        </div>
                      )}

                      {/* ── DELIVERABLE SECTION for ACTIVE ── */}
                      {c.status === 'ACTIVE' && (
                        <DeliverableSection collab={c} onUpdated={updateCollab} />
                      )}

                      {/* Completed: show approved deliverable */}
                      {c.status === 'COMPLETED' && c.deliverable_url && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                          <p className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5" /> Post aprobat de brand
                          </p>
                          <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-white border border-green-200 rounded-xl p-3 hover:bg-green-50 transition group">
                            <Link2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm font-bold text-green-700 truncate flex-1">{c.deliverable_url}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 transition" />
                          </a>
                          {c.deliverable_approved_at && (
                            <p className="text-xs text-gray-400">Aprobat: {fmtDateTime(c.deliverable_approved_at)}</p>
                          )}
                        </div>
                      )}

                      {/* Review for completed */}
                      {c.status === 'COMPLETED' && (
                        <LeaveReview
                          collaborationId={c.id}
                          reviewerRole="influencer"
                          targetName={c.campaigns?.brand_name ?? 'acest brand'}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
