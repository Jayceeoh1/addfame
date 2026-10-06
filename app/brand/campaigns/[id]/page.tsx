'use client'
// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateCampaignStatus, getCampaignFeeInfo } from '@/app/actions/campaigns'
import { approveApplication, approveDeliverable } from '@/app/actions/collaborations'
import { duplicateBarterCampaign } from '@/app/actions/barter-campaigns'
import { getPlatformSettings } from '@/app/actions/admin'
import { ArrowLeft, CheckCircle, AlertCircle, X, Check, Star, MessageSquare, ArrowUpRight, Send, Users } from 'lucide-react'
import Link from 'next/link'
import { LeaveReview } from '@/components/shared/leave-review'
import DraftReview from '@/components/shared/DraftReview'
import { CollabCard, CollabToolbar, collabCss } from '@/components/brand/campaigns/CollabCard'

import { CampaignHero } from '@/components/brand/campaigns/CampaignHero'
import { CampaignAnalytics } from '@/components/brand/campaigns/CampaignAnalytics'
import { CampaignSavings } from '@/components/brand/campaigns/CampaignSavings'
import { ProfileModal } from '@/components/brand/campaigns/ProfileModal'
import { PauseModal, DraftModal, RejectModal } from '@/components/brand/campaigns/CampaignModals'
import { COLLAB_CFG, fmt, fmtNum, daysLeft, type Tab } from '@/components/brand/campaigns/types'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <span className="text-xs text-pink-500 font-bold">IG</span>,
  tiktok: <TikTokIcon className="w-3.5 h-3.5 text-gray-800" />,
  youtube: <span className="text-xs text-red-500 font-bold">YT</span>,
}

