'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { ThumbnailUpload } from '@/components/ThumbnailUpload'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, Check, X, Clock, CheckCircle, AlertCircle,
  MessageSquare, ChevronRight, ArrowRight, Zap, Search,
  RefreshCw, ExternalLink, Link2, Send, Upload, Eye,
  RotateCcw, AlertTriangle, Calendar, DollarSign,
  Loader2, Package, Truck, Lock, Copy, FileText, Star
} from 'lucide-react'
import Link from 'next/link'
import { checkInWithCode } from '@/app/actions/collaborations'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import { PostStatsForm } from '@/components/shared/PostStatsForm'
import { LeaveReview } from '@/components/shared/leave-review'
import DraftReview from '@/components/shared/DraftReview'
import DisputeButton from '@/components/shared/DisputeButton'

type Collaboration = {
  id: string
  campaign_id: string
  admin_invited?: boolean | null
  draft_status?: string | null
  status: string
  created_at: string
  reserved_amount?: number
  payment_amount?: number
  package_sent_at?: string
  package_received_at?: string
  package_courier?: string
  package_tracking?: string
  checked_in_at?: string
  post_deadline_days?: number
  delivery_name?: string
  message?: string
  deliverable_url?: string
  deliverable_urls?: string[]
  deliverable_note?: string
  ads_code?: string
  deliverable_submitted_at?: string
  deliverable_approved_at?: string
  deliverable_rejected_at?: string
  deliverable_rejection_reason?: string
  content_license_granted?: boolean
  content_license_at?: string
  thumbnail_url?: string
  campaigns: {
    id: string
    title: string
    brand_name: string
    budget: number
    budget_per_influencer?: number
    max_influencers?: number
    deadline: string
    platforms: string[]
    description?: string
    deliverables?: string
    campaign_type?: string
    delivery_method?: string
    offer_name?: string
    offer_value?: number
    offer_description?: string
    offer_image_url?: string
    offer_image_urls?: string[]
    story_instructions?: string
    promotion_link?: string
    promotion_link_placement?: string[]
    required_caption?: string
    required_hashtags?: string[]
    key_messages?: string[]
    forbidden_mentions?: string[]
    forbidden_content?: string
    content_type?: string[]
    min_duration?: number
    min_days_online?: number
    product_name?: string
    registrations_open?: boolean
    registration_opened_at?: string
    registration_deadline_days?: number
    tasks_stories_count?: number
    tasks_include_post?: boolean
    tasks_ig_reel?: boolean
    tasks_ig_reel_duration?: number
    tasks_ig_post?: boolean
    tasks_ig_live?: boolean
    tasks_ig_days_online?: number
    tasks_tt_video?: boolean
    tasks_tt_video_duration?: number
    tasks_tt_live?: boolean
    tasks_tt_duet?: boolean
    tasks_tt_days_online?: number
    tasks_yt_short?: boolean
    tasks_yt_short_duration?: number
    tasks_yt_video?: boolean
    tasks_yt_video_duration?: number
    tasks_yt_mention?: boolean
    tasks_fb_post?: boolean
    tasks_fb_story?: boolean
    tasks_fb_reel?: boolean
    tasks_fb_share?: boolean
    brief_pdf_url?: string
  } | null
}

const fmt = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
  COMPLETED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500', label: 'Finalizat', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  REJECTED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Respins', icon: <X className="w-4 h-4 text-gray-400" /> },
}

const TABS = ['All', 'Invited', 'Fara raspuns', 'Active', 'Applied', 'Completed', 'Respinse'] as const
type Tab = typeof TABS[number]
const TAB_FILTER: Record<Tab, string[]> = {
  'All': ['INVITED', 'PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED'],
  'Invited': ['INVITED'],
  'Fara raspuns': ['INVITED'],
  'Active': ['ACTIVE'],
  'Applied': ['PENDING'],
  'Completed': ['COMPLETED'],
  'Respinse': ['REJECTED'],
}

