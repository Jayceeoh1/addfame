'use client'
// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, Wallet, CheckCircle, Clock, ChevronRight,
  Star, AlertCircle, AlertTriangle, Ban, Search, Mail, Instagram, Youtube
} from 'lucide-react'
import Link from 'next/link'
import { AvatarWithBadge } from '@/components/shared/CreatorBadge'
import { BADGE_IMAGES, LEVEL_CONFIG, getCreatorLevel } from '@/lib/creator-score'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { PointEventsSection } from '@/components/shared/PointEventCard'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" />
    </svg>
  )
}

function fmtFollowers(n: number) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function daysUntil(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function profileCompletion(p: any) {
  if (!p) return { pct: 0, missing: [] }
  const checks = [
    { done: !!p.name, label: 'Nume complet' },
    { done: !!p.bio, label: 'Bio' },
    { done: !!p.avatar, label: 'Poză profil' },
    { done: p.niches?.length > 0, label: 'Nișe' },
    { done: Array.isArray(p.platforms) && p.platforms.length > 0, label: 'Platforme sociale' },
  ]
  return {
    pct: Math.round(checks.filter(c => c.done).length / checks.length * 100),
    missing: checks.filter(c => !c.done).map(c => c.label),
  }
}

function FeedbackButton({ userId }: { userId: string | null }) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existing, setExisting] = useState<{ rating: number; comment: string } | null>(null)

  useEffect(() => {
    if (!userId) return
    fetch('/api/platform-review')
      .then(r => r.json())
      .then(d => {
        if (d.existing) {
          setExisting(d.existing)
          setRating(d.existing.rating)
          setComment(d.existing.comment || '')
        }
      })
  }, [userId])

  async function submit() {
    if (!rating) return
    setSaving(true)
    const res = await fetch('/api/platform-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment, role: 'influencer' }),
    })
    if (res.ok) {
      setSaved(true)
      setExisting({ rating, comment })
      setTimeout(() => { setOpen(false); setSaved(false) }, 1800)
    }
    setSaving(false)
  }

  if (existing) return null
  const colors = ['', '#ef4444', '#5a35e6', '#eab308', '#22c55e', '#8b5cf6']
  const labels = ['', 'Foarte slab', 'Slab', 'Ok', 'Bun', 'Excelent']

  return (
    <>
      {/* Buton flotant */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 40,
          background: existing ? '#ede9fe' : 'linear-gradient(135deg,#7040f0,#9030f0)',
          color: existing ? '#7c3aed' : 'white',
          border: 'none', borderRadius: 99, padding: '8px 14px',
          fontSize: 12, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ fontSize: 14 }}>⭐</span>
        {existing ? `Recenzia ta: ${existing.rating}/5` : 'Evaluează platforma'}
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 20px' }}
        >
          <div style={{ background: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, margin: '0 16px' }}>

            {saved ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Mulțumim!</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Feedback-ul tău contează pentru noi.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>
                      {existing ? 'Modifică recenzia' : 'Cum ți se pare AddFame?'}
                    </p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Feedback-ul tău ne ajută să îmbunătățim platforma</p>
                  </div>
                  <button onClick={() => setOpen(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#6b7280' }}>✕</button>
                </div>

                {/* Stele */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 32, transition: 'transform .1s', transform: (hover || rating) >= s ? 'scale(1.15)' : 'scale(1)' }}
                    >
                      <span style={{ color: (hover || rating) >= s ? '#f59e0b' : '#d1d5db' }}>★</span>
                    </button>
                  ))}
                </div>

                {/* Label rating */}
                <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: colors[hover || rating] || '#9ca3af', margin: '0 0 16px', height: 18 }}>
                  {labels[hover || rating] || 'Selectează un rating'}
                </p>

                {/* Comentariu */}
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Spune-ne ce îți place sau ce am putea îmbunătăți... (opțional)"
                  rows={3}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#374151' }}
                />

                <button
                  onClick={submit}
                  disabled={!rating || saving}
                  style={{
                    width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none',
                    background: rating ? 'linear-gradient(135deg,#7040f0,#9030f0)' : '#e5e7eb',
                    color: rating ? 'white' : '#9ca3af', fontSize: 14, fontWeight: 800,
                    cursor: rating ? 'pointer' : 'not-allowed', transition: 'all .15s',
                  }}
                >
                  {saving ? 'Se trimite...' : existing ? 'Actualizează recenzia' : 'Trimite feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function InfluencerDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [brandReferrals, setBrandReferrals] = useState<any[]>([])
  const [collabs, setCollabs] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [thisMonthEarned, setThisMonthEarned] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [topInfluencers, setTopInfluencers] = useState<any[]>([])
  const [recentClips, setRecentClips] = useState<any[]>([])
  const [toast, setToast] = useState<any>(null)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: inf } = await sb.from('influencers').select('*').eq('user_id', user.id).single()
      setUserId(user.id)
      if (!inf) { setLoading(false); return }
      setProfile(inf)

      const [collabRes, campRes, txRes] = await Promise.all([
        sb.from('collaborations')
          .select('*, campaigns(title, brand_name, budget_per_influencer, deadline, platforms, niches, registrations_open, registration_opened_at, registration_deadline_days, campaign_type, delivery_method)')
          .eq('influencer_id', inf.id)
          .order('created_at', { ascending: false })
          .limit(10),
        sb.from('campaigns')
          .select('id, title, brand_name, brand_id, budget_per_influencer, deadline, platforms, niches, campaign_type')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(6),
        sb.from('transactions')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(20),
      ])

      const camps = campRes.data ?? []

      // Fetch brand logos separately
      const brandIds = camps.map((c: any) => c.brand_id).filter(Boolean)
      let brandLogos: Record<string, string> = {}
      if (brandIds.length > 0) {
        const { data: brands } = await sb.from('brands').select('id, logo').in('id', brandIds)
        if (brands) brands.forEach((b: any) => { if (b.logo) brandLogos[b.id] = b.logo })
      }
      const campsWithLogos = camps.map((c: any) => ({ ...c, brand_logo: brandLogos[c.brand_id] || null }))

      setCollabs(collabRes.data ?? [])
      setCampaigns(campsWithLogos)

      if (txRes.data) {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        setThisMonthEarned(
          txRes.data
            .filter((t: any) => t.type === 'EARN' && new Date(t.created_at) >= start)
            .reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
        )
      }

      if (inf.referral_code) {
        try {
          const { data: refs } = await sb
            .from('influencers')
            .select('id, name, avatar, approval_status, referral_bonus_paid, created_at')
            .eq('referred_by', inf.referral_code)
            .order('created_at', { ascending: false })
          setReferrals(refs ?? [])
        } catch (_) { setReferrals([]) }
      }

      // Brand referrals
      if (inf.id) {
        try {
          const { data: brefs } = await sb
            .from('brand_referrals')
            .select('id, status, created_at, bonus1_paid_at, bonus2_paid_at, brands(id, name, email)')
            .eq('influencer_id', inf.id)
            .order('created_at', { ascending: false })
          setBrandReferrals(brefs ?? [])
        } catch (_) { setBrandReferrals([]) }
      }
      // Top influenceri — sortati dupa colaborari finalizate
      try {
        // Fetch colaborarile COMPLETED grupate per influencer
        const { data: collabCounts } = await sb
          .from('collaborations')
          .select('influencer_id')
          .eq('status', 'COMPLETED')

        // Numara per influencer
        const countMap: Record<string, number> = {}
        for (const c of collabCounts ?? []) {
          countMap[c.influencer_id] = (countMap[c.influencer_id] || 0) + 1
        }

        // Fetch toti influencerii aprobati
        const { data: topInf } = await sb
          .from('influencers')
          .select('id, name, avatar, niches, platforms, wallet_balance, total_earned, ig_followers, tt_followers, creator_score')
          .eq('approval_status', 'approved')

        if (topInf) {
          const withCollabs = topInf.map((inf: any) => ({
            ...inf,
            completed_collabs: countMap[inf.id] || 0,
          }))
          // Sortare: 1) deals DESC, 2) followers DESC
          const sorted = withCollabs.sort((a, b) =>
            b.completed_collabs !== a.completed_collabs
              ? b.completed_collabs - a.completed_collabs
              : (b.ig_followers + b.tt_followers) - (a.ig_followers + a.tt_followers)
          ).slice(0, 12) // max 12 in slider
          setTopInfluencers(sorted)
        }
      } catch (_) { }

      // Clipuri recente — colaborari cu deliverable_url (link postare)
      try {
        const { data: clips } = await sb
          .from('collaborations')
          .select('id, deliverable_url, thumbnail_url, influencers(name, avatar), campaigns(title, brand_name)')
          .eq('status', 'COMPLETED')
          .not('deliverable_url', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(5)
        setRecentClips(clips ?? [])
      } catch (_) { }

    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleInvite(collabId: string, action: 'accept' | 'decline') {
    setActionLoading(collabId)
    try {
      const sb = createClient()
      const newStatus = action === 'accept' ? 'ACTIVE' : 'REJECTED'
      const { error } = await sb.from('collaborations').update({ status: newStatus }).eq('id', collabId)
      if (error) throw error  // ex. campania nu mai are locuri disponibile
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: newStatus } : c))
      notify(action === 'accept' ? '🎉 Invitație acceptată!' : 'Invitație refuzată.')
    } catch (e: any) { notify(e.message, false) }
    finally { setActionLoading(null) }
  }

  function copyReferral() {
    const link = `${window.location.origin}/auth/register?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const firstName = profile?.name?.split(' ')[0] || 'Creator'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bună dimineața' : hour < 18 ? 'Bună ziua' : 'Bună seara'

  const activeCollabs = collabs.filter(c => c.status === 'ACTIVE')
  const awaitingPost = activeCollabs.filter(c => c.package_received_at && !c.deliverable_submitted_at)
  const allInvited = collabs.filter(c => c.status === 'INVITED' || c.status === 'PENDING_INFLUENCER')
  const isClosedInvite = (c: any) => {
    if (c.campaigns?.registrations_open === false) return true
    const openedAt = c.campaigns?.registration_opened_at
    const days = c.campaigns?.registration_deadline_days || 30
    if (!openedAt) return false
    return new Date(new Date(openedAt).getTime() + days * 86400000) < new Date()
  }
  const pendingInvites = allInvited.filter(c => !isClosedInvite(c))
  const closedInvites = allInvited.filter(c => isClosedInvite(c))

  const matchedCampaigns = campaigns.filter(c => {
    if (!profile?.niches?.length) return true
    return c.niches?.some((n: string) => profile.niches.includes(n))
  })
  const displayCampaigns = matchedCampaigns.length > 0 ? matchedCampaigns : campaigns

  const referralEarned = referrals.filter((r: any) => r.referral_bonus_paid).length * 15
  const referralPending = referrals.filter((r: any) => !r.referral_bonus_paid).length

  const { pct: profilePct, missing: profileMissing } = profileCompletion(profile)

  const checklistSteps = [
    { id: 'profile', label: 'Completează profilul', desc: 'Nume, bio și poză', href: '/influencer/profile', done: !!(profile?.name && profile?.bio && profile?.avatar) },
    { id: 'platforms', label: 'Adaugă platformele sociale', desc: 'Instagram, TikTok etc.', href: '/influencer/profile', done: Array.isArray(profile?.platforms) && profile.platforms.length > 0 },
    { id: 'niches', label: 'Selectează nișele', desc: 'Domenii de interes', href: '/influencer/profile', done: profile?.niches?.length > 0 },
    { id: 'campaign', label: 'Aplică la o campanie', desc: 'Prima colaborare', href: '/influencer/campaigns', done: collabs.length > 0 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #ede9fe', borderTopColor: '#7040f0' }} />
    </div>
  )

  // ── Stadiul fiecărei colaborări ──
  const needsDelivery = (c: any) => c.campaigns?.campaign_type === 'BARTER' && c.campaigns?.delivery_method === 'delivery'
  const postDaysLeft = (c: any) => {
    if (!c.package_received_at || !c.post_deadline_days) return null
    const msLeft = c.post_deadline_days * 86400000 - (Date.now() - new Date(c.package_received_at).getTime())
    return Math.ceil(msLeft / 86400000)
  }
  function collabStage(c: any) {
    const delivery = needsDelivery(c) || !!c.package_sent_at || !!c.package_received_at
    const labels = delivery ? ['Aplicat', 'Acceptat', 'Colet primit', 'Postat', 'Aprobat'] : ['Aplicat', 'Acceptat', 'Postat', 'Aprobat']
    const approved = !!c.deliverable_approved_at || c.status === 'COMPLETED'
    const submitted = !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
    const rejected = !!c.deliverable_rejected_at && !c.deliverable_submitted_at
    let at = 0, tag = '', tone = 'violet'
    if (c.status === 'PENDING') { at = 1; tag = 'Aștepți răspunsul brandului'; tone = 'neutral' }
    else if (approved) { at = labels.length; tag = c.status === 'COMPLETED' ? 'Finalizată' : 'Postare aprobată'; tone = 'green' }
    else if (submitted) { at = labels.length - 1; tag = 'Postare în verificare'; tone = 'blue' }
    else if (rejected) { at = labels.length - 2; tag = 'Postare respinsă — retrimite'; tone = 'red' }
    else if (delivery && !c.package_received_at) { at = 2; tag = c.package_sent_at ? 'Coletul e pe drum' : 'Brandul pregătește coletul'; tone = 'blue' }
    else { at = labels.length - 2; tag = 'Postează și trimite dovada'; tone = 'violet' }
    return { labels, at, tag, tone }
  }
  const TONE: Record<string, { bg: string; fg: string }> = {
    violet: { bg: '#f1eaff', fg: '#5420c0' }, blue: { bg: '#e6f0ff', fg: '#1d4fb8' },
    green: { bg: '#e3f6ec', fg: '#166534' }, red: { bg: '#fdecec', fg: '#b42318' }, neutral: { bg: '#f0eff7', fg: '#4a4770' },
  }
  const trackCollabs = collabs.filter(c => ['ACTIVE', 'PENDING', 'COMPLETED'].includes(c.status)).slice(0, 4)

  // ── Urmează pentru tine ──
  type Todo = { key: string; title: string; sub: string; href: string; cta: string; hot?: boolean; danger?: boolean; ini?: string; logo?: string | null; icon?: any }
  const todos: Todo[] = []
  activeCollabs.filter(c => !!c.deliverable_rejected_at && !c.deliverable_submitted_at).forEach(c => todos.push({
    key: 'rej-' + c.id, title: `Retrimite postarea pentru ${c.campaigns?.brand_name || 'brand'}`, sub: `${c.campaigns?.title || 'Colaborare'} · brandul a cerut modificări`,
    href: '/influencer/collaborations?tab=active', cta: 'Retrimite', hot: true, danger: true, ini: c.campaigns?.brand_name,
  }))
  awaitingPost
    .map(c => ({ c, d: postDaysLeft(c) }))
    .sort((a, b) => (a.d ?? 999) - (b.d ?? 999))
    .forEach(({ c, d }) => {
      const when = d === null ? 'Ai primit coletul' : d < 0 ? `Termen depășit de ${Math.abs(d)} ${Math.abs(d) === 1 ? 'zi' : 'zile'}` : d === 0 ? 'Ultima zi pentru postare' : `Mai ai ${d} ${d === 1 ? 'zi' : 'zile'} să postezi`
      todos.push({ key: 'post-' + c.id, title: `Postează pentru ${c.campaigns?.brand_name || 'brand'}`, sub: `${c.campaigns?.title || 'Colaborare'} · ${when}`, href: '/influencer/collaborations?tab=active', cta: 'Trimite linkul', hot: true, danger: d !== null && d <= 0, ini: c.campaigns?.brand_name })
    })
  activeCollabs
    .filter(c => !c.package_received_at && !needsDelivery(c) && !c.package_sent_at && !c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at)
    .forEach(c => todos.push({ key: 'make-' + c.id, title: `Postează pentru ${c.campaigns?.brand_name || 'brand'}`, sub: `${c.campaigns?.title || 'Colaborare'}${c.campaigns?.deadline ? ` · termen ${new Date(c.campaigns.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}` : ''}`, href: '/influencer/collaborations?tab=active', cta: 'Trimite dovada', hot: true, ini: c.campaigns?.brand_name }))
  activeCollabs
    .filter(c => c.package_sent_at && !c.package_received_at)
    .forEach(c => todos.push({ key: 'pkg-' + c.id, title: `Coletul de la ${c.campaigns?.brand_name || 'brand'} e pe drum`, sub: 'Confirmă primirea când ajunge, ca să înceapă termenul de postare', href: '/influencer/collaborations?tab=active', cta: 'Vezi coletul', ini: c.campaigns?.brand_name }))
  pendingInvites.slice(0, 3).forEach(c => todos.push({ key: 'inv-' + c.id, title: `${c.campaigns?.brand_name || 'Un brand'} te-a invitat`, sub: `${c.campaigns?.title || 'Campanie'}${c.campaigns?.budget_per_influencer ? ` · ${Number(c.campaigns.budget_per_influencer).toLocaleString('ro-RO')} RON` : ''}`, href: '/influencer/collaborations?tab=invited', cta: 'Răspunde', ini: c.campaigns?.brand_name }))
  if (pendingInvites.length > 3) todos.push({ key: 'inv-more', title: `Încă ${pendingInvites.length - 3} invitații de la branduri`, sub: 'Acceptă sau refuză din Colaborări', href: '/influencer/collaborations?tab=invited', cta: 'Vezi toate', icon: Mail })
  if (closedInvites.length > 0 && pendingInvites.length === 0) todos.push({ key: 'closed', title: `Nu ai răspuns la ${closedInvites.length} ${closedInvites.length === 1 ? 'invitație' : 'invitații'}`, sub: 'Perioada de înscriere s-a terminat · urmărește campaniile noi', href: '/influencer/collaborations?tab=noReply', cta: 'Vezi', icon: Clock })
  const actionCount = todos.filter(t => t.hot).length + pendingInvites.length

  const score = profile?.creator_score ?? 0
  const level = getCreatorLevel(score)
  const lvl = LEVEL_CONFIG[level]
  const nextLabel = lvl.next ? Object.values(LEVEL_CONFIG).find(v => v.min === lvl.next)?.label : null
  const levelPct = lvl.next ? Math.max(0, Math.min(100, Math.round(((score - lvl.min) / (lvl.next - lvl.min)) * 100))) : 100
  const money = (n: number) => (n || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })
  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })

  const BrandMark = ({ name, logo, size = 44 }: { name?: string; logo?: string | null; size?: number }) => {
    const n = (name || '?').trim()
    const ini = n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    const palette = [['#dcf5ec', '#14532d'], ['#fff1c2', '#854d0e'], ['#e6f0ff', '#1d4fb8'], ['#ebe4ff', '#4c1d95'], ['#fde0ea', '#9d174d'], ['#dff4fd', '#0c4a6e']]
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
    const [bg, fg] = palette[h % palette.length]
    return (
      <span className="cd-mark" style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.3) }}>
        {logo ? <img src={logo} alt="" /> : ini}
      </span>
    )
  }

  return (
    <div className="cd">
      <style>{`
        .cd { padding: 28px; max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; color: #14123a; font-family: var(--font-body, system-ui), system-ui, sans-serif; font-size: 15px; line-height: 1.5; }
        .cd h1, .cd h2, .cd .cd-num { font-family: var(--font-display, system-ui), system-ui, sans-serif; }
        .cd h1 { margin: 0; font-weight: 800; font-size: 34px; letter-spacing: -0.03em; line-height: 1.1; }
        .cd h2 { margin: 0; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
        .cd-muted { color: #6a6690; }
        .cd-card { background: #fff; border: 1px solid #e5e3f3; border-radius: 20px; min-width: 0; }
        .cd-link { font-weight: 700; font-size: 14px; color: #6a2fe0; text-decoration: none; }
        .cd-link:hover { color: #5420c0; text-decoration: underline; }
        .cd a.cd-link, .cd a.cd-tl { min-height: 0; }
        .cd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; padding: 0 16px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; border: 1.5px solid #d8d5ec; background: #fff; color: #14123a; white-space: nowrap; font-family: inherit; cursor: pointer; transition: background .15s, border-color .15s; }
        .cd-btn:hover { border-color: #b9aef0; background: #faf9ff; }
        .cd-btn-main { border: 0; background: #7040f0; color: #fff; font-weight: 800; }
        .cd-btn-main:hover { background: #5f30e0; color: #fff; }
        .cd-btn-ink { border: 0; background: #14123a; color: #fff; }
        .cd-btn-ink:hover { background: #26235a; color: #fff; }
        .cd-mark { flex: none; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; overflow: hidden; }
        .cd-mark img { width: 100%; height: 100%; object-fit: cover; }
        .cd-hello { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; }
        .cd-ring { flex: none; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, #22c8f0, #3090f0 35%, #7040f0 70%, #9030f0); display: inline-flex; }
        .cd-ring > div { border-radius: 50%; border: 3px solid #f6f6fc; display: inline-flex; }
        .cd-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .cd-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: #fff; border: 1px solid #e5e3f3; color: #4a4770; }
        .cd-band { position: relative; overflow: hidden; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: #14123a; color: #fff; border-radius: 20px; }
        .cd-band-glow { position: absolute; left: -60px; bottom: -120px; width: 260px; height: 260px; border-radius: 50%; background: linear-gradient(135deg, #22c8f0, #7040f0); opacity: .3; filter: blur(50px); pointer-events: none; }
        .cd-band > a, .cd-band > div:not(.cd-band-glow) { position: relative; padding: 20px 22px; display: flex; flex-direction: column; gap: 2px; text-decoration: none; color: #fff; border-right: 1px solid rgba(255,255,255,.1); min-height: 0; }
        .cd-band > :last-child { border-right: 0; }
        .cd-band-lbl { font-size: 13px; color: #b9b5dc; }
        .cd-band .cd-num { font-weight: 800; font-size: 30px; font-variant-numeric: tabular-nums; line-height: 1.2; }
        .cd-band .cd-num small { font-size: 16px; color: #b9b5dc; font-weight: 700; }
        .cd-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        .cd-col { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .cd-todo { list-style: none; margin: 0; padding: 0 10px 10px; display: flex; flex-direction: column; gap: 4px; }
        .cd-todo li { position: relative; display: flex; align-items: center; gap: 14px; padding: 14px 12px; border-radius: 14px; }
        .cd-todo li.hot { background: #f5f0ff; }
        .cd-todo li.danger { background: #fff6f5; }
        .cd-todo-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .cd-todo-txt span { font-size: 13px; color: #6a6690; overflow-wrap: anywhere; }
        .cd-chev { display: none; }
        .cd-stretch { position: absolute; inset: 0; border-radius: 14px; min-height: 0 !important; }
        .cd-track { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; padding: 16px 0; border-bottom: 1px solid #f1f0f8; text-decoration: none; color: #14123a; min-height: 0; }
        .cd-track:last-child { border-bottom: 0; }
        .cd-steps { flex: 2 1 340px; display: grid; gap: 6px; }
        .cd-step { display: flex; flex-direction: column; gap: 6px; }
        .cd-step i { display: block; height: 6px; border-radius: 999px; }
        .cd-step span { font-size: 12px; }
        .cd-pill { font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
        .cd-offers { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 14px; }
        .cd-offer { background: #fff; border: 1px solid #e5e3f3; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; text-decoration: none; color: #14123a; min-height: 0; transition: border-color .15s, transform .15s; }
        .cd-offer:hover { border-color: #cdbdfc; transform: translateY(-2px); }
        .cd-tip { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: #f6f6fc; font-size: 14px; font-weight: 600; text-decoration: none; color: #14123a; min-height: 0; }
        .cd-ref { border-radius: 20px; padding: 18px 20px; color: #fff; display: flex; flex-direction: column; gap: 10px; }
        .cd-ref-copy { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.14); border-radius: 12px; padding: 6px 6px 6px 12px; }
        .cd-ref-copy p { flex: 1; min-width: 0; margin: 0; font-size: 12px; font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cd-ref-copy button { flex: none; height: 38px; padding: 0 14px; border-radius: 9px; border: 0; background: #fff; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; }
        .cd-ref-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .cd-ref-chips span { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,.16); }
        .cd-ref details { font-size: 13px; }
        .cd-ref summary { cursor: pointer; font-weight: 700; }
        .cd-ref ul { margin: 8px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 2px; }
        .cd-alert { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 16px; }
        .cd-clips { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .cd-clip { position: relative; aspect-ratio: 9 / 14; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; text-decoration: none; color: #fff; background: linear-gradient(160deg, #3a2f8f, #14123a); min-height: 0; }
        .cd-clip img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .cd-clip::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 45%, rgba(10,8,40,.75)); }
        .cd-clip > * { position: relative; z-index: 1; }
        .cd-clip img { z-index: 0; }
        @keyframes cdMarq { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .cd-marq { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
        .cd-marq-track { display: flex; gap: 10px; width: max-content; animation: cdMarq 40s linear infinite; }
        .cd-marq-track:hover { animation-play-state: paused; }
        .cd-top { width: 168px; flex: none; background: #fff; border: 1px solid #e5e3f3; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .cd-quick { display: none; }
        @keyframes cdUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .cd > section { animation: cdUp .35s ease both; }
        @media (prefers-reduced-motion: reduce) { .cd > section, .cd-marq-track { animation: none } }
        @media (max-width: 1023px) { .cd-grid { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 767px) {
          .cd { padding: 20px 16px 110px; gap: 18px; }
          .cd h1 { font-size: 27px; }
          .cd h2 { font-size: 18px; }
          .cd-hello-cta { display: none !important; }
          .cd-band { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .cd-band > a, .cd-band > div:not(.cd-band-glow) { padding: 14px 16px; border-right: 0; }
          .cd-band .cd-num { font-size: 22px; }
          .cd-band > :nth-child(2) { grid-column: 1 / -1; }
          .cd-band > :nth-child(5) { grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,.1); }
          .cd-urgent { display: none; }
          .cd-todo { padding: 0 8px 8px; }
          .cd-todo li { flex-wrap: wrap; gap: 12px; padding: 12px; }
          .cd-todo li .cd-btn { width: 100%; height: 46px; }
          .cd-todo li:not(.hot) .cd-btn { display: none; }
          .cd-todo li:not(.hot) .cd-chev { display: block; }
          .cd-steps { flex-basis: 100%; }
          .cd-step span { display: none; }
          .cd-offers { display: flex; overflow-x: auto; margin: 0 -16px; padding: 0 16px 4px; scroll-snap-type: x mandatory; }
          .cd-offer { flex: 0 0 268px; scroll-snap-align: start; }
          .cd-clips { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .cd-clips > :nth-child(n+4) { display: none; }
          .cd-quick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* SALUT */}
      <section className="cd-hello">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <AvatarWithBadge avatarUrl={profile?.avatar} name={profile?.name} score={score} size={64} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span className="cd-muted" style={{ fontSize: 13, fontWeight: 600 }}>{greeting} · {today}</span>
            <h1>Salut, {firstName}.</h1>
            <p style={{ margin: 0, color: '#4a4770' }}>
              {actionCount > 0
                ? <>Ai <b style={{ color: '#6a2fe0' }}>{actionCount === 1 ? 'un lucru' : `${actionCount} lucruri`}</b> de făcut azi.</>
                : 'Nimic urgent azi. E un moment bun să aplici la campanii noi.'}
            </p>
            {profile?.platforms?.length > 0 && (
              <div className="cd-chips">
                {profile.platforms.slice(0, 3).map((p: any, i: number) => {
                  const name = p.platform?.toLowerCase()
                  return (
                    <span key={i} className="cd-chip">
                      {name === 'instagram' && <Instagram style={{ width: 12, height: 12 }} />}
                      {name === 'tiktok' && <TikTokIcon className="w-3 h-3" />}
                      {name === 'youtube' && <Youtube style={{ width: 12, height: 12 }} />}
                      {fmtFollowers(p.followers || p.follower_count || 0)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <Link href="/influencer/campaigns" className="cd-btn cd-btn-main cd-hello-cta" style={{ height: 46, padding: '0 20px', boxShadow: '0 10px 22px -10px rgba(112,64,240,.75)' }}>
          <Search className="w-4 h-4" /> Găsește campanii
        </Link>
      </section>

      {/* BANDA CÂȘTIGURI */}
      <section className="cd-band">
        <span className="cd-band-glow" aria-hidden="true" />
        <Link href="/influencer/wallet"><span className="cd-band-lbl">Câștigat luna asta</span><span className="cd-num">{money(thisMonthEarned)} <small>RON</small></span></Link>
        <Link href="/influencer/wallet"><span className="cd-band-lbl">În portofel</span><span className="cd-num">{money(profile?.wallet_balance ?? 0)} <small>RON</small></span></Link>
        <Link href="/influencer/collaborations?tab=active"><span className="cd-band-lbl">Colaborări active</span><span className="cd-num">{activeCollabs.length}</span></Link>
        <Link href="/influencer/rewards" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 54, height: 54, flex: 'none', borderRadius: '50%', background: `conic-gradient(#22c8f0, #7040f0 ${levelPct}%, rgba(255,255,255,.14) ${levelPct}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#14123a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={BADGE_IMAGES[level]} alt={lvl.label} style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="cd-band-lbl">Creator Score</span>
            <b style={{ fontSize: 15 }}>{lvl.label} · {money(score)} pts</b>
          </span>
        </Link>
      </section>

      {/* Anunțuri, bonusuri, avertismente */}
      {profilePct < 100 && <OnboardingChecklist role="influencer" steps={checklistSteps} />}
      {userId && <AnnouncementBanner userId={userId} />}
      {profile?.id && <PointEventsSection influencerId={profile.id} />}

      {profile?.blacklisted && (
        <section className="cd-alert" style={{ background: '#fdecec', border: '1.5px solid #f6c8c4' }}>
          <Ban className="w-5 h-5 flex-none" style={{ color: '#b42318', marginTop: 2 }} />
          <div>
            <b style={{ color: '#b42318' }}>Contul tău este suspendat</b>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: '#7a271a' }}>
              Nu poți aplica la campanii noi. {profile.blacklisted_reason || ''}{' '}
              Contactează-ne la <a href="mailto:contact@addfame.ro" style={{ color: '#b42318', fontWeight: 700 }}>contact@addfame.ro</a> pentru a discuta situația.
            </p>
          </div>
        </section>
      )}

      {!profile?.blacklisted && (profile?.strikes || 0) > 0 && (
        <section className="cd-alert" style={{ background: '#fff6ec', border: '1.5px solid #f6d7b0' }}>
          <AlertTriangle className="w-5 h-5 flex-none" style={{ color: '#9a4206', marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <b style={{ color: '#9a4206' }}>Ai {profile.strikes} strike{profile.strikes > 1 ? '-uri' : ''} din 2</b>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: '#6b3a10' }}>La 2 strike-uri contul tău va fi suspendat automat. Te rugăm să respecți termenele de postare pentru campaniile active.</p>
          </div>
          <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
            {[1, 2].map(n => (
              <span key={n} style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: (profile?.strikes || 0) >= n ? '#b42318' : '#ece9f5', color: (profile?.strikes || 0) >= n ? '#fff' : '#8783a8' }}>{n}</span>
            ))}
          </div>
        </section>
      )}

      {/* CONȚINUT PRINCIPAL */}
      <section className="cd-grid">
        <div className="cd-col">

          {/* URMEAZĂ */}
          <div className="cd-card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px 12px' }}>
              <h2>Urmează pentru tine</h2>
              {todos.length > 0 && <span className="cd-muted cd-urgent" style={{ fontSize: 13, fontWeight: 600 }}>cel mai urgent primul</span>}
            </div>
            {todos.length === 0 ? (
              <div style={{ padding: '6px 22px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="cd-mark" style={{ width: 44, height: 44, background: '#e3f6ec', color: '#166534' }}><CheckCircle className="w-5 h-5" /></span>
                <div style={{ flex: 1 }}>
                  <b>Ești la zi cu tot.</b>
                  <p className="cd-muted" style={{ margin: 0, fontSize: 14 }}>Aplică la o campanie nouă și îți arătăm aici pașii următori.</p>
                </div>
                <Link href="/influencer/campaigns" className="cd-btn">Vezi campanii</Link>
              </div>
            ) : (
              <ol className="cd-todo">
                {todos.slice(0, 6).map(t => (
                  <li key={t.key} className={t.danger ? 'hot danger' : t.hot ? 'hot' : ''}>
                    {t.icon
                      ? <span className="cd-mark" style={{ width: 46, height: 46, background: '#f0eff7', color: '#4a4770' }}><t.icon className="w-5 h-5" /></span>
                      : <BrandMark name={t.ini} size={46} />}
                    <span className="cd-todo-txt"><b>{t.title}</b><span>{t.sub}</span></span>
                    <Link href={t.href} className={`cd-btn ${t.hot ? (t.danger ? 'cd-btn-main' : 'cd-btn-main') : t.key.startsWith('inv-') ? 'cd-btn-ink' : ''}`} style={t.danger ? { background: '#b42318' } : undefined}>{t.cta}</Link>
                    {!t.hot && <Link href={t.href} className="cd-stretch cd-chev" aria-label={t.cta} />}
                    {!t.hot && <ChevronRight className="cd-chev w-[18px] h-[18px] flex-none" style={{ color: '#a3a0bf' }} />}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* COLABORĂRI CU TRASEU */}
          {trackCollabs.length > 0 && (
            <div className="cd-card" style={{ padding: '18px 22px 6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h2>Colaborările tale</h2>
                <Link href="/influencer/collaborations" className="cd-link">Toate</Link>
              </div>
              {trackCollabs.map(c => {
                const st = collabStage(c)
                const tone = TONE[st.tone]
                const reward = c.campaigns?.budget_per_influencer ? `${money(c.campaigns.budget_per_influencer)} RON` : (c.campaigns?.campaign_type === 'BARTER' ? 'Barter' : '')
                return (
                  <Link key={c.id} href="/influencer/collaborations" className="cd-track">
                    <div style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <BrandMark name={c.campaigns?.brand_name} size={40} />
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 0 }}>
                        <b>{c.campaigns?.brand_name || 'Brand'}</b>
                        <span className="cd-muted" style={{ fontSize: 13 }}>{c.campaigns?.title || 'Colaborare'}{reward ? ` · ${reward}` : ''}</span>
                        <span className="cd-pill" style={{ background: tone.bg, color: tone.fg, whiteSpace: 'normal', marginTop: 2 }}>{st.tag}</span>
                      </span>
                    </div>
                    <div className="cd-steps" style={{ gridTemplateColumns: `repeat(${st.labels.length}, minmax(0, 1fr))` }}>
                      {st.labels.map((l, i) => {
                        const done = i < st.at, now = i === st.at
                        return (
                          <div key={l} className="cd-step">
                            <i style={{ background: done ? 'linear-gradient(90deg, #7040f0, #9030f0)' : now ? (st.tone === 'red' ? '#f3b4ae' : '#cdbdfc') : '#eeecf7' }} />
                            <span style={{ fontWeight: now ? 800 : 600, color: now ? '#5420c0' : done ? '#4a4770' : '#a3a0bf' }}>{l}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* CAMPANII PENTRU TINE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <h2 style={{ fontSize: 21 }}>{matchedCampaigns.length > 0 ? 'Campanii pentru tine' : 'Campanii active'}</h2>
              <Link href="/influencer/campaigns" className="cd-link">Vezi toate</Link>
            </div>
            {displayCampaigns.length === 0 ? (
              <div className="cd-card" style={{ padding: 24, textAlign: 'center' }}>
                <b>Nicio campanie activă momentan</b>
                <p className="cd-muted" style={{ margin: '2px 0 0', fontSize: 14 }}>Revino curând — brandurile postează des.</p>
              </div>
            ) : (
              <div className="cd-offers">
                {displayCampaigns.slice(0, 3).map((camp: any) => {
                  const alreadyApplied = collabs.some(c => c.campaign_id === camp.id)
                  const daysLeft = camp.deadline ? daysUntil(camp.deadline) : null
                  const isBarter = camp.campaign_type === 'BARTER'
                  return (
                    <Link key={camp.id} href={`/influencer/campaigns/${camp.id}`} className="cd-offer">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <BrandMark name={camp.brand_name} logo={camp.brand_logo} size={40} />
                        <span className="cd-pill" style={isBarter ? { background: '#f1eaff', color: '#5420c0' } : { background: '#e6f0ff', color: '#1d4fb8' }}>{isBarter ? 'Barter' : 'Plătită'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <b style={{ fontSize: 16, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{camp.title}</b>
                        <span className="cd-muted" style={{ fontSize: 13 }}>{camp.brand_name}{camp.niches?.[0] ? ` · ${camp.niches[0]}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                        <span className="cd-num" style={{ fontWeight: 800, fontSize: 19 }}>{isBarter ? 'Produs gratuit' : `${money(camp.budget_per_influencer)} RON`}</span>
                        {daysLeft !== null && daysLeft > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 3 ? '#9a4206' : '#6a6690' }}>{daysLeft === 1 ? 'mâine se închide' : `${daysLeft} zile`}</span>}
                      </div>
                      <span className={`cd-btn ${alreadyApplied ? '' : 'cd-btn-ink'}`} style={{ width: '100%' }}>{alreadyApplied ? 'Ai aplicat' : 'Vezi și aplică'}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* LATERAL */}
        <div className="cd-col">
          <div className="cd-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 58, height: 58, flex: 'none', borderRadius: '50%', background: `conic-gradient(#22c8f0, #7040f0 ${levelPct}%, #eeecf7 ${levelPct}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={BADGE_IMAGES[level]} alt={lvl.label} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                </span>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <b style={{ fontSize: 16 }}>Creator Score · {lvl.label}</b>
                <span className="cd-muted" style={{ fontSize: 13 }}>
                  {nextLabel ? `${money(Math.max(0, (lvl.next as number) - score))} puncte până la ${nextLabel}` : 'Ai atins nivelul maxim'}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#4a4770' }}>Brandurile văd mai întâi creatorii cu scor mare.</p>
            {profileMissing.length > 0 && (
              <Link href="/influencer/profile" className="cd-tip"><span>Completează: {profileMissing.join(', ').toLowerCase()}</span><ChevronRight className="w-4 h-4" style={{ color: '#6a2fe0' }} /></Link>
            )}
            {awaitingPost.length > 0 && (
              <Link href="/influencer/collaborations?tab=active" className="cd-tip"><span>Postează la timp — primești bonus de puncte</span><ChevronRight className="w-4 h-4" style={{ color: '#6a2fe0' }} /></Link>
            )}
            <Link href="/influencer/media-kit" className="cd-tip"><span>Ține Media Kit-ul la zi</span><ChevronRight className="w-4 h-4" style={{ color: '#6a2fe0' }} /></Link>
            <Link href="/influencer/rewards" className="cd-link">Recompense și cum se calculează scorul</Link>
          </div>

          {profile?.referral_code && (
            <div className="cd-ref" style={{ background: 'linear-gradient(135deg, #7040f0, #9030f0)' }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#e6dcff' }}>Invită influenceri</span>
              <b style={{ fontFamily: 'var(--font-display, system-ui), system-ui, sans-serif', fontSize: 19, lineHeight: 1.25 }}>Primești 15 RON pentru fiecare creator adus.</b>
              <div className="cd-ref-chips">
                <span>{referrals.length} invitați</span>
                <span>{referralEarned} RON câștigați</span>
                {referralPending > 0 && <span>{referralPending} în așteptare</span>}
              </div>
              <div className="cd-ref-copy">
                <p>addfame.ro/auth/register?ref={profile.referral_code}</p>
                <button onClick={copyReferral} style={{ color: '#5420c0' }}>{copied ? 'Copiat' : 'Copiază'}</button>
              </div>
            </div>
          )}

          {profile?.brand_referral_code && (
            <div className="cd-ref" style={{ background: '#14123a' }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#b9b5dc' }}>Invită branduri</span>
              <b style={{ fontFamily: 'var(--font-display, system-ui), system-ui, sans-serif', fontSize: 19, lineHeight: 1.25 }}>Adu un brand pe AddFame și primești bonus în portofel.</b>
              <div className="cd-ref-chips">
                <span>+50 RON la înregistrare</span>
                <span>+100 RON la prima campanie</span>
                <span>{brandReferrals.length} branduri</span>
              </div>
              <div className="cd-ref-copy">
                <p>addfame.ro/auth/register?type=brand&amp;bref={profile.brand_referral_code}</p>
                <button
                  style={{ color: '#14123a' }}
                  onClick={() => {
                    const link = `${window.location.origin}/auth/register?type=brand&bref=${profile.brand_referral_code}`
                    navigator.clipboard.writeText(link).then(() => notify('Link copiat!')).catch(() => notify('Copiază manual linkul'))
                  }}
                >Copiază</button>
              </div>
              <details>
                <summary style={{ color: '#c9bdff' }}>Condiții pentru bonusul de brand</summary>
                <ul style={{ color: '#d9d5f2' }}>
                  <li>Brandul trebuie să aibă CUI valid</li>
                  <li>Email de firmă (nu Gmail/Yahoo personal)</li>
                  <li>Număr de telefon verificat</li>
                  <li>Website real al companiei</li>
                  <li>Aprobare manuală de admin</li>
                  <li style={{ color: '#ffb4ab', fontWeight: 700 }}>Conturi false = penalizare + suspendare cont</li>
                </ul>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b9b5dc' }}>Bonusul de +50 RON se plătește doar după verificarea manuală a brandului de echipa noastră.</p>
              </details>
            </div>
          )}
        </div>
      </section>

      {/* POSTĂRI RECENTE */}
      {recentClips.length > 0 && (
        <section className="cd-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2>Postări recente pe AddFame</h2>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#075f7d', background: '#e3f6fd', padding: '3px 9px', borderRadius: 999 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c8f0' }} />live</span>
          </div>
          <div className="cd-clips">
            {recentClips.slice(0, 5).map((clip: any, i: number) => {
              const isTikTok = clip.deliverable_url?.includes('tiktok')
              return (
                <a key={i} href={clip.deliverable_url} target="_blank" rel="noopener noreferrer" className="cd-clip">
                  {clip.thumbnail_url && <img src={clip.thumbnail_url} alt="" />}
                  <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,0,0,.55)' }}>{isTikTok ? 'TikTok' : 'Reel'}</span>
                  <b style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.campaigns?.brand_name || 'Brand'}</b>
                  <span style={{ fontSize: 11, color: '#d9d0ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.influencers?.name?.split(' ')[0] || 'Creator'}</span>
                </a>
              )
            })}
          </div>
        </section>
      )}

      {/* TOP INFLUENCERI */}
      {topInfluencers.length >= 2 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2>Top creatori</h2>
            <span className="cd-muted" style={{ fontSize: 13, fontWeight: 600 }}>după colaborări finalizate</span>
          </div>
          <div className="cd-marq">
            <div className="cd-marq-track">
              {[0, 1].map(copy => topInfluencers.map((inf: any, i: number) => {
                const followers = inf.ig_followers || inf.tt_followers || 0
                return (
                  <div key={`${copy}-${inf.id}`} className="cd-top" aria-hidden={copy === 1 ? true : undefined}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="cd-ring" style={{ padding: 2 }}>
                        <span style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #fff', background: '#ebe4ff', color: '#4c1d95', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {inf.avatar ? <img src={inf.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inf.name?.[0]}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#5420c0', background: '#f1eaff', padding: '2px 8px', borderRadius: 999 }}>#{i + 1}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inf.name}</b>
                      <span className="cd-muted" style={{ fontSize: 12 }}>{inf.niches?.[0] || 'Creator'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 12, fontWeight: 700, color: '#4a4770', flexWrap: 'wrap' }}>
                      <span>{inf.completed_collabs} colaborări</span>
                      {followers > 0 && <span className="cd-muted">· {fmtFollowers(followers)}</span>}
                    </div>
                  </div>
                )
              }))}
            </div>
          </div>
        </section>
      )}

      {/* Acces rapid — doar pe telefon */}
      <nav className="cd-quick" aria-label="Acces rapid">
        {[
          { icon: Search, label: 'Campanii', href: '/influencer/campaigns' },
          { icon: Wallet, label: 'Portofel', href: '/influencer/wallet' },
          { icon: Zap, label: 'Colaborări', href: '/influencer/collaborations' },
          { icon: Star, label: 'Media Kit', href: '/influencer/media-kit' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="cd-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#14123a', fontWeight: 700, fontSize: 14 }}>
            <span className="cd-mark" style={{ width: 32, height: 32, borderRadius: 10, background: '#f1eaff', color: '#5420c0' }}><item.icon className="w-4 h-4" /></span>
            {item.label}
            <ChevronRight className="w-4 h-4" style={{ marginLeft: 'auto', color: '#a3a0bf' }} />
          </Link>
        ))}
      </nav>

      <FeedbackButton userId={userId} />
    </div>
  )
}
