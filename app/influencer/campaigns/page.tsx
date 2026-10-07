'use client'
// @ts-nocheck
import { applyToCampaign } from '@/app/actions/collaborations'
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { eligibility } from '@/lib/eligibility'
import {
  Search, Clock, CheckCircle, AlertCircle, X, ArrowRight,
  Zap, Filter, Globe, SlidersHorizontal, ChevronDown,
  Briefcase, TrendingUp, Users, DollarSign, Calendar,
  Sparkles, Tag, ArchiveX, Ban
} from 'lucide-react'
import { CampaignHero, CampaignStats, CampaignSections, CAMPAIGN_CSS } from './campaign-sections'
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
  promotion_link?: string
  promotion_link_placement?: string[]
  offer_image_url?: string
  offer_image_urls?: string[]
  offer_images?: string[]
  // Barter
  campaign_type?: string
  offer_name?: string
  offer_value?: number
  offer_description?: string
  offer_type?: string
  brief_pdf_url?: string
  delivery_method?: string
  pickup_location_name?: string
  pickup_location_address?: string
  registration_opened_at?: string
  registration_deadline_days?: number
  registrations_open?: boolean
  reservation_required?: boolean
  story_instructions?: string
  tasks_stories_count?: number
  tasks_ig_days_online?: number
  tasks_ig_reel?: boolean
  tasks_ig_reel_duration?: number
  tasks_ig_post?: boolean
  tasks_include_post?: boolean
  tasks_ig_live?: boolean
  tasks_tt_video?: boolean
  tasks_tt_video_duration?: number
  tasks_tt_days_online?: number
  tasks_tt_live?: boolean
  tasks_tt_duet?: boolean
  tasks_yt_short?: boolean
  tasks_yt_short_duration?: number
  tasks_yt_video?: boolean
  tasks_yt_video_duration?: number
  tasks_yt_mention?: boolean
  tasks_fb_post?: boolean
  tasks_fb_story?: boolean
  tasks_fb_reel?: boolean
  tasks_fb_share?: boolean
}

const fmt = (n: number) => `${n.toLocaleString('en', { minimumFractionDigits: 0 })}`
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

const PLATFORMS = ['Toate', 'Instagram', 'TikTok', 'YouTube', 'X', 'LinkedIn']
const BUDGET_RANGES = [
  { label: 'Orice buget', min: 0, max: Infinity },
  { label: '0 RON – 500 RON', min: 0, max: 500 },
  { label: '500 RON – 1 RONK', min: 500, max: 1000 },
  { label: '1 RONK – 5 RONK', min: 1000, max: 5000 },
  { label: '5 RONK+', min: 5000, max: Infinity },
]
const SORT_OPTIONS = ['Cele mai noi', 'Buget: Mare → Mic', 'Buget: Mic → Mare', 'Deadline: Cel mai aproape']

