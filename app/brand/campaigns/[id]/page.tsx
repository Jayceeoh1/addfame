'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateCampaignStatus } from '@/app/actions/campaigns'
import {
  ArrowLeft, Clock, Users, TrendingUp, CheckCircle, AlertCircle,
  Eye, EyeOff, Play, Pause, Archive, Briefcase, Instagram, Youtube,
  Star, MessageSquare, MoreHorizontal, X, Check, DollarSign,
  Globe, RefreshCw, Edit2, Save, Calendar, Tag, BarChart2
} from 'lucide-react'
import Link from 'next/link'

/* ─── Icons ─────────────────────────────────────────────────── */
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

/* ─── Types ──────────────────────────────────────────────────── */
type Campaign = {
  id: string; title: string; description: string
  brand_id: string; brand_name: string; budget: number
  platforms: string[]; deliverables: string; deadline: string
  niches: string[]; countries: string[]; status: string
  invited_influencers: string[]; accepted_influencers: string[]
  declined_influencers: string[]; created_at: string
}

type Collab = {
  id: string; influencer_id: string; status: string
  message: string | null; created_at: string
  reserved_amount?: number
  deliverable_url?: string | null
  deliverable_submitted_at?: string | null
  deliverable_approved_at?: string | null
  deliverable_rejected_at?: string | null
  deliverable_rejection_reason?: string | null
  payment_amount?: number
  platform_fee?: number
  completed_at?: string | null
  deliverable_note?: string | null
  influencers: {
    id: string; name: string; avatar: string | null
    bio: string; niches: string[]; platforms: any[]
  } | null
}

