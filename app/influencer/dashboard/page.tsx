'use client'
// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, TrendingUp, Wallet, CheckCircle, Clock, ChevronRight,
  Star, Gift, AlertCircle, Target, Copy, Users, Instagram, Youtube
} from 'lucide-react'
import Link from 'next/link'
import { AvatarWithBadge, CreatorScoreWidget } from '@/components/shared/CreatorBadge'
import { OnboardingChecklist } from '@/components/shared/onboarding-checklist'
import AnnouncementBanner from '@/components/AnnouncementBanner'

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
    { done: !!p.identity_verified, label: 'Verificare identitate' },
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
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6']
  const labels = ['', 'Foarte slab', 'Slab', 'Ok', 'Bun', 'Excelent']

  return (
    <>
      {/* Buton flotant */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 40,
          background: existing ? '#ede9fe' : 'linear-gradient(135deg,#7c3aed,#06b6d4)',
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
                    background: rating ? 'linear-gradient(135deg,#7c3aed,#06b6d4)' : '#e5e7eb',
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
          .select('*, campaigns(title, brand_name, budget_per_influencer, deadline, platforms, niches, registrations_open, registration_opened_at, registration_deadline_days)')
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
      await sb.from('collaborations').update({ status: newStatus }).eq('id', collabId)
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
  const appliedCollabs = collabs.filter(c => c.status === 'APPLIED')

  const matchedCampaigns = campaigns.filter(c => {
    if (!profile?.niches?.length) return true
    return c.niches?.some((n: string) => profile.niches.includes(n))
  })
  const displayCampaigns = matchedCampaigns.length > 0 ? matchedCampaigns : campaigns

  const referralEarned = referrals.filter((r: any) => r.referral_bonus_paid).length * 15
  const referralPending = referrals.filter((r: any) => !r.referral_bonus_paid).length

  const { pct: profilePct } = profileCompletion(profile)

  const checklistSteps = [
    { id: 'profile', label: 'Completează profilul', desc: 'Nume, bio și poză', href: '/influencer/profile', done: !!(profile?.name && profile?.bio && profile?.avatar) },
    { id: 'platforms', label: 'Adaugă platformele sociale', desc: 'Instagram, TikTok etc.', href: '/influencer/profile', done: Array.isArray(profile?.platforms) && profile.platforms.length > 0 },
    { id: 'niches', label: 'Selectează nișele', desc: 'Domenii de interes', href: '/influencer/profile', done: profile?.niches?.length > 0 },
    { id: 'verify', label: 'Verifică identitatea', desc: 'Necesar pentru a retrage bani', href: '/influencer/verify', done: !!profile?.identity_verified },
    { id: 'campaign', label: 'Aplică la o campanie', desc: 'Prima colaborare', href: '/influencer/campaigns', done: collabs.length > 0 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #ede9fe', borderTopColor: '#8b5cf6' }} />
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8f7ff', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .38s ease both; }
        .card { background:white;border-radius:16px;border:1.5px solid #ede9fe; }
        .card-hover:hover { border-color:#c4b5fd;box-shadow:0 4px 16px rgba(139,92,246,0.1);transform:translateY(-1px); }
        .toast-anim { animation:slideD .3s ease; }
        .pill { display:inline-flex;align-items:center;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700; }
        .section-title { font-size:13px;font-weight:800;color:#4c1d95;margin:0 0 10px; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#0f3460)', padding: '24px 20px 28px' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(139,92,246,0.2)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(6,182,212,0.15)' }} />

        {/* Avatar + greeting — fără clopotel */}
        <div className="relative flex items-center gap-3 mb-5">
          <div className="flex-shrink-0">
            <AvatarWithBadge
              avatarUrl={profile?.avatar}
              name={profile?.name}
              score={profile?.creator_score ?? 0}
              size={48}
            />
          </div>
          <div>
            <p style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, margin: 0 }}>{greeting} 👋</p>
            <p style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.3px' }}>{firstName}</p>
          </div>
          {/* Buton Campanii noi in dreapta */}
          <Link href="/influencer/campaigns" className="relative ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs text-white" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 3px 10px rgba(139,92,246,0.4)' }}>
            <Zap className="w-3.5 h-3.5" /> Campanii noi
          </Link>
        </div>

        {/* Platforme */}
        {profile?.platforms?.length > 0 && (
          <div className="relative flex items-center gap-2 mb-4 flex-wrap">
            {profile.platforms.slice(0, 3).map((p: any, i: number) => {
              const name = p.platform?.toLowerCase()
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 99, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {name === 'instagram' && <Instagram style={{ width: 12, height: 12, color: 'white' }} />}
                  {name === 'tiktok' && <TikTokIcon className="w-3 h-3 text-white" />}
                  {name === 'youtube' && <Youtube style={{ width: 12, height: 12, color: 'white' }} />}
                  <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{fmtFollowers(p.followers || p.follower_count || 0)}</span>
                </div>
              )
            })}
            {!profile?.identity_verified && (
              <Link href="/influencer/verify" style={{ marginLeft: 'auto', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 99, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle style={{ width: 11, height: 11, color: '#fbbf24' }} />
                <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800 }}>Verifică ID</span>
              </Link>
            )}
          </div>
        )}

        {/* Stats 3 col */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { label: 'Luna asta', value: `${thisMonthEarned.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`, color: '#34d399' },
            { label: 'Wallet', value: `${(profile?.wallet_balance ?? 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`, color: '#fbbf24' },
            { label: 'Active', value: activeCollabs.length.toString(), color: '#a78bfa' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <p style={{ color: s.color, fontSize: 14, fontWeight: 900, margin: 0 }}>{s.value}</p>
              <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '0 0 0 0', border: '1.5px solid #ddd6fe', borderTop: 'none' }}>

        {/* Checklist profil */}
        {profilePct < 100 && (
          <div className="fu mb-4" style={{ animationDelay: '.04s' }}>
            <OnboardingChecklist role="influencer" steps={checklistSteps} />
          </div>
        )}

        {/* Anunțuri admin */}
        {userId && <AnnouncementBanner userId={userId} />}

        {/* Banner blacklist */}
        {profile?.blacklisted && (
          <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 16, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>🚫</div>
              <div>
                <p style={{ color: '#dc2626', fontWeight: 800, fontSize: 13, margin: '0 0 3px' }}>Contul tău este suspendat</p>
                <p style={{ color: '#ef4444', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  Nu poți aplica la campanii noi. {profile.blacklisted_reason || ''}
                  {' '}Contactează-ne la <a href="mailto:contact@addfame.ro" style={{ color: '#dc2626', fontWeight: 700 }}>contact@addfame.ro</a> pentru a discuta situația.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner strike (fără blacklist) */}
        {!profile?.blacklisted && (profile?.strikes || 0) > 0 && (
          <div style={{ background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 16, padding: '14px 16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>⚠️</div>
              <div>
                <p style={{ color: '#c2410c', fontWeight: 800, fontSize: 13, margin: '0 0 3px' }}>
                  Ai {profile.strikes} strike{profile.strikes > 1 ? '-uri' : ''} din 2
                </p>
                <p style={{ color: '#ea580c', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                  La 2 strike-uri contul tău va fi suspendat automat. Te rugăm să respecți termenele de postare pentru campaniile active.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {[1, 2].map(n => (
                  <div key={n} style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: (profile?.strikes || 0) >= n ? '#ef4444' : '#e5e7eb', color: (profile?.strikes || 0) >= n ? 'white' : '#9ca3af' }}>
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invitații de la branduri */}
        {pendingInvites.length > 0 && (
          <div className="fu" style={{ animationDelay: '.06s', marginBottom: 14 }}>
            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap style={{ width: 16, height: 16, color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#9a3412', margin: 0 }}>{pendingInvites.length} invitații de la branduri</p>
                <p style={{ fontSize: 11, color: '#c2410c', margin: '2px 0 0' }}>Acceptă sau refuză acum →</p>
              </div>
              <Link href="/influencer/collaborations" style={{ background: '#f97316', color: 'white', fontSize: 11, fontWeight: 900, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
                Vezi
              </Link>
            </div>
          </div>
        )}

        {/* Invitații expirate / închise */}
        {closedInvites.length > 0 && pendingInvites.length === 0 && (
          <div className="fu" style={{ animationDelay: '.06s', marginBottom: 14 }}>
            <div style={{ background: '#fafafa', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: 16, height: 16, color: '#9ca3af' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#374151', margin: 0 }}>Nu ai răspuns la {closedInvites.length} {closedInvites.length === 1 ? 'invitație' : 'invitații'}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Perioada de înscriere s-a terminat · Urmărește campanii noi!</p>
              </div>
              <Link href="/influencer/collaborations?tab=noReply" style={{ background: '#f3f4f6', color: '#374151', fontSize: 11, fontWeight: 900, padding: '6px 12px', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
                Vezi
              </Link>
            </div>
          </div>
        )}

        {/* ── COLABORĂRI ACTIVE (noul design) ── */}
        {activeCollabs.length > 0 && (
          <div className="fu" style={{ animationDelay: '.08s', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap style={{ width: 14, height: 14, color: '#7c3aed' }} />
                <p className="section-title" style={{ margin: 0 }}>Colaborările mele active</p>
                <span style={{ fontSize: 10, background: '#f5f3ff', color: '#6d28d9', padding: '2px 8px', borderRadius: 99, fontWeight: 900 }}>{activeCollabs.length} {activeCollabs.length === 1 ? 'activă' : 'active'}</span>
              </div>
              <Link href="/influencer/collaborations" style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                Vezi toate <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeCollabs.slice(0, 2).map((collab: any) => {
                const isSubmitted = !!collab.deliverable_submitted_at && !collab.deliverable_approved_at && !collab.deliverable_rejected_at
                const isRejected = !!collab.deliverable_rejected_at && !collab.deliverable_submitted_at
                const isApproved = !!collab.deliverable_approved_at
                const statusLabel = isRejected ? 'Post respins — retrimite' : isSubmitted ? 'Dovadă în așteptarea aprobării' : isApproved ? 'Aprobat ✓' : 'Postează și trimite dovada'
                const statusColor = isRejected ? '#dc2626' : isSubmitted ? '#d97706' : isApproved ? '#16a34a' : '#7c3aed'
                const statusBg = isRejected ? '#fef2f2' : isSubmitted ? '#fffbeb' : isApproved ? '#f0fdf4' : '#faf5ff'
                const headerBg = isRejected ? '#dc2626' : isSubmitted ? '#d97706' : '#7c3aed'
                return (
                  <Link key={collab.id} href="/influencer/collaborations"
                    style={{ textDecoration: 'none', borderRadius: 14, overflow: 'hidden', border: `1.5px solid ${isRejected ? '#fca5a5' : isSubmitted ? '#fcd34d' : '#c4b5fd'}`, display: 'block' }}>
                    <div style={{ background: headerBg, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap style={{ width: 13, height: 13, color: 'white', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {collab.campaigns?.title || 'Colaborare'} · {collab.campaigns?.brand_name}
                      </span>
                      <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 900, flexShrink: 0 }}>ACTIV</span>
                    </div>
                    <div style={{ background: statusBg, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: statusColor }}>{statusLabel}</span>
                      <span style={{ fontSize: 11, fontWeight: 900, color: headerBg, background: 'white', padding: '4px 10px', borderRadius: 8, flexShrink: 0, border: `1px solid ${isRejected ? '#fca5a5' : isSubmitted ? '#fcd34d' : '#c4b5fd'}` }}>Deschide →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── COLET PRIMIT — TREBUIE SĂ POSTEZE ── */}
        {awaitingPost.length > 0 && (
          <div className="fu" style={{ animationDelay: '.10s', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>📦</span>
              <p className="section-title" style={{ margin: 0 }}>Trebuie să postezi</p>
              <span style={{ fontSize: 10, background: '#ffedd5', color: '#9a3412', padding: '2px 8px', borderRadius: 99, fontWeight: 900 }}>{awaitingPost.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {awaitingPost.map((c: any) => {
                const msLeft = c.post_deadline_days ? (c.post_deadline_days * 86400000 - (new Date().getTime() - new Date(c.package_received_at).getTime())) : null
                const daysLeftToPost = msLeft !== null ? Math.ceil(msLeft / 86400000) : null
                const isLate = daysLeftToPost !== null && daysLeftToPost < 0
                const isToday = daysLeftToPost === 0
                const isUrgent = daysLeftToPost !== null && daysLeftToPost <= 1
                return (
                  <Link key={c.id} href={`/influencer/collaborations`}
                    className="card card-hover fu"
                    style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', border: isLate || isUrgent ? '1.5px solid #fecaca' : '1.5px solid #fed7aa' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: isLate ? '#fee2e2' : '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {isLate ? '⏰' : '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaigns?.title}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{c.campaigns?.brand_name}</p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {daysLeftToPost === null ? (
                        <span style={{ fontSize: 11, fontWeight: 900, background: '#ffedd5', color: '#9a3412', padding: '5px 10px', borderRadius: 8 }}>Postează</span>
                      ) : isLate ? (
                        <span style={{ fontSize: 11, fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>⏰ Întârziat</span>
                      ) : isToday ? (
                        <span className="animate-pulse" style={{ fontSize: 11, fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>🔥 Ultima zi!</span>
                      ) : isUrgent ? (
                        <span style={{ fontSize: 11, fontWeight: 900, background: '#fee2e2', color: '#dc2626', padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca' }}>{daysLeftToPost}z rămas</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 900, background: '#ffedd5', color: '#9a3412', padding: '5px 10px', borderRadius: 8 }}>{daysLeftToPost}z rămase</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── CAMPANII RECOMANDATE (max 2, înlocuiește lista lungă) ── */}
        <div className="fu" style={{ animationDelay: '.11s', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star style={{ width: 14, height: 14, color: '#f59e0b' }} />
              <p className="section-title" style={{ margin: 0 }}>
                {matchedCampaigns.length > 0 ? 'Campanii pentru tine' : 'Campanii active'}
              </p>
              {displayCampaigns.length > 0 && (
                <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontWeight: 900 }}>{displayCampaigns.length} noi</span>
              )}
            </div>
            <Link href="/influencer/campaigns" style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              Toate <ChevronRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          {displayCampaigns.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 6px' }}>🔍</p>
              <p style={{ fontWeight: 800, color: '#6b7280', fontSize: 13, margin: 0 }}>Nicio campanie activă momentan</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>Revino curând — brandurile postează des</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayCampaigns.slice(0, 2).map((camp: any, i: number) => {
                const alreadyApplied = collabs.some(c => c.campaign_id === camp.id)
                const daysLeft = camp.deadline ? daysUntil(camp.deadline) : null
                const isBarter = camp.campaign_type === 'BARTER'
                return (
                  <Link key={camp.id} href={`/influencer/campaigns/${camp.id}`}
                    className="card card-hover fu"
                    style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', animationDelay: `${.12 + i * .03}s` }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: isBarter ? '#fef3c7' : 'linear-gradient(135deg,#ede9fe,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isBarter ? 18 : 14, fontWeight: 900, color: isBarter ? '#92400e' : '#7c3aed', flexShrink: 0, overflow: 'hidden' }}>
                      {camp.brand_logo
                        ? <img src={camp.brand_logo} alt={camp.brand_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : isBarter ? '🎁' : camp.brand_name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                        {camp.niches?.slice(0, 1).map((n: string) => (
                          <span key={n} className="pill" style={{ background: '#ede9fe', color: '#6d28d9' }}>{n}</span>
                        ))}
                        {daysLeft !== null && daysLeft > 0 && (
                          <span className="pill" style={{ background: daysLeft <= 3 ? '#fef2f2' : '#f3f4f6', color: daysLeft <= 3 ? '#ef4444' : '#6b7280' }}>
                            {daysLeft <= 3 ? '🔥 ' : '⏱ '}{daysLeft}z
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {alreadyApplied
                        ? <span className="pill" style={{ background: '#ede9fe', color: '#7c3aed' }}>Aplicat ✓</span>
                        : isBarter
                          ? <span style={{ fontSize: 12, fontWeight: 900, background: '#fef3c7', color: '#92400e', padding: '5px 10px', borderRadius: 8, border: '1px solid #fde68a' }}>🎁 Barter</span>
                          : <>
                            <p style={{ fontSize: 15, fontWeight: 900, color: '#16a34a', margin: 0 }}>{(camp.budget_per_influencer || 0).toLocaleString('ro-RO')} RON</p>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: '2px 0 0' }}>per colaborare</p>
                          </>
                      }
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── REFERRAL CARD ── */}
        {profile?.referral_code && (
          <div className="fu" style={{ animationDelay: '.14s', marginBottom: 14 }}>
            <div style={{ background: 'linear-gradient(135deg,#312e81,#1e3a5f)', borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -25, right: -25, width: 90, height: 90, borderRadius: '50%', background: 'rgba(139,92,246,0.25)' }} />
              <div style={{ position: 'absolute', bottom: -20, left: 40, width: 60, height: 60, borderRadius: '50%', background: 'rgba(6,182,212,0.15)' }} />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>🎁</div>
                <div>
                  <p style={{ color: 'white', fontSize: 14, fontWeight: 900, margin: 0 }}>Invită prieteni, câștigă bani</p>
                  <p style={{ color: '#a5b4fc', fontSize: 11, margin: '3px 0 0' }}>
                    Tu și prietenul tău primiți câte <span style={{ color: '#34d399', fontWeight: 900 }}>+15 RON</span> la prima colaborare finalizată
                  </p>
                </div>
              </div>

              {/* Stats referral */}
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Invitați', value: referrals.length, color: 'white' },
                  { label: 'Câștigat', value: `${referralEarned} RON`, color: '#34d399' },
                  { label: 'În așteptare', value: referralPending, color: '#fbbf24' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                    <p style={{ color: s.color, fontSize: 16, fontWeight: 900, margin: 0 }}>{s.value}</p>
                    <p style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 700, margin: '2px 0 0' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Link copiere */}
              <div style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
                <p style={{ color: '#c4b5fd', fontSize: 11, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  addfame.ro/register?ref={profile.referral_code}
                </p>
                <button onClick={copyReferral} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: copied ? '#34d399' : 'white', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
                  {copied ? '✓ Copiat!' : 'Copiază'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOP INFLUENCERI CAROUSEL — vizibil doar cu date reale ── */}
        {topInfluencers.length >= 2 && (
          <div className="fu" style={{ animationDelay: '.22s', marginBottom: 14 }}>
            <style>{`
              @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
              .marquee-track { display:flex;gap:10px;animation:marquee 24s linear infinite;width:max-content; }
              .marquee-track:hover { animation-play-state:paused; }
              .marquee-wrap { overflow:hidden;position:relative; }
              .marquee-wrap::before,.marquee-wrap::after { content:'';position:absolute;top:0;bottom:0;width:32px;z-index:2;pointer-events:none; }
              .marquee-wrap::before { left:0;background:linear-gradient(to right,#faf5ff,transparent); }
              .marquee-wrap::after { right:0;background:linear-gradient(to left,#faf5ff,transparent); }
              .top-card { width:150px;flex-shrink:0;background:#1c1033;border-radius:14px;border:1.5px solid rgba(147,51,234,0.4);overflow:hidden;cursor:pointer;transition:border-color .2s,transform .2s; }
              .top-card:hover { border-color:#ec4899;transform:translateY(-2px); }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="section-title">🏆 Top Influenceri</p>
              <span style={{ fontSize: 11, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 99, fontWeight: 800 }}>Live</span>
            </div>
            <div className="marquee-wrap">
              <div className="marquee-track">
                {/* Set 1 */}
                {topInfluencers.map((inf: any, i: number) => {
                  const rankColors = ['#f59e0b','#9ca3af','#b45309']
                  const rankColor = rankColors[i] || '#6b7280'
                  const followers = inf.ig_followers || inf.tt_followers || 0
                  const fmtF = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()
                  return (
                    <div key={`a-${inf.id}`} className="top-card">
                      <div style={{ height: 72, background: '#1c1033', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Dot mesh SVG background */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 150 72" preserveAspectRatio="xMidYMid slice">
                          <defs>
                            <pattern id="dots-inf" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                              <circle cx="6" cy="6" r="1" fill="#9333ea" opacity="0.4"/>
                            </pattern>
                          </defs>
                          <rect width="150" height="72" fill="url(#dots-inf)"/>
                          <line x1="0" y1="72" x2="150" y2="0" stroke="#9333ea" strokeWidth="0.5" opacity="0.3"/>
                          <line x1="0" y1="36" x2="150" y2="36" stroke="#ec4899" strokeWidth="0.5" opacity="0.2"/>
                          <circle cx="0" cy="72" r="60" fill="none" stroke="#9333ea" strokeWidth="0.5" opacity="0.25"/>
                          <circle cx="150" cy="0" r="50" fill="none" stroke="#ec4899" strokeWidth="0.5" opacity="0.2"/>
                        </svg>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', border: '2.5px solid #ec4899', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                          {inf.avatar ? <img src={inf.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : inf.name?.[0]}
                        </div>
                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#ec4899', color: 'white', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 99, zIndex: 1 }}>#{i+1}</div>
                        {i === 0 && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 12, zIndex: 1 }}>⭐</div>}
                      </div>
                      <div style={{ padding: '8px 10px', background: '#1c1033' }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inf.name}</p>
                        <p style={{ fontSize: 10, color: '#f0abfc', margin: '0 0 6px' }}>{inf.niches?.[0] || 'Creator'}</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ flex: 1, background: 'rgba(236,72,153,0.2)', borderRadius: 7, padding: '3px 4px', textAlign: 'center' }}>
                            <p style={{ fontSize: 13, fontWeight: 900, color: '#f9a8d4', margin: 0 }}>{inf.completed_collabs}</p>
                            <p style={{ fontSize: 9, color: '#ec4899', margin: 0 }}>deals</p>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(5,150,105,0.15)', borderRadius: 7, padding: '3px 4px', textAlign: 'center' }}>
                            <p style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', margin: 0 }}>{(inf.total_earned || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}</p>
                            <p style={{ fontSize: 9, color: '#34d399', margin: 0 }}>RON</p>
                          </div>
                        </div>
                        {followers > 0 && <div style={{ marginTop: 5 }}><span style={{ fontSize: 10, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>{fmtF(followers)} fol.</span></div>}
                      </div>
                    </div>
                  )
                })}
                {/* Set 2 — duplicate pentru loop */}
                {topInfluencers.map((inf: any, i: number) => {
                  const rankColors = ['#f59e0b','#9ca3af','#b45309']
                  const rankColor = rankColors[i] || '#6b7280'
                  const followers = inf.ig_followers || inf.tt_followers || 0
                  const fmtF = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toString()
                  return (
                    <div key={`b-${inf.id}`} className="top-card">
                      <div style={{ height: 72, background: '#1c1033', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Dot mesh SVG background */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 150 72" preserveAspectRatio="xMidYMid slice">
                          <defs>
                            <pattern id="dots-inf" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
                              <circle cx="6" cy="6" r="1" fill="#9333ea" opacity="0.4"/>
                            </pattern>
                          </defs>
                          <rect width="150" height="72" fill="url(#dots-inf)"/>
                          <line x1="0" y1="72" x2="150" y2="0" stroke="#9333ea" strokeWidth="0.5" opacity="0.3"/>
                          <line x1="0" y1="36" x2="150" y2="36" stroke="#ec4899" strokeWidth="0.5" opacity="0.2"/>
                          <circle cx="0" cy="72" r="60" fill="none" stroke="#9333ea" strokeWidth="0.5" opacity="0.25"/>
                          <circle cx="150" cy="0" r="50" fill="none" stroke="#ec4899" strokeWidth="0.5" opacity="0.2"/>
                        </svg>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: 'white', border: '2.5px solid #ec4899', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                          {inf.avatar ? <img src={inf.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : inf.name?.[0]}
                        </div>
                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#ec4899', color: 'white', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 99, zIndex: 1 }}>#{i+1}</div>
                        {i === 0 && <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 12, zIndex: 1 }}>⭐</div>}
                      </div>
                      <div style={{ padding: '8px 10px', background: '#1c1033' }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inf.name}</p>
                        <p style={{ fontSize: 10, color: '#f0abfc', margin: '0 0 6px' }}>{inf.niches?.[0] || 'Creator'}</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ flex: 1, background: 'rgba(236,72,153,0.2)', borderRadius: 7, padding: '3px 4px', textAlign: 'center' }}>
                            <p style={{ fontSize: 13, fontWeight: 900, color: '#f9a8d4', margin: 0 }}>{inf.completed_collabs}</p>
                            <p style={{ fontSize: 9, color: '#ec4899', margin: 0 }}>deals</p>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(5,150,105,0.15)', borderRadius: 7, padding: '3px 4px', textAlign: 'center' }}>
                            <p style={{ fontSize: 10, fontWeight: 900, color: '#6ee7b7', margin: 0 }}>{(inf.total_earned || 0).toLocaleString('ro-RO', { maximumFractionDigits: 0 })}</p>
                            <p style={{ fontSize: 9, color: '#34d399', margin: 0 }}>RON</p>
                          </div>
                        </div>
                        {followers > 0 && <div style={{ marginTop: 5 }}><span style={{ fontSize: 10, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '2px 6px', borderRadius: 99, fontWeight: 700 }}>{fmtF(followers)} fol.</span></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLIPURI RECENTE — grid static, max 5, vizibil doar cu proof_url real ── */}
        {recentClips.length > 0 && (
          <div className="fu" style={{ animationDelay: '.24s', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="section-title">🎬 Clipuri recente</p>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{recentClips.slice(0, 5).length} clipuri</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {recentClips.slice(0, 5).map((clip: any, i: number) => {
                const isTikTok = clip.deliverable_url?.includes('tiktok')
                const bg = isTikTok
                  ? 'linear-gradient(180deg,#1a1a2e 0%,#0f3460 100%)'
                  : 'linear-gradient(180deg,#312e81 0%,#1e1b4b 100%)'
                return (
                  <a key={i} href={clip.deliverable_url} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration: 'none', borderRadius: 12, overflow: 'hidden', display: 'block', transition: 'transform .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}>
                    <div style={{ height: 140, background: bg, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 6 }}>
                      {clip.thumbnail_url && (
                        <img src={clip.thumbnail_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      {clip.thumbnail_url && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.65))' }} />}
                      <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)', width: 28, height: 28, background: 'rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      <div style={{ position: 'absolute', top: 5, right: 5, background: isTikTok ? 'black' : 'linear-gradient(135deg,#833ab4,#fd1d1d)', borderRadius: 5, padding: '1px 5px' }}>
                        <span style={{ color: 'white', fontSize: 8, fontWeight: 700 }}>{isTikTok ? 'TikTok' : 'Reel'}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 6px' }}>
                        <p style={{ color: 'white', fontSize: 9, fontWeight: 800, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.campaigns?.brand_name || 'Brand'}</p>
                        <p style={{ color: '#a78bfa', fontSize: 8, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{clip.influencers?.name?.split(' ')[0]?.toLowerCase() || 'creator'}</p>
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

                {/* Acces rapid */}
        <div className="fu" style={{ animationDelay: '.2s' }}>
          <p className="section-title">Acces rapid</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { emoji: '🎯', label: 'Campanii', href: '/influencer/campaigns', bg: '#ede9fe', color: '#4c1d95' },
              { emoji: '💰', label: 'Wallet', href: '/influencer/wallet', bg: '#dcfce7', color: '#14532d' },
              { emoji: '🤝', label: 'Colaborări', href: '/influencer/collaborations', bg: '#dbeafe', color: '#1e3a8a' },
              { emoji: '⭐', label: 'Media Kit', href: '/influencer/media-kit', bg: '#fef3c7', color: '#78350f' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="card card-hover" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'all .15s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {item.emoji}
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: item.color, margin: 0 }}>{item.label}</p>
                <ChevronRight style={{ width: 14, height: 14, color: '#c4b5fd', marginLeft: 'auto' }} />
              </Link>
            ))}
          </div>
        </div>

        <div style={{ height: 24 }} />

        {/* Feedback platformă */}
        <FeedbackButton userId={userId} />

      </div>
    </div>
  )
}
// CAROUSEL VERSION - to be integrated