function CampaignImageSlider({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const total = images.length
  const goPrev = () => setIdx(prev => (prev === 0 ? total - 1 : prev - 1))
  const goNext = () => setIdx(prev => (prev === total - 1 ? 0 : prev + 1))

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const diff = touchStart - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev()
    setTouchStart(null)
  }

  if (total === 0) return null

  return (
    <>
    {/* Lightbox fullscreen */}
    {lightbox && (
      <div
        onClick={() => setLightbox(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, cursor: 'zoom-out',
        }}
      >
        <img
          src={images[idx]}
          alt={alt}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain', cursor: 'default' }}
        />
        <button
          onClick={() => setLightbox(false)}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 22, width: 40, height: 40,
            borderRadius: '50%', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
        {total > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); goPrev() }}
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); goNext() }}
              style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer' }}>›</button>
          </>
        )}
      </div>
    )}
    <div className="space-y-2">
      <div
        className="relative overflow-hidden"
        style={{ cursor: 'zoom-in', borderRadius: 14, background: '#f6f6fc' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setLightbox(true)}
      >
        <img src={images[idx]} alt={alt} className="w-full h-auto" style={{ display: 'block', objectFit: 'contain' }} />
        {/* Hint zoom */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '3px 8px',
          borderRadius: 20, backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
        }}>Apasă pentru full screen</div>

        {total > 1 && (
          <>
            {/* Counter */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              {idx + 1} / {total}
            </div>

            {/* Săgeți */}
            <button
              onClick={goPrev}
              className="absolute top-1/2 left-2 -translate-y-1/2 w-9 h-9 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition"
              aria-label="Imaginea anterioară"
            >
              <span className="text-gray-900 text-lg">‹</span>
            </button>
            <button
              onClick={goNext}
              className="absolute top-1/2 right-2 -translate-y-1/2 w-9 h-9 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md transition"
              aria-label="Imaginea următoare"
            >
              <span className="text-gray-900 text-lg">›</span>
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1.5 bg-black/30 backdrop-blur-sm rounded-full">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`rounded-full transition-all ${i === idx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                  aria-label={`Sari la imaginea ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails — apare doar dacă sunt 2+ imagini */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${i === idx ? 'opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
              style={i === idx ? { borderColor: '#7040f0' } : undefined}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  )
}

// ── Campaign Score Timer — afișat când influencerul e deja ACTIVE în campanie ─
function CampaignScoreTimer({ acceptedAt }: { acceptedAt?: string }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!acceptedAt) return null
  const ms = now.getTime() - new Date(acceptedAt).getTime()
  const h = ms / 3_600_000
  const bonus = h < 24 ? 75 : h < 48 ? 40 : 0
  const total = 150 + bonus
  const deadline = new Date(new Date(acceptedAt).getTime() + (h < 24 ? 24 : 48) * 3_600_000)
  const left = Math.max(0, deadline.getTime() - now.getTime())
  const hh = Math.floor(left / 3_600_000)
  const mm = Math.floor((left % 3_600_000) / 60_000)
  const ss = Math.floor((left % 60_000) / 1000)
  const timer = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
  const color = h < 24 ? '#14532d' : h < 48 ? '#854d0e' : '#5b2fd0'
  const bg = h < 24 ? '#dcf5ec' : h < 48 ? '#fff1c2' : '#efeaff'
  const border = h < 24 ? '#a7e3cb' : h < 48 ? '#f3dc8a' : '#ddd2ff'
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 900, color, margin: 0 }}>
          {h < 24 ? 'Bonus maxim disponibil' : h < 48 ? 'Grăbește-te pentru bonus' : 'Postează și câștigă puncte'}
        </p>
        <span style={{ fontSize: 16, fontWeight: 900, color, flexShrink: 0 }}>+{total} pts</span>
      </div>
      {h < 48 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: color, borderRadius: 8, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'white', fontVariantNumeric: 'tabular-nums' }}>{timer}</span>
          </div>
          {bonus > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: color, color: 'white', padding: '2px 7px', borderRadius: 100 }}>+{bonus} bonus viteză</span>}
        </div>
      )}
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [barterAll, setBarterCampaigns] = useState<any[]>([])
  const [creatorRow, setCreatorRow] = useState<any>(null)
  const [noReplyCollabs, setNoReplyCollabs] = useState<any[]>([])
  const [archivedCollabs, setArchivedCollabs] = useState<any[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [activeTab, setActiveTab] = useState<'paid' | 'barter' | 'archived' | 'noReply'>('barter')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [influencerId, setInfluencerId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [activeCollabDates, setActiveCollabDates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Filters — Paid campaigns
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('Toate')
  const [filterBudget, setFilterBudget] = useState(0)
  const [filterNiche, setFilterNiche] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [sortBy, setSortBy] = useState('Cele mai noi')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Filters — Barter campaigns
  const [barterSearch, setBarterSearch] = useState('')
  const [barterFilterPlatform, setBarterFilterPlatform] = useState('Toate')
  const [barterSortBy, setBarterSortBy] = useState('Cele mai noi')

  // Modal
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [applyMsg, setApplyMsg] = useState('')
  const [applyAddress, setApplyAddress] = useState({ name: '', phone: '', address: '', city: '', county: '', postal: '' })
  const [applyError, setApplyError] = useState<string | null>(null)
  const [justApplied, setJustApplied] = useState<string | null>(null)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [collabAmounts, setCollabAmounts] = useState<Record<string, number>>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [profileMissing, setProfileMissing] = useState<string[]>([])
  const [showProfileModal, setShowProfileModal] = useState(false)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const fetchData = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: inf } = await sb.from('influencers').select('id, identity_verified, verification_status, name, bio, niches, platforms, avatar, instagram_connected, ig_followers, tt_followers, instagram_followers').eq('user_id', user.id).single()
      if (inf) {
        // Verifică ce lipsește din profil
        const missing: string[] = []
        if (!inf.name) missing.push('Nume complet')
        if (!inf.bio) missing.push('Bio')
        if (!inf.avatar) missing.push('Poză de profil')
        if (!inf.niches?.length) missing.push('Nișe de conținut')
        if (!inf.platforms?.length) missing.push('Platforme sociale (Instagram, TikTok etc.)')
        setProfileMissing(missing)
      }
      if (inf) {
        setInfluencerId(inf.id)
        setCreatorRow(inf)
        setIdentityVerified(!!inf.identity_verified)
      }
      // profileMissing already set above
      const [{ data: camp }, { data: barter }] = await Promise.all([
        sb.from('campaigns').select('*, offer_images, offer_image_url, offer_image_urls, brief_pdf_url').eq('status', 'ACTIVE').neq('campaign_type', 'BARTER').neq('campaign_type', 'OPEN_CALL').neq('campaign_type', 'MANAGED').order('created_at', { ascending: false }),
        sb.from('campaigns').select('*, offer_images, offer_image_url, offer_image_urls, brief_pdf_url').eq('status', 'ACTIVE').eq('campaign_type', 'BARTER').order('created_at', { ascending: false }),
      ])
      if (camp) setCampaigns(camp)
      if (barter) setBarterCampaigns(barter)
      if (inf) {
        const { data: colls } = await sb.from('collaborations').select('campaign_id, status, reserved_amount, payment_amount, admin_invited, created_at, campaigns(id, title, brand_name, campaign_type, offer_value, registration_opened_at, registration_deadline_days)').eq('influencer_id', inf.id)
        if (colls) {
          setAppliedIds(new Set(colls.filter((c: any) => c.status !== 'INVITED').map((c: any) => c.campaign_id)))
          setInvitedIds(new Set(colls.filter((c: any) => c.status === 'INVITED').map((c: any) => c.campaign_id)))
          // Store created_at for active collabs (for timer)
          const activeCollabDates: Record<string, string> = {}
          colls.filter((c: any) => c.status === 'ACTIVE').forEach((c: any) => {
            activeCollabDates[c.campaign_id] = c.created_at
          })
          setActiveCollabDates(activeCollabDates)
          const amountMap: Record<string, number> = {}
          colls.forEach((c: any) => {
            if (c.reserved_amount > 0) amountMap[c.campaign_id] = c.reserved_amount
          })
          setCollabAmounts(amountMap)
          // Invitații expirate fără răspuns
          const now = new Date()
          const expired = colls.filter((c: any) => {
            if (c.status !== 'INVITED') return false
            if (c.admin_invited) return false // invitat direct de admin — nu expira
            const openedAt = c.campaigns?.registration_opened_at
            const days = c.campaigns?.registration_deadline_days || 30
            if (!openedAt) return false
            const expiry = new Date(new Date(openedAt).getTime() + days * 86400000)
            return expiry < now
          })
          setNoReplyCollabs(expired)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    fetch('/api/influencer/archived-campaigns').then(r => r.ok ? r.json() : null).then(j => { if (j?.campaigns) setArchivedCollabs(j.campaigns) }).catch(() => {})
  }, [])

  async function handleApply() {
    if (!selected || !influencerId) return
    // Verifică profil complet
    if (profileMissing.length > 0) {
      setShowProfileModal(true)
      return
    }
    setApplyError(null)
    setActionLoading(selected.id)
    try {
      const needsDelivery = selected.delivery_method === 'delivery'
      if (needsDelivery) {
        if (!applyAddress.name.trim() || !applyAddress.phone.trim() || !applyAddress.address.trim() || !applyAddress.city.trim() || !applyAddress.county.trim()) {
          setApplyError('Completează toate câmpurile obligatorii din adresa de livrare.')
          setActionLoading(null)
          return
        }
      }
      const result = await applyToCampaign(selected.id, applyMsg || undefined, needsDelivery ? applyAddress : undefined)
      if (result.error) {
        setApplyError(result.error)
        setActionLoading(null)
        return
      }
      setAppliedIds(prev => new Set([...prev, selected.id]))
      setJustApplied(selected.id)
      notify('🎉 Aplicație trimisă! Brandul îți va revizui profilul.')
      setTimeout(() => { setSelected(null); setApplyMsg(''); setJustApplied(null) }, 2000)
    } catch (e: any) {
      setApplyError(e.message || 'Eroare la aplicare. Te rog încearcă din nou.')
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
    const matchPlatform = filterPlatform === 'Toate' || c.platforms?.some(p => p.toLowerCase() === filterPlatform.toLowerCase())
    const matchBudget = (c.budget ?? 0) >= budgetRange.min && (c.budget ?? 0) <= budgetRange.max
    const matchNiche = !filterNiche || c.niches?.includes(filterNiche)
    const matchCountry = !filterCountry || c.countries?.includes(filterCountry)
    return matchSearch && matchPlatform && matchBudget && matchNiche && matchCountry
  })

  if (sortBy === 'Buget: Mare → Mic') filtered = [...filtered].sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
  if (sortBy === 'Buget: Mic → Mare') filtered = [...filtered].sort((a, b) => (a.budget ?? 0) - (b.budget ?? 0))
  if (sortBy === 'Deadline: Cel mai aproape') filtered = [...filtered].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

  const activeFilters = [filterPlatform !== 'Toate', filterBudget !== 0, !!filterNiche, !!filterCountry].filter(Boolean).length

  // Țintire: ascundem ofertele pentru care creatorul nu e eligibil (le păstrăm pe cele la care a aplicat sau a fost invitat)
  const barterCampaigns = barterAll.filter(c =>
    appliedIds.has(c.id) || invitedIds.has(c.id) || !creatorRow || eligibility(c, creatorRow).ok)

  // Barter filtered + sorted
  let filteredBarter = barterCampaigns.filter(c => {
    const q = barterSearch.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q) || c.offer_name?.toLowerCase().includes(q)
    const matchPlatform = barterFilterPlatform === 'Toate' || c.platforms?.some((p: string) => p.toLowerCase() === barterFilterPlatform.toLowerCase())
    return matchSearch && matchPlatform
  })
  if (barterSortBy === 'Cele mai noi') filteredBarter = [...filteredBarter].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (barterSortBy === 'Valoare: Mare → Mică') filteredBarter = [...filteredBarter].sort((a, b) => (b.offer_value ?? 0) - (a.offer_value ?? 0))
  if (barterSortBy === 'Locuri: Cele mai multe') filteredBarter = [...filteredBarter].sort((a, b) => ((b.max_influencers ?? 0) - (b.current_influencers ?? 0)) - ((a.max_influencers ?? 0) - (a.current_influencers ?? 0)))

  if (loading) return (
    <div className="iu" style={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="iu-col" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e3f3', borderTopColor: '#7040f0', animation: 'cmSpin .8s linear infinite' }} />
        <p className="iu-muted iu-sm" style={{ margin: 0, fontWeight: 600 }}>Se încarcă campaniile…</p>
        <style>{`@keyframes cmSpin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  const coverImg = (c: any) => (Array.isArray(c.offer_images) && c.offer_images[0]) || (Array.isArray(c.offer_image_urls) && c.offer_image_urls[0]) || c.offer_image_url || null
  const initials = (s: string) => (s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const resetPaidFilters = () => { setFilterBudget(0); setFilterNiche(''); setFilterCountry(''); setFilterPlatform('Toate') }
  const archivedCount = campaigns.filter(c => c.deadline && new Date(c.deadline) < new Date()).length
  const activeCount = campaigns.filter(c => !(c.deadline && new Date(c.deadline) < new Date())).length

  return (
    <div className="iu">
      <style>{CAMPAIGN_CSS}</style>
      <style>{`
        .cm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; align-items:stretch; }
        .cm-card { background:#fff; border:1px solid #e5e3f3; border-radius:20px; display:flex; flex-direction:column; min-width:0; cursor:pointer; transition:box-shadow .2s, border-color .2s; animation:cmUp .35s ease both; }
        .cm-card:hover { border-color:#cfc6f5; box-shadow:0 14px 30px -18px rgba(112,64,240,.4); }
        .cm-card.applied { border-color:#a7e3cb; }
        .cm-card.urgent { border-color:#f7d2b3; }
        .cm-cover { height:76px; position:relative; display:flex; align-items:flex-start; justify-content:space-between; padding:12px 14px; border-radius:20px 20px 0 0; gap:8px; overflow:hidden; background:linear-gradient(135deg,#7040f0,#9030f0); }
        .cm-cover.barter { background:linear-gradient(135deg,#2f6fe0,#5a35e6); }
        .cm-cover.img { height:130px; }
        .cm-cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .cm-cover .shade { position:absolute; inset:0; background:linear-gradient(180deg,rgba(20,18,58,.35),rgba(20,18,58,0) 60%); }
        .cm-cover .blob { position:absolute; right:-30px; bottom:-60px; width:150px; height:150px; border-radius:50%; background:rgba(255,255,255,.14); pointer-events:none; }
        .cm-tchip { position:relative; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; background:rgba(255,255,255,.22); color:#fff; font-size:12px; font-weight:700; backdrop-filter:blur(4px); white-space:nowrap; }
        .cm-body { padding:16px 18px 18px; display:flex; flex-direction:column; gap:12px; flex:1; min-width:0; }
        .cm-brand { display:flex; align-items:center; gap:10px; min-width:0; }
        .cm-brand span.nm { font-size:13px; font-weight:700; color:#4a4770; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .cm-title { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-weight:700; font-size:18px; letter-spacing:-.01em; line-height:1.25; color:#14123a; margin:0; overflow-wrap:anywhere; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .cm-desc { margin:0; font-size:13px; color:#6a6690; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .cm-stat { display:flex; gap:6px; padding:12px 0; border-top:1px solid #eeecf7; border-bottom:1px solid #eeecf7; }
        .cm-stat > div { flex:1; min-width:0; display:flex; flex-direction:column; }
        .cm-stat b { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:17px; line-height:1.15; color:#14123a; overflow-wrap:anywhere; }
        .cm-stat span { font-size:12px; color:#6a6690; }
        .cm-chips { display:flex; flex-wrap:wrap; gap:6px; }
        .cm-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; flex-wrap:wrap; }
        .cm-sel { appearance:none; padding-right:34px; cursor:pointer; font-weight:600; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238783a8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; background-size:14px; }
        .cm-bar { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
        .cm-pills { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
        .cm-pills::-webkit-scrollbar { display:none; }
        .cm-pills .iu-pill { flex:none; }
        .cm-adv { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; padding-top:14px; border-top:1px solid #eeecf7; }
        .cm-empty { padding:56px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; }
        .cm-toast { position:fixed; top:20px; right:20px; z-index:90; display:flex; align-items:center; gap:10px; padding:14px 18px; border-radius:16px; background:#fff; font-size:14px; font-weight:700; max-width:380px; box-shadow:0 16px 40px -12px rgba(20,18,58,.3); animation:cmIn .3s ease; }
        .cm-overlay { position:fixed; inset:0; z-index:100; background:rgba(20,18,58,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:16px; }
        .cm-pm { background:#fff; border-radius:24px; padding:24px; width:100%; max-width:420px; box-shadow:0 20px 60px rgba(20,18,58,.25); }
        .cm-x { width:44px; height:44px; border-radius:12px; border:0; background:#f0eff7; color:#4a4770; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex:none; }
        .cm-x:hover { background:#e5e3f3; }
        .cm-sheet { background:#fff; width:100%; border-radius:24px 24px 0 0; overflow-y:auto; height:95vh; max-width:600px; margin:0 auto; position:relative; font-family:var(--font-body,system-ui),system-ui,sans-serif; color:#14123a; }
        .cm-sheet-head { position:sticky; top:0; z-index:10; background:#fff; border-bottom:1px solid #eeecf7; padding:16px 20px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; border-radius:24px 24px 0 0; }
        .cm-sheet-head h2 { font-size:20px; line-height:1.2; margin:0; font-family:var(--font-display,system-ui),system-ui,sans-serif; font-weight:800; letter-spacing:-.02em; overflow-wrap:anywhere; }
        .cm-sheet-body { padding:20px; display:flex; flex-direction:column; gap:20px; }
        .cm-sheet-body > * { min-width:0; }
        .cm-addr { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .cm-addr > div { display:flex; flex-direction:column; gap:5px; min-width:0; }
        .cm-addr .full { grid-column:1 / -1; }
        .cm-addr .iu-input { font-size:16px; width:100%; }
        .cm-apply-foot { position:sticky; bottom:0; z-index:5; background:#fff; border-top:1px solid #eeecf7; margin:0 -20px -20px; padding:12px 20px calc(12px + env(safe-area-inset-bottom)); display:flex; flex-direction:column; gap:10px; box-shadow:0 -14px 28px -22px rgba(20,18,58,.35); }
        .cm-score { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; border-radius:14px; background:#dcf5ec; border:1px solid #a7e3cb; }
        .cm-sheet-body img { max-width:100%; }
        .cm-note { display:flex; align-items:center; gap:14px; padding:16px; border-radius:20px; }
        @keyframes cmIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes cmUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .modal-overlay { animation:fadeIn .2s ease; }
        .modal-panel { animation:slideUp .3s ease; }
        .textarea-msg { width:100%;padding:12px 14px;border:1.5px solid #e5e3f3;border-radius:12px;font-size:14px;outline:none;transition:border-color .2s;font-family:inherit;resize:none;color:#14123a;box-sizing:border-box; }
        .textarea-msg:focus { border-color:#7040f0;box-shadow:0 0 0 3px rgba(112,64,240,.1); }
        .textarea-msg::placeholder { color:#8783a8; }
        .btn-apply { width:100%;min-height:50px;padding:0 16px;border-radius:14px;font-size:15px;font-weight:800;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#7040f0,#9030f0);box-shadow:0 10px 22px -12px rgba(112,64,240,.7);transition:filter .15s;font-family:inherit; }
        .btn-apply:hover:not(:disabled) { filter:brightness(1.07); }
        .btn-apply:disabled { opacity:.6;cursor:not-allowed; }
        @media (max-width:767px) {
          .cm-grid { grid-template-columns:1fr; gap:14px; }
          .cm-cover { height:64px; }
          .cm-cover.img { height:120px; }
          .cm-body { padding:14px; }
          .cm-title { font-size:17px; }
          .cm-adv { grid-template-columns:1fr; }
          .cm-bar > .iu-search { flex:1 1 100%; }
          .cm-bar .cm-sel, .cm-bar .iu-btn { flex:1 1 100%; min-height:44px; }
          .cm-pills .iu-pill, .cm-tabs .iu-pill { min-height:44px; }
          .cm-tabs { flex-wrap:nowrap !important; overflow-x:auto; scrollbar-width:none; margin:0 -16px; padding:0 16px; }
          .cm-tabs::-webkit-scrollbar { display:none; }
          .cm-tabs .iu-pill { flex:none; }
          .cm-toast { left:16px; right:16px; top:12px; max-width:none; }
          .cm-overlay.pm { align-items:flex-end; padding:0; }
          .cm-pm { border-radius:24px 24px 0 0; max-width:none; padding:20px 16px 28px; }
          .cm-sheet-head { padding:14px 16px; }
          .cm-sheet-body { padding:16px; }
          .cm-apply-foot { margin:0 -16px -16px; padding:12px 16px calc(12px + env(safe-area-inset-bottom)); }
          .cm-addr { grid-template-columns:1fr; }
          .cm-score { flex-wrap:wrap; }
          .cm-note { flex-wrap:wrap; }
          .cm-empty { padding:40px 16px; }
        }
      `}</style>

      {/* Modal profil incomplet */}
      {showProfileModal && (
        <div className="cm-overlay pm">
          <div className="cm-pm">
            <div className="iu-ico" style={{ width: 52, height: 52, background: '#fff1c2', color: '#854d0e', marginBottom: 14 }}><AlertCircle size={24} /></div>
            <h2 style={{ marginBottom: 6 }}>Profilul tău e incomplet</h2>
            <p className="iu-muted iu-sm" style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
              Brandurile nu pot vedea profiluri incomplete. Completează informațiile de mai jos pentru a putea aplica la campanii:
            </p>
            <div style={{ background: '#fff4f2', borderRadius: 14, padding: '12px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {profileMissing.map((item: string, i: number) => (
                <div key={i} className="iu-row" style={{ gap: 8 }}>
                  <X size={14} color="#b42318" style={{ flex: 'none' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#b42318' }}>{item}</span>
                </div>
              ))}
            </div>
            <div className="iu-row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="iu-btn" style={{ flex: 1, minHeight: 44 }} onClick={() => setShowProfileModal(false)}>Înapoi</button>
              <a href="/influencer/profile" className="iu-btn p" style={{ flex: 1.4, minHeight: 44 }}>Completează profilul <ArrowRight size={15} /></a>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="cm-toast" style={{ border: `1.5px solid ${toast.ok ? '#a7e3cb' : '#f3c9c4'}`, color: toast.ok ? '#14532d' : '#b42318' }}>
          {toast.ok ? <CheckCircle size={16} style={{ flex: 'none' }} /> : <AlertCircle size={16} style={{ flex: 'none' }} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <section className="iu-head">
        <div className="iu-col" style={{ gap: 4 }}>
          <h1>Campanii disponibile</h1>
          <p style={{ margin: 0, color: '#4a4770' }}>
            {barterCampaigns.length} {barterCampaigns.length === 1 ? 'ofertă barter' : 'oferte barter'} · {activeCount} {activeCount === 1 ? 'campanie plătită' : 'campanii plătite'}
            {appliedIds.size > 0 && <> · <b style={{ color: '#7040f0' }}>{appliedIds.size} {appliedIds.size === 1 ? 'aplicată' : 'aplicate'}</b></>}
          </p>
        </div>
      </section>

      {/* Tab selector */}
      <div className="iu-tabs cm-tabs">
        <button className={`iu-pill ${activeTab === 'barter' ? 'on' : ''}`} onClick={() => setActiveTab('barter')}>
          <Sparkles size={15} /> Free Offer / Barter <span className="n">{barterCampaigns.length}</span>
        </button>
        <button className={`iu-pill ${activeTab === 'paid' ? 'on' : ''}`} onClick={() => setActiveTab('paid')}>
          <DollarSign size={15} /> Campanii plătite <span className="n">{activeCount}</span>
        </button>
        <button className={`iu-pill ${activeTab === 'archived' ? 'on' : ''}`} onClick={() => setActiveTab('archived')}>
          <ArchiveX size={15} /> Arhivate <span className="n">{archivedCollabs.length}</span>
        </button>
        {noReplyCollabs.length > 0 && (
          <button className={`iu-pill ${activeTab === 'noReply' ? 'on' : ''}`} onClick={() => setActiveTab('noReply')}>
            <Clock size={15} /> Fără răspuns <span className="n">{noReplyCollabs.length}</span>
          </button>
        )}
      </div>
      {/* Banner verificare — dezactivat temporar */}
      {false && !identityVerified && null}

      {activeTab === 'noReply' && (
        <div className="iu-col" style={{ gap: 12 }}>
          <div className="iu-card iu-card-pad" style={{ background: '#fff1c2', borderColor: '#f3dc8a' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 800, color: '#854d0e' }}>Invitații expirate fără răspuns</p>
            <p className="iu-sm" style={{ margin: 0, color: '#854d0e' }}>Aceste campanii nu mai acceptă înscrieri. Nu-ți face griji — mai multe campanii vin în curând!</p>
          </div>
          {noReplyCollabs.map((collab: any) => (
            <div key={collab.campaign_id} className="iu-card iu-card-pad iu-row" style={{ gap: 12, opacity: .85 }}>
              <div className="iu-ico" style={{ background: '#fff1c2', color: '#854d0e' }}><Clock size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{collab.campaigns?.title}</p>
                <p className="iu-muted iu-xs" style={{ margin: '2px 0 0' }}>{collab.campaigns?.brand_name} · {collab.campaigns?.campaign_type === 'BARTER' ? 'Campanie barter (produs gratuit)' : 'Campanie plătită'}</p>
              </div>
              <span className="iu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}>Fără răspuns</span>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p className="iu-muted iu-sm" style={{ margin: '0 0 12px' }}>Completează-ți profilul ca să primești invitații mai relevante</p>
            <a href="/influencer/settings" className="iu-btn" style={{ minHeight: 44 }}>Actualizează profilul</a>
          </div>
        </div>
      )}

      {activeTab === 'archived' && (
        <div className="iu-col" style={{ gap: 12 }}>
          <div className="iu-card iu-card-pad" style={{ background: '#efeaff', borderColor: '#d9cffa' }}>
            <p style={{ margin: 0, fontWeight: 800, color: '#4423c4' }}>Campanii care au rulat pe AddFame</p>
            <p className="iu-sm" style={{ margin: '2px 0 0', color: '#4423c4' }}>Un istoric al campaniilor încheiate, ca să vezi ce branduri colaborează cu creatori ca tine.</p>
          </div>
          {archivedCollabs.length === 0 ? (
            <div className="iu-card iu-card-pad" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 800 }}>Nicio campanie încheiată încă</p>
            </div>
          ) : archivedCollabs.map((c: any) => {
            const img = coverImg(c)
            const joined = appliedIds.has(c.id)
            return (
              <div key={c.id} className="iu-card iu-card-pad iu-row" style={{ gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg,#7040f0,#9030f0)' }}>
                  {img && <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title || 'Campanie'}</p>
                  <p className="iu-muted iu-xs" style={{ margin: '2px 0 0' }}>
                    {c.brand_name} · {c.campaign_type === 'BARTER' ? 'Barter' : 'Plătită'} · {new Date(c.created_at).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                    {c.current_influencers > 0 && <> · {c.current_influencers} {c.current_influencers === 1 ? 'creator' : 'creatori'}</>}
                  </p>
                </div>
                {joined
                  ? <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>Ai participat</span>
                  : <span className="iu-chip" style={{ background: '#f1f0f8', color: '#4a4770' }}>Încheiată</span>}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'paid' && (<>
        {/* Filters */}
        <div className="iu-card iu-card-pad iu-col" style={{ gap: 14 }}>
          <div className="cm-bar">
            <div className="iu-search" style={{ flex: '1 1 220px' }}>
              <Search size={16} />
              <input placeholder="Caută campanii, branduri, nișe…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="iu-input cm-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <button onClick={() => setShowAdvanced(v => !v)} className={`iu-btn ${showAdvanced ? 'p' : ''}`}>
              <SlidersHorizontal size={15} /> Filtre
              {activeFilters > 0 && <span className="iu-chip" style={{ height: 20, padding: '0 7px', background: showAdvanced ? 'rgba(255,255,255,.25)' : '#efeaff', color: showAdvanced ? '#fff' : '#5b2fd0' }}>{activeFilters}</span>}
            </button>
            <button onClick={() => setShowArchived(v => !v)} className={`iu-btn ${showArchived ? 'p' : ''}`}>
              <ArchiveX size={15} /> {showArchived ? 'Înapoi la active' : `Arhivate (${archivedCount})`}
            </button>
          </div>

          <div className="cm-pills">
            {PLATFORMS.map(p => (
              <button key={p} className={`iu-pill ${filterPlatform === p ? 'on' : ''}`} onClick={() => setFilterPlatform(p)}>{p}</button>
            ))}
          </div>

          {showAdvanced && (
            <div className="cm-adv">
              <div className="iu-col" style={{ gap: 6 }}>
                <label className="iu-label">Buget</label>
                <select className="iu-input cm-sel" value={filterBudget} onChange={e => setFilterBudget(+e.target.value)}>
                  {BUDGET_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
                </select>
              </div>
              <div className="iu-col" style={{ gap: 6 }}>
                <label className="iu-label">Nișă</label>
                <select className="iu-input cm-sel" value={filterNiche} onChange={e => setFilterNiche(e.target.value)}>
                  <option value="">Toate nișele</option>
                  {allNiches.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div className="iu-col" style={{ gap: 6 }}>
                <label className="iu-label">Țară</label>
                <select className="iu-input cm-sel" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                  <option value="">Toate țările</option>
                  {allCountries.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {activeFilters > 0 && (
                <button onClick={resetPaidFilters} className="iu-btn danger" style={{ minHeight: 44, justifySelf: 'start' }}>
                  <X size={14} /> Șterge toate filtrele
                </button>
              )}
            </div>
          )}
        </div>

        <p className="iu-muted iu-sm" style={{ margin: 0, fontWeight: 600 }}>
          Se afișează {filtered.length} din {campaigns.length} campanii
        </p>

        {filtered.length === 0 ? (
          <div className="iu-card cm-empty">
            <div className="iu-ico" style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#7040f0,#9030f0)', color: '#fff' }}><Zap size={28} /></div>
            <h3 style={{ marginTop: 8 }}>Nicio campanie găsită</h3>
            <p className="iu-muted iu-sm" style={{ margin: 0, maxWidth: 320 }}>
              {campaigns.length === 0 ? 'Nu există încă campanii active. Revino în curând!' : 'Încearcă să ajustezi filtrele.'}
            </p>
            {activeFilters > 0 && (
              <button onClick={() => { resetPaidFilters(); setSearch('') }} className="iu-btn" style={{ marginTop: 10, minHeight: 44 }}>Șterge filtrele</button>
            )}
          </div>
        ) : (
          <div className="cm-grid">
            {filtered.map((c, i) => {
              const applied = appliedIds.has(c.id)
              const days = daysLeft(c.deadline)
              const expired = days < 0
              const urgent = days >= 0 && days <= 3
              const img = coverImg(c)
              const slotsLeft = c.max_influencers ? c.max_influencers - (c.current_influencers || 0) : null

              return (
                <div
                  key={c.id}
                  className={`cm-card ${applied ? 'applied' : ''} ${urgent && !applied ? 'urgent' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 9) * 0.04}s` }}
                  onClick={() => { setSelected(c); setApplyMsg(''); setApplyError(null) }}
                >
                  <div className={`cm-cover ${img ? 'img' : ''}`}>
                    {img && <img src={img} alt={c.title} />}
                    {img && <i className="shade" />}
                    {!img && <i className="blob" />}
                    <span className="cm-tchip" style={{ zIndex: 1 }}>Plătită</span>
                    {applied ? (
                      <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d', zIndex: 1 }}><CheckCircle size={12} /> Aplicat</span>
                    ) : urgent && !expired ? (
                      <span className="iu-chip" style={{ background: '#fff1e6', color: '#9a4206', zIndex: 1 }}>Urgent</span>
                    ) : null}
                  </div>
                  <div className="cm-body">
                    <div className="cm-brand">
                      <span className="iu-face" style={{ width: 28, height: 28, fontSize: 11, background: '#efeaff', color: '#5b2fd0' }}>{initials(c.brand_name)}</span>
                      <span className="nm">{c.brand_name}</span>
                    </div>
                    <h3 className="cm-title">{c.title}</h3>
                    {c.description && <p className="cm-desc">{c.description}</p>}

                    <div className="cm-stat">
                      <div><b style={{ color: '#14532d' }}>{fmt(c.budget ?? 0)} RON</b><span>buget total</span></div>
                      {c.max_influencers ? (
                        <div><b>{slotsLeft}</b><span>{slotsLeft === 1 ? 'loc liber' : 'locuri libere'}</span></div>
                      ) : null}
                      <div>
                        <b style={{ color: expired ? '#b42318' : urgent ? '#9a4206' : undefined }}>
                          {expired ? 'Expirat' : days === 0 ? 'Azi' : `${days} ${days === 1 ? 'zi' : 'zile'}`}
                        </b>
                        <span>{c.deadline ? fmtDateShort(c.deadline) : 'deadline'}</span>
                      </div>
                    </div>

                    {c.platforms?.length > 0 && (
                      <div className="cm-chips">{c.platforms.map(p => <PlatformBadge key={p} platform={p} />)}</div>
                    )}
                    {c.niches?.length > 0 && (
                      <div className="cm-chips">
                        {c.niches.slice(0, 3).map(n => <span key={n} className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{n}</span>)}
                        {c.niches.length > 3 && <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>+{c.niches.length - 3}</span>}
                      </div>
                    )}

                    <div className="cm-foot">
                      <span className="iu-muted iu-xs iu-row" style={{ gap: 5, minWidth: 0 }}>
                        {c.countries?.length > 0 && <><Globe size={13} /> {c.countries.slice(0, 2).join(', ')}</>}
                      </span>
                      <span className={`iu-btn ${applied ? '' : 'p'}`} style={{ minHeight: 44 }}>
                        {applied ? 'Vezi detalii' : 'Aplică'} <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </>)} {/* end activeTab === 'paid' */}

      {/* Tab: Campanii Barter */}
      {activeTab === 'barter' && (<>
          <div className="iu-card iu-card-pad iu-col" style={{ gap: 14 }}>
            <div className="cm-bar">
              <div className="iu-search" style={{ flex: '1 1 220px' }}>
                <Search size={16} />
                <input placeholder="Caută oferte, branduri..." value={barterSearch} onChange={e => setBarterSearch(e.target.value)} />
              </div>
              <select className="iu-input cm-sel" value={barterSortBy} onChange={e => setBarterSortBy(e.target.value)}>
                {['Cele mai noi', 'Valoare: Mare → Mică', 'Locuri: Cele mai multe'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="cm-pills">
              {['Toate', 'Instagram', 'TikTok', 'YouTube', 'Facebook'].map(p => (
                <button key={p} type="button" onClick={() => setBarterFilterPlatform(p)} className={`iu-pill ${barterFilterPlatform === p ? 'on' : ''}`}>{p}</button>
              ))}
            </div>
          </div>

          <p className="iu-muted iu-sm" style={{ margin: 0, fontWeight: 600 }}>
            <b style={{ color: '#14123a' }}>{filteredBarter.length}</b> oferte disponibile
            {barterSearch || barterFilterPlatform !== 'Toate' ? ' (filtrate)' : ' în zona ta'}
          </p>

          {filteredBarter.length === 0 ? (
            <div className="iu-card cm-empty">
              <div className="iu-ico" style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', color: '#fff' }}><Sparkles size={28} /></div>
              <h3 style={{ marginTop: 8 }}>{barterCampaigns.length === 0 ? 'Nicio campanie barter disponibilă' : 'Niciun rezultat găsit'}</h3>
              <p className="iu-muted iu-sm" style={{ margin: 0, maxWidth: 320 }}>
                {barterCampaigns.length === 0
                  ? 'Setează-ți orașul în Settings pentru a vedea ofertele din zona ta.'
                  : 'Încearcă să schimbi filtrele.'}
              </p>
              {(barterSearch || barterFilterPlatform !== 'Toate') && (
                <button onClick={() => { setBarterSearch(''); setBarterFilterPlatform('Toate') }} className="iu-btn" style={{ marginTop: 10, minHeight: 44 }}>Resetează filtrele</button>
              )}
            </div>
          ) : (
            <div className="cm-grid">
              {filteredBarter.map((c, i) => {
                const days = daysLeft(c.deadline)
                const urgent = days >= 0 && days <= 3
                const slotsLeft = (c.max_influencers ?? 0) - (c.current_influencers ?? 0)
                const pct = Math.round(((c.current_influencers || 0) / (c.max_influencers || 1)) * 100)
                const isClosed = c.registrations_open === false || (() => {
                  if (!c.registration_opened_at) return false
                  const expiry = new Date(new Date(c.registration_opened_at).getTime() + (c.registration_deadline_days || 30) * 86400000)
                  return expiry < new Date()
                })()
                const img = coverImg(c)
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`cm-card ${urgent && !isClosed ? 'urgent' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 9) * 0.04}s` }}
                  >
                    <div className={`cm-cover barter ${img ? 'img' : ''}`}>
                      {img && <img src={img} alt={c.brand_name} />}
                      {img && <i className="shade" />}
                      {!img && <i className="blob" />}
                      <span className="cm-tchip" style={{ zIndex: 1 }}>Free Offer · Barter</span>
                      {isClosed ? (
                        <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770', zIndex: 1 }}>Înscrieri închise</span>
                      ) : urgent ? (
                        <span className="iu-chip" style={{ background: '#fff1e6', color: '#9a4206', zIndex: 1 }}>{days === 0 ? 'Ultima zi' : `${days} ${days === 1 ? 'zi' : 'zile'} rămase`}</span>
                      ) : null}
                    </div>
                    <div className="cm-body">
                      <div className="cm-brand">
                        <span className="iu-face" style={{ width: 28, height: 28, fontSize: 11, background: '#e6f0ff', color: '#1d4fb8' }}>{initials(c.brand_name)}</span>
                        <span className="nm">{c.brand_name}</span>
                      </div>
                      <h3 className="cm-title">{c.offer_name || 'Campanie barter'}</h3>
                      {c.offer_description && <p className="cm-desc">{c.offer_description}</p>}

                      <div className="cm-stat">
                        <div><b style={{ color: '#1d4fb8' }}>Gratuit</b><span>primești produsul</span></div>
                        <div><b>{slotsLeft}</b><span>{slotsLeft === 1 ? 'loc liber' : 'locuri libere'}</span></div>
                        {c.deadline && (
                          <div><b style={{ color: urgent ? '#9a4206' : undefined }}>{days > 0 ? `${days} ${days === 1 ? 'zi' : 'zile'}` : 'Azi'}</b><span>deadline</span></div>
                        )}
                      </div>

                      {(c.platforms || []).length > 0 && (
                        <div className="cm-chips">{c.platforms.map((p: string) => <PlatformBadge key={p} platform={p} />)}</div>
                      )}

                      <div className="cm-chips">
                        <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>
                          {c.delivery_method === 'pickup' ? `Ridicare: ${c.pickup_location_name || 'din locație'}` : 'Livrare la domiciliu'}
                        </span>
                      </div>

                      <div>
                        <div className="iu-row iu-xs iu-muted" style={{ justifyContent: 'space-between', marginBottom: 6, fontWeight: 600 }}>
                          <span>{c.current_influencers || 0}/{c.max_influencers} locuri ocupate</span>
                          <span style={{ color: slotsLeft <= 2 ? '#b42318' : undefined, fontWeight: slotsLeft <= 2 ? 800 : 600 }}>{slotsLeft} rămase</span>
                        </div>
                        <div className="iu-bar"><i style={{ width: `${pct}%`, background: pct > 80 ? '#b42318' : undefined }} /></div>
                      </div>

                      <div className="cm-foot">
                        <span />
                        <span className={`iu-btn ${isClosed ? '' : 'p'}`} style={{ minHeight: 44, ...(isClosed ? { color: '#8783a8', cursor: 'not-allowed' } : {}) }}>
                          {isClosed ? 'Înscrieri închise' : <>Vezi oferta <ArrowRight size={14} /></>}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
      </>)}

      {/* Modal */}
      {selected && (
        <div
          className="modal-overlay cm-overlay"
          style={{ alignItems: 'flex-end', padding: 0, zIndex: 80 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="modal-panel cm-sheet">

            {/* Modal header */}
            <div className="cm-sheet-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="iu-label" style={{ margin: 0 }}>{selected.campaign_type === 'BARTER' ? 'Campanie barter' : 'Campanie plătită'}</p>
                <h2 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 17 }}>{selected.title?.replace(/^(\[(Barter|Managed|Paid)\]\s*)+/i, '') || selected.brand_name}</h2>
                <p className="iu-muted iu-xs" style={{ margin: '1px 0 0', fontWeight: 600 }}>{selected.brand_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="cm-x" aria-label="Închide"><X size={18} /></button>
            </div>

            <div className="cm-sheet-body">

              {/* Hero: tip, brand, titlu */}
              <CampaignHero c={selected} applied={appliedIds.has(selected.id)} />

              {/* Slider de imagini (barter + plătite) */}
              {(() => {
                const imgs = [
                  ...(Array.isArray(selected.offer_images) ? selected.offer_images : []),
                  ...(Array.isArray(selected.offer_image_urls) ? selected.offer_image_urls : []),
                  ...(selected.offer_image_url ? [selected.offer_image_url] : []),
                ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // deduplicate
                if (imgs.length === 0) return null
                return (
                  <div className="iu-card" style={{ padding: 10 }}>
                    <CampaignImageSlider images={imgs} alt={selected.campaign_type === 'BARTER' ? (selected.offer_name || 'Produs') : (selected.title || 'Campanie')} />
                  </div>
                )
              })()}

              {/* Recompensă · locuri · deadline */}
              <CampaignStats c={selected} collabAmount={collabAmounts[selected.id]} />

              {/* Brief, task-uri, caption, interzis, livrare… */}
              <CampaignSections c={selected} onCopy={(text, msg) => { navigator.clipboard.writeText(text); notify(msg) }} />

              {/* Apply section */}
              {invitedIds.has(selected.id) ? (
                <div className="cm-note" style={{ background: '#e6f0ff', border: '1.5px solid #bcd3fb' }}>
                  <div className="iu-ico" style={{ width: 48, height: 48, background: '#fff', color: '#1d4fb8' }}>
                    <Briefcase size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#1d4fb8' }}>Ești invitat la această campanie!</p>
                    <p className="iu-xs iu-muted" style={{ margin: '2px 0 0' }}>Mergi la <strong>Colaborări</strong> pentru a accepta sau refuza invitația.</p>
                  </div>
                  <a href="/influencer/collaborations" className="iu-btn p" style={{ minHeight: 44 }}>
                    Vezi invitația <ArrowRight size={15} />
                  </a>
                </div>
              ) : appliedIds.has(selected.id) || justApplied === selected.id ? (
                <div className="cm-note" style={{ background: '#dcf5ec', border: '1.5px solid #a7e3cb' }}>
                  <div className="iu-ico" style={{ width: 48, height: 48, background: '#fff', color: '#14532d' }}>
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, color: '#14532d' }}>Aplicație trimisă</p>
                    <p className="iu-xs iu-muted" style={{ margin: '2px 0 0' }}>Brandul îți va analiza profilul și îți va răspunde în curând.</p>
                  </div>
                </div>
              ) : daysLeft(selected.deadline) < 0 ? (
                <div className="cm-note" style={{ background: '#f0eff7', justifyContent: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: '#4a4770' }}>Această campanie a expirat</p>
                </div>
              ) : (selected.registrations_open === false || (() => {
                if (invitedIds.has(selected.id)) return false // invitat direct de admin — nu se aplica deadline
                if (!selected.registration_opened_at) return false
                const expiry = new Date(new Date(selected.registration_opened_at).getTime() + (selected.registration_deadline_days || 30) * 86400000)
                return expiry < new Date()
              })()) ? (
                <div className="cm-note" style={{ background: '#fff4f2', border: '1px solid #f3c9c4', flexDirection: 'column', textAlign: 'center' }}>
                  <div className="iu-ico" style={{ background: '#fff', color: '#b42318' }}><Ban size={20} /></div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#b42318' }}>Înscrierile sunt închise</p>
                  <p className="iu-sm" style={{ margin: 0, color: '#b42318' }}>Brandul nu mai acceptă aplicații pentru această campanie. Urmărește campaniile noi care apar pe AddFame.</p>
                </div>
              ) : (
                <>
                  {selected.delivery_method === 'delivery' && (
                    <div className="iu-card cp-sec">
                      <h3>Adresă livrare colet</h3>
                      <div className="cm-addr">
                        <div className="full">
                          <label className="iu-label">Nume complet *</label>
                          <input className="iu-input" type="text" placeholder="Ion Popescu" value={applyAddress.name} onChange={e => setApplyAddress(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div>
                          <label className="iu-label">Telefon *</label>
                          <input className="iu-input" type="tel" placeholder="07XXXXXXXX" value={applyAddress.phone} onChange={e => setApplyAddress(p => ({ ...p, phone: e.target.value }))} />
                        </div>
                        <div>
                          <label className="iu-label">Cod poștal</label>
                          <input className="iu-input" type="text" placeholder="077190" value={applyAddress.postal} onChange={e => setApplyAddress(p => ({ ...p, postal: e.target.value }))} />
                        </div>
                        <div className="full">
                          <label className="iu-label">Adresă *</label>
                          <input className="iu-input" type="text" placeholder="Str. Exemplu nr. 1, Bl. A, Ap. 5" value={applyAddress.address} onChange={e => setApplyAddress(p => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div>
                          <label className="iu-label">Oraș *</label>
                          <input className="iu-input" type="text" placeholder="București" value={applyAddress.city} onChange={e => setApplyAddress(p => ({ ...p, city: e.target.value }))} />
                        </div>
                        <div>
                          <label className="iu-label">Județ *</label>
                          <input className="iu-input" type="text" placeholder="Ilfov" value={applyAddress.county} onChange={e => setApplyAddress(p => ({ ...p, county: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="iu-card cp-sec">
                    <label className="iu-label" style={{ display: 'block' }}>
                      Mesaj către brand <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(opțional, dar recomandat)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={applyMsg}
                      onChange={e => setApplyMsg(e.target.value)}
                      maxLength={500}
                      placeholder="Prezintă-te și explică de ce ești potrivit. Menționează nișa, audiența și colaborările anterioare…"
                      className="textarea-msg"
                    />
                    <p className="iu-xs iu-muted" style={{ margin: 0, textAlign: 'right' }}>{applyMsg.length}/500</p>
                  </div>

                  {applyError && (
                    <div className="cm-note" style={{ background: '#fff4f2', border: '1px solid #f3c9c4', color: '#b42318', fontSize: 14, alignItems: 'flex-start' }}>
                      <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} />{applyError}
                    </div>
                  )}

                  {/* Footer lipicios: timer / bonus + buton */}
                  <div className="cm-apply-foot">
                    {/* Timer dacă are deja colaborare activă */}
                    {activeCollabDates[selected.id] && (
                      <CampaignScoreTimer acceptedAt={activeCollabDates[selected.id]} />
                    )}

                    {/* Score motivation — bonus info before applying */}
                    {!activeCollabDates[selected.id] && (
                      <div className="cm-score">
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: '#14532d', margin: '0 0 1px' }}>Aplică acum — postează repede</p>
                          <p style={{ fontSize: 12, color: '#14532d', opacity: .8, margin: 0 }}>Poți câștiga până la <strong>+225 puncte</strong> dacă trimiți dovada în 24h</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontFamily: 'var(--font-display,system-ui),system-ui,sans-serif', fontSize: 20, fontWeight: 800, color: '#14532d', margin: 0, lineHeight: 1 }}>+225</p>
                          <p style={{ fontSize: 10, color: '#14532d', opacity: .7, margin: 0 }}>pts max</p>
                        </div>
                      </div>
                    )}

                    <button
                      className="btn-apply"
                      onClick={handleApply}
                      disabled={actionLoading === selected.id}
                    >
                      {actionLoading === selected.id
                        ? <><div className="w-4 h-4 border-2 border-white border-opacity-40 border-t-white rounded-full animate-spin" />Se trimite…</>
                        : <>Trimite aplicația <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
