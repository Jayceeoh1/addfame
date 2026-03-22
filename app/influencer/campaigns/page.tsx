'use client'
// @ts-nocheck
import { applyToCampaign } from '@/app/actions/collaborations'
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Search, Clock, CheckCircle, AlertCircle, X, ArrowRight,
  Zap, Filter, Globe, SlidersHorizontal, ChevronDown,
  Briefcase, TrendingUp, Users, DollarSign, Calendar,
  Sparkles, Tag, ArchiveX
} from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'

type Campaign = {
  id: string
  title: string
  description: string
  brand_name: string
  budget: number
  budget_per_influencer?: number
  platforms: string[]
  deliverables: string
  deadline: string
  niches: string[]
  countries: string[]
  status: string
  max_influencers?: number
  current_influencers?: number
  // Brief structurat
  product_name?: string
  product_url?: string
  product_description?: string
  key_messages?: string[]
  content_type?: string[]
  min_duration?: number
  product_in_frame?: boolean
  mention_price?: boolean
  discount_code?: string
  content_tone?: string[]
  required_caption?: string
  required_hashtags?: string[]
  link_in_bio?: boolean
  post_time_start?: string
  post_time_end?: string
  min_days_online?: number
  forbidden_mentions?: string[]
  forbidden_content?: string
  proof_requirements?: string[]
}

const fmt = (n: number) => `€${n.toLocaleString('en', { minimumFractionDigits: 0 })}`
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
const isExpired = (c: any) => c.deadline && new Date(c.deadline) < new Date()