// ─── Deliverable Submit Component ────────────────────────────────────────────
// ── Score Timer Banner — numărătoare inversă cu punctaj dinamic ─────────────
function ScoreTimerBanner({ acceptedAt }: { acceptedAt?: string }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!acceptedAt) return null

  const accepted = new Date(acceptedAt)
  const msElapsed = now.getTime() - accepted.getTime()
  const hoursElapsed = msElapsed / 3_600_000

  // Calculează punctele posibile în timp real
  const basePoints = 150 // 100 colaborare + 50 prima aprobare
  const bonus = hoursElapsed < 24 ? 75 : hoursElapsed < 48 ? 40 : 0
  const totalPossible = basePoints + bonus

  // Timer countdown spre next threshold
  const deadline24 = new Date(accepted.getTime() + 24 * 3_600_000)
  const deadline48 = new Date(accepted.getTime() + 48 * 3_600_000)
  const targetDeadline = hoursElapsed < 24 ? deadline24 : hoursElapsed < 48 ? deadline48 : null
  const msLeft = targetDeadline ? Math.max(0, targetDeadline.getTime() - now.getTime()) : 0
  const hLeft = Math.floor(msLeft / 3_600_000)
  const mLeft = Math.floor((msLeft % 3_600_000) / 60_000)
  const sLeft = Math.floor((msLeft % 60_000) / 1000)
  const timerStr = `${String(hLeft).padStart(2, '0')}:${String(mLeft).padStart(2, '0')}:${String(sLeft).padStart(2, '0')}`

  // Urgency styling
  const in24h = hoursElapsed < 24
  const in48h = hoursElapsed < 48 && !in24h
  const expired = hoursElapsed >= 48

  const theme = in24h
    ? { color: '#14532d', bg: '#dcf5ec', border: '#b8e8d3', timerBg: '#14532d', label: 'Bonus maxim disponibil!', sub: 'Postează în 24h de la acceptare' }
    : in48h
    ? { color: '#854d0e', bg: '#fff1c2', border: '#f3dd8c', timerBg: '#854d0e', label: 'Bonus parțial — grăbește-te!', sub: 'Bonusul de 24h a expirat' }
    : { color: '#5b2fd0', bg: '#efeaff', border: '#ddd1ff', timerBg: '#7040f0', label: 'Câștigă puncte Creator Score', sub: 'Bonusurile de viteză au expirat' }

  return (
    <div style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '14px 16px' }}>

      {/* Row 1: Label + puncte */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: theme.color, margin: '0 0 2px' }}>
            {theme.label}
          </p>
          <p style={{ fontSize: 12, color: theme.color, opacity: 0.8, margin: 0 }}>{theme.sub}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: theme.color, margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>+{totalPossible}</p>
          <p style={{ fontSize: 11, color: theme.color, opacity: 0.6, margin: '1px 0 0', fontWeight: 600 }}>puncte posibile</p>
        </div>
      </div>

      {/* Row 2: Timer + pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

        {/* Timer */}
        {!expired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.timerBg, borderRadius: 10, padding: '5px 10px', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'white', letterSpacing: '0.05em', fontVariantNumeric: 'tabular-nums' }}>{timerStr}</span>
          </div>
        )}

        {/* Breakdown pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'white', color: '#14532d', padding: '3px 8px', borderRadius: 100, border: '1px solid #b8e8d3' }}>+100 colaborare</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'white', color: '#14532d', padding: '3px 8px', borderRadius: 100, border: '1px solid #b8e8d3' }}>+50 prima aprobare</span>
          {bonus > 0 && (
            <span style={{ fontSize: 11, fontWeight: 900, background: theme.timerBg, color: 'white', padding: '3px 8px', borderRadius: 100 }}>
              +{bonus} bonus {in24h ? '24h' : '48h'}
            </span>
          )}
          {expired && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#f3f4f6', color: '#6b7280', padding: '3px 8px', borderRadius: 100 }}>bonusuri expirate</span>
          )}
        </div>
      </div>

      {/* Row 3: Progress bar spre next threshold */}
      {!expired && (
        <div style={{ marginTop: 10 }}>
          <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 100, height: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: theme.timerBg,
              borderRadius: 100,
              width: `${Math.min(100, (msElapsed / (in24h ? 86_400_000 : 172_800_000)) * 100)}%`,
              transition: 'width 1s linear',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
            <span style={{ fontSize: 11, color: theme.color, opacity: 0.6 }}>Acceptat</span>
            <span style={{ fontSize: 11, color: theme.color, opacity: 0.6, fontWeight: 700 }}>
              {in24h ? 'Deadline bonus 24h' : 'Deadline bonus 48h'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers de afișare (design "Centrul de comandă") ────────────────────────
const TAB_LABEL: Record<Tab, string> = {
  'All': 'Toate', 'Invited': 'Invitate', 'Fara raspuns': 'Fără răspuns', 'Active': 'Active',
  'Applied': 'Aplicate', 'Completed': 'Finalizate', 'Respinse': 'Respinse',
}
const TAB_ORDER: Tab[] = ['All', 'Invited', 'Active', 'Applied', 'Completed', 'Fara raspuns', 'Respinse']
const STEPS = ['Aplicat', 'Acceptat', 'Pachet', 'Postat', 'Aprobat']

type Pastel = { label: string; bg: string; fg: string }
const GRN = { bg: '#dcf5ec', fg: '#14532d' }, AMB = { bg: '#fff1c2', fg: '#854d0e' }, BLU = { bg: '#e6f0ff', fg: '#1d4fb8' }
const VIO = { bg: '#efeaff', fg: '#5b2fd0' }, GRY = { bg: '#f0eff7', fg: '#4a4770' }, ORG = { bg: '#fff1e6', fg: '#9a4206' }
const RED = { bg: '#fff4f2', fg: '#b42318' }

const fmtRon = (n: number) => `${Number(n).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON`
const isDeliveryBarter = (c: any) => c.campaigns?.campaign_type === 'BARTER' && c.campaigns?.delivery_method === 'delivery'
const isPickupBarter = (c: any) => c.campaigns?.campaign_type === 'BARTER' && c.campaigns?.delivery_method === 'pickup'
const isPendingReview = (c: any) =>
  c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at
const isRejectedPost = (c: any) => c.status === 'ACTIVE' && !!c.deliverable_rejected_at && !c.deliverable_submitted_at
// Există un draft video care nu e încă aprobat de brand → nu se postează și nu se trimite dovada
const waitingDraft = (c: any) => c.status === 'ACTIVE' && !c.deliverable_submitted_at && (c.draft_status === 'pending' || c.draft_status === 'changes_requested')
const needsAddress = (c: any) => c.status === 'ACTIVE' && isDeliveryBarter(c) && !c.delivery_name
const isLatePost = (c: any) =>
  c.status === 'ACTIVE' && !!c.package_received_at && !c.deliverable_submitted_at && !!c.post_deadline_days &&
  (Date.now() - new Date(c.package_received_at).getTime()) > c.post_deadline_days * 86400000

// Pasul curent din cei 5 (null = fără progres; 5 = totul bifat)
function collabStage(c: any): number | null {
  if (c.status === 'COMPLETED') return 5
  if (c.status === 'PENDING') return 0
  if (c.status !== 'ACTIVE') return null
  if (isPendingReview(c)) return 4
  if (isDeliveryBarter(c) && !c.package_received_at) return 2
  return 3
}

function collabStatus(c: any, expired: boolean): Pastel {
  if (expired) return { label: 'Fără răspuns', ...AMB }
  if (c.status === 'INVITED') return { label: 'Invitat', ...BLU }
  if (c.status === 'PENDING') return { label: 'Aplicat · în așteptare', ...AMB }
  if (c.status === 'COMPLETED') return { label: 'Finalizat', ...VIO }
  if (c.status === 'REJECTED') return { label: 'Respins', ...GRY }
  if (c.status === 'ACTIVE') {
    if (isPendingReview(c)) return { label: 'În revizuire la brand', ...AMB }
    if (isRejectedPost(c)) return { label: 'Post respins', ...RED }
    if (waitingDraft(c)) return c.draft_status === 'pending' ? { label: 'Draft la brand', ...AMB } : { label: 'Modificări cerute la draft', ...ORG }
    if (isLatePost(c)) return { label: 'Întârziat', ...ORG }
    if (needsAddress(c)) return { label: 'Adresă necesară', ...AMB }
    if (isDeliveryBarter(c) && !c.package_sent_at) return { label: 'Brandul pregătește pachetul', ...BLU }
    if (isDeliveryBarter(c) && !c.package_received_at) return { label: 'Colet în drum', ...BLU }
    return { label: 'De postat', ...GRN }
  }
  return { label: c.status || '—', ...GRY }
}

// Chip de termen — vizibil doar după primirea coletului
function deadlineChip(c: any): Pastel | null {
  if (c.status !== 'ACTIVE' || isPendingReview(c) || isRejectedPost(c) || !c.package_received_at || c.deliverable_submitted_at) return null
  if (isLatePost(c)) return { label: 'Termen depășit', ...ORG }
  if (c.post_deadline_days) {
    const msLeft = c.post_deadline_days * 86400000 - (Date.now() - new Date(c.package_received_at).getTime())
    const d = Math.ceil(msLeft / 86400000)
    if (d <= 0) return { label: 'Astăzi e ultima zi', ...ORG }
    if (d === 1) return { label: 'Ultima zi — postează azi', ...ORG }
    if (d <= 3) return { label: `${d} zile rămase`, ...ORG }
    return { label: `Colet primit · ${d} zile rămase`, ...GRY }
  }
  return { label: 'Colet primit · postează', ...GRY }
}

// Câștig / plată pentru rând
function moneyInfo(c: any): { amt: string; tag: string; tagStyle: Pastel } | null {
  if (c.status === 'ACTIVE' && c.reserved_amount) return { amt: fmtRon(c.reserved_amount), tag: 'Plată garantată', tagStyle: { label: '', ...BLU } }
  if (c.status === 'COMPLETED' && c.payment_amount) return { amt: fmtRon(c.payment_amount), tag: 'Plătit', tagStyle: { label: '', ...GRN } }
  const camp = c.campaigns
  if (!camp) return null
  if (c.status === 'INVITED' && c.reserved_amount) return { amt: fmtRon(c.reserved_amount), tag: 'Câștig net', tagStyle: { label: '', ...VIO } }
  const perInf = camp.budget_per_influencer
    ? camp.budget_per_influencer
    : camp.max_influencers && camp.max_influencers > 0
      ? (camp.budget / camp.max_influencers)
      : camp.budget
  if (!(perInf > 0)) return null
  if (c.status === 'REJECTED') return { amt: fmtRon(perInf), tag: 'Buget', tagStyle: { label: '', ...GRY } }
  return { amt: fmtRon(perInf), tag: 'Câștig net', tagStyle: { label: '', ...VIO } }
}

function Track({ cur }: { cur: number }) {
  const lineW = Math.min(Math.max(cur, 0), 4) * 20
  return (
    <div className="ic-trk" role="img" aria-label={`Pas ${Math.min(cur + 1, 5)} din 5`}>
      <div className="ic-trk-line" /><div className="ic-trk-fill" style={{ width: `${lineW}%` }} />
      {STEPS.map((s, i) => {
        const done = i < cur, now = i === cur
        return (
          <div key={s} className="ic-trk-step">
            <span className="ic-trk-dot" style={{
              background: done ? '#7040f0' : now ? '#efeaff' : '#f0eff7',
              color: done ? '#fff' : now ? '#5b2fd0' : '#8783a8',
              boxShadow: now ? '0 0 0 3px #d9ccff' : 'none',
            }}>{done ? <Check size={11} strokeWidth={3.2} /> : i + 1}</span>
            <span className="ic-trk-lbl" style={{ fontWeight: 700, color: '#14123a', whiteSpace: 'nowrap', visibility: now ? 'visible' : 'hidden', height: now ? undefined : 0 }}>{s}</span>
          </div>
        )
      })}
    </div>
  )
}

const FACE_BG = ['#efeaff', '#e6f0ff', '#dcf5ec', '#fff1c2', '#fff1e6']
const FACE_FG = ['#5b2fd0', '#1d4fb8', '#14532d', '#854d0e', '#9a4206']
function BrandFace({ name, size = 40 }: { name?: string; size?: number }) {
  const n = name || '?'
  const k = (n.charCodeAt(0) || 0) % 5
  return (
    <span className="iu-face" style={{ width: size, height: size, background: FACE_BG[k], color: FACE_FG[k], fontSize: Math.round(size * 0.4), borderRadius: 12 }}>
      {n[0]?.toUpperCase()}
    </span>
  )
}

function Note({ tone = 'grey', title, right, children }: { tone?: string; title?: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={`ic-note ${tone}`}>
      {(title || right) && (
        <div className="ic-nh">
          {title ? <b className="ic-nt">{title}</b> : <span />}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

function DeliverableSection({ collab, onUpdated }: { collab: Collaboration; onUpdated: (updated: Partial<Collaboration> & { id: string }) => void }) {
  const existingUrls = collab.deliverable_urls?.length ? collab.deliverable_urls : collab.deliverable_url ? [collab.deliverable_url] : ['']
  const [urls, setUrls] = useState<string[]>(existingUrls)
  const [note, setNote] = useState(collab.deliverable_note || '')
  const [adsCode, setAdsCode] = useState(collab.ads_code || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showAdsHelp, setShowAdsHelp] = useState(false)
  const [licenseConsent, setLicenseConsent] = useState(!!collab.content_license_granted)
  const [thumbnailUrl, setThumbnailUrl] = useState(collab.thumbnail_url || '')

  const url = urls[0] || ''

  // Detectăm platforma din primul URL
  const platform = url.toLowerCase().includes('tiktok') ? 'tiktok'
    : url.toLowerCase().includes('instagram') ? 'instagram'
    : url.toLowerCase().includes('youtube') ? 'youtube'
    : null

  const addUrl = () => setUrls(prev => [...prev, ''])
  const removeUrl = (i: number) => setUrls(prev => prev.filter((_, idx) => idx !== i))
  const updateUrl = (i: number, val: string) => setUrls(prev => prev.map((u, idx) => idx === i ? val : u))

  const wasRejected = !!collab.deliverable_rejected_at && !collab.deliverable_submitted_at
  const isSubmitted = !!collab.deliverable_submitted_at && !collab.deliverable_approved_at && !collab.deliverable_rejected_at
  const isApproved = !!collab.deliverable_approved_at

  async function submit() {
    const validUrls = urls.map(u => u.trim()).filter(Boolean)
    if (!validUrls.length) { setError('Introdu cel puțin un link al postului tău'); return }
    for (const u of validUrls) {
      try { new URL(u) } catch { setError(`URL invalid: ${u}`); return }
    }
    if (!licenseConsent) { setError('Trebuie să accepți acordul de utilizare a conținutului pentru a trimite dovada'); return }
    if (!thumbnailUrl) { setError('Screenshot-ul postării este obligatoriu — adaugă o poză din postarea ta'); return }
    setSaving(true); setError(null)
    const sb = createClient()
    const now = new Date().toISOString()
    const { error: err } = await sb.from('collaborations').update({
      deliverable_url: validUrls[0],
      deliverable_urls: validUrls,
      deliverable_note: note.trim() || null,
      ads_code: adsCode.trim() || null,
      deliverable_submitted_at: now,
      deliverable_rejected_at: null,
      deliverable_rejection_reason: null,
      content_license_granted: true,
      content_license_at: now,
    }).eq('id', collab.id)
    if (err) { setError(err.message); setSaving(false); return }

    // Notifică brandul și adminul că dovada a fost trimisă
    fetch('/api/notify/deliverable-submitted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collabId: collab.id }),
    }).catch(console.error)
    onUpdated({
      id: collab.id,
      deliverable_url: validUrls[0],
      deliverable_urls: validUrls,
      deliverable_note: note.trim() || undefined,
      ads_code: adsCode.trim() || undefined,
      deliverable_submitted_at: now,
      deliverable_rejected_at: undefined,
      deliverable_rejection_reason: undefined,
      content_license_granted: true,
      content_license_at: now,
    })
    setSaving(false)
    setEditing(false)
  }

  // Câmpurile formularului (comune pentru trimitere / retrimitere / editare)
  const renderFields = () => (
    <>
      <div className="ic-f">
        <label className="iu-label">Link-uri postări publice *</label>
        <div className="ic-col" style={{ gap: 8 }}>
          {urls.map((u, i) => (
            <div key={i} className="iu-row" style={{ gap: 8 }}>
              <div className="iu-search" style={{ flex: 1 }}>
                <Link2 size={16} style={{ flex: 'none' }} />
                <input
                  type="url"
                  value={u}
                  onChange={e => { updateUrl(i, e.target.value); setError(null) }}
                  placeholder={`https://instagram.com/p/... (postarea ${i + 1})`}
                />
              </div>
              {urls.length > 1 && (
                <button onClick={() => removeUrl(i)} className="ic-x" title="Șterge" aria-label="Șterge linkul"><X size={16} /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={addUrl} className="ic-linkbtn">+ Adaugă alt link (story, post, reel etc.)</button>
        </div>
      </div>

      <div className="ic-f">
        <label className="iu-label">Screenshot postare <span style={{ color: '#b42318' }}>obligatoriu</span></label>
        <ThumbnailUpload
          collabId={collab.id}
          currentUrl={thumbnailUrl}
          onUploaded={url => setThumbnailUrl(url)}
        />
      </div>

      <div className="ic-f">
        <label className="iu-label">Notă pentru brand <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>(opțional)</span></label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="ex: Am postat marți, am atins 15k views în primele 24h, engagement rate 8%..."
          rows={2}
          className="iu-input ic-ta"
        />
      </div>

      <div className="ic-f">
        <div className="iu-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <label className="iu-label">Cod Spark Ads / Partnership Ads <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>(opțional)</span></label>
          <button type="button" onClick={() => setShowAdsHelp(v => !v)} className="ic-linkbtn" style={{ color: '#1d4fb8' }}>
            {showAdsHelp ? 'Ascunde' : 'Cum găsesc codul?'}
          </button>
        </div>
        {showAdsHelp && (
          <Note tone="blue">
            {platform === 'tiktok' ? (
              <>
                <b className="iu-sm">TikTok — Spark Ads</b>
                <ol className="ic-ol">
                  <li>Deschide postul, apasă „..." și alege „Ad settings"</li>
                  <li>Activează „Ad authorization" și selectează 30 zile</li>
                  <li>Copiază codul de 7 cifre generat</li>
                </ol>
              </>
            ) : platform === 'instagram' ? (
              <>
                <b className="iu-sm">Instagram — Partnership Ads</b>
                <ol className="ic-ol">
                  <li>Deschide postul, apasă „..." și activează „Allow brand partner to boost"</li>
                  <li>Brandul primește acces direct — nu există cod separat</li>
                </ol>
              </>
            ) : (
              <>
                <b className="iu-sm">Cod Ads per platformă</b>
                <span className="iu-xs"><b>TikTok:</b> postul, „..." , „Ad settings", „Ad authorization", cod de 7 cifre</span>
                <span className="iu-xs"><b>Instagram:</b> postul, „...", „Allow brand partner to boost"</span>
              </>
            )}
          </Note>
        )}
        <input type="text" value={adsCode} onChange={e => setAdsCode(e.target.value)}
          placeholder={platform === 'tiktok' ? 'ex: 1234567 (7 cifre)' : 'Codul Spark Ads sau Partnership Ads'}
          className="iu-input" style={{ width: '100%' }}
        />
        <span className="iu-xs iu-muted">Permite brandului să ruleze ads cu postul tău — mai multă vizibilitate pentru ambii.</span>
      </div>

      {error && (
        <div className="ic-note red" role="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} style={{ flex: 'none' }} /><b className="iu-sm" style={{ color: '#b42318' }}>{error}</b>
        </div>
      )}

      {/* Acord licență conținut */}
      <label className="ic-consent">
        <input type="checkbox" checked={licenseConsent} onChange={e => setLicenseConsent(e.target.checked)} />
        <span className="iu-xs" style={{ lineHeight: 1.55, color: '#4a4770' }}>
          <b style={{ color: '#5b2fd0' }}>Acord utilizare conținut</b> — Sunt de acord ca{' '}
          <b>AddFame.ro</b> să poată folosi acest conținut (postare, metrici, screenshot, repost) în
          materiale de promovare — inclusiv pe conturile oficiale <b>@addfame.ro</b>{' '}
          (Instagram, TikTok, LinkedIn, website), conform{' '}
          <a href="/termeni" target="_blank" rel="noreferrer" style={{ color: '#5b2fd0', fontWeight: 700 }}>Termenilor și Condițiilor</a>
          . <span style={{ color: '#b42318', fontWeight: 700 }}>obligatoriu</span>
        </span>
      </label>
    </>
  )

  const renderSubmitBtn = (label: string) => (
    <button onClick={submit} disabled={saving || !licenseConsent || !thumbnailUrl} className="iu-btn p big" style={{ flex: 1 }}>
      {saving
        ? <><Loader2 size={16} className="ic-spin" /> Se trimite…</>
        : <><Send size={15} /> {label}</>}
    </button>
  )

  // Respins sau în editare — formular de retrimitere
  if (wasRejected || editing) return (
    <div className="ic-col" style={{ gap: 14 }}>
      {wasRejected && !editing && (
        <Note tone="red">
          <div className="iu-row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
            <div className="ic-col" style={{ gap: 2 }}>
              <b className="iu-sm" style={{ color: '#b42318' }}>Post respins de brand</b>
              {collab.deliverable_rejection_reason && <span className="iu-xs" style={{ color: '#b42318' }}>„{collab.deliverable_rejection_reason}"</span>}
            </div>
          </div>
        </Note>
      )}
      <b className="iu-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Upload size={13} /> {wasRejected ? 'Retrimite dovada postului' : 'Editează dovada'}
      </b>
      {renderFields()}
      <div className="ic-btns">
        {editing && (
          <button onClick={() => { setEditing(false); setUrls(existingUrls); setNote(collab.deliverable_note || ''); setAdsCode(collab.ads_code || '') }} className="iu-btn big" style={{ flex: 1 }}>
            Anulează
          </button>
        )}
        {renderSubmitBtn(wasRejected ? 'Retrimite dovada' : 'Trimite dovada')}
      </div>
    </div>
  )

  // Trimis, în așteptarea brandului
  if (isSubmitted) return (
    <div className="ic-col" style={{ gap: 12 }}>
      <Note tone="amber" title={<span className="iu-row" style={{ gap: 8 }}><span className="ic-pulse" /> Dovadă trimisă — în așteptarea aprobării</span>}>
        {(collab.deliverable_urls?.length ? collab.deliverable_urls : [collab.deliverable_url]).filter(Boolean).map((u: string, i: number) => (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="ic-linkbox">
            <Link2 size={14} style={{ flex: 'none' }} />
            <span className="ic-linktxt">{u}</span>
            <ExternalLink size={13} style={{ flex: 'none' }} />
          </a>
        ))}
        {collab.ads_code && (
          <span className="iu-sm"><span className="iu-muted">Cod Ads:</span> <span className="ic-mono">{collab.ads_code}</span></span>
        )}
        {collab.deliverable_note && <span className="iu-xs" style={{ fontStyle: 'italic' }}>„{collab.deliverable_note}"</span>}
        <div className="iu-row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="iu-xs iu-muted">Trimis: {fmtDateTime(collab.deliverable_submitted_at!)}</span>
          <button onClick={() => setEditing(true)} className="ic-linkbtn" style={{ width: 'auto' }}>
            <RotateCcw size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} /> Editează
          </button>
        </div>
      </Note>
    </div>
  )

  // Încă netrimis — formular de trimitere
  return (
    <div className="ic-col" style={{ gap: 14 }}>
      {/* Motivare Creator Score cu timer live */}
      <ScoreTimerBanner acceptedAt={collab.created_at} />

      {/* Brief complet campanie */}
      {(collab.campaigns?.deliverables || collab.campaigns?.content_type?.length > 0 || collab.campaigns?.required_caption || collab.campaigns?.required_hashtags?.length > 0 || collab.campaigns?.key_messages?.length > 0 || collab.campaigns?.min_duration || collab.campaigns?.min_days_online || collab.campaigns?.story_instructions || collab.campaigns?.forbidden_mentions?.length > 0 || collab.campaigns?.tasks_ig_reel || collab.campaigns?.tasks_ig_post || collab.campaigns?.tasks_include_post || (collab.campaigns?.tasks_stories_count ?? 0) > 0 || collab.campaigns?.tasks_tt_video || collab.campaigns?.tasks_tt_live || collab.campaigns?.tasks_yt_short || collab.campaigns?.tasks_yt_video || collab.campaigns?.tasks_fb_post || collab.campaigns?.promotion_link || collab.campaigns?.brief_pdf_url) && (
        <div className="ic-brief">
          <b className="iu-label" style={{ color: '#5b2fd0' }}>Brief campanie — ce trebuie să faci</b>

          {(() => {
            const tasks: { label: string; sub?: string }[] = []
            const c = collab.campaigns
            if (!c) return null
            if ((c.tasks_stories_count ?? 0) > 0) tasks.push({ label: `${c.tasks_stories_count} Instagram ${c.tasks_stories_count === 1 ? 'Story' : 'Stories'}`, sub: c.tasks_ig_days_online ? `online minim ${c.tasks_ig_days_online} zile` : undefined })
            if (c.tasks_ig_reel) tasks.push({ label: 'Instagram Reel', sub: c.tasks_ig_reel_duration ? `minim ${c.tasks_ig_reel_duration} secunde` : undefined })
            if (c.tasks_ig_post || c.tasks_include_post) tasks.push({ label: 'Post Feed Instagram', sub: 'foto sau carousel' })
            if (c.tasks_ig_live) tasks.push({ label: 'Instagram Live' })
            if (c.tasks_tt_video) tasks.push({ label: 'TikTok Video', sub: [c.tasks_tt_video_duration ? `minim ${c.tasks_tt_video_duration} sec` : '', c.tasks_tt_days_online ? `online minim ${c.tasks_tt_days_online === 9999 ? 'permanent' : c.tasks_tt_days_online + ' zile'}` : ''].filter(Boolean).join(' · ') || undefined })
            if (c.tasks_tt_live) tasks.push({ label: 'TikTok Live' })
            if (c.tasks_tt_duet) tasks.push({ label: 'TikTok Duet' })
            if (c.tasks_yt_short) tasks.push({ label: 'YouTube Short', sub: c.tasks_yt_short_duration ? `minim ${c.tasks_yt_short_duration} sec` : undefined })
            if (c.tasks_yt_video) tasks.push({ label: 'Video YouTube', sub: c.tasks_yt_video_duration ? `minim ${c.tasks_yt_video_duration} min` : undefined })
            if (c.tasks_yt_mention) tasks.push({ label: 'Mențiune YouTube' })
            if (c.tasks_fb_post) tasks.push({ label: 'Facebook Post' })
            if (c.tasks_fb_story) tasks.push({ label: 'Facebook Story' })
            if (c.tasks_fb_reel) tasks.push({ label: 'Facebook Reel' })
            if (c.tasks_fb_share) tasks.push({ label: 'Share postare Facebook' })
            if (tasks.length === 0 && !c.deliverables) return null
            return (
              <div className="ic-tasks">
                <div className="iu-row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <b className="iu-sm">Ce trebuie să postezi</b>
                  <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{tasks.length} task{tasks.length !== 1 ? '-uri' : ''}</span>
                </div>
                {tasks.map((t, i) => (
                  <div key={i} className="ic-task">
                    <span className="ic-trk-dot" style={{ background: '#7040f0', color: '#fff', width: 24, height: 24 }}><Check size={12} strokeWidth={3.2} /></span>
                    <div className="ic-col" style={{ flex: 1, minWidth: 0 }}>
                      <b className="iu-sm">{t.label}</b>
                      {t.sub && <span className="iu-xs iu-muted">{t.sub}</span>}
                    </div>
                    <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>obligatoriu</span>
                  </div>
                ))}
                {tasks.length > 1 && (
                  <Note tone="amber">
                    <span className="iu-xs" style={{ fontWeight: 700 }}>Toate cele {tasks.length} task-uri sunt obligatorii — trimite link dovadă pentru fiecare postare.</span>
                  </Note>
                )}
              </div>
            )
          })()}

          {collab.campaigns?.content_type?.length > 0 && (
            <Note tone="grey" title="Tip conținut"><b className="iu-sm">{collab.campaigns.content_type.join(', ')}</b></Note>
          )}
          {collab.campaigns?.brief_pdf_url && (
            <a href={collab.campaigns.brief_pdf_url} target="_blank" rel="noopener noreferrer" className="iu-btn p big" style={{ justifyContent: 'space-between' }}>
              <span className="iu-row" style={{ gap: 8 }}><FileText size={16} /> Citește brieful campaniei</span>
              <span style={{ opacity: .8, fontSize: 12 }}>Deschide PDF</span>
            </a>
          )}
          {collab.campaigns?.promotion_link && (
            <Note tone="green" title="Link de promovat">
              <a href={collab.campaigns.promotion_link} target="_blank" rel="noopener noreferrer" className="iu-sm" style={{ color: '#14532d', fontWeight: 700, wordBreak: 'break-all' }}>{collab.campaigns.promotion_link}</a>
            </Note>
          )}
          {collab.campaigns?.story_instructions && (
            <Note tone="grey" title="Instrucțiuni story"><span className="iu-sm" style={{ whiteSpace: 'pre-wrap' }}>{collab.campaigns.story_instructions}</span></Note>
          )}
          {(collab.campaigns?.min_duration || collab.campaigns?.min_days_online) && (
            <div className="ic-grid2">
              {collab.campaigns?.min_duration && <Note tone="grey" title="Durată minimă"><b className="iu-sm">{collab.campaigns.min_duration} secunde</b></Note>}
              {collab.campaigns?.min_days_online && <Note tone="grey" title="Online minim"><b className="iu-sm">{collab.campaigns.min_days_online} zile</b></Note>}
            </div>
          )}
          {collab.campaigns?.required_caption && (
            <Note tone="amber" title="Caption obligatoriu"><span className="iu-sm" style={{ whiteSpace: 'pre-wrap' }}>{collab.campaigns.required_caption}</span></Note>
          )}
          {collab.campaigns?.required_hashtags?.length > 0 && (
            <Note tone="blue" title="Hashtag-uri obligatorii"><b className="iu-sm" style={{ color: '#1d4fb8' }}>#{collab.campaigns.required_hashtags.join(' #')}</b></Note>
          )}
          {collab.campaigns?.key_messages?.length > 0 && (
            <Note tone="violet" title="Mesaje cheie de transmis">
              <ul className="ic-ul">{collab.campaigns.key_messages.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
            </Note>
          )}
          {collab.campaigns?.forbidden_mentions?.length > 0 && (
            <Note tone="red" title="Nu menționa / evită"><span className="iu-sm" style={{ color: '#b42318' }}>{collab.campaigns.forbidden_mentions.join(', ')}</span></Note>
          )}
        </div>
      )}

      {renderFields()}
      <div className="ic-btns">{renderSubmitBtn('Trimite dovada postului')}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CollaborationsPage() {
  const [collabs, setCollabs] = useState<Collaboration[]>([])
  const [checkinInputs, setCheckinInputs] = useState<Record<string, string>>({})
  const [checkinLoading, setCheckinLoading] = useState<Record<string, boolean>>({})
  const [checkinError, setCheckinError] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addressModal, setAddressModal] = useState<{ collabId: string } | null>(null)
  const [address, setAddress] = useState({ name: '', phone: '', address: '', city: '', county: '', postal_code: '' })
  const [campaignModalId, setCampaignModalId] = useState<string | null>(null)
  const [deliverableModalId, setDeliverableModalId] = useState<string | null>(null)
  const [reviewModalId, setReviewModalId] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  // Linkuri directe din dashboard: /influencer/collaborations?tab=invited | noReply | active | applied | completed
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    const map: Record<string, Tab> = { invited: 'Invited', noReply: 'Fara raspuns', active: 'Active', applied: 'Applied', completed: 'Completed' }
    if (t && map[t]) setActiveTab(map[t])
  }, [])

  const fetchCollabs = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: inf } = await sb.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) return
      const { data, error } = await sb
        .from('collaborations')
        .select('*, reserved_amount, payment_amount, campaigns(id, title, brand_name, budget, budget_per_influencer, max_influencers, deadline, platforms, description, product_name, content_type, content_tone, min_duration, required_caption, required_hashtags, min_days_online, forbidden_mentions, forbidden_content, proof_requirements, key_messages, campaign_type, delivery_method, offer_name, offer_value, offer_description, story_instructions, offer_image_url, offer_image_urls, registrations_open, registration_opened_at, registration_deadline_days, deliverables, promotion_link, promotion_link_placement, tasks_stories_count, tasks_include_post, tasks_ig_reel, tasks_ig_reel_duration, tasks_ig_post, tasks_ig_live, tasks_ig_days_online, tasks_tt_video, tasks_tt_video_duration, tasks_tt_live, tasks_tt_duet, tasks_tt_days_online, tasks_yt_short, tasks_yt_short_duration, tasks_yt_video, tasks_yt_video_duration, tasks_yt_mention, tasks_fb_post, tasks_fb_story, tasks_fb_reel, tasks_fb_share, brief_pdf_url), package_sent_at, package_tracking, package_courier, package_received_at, post_deadline_days, checked_in_at')
        .eq('influencer_id', inf.id)
        .order('created_at', { ascending: false })
      if (!error && data) {
        // statusul ultimului draft video (pentru nota „Trimite dovada”); fără el pagina merge ca înainte
        const st: Record<string, string> = await fetch('/api/deliverables/mine').then(r => r.ok ? r.json() : {}).then((j: any) => j?.statuses || {}).catch(() => ({}))
        setCollabs((data as Collaboration[]).map(c => ({ ...c, draft_status: st[c.id] || null })))
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCollabs()
    let cancelled = false
    let channel: any = null
    const sb = createClient()
    const setup = async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user || cancelled) return
      const { data: inf } = await sb.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf || cancelled) return
      channel = sb.channel(`collabs-rt-${inf.id}-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborations', filter: `influencer_id=eq.${inf.id}` }, fetchCollabs)
        .subscribe()
    }
    setup()
    return () => { cancelled = true; if (channel) sb.removeChannel(channel) }
  }, [fetchCollabs])

  async function handleAction(collabId: string, action: 'accept' | 'decline', inv?: any) {
    // Verifica daca inscrierile sunt deschise
    if (action === 'accept' && inv?.campaigns?.registrations_open === false) {
      notify('Înscrierile pentru această campanie sunt închise momentan.', false)
      return
    }
    // Daca e barter cu livrare si accepta → cere adresa mai intai
    if (action === 'accept' && inv?.campaigns?.campaign_type === 'BARTER' && inv?.campaigns?.delivery_method === 'delivery') {
      setAddressModal({ collabId })
      return
    }
    setActionLoading(collabId)
    try {
      const sb = createClient()
      // Dacă e invitație de la admin (admin_invited), acceptarea pune PENDING (brandul trebuie să aprobe)
      // Dacă e aplicație normală, acceptarea pune ACTIVE direct
      const isAdminInvite = inv?.admin_invited === true
      const newStatus = action === 'accept'
        ? (isAdminInvite ? 'PENDING' : 'ACTIVE')
        : 'REJECTED'
      const { error } = await sb.from('collaborations').update({ status: newStatus }).eq('id', collabId)
      if (error) throw error
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: newStatus } : c))
      notify(
        action === 'accept'
          ? (isAdminInvite ? '✅ Invitație acceptată! Brandul va confirma colaborarea.' : '🎉 Ești activ pe această campanie.')
          : 'Invitație refuzată.',
        action === 'accept'
      )
    } catch (e: any) { notify(e.message || 'Ceva a mers greșit.', false) }
    finally { setActionLoading(null) }
  }

  async function handleAcceptWithAddress() {
    if (!addressModal) return
    if (!address.name || !address.phone || !address.address || !address.city || !address.county) {
      notify('Completează toate câmpurile obligatorii', false)
      return
    }
    setActionLoading(addressModal.collabId)
    try {
      const sb = createClient()
      const collab = collabs.find(c => c.id === addressModal.collabId)
      const isAdminInvite = collab?.admin_invited === true
      const newStatus = isAdminInvite ? 'PENDING' : 'ACTIVE'
      const { error } = await sb.from('collaborations').update({
        status: newStatus,
        delivery_name: address.name,
        delivery_phone: address.phone,
        delivery_address: address.address,
        delivery_city: address.city,
        delivery_county: address.county,
        delivery_postal_code: address.postal_code,
      }).eq('id', addressModal.collabId)
      if (error) throw error
      setCollabs(prev => prev.map(c => c.id === addressModal.collabId ? {
        ...c,
        status: newStatus,
        delivery_name: address.name,
        delivery_phone: address.phone,
        delivery_address: address.address,
        delivery_city: address.city,
        delivery_county: address.county,
        delivery_postal_code: address.postal_code,
      } : c))
      setAddressModal(null)
      setAddress({ name: '', phone: '', address: '', city: '', county: '', postal_code: '' })
      notify(isAdminInvite ? '✅ Invitație acceptată! Brandul va confirma colaborarea.' : '🎉 Invitație acceptată! Brandul va primi adresa ta de livrare.', true)
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setActionLoading(null) }
  }

  function updateCollab(updated: Partial<Collaboration> & { id: string }) {
    setCollabs(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }

  // Detectam invitatiile la care nu mai poate raspunde (expirate sau inchise manual)
  const isExpiredInvite = (c: any) => {
    if (c.status !== 'INVITED') return false
    // Inchise manual de admin/brand
    if (c.campaigns?.registrations_open === false) return true
    // Expirate prin timp
    const openedAt = c.campaigns?.registration_opened_at
    const days = c.campaigns?.registration_deadline_days || 30
    if (!openedAt) return false
    const expiry = new Date(new Date(openedAt).getTime() + days * 86400000)
    return expiry < new Date()
  }

  const filtered = collabs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.campaigns?.title?.toLowerCase().includes(q) || c.campaigns?.brand_name?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (activeTab === 'Fara raspuns') return isExpiredInvite(c)
    if (activeTab === 'Invited') return c.status === 'INVITED' && !isExpiredInvite(c)
    if (activeTab === 'All') return !isExpiredInvite(c)
    return TAB_FILTER[activeTab].includes(c.status)
  })

  const expiredCount = collabs.filter(c => isExpiredInvite(c)).length

  const counts: Record<Tab, number> = {
    'All': collabs.filter(c => !isExpiredInvite(c)).length,
    'Invited': collabs.filter(c => c.status === 'INVITED' && !isExpiredInvite(c)).length,
    'Fara raspuns': expiredCount,
    'Active': collabs.filter(c => c.status === 'ACTIVE').length,
    'Applied': collabs.filter(c => c.status === 'PENDING').length,
    'Completed': collabs.filter(c => c.status === 'COMPLETED').length,
    'Respinse': collabs.filter(c => c.status === 'REJECTED').length,
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

  async function confirmPackageReceived(c: Collaboration) {
    const sb = createClient()
    await sb.from('collaborations').update({ package_received_at: new Date().toISOString() }).eq('id', c.id)
    setCollabs(prev => prev.map(col => col.id === c.id ? { ...col, package_received_at: new Date().toISOString() } : col))
  }

  async function submitCheckin(c: Collaboration) {
    const code = checkinInputs[c.id] || ''
    if (code.length < 4) { setCheckinError(p => ({ ...p, [c.id]: 'Codul trebuie să aibă minim 4 caractere' })); return }
    setCheckinLoading(p => ({ ...p, [c.id]: true }))
    setCheckinError(p => ({ ...p, [c.id]: '' }))
    const res = await checkInWithCode(c.id, code) as any
    if (res.success) {
      setCollabs(prev => prev.map(col => col.id === c.id ? { ...col, checked_in_at: new Date().toISOString() } : col))
    } else {
      setCheckinError(p => ({ ...p, [c.id]: res.error || 'Cod incorect' }))
    }
    setCheckinLoading(p => ({ ...p, [c.id]: false }))
  }

  if (loading) return (
    <div className="iu" aria-busy="true">
      <style>{IC_CSS}</style>
      <div className="iu-head">
        <div className="ic-col" style={{ gap: 8 }}>
          <div className="ic-sk" style={{ width: 260, height: 34 }} />
          <div className="ic-sk" style={{ width: 320, height: 14 }} />
        </div>
      </div>
      <div className="ic-sk" style={{ height: 38, width: '70%', borderRadius: 99 }} />
      <div className="iu-card">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={i ? 'ic-rw' : ''} style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="ic-sk" style={{ width: 40, height: 40, borderRadius: 12 }} />
            <div className="ic-col" style={{ flex: 1, gap: 8 }}>
              <div className="ic-sk" style={{ width: '45%', height: 14 }} />
              <div className="ic-sk" style={{ width: '25%', height: 11 }} />
            </div>
            <div className="ic-sk" style={{ width: 90, height: 24, borderRadius: 99 }} />
          </div>
        ))}
      </div>
      <p className="iu-sm iu-muted" style={{ textAlign: 'center', margin: 0 }}>Se încarcă colaborările…</p>
    </div>
  )

  const fmtLong = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
  const totalGuaranteed = collabs.filter(c => c.status === 'ACTIVE' && c.reserved_amount).reduce((s, c) => s + (c.reserved_amount || 0), 0)
  const totalPaid = collabs.filter(c => c.status === 'COMPLETED' && c.payment_amount).reduce((s, c) => s + (c.payment_amount || 0), 0)
  const toPostCount = needsDeliverable.length + needsResubmit.length
  const newInvites = invitations.filter(inv => !isExpiredInvite(inv))
  const reviewCollab = collabs.find(c => c.id === reviewModalId)
  const deliverableCollab = collabs.find(c => c.id === deliverableModalId)

  const CopyBtn = ({ text, msg }: { text: string; msg: string }) => (
    <button type="button" className="ic-copy" onClick={() => { navigator.clipboard.writeText(text); notify(msg) }}>
      <Copy size={12} /> Copiază
    </button>
  )

  // ── Detalii invitație: brief + ofertă barter ──
  const renderInviteDetails = (inv: Collaboration) => {
    const camp: any = inv.campaigns
    return (
      <div className="ic-col" style={{ gap: 12 }}>
        {inv.message && inv.message !== 'You have been invited to collaborate on a campaign.' && (
          <Note tone="blue" title="Mesaj de la brand"><span className="iu-sm" style={{ fontStyle: 'italic' }}>„{inv.message}"</span></Note>
        )}
        {camp?.campaign_type === 'BARTER' && (
          <div className="ic-offer">
            {camp?.offer_image_url && <img src={camp.offer_image_url} alt={camp.offer_name || ''} className="ic-offer-img" />}
            <div className="ic-col" style={{ gap: 8, padding: 14 }}>
              <b className="ic-nt" style={{ color: '#9a4206' }}>Ofertă barter</b>
              {camp?.offer_name && <b className="iu-sm">{camp.offer_name}</b>}
              {camp?.offer_description && <span className="iu-xs" style={{ color: '#4a4770', lineHeight: 1.55 }}>{camp.offer_description}</span>}
              {camp?.delivery_method && (
                <span className="iu-xs" style={{ fontWeight: 700 }}>
                  {camp.delivery_method === 'delivery' ? 'Livrare la domiciliu' : 'Ridicare personală'}
                </span>
              )}
              {camp?.deliverables && <Note tone="grey" title="Ce trebuie să postezi"><b className="iu-sm">{camp.deliverables}</b></Note>}
              {camp?.story_instructions && <Note tone="grey" title="Instrucțiuni"><span className="iu-xs" style={{ lineHeight: 1.55 }}>{camp.story_instructions}</span></Note>}
            </div>
          </div>
        )}
        <div className="ic-grid2">
          {camp?.product_name && <Note tone="grey" title="Produs"><b className="iu-sm">{camp.product_name}</b></Note>}
          {camp?.content_type?.length > 0 && <Note tone="grey" title="Tip conținut"><b className="iu-sm">{camp.content_type.join(', ')}</b></Note>}
          {camp?.min_duration && <Note tone="grey" title="Durată minimă"><b className="iu-sm">{camp.min_duration} secunde</b></Note>}
          {camp?.min_days_online && <Note tone="grey" title="Online minim"><b className="iu-sm">{camp.min_days_online} zile</b></Note>}
        </div>
        {camp?.required_caption && <Note tone="amber" title="Caption obligatoriu"><span className="iu-sm" style={{ whiteSpace: 'pre-wrap' }}>{camp.required_caption}</span></Note>}
        {camp?.required_hashtags?.length > 0 && <Note tone="blue" title="Hashtag-uri obligatorii"><b className="iu-sm" style={{ color: '#1d4fb8' }}>#{camp.required_hashtags.join(' #')}</b></Note>}
        {camp?.key_messages?.length > 0 && (
          <Note tone="violet" title="Mesaje cheie">
            <ul className="ic-ul">{camp.key_messages.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
          </Note>
        )}
        {camp?.forbidden_mentions?.length > 0 && <Note tone="red" title="Nu este permis"><span className="iu-sm" style={{ color: '#b42318' }}>{camp.forbidden_mentions.join(', ')}</span></Note>}
        {camp?.registrations_open === false && (
          <Note tone="amber">
            <b className="iu-sm">Înscrieri închise</b>
            <span className="iu-xs">Nu-ți face griji — brandurile lansează campanii noi regulat. Mai multe oferte vin în curând pe AddFame.</span>
          </Note>
        )}
        {camp?.id && (
          <a href={`/influencer/campaigns/${camp.id}`} target="_blank" rel="noopener noreferrer" className="ic-linkbtn" style={{ width: 'auto', color: '#5b2fd0' }}>
            Vezi pagina completă a campaniei →
          </a>
        )}
      </div>
    )
  }

  // ── Detalii colaborare activă / aplicată / finalizată ──
  const renderDetails = (c: Collaboration) => {
    const camp: any = c.campaigns
    const imgs = (Array.isArray(camp?.offer_image_urls) && camp.offer_image_urls.length > 0)
      ? camp.offer_image_urls.filter(Boolean)
      : (camp?.offer_image_url ? [camp.offer_image_url] : [])
    const deliveryBarter = isDeliveryBarter(c)
    return (
      <div className="ic-col" style={{ gap: 12 }}>

        {/* Postare respinsă */}
        {isRejectedPost(c) && (
          <Note tone="red">
            <div className="iu-row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ flex: 'none', marginTop: 2 }} />
              <div className="ic-col" style={{ gap: 2 }}>
                <b className="iu-sm" style={{ color: '#b42318' }}>Post respins de brand</b>
                {c.deliverable_rejection_reason && <span className="iu-xs" style={{ color: '#b42318' }}>„{c.deliverable_rejection_reason}"</span>}
              </div>
            </div>
            <button className="iu-btn p" style={{ alignSelf: 'flex-start' }} onClick={() => setDeliverableModalId(c.id)}>Retrimite dovada</button>
          </Note>
        )}

        {/* Adresă livrare lipsă */}
        {needsAddress(c) && (
          <Note tone="amber" title="Completează adresa de livrare">
            <span className="iu-xs">Brandul are nevoie de adresa ta pentru a-ți trimite produsul.</span>
            <button className="iu-btn p" style={{ alignSelf: 'flex-start' }} onClick={() => setAddressModal({ collabId: c.id })}>Adaugă adresa de livrare</button>
          </Note>
        )}

        {/* Check-in locație - barter pickup */}
        {c.status === 'ACTIVE' && isPickupBarter(c) && (
          <Note tone="violet" title="Check-in la locație">
            {c.checked_in_at ? (
              <div className="iu-row" style={{ gap: 8 }}>
                <CheckCircle size={18} />
                <div className="ic-col">
                  <b className="iu-sm" style={{ color: '#5b2fd0' }}>Check-in confirmat</b>
                  <span className="iu-xs iu-muted">{new Date(c.checked_in_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ) : (
              <>
                <span className="iu-xs">Cere codul de 6 caractere de la brand când ajungi la locație.</span>
                <div className="iu-row" style={{ gap: 8 }}>
                  <input
                    value={checkinInputs[c.id] || ''}
                    onChange={e => setCheckinInputs(p => ({ ...p, [c.id]: e.target.value.toUpperCase().slice(0, 6) }))}
                    placeholder="AB3X7K"
                    maxLength={6}
                    className="iu-input"
                    style={{ flex: 1, textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase' }}
                  />
                  <button className="iu-btn p" onClick={() => submitCheckin(c)} disabled={checkinLoading[c.id] || !checkinInputs[c.id]}>
                    {checkinLoading[c.id] ? <Loader2 size={15} className="ic-spin" /> : <Check size={15} />} OK
                  </button>
                </div>
                {checkinError[c.id] && <b className="iu-xs" style={{ color: '#b42318' }}>{checkinError[c.id]}</b>}
              </>
            )}
          </Note>
        )}

        {/* Status livrare - barter */}
        {c.status === 'ACTIVE' && deliveryBarter && c.delivery_name && (
          <>
            {c.package_sent_at && !c.package_received_at && (
              <Note tone="blue" title="Pachetul tău e în drum">
                {c.package_courier && <span className="iu-sm">Curier: <b>{c.package_courier}</b>{c.package_tracking ? ` · AWB: ${c.package_tracking}` : ''}</span>}
                <span className="iu-xs">Trimis pe {fmtLong(c.package_sent_at)}. Confirmă când ajunge.</span>
                <button className="iu-btn p" style={{ alignSelf: 'flex-start' }} onClick={() => confirmPackageReceived(c)}>
                  <Check size={15} /> Am primit coletul
                </button>
              </Note>
            )}
            {!c.deliverable_submitted_at && !c.deliverable_approved_at && c.package_received_at && (() => {
              const deadline = new Date(new Date(c.package_received_at).getTime() + (c.post_deadline_days || 14) * 86400000)
              const msLeft = deadline.getTime() - Date.now()
              const daysLeft = Math.max(0, Math.floor(msLeft / 86400000))
              const hoursLeft = Math.max(0, Math.floor((msLeft % 86400000) / 3600000))
              const urgent = daysLeft <= 2
              const expired = msLeft <= 0
              return (
                <Note tone={expired ? 'red' : urgent ? 'orange' : 'amber'} title={expired ? 'Termen depășit — riști un strike' : urgent ? 'Urgent — mai ai puțin timp' : 'Timp rămas pentru postare'}>
                  {!expired ? (
                    <>
                      <div className="iu-row" style={{ gap: 6, alignItems: 'baseline' }}>
                        <b className="iu-d" style={{ fontSize: 28 }}>{daysLeft}</b><span className="iu-sm">zile</span>
                        <b className="iu-d" style={{ fontSize: 20, marginLeft: 6 }}>{hoursLeft}</b><span className="iu-sm">ore</span>
                      </div>
                      {urgent && (
                        <span className="iu-xs" style={{ fontWeight: 700 }}>
                          Postează și trimite dovada înainte de {deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}, ora {deadline.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className="iu-xs">Termen: {deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </>
                  ) : (
                    <>
                      <b className="iu-sm" style={{ color: '#b42318' }}>Termenul a expirat pe {fmtLong(deadline.toISOString())}</b>
                      <span className="iu-xs">Contactează-ne la contact@addfame.ro dacă ai nevoie de ajutor.</span>
                    </>
                  )}
                </Note>
              )
            })()}
          </>
        )}

        {(c.status === 'ACTIVE' || c.status === 'COMPLETED') && (
          <>
          <DraftReview collabId={c.id} role="influencer" canUpload={c.status === 'ACTIVE'} />
          <DisputeButton collabId={c.id} role="influencer" />
          </>
        )}

        {/* Dovadă: de trimis / în revizuire */}
        {waitingDraft(c) && (
          <Note tone="amber" title={c.draft_status === 'pending' ? 'Așteaptă aprobarea draftului' : 'Brandul a cerut modificări la draft'}>
            <span className="iu-xs">
              {c.draft_status === 'pending'
                ? 'Nu posta încă. După ce brandul aprobă draftul, publici exact varianta aprobată și trimiți aici linkul postării.'
                : 'Trimite o versiune nouă a draftului mai sus. Postezi abia după aprobare.'}
            </span>
          </Note>
        )}
        {c.status === 'ACTIVE' && !c.deliverable_submitted_at && !isRejectedPost(c) && !needsAddress(c) && !waitingDraft(c) && (
          <Note tone="violet" title="Trimite dovada postului">
            <span className="iu-xs">Publică postul și trimite link-ul pentru a primi plata.</span>
            <button className="iu-btn p" style={{ alignSelf: 'flex-start' }} onClick={() => setDeliverableModalId(c.id)}><Upload size={15} /> Trimite dovada</button>
          </Note>
        )}
        {isPendingReview(c) && (
          <Note tone="amber" title="Dovadă trimisă — în așteptarea aprobării">
            {c.deliverable_url && (
              <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer" className="ic-linkbox">
                <Link2 size={14} style={{ flex: 'none' }} /><span className="ic-linktxt">{c.deliverable_url}</span><ExternalLink size={13} style={{ flex: 'none' }} />
              </a>
            )}
            <button className="iu-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setDeliverableModalId(c.id)}><Eye size={15} /> Vezi / editează dovada</button>
          </Note>
        )}

        {/* Finalizat */}
        {c.status === 'COMPLETED' && c.deliverable_url && (
          <Note tone="green" title="Post aprobat de brand">
            <a href={c.deliverable_url} target="_blank" rel="noopener noreferrer" className="ic-linkbox">
              <Link2 size={14} style={{ flex: 'none' }} /><span className="ic-linktxt">{c.deliverable_url}</span><ExternalLink size={13} style={{ flex: 'none' }} />
            </a>
            {c.deliverable_approved_at && <span className="iu-xs iu-muted">Aprobat: {fmtDateTime(c.deliverable_approved_at)}</span>}
            {c.payment_amount ? <span className="iu-xs iu-muted">Plată eliberată: <b style={{ color: '#14532d' }}>{fmtRon(c.payment_amount)}</b></span> : null}
          </Note>
        )}

        {/* Statisticile postării (apar în raportul brandului) */}
        {(c.status === 'ACTIVE' || c.status === 'COMPLETED') && c.deliverable_url && <PostStatsForm collabId={c.id} />}

        {/* Mesaj de la brand */}
        {c.message && c.message !== 'You have been invited to collaborate on a campaign.' && (
          <Note tone="blue" title="Mesaj de la brand"><span className="iu-sm" style={{ fontStyle: 'italic' }}>„{c.message}"</span></Note>
        )}

        {/* Despre campanie */}
        {camp?.description && <Note tone="grey" title="Despre campanie"><span className="iu-sm" style={{ lineHeight: 1.55 }}>{camp.description}</span></Note>}

        {/* Ofertă barter */}
        {camp?.offer_name && (
          <div className="ic-offer">
            {imgs.length > 0 && (
              <div style={{ position: 'relative' }}>
                <img src={imgs[0]} alt={camp.offer_name} className="ic-offer-img" />
                {imgs.length > 1 && <span className="ic-imgcount">+{imgs.length - 1} imagini</span>}
              </div>
            )}
            <div className="ic-col" style={{ gap: 6, padding: 14 }}>
              <b className="ic-nt" style={{ color: '#9a4206' }}>Ce primești</b>
              <b className="iu-sm">{camp.offer_name}</b>
              {camp.offer_description && <span className="iu-xs" style={{ color: '#4a4770', lineHeight: 1.55 }}>{camp.offer_description}</span>}
            </div>
          </div>
        )}

        {camp?.story_instructions && (
          <Note tone="violet" title="Instrucțiuni postare"><span className="iu-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{camp.story_instructions}</span></Note>
        )}

        {camp?.promotion_link && (
          <Note tone="green" title="Link produs / promovare" right={<CopyBtn text={camp.promotion_link} msg="Link copiat!" />}>
            <a href={camp.promotion_link} target="_blank" rel="noopener noreferrer" className="iu-sm" style={{ color: '#14532d', fontWeight: 700, wordBreak: 'break-all' }}>{camp.promotion_link}</a>
            {Array.isArray(camp.promotion_link_placement) && camp.promotion_link_placement.length > 0 && (
              <div className="iu-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {camp.promotion_link_placement.map((place: string) => (
                  <span key={place} className="iu-chip" style={{ background: '#fff', color: '#14532d', height: 22 }}>{place}</span>
                ))}
              </div>
            )}
          </Note>
        )}

        {camp?.required_caption && (
          <Note tone="violet" title="Caption obligatoriu" right={<CopyBtn text={camp.required_caption} msg="Caption copiat!" />}>
            <span className="iu-sm" style={{ whiteSpace: 'pre-wrap' }}>{camp.required_caption}</span>
          </Note>
        )}

        {Array.isArray(camp?.required_hashtags) && camp.required_hashtags.length > 0 && (
          <Note tone="blue" title="Hashtag-uri obligatorii" right={<CopyBtn text={camp.required_hashtags.map((t: string) => '#' + t.replace(/^#/, '')).join(' ')} msg="Hashtag-uri copiate!" />}>
            <div className="iu-row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {camp.required_hashtags.map((tag: string) => (
                <span key={tag} className="iu-chip" style={{ background: '#fff', color: '#1d4fb8', height: 24 }}>#{tag.replace(/^#/, '')}</span>
              ))}
            </div>
          </Note>
        )}

        {(camp?.forbidden_content || (Array.isArray(camp?.forbidden_mentions) && camp.forbidden_mentions.length > 0)) && (
          <Note tone="red" title="Ce să eviți">
            {camp.forbidden_content && <span className="iu-sm" style={{ whiteSpace: 'pre-wrap', color: '#14123a' }}>{camp.forbidden_content}</span>}
            {Array.isArray(camp.forbidden_mentions) && camp.forbidden_mentions.length > 0 && (
              <div className="iu-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {camp.forbidden_mentions.map((m: string) => (
                  <span key={m} className="iu-chip" style={{ background: '#fff', color: '#b42318', height: 22 }}>{m}</span>
                ))}
              </div>
            )}
          </Note>
        )}

        <div className="iu-row" style={{ gap: 14, flexWrap: 'wrap' }}>
          {camp?.id && (
            <a href={`/influencer/campaigns/${camp.id}`} target="_blank" rel="noopener noreferrer" className="ic-linkbtn" style={{ width: 'auto', color: '#5b2fd0' }}>
              Vezi pagina completă a campaniei →
            </a>
          )}
          {c.status !== 'REJECTED' && (
            <Link href={`/influencer/inbox?collab=${c.id}`} className="ic-linkbtn" style={{ width: 'auto', color: '#5b2fd0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={14} /> Deschide chat
            </Link>
          )}
        </div>
      </div>
    )
  }

  // ── Acțiunea principală a rândului ──
  const renderAction = (c: Collaboration, expired: boolean) => {
    if (expired) return null
    const busy = actionLoading === c.id
    const isExp = expandedId === c.id
    const toggle = () => setExpandedId(isExp ? null : c.id)
    let main: React.ReactNode = null
    if (c.status === 'INVITED') {
      main = c.campaigns?.registrations_open === false
        ? <span className="iu-chip" style={{ background: '#fff4f2', color: '#b42318', height: 32 }}>Înscrieri închise</span>
        : (
          <>
            <button className="iu-btn p" onClick={() => handleAction(c.id, 'accept', c)} disabled={busy}>
              {busy ? <Loader2 size={15} className="ic-spin" /> : <Check size={15} />} Acceptă
            </button>
            <button className="iu-btn danger" onClick={() => handleAction(c.id, 'decline', c)} disabled={busy}>Refuz</button>
          </>
        )
    } else if (c.status === 'PENDING') {
      main = <Link href={`/influencer/inbox?collab=${c.id}`} className="iu-btn"><MessageSquare size={15} /> Deschide chat</Link>
    } else if (c.status === 'ACTIVE') {
      if (isRejectedPost(c)) main = <button className="iu-btn p" onClick={() => setDeliverableModalId(c.id)}><Upload size={15} /> Retrimite dovada</button>
      else if (needsAddress(c)) main = <button className="iu-btn p" onClick={() => setAddressModal({ collabId: c.id })}><Truck size={15} /> Adaugă adresa</button>
      else if (isDeliveryBarter(c) && c.package_sent_at && !c.package_received_at) main = <button className="iu-btn p" onClick={() => confirmPackageReceived(c)}><Package size={15} /> Am primit coletul</button>
      else if (isPickupBarter(c) && !c.checked_in_at) main = <button className="iu-btn p" onClick={toggle}><Check size={15} /> Check-in</button>
      else if (isPendingReview(c)) main = <Link href={`/influencer/inbox?collab=${c.id}`} className="iu-btn"><MessageSquare size={15} /> Deschide chat</Link>
      else if (waitingDraft(c)) main = <button className="iu-btn" onClick={toggle}><Eye size={15} /> Vezi draftul</button>
      else if (!c.deliverable_submitted_at && !(isDeliveryBarter(c) && !c.package_received_at)) main = <button className="iu-btn p" onClick={() => setDeliverableModalId(c.id)}><Upload size={15} /> Trimite dovada</button>
      else main = <Link href={`/influencer/inbox?collab=${c.id}`} className="iu-btn"><MessageSquare size={15} /> Deschide chat</Link>
    } else if (c.status === 'COMPLETED') {
      main = <button className="iu-btn" onClick={() => setReviewModalId(c.id)}><Star size={15} /> Lasă o evaluare</button>
    }
    return (
      <div className="ic-act">
        {main}
        <button className="iu-btn ic-chev" aria-label="Detalii" aria-expanded={isExp} onClick={toggle}>
          <ChevronRight size={16} style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      </div>
    )
  }

  const renderRow = (c: Collaboration) => {
    const expired = isExpiredInvite(c)
    const st = collabStatus(c, expired)
    const dl = deadlineChip(c)
    const money = expired ? null : moneyInfo(c)
    const cur = expired ? null : collabStage(c)
    const isExp = expandedId === c.id
    const hot = c.status === 'INVITED' && !expired || isRejectedPost(c) || isPendingReview(c)
    const platforms = (c.campaigns?.platforms || []).slice(0, 3)
    return (
      <div key={c.id} className={`ic-rw${hot ? ' hot' : ''}`}>
        <div className="ic-row">
          <BrandFace name={c.campaigns?.brand_name || c.campaigns?.title} size={40} />
          <div className="ic-who">
            <b>{c.campaigns?.title || 'Campanie'}</b>
            <span className="iu-xs iu-muted ic-meta">
              {c.campaigns?.brand_name}
              {c.campaigns?.campaign_type ? ` · ${c.campaigns.campaign_type === 'BARTER' ? 'Barter' : 'Plătit'}` : ''}
              {c.campaigns?.deadline ? ` · termen ${fmtDateShort(c.campaigns.deadline)}` : ''}
            </span>
            {platforms.length > 0 && (
              <span className="ic-plats">{platforms.map((p: string) => <span key={p} title={p}>{PLATFORM_ICON[p.toLowerCase()] || null}</span>)}</span>
            )}
          </div>
          <div className="ic-trkwrap">
            {cur !== null
              ? <Track cur={cur} />
              : <span className="iu-sm iu-muted">
                  {expired ? 'Perioada de înscriere a expirat'
                    : c.status === 'INVITED' ? 'Așteaptă răspunsul tău'
                    : c.status === 'REJECTED' ? 'Colaborare închisă'
                    : '—'}
                </span>}
          </div>
          <div className="ic-stat">
            <span className="iu-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            {dl && <span className="iu-chip" style={{ background: dl.bg, color: dl.fg }}>{dl.label}</span>}
            {money && (
              <span className="ic-money">
                <b>{money.amt}</b>
                <span className="iu-chip" style={{ background: money.tagStyle.bg, color: money.tagStyle.fg, height: 20, fontSize: 11 }}>{money.tag}</span>
              </span>
            )}
          </div>
          {renderAction(c, expired)}
        </div>
        {isExp && (
          <div className="ic-det">
            {expired ? (
              <Note tone="amber" title="Nu ai răspuns la timp">
                <span className="iu-xs" style={{ lineHeight: 1.55 }}>Perioada de înscriere a expirat. Nu-ți face griji — brandurile lansează campanii noi regulat pe AddFame.</span>
              </Note>
            ) : c.status === 'INVITED' ? renderInviteDetails(c) : renderDetails(c)}
          </div>
        )}
      </div>
    )
  }

  const emptyCopy: Record<Tab, { t: string; d: string }> = {
    'All': { t: 'Nicio colaborare încă', d: 'Aplică la campanii sau așteaptă invitații de la branduri.' },
    'Invited': { t: 'Nicio invitație nouă', d: 'Când un brand te invită la o campanie, o vei găsi aici.' },
    'Fara raspuns': { t: 'Nicio invitație expirată', d: 'Invitațiile la care nu ai răspuns la timp apar aici.' },
    'Active': { t: 'Nicio colaborare activă', d: 'Colaborările acceptate, aflate în desfășurare, apar aici.' },
    'Applied': { t: 'Nicio aplicare în așteptare', d: 'Aplicările tale la campanii, în așteptarea brandului, apar aici.' },
    'Completed': { t: 'Nicio colaborare finalizată', d: 'După aprobarea postării și plată, colaborarea apare aici.' },
    'Respinse': { t: 'Nicio colaborare respinsă', d: 'Aplicările sau invitațiile refuzate apar aici.' },
  }

  return (
    <div className="iu">
      <style>{IC_CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`ic-toast ${toast.ok ? 'ok' : 'err'}`} role="status">
          {toast.ok ? <CheckCircle size={16} style={{ flex: 'none' }} /> : <AlertCircle size={16} style={{ flex: 'none' }} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="iu-head">
        <div className="ic-col" style={{ gap: 6 }}>
          <h1>Colaborările mele</h1>
          <span className="iu-muted iu-sm">
            {collabs.length} {collabs.length === 1 ? 'colaborare' : 'colaborări'}
            {counts['Active'] > 0 && <> · {counts['Active']} {counts['Active'] === 1 ? 'activă' : 'active'}</>}
            {newInvites.length > 0 && <> · <b style={{ color: '#1d4fb8' }}>{newInvites.length} {newInvites.length === 1 ? 'invitație nouă' : 'invitații noi'}</b></>}
            {needsResubmit.length > 0 && <> · <b style={{ color: '#b42318' }}>{needsResubmit.length} {needsResubmit.length === 1 ? 'respinsă' : 'respinse'}</b></>}
          </span>
        </div>
        <div className="iu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button onClick={fetchCollabs} className="iu-btn" title="Reîmprospătează" aria-label="Reîmprospătează"><RefreshCw size={15} /></button>
          <Link href="/influencer/campaigns" className="iu-btn p"><Briefcase size={15} /> Găsește campanii</Link>
        </div>
      </div>

      {/* Câștiguri / plăți */}
      {collabs.length > 0 && (
        <div className="ic-stats">
          <div className="iu-card ic-stat-c">
            <span className="iu-ico" style={{ background: BLU.bg, color: BLU.fg }}><Lock size={18} /></span>
            <div className="ic-col"><span className="iu-label">Plată garantată</span><b className="iu-d ic-big">{fmtRon(totalGuaranteed)}</b><span className="iu-xs iu-muted">în colaborări active</span></div>
          </div>
          <div className="iu-card ic-stat-c">
            <span className="iu-ico" style={{ background: GRN.bg, color: GRN.fg }}><CheckCircle size={18} /></span>
            <div className="ic-col"><span className="iu-label">Încasat</span><b className="iu-d ic-big">{fmtRon(totalPaid)}</b><span className="iu-xs iu-muted">din colaborări finalizate</span></div>
          </div>
          <div className="iu-card ic-stat-c">
            <span className="iu-ico" style={{ background: toPostCount > 0 ? AMB.bg : GRY.bg, color: toPostCount > 0 ? AMB.fg : GRY.fg }}><Upload size={18} /></span>
            <div className="ic-col"><span className="iu-label">De trimis</span><b className="iu-d ic-big">{toPostCount}</b><span className="iu-xs iu-muted">{toPostCount === 1 ? 'dovadă de postare' : 'dovezi de postare'}</span></div>
          </div>
        </div>
      )}

      {/* Alerte */}
      {needsResubmit.length > 0 && (
        <div className="ic-note red ic-alert">
          <AlertTriangle size={18} style={{ flex: 'none' }} />
          <div className="ic-col" style={{ flex: 1, minWidth: 0 }}>
            <b className="iu-sm" style={{ color: '#b42318' }}>
              {needsResubmit.length} {needsResubmit.length > 1 ? 'postări respinse' : 'postare respinsă'} de brand
            </b>
            <span className="iu-xs">Deschide colaborarea activă și retrimite dovada corectată.</span>
          </div>
          <button onClick={() => setActiveTab('Active')} className="iu-btn danger">Vezi active</button>
        </div>
      )}
      {needsDeliverable.length > 0 && needsResubmit.length === 0 && (
        <div className="ic-note violet ic-alert">
          <Upload size={18} style={{ flex: 'none' }} />
          <div className="ic-col" style={{ flex: 1, minWidth: 0 }}>
            <b className="iu-sm" style={{ color: '#5b2fd0' }}>
              {needsDeliverable.length} {needsDeliverable.length > 1 ? 'colaborări active' : 'colaborare activă'} — trimite dovada postului
            </b>
            <span className="iu-xs">Publică postul și trimite link-ul pentru a primi plata.</span>
          </div>
          <button onClick={() => { setActiveTab('Active'); setExpandedId(needsDeliverable[0]?.id) }} className="iu-btn p">Trimite</button>
        </div>
      )}
      {newInvites.length > 0 && activeTab !== 'Invited' && (
        <div className="ic-note blue ic-alert">
          <MessageSquare size={18} style={{ flex: 'none' }} />
          <div className="ic-col" style={{ flex: 1, minWidth: 0 }}>
            <b className="iu-sm" style={{ color: '#1d4fb8' }}>{newInvites.length} {newInvites.length > 1 ? 'invitații în așteptare' : 'invitație în așteptare'}</b>
            <span className="iu-xs">Răspunde înainte să expire perioada de înscriere.</span>
          </div>
          <button onClick={() => setActiveTab('Invited')} className="iu-btn">Vezi invitațiile</button>
        </div>
      )}

      {/* Tab-uri + căutare */}
      <div className="ic-bar">
        <div className="iu-tabs ic-tabs" role="tablist">
          {TAB_ORDER.map(tab => (
            <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`iu-pill${activeTab === tab ? ' on' : ''}`}>
              {TAB_LABEL[tab]}
              {counts[tab] > 0 && <span className="n">{counts[tab]}</span>}
            </button>
          ))}
        </div>
        <label className="iu-search ic-search">
          <Search size={16} style={{ flex: 'none' }} />
          <input placeholder="Caută campanie sau brand…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {/* Mesaj Fără răspuns */}
      {activeTab === 'Fara raspuns' && expiredCount > 0 && (
        <Note tone="amber" title="Invitații la care nu ai răspuns">
          <span className="iu-xs" style={{ lineHeight: 1.55 }}>
            Perioada de înscriere pentru aceste campanii a expirat. Completează-ți profilul pentru a primi invitații mai relevante în viitor.
          </span>
        </Note>
      )}

      {/* Listă colaborări */}
      {filtered.length === 0 ? (
        <div className="iu-card ic-empty">
          <span className="iu-ico" style={{ background: 'linear-gradient(135deg,#7040f0,#9030f0)', color: '#fff', width: 56, height: 56, borderRadius: 18 }}><Zap size={26} /></span>
          <h2>{search ? 'Niciun rezultat' : emptyCopy[activeTab].t}</h2>
          <p className="iu-muted iu-sm" style={{ margin: 0, maxWidth: 340 }}>
            {search ? `Nu am găsit colaborări pentru „${search}".` : emptyCopy[activeTab].d}
          </p>
          {search
            ? <button className="iu-btn" onClick={() => setSearch('')}>Șterge căutarea</button>
            : <Link href="/influencer/campaigns" className="iu-btn p big">Caută campanii <ArrowRight size={16} /></Link>}
        </div>
      ) : (
        <div className="iu-card" style={{ overflow: 'hidden' }}>
          {filtered.map(renderRow)}
        </div>
      )}

      {/* ── Sheet: trimite dovada postului ── */}
      {deliverableCollab && (
        <div className="ic-ov">
          <div className="ic-mod wide" role="dialog" aria-modal="true">
            <div className="ic-mh">
              <div className="ic-col" style={{ minWidth: 0 }}>
                <h2>{isRejectedPost(deliverableCollab) ? 'Retrimite dovada' : isPendingReview(deliverableCollab) ? 'Dovada trimisă' : 'Trimite dovada postului'}</h2>
                <span className="iu-xs iu-muted ic-meta">{deliverableCollab.campaigns?.title} · {deliverableCollab.campaigns?.brand_name}</span>
              </div>
              <button onClick={() => setDeliverableModalId(null)} className="ic-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="ic-mb">
              <DeliverableSection
                key={deliverableCollab.id}
                collab={deliverableCollab}
                onUpdated={(u) => { updateCollab(u); if (u.deliverable_submitted_at) { setDeliverableModalId(null); notify('Dovada a fost trimisă. Brandul o va revizui.') } }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Sheet: evaluare ── */}
      {reviewCollab && (
        <div className="ic-ov" onClick={() => setReviewModalId(null)}>
          <div className="ic-mod" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="ic-mh">
              <div className="ic-col" style={{ minWidth: 0 }}>
                <h2>Evaluează brandul</h2>
                <span className="iu-xs iu-muted ic-meta">{reviewCollab.campaigns?.title} · {reviewCollab.campaigns?.brand_name}</span>
              </div>
              <button onClick={() => setReviewModalId(null)} className="ic-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="ic-mb">
              <LeaveReview
                collaborationId={reviewCollab.id}
                reviewerRole="influencer"
                targetName={reviewCollab.campaigns?.brand_name ?? 'acest brand'}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal adresă livrare barter ── */}
      {addressModal && (
        <div className="ic-ov">
          <div className="ic-mod" role="dialog" aria-modal="true">
            <div className="ic-mh">
              <div className="ic-col">
                <h2>Adresă de livrare</h2>
                <span className="iu-xs iu-muted">Brandul va trimite produsul la această adresă după aprobare.</span>
              </div>
              <button onClick={() => setAddressModal(null)} className="ic-x" aria-label="Închide"><X size={18} /></button>
            </div>
            <div className="ic-mb">
              <div className="ic-col" style={{ gap: 10 }}>
                <input value={address.name} onChange={e => setAddress(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nume complet *" className="iu-input" autoComplete="name" />
                <div className="ic-grid2">
                  <input value={address.phone} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Telefon *" className="iu-input" autoComplete="tel" inputMode="tel" />
                  <input value={address.postal_code} onChange={e => setAddress(p => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Cod poștal" className="iu-input" autoComplete="postal-code" />
                </div>
                <input value={address.address} onChange={e => setAddress(p => ({ ...p, address: e.target.value }))}
                  placeholder="Stradă, număr, bloc, ap. *" className="iu-input" autoComplete="street-address" />
                <div className="ic-grid2">
                  <input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                    placeholder="Oraș *" className="iu-input" />
                  <input value={address.county} onChange={e => setAddress(p => ({ ...p, county: e.target.value }))}
                    placeholder="Județ *" className="iu-input" />
                </div>
              </div>
              <span className="iu-xs iu-muted" style={{ textAlign: 'center' }}><Lock size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Adresa e vizibilă doar brandului după aprobare</span>
              <div className="ic-btns">
                <button onClick={() => setAddressModal(null)} className="iu-btn big" style={{ flex: 1 }}>Anulează</button>
                <button onClick={handleAcceptWithAddress} disabled={!!actionLoading} className="iu-btn p big" style={{ flex: 1 }}>
                  {actionLoading ? <Loader2 size={16} className="ic-spin" /> : <Check size={16} />}
                  Acceptă invitația
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const IC_CSS = `
.ic-col { display:flex; flex-direction:column; min-width:0; }
.ic-spin { animation: icspin .8s linear infinite; }
@keyframes icspin { to { transform: rotate(360deg); } }
.ic-sk { border-radius:8px; background:linear-gradient(90deg,#eeecf7 25%,#f6f5fc 50%,#eeecf7 75%); background-size:200% 100%; animation:icsk 1.3s ease-in-out infinite; }
@keyframes icsk { to { background-position:-200% 0; } }
.ic-bar { display:flex; flex-direction:column; gap:12px; }
.ic-tabs { overflow-x:auto; flex-wrap:nowrap; scrollbar-width:none; padding-bottom:2px; }
.ic-tabs::-webkit-scrollbar { display:none; }
.ic-tabs .iu-pill { flex:none; }
.ic-search { width:100%; max-width:420px; }
.ic-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.ic-stat-c { display:flex; gap:14px; align-items:center; padding:16px 18px; }
.ic-big { font-size:20px; letter-spacing:-.02em; line-height:1.15; }
.ic-alert { flex-direction:row !important; align-items:center; gap:12px; padding:14px 16px; }
.ic-note { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border-radius:14px; border:1px solid transparent; min-width:0; }
.ic-note.blue { background:#e6f0ff; border-color:#cfe0fb; color:#1d4fb8; }
.ic-note.orange { background:#fff1e6; border-color:#fbd9bd; color:#9a4206; }
.ic-note.green { background:#dcf5ec; border-color:#b8e8d3; color:#14532d; }
.ic-note.amber { background:#fff1c2; border-color:#f3dd8c; color:#854d0e; }
.ic-note.violet { background:#efeaff; border-color:#ddd1ff; color:#5b2fd0; }
.ic-note.red { background:#fff4f2; border-color:#f3c9c4; color:#b42318; }
.ic-note.grey { background:#f6f6fc; border-color:#e5e3f3; color:#14123a; }
.ic-note .iu-sm, .ic-note .iu-xs { color:#14123a; }
.ic-note.red .iu-xs { color:#b42318; }
.ic-nh { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.ic-nt { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
.ic-note.grey .ic-nt { color:#8783a8; }
.ic-copy { display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:0 8px; border-radius:8px; border:0; background:rgba(255,255,255,.7); color:inherit; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
.ic-copy:hover { background:#fff; }
.ic-rw { border-top:1px solid #eeecf7; }
.ic-rw:first-child { border-top:0; }
.ic-rw.hot { background:#fdfcff; box-shadow:inset 3px 0 0 #7040f0; }
.ic-row { display:grid; grid-template-columns:40px minmax(150px,1fr) minmax(190px,300px) 170px auto; gap:16px; align-items:center; padding:14px 20px; }
.ic-who { display:flex; flex-direction:column; gap:2px; min-width:0; }
.ic-who > b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ic-meta { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ic-plats { display:flex; gap:8px; align-items:center; margin-top:2px; }
.ic-trkwrap { min-width:0; }
.ic-stat { display:flex; flex-direction:column; align-items:flex-start; gap:6px; min-width:0; }
.ic-stat .iu-chip { max-width:100%; overflow:hidden; text-overflow:ellipsis; }
.ic-money { display:flex; flex-direction:column; align-items:flex-start; gap:3px; }
.ic-money > b { font-size:14px; }
.ic-act { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
.ic-chev { width:40px; padding:0 !important; flex:none; }
.ic-det { padding:4px 20px 20px; }
.ic-trk { position:relative; display:flex; align-items:flex-start; width:100%; min-width:0; }
.ic-trk-line { position:absolute; left:10%; right:10%; top:10px; height:2px; background:#e5e3f3; }
.ic-trk-fill { position:absolute; left:10%; top:10px; height:2px; background:#7040f0; max-width:80%; }
.ic-trk-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; min-width:0; position:relative; }
.ic-trk-dot { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; position:relative; z-index:1; flex:none; }
.ic-trk-lbl { font-size:11px; }
.ic-grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.ic-ul { margin:0; padding:0 0 0 18px; display:flex; flex-direction:column; gap:3px; font-size:13px; color:#14123a; }
.ic-ol { margin:0; padding:0 0 0 18px; display:flex; flex-direction:column; gap:3px; font-size:12px; color:#14123a; }
.ic-offer { border:1px solid #fbd9bd; background:#fff8f2; border-radius:14px; overflow:hidden; }
.ic-offer-img { display:block; width:100%; aspect-ratio:16/9; object-fit:cover; }
.ic-imgcount { position:absolute; top:8px; right:8px; background:rgba(20,18,58,.6); color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px; }
.ic-linkbox { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; background:#fff; border:1px solid #e5e3f3; color:#4a4770; min-width:0; text-decoration:none; }
.ic-linktxt { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; font-weight:600; }
.ic-linkbtn { background:none; border:0; padding:6px 0; font:inherit; font-size:13px; font-weight:700; color:#5b2fd0; cursor:pointer; min-height:32px; text-align:left; text-decoration:none; }
.ic-linkbtn:hover { color:#14123a; }
.ic-mono { font-family:ui-monospace,monospace; font-weight:800; font-size:13px; color:#1d4fb8; background:#fff; padding:4px 10px; border-radius:8px; border:1px solid #cfe0fb; word-break:break-all; }
.ic-pulse { width:8px; height:8px; border-radius:50%; background:#d9a400; flex:none; animation:icpulse 1.4s ease-in-out infinite; }
@keyframes icpulse { 50% { opacity:.3; } }
.ic-f { display:flex; flex-direction:column; gap:6px; min-width:0; }
.ic-ta { height:auto; padding:10px 14px; width:100%; resize:vertical; line-height:1.5; }
.ic-x { flex:none; width:40px; height:40px; border-radius:12px; border:0; background:#f0eff7; color:#4a4770; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.ic-x:hover { background:#e5e3f3; }
.ic-consent { display:flex; align-items:flex-start; gap:10px; padding:12px 14px; border-radius:14px; background:#efeaff; border:1.5px solid #ddd1ff; cursor:pointer; }
.ic-consent input { margin-top:2px; width:18px; height:18px; accent-color:#7040f0; flex:none; cursor:pointer; }
.ic-brief { display:flex; flex-direction:column; gap:10px; padding:14px; border-radius:16px; background:#f9f7ff; border:1px solid #e6dcff; }
.ic-tasks { display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:14px; background:#fff; border:1px solid #ddd1ff; }
.ic-task { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; background:#f6f6fc; }
.ic-btns { display:flex; gap:10px; flex-wrap:wrap; }
.ic-empty { display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; padding:56px 20px; }
.ic-ov { position:fixed; inset:0; z-index:60; background:rgba(20,18,58,.5); display:flex; align-items:center; justify-content:center; padding:16px; }
.ic-mod { background:#fff; border-radius:22px; width:100%; max-width:440px; max-height:92vh; overflow:auto; box-shadow:0 30px 60px -20px rgba(20,18,58,.5); }
.ic-mod.wide { max-width:600px; }
.ic-mh { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 20px; border-bottom:1px solid #eeecf7; position:sticky; top:0; background:#fff; z-index:2; }
.ic-mb { display:flex; flex-direction:column; gap:16px; padding:20px; }
.ic-toast { position:fixed; top:20px; right:20px; z-index:70; display:flex; gap:10px; align-items:center; padding:12px 16px; border-radius:14px; background:#fff; font-size:14px; font-weight:700; max-width:min(380px, calc(100vw - 32px)); box-shadow:0 18px 36px -18px rgba(20,18,58,.4); animation:icin .25s ease; }
.ic-toast.ok { border:1.5px solid #b8e8d3; color:#14532d; }
.ic-toast.err { border:1.5px solid #f3c9c4; color:#b42318; }
@keyframes icin { from { opacity:0; transform:translateY(-8px); } }
@media (max-width: 1023px) {
  .ic-row { grid-template-columns:40px minmax(0,1fr) auto; gap:12px; }
  .ic-trkwrap { grid-column:1 / -1; order:5; }
  .ic-stat { order:3; align-items:flex-end; }
  .ic-money { align-items:flex-end; }
  .ic-act { grid-column:1 / -1; order:6; justify-content:stretch; }
  .ic-act > .iu-btn:not(.ic-chev), .ic-act > .iu-chip { flex:1; }
}
@media (max-width: 767px) {
  .ic-stats { grid-template-columns:minmax(0,1fr); gap:10px; }
  .ic-stat-c { padding:14px; }
  .iu-pill { height:44px; }
  .ic-act .iu-btn, .ic-btns .iu-btn, .ic-note .iu-btn { min-height:44px; }
  .ic-chev { width:44px; }
  .ic-x { width:44px; height:44px; }
  .ic-row { padding:14px; }
  .ic-det { padding:4px 14px 16px; }
  .ic-alert { flex-wrap:wrap; }
  .ic-alert .iu-btn { width:100%; }
  .ic-grid2 { grid-template-columns:minmax(0,1fr); }
  .ic-btns > * { flex:1 1 100%; }
  .ic-toast { left:16px; right:16px; top:12px; max-width:none; }
  .ic-ov { align-items:flex-end; padding:0; }
  .ic-mod, .ic-mod.wide { max-width:none; border-radius:22px 22px 0 0; max-height:92vh; }
  .ic-mb { padding:16px; padding-bottom:calc(16px + env(safe-area-inset-bottom)); }
  .ic-search { max-width:none; }
  .ic-input, .iu-input, .iu-search input { font-size:16px; }
}
`
