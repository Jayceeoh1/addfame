'use client'
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateCampaignStatus } from '@/app/actions/campaigns'
import { VerificationBanner } from '@/components/shared/verification-banner'
import {
  Plus, Search, Briefcase, Clock, Users, TrendingUp,
  CheckCircle, AlertCircle, Eye, EyeOff, Globe,
  ChevronRight, Zap, MoreHorizontal, Play, Pause, Archive, ArrowRight, X
} from 'lucide-react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  description: string
  brand_name: string
  budget: number
  platforms: string[]
  deliverables: string
  deadline: string
  niches: string[]
  countries: string[]
  status: string
  invited_influencers: string[]
  accepted_influencers: string[]
  created_at: string
}

const fmt = (n: number) => `€${n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PAUSED: { label: 'Paused', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  COMPLETED: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
}

const TABS = ['All', 'Active', 'Draft', 'Paused', 'Completed'] as const
type Tab = typeof TABS[number]

const TAB_FILTER: Record<Tab, string[]> = {
  'All': ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'],
  'Active': ['ACTIVE'],
  'Draft': ['DRAFT'],
  'Paused': ['PAUSED'],
  'Completed': ['COMPLETED'],
}

export default function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const router = useRouter()
  const [collabCounts, setCollabCounts] = useState<Record<string, number>>({})
  const [brandVerification, setBrandVerification] = useState<{ status: string; reason?: string | null }>({ status: 'unverified' })

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCampaigns = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: brand } = await supabase.from('brands').select('id, verification_status, verification_rejection_reason').eq('user_id', user.id).single()
      if (brand) setBrandVerification({ status: brand.verification_status || 'unverified', reason: brand.verification_rejection_reason })
      if (!brand) return

      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false })

      if (data) setCampaigns(data)

      // Fetch collaboration counts per campaign
      const { data: collabs } = await supabase
        .from('collaborations')
        .select('campaign_id, status')
        .eq('brand_id', brand.id)

      if (collabs) {
        const counts: Record<string, number> = {}
        collabs.forEach(c => { counts[c.campaign_id] = (counts[c.campaign_id] || 0) + 1 })
        setCollabCounts(counts)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCampaigns()
    const handleClick = () => setOpenMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [fetchCampaigns])

  async function handleStatusChange(campaignId: string, newStatus: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
    if (newStatus === 'ACTIVE' && brandVerification.status !== 'verified') {
      showToast('⚠️ Verify your brand before publishing campaigns.', 'error')
      return
    }
    setActionLoading(campaignId)
    setOpenMenu(null)
    try {
      const result = await updateCampaignStatus(campaignId, newStatus)
      if (!result.success) throw new Error(result.error)
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c))
      const msgs: Record<string, string> = {
        ACTIVE: '🚀 Campaign is now live — influencers can see and apply!',
        DRAFT: 'Campaign moved back to draft.',
        PAUSED: 'Campaign paused.',
        COMPLETED: 'Campaign marked as completed.',
      }
      showToast(msgs[newStatus] || 'Status updated.', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchTab = TAB_FILTER[activeTab].includes(c.status)
    const q = search.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const counts: Record<Tab, number> = {
    'All': campaigns.length,
    'Active': campaigns.filter(c => c.status === 'ACTIVE').length,
    'Draft': campaigns.filter(c => c.status === 'DRAFT').length,
    'Paused': campaigns.filter(c => c.status === 'PAUSED').length,
    'Completed': campaigns.filter(c => c.status === 'COMPLETED').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-500 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .card { background: white; border: 1.5px solid #f0f0f0; border-radius: 20px; }
        .campaign-card { background: white; border: 1.5px solid #f0f0f0; border-radius: 20px; transition: all .2s ease; }
        .campaign-card:hover { border-color: #fed7aa; box-shadow: 0 10px 28px rgba(249,115,22,0.08); }
        .tab-btn { padding:7px 16px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .18s;white-space:nowrap;font-family:inherit; }
        .tab-btn.active { background:linear-gradient(135deg,#f97316,#ec4899);color:white;box-shadow:0 4px 12px rgba(249,115,22,0.3); }
        .tab-btn:not(.active) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.active):hover { background:#fff7ed;color:#f97316; }
        .search-box { width:100%;padding:10px 16px 10px 42px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:all .2s;font-family:inherit;background:white; }
        .search-box:focus { border-color:#f97316;box-shadow:0 0 0 4px rgba(249,115,22,0.08); }
        .search-box::placeholder { color:#9ca3af;font-weight:400; }
        .btn-publish { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:11px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#f97316,#ec4899);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-publish:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 5px 16px rgba(249,115,22,0.38); }
        .btn-publish:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .btn-unpublish { display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:11px;font-size:13px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-unpublish:hover:not(:disabled) { border-color:#d1d5db;color:#374151;background:#f9fafb; }
        .btn-unpublish:disabled { opacity:.6;cursor:not-allowed; }
        .menu-btn { display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:#f3f4f6;border:none;cursor:pointer;transition:background .15s;flex-shrink:0; }
        .menu-btn:hover { background:#e5e7eb; }
        .dropdown { position:absolute;right:0;top:calc(100% + 6px);background:white;border:1.5px solid #f0f0f0;border-radius:14px;padding:6px;z-index:50;min-width:180px;box-shadow:0 8px 32px rgba(0,0,0,0.12); }
        .dropdown-item { display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;transition:background .12s;font-family:inherit;color:#374151; }
        .dropdown-item:hover { background:#f9fafb; }
        .dropdown-item.danger { color:#ef4444; }
        .dropdown-item.danger:hover { background:#fef2f2; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation: slideDown .3s ease; }
        .dropdown-anim { animation: slideDown .2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .card-enter { animation: fadeUp .35s ease both; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.type === 'success' ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {campaigns.length} total · <span className="text-green-600 font-bold">{counts.Active} active</span>
            {counts.Draft > 0 && <> · <span className="text-amber-600 font-bold">{counts.Draft} draft</span></>}
          </p>
        </div>
        <button
          onClick={() => setShowSheet(true)}
          className="inline-flex items-center gap-2 brand-grad text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:-translate-y-0.5 transition flex-shrink-0"
          style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Verification banner */}
      {brandVerification.status !== 'verified' && (
        <div className="mb-4">
          <VerificationBanner status={brandVerification.status as any} rejectionReason={brandVerification.reason} compact />
        </div>
      )}

      {/* Draft notice */}
      {counts.Draft > 0 && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">
              {counts.Draft} campaign{counts.Draft > 1 ? 's are' : ' is'} in draft
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Draft campaigns are <strong>not visible</strong> to influencers. Click <strong>Publish</strong> on a campaign to make it live.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="search-box" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab}
              {counts[tab] > 0 && (
                <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>
                  {counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl brand-grad flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.25)' }}>
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <p className="font-black text-gray-700 text-lg mb-2">No campaigns yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            {campaigns.length === 0
              ? 'Create your first campaign to start finding the right influencers.'
              : `No ${activeTab.toLowerCase()} campaigns found.`}
          </p>
          {campaigns.length === 0 && (
            <button
              onClick={() => setShowSheet(true)}
              className="inline-flex items-center gap-2 brand-grad text-white font-bold text-sm px-6 py-3 rounded-xl"
              style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
              <Plus className="w-4 h-4" /> Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c, i) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT
            const days = daysLeft(c.deadline)
            const expired = days < 0
            const urgent = days >= 0 && days <= 3
            const isLoading = actionLoading === c.id
            const collabs = collabCounts[c.id] || 0

            return (
              <div key={c.id} className="campaign-card card-enter p-5" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Briefcase className="w-5 h-5 text-orange-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link href={`/brand/campaigns/${c.id}`} className="font-black text-gray-900 text-base hover:text-orange-600 transition truncate">
                            {c.title}
                          </Link>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-sm text-gray-500 leading-relaxed line-clamp-1">{c.description}</p>
                        )}
                      </div>

                      {/* Menu */}
                      <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button className="menu-btn" onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}>
                          <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                        {openMenu === c.id && (
                          <div className="dropdown dropdown-anim">
                            {c.status === 'DRAFT' && (
                              <button className="dropdown-item" onClick={() => handleStatusChange(c.id, 'ACTIVE')}>
                                <Play className="w-4 h-4 text-green-500" /> Publish campaign
                              </button>
                            )}
                            {c.status === 'ACTIVE' && (
                              <button className="dropdown-item" onClick={() => handleStatusChange(c.id, 'PAUSED')}>
                                <Pause className="w-4 h-4 text-gray-500" /> Pause campaign
                              </button>
                            )}
                            {c.status === 'PAUSED' && (
                              <button className="dropdown-item" onClick={() => handleStatusChange(c.id, 'ACTIVE')}>
                                <Play className="w-4 h-4 text-green-500" /> Resume campaign
                              </button>
                            )}
                            {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                              <button className="dropdown-item" onClick={() => handleStatusChange(c.id, 'DRAFT')}>
                                <EyeOff className="w-4 h-4 text-amber-500" /> Move to draft
                              </button>
                            )}
                            {c.status !== 'COMPLETED' && (
                              <button className="dropdown-item danger" onClick={() => handleStatusChange(c.id, 'COMPLETED')}>
                                <Archive className="w-4 h-4" /> Mark completed
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-black text-gray-900">{fmt(c.budget)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        {collabs} applicant{collabs !== 1 ? 's' : ''}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${expired ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {expired ? 'Expired' : days === 0 ? 'Last day' : `${days}d left`}
                        {urgent && !expired && <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">URGENT</span>}
                      </div>
                      {c.platforms?.length > 0 && (
                        <div className="flex gap-1">
                          {c.platforms.slice(0, 3).map(p => (
                            <span key={p} className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                              {p.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="ml-auto flex items-center gap-2">
                        <Link href={`/brand/campaigns/${c.id}`}
                          className="text-xs font-bold text-orange-600 hover:text-orange-800 transition flex items-center gap-1">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        {c.status === 'DRAFT' && (
                          <button
                            className="btn-publish"
                            onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                            disabled={isLoading}
                            style={{ boxShadow: '0 3px 10px rgba(249,115,22,0.3)' }}
                          >
                            {isLoading
                              ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <Eye className="w-3.5 h-3.5" />
                            }
                            Publish
                          </button>
                        )}
                        {c.status === 'ACTIVE' && (
                          <button
                            className="btn-unpublish"
                            onClick={() => handleStatusChange(c.id, 'PAUSED')}
                            disabled={isLoading}
                          >
                            {isLoading
                              ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                              : <Pause className="w-3.5 h-3.5" />
                            }
                            Pause
                          </button>
                        )}
                        {c.status === 'PAUSED' && (
                          <button
                            className="btn-publish"
                            onClick={() => handleStatusChange(c.id, 'ACTIVE')}
                            disabled={isLoading}
                          >
                            {isLoading
                              ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <Play className="w-3.5 h-3.5" />
                            }
                            Resume
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Campaign type bottom sheet ─────────────────────────────────────── */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl border-t border-gray-100 px-4 pt-4 pb-12 animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Alege tipul campaniei</p>
              <button onClick={() => setShowSheet(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>

            {/* Free Offer / Barter */}
            <button
              onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/barter') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition mb-3 text-left group"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 text-3xl group-hover:scale-105 transition">
                🎁
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-900 text-base">Free Offer / Barter</p>
                <p className="text-sm text-gray-500 mt-0.5">Produs sau serviciu gratuit în schimbul postărilor</p>
                <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Fără cost monetar</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>

            {/* Managed — noi ne ocupăm de tot */}
            <button
              onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/managed') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition text-left group"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl group-hover:scale-105 transition"
                style={{ background: 'linear-gradient(135deg,#f3e8ff,#e0f2fe)' }}>
                ✨
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-black text-gray-900 text-base">Campanie Managed</p>
                  <span className="text-[9px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-full">NOU</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Noi selectăm influencerii și gestionăm campania</p>
                <span className="inline-block mt-1.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Full service · 25% comision</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