const PLATFORM_CFG: Record<string, { icon: React.ReactElement; label: string; bg: string; text: string; border: string }> = {
  instagram: { icon: <InstagramIcon className="w-3.5 h-3.5" />, label: 'Instagram', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  tiktok: { icon: <TikTokSVG className="w-3.5 h-3.5" />, label: 'TikTok', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  youtube: { icon: <YoutubeIcon className="w-3.5 h-3.5" />, label: 'YouTube', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  twitter: { icon: <TwitterXIcon className="w-3.5 h-3.5" />, label: 'X', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-200' },
  x: { icon: <TwitterXIcon className="w-3.5 h-3.5" />, label: 'X', bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-200' },
  linkedin: { icon: <LinkedInIcon className="w-3.5 h-3.5" />, label: 'LinkedIn', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
}

function PlatformBadge({ platform }: { platform: string }) {
  const p = PLATFORM_CFG[platform.toLowerCase()]
  if (!p) return <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200`}>{platform}</span>
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${p.bg} ${p.text} ${p.border}`}>
      {p.icon} {p.label}
    </span>
  )
}

const PLATFORMS = ['All', 'Instagram', 'TikTok', 'YouTube', 'X', 'LinkedIn']
const BUDGET_RANGES = [
  { label: 'Any budget', min: 0, max: Infinity },
  { label: '€0 – €500', min: 0, max: 500 },
  { label: '€500 – €1K', min: 500, max: 1000 },
  { label: '€1K – €5K', min: 1000, max: 5000 },
  { label: '€5K+', min: 5000, max: Infinity },
]
const SORT_OPTIONS = ['Newest', 'Budget: High to Low', 'Budget: Low to High', 'Deadline: Soonest']

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [barterCampaigns, setBarterCampaigns] = useState<any[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [activeTab, setActiveTab] = useState<'paid' | 'barter'>('paid')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [influencerId, setInfluencerId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters — Paid campaigns
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('All')
  const [filterBudget, setFilterBudget] = useState(0)
  const [filterNiche, setFilterNiche] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [sortBy, setSortBy] = useState('Newest')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Filters — Barter campaigns
  const [barterSearch, setBarterSearch] = useState('')
  const [barterFilterPlatform, setBarterFilterPlatform] = useState('All')
  const [barterSortBy, setBarterSortBy] = useState('Newest')

  // Modal
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [applyMsg, setApplyMsg] = useState('')
  const [applyError, setApplyError] = useState<string | null>(null)
  const [justApplied, setJustApplied] = useState<string | null>(null)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const fetchData = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: inf } = await sb.from('influencers').select('id, identity_verified, verification_status').eq('user_id', user.id).single()
      if (inf) {
        setInfluencerId(inf.id)
        setIdentityVerified(!!inf.identity_verified)
      }
      const [{ data: camp }, { data: barter }] = await Promise.all([
        sb.from('campaigns').select('*').eq('status', 'ACTIVE').neq('campaign_type', 'BARTER').order('created_at', { ascending: false }),
        sb.from('campaigns').select('*').eq('status', 'ACTIVE').eq('campaign_type', 'BARTER').order('created_at', { ascending: false }),
      ])
      if (camp) setCampaigns(camp)
      if (barter) setBarterCampaigns(barter)
      if (inf) {
        const { data: colls } = await sb.from('collaborations').select('campaign_id, status').eq('influencer_id', inf.id)
        if (colls) {
          // Only mark as "applied" for PENDING/APPLIED, not INVITED
          setAppliedIds(new Set(colls.filter((c: any) => c.status !== 'INVITED').map((c: any) => c.campaign_id)))
          setInvitedIds(new Set(colls.filter((c: any) => c.status === 'INVITED').map((c: any) => c.campaign_id)))
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleApply() {
    if (!selected || !influencerId) return
    if (!identityVerified) {
      setApplyError('Trebuie să îți verifici identitatea înainte de a aplica. Mergi la Settings → Verificare ID.')
      return
    }
    setApplyError(null)
    setActionLoading(selected.id)
    try {
      const result = await applyToCampaign(selected.id, applyMsg || undefined)
      if (result.error) {
        setApplyError(result.error)
        setActionLoading(null)
        return
      }
      setAppliedIds(prev => new Set([...prev, selected.id]))
      setJustApplied(selected.id)
      notify('🎉 Application submitted! The brand will review your profile.')
      setTimeout(() => { setSelected(null); setApplyMsg(''); setJustApplied(null) }, 2000)
    } catch (e: any) {
      setApplyError(e.message?.includes('duplicate') ? 'You already applied to this campaign.' : 'Failed to apply. Please try again.')
    } finally { setActionLoading(null) }
  }

  // All niches + countries from campaigns
  const allNiches = [...new Set(campaigns.flatMap(c => c.niches ?? []))].sort()
  const allCountries = [...new Set(campaigns.flatMap(c => c.countries ?? []))].sort()

  // Filter + sort
  const budgetRange = BUDGET_RANGES[filterBudget]
  let filtered = campaigns.filter(c => {
    const expired = c.deadline && new Date(c.deadline) < new Date()
    if (showArchived) return !!expired
    if (expired) return false
    const q = search.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q) || c.niches?.some(n => n.toLowerCase().includes(q)) || c.description?.toLowerCase().includes(q)
    const matchPlatform = filterPlatform === 'All' || c.platforms?.some(p => p.toLowerCase() === filterPlatform.toLowerCase())
    const matchBudget = (c.budget ?? 0) >= budgetRange.min && (c.budget ?? 0) <= budgetRange.max
    const matchNiche = !filterNiche || c.niches?.includes(filterNiche)
    const matchCountry = !filterCountry || c.countries?.includes(filterCountry)
    return matchSearch && matchPlatform && matchBudget && matchNiche && matchCountry
  })

  if (sortBy === 'Budget: High to Low') filtered = [...filtered].sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
  if (sortBy === 'Budget: Low to High') filtered = [...filtered].sort((a, b) => (a.budget ?? 0) - (b.budget ?? 0))
  if (sortBy === 'Deadline: Soonest') filtered = [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const activeFilters = [filterPlatform !== 'All', filterBudget !== 0, !!filterNiche, !!filterCountry].filter(Boolean).length

  // Barter filtered + sorted
  let filteredBarter = barterCampaigns.filter(c => {
    const q = barterSearch.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q) || c.offer_name?.toLowerCase().includes(q)
    const matchPlatform = barterFilterPlatform === 'All' || c.platforms?.some((p: string) => p.toLowerCase() === barterFilterPlatform.toLowerCase())
    return matchSearch && matchPlatform
  })
  if (barterSortBy === 'Newest') filteredBarter = [...filteredBarter].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (barterSortBy === 'Value: High to Low') filteredBarter = [...filteredBarter].sort((a, b) => (b.offer_value ?? 0) - (a.offer_value ?? 0))
  if (barterSortBy === 'Slots: Most') filteredBarter = [...filteredBarter].sort((a, b) => ((b.max_influencers ?? 0) - (b.current_influencers ?? 0)) - ((a.max_influencers ?? 0) - (a.current_influencers ?? 0)))

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm text-gray-400 font-semibold">Loading campaigns…</p>
      </div>
    </div>
  )

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
        .card { background: white; border: 1.5px solid #f0f0f0; border-radius: 20px; }
        .camp-card { background: white; border: 1.5px solid #f0f0f0; border-radius: 18px; cursor: pointer; transition: all .2s ease; }
        .camp-card:hover { border-color: #ddd6fe; box-shadow: 0 8px 28px rgba(139,92,246,0.12); transform: translateY(-2px); }
        .camp-card.applied { border-color: #86efac; background: linear-gradient(135deg, #f0fdf4, #ffffff); }
        .camp-card.urgent { border-color: #fcd34d; }
        .search-box { width:100%;padding:11px 16px 11px 44px;border:2px solid #e5e7eb;border-radius:14px;font-size:14px;font-weight:500;outline:none;transition:all .2s;font-family:inherit;background:white; }
        .search-box:focus { border-color:#8b5cf6;box-shadow:0 0 0 4px rgba(139,92,246,0.08); }
        .search-box::placeholder { color:#9ca3af;font-weight:400; }
        .filter-select { padding:8px 32px 8px 12px;border:2px solid #e5e7eb;border-radius:12px;font-size:13px;font-weight:700;outline:none;cursor:pointer;font-family:inherit;color:#374151;background:white;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:14px; }
        .filter-select:focus { border-color:#8b5cf6; }
        .pill-btn { padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #e5e7eb;background:white;transition:all .15s;font-family:inherit;color:#6b7280;white-space:nowrap; }
        .pill-btn.on { background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;border-color:transparent;box-shadow:0 3px 10px rgba(139,92,246,0.3); }
        .pill-btn:not(.on):hover { border-color:#c4b5fd;color:#7c3aed; }
        .btn-apply { width:100%;padding:14px;border-radius:14px;font-size:15px;font-weight:800;color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);transition:all .18s;font-family:inherit; }
        .btn-apply:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 8px 24px rgba(139,92,246,0.4); }
        .btn-apply:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .textarea-msg { width:100%;padding:12px 14px;border:2px solid #e5e7eb;border-radius:14px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s;font-family:inherit;resize:none;color:#111; }
        .textarea-msg:focus { border-color:#8b5cf6;box-shadow:0 0 0 4px rgba(139,92,246,0.08); }
        .textarea-msg::placeholder { color:#9ca3af;font-weight:400; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideDown .3s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .card-in { animation:fadeUp .35s ease both; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-overlay { animation:fadeIn .2s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .modal-panel { animation:slideUp .3s cubic-bezier(.34,1.56,.64,1); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header + Tabs */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900">Campanii disponibile</h1>
        {appliedIds.size > 0 && <p className="text-sm text-green-600 font-bold mt-0.5">{appliedIds.size} aplicate</p>}
      </div>

      {/* Tab selector */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setActiveTab('paid')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition ${activeTab === 'paid'
              ? 'infl-grad text-white shadow-lg'
              : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'
            }`}
        >
          <DollarSign className="w-4 h-4" />
          Campanii Plătite
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${activeTab === 'paid' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {campaigns.filter(c => !(c.deadline && new Date(c.deadline) < new Date())).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('barter')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition ${activeTab === 'barter' ? 'text-white shadow-lg' : 'bg-white border-2 border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600'
            }`}
          style={activeTab === 'barter' ? { background: 'linear-gradient(135deg,#f97316,#ec4899)' } : {}}
        >
          <Sparkles className="w-4 h-4" />
          Free Offer / Barter
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${activeTab === 'barter' ? 'bg-white/20 text-white' : 'bg-orange-50 text-orange-500'}`}>
            {barterCampaigns.length}
          </span>
        </button>
      </div>
      {!identityVerified && (
        <a href="/influencer/verify"
          className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 mb-5 hover:bg-amber-100 transition"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-800">Verifică-ți identitatea pentru a aplica la campanii</p>
            <p className="text-xs text-amber-600">Buletin, pașaport sau permis auto — durează 2 minute</p>
          </div>
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </a>
      )}
      {activeTab === 'paid' && (<>
        <button
          onClick={() => setShowArchived(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition mb-4 ${showArchived
            ? 'bg-gray-200 border-gray-300 text-gray-700'
            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
          <ArchiveX className="w-4 h-4" />
          {showArchived ? 'Înapoi la active' : `Arhivate (${campaigns.filter(c => c.deadline && new Date(c.deadline) < new Date()).length})`}
        </button>

        {/* Filters */}
        <div className="card p-4 mb-5">
          {/* Row 1: search + sort */}
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="search-box" placeholder="Search campaigns, brands, niches…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition ${showAdvanced ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">{activeFilters}</span>}
            </button>
          </div>

          {/* Row 2: platform pills */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {PLATFORMS.map(p => (
              <button key={p} className={`pill-btn flex-shrink-0 ${filterPlatform === p ? 'on' : ''}`} onClick={() => setFilterPlatform(p)}>
                {p}
              </button>
            ))}
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 block">Budget Range</label>
                <select className="filter-select w-full" value={filterBudget} onChange={e => setFilterBudget(+e.target.value)}>
                  {BUDGET_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 block">Niche</label>
                <select className="filter-select w-full" value={filterNiche} onChange={e => setFilterNiche(e.target.value)}>
                  <option value="">All niches</option>
                  {allNiches.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5 block">Country</label>
                <select className="filter-select w-full" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                  <option value="">All countries</option>
                  {allCountries.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setFilterBudget(0); setFilterNiche(''); setFilterCountry(''); setFilterPlatform('All') }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 transition text-left"
                >
                  ✕ Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs font-bold text-gray-400 mb-3 px-1">
          Showing {filtered.length} of {campaigns.length} campaigns
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl infl-grad flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 4px 16px rgba(139,92,246,.25)' }}>
              <Zap className="w-8 h-8 text-white" />
            </div>
            <p className="font-black text-gray-700 text-lg mb-2">No campaigns found</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              {campaigns.length === 0 ? 'No active campaigns yet. Check back soon!' : 'Try adjusting your filters.'}
            </p>
            {activeFilters > 0 && (
              <button onClick={() => { setFilterBudget(0); setFilterNiche(''); setFilterCountry(''); setFilterPlatform('All'); setSearch('') }} className="mt-4 text-sm font-bold text-purple-600 hover:text-purple-800 transition">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c, i) => {
              const applied = appliedIds.has(c.id)
              const days = daysLeft(c.deadline)
              const expired = days < 0
              const urgent = days >= 0 && days <= 3

              return (
                <div
                  key={c.id}
                  className={`camp-card card-in p-5 ${applied ? 'applied' : ''} ${urgent && !applied ? 'urgent' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 9) * 0.04}s` }}
                  onClick={() => { setSelected(c); setApplyMsg(''); setApplyError(null) }}
                >
                  {/* Top: brand + budget */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      {applied && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-1.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Applied
                        </span>
                      )}
                      {urgent && !applied && !expired && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-1.5">
                          🔥 Urgent
                        </span>
                      )}
                      <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2">{c.title}</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">{c.brand_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black text-green-600">{fmt(c.budget ?? 0)}</p>
                      <p className="text-[10px] text-gray-400 font-medium">total budget</p>
                    </div>
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{c.description}</p>
                  )}

                  {/* Platforms */}
                  {c.platforms?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {c.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                    </div>
                  )}

                  {/* Niches */}
                  {c.niches?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {c.niches.slice(0, 3).map(n => (
                        <span key={n} className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{n}</span>
                      ))}
                      {c.niches.length > 3 && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">+{c.niches.length - 3}</span>}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Clock className={`w-3 h-3 ${expired ? 'text-red-400' : urgent ? 'text-orange-400' : 'text-gray-300'}`} />
                        <span className={`text-[10px] font-bold ${expired ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-400'}`}>
                          {expired ? 'Expired' : days === 0 ? 'Last day!' : days === 1 ? '1 day left' : `${days}d left`}
                        </span>
                      </div>
                      {c.countries?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-300" />
                          <span className="text-[10px] text-gray-400 font-medium">{c.countries.slice(0, 2).join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-black text-purple-600 flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </>)} {/* end activeTab === 'paid' */}

      {/* Tab: Campanii Barter */}
      {activeTab === 'barter' && (
        <div>
          {/* Barter Filters */}
          <div className="card p-4 mb-5">
            <div className="flex gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="search-box"
                  placeholder="Caută oferte, branduri..."
                  value={barterSearch}
                  onChange={e => setBarterSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={barterSortBy}
                onChange={e => setBarterSortBy(e.target.value)}
              >
                {['Newest', 'Value: High to Low', 'Slots: Most'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            {/* Platform pills */}
            <div className="flex gap-2 flex-wrap">
              {['All', 'Instagram', 'TikTok', 'YouTube', 'Facebook'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setBarterFilterPlatform(p)}
                  className={`pill-btn ${barterFilterPlatform === p ? 'on' : ''}`}
                  style={barterFilterPlatform === p ? { background: 'linear-gradient(135deg,#f97316,#ec4899)', borderColor: 'transparent' } : {}}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-400 mb-4">
            <span className="font-bold text-gray-600">{filteredBarter.length}</span> oferte disponibile
            {barterSearch || barterFilterPlatform !== 'All' ? ' (filtrate)' : ' în zona ta'}
          </p>

          {filteredBarter.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 16px rgba(249,115,22,.25)' }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="font-black text-gray-700 text-lg mb-2">
                {barterCampaigns.length === 0 ? 'Nicio campanie barter disponibilă' : 'Niciun rezultat găsit'}
              </p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                {barterCampaigns.length === 0
                  ? 'Setează-ți orașul în Settings pentru a vedea ofertele din zona ta.'
                  : 'Încearcă să schimbi filtrele.'}
              </p>
              {(barterSearch || barterFilterPlatform !== 'All') && (
                <button
                  onClick={() => { setBarterSearch(''); setBarterFilterPlatform('All') }}
                  className="mt-4 text-sm font-bold text-orange-500 hover:text-orange-700 transition"
                >
                  Resetează filtrele
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBarter.map((c, i) => {
                const days = daysLeft(c.deadline)
                const urgent = days >= 0 && days <= 3
                const slotsLeft = (c.max_influencers ?? 0) - (c.current_influencers ?? 0)
                const pct = Math.round(((c.current_influencers || 0) / (c.max_influencers || 1)) * 100)
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="card-in cursor-pointer transition"
                    style={{
                      animationDelay: `${Math.min(i, 9) * 0.04}s`,
                      background: 'white',
                      border: urgent ? '1.5px solid #fcd34d' : '1.5px solid #f0f0f0',
                      borderRadius: '18px',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(249,115,22,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = '' }}
                  >
                    {/* Gradient top bar */}
                    <div className="h-1.5" style={{ background: 'linear-gradient(90deg,#f97316,#ec4899)' }} />
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                              🎁 Free Offer
                            </span>
                            {urgent && (
                              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                ⚡ {days}d left
                              </span>
                            )}
                            {slotsLeft <= 2 && slotsLeft > 0 && (
                              <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                🔥 {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
                              </span>
                            )}
                          </div>
                          <h3 className="font-black text-gray-900 text-sm leading-tight line-clamp-2">
                            {c.offer_name || c.title?.replace('[Barter] ', '').split(' —')[0]}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1 font-semibold">{c.brand_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-black text-orange-500 text-lg leading-tight">
                            {c.offer_value ? `${c.offer_value} RON` : 'Gratuit'}
                          </p>
                          <p className="text-[10px] text-gray-400">valoare ofertă</p>
                        </div>
                      </div>

                      {/* Description */}
                      {c.offer_description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.offer_description}</p>
                      )}

                      {/* Platforms */}
                      {(c.platforms || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {c.platforms.map((p: string) => <PlatformBadge key={p} platform={p} />)}
                        </div>
                      )}

                      {/* Delivery + Deadline */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="text-gray-500 font-semibold">
                          {c.delivery_method === 'pickup'
                            ? `📍 ${c.pickup_location_name || 'Ridicare din locație'}`
                            : '🚚 Livrare la domiciliu'}
                        </span>
                        {c.deadline && (
                          <span className={`font-bold ${urgent ? 'text-amber-600' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {days > 0 ? `${days}d` : 'Azi'}
                          </span>
                        )}
                      </div>

                      {/* Slots progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1.5 font-semibold">
                          <span>{c.current_influencers || 0}/{c.max_influencers} slots ocupate</span>
                          <span className={slotsLeft <= 2 ? 'text-red-500 font-black' : ''}>{slotsLeft} rămase</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct > 80 ? '#ef4444' : 'linear-gradient(90deg,#f97316,#ec4899)'
                            }} />
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        className="w-full py-3 rounded-xl text-sm font-black text-white transition"
                        style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 12px rgba(249,115,22,0.25)' }}
                      >
                        Vezi oferta →
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div
          className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="modal-panel bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between z-10 rounded-t-3xl">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  {appliedIds.has(selected.id) && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-2.5 h-2.5" /> Applied
                    </span>
                  )}
                  {daysLeft(selected.deadline) <= 3 && daysLeft(selected.deadline) >= 0 && !appliedIds.has(selected.id) && (
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">🔥 Urgent</span>
                  )}
                </div>
                <h2 className="font-black text-gray-900 text-lg leading-tight">
                  {selected.campaign_type === 'BARTER'
                    ? (selected.offer_name || selected.title?.replace('[Barter] ', '').split(' —')[0])
                    : selected.title}
                </h2>
                <p className="text-sm text-gray-500 font-semibold mt-0.5">{selected.brand_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0 mt-1">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Key stats — barter vs paid */}
              {selected.campaign_type === 'BARTER' ? (
                <>
                  {/* Barter: imagine produs */}
                  {selected.offer_image_url && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ maxHeight: '200px' }}>
                      <img src={selected.offer_image_url} alt={selected.offer_name} className="w-full h-full object-cover" style={{ maxHeight: '200px' }} />
                    </div>
                  )}

                  {/* Barter stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl p-3.5 text-center border" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', borderColor: '#fed7aa' }}>
                      <span className="text-xl mb-1 block">🎁</span>
                      <p className="text-lg font-black text-orange-600">
                        {selected.offer_value ? `${selected.offer_value} RON` : 'Gratuit'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">Valoare ofertă</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-center">
                      <Calendar className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-base font-black text-gray-900">{selected.deadline ? fmtDateShort(selected.deadline) : '—'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {selected.deadline && daysLeft(selected.deadline) >= 0 ? `${daysLeft(selected.deadline)}d left` : 'Expirat'}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                      <Users className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-base font-black text-gray-900">{(selected.current_influencers || 0)}/{selected.max_influencers}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Slots</p>
                    </div>
                  </div>

                  {/* Barter: detalii ofertă */}
                  <div className="rounded-2xl p-4 space-y-3 border" style={{ background: 'linear-gradient(135deg,#fff7ed,#fff)', borderColor: '#fed7aa' }}>
                    <p className="text-xs font-black text-orange-700 uppercase tracking-wider">🎁 Oferta brandului</p>
                    {selected.offer_description && (
                      <p className="text-sm text-gray-600 leading-relaxed">{selected.offer_description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white rounded-xl p-2.5 border border-orange-100">
                        <p className="text-gray-400 mb-0.5">Tip ofertă</p>
                        <p className="font-black text-gray-800">{selected.offer_type === 'product' ? '📦 Produs' : '🛠️ Serviciu'}</p>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-orange-100">
                        <p className="text-gray-400 mb-0.5">Ridicare</p>
                        <p className="font-black text-gray-800">
                          {selected.delivery_method === 'pickup' ? '📍 Din locație' : '🚚 Livrare'}
                        </p>
                      </div>
                      {selected.delivery_method === 'pickup' && selected.pickup_location_name && (
                        <div className="bg-white rounded-xl p-2.5 border border-orange-100 col-span-2">
                          <p className="text-gray-400 mb-0.5">Locație pickup</p>
                          <p className="font-black text-gray-800">📍 {selected.pickup_location_name}</p>
                          {selected.pickup_location_address && (
                            <p className="text-gray-500 text-[11px] mt-0.5">{selected.pickup_location_address}</p>
                          )}
                        </div>
                      )}
                      {selected.reservation_required && (
                        <div className="bg-amber-50 rounded-xl p-2.5 border border-amber-100 col-span-2">
                          <p className="font-semibold text-amber-700">📅 Rezervare necesară înainte de vizită</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barter: ce trebuie să postezi */}
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-wider">📱 Ce trebuie să postezi</p>
                    <p className="text-sm text-gray-700">{selected.deliverables || '—'}</p>
                    {selected.story_instructions && (
                      <div className="bg-white rounded-xl p-3 border border-purple-100 mt-2">
                        <p className="text-xs font-black text-gray-500 mb-1">Instrucțiuni</p>
                        <p className="text-sm text-gray-600">{selected.story_instructions}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Paid stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 text-center">
                      <DollarSign className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-lg font-black text-green-600">{fmt(selected.budget ?? 0)}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Budget</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-center">
                      <Calendar className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                      <p className="text-base font-black text-gray-900">{fmtDateShort(selected.deadline)}</p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {daysLeft(selected.deadline) < 0 ? 'Expired' : `${daysLeft(selected.deadline)}d left`}
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                      <Globe className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-base font-black text-gray-900">{selected.countries?.length || 'All'}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Countries</p>
                    </div>
                  </div>
                </>
              )}

              {/* Secțiuni doar pentru campanii PLĂTITE */}
              {selected.campaign_type !== 'BARTER' && (<>

                {/* Description */}
                {selected.description && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Despre campanie</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
                  </div>
                )}

                {/* Câștig potențial */}
                {selected.budget_per_influencer && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
                    <p className="text-xs font-black text-green-700 uppercase tracking-wider mb-2">💰 Câștigul tău</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-black text-green-600">€{(selected.budget_per_influencer * 0.85).toFixed(0)}</p>
                        <p className="text-xs text-green-600/70">din €{selected.budget_per_influencer} (după comision 15%)</p>
                      </div>
                      {selected.max_influencers && (
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-700">{(selected.current_influencers || 0)}/{selected.max_influencers}</p>
                          <p className="text-xs text-gray-400">locuri ocupate</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BRIEF STRUCTURAT */}
                {/* 1. Produs */}
                {(selected.product_name || selected.product_description) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-black text-blue-700 uppercase tracking-wider">📦 Produs de promovat</p>
                    {selected.product_name && <p className="font-bold text-sm text-gray-900">{selected.product_name}</p>}
                    {selected.product_url && (
                      <a href={selected.product_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline break-all">{selected.product_url}</a>
                    )}
                    {selected.product_description && <p className="text-sm text-gray-600 leading-relaxed">{selected.product_description}</p>}
                  </div>
                )}

                {/* 2. Puncte cheie obligatorii */}
                {selected.key_messages && selected.key_messages.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">⭐ Ce trebuie să menționezi obligatoriu</p>
                    <ul className="space-y-1.5">
                      {selected.key_messages.map((msg, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Cerințe conținut */}
                {(selected.content_type?.length || selected.min_duration || selected.content_tone?.length) && (
                  <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-black text-purple-700 uppercase tracking-wider">🎬 Ce trebuie să creezi</p>
                    {selected.content_type && selected.content_type.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.content_type.map(t => (
                          <span key={t} className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full capitalize">{t}</span>
                        ))}
                      </div>
                    )}
                    {selected.min_duration && (
                      <p className="text-sm text-gray-700">⏱️ Durată minimă: <strong>{selected.min_duration} secunde</strong></p>
                    )}
                    {selected.content_tone && selected.content_tone.length > 0 && (
                      <p className="text-sm text-gray-700">🎭 Ton: <strong>{selected.content_tone.join(', ')}</strong></p>
                    )}
                    <div className="space-y-1">
                      {selected.product_in_frame && <p className="text-sm text-gray-700">✅ Produsul trebuie să apară vizibil în cadru</p>}
                      {selected.mention_price && <p className="text-sm text-gray-700">✅ Menționează prețul</p>}
                      {selected.link_in_bio && <p className="text-sm text-gray-700">✅ Link în bio / swipe up obligatoriu</p>}
                      {selected.discount_code && <p className="text-sm text-gray-700">🏷️ Cod discount de menționat: <strong className="text-orange-600">{selected.discount_code}</strong></p>}
                    </div>
                  </div>
                )}

                {/* 4. Cerințe postare */}
                {(selected.required_caption || selected.required_hashtags?.length || selected.post_time_start || selected.min_days_online) && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-wider">📱 Cerințe postare</p>
                    {selected.required_caption && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-1">Caption obligatoriu:</p>
                        <p className="text-sm text-gray-700 bg-white rounded-xl p-3 border border-amber-100 italic">{selected.required_caption}</p>
                      </div>
                    )}
                    {selected.required_hashtags && selected.required_hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.required_hashtags.map(h => (
                          <span key={h} className="text-xs font-bold text-blue-600">#{h}</span>
                        ))}
                      </div>
                    )}
                    {selected.post_time_start && selected.post_time_end && (
                      <p className="text-sm text-gray-700">🕐 Postează între <strong>{selected.post_time_start}</strong> și <strong>{selected.post_time_end}</strong></p>
                    )}
                    {selected.min_days_online && (
                      <p className="text-sm text-gray-700">📅 Postarea rămâne online minim <strong>{selected.min_days_online} zile</strong></p>
                    )}
                  </div>
                )}

                {/* 5. Interdicții */}
                {(selected.forbidden_mentions?.length || selected.forbidden_content) && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-black text-red-700 uppercase tracking-wider">🚫 Ce NU este permis</p>
                    {selected.forbidden_mentions && selected.forbidden_mentions.length > 0 && (
                      <p className="text-sm text-gray-700">Nu menționa: <strong>{selected.forbidden_mentions.join(', ')}</strong></p>
                    )}
                    {selected.forbidden_content && (
                      <p className="text-sm text-gray-700">{selected.forbidden_content}</p>
                    )}
                  </div>
                )}

                {/* 6. Dovadă livrare */}
                {selected.proof_requirements && selected.proof_requirements.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">📋 Ce trimiți ca dovadă</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.proof_requirements.map(p => (
                        <span key={p} className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                          {p === 'screenshot_post' ? '📸 Screenshot post' :
                            p === 'link_post' ? '🔗 Link postare' :
                              p === 'screenshot_insights' ? '📊 Screenshot insights' :
                                p === 'video_proof' ? '🎬 Video dovadă' : p}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">⚠️ Plata se eliberează după ce brandul verifică și aprobă dovezile.</p>
                  </div>
                )}

              </>)} {/* end paid-only sections */}

              {/* Platforms */}
              {selected.platforms?.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                  </div>
                </div>
              )}

              {/* Niches + Countries */}
              <div className="grid grid-cols-2 gap-4">
                {selected.niches?.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Target Niches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.niches.map(n => (
                        <span key={n} className="text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full">{n}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.countries?.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Target Countries</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.countries.map(c => (
                        <span key={c} className="inline-flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          <Globe className="w-3 h-3" />{c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Apply section */}
              {invitedIds.has(selected.id) ? (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">📩</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-blue-700">Ești invitat la această campanie!</p>
                    <p className="text-xs text-gray-500 mt-0.5">Mergi la <strong>Colaborări</strong> pentru a accepta sau refuza invitația.</p>
                  </div>
                  <a href="/influencer/collaborations" className="bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-blue-600 transition">
                    Vezi invitația →
                  </a>
                </div>
              ) : appliedIds.has(selected.id) || justApplied === selected.id ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="font-black text-green-700">Aplicație trimisă! 🎉</p>
                    <p className="text-xs text-gray-500 mt-0.5">Brandul îți va analiza profilul și îți va răspunde în curând.</p>
                  </div>
                </div>
              ) : daysLeft(selected.deadline) < 0 ? (
                <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center">
                  <p className="text-sm font-bold text-gray-500">This campaign has expired</p>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                      Message to brand <span className="text-gray-400 font-normal normal-case">(optional but recommended)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={applyMsg}
                      onChange={e => setApplyMsg(e.target.value)}
                      maxLength={500}
                      placeholder="Introduce yourself and explain why you're the perfect fit. Mention your niche, audience, and past collaborations…"
                      className="textarea-msg"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{applyMsg.length}/500</p>
                  </div>

                  {applyError && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{applyError}
                    </div>
                  )}

                  <button
                    className="btn-apply"
                    style={{ boxShadow: '0 6px 20px rgba(139,92,246,.35)' }}
                    onClick={handleApply}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Submitting…</>
                      : <>Submit Application <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