const DEFAULT_AGENCY_COSTS = { setup_cost: 800, selection_cost: 1200, management_cost: 1500, reporting_cost: 350, hours_saved: 40, eng_rate_addfame: 3.8, eng_rate_industry: 1.9, setup_time_addfame: '15 minute', setup_time_agency: '5–7 zile', selection_addfame: 'Automată', selection_agency: '3 zile manual', reporting_addfame: 'Real-time', reporting_agency: 'La final campaniei' }

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  // ── State ─────────────────────────────────────────────────────────────────
  const [campaign, setCampaign] = useState<any>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [influencerData, setInfluencerData] = useState<Record<string, any>>({})
  const [reviews, setReviews] = useState<any[]>([])
  const [agencyCosts, setAgencyCosts] = useState(DEFAULT_AGENCY_COSTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [collabLoading, setCollabLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [sortBy, setSortBy] = useState<'date' | 'followers' | 'rating'>('date')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedInfs, setSelectedInfs] = useState<string[]>([])
  const [bulkInviting, setBulkInviting] = useState(false)
  const [bulkRejectMode, setBulkRejectMode] = useState(false)
  const [selectedRejectIds, setSelectedRejectIds] = useState<string[]>([])
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const STANDARD_REJECT_MSG = 'Ne pare rău, am finalizat lista de influenceri pentru această campanie. Nu îți face griji — lansăm campanii noi des și șansele să fii selectat(ă) sunt mari! Te ținem la curent. 🙌'
  const [rejectModal, setRejectModal] = useState<{ collabId: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [profileModal, setProfileModal] = useState<any | null>(null)
  const [view, setView] = useState<'collabs' | 'stats'>('collabs')
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [draftPending, setDraftPending] = useState<string[]>([])

  const notify = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }
      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) { router.replace('/brand/dashboard'); return }
      const { data: camp, error: campErr } = await sb.from('campaigns').select('*').eq('id', campaignId).eq('brand_id', brand.id).single()
      if (campErr || !camp) { router.replace('/brand/campaigns'); return }
      setCampaign(camp)
      setEditForm(camp)
      const { data: collabData } = await sb.from('collaborations')
        .select('*, reserved_amount, payment_amount, platform_fee, deliverable_url, deliverable_note, deliverable_submitted_at, deliverable_approved_at, deliverable_rejected_at, deliverable_rejection_reason, completed_at, delivery_name, delivery_phone, delivery_address, delivery_city, delivery_county, delivery_postal_code, checked_in_at')
        .eq('campaign_id', campaignId).order('created_at', { ascending: false })
      const rows = collabData || []
      setCollabs(rows)
      const infIds = [...new Set(rows.map((c: any) => c.influencer_id).filter(Boolean))]
      if (infIds.length > 0) {
        const res = await fetch('/api/admin/influencer-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: infIds }) })
        if (res.ok) { const infs = await res.json(); setInfluencerData(Object.fromEntries((infs || []).map((i: any) => [i.id, i]))) }
      }
      const collabIds = rows.map((c: any) => c.id)
      if (collabIds.length > 0) {
        const { data: revData } = await sb.from('reviews').select('rating, comment, reviewer_role, created_at, collaboration_id').in('collaboration_id', collabIds).eq('reviewer_role', 'influencer')
        setReviews(revData || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [campaignId, router])

  useEffect(() => {
    fetchAll()
    getPlatformSettings('agency_comparison').then((res: any) => {
      if (res?.success && res.data?.value) {
        const v = res.data.value
        setAgencyCosts(prev => ({ ...prev, ...Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined)) }))
      }
    }).catch(() => {})
    const sb = createClient()
    const ch = sb.channel(`campaign-${campaignId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborations', filter: `campaign_id=eq.${campaignId}` }, () => fetchAll())
      .subscribe()
    const onOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => { sb.removeChannel(ch); document.removeEventListener('mousedown', onOutside) }
  }, [fetchAll, campaignId])

  // ── Actions ────────────────────────────────────────────────────────────────
  async function changeStatus(s: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
    setMenuOpen(false)
    // Publicarea unui draft = plata taxei per influencer → confirmare cu suma exactă
    const isPublish = s === 'ACTIVE' && ['DRAFT', 'REJECTED'].includes(campaign?.status)
    if (isPublish) {
      const info: any = await getCampaignFeeInfo().catch(() => null)
      const slots = campaign?.max_influencers || 1
      if (info) {
        const total = slots * (info.price || 0)
        if ((info.available || 0) < total) {
          notify(`❌ Sold insuficient: publicarea costă ${total.toLocaleString('ro-RO')} RON (${slots} × ${info.price} RON), ai ${Number(info.available || 0).toLocaleString('ro-RO')} RON. Adaugă credite din Wallet.`, false)
          return
        }
        if (!confirm(`Publicarea costă ${total.toLocaleString('ro-RO')} RON (${slots} influenceri × ${info.price} RON) și se plătește din wallet.\n\nLocurile neocupate se returnează la închiderea campaniei. Continui?`)) return
      }
    }
    setStatusLoading(true)
    try {
      const res: any = await updateCampaignStatus(campaignId, s)
      if (!res.success) throw new Error(res.error)
      if (res.pendingReview) {
        setCampaign((p: any) => p ? { ...p, status: 'PENDING_REVIEW' } : null)
        notify(`✅ Taxa de ${Number(res.feeCharged || 0).toLocaleString('ro-RO')} RON a fost plătită. Campania a fost trimisă spre aprobare.`)
        return
      }
      setCampaign((p: any) => p ? { ...p, status: s } : null)
      notify({ ACTIVE: '🚀 Publicat! Influencerii pot aplica acum.', DRAFT: 'Mutat în draft.', PAUSED: 'Campanie pauzată.', COMPLETED: 'Marcată ca finalizată.' }[s] ?? 'Actualizat.')
      if (s === 'ACTIVE') fetch('/api/notify/campaign-launched', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId }) }).catch(console.error)
    } catch (e: any) { notify(e.message || 'Eroare la actualizare.', false) }
    finally { setStatusLoading(false) }
  }

  async function saveEdit() {
    if (!campaign) return
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Neautentificat')
      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) throw new Error('Brand negăsit')
      const patch = { title: editForm.title, description: editForm.description, budget: Number(editForm.budget), deliverables: editForm.deliverables, deadline: editForm.deadline, platforms: editForm.platforms, niches: editForm.niches, countries: editForm.countries }
      const { error } = await sb.from('campaigns').update(patch).eq('id', campaignId).eq('brand_id', brand.id)
      if (error) throw error
      setCampaign((p: any) => p ? { ...p, ...patch } : null)
      setEditing(false)
      notify('✅ Campanie actualizată!')
    } catch (e: any) { notify(e.message || 'Eroare la salvare.', false) }
    finally { setSaving(false) }
  }

  async function collabAction(collabId: string, newStatus: 'ACTIVE' | 'REJECTED' | 'COMPLETED') {
    if (newStatus === 'REJECTED') {
      const collab = collabs.find(c => c.id === collabId)
      const inf = influencerData[collab?.influencer_id]
      setRejectModal({ collabId, name: inf?.name || 'Influencer' })
      return
    }
    setCollabLoading(collabId)
    try {
      const sb = createClient()
      const update: any = { status: newStatus }
      if (newStatus === 'COMPLETED') update.completed_at = new Date().toISOString()
      if (newStatus === 'ACTIVE') {
        // Selecția trece prin server: verifică locurile plătite / escrow și actualizează contorul
        const res: any = await approveApplication(collabId)
        if (res?.error) throw new Error(res.error)
      } else if (newStatus === 'COMPLETED') {
        // Aprobarea postării trece prin server: plata, scorul creatorului și notificările
        const res: any = await approveDeliverable(collabId)
        if (res?.error) {
          throw new Error(res.error === 'No deliverable submitted'
            ? 'Influencerul nu a trimis încă dovada postării.'
            : res.error === 'Already completed' ? 'Colaborarea este deja finalizată.' : res.error)
        }
        update.deliverable_approved_at = update.completed_at
      } else {
        const { error } = await sb.from('collaborations').update(update).eq('id', collabId)
        if (error) throw error
      }
      setCollabs((prev: any[]) => prev.map(c => c.id === collabId ? { ...c, ...update } : c))
      if (newStatus === 'ACTIVE') {
        const newCount = collabs.filter(c => c.id === collabId ? true : ['ACTIVE', 'COMPLETED'].includes(c.status)).length
        setCampaign((prev: any) => ({ ...prev, current_influencers: newCount }))
        if (campaign.max_influencers && newCount >= campaign.max_influencers) {
          await sb.from('campaigns').update({ registrations_open: false }).eq('id', campaign.id)
          setCampaign((prev: any) => ({ ...prev, registrations_open: false }))
          notify('✅ Influencer aprobat! Toate locurile sunt ocupate — înscrierile au fost închise automat.')
        } else {
          notify(`✅ Influencer aprobat! Mai sunt ${(campaign.max_influencers || 0) - newCount} locuri disponibile.`)
        }
      } else {
        notify({ COMPLETED: '🎉 Finalizat!' }[newStatus] ?? 'Actualizat.', true)
      }
    } catch (e: any) { notify(e.message || 'Acțiune eșuată.', false) }
    finally { setCollabLoading(null) }
  }

  async function rejectWithMessage() {
    if (!rejectModal) return
    setRejecting(true)
    try {
      const sb = createClient()
      await sb.from('collaborations').update({ status: 'REJECTED', rejection_reason: rejectReason || null }).eq('id', rejectModal.collabId)
      const collab = collabs.find(c => c.id === rejectModal.collabId)
      if (collab) {
        const { data: inf } = await sb.from('influencers').select('user_id, name, email').eq('id', collab.influencer_id).single()
        if (inf?.user_id) await sb.from('notifications').insert({ user_id: inf.user_id, title: '❌ Aplicație refuzată', body: rejectReason ? `${campaign?.brand_name || 'Brandul'} a refuzat aplicația ta: "${rejectReason}"` : `${campaign?.brand_name || 'Brandul'} a refuzat aplicația ta la campania "${campaign?.title}".`, link: '/influencer/collaborations', read: false })
        if (inf?.email) await fetch('/api/email/rejection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: inf.email, name: inf.name || 'Influencer', campaignTitle: campaign?.title || '', brandName: campaign?.brand_name || '', reason: rejectReason || null }) })
      }
      setCollabs(prev => prev.map(c => c.id === rejectModal.collabId ? { ...c, status: 'REJECTED', rejection_reason: rejectReason } : c))
      const rejectedCollab = collabs.find(c => c.id === rejectModal.collabId)
      if (rejectedCollab?.status === 'ACTIVE') {
        const newCount = collabs.filter(c => c.id !== rejectModal.collabId && ['ACTIVE', 'COMPLETED'].includes(c.status)).length
        const sb2 = createClient()
        await sb2.from('campaigns').update({ current_influencers: newCount }).eq('id', campaign.id)
        setCampaign((prev: any) => ({ ...prev, current_influencers: newCount }))
      }
      notify('Aplicație refuzată.')
      setRejectModal(null); setRejectReason('')
    } catch (e: any) { notify(e.message || 'Eroare.', false) }
    finally { setRejecting(false) }
  }

  async function bulkReject() {
    if (selectedRejectIds.length === 0) return
    setBulkRejecting(true)
    try {
      const sb = createClient()
      for (const collabId of selectedRejectIds) {
        const collab = collabs.find(c => c.id === collabId)
        await sb.from('collaborations').update({ status: 'REJECTED', rejection_reason: STANDARD_REJECT_MSG }).eq('id', collabId)
        if (collab?.influencers?.user_id) await sb.from('notifications').insert({ user_id: collab.influencers.user_id, title: '😔 Aplicație refuzată', body: STANDARD_REJECT_MSG, link: '/influencer/campaigns', read: false })
      }
      setCollabs(prev => prev.map(c => selectedRejectIds.includes(c.id) ? { ...c, status: 'REJECTED', rejection_reason: STANDARD_REJECT_MSG } : c))
      notify(`✅ ${selectedRejectIds.length} aplicații refuzate cu mesaj standard.`)
      setSelectedRejectIds([]); setBulkRejectMode(false)
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setBulkRejecting(false) }
  }

  async function bulkInvite() {
    if (selectedInfs.length === 0) return
    setBulkInviting(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Neautentificat')
      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) throw new Error('Brand negăsit')
      const toInsert = selectedInfs.map(infId => ({ campaign_id: campaignId, influencer_id: infId, brand_id: brand.id, status: 'INVITED', message: 'Ai fost invitat să colaborezi la această campanie.' }))
      const { error } = await sb.from('collaborations').upsert(toInsert, { onConflict: 'campaign_id,influencer_id' })
      if (error) throw error
      for (const infId of selectedInfs) {
        const inf = influencerData[infId]
        const notifLink = campaign?.campaign_type === 'OPEN_CALL' ? `/influencer/castinguri/${campaignId}` : '/influencer/collaborations'
        if (inf?.user_id) await sb.from('notifications').insert({ user_id: inf.user_id, title: campaign?.campaign_type === 'OPEN_CALL' ? '🎪 Eveniment nou!' : '🎉 Invitație nouă!', body: campaign?.campaign_type === 'OPEN_CALL' ? `${campaign?.brand_name || 'Un brand'} te invită la evenimentul "${campaign?.title}". Vezi detaliile și înscrie-te!` : `${campaign?.brand_name || 'Un brand'} te-a invitat la campania "${campaign?.title}". Verifică detaliile!`, link: notifLink, read: false })
      }
      notify(`✅ ${selectedInfs.length} influencer${selectedInfs.length > 1 ? 'i invitați' : ' invitat'}!`)
      setSelectedInfs([]); setBulkMode(false)
      await fetchAll()
    } catch (e: any) { notify(e.message || 'Eroare la invitație.', false) }
    finally { setBulkInviting(false) }
  }

  useEffect(() => {
    if (!campaign?.id) return
    fetch(`/api/deliverables/pending?campaignId=${campaign.id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { collabIds: [] })
      .then(j => setDraftPending(j.collabIds || []))
      .catch(() => {})
  }, [campaign?.id, collabs.length])

  // ── Analytics ──────────────────────────────────────────────────────────────
  const activeAndCompleted = collabs.filter(c => ['ACTIVE', 'COMPLETED'].includes(c.status))
  const completedCollabs = collabs.filter(c => c.status === 'COMPLETED')

  const getFollowers = (inf: any) => {
    if (!inf) return 0
    let followers = (inf.ig_followers || inf.instagram_followers || 0) + (inf.tt_followers || inf.tiktok_followers || 0) + (inf.youtube_subscribers || inf.yt_subscribers || 0)
    if (followers === 0 && inf.platforms?.length > 0) {
      followers = inf.platforms.reduce((s: number, p: any) => {
        const raw = String(p.followers || p.follower_count || '0').toUpperCase().trim()
        let n = 0
        if (raw.endsWith('K')) n = parseFloat(raw) * 1000
        else if (raw.endsWith('M')) n = parseFloat(raw) * 1000000
        else n = parseInt(raw.replace(/\D/g, '')) || 0
        return s + n
      }, 0)
    }
    return followers
  }

  const totalReach = activeAndCompleted.reduce((sum, c) => sum + getFollowers(influencerData[c.influencer_id]), 0)
  const totalSpent = completedCollabs.reduce((s, c) => s + (c.payment_amount || 0) + (c.platform_fee || 0), 0)
  const completionRate = collabs.length > 0 ? Math.round((completedCollabs.length / collabs.length) * 100) : 0
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null
  const costPerCompleted = completedCollabs.length > 0 ? Math.round(totalSpent / completedCollabs.length) : null
  const budgetUsedPct = campaign?.budget > 0 ? Math.min(100, Math.round((totalSpent / campaign.budget) * 100)) : 0

  const counts = {
    all: collabs.length,
    pending: collabs.filter(c => c.status === 'PENDING').length,
    invited: collabs.filter(c => c.status === 'INVITED').length,
    active: collabs.filter(c => c.status === 'ACTIVE').length,
    completed: completedCollabs.length,
    rejected: collabs.filter(c => c.status === 'REJECTED').length,
  }

  const tabFilter: Record<Tab, string[]> = { all: ['INVITED', 'PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED'], pending: ['PENDING'], invited: ['INVITED'], active: ['ACTIVE'], completed: ['COMPLETED'], rejected: ['REJECTED'] }

  const visible = collabs.filter(c => tabFilter[tab].includes(c.status)).sort((a, b) => {
    const infA = influencerData[a.influencer_id], infB = influencerData[b.influencer_id]
    if (sortBy === 'followers') { const fa = (infA?.ig_followers || 0) + (infA?.tt_followers || 0), fb = (infB?.ig_followers || 0) + (infB?.tt_followers || 0); if (fb !== fa) return fb - fa; return (infB?.avg_rating || 0) - (infA?.avg_rating || 0) }
    if (sortBy === 'rating') return (infB?.avg_rating || 0) - (infA?.avg_rating || 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const reviewItems = collabs
    .filter(c => c.status === 'ACTIVE' && ((!!c.deliverable_submitted_at && !c.deliverable_approved_at) || draftPending.includes(c.id)))
    .map(c => ({ c, draft: draftPending.includes(c.id), proof: !!c.deliverable_submitted_at && !c.deliverable_approved_at }))
  const goToCollab = (id: string) => {
    setView('collabs'); setTab('active'); setOpenCards(o => ({ ...o, [id]: true }))
    setTimeout(() => document.getElementById(`collab-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-t-violet-500 border-violet-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm text-gray-400 font-semibold">Se încarcă campania…</p>
      </div>
    </div>
  )

  if (!campaign) return null

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto" style={{ fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" }}>
      <style>{`
        .brand-grad { background: linear-gradient(135deg,#2f6fe0, #5a35e6); }
        .card { background:white; border:1.5px solid #f0f0f0; border-radius:20px; }
        .tab-btn { padding:7px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;transition:all .15s;white-space:nowrap;font-family:inherit; }
        .tab-btn.on { background:linear-gradient(135deg,#2f6fe0, #5a35e6);color:white;box-shadow:0 3px 10px rgba(90,53,230,.28); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#f5f3ff;color:#5a35e6; }
        .btn-pub { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:800;background:linear-gradient(135deg,#2f6fe0, #5a35e6);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-pub:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 6px 18px rgba(90,53,230,.38); }
        .btn-pub:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .btn-sec { display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:12px;font-size:14px;font-weight:700;background:white;color:#374151;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-sec:hover:not(:disabled) { border-color:#d1d5db;background:#f9fafb; }
        .btn-approve { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-approve:hover:not(:disabled) { transform:translateY(-1px);box-shadow:0 4px 12px rgba(34,197,94,.35); }
        .btn-decline { display:inline-flex;align-items:center;gap:5px;padding:7px 14px;border-radius:10px;font-size:13px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-decline:hover:not(:disabled) { border-color:#fca5a5;color:#ef4444;background:#fff5f5; }
        .btn-approve:disabled,.btn-decline:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .badge { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700; }
        .field { width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s;font-family:inherit;color:#111; }
        .field:focus { border-color:#5a35e6;box-shadow:0 0 0 4px rgba(90,53,230,.08); }
        .dropdown { position:absolute;right:0;top:calc(100%+6px);background:white;border:1.5px solid #f0f0f0;border-radius:14px;padding:6px;z-index:50;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,.12); }
        .d-item { display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:inherit;color:#374151;transition:background .1s; }
        .d-item:hover { background:#f9fafb; }
        .d-item.red { color:#ef4444; } .d-item.red:hover { background:#fef2f2; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideD { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        .dd-anim { animation:slideD .18s ease; }
        .card-anim { animation:fadeUp .35s ease both; }
        ${collabCss}
        @media (max-width: 640px) {
          .cl-card { flex-wrap: wrap; gap: 10px !important; padding: 14px !important; }
          .cl-avatar { width: 44px !important; height: 44px !important; }
          .cl-body { display: contents; }
          .cl-head { flex: 1 1 0; min-width: 0; flex-direction: column; flex-wrap: nowrap !important; gap: 10px !important; }
          .cl-head > div { max-width: 100%; }
          .cl-head .cl-actions { align-items: flex-start !important; width: 100%; }
          .cl-head .cl-actions > * { justify-content: flex-start !important; }
          .cl-body > *:not(.cl-head) { flex: 0 0 100%; width: 100%; min-width: 0; box-sizing: border-box; margin-top: 0 !important; }
          .cl-list { max-height: 460px !important; }
          .cl-toolbar { flex-direction: column; align-items: flex-start !important; }
          .cl-toolbar > div { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── Modals ── */}
      {showDraftModal && <DraftModal campaign={campaign} statusLoading={statusLoading} onConfirm={() => { setShowDraftModal(false); changeStatus('PAUSED') }} onClose={() => setShowDraftModal(false)} />}
      {showPauseModal && <PauseModal campaign={campaign} statusLoading={statusLoading} onConfirm={() => { setShowPauseModal(false); changeStatus('PAUSED') }} onClose={() => setShowPauseModal(false)} />}
      {profileModal && <ProfileModal profileModal={profileModal} onClose={() => setProfileModal(null)} />}
      {rejectModal && <RejectModal rejectModal={rejectModal} rejectReason={rejectReason} setRejectReason={setRejectReason} rejecting={rejecting} onConfirm={rejectWithMessage} onClose={() => { setRejectModal(null); setRejectReason('') }} />}

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <Link href="/brand/campaigns" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Înapoi la campanii
      </Link>

      {/* ── Sections ── */}
      <CampaignHero
        campaign={campaign} collabs={collabs} counts={counts}
        editing={editing} editForm={editForm} setEditForm={setEditForm}
        saving={saving} statusLoading={statusLoading}
        menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef}
        onRefresh={fetchAll} onSaveEdit={saveEdit}
        onCancelEdit={() => { setEditing(false); setEditForm(campaign) }}
        onStartEdit={() => setEditing(true)}
        onChangeStatus={changeStatus}
        onShowPause={() => setShowPauseModal(true)}
        onShowDraft={() => setShowDraftModal(true)}
        onDuplicate={async () => {
          setMenuOpen(false)
          const result = await duplicateBarterCampaign(campaign.id)
          if (result.success && result.campaignId) {
            router.push(`/brand/campaigns/new/barter?draftId=${result.campaignId}`)
          } else {
            alert(result.error || 'Eroare la duplicare.')
          }
        }}
      />

      {/* ── De revizuit ── */}
      {reviewItems.length > 0 && (
        <div className="card p-5 mb-5 card-anim" style={{ borderColor: '#fcd34d', background: '#fffbeb' }}>
          <p className="font-black text-amber-900 text-base mb-1">{reviewItems.length} {reviewItems.length === 1 ? 'livrabil așteaptă' : 'livrabile așteaptă'} răspunsul tău</p>
          <p className="text-xs text-amber-800 mb-3">Apasă pe un creator ca să vezi draftul sau dovada postării și să decizi.</p>
          <div className="flex flex-wrap gap-2">
            {reviewItems.map(({ c, draft, proof }) => (
              <button key={c.id} type="button" onClick={() => goToCollab(c.id)}
                className="inline-flex items-center gap-2 bg-white border border-amber-300 hover:border-amber-500 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 transition">
                {influencerData[c.influencer_id]?.name || 'Creator'}
                <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">{draft ? 'Draft video' : 'Dovadă post'}{draft && proof ? ' + dovadă' : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigare principală ── */}
      <div className="flex gap-2 mb-5">
        {([{ k: 'collabs', l: `Colaborări (${collabs.length})` }, { k: 'stats', l: 'Statistici și economii' }] as const).map(t => (
          <button key={t.k} className={`tab-btn ${view === t.k ? 'on' : ''}`} onClick={() => setView(t.k)}>{t.l}</button>
        ))}
      </div>

      {view === 'stats' && (
        <>
          <CampaignAnalytics
            campaign={campaign} collabs={collabs} counts={counts}
            totalReach={totalReach} totalSpent={totalSpent}
            completionRate={completionRate} avgRating={avgRating}
            costPerCompleted={costPerCompleted} budgetUsedPct={budgetUsedPct}
            activeAndCompleted={activeAndCompleted} completedCollabs={completedCollabs}
            reviews={reviews}
          />
          <CampaignSavings agencyCosts={agencyCosts} collabs={collabs} />
        </>
      )}

      {/* ── Colaborări ── */}
      {view === 'collabs' && (
      <div className="card p-5 card-anim" style={{ animationDelay: '.08s' }}>
        <CollabToolbar
          title="Aplicanți și colaborări"
          subtitle={<>
            {counts.pending > 0 && <b style={{ color: '#854d0e' }}>{counts.pending} aplicate · </b>}
            {counts.invited > 0 && <b style={{ color: '#1d4ed8' }}>{counts.invited} invitați · </b>}
            {counts.active > 0 && <b style={{ color: '#4423c4' }}>{counts.active} activi · </b>}
            {collabs.length} total
          </>}
          actions={bulkRejectMode ? (
            <>
              <button className="cx-btn" onClick={() => { setBulkRejectMode(false); setSelectedRejectIds([]) }}>Anulează</button>
              <button className="cx-btn" onClick={() => { const pendingIds = collabs.filter(c => c.status === 'PENDING').map(c => c.id); setSelectedRejectIds(selectedRejectIds.length === pendingIds.length ? [] : pendingIds) }}>{selectedRejectIds.length === collabs.filter(c => c.status === 'PENDING').length ? 'Deselectează tot' : 'Selectează tot'}</button>
              <button className="cx-btn p" style={{ background: '#b42318', borderColor: '#b42318' }} onClick={bulkReject} disabled={selectedRejectIds.length === 0 || bulkRejecting}>{bulkRejecting ? '…' : 'Refuză'} {selectedRejectIds.length > 0 ? `(${selectedRejectIds.length})` : 'selectați'}</button>
            </>
          ) : bulkMode ? (
            <>
              <button className="cx-btn" onClick={() => { setBulkMode(false); setSelectedInfs([]) }}>Anulează</button>
              <button className="cx-btn p" onClick={bulkInvite} disabled={selectedInfs.length === 0 || bulkInviting}>{bulkInviting ? '…' : <Send className="w-3.5 h-3.5" />} Invită {selectedInfs.length > 0 ? `(${selectedInfs.length})` : 'selectați'}</button>
            </>
          ) : (
            <>
              {tab === 'pending' && counts.pending > 0 && <button className="cx-btn d" onClick={() => { setBulkRejectMode(true); setBulkMode(false) }}>Refuză în masă</button>}
              <button className="cx-btn" onClick={() => setBulkMode(true)}>Invită în masă</button>
              <Link href="/brand/influencers" className="cx-btn p">Invită creator</Link>
            </>
          )}
          filters={[{ key: 'all', label: 'Toți', count: counts.all }, { key: 'pending', label: 'Aplicate', count: counts.pending }, { key: 'invited', label: 'Invitați', count: counts.invited }, { key: 'active', label: 'Activi', count: counts.active }, { key: 'completed', label: 'Finalizați', count: counts.completed }, { key: 'rejected', label: 'Refuzați', count: counts.rejected }]}
          tab={tab} onTab={setTab} sortBy={sortBy} onSort={setSortBy}
        />

        {/* Collab list */}
        {visible.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3"><Users className="w-7 h-7 text-orange-200" /></div>
            <p className="font-black text-gray-500 mb-1">{tab === 'all' ? 'Nicio colaborare încă' : `Nicio colaborare ${tab}`}</p>
            <p className="text-sm text-gray-400 mb-4 max-w-xs mx-auto">{campaign.status === 'DRAFT' ? 'Publică campania pentru ca influencerii să poată aplica.' : tab === 'all' ? 'Influencerii vor apărea aici odată ce aplică sau sunt invitați.' : ''}</p>
            {campaign.status === 'DRAFT' && <button className="btn-pub" onClick={() => changeStatus('ACTIVE')} disabled={statusLoading}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> Publică campania</button>}
          </div>
        ) : (
          <>
          <div className="cx-list">
            {visible.map(collab => {
              const inf = influencerData[collab.influencer_id]
              const cst = COLLAB_CFG[collab.status] ?? COLLAB_CFG.PENDING
              const isPending = collab.status === 'PENDING'
              const isInvited = collab.status === 'INVITED'
              const isActive = collab.status === 'ACTIVE'
              const isBusy = collabLoading === collab.id
              const hasPendingDeliverable = isActive && !!collab.deliverable_submitted_at && !collab.deliverable_approved_at
              const packageSent = isActive && !!collab.package_sent_at && !collab.package_received_at
              const packageReceived = isActive && !!collab.package_received_at
              const noPackage = isActive && !collab.package_sent_at
              const infSlug = inf?.slug || collab.influencer_id
              const needsAttention = hasPendingDeliverable || draftPending.includes(collab.id)
              const expanded = openCards[collab.id] ?? needsAttention
              const tone = ({ INVITED: 'blue', PENDING: 'amber', ACTIVE: 'purple', COMPLETED: 'green', REJECTED: 'gray' } as any)[collab.status] || 'gray'
              const reach = getFollowers(inf)
              const sub = [inf?.niches?.slice(0, 2).join(', '), reach > 0 ? `${fmtNum(reach)} urmăritori` : null].filter(Boolean).join(' · ')
              const openProfile = () => setProfileModal({ ...inf, _slug: infSlug })
              const spin = <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              return (
                <CollabCard
                  key={collab.id} id={collab.id} attention={needsAttention}
                  select={(bulkMode && isInvited) ? <input type="checkbox" className="cx-check" checked={selectedInfs.includes(collab.influencer_id)} onChange={e => setSelectedInfs(prev => e.target.checked ? [...prev, collab.influencer_id] : prev.filter(id => id !== collab.influencer_id))} aria-label="Selectează" />
                    : (bulkRejectMode && isPending) ? <input type="checkbox" className="cx-check" checked={selectedRejectIds.includes(collab.id)} onChange={e => setSelectedRejectIds(prev => e.target.checked ? [...prev, collab.id] : prev.filter(id => id !== collab.id))} aria-label="Selectează" /> : undefined}
                  avatar={inf?.avatar ? <img src={inf.avatar} alt="" /> : <span>{inf?.name?.[0]?.toUpperCase() ?? '?'}</span>}
                  onAvatar={openProfile} name={inf?.name ?? 'Creator necunoscut'} onName={openProfile} sub={sub}
                  status={cst.label} tone={tone}
                  badges={isActive ? (
                    <>
                      {packageSent && <span className="cx-pill blue">Produs trimis</span>}
                      {packageReceived && <span className="cx-pill green">Produs primit</span>}
                      {noPackage && <span className="cx-pill">Produs netrimis</span>}
                      {campaign?.delivery_method === 'pickup' && (collab.checked_in_at ? <span className="cx-pill indigo">La locație</span> : <span className="cx-pill">Neconfirmat la locație</span>)}
                    </>
                  ) : undefined}
                  profileHref={`/influencer/${infSlug}`}
                  notice={isInvited ? <div className="cx-note">Așteaptă răspunsul creatorului</div> : undefined}
                  actions={isInvited ? (
                    <button className="cx-btn d" onClick={() => collabAction(collab.id, 'REJECTED')} disabled={isBusy}>{isBusy ? spin : 'Anulează invitația'}</button>
                  ) : isPending ? (
                    <>
                      <button className="cx-btn" onClick={() => collabAction(collab.id, 'REJECTED')} disabled={isBusy}>{isBusy ? spin : 'Refuză'}</button>
                      <button className="cx-btn p" onClick={() => collabAction(collab.id, 'ACTIVE')} disabled={isBusy} style={{ flexGrow: 1.4 }}>{isBusy ? spin : 'Aprobă'}</button>
                    </>
                  ) : isActive ? (
                    <button className="cx-btn d s" onClick={() => collabAction(collab.id, 'REJECTED')} disabled={isBusy}>{isBusy ? spin : 'Refuză colaborarea'}</button>
                  ) : undefined}
                  actionsEnd={isActive}
                  meta={`${collab.status === 'INVITED' ? 'Invitat' : 'Aplicat'} ${new Date(collab.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}`}
                  expanded={expanded} onToggle={() => setOpenCards(o => ({ ...o, [collab.id]: !expanded }))}
                >
                    {collab.delivery_name && (
                      <div className="mt-3 p-3 rounded-xl border border-orange-200 bg-orange-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black text-orange-700">📦 Adresă livrare produs</p>
                          <button onClick={() => navigator.clipboard.writeText(`${collab.delivery_name}\n${collab.delivery_phone}\n${collab.delivery_address}\n${collab.delivery_city}, ${collab.delivery_county} ${collab.delivery_postal_code || ''}`)} className="text-[10px] font-black text-orange-600 hover:text-orange-800 transition">📋 Copiază</button>
                        </div>
                        <p className="text-xs font-black text-gray-800">{collab.delivery_name}</p>
                        <p className="text-xs text-gray-600">📞 {collab.delivery_phone}</p>
                        <p className="text-xs text-gray-600">🏠 {collab.delivery_address}</p>
                        <p className="text-xs text-gray-600">📍 {collab.delivery_city}, {collab.delivery_county}{collab.delivery_postal_code ? `, ${collab.delivery_postal_code}` : ''}</p>
                      </div>
                    )}

                    {(isActive || collab.status === 'COMPLETED') && (
                      <div className="mt-3"><DraftReview collabId={collab.id} role="brand" onChanged={() => fetch(`/api/deliverables/pending?campaignId=${campaign.id}`).then(r => r.json()).then(j => setDraftPending(j.collabIds || [])).catch(() => {})} /></div>
                    )}

                    {collab.deliverable_url && (
                      <div className="mt-3 p-3 rounded-xl border-2 border-orange-200 bg-orange-50">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-black text-orange-700">📦 Dovadă post trimisă</p>
                          {isActive && !collab.deliverable_approved_at && <button onClick={() => collabAction(collab.id, 'COMPLETED')} disabled={isBusy} className="text-xs font-black text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded-lg transition disabled:opacity-50">{isBusy ? '…' : '✓ Aprobă & eliberează plata'}</button>}
                        </div>
                        <a href={collab.deliverable_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-orange-600 underline hover:text-orange-800 break-all">{collab.deliverable_url}</a>
                        {collab.deliverable_note && <p className="text-xs text-orange-600 mt-1.5 italic">"{collab.deliverable_note}"</p>}
                        {collab.status === 'COMPLETED' && (
                          <div className="mt-2">
                            <p className="text-xs font-black text-green-600 mb-2">✅ Finalizat {collab.completed_at ? new Date(collab.completed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : ''}{collab.payment_amount ? ` · ${fmt(collab.payment_amount)} plătiți` : ''}</p>
                            <LeaveReview collaborationId={collab.id} reviewerRole="brand" targetName={inf?.name || 'Influencer'} onSaved={() => {}} />
                          </div>
                        )}
                      </div>
                    )}

                    {collab.message && collab.message !== 'You have been invited to collaborate on a campaign.' && (
                      <div className="flex items-start gap-2 mt-2 bg-gray-50 rounded-xl p-3">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 italic">"{collab.message}"</p>
                      </div>
                    )}

                </CollabCard>
              )
            })}
          </div>
          {visible.length > 3 && <p className="text-center text-xs font-bold text-gray-400 mt-2">Derulează lista · {visible.length} în această categorie</p>}
          </>
        )}
      </div>
      )}
    </div>
  )
}