/* ─── Helpers ────────────────────────────────────────────────── */
const fmt = (n: number) => `€${(n || 0).toLocaleString('en', { minimumFractionDigits: 0 })}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  tiktok: <TikTokIcon className="w-4 h-4 text-gray-800" />,
  youtube: <Youtube className="w-4 h-4 text-red-500" />,
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-200' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
  PAUSED: { label: 'Paused', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', border: 'border-gray-200' },
  COMPLETED: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400', border: 'border-blue-200' },
}

const COLLAB_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  INVITED: { label: 'Invited', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  PENDING: { label: 'Applied', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACTIVE: { label: 'Active', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  REJECTED: { label: 'Declined', bg: 'bg-gray-100', text: 'text-gray-400', dot: 'bg-gray-300' },
}

type Tab = 'all' | 'pending' | 'invited' | 'active' | 'completed' | 'rejected'

/* ─── Page ───────────────────────────────────────────────────── */
export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [collabs, setCollabs] = useState<Collab[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [collabLoading, setCollabLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Campaign>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /* ── Toast ── */
  const notify = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  /* ── Fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) { router.replace('/brand/dashboard'); return }

      // Fetch campaign (verify ownership via brand_id)
      const { data: camp, error: campErr } = await sb
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('brand_id', brand.id)
        .single()

      if (campErr || !camp) { router.replace('/brand/campaigns'); return }
      setCampaign(camp)
      setEditForm(camp)

      // Fetch collaborations (try join first, fall back to manual fetch)
      const { data: collabData, error: collabErr } = await sb
        .from('collaborations')
        .select(`id, influencer_id, status, message, created_at, influencers ( id, name, avatar, bio, niches, platforms )`)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })

      if (collabErr) {
        console.error('Collaborations fetch error:', collabErr)
        // Fallback: fetch without join
        const { data: plainCollabs } = await sb
          .from('collaborations')
          .select('id, influencer_id, status, message, created_at')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })

        if (plainCollabs && plainCollabs.length > 0) {
          // Manually fetch influencer profiles
          const infIds = [...new Set(plainCollabs.map(c => c.influencer_id).filter(Boolean))]
          const { data: infData } = await sb
            .from('influencers')
            .select('id, name, avatar, bio, niches, platforms')
            .in('id', infIds)

          const infMap = Object.fromEntries((infData ?? []).map(i => [i.id, i]))
          setCollabs(plainCollabs.map(c => ({ ...c, influencers: infMap[c.influencer_id] ?? null })) as Collab[])
        } else {
          setCollabs([])
        }
      } else {
        // Join succeeded — but influencers might be null if no FK. Patch manually if needed.
        const rows = (collabData ?? []) as unknown as Collab[]
        const missing = rows.filter(c => !c.influencers && c.influencer_id)
        if (missing.length > 0) {
          const ids = missing.map(c => c.influencer_id)
          const { data: infData } = await sb.from('influencers').select('id, name, avatar, bio, niches, platforms').in('id', ids)
          const infMap = Object.fromEntries((infData ?? []).map(i => [i.id, i]))
          setCollabs(rows.map(c => ({ ...c, influencers: c.influencers ?? infMap[c.influencer_id] ?? null })))
        } else {
          setCollabs(rows)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [campaignId, router])

  useEffect(() => {
    fetchAll()

    // Real-time subscription on collaborations
    const sb = createClient()
    const ch = sb.channel(`campaign-${campaignId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'collaborations',
        filter: `campaign_id=eq.${campaignId}`,
      }, () => { fetchAll() })
      .subscribe()

    // Close menu on outside click
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => { sb.removeChannel(ch); document.removeEventListener('mousedown', onOutside) }
  }, [fetchAll, campaignId])

  /* ── Campaign status change ── */
  async function changeStatus(s: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
    setStatusLoading(true); setMenuOpen(false)
    try {
      const res = await updateCampaignStatus(campaignId, s)
      if (!res.success) throw new Error(res.error)
      setCampaign(p => p ? { ...p, status: s } : null)
      notify({ ACTIVE: '🚀 Published! Influencers can now apply.', DRAFT: 'Moved back to draft.', PAUSED: 'Campaign paused.', COMPLETED: 'Marked as completed.' }[s] ?? 'Updated.')
    } catch (e: any) { notify(e.message || 'Failed to update status.', false) }
    finally { setStatusLoading(false) }
  }

  /* ── Save edits ── */
  async function saveEdit() {
    if (!campaign) return
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) throw new Error('Brand not found')

      const patch = {
        title: editForm.title,
        description: editForm.description,
        budget: Number(editForm.budget),
        deliverables: editForm.deliverables,
        deadline: editForm.deadline,
        platforms: editForm.platforms,
        niches: editForm.niches,
        countries: editForm.countries,
      }

      const { error } = await sb.from('campaigns').update(patch).eq('id', campaignId).eq('brand_id', brand.id)
      if (error) throw error
      setCampaign(p => p ? { ...p, ...patch } as Campaign : null)
      setEditing(false)
      notify('✅ Campaign updated successfully!')
    } catch (e: any) { notify(e.message || 'Failed to save changes.', false) }
    finally { setSaving(false) }
  }

  /* ── Collab action: approve or decline ── */
  async function collabAction(collabId: string, newStatus: 'ACTIVE' | 'REJECTED' | 'COMPLETED') {
    setCollabLoading(collabId)
    try {
      const sb = createClient()
      const update: any = { status: newStatus }
      if (newStatus === 'COMPLETED') update.completed_at = new Date().toISOString()
      const { error } = await sb.from('collaborations').update(update).eq('id', collabId)
      if (error) throw error
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, ...update } : c))
      const msgs: Record<string, string> = { ACTIVE: '✅ Influencer approved!', REJECTED: 'Application declined.', COMPLETED: '🎉 Completed! Payment will be released to the influencer.' }
      notify(msgs[newStatus] ?? 'Updated.', newStatus !== 'REJECTED')
      // Fire approval email (non-blocking)
      if (newStatus === 'ACTIVE' && campaign) {
        const collab = collabs.find(c => c.id === collabId)
        if (collab?.influencers?.id) {
          fetch('/api/notify/collab-approved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ influencerId: collab.influencers.id, brandName: campaign.brand_name, campaignTitle: campaign.title }),
          }).catch(() => { })
        }
      }
    } catch (e: any) { notify(e.message || 'Action failed.', false) }
    finally { setCollabLoading(null) }
  }

  /* ── Filtered collabs ── */
  const tabFilter: Record<Tab, string[]> = {
    all: ['INVITED', 'PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED'],
    pending: ['PENDING'],
    invited: ['INVITED'],
    active: ['ACTIVE'],
    completed: ['COMPLETED'],
    rejected: ['REJECTED'],
  }
  const visible = collabs.filter(c => tabFilter[tab].includes(c.status))

  const counts = {
    all: collabs.length,
    pending: collabs.filter(c => c.status === 'PENDING').length,
    invited: collabs.filter(c => c.status === 'INVITED').length,
    active: collabs.filter(c => c.status === 'ACTIVE').length,
    completed: collabs.filter(c => c.status === 'COMPLETED').length,
    rejected: collabs.filter(c => c.status === 'REJECTED').length,
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-t-orange-500 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm text-gray-400 font-semibold">Loading campaign…</p>
      </div>
    </div>
  )

  if (!campaign) return null

  const cfg = STATUS_CFG[campaign.status] ?? STATUS_CFG.DRAFT
  const days = daysLeft(campaign.deadline)
  const expired = days < 0
  const urgent = !expired && days <= 3

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .brand-grad { background: linear-gradient(135deg,#f97316,#ec4899); }
        .card { background:white; border:1.5px solid #f0f0f0; border-radius:20px; }
        .tab-btn { padding:7px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .15s;white-space:nowrap;font-family:inherit; }
        .tab-btn.on { background:linear-gradient(135deg,#f97316,#ec4899);color:white;box-shadow:0 3px 10px rgba(249,115,22,.28); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#fff7ed;color:#f97316; }
        .btn-pub { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:800;background:linear-gradient(135deg,#f97316,#ec4899);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-pub:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 6px 18px rgba(249,115,22,.38); }
        .btn-pub:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .btn-sec { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:700;background:white;color:#374151;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-sec:hover:not(:disabled) { border-color:#d1d5db;background:#f9fafb; }
        .btn-sec:disabled { opacity:.6;cursor:not-allowed; }
        .btn-approve { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-approve:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 4px 12px rgba(34,197,94,.35); }
        .btn-decline { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-decline:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444;background:#fff5f5; }
        .btn-approve:disabled,.btn-decline:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .badge { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700; }
        .field { width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s;font-family:inherit;color:#111; }
        .field:focus { border-color:#f97316;box-shadow:0 0 0 4px rgba(249,115,22,.08); }
        .field::placeholder { color:#9ca3af;font-weight:400; }
        .dropdown { position:absolute;right:0;top:calc(100%+6px);background:white;border:1.5px solid #f0f0f0;border-radius:14px;padding:6px;z-index:50;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,.12); }
        .d-item { display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:inherit;color:#374151;transition:background .1s; }
        .d-item:hover { background:#f9fafb; }
        .d-item.red { color:#ef4444; } .d-item.red:hover { background:#fef2f2; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideD { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        .dd-anim { animation:slideD .18s ease; }
        .card-anim { animation:fadeUp .35s ease both; }
        .line-clamp-1 { display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden; }
        .line-clamp-2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Back ── */}
      <Link href="/brand/campaigns" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      {/* ── Hero card ── */}
      <div className="card p-6 mb-5 card-anim">

        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`badge ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
              </span>
              {campaign.status === 'ACTIVE' && (
                <span className="text-xs font-black text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✓ Visible to influencers</span>
              )}
              {campaign.status === 'DRAFT' && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">⚠ Not visible to influencers</span>
              )}
            </div>

            {editing ? (
              <input className="field text-xl font-black mb-1 w-full" value={editForm.title || ''} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="Campaign title" />
            ) : (
              <h1 className="text-2xl font-black text-gray-900 mb-0.5">{campaign.title}</h1>
            )}
            <p className="text-gray-500 font-medium text-sm">{campaign.brand_name}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition" title="Refresh">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>

            {editing ? (
              <>
                <button className="btn-sec" onClick={() => { setEditing(false); setEditForm(campaign) }} disabled={saving}>
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button className="btn-pub" onClick={saveEdit} disabled={saving}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </>
            ) : (
              <>
                <button className="btn-sec" onClick={() => setEditing(true)}>
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                {campaign.status === 'DRAFT' && (
                  <button className="btn-pub" onClick={() => changeStatus('ACTIVE')} disabled={statusLoading} style={{ boxShadow: '0 4px 14px rgba(249,115,22,.35)' }}>
                    {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
                    Publish
                  </button>
                )}
                {campaign.status === 'ACTIVE' && (
                  <button className="btn-sec" onClick={() => changeStatus('PAUSED')} disabled={statusLoading}>
                    {statusLoading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <Pause className="w-4 h-4" />}
                    Pause
                  </button>
                )}
                {campaign.status === 'PAUSED' && (
                  <button className="btn-pub" onClick={() => changeStatus('ACTIVE')} disabled={statusLoading}>
                    {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                    Resume
                  </button>
                )}

                {/* ⋯ menu */}
                <div className="relative" ref={menuRef}>
                  <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition" onClick={() => setMenuOpen(o => !o)}>
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>
                  {menuOpen && (
                    <div className="dropdown dd-anim">
                      {campaign.status !== 'ACTIVE' && <button className="d-item" onClick={() => changeStatus('ACTIVE')}>   <Play className="w-4 h-4 text-green-500" /> Publish</button>}
                      {campaign.status !== 'DRAFT' && <button className="d-item" onClick={() => changeStatus('DRAFT')}>    <EyeOff className="w-4 h-4 text-amber-500" /> Move to Draft</button>}
                      {campaign.status !== 'PAUSED' && campaign.status !== 'COMPLETED' && <button className="d-item" onClick={() => changeStatus('PAUSED')}><Pause className="w-4 h-4 text-gray-500" /> Pause</button>}
                      {campaign.status !== 'COMPLETED' && <button className="d-item red" onClick={() => changeStatus('COMPLETED')}><Archive className="w-4 h-4" /> Mark Completed</button>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              icon: DollarSign, label: 'Budget', value: editing ? null : fmt(campaign.budget), color: 'text-green-600', bg: 'bg-green-50',
              edit: <input type="number" className="field" value={editForm.budget ?? ''} onChange={e => setEditForm(p => ({ ...p, budget: Number(e.target.value) }))} placeholder="Budget" />
            },
            {
              icon: Calendar, label: expired ? 'Expired' : 'Deadline', value: editing ? null : fmtDate(campaign.deadline), color: expired ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-700', bg: expired ? 'bg-red-50' : urgent ? 'bg-orange-50' : 'bg-gray-50',
              edit: <input type="date" className="field" value={editForm.deadline?.slice(0, 10) ?? ''} onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))} />,
              sub: !expired ? (days === 0 ? 'Last day!' : `${days} day${days !== 1 ? 's' : ''} left`) : undefined, subColor: urgent ? 'text-orange-500' : 'text-gray-400'
            },
            { icon: Users, label: 'Applicants', value: `${collabs.length}`, color: 'text-purple-600', bg: 'bg-purple-50', edit: null },
            { icon: TrendingUp, label: 'Active', value: `${counts.active}`, color: 'text-blue-600', bg: 'bg-blue-50', edit: null },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-1.5">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs font-bold text-gray-400">{s.label}</p>
              </div>
              {editing && s.edit
                ? s.edit
                : <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              }
              {s.sub && !editing && <p className={`text-xs font-bold mt-0.5 ${s.subColor}`}>{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Details / Edit form */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Description</p>
            {editing
              ? <textarea className="field" rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Campaign description…" style={{ resize: 'none' }} />
              : <p className="text-sm text-gray-600 leading-relaxed">{campaign.description || <span className="text-gray-300 italic">No description</span>}</p>
            }
          </div>

          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Deliverables</p>
            {editing
              ? <textarea className="field" rows={3} value={editForm.deliverables || ''} onChange={e => setEditForm(p => ({ ...p, deliverables: e.target.value }))} placeholder="What should the influencer deliver?" style={{ resize: 'none' }} />
              : campaign.deliverables
                ? <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 leading-relaxed">{campaign.deliverables}</div>
                : <p className="text-sm text-gray-300 italic">No deliverables specified</p>
            }
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {/* Platforms */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.platforms?.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                    {PLATFORM_ICON[p.toLowerCase()] || <Star className="w-3 h-3" />} {p.toLowerCase()}
                  </span>
                ))}
                {(!campaign.platforms || campaign.platforms.length === 0) && <span className="text-xs text-gray-300 italic">None</span>}
              </div>
            </div>

            {/* Niches */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Target Niches</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.niches?.map(n => (
                  <span key={n} className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full">{n}</span>
                ))}
                {(!campaign.niches || campaign.niches.length === 0) && <span className="text-xs text-gray-300 italic">None</span>}
              </div>
            </div>

            {/* Countries */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Countries</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.countries?.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                    <Globe className="w-3 h-3" /> {c}
                  </span>
                ))}
                {(!campaign.countries || campaign.countries.length === 0) && <span className="text-xs text-gray-300 italic">None</span>}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-300 pt-1">Created {fmtDate(campaign.created_at)}</p>
        </div>
      </div>

      {/* ── Analytics ── */}
      <div className="card p-5 card-anim" style={{ animationDelay: '.04s' }}>
        <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </span>
          Campaign Analytics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Applications', value: collabs.length, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Active', value: collabs.filter(c => c.status === 'ACTIVE').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pending Review', value: collabs.filter(c => c.status === 'PENDING').length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Conversion Rate', value: collabs.length > 0 ? `${Math.round((collabs.filter(c => c.status === 'ACTIVE').length / collabs.length) * 100)}%` : '—', color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-bold text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Mini bar chart — applications by status */}
        {collabs.length > 0 && (
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Applications Breakdown</p>
            <div className="space-y-2">
              {[
                { label: 'Applied', count: collabs.filter(c => c.status === 'PENDING').length, color: 'bg-amber-400' },
                { label: 'Invited', count: collabs.filter(c => c.status === 'INVITED').length, color: 'bg-blue-400' },
                { label: 'Active', count: collabs.filter(c => c.status === 'ACTIVE').length, color: 'bg-green-400' },
                { label: 'Completed', count: collabs.filter(c => c.status === 'COMPLETED').length, color: 'bg-indigo-400' },
                { label: 'Declined', count: collabs.filter(c => c.status === 'REJECTED').length, color: 'bg-gray-300' },
              ].filter(r => r.count > 0).map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">{row.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className={`${row.color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.round((row.count / collabs.length) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-black text-gray-600 w-6 text-right">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Collaborations ── */}
      <div className="card p-5 card-anim" style={{ animationDelay: '.08s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Applicants & Collaborations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {counts.pending > 0 && <span className="text-amber-600 font-bold">{counts.pending} pending · </span>}
              {counts.invited > 0 && <span className="text-blue-600 font-bold">{counts.invited} invited · </span>}
              {counts.active > 0 && <span className="text-purple-600 font-bold">{counts.active} active · </span>}
              {collabs.length} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/brand/campaigns/${campaignId}/report`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl hover:bg-indigo-100 transition">
              <BarChart2 className="w-3.5 h-3.5" /> Report
            </Link>
            <Link href="/brand/influencers"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl hover:bg-orange-100 transition">
              + Invite
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-gray-100" style={{ scrollbarWidth: 'none' }}>
          {([
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Applied' },
            { key: 'invited', label: 'Invited' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'rejected', label: 'Declined' },
          ] as const).map(t => (
            <button key={t.key} className={`tab-btn flex-shrink-0 ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-orange-200" />
            </div>
            <p className="font-black text-gray-500 mb-1">
              {tab === 'all' ? 'No collaborations yet' : `No ${tab} collaborations`}
            </p>
            <p className="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
              {campaign.status === 'DRAFT'
                ? 'Publish this campaign so influencers can find and apply.'
                : tab === 'all' ? 'Influencers will appear here once they apply or are invited.' : ''}
            </p>
            {campaign.status === 'DRAFT' && (
              <button className="btn-pub" onClick={() => changeStatus('ACTIVE')} disabled={statusLoading}>
                <Eye className="w-4 h-4" /> Publish Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(collab => {
              const inf = collab.influencers
              const cst = COLLAB_CFG[collab.status] ?? COLLAB_CFG.PENDING
              const isPending = collab.status === 'PENDING'
              const isInvited = collab.status === 'INVITED'
              const isBusy = collabLoading === collab.id

              return (
                <div key={collab.id} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-orange-100 hover:bg-orange-50/20 transition">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {inf?.avatar
                      ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                      : <span className="font-black text-orange-500 text-lg">{inf?.name?.[0]?.toUpperCase() ?? '?'}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-black text-gray-900">{inf?.name ?? 'Unknown Influencer'}</p>
                        {inf?.bio && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{inf.bio}</p>}
                        {inf?.niches && inf.niches.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {inf.niches.slice(0, 3).map(n => (
                              <span key={n} className="text-[11px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{n}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`badge ${cst.bg} ${cst.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cst.dot}`} /> {cst.label}
                        </span>

                        {/* Approve / decline for applications */}
                        {(isPending || isInvited) && (
                          <div className="flex items-center gap-1.5">
                            <button className="btn-decline" onClick={() => collabAction(collab.id, 'REJECTED')} disabled={isBusy}>
                              {isBusy ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <X className="w-3.5 h-3.5" />}
                              {isPending ? 'Decline' : 'Cancel'}
                            </button>
                            <button className="btn-approve" onClick={() => collabAction(collab.id, 'ACTIVE')} disabled={isBusy}>
                              {isBusy ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              {isPending ? 'Approve' : 'Confirm'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Deliverable submitted by influencer */}
                    {collab.deliverable_url && (
                      <div className="mt-3 p-3 rounded-xl border-2 border-orange-200 bg-orange-50">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-black text-orange-700">📦 Deliverable submitted</p>
                          {collab.status !== 'COMPLETED' && (
                            <button
                              onClick={() => collabAction(collab.id, 'COMPLETED')}
                              disabled={collabLoading === collab.id}
                              className="text-xs font-black text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg transition disabled:opacity-50">
                              {collabLoading === collab.id ? '…' : '✓ Mark complete & release'}
                            </button>
                          )}
                        </div>
                        <a href={collab.deliverable_url} target="_blank"
                          className="text-xs font-bold text-orange-600 underline hover:text-orange-800 break-all">
                          {collab.deliverable_url}
                        </a>
                        {collab.deliverable_note && (
                          <p className="text-xs text-orange-600 mt-1.5 italic">"{collab.deliverable_note}"</p>
                        )}
                        {collab.status === 'COMPLETED' && (
                          <p className="text-xs font-black text-green-600 mt-1.5">✅ Completed {collab.completed_at ? new Date(collab.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</p>
                        )}
                      </div>
                    )}

                    {/* Message */}
                    {collab.message && collab.message !== 'You have been invited to collaborate on a campaign.' && (
                      <div className="flex items-start gap-2 mt-2 bg-gray-50 rounded-xl p-3">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 italic">"{collab.message}"</p>
                      </div>
                    )}

                    {/* Social / date */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {inf?.platforms && inf.platforms.length > 0 && (
                        <div className="flex items-center gap-2">
                          {inf.platforms.slice(0, 3).map((p: any) => (
                            <div key={p.platform} className="flex items-center gap-1">
                              {PLATFORM_ICON[p.platform?.toLowerCase()] ?? <Star className="w-3.5 h-3.5 text-gray-300" />}
                              {p.followers && <span className="text-xs font-bold text-gray-500">{p.followers}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {collab.status === 'INVITED' ? 'Invited' : 'Applied'} {new Date(collab.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
