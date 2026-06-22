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
  RotateCcw, AlertTriangle, Calendar, DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { checkInWithCode } from '@/app/actions/collaborations'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import { LeaveReview } from '@/components/shared/leave-review'

type Collaboration = {
  id: string
  campaign_id: string
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
    ? { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', timerBg: '#059669', label: 'Bonus maxim disponibil!', sub: 'Postează în 24h de la acceptare' }
    : in48h
    ? { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', timerBg: '#d97706', label: 'Bonus parțial — grăbește-te!', sub: 'Bonusul de 24h a expirat' }
    : { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', timerBg: '#7c3aed', label: 'Câștigă puncte Creator Score', sub: 'Bonusurile de viteză au expirat' }

  return (
    <div style={{ background: theme.bg, borderBottom: `1px solid ${theme.border}`, padding: '14px 16px' }}>

      {/* Row 1: Label + puncte */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 900, color: theme.color, margin: '0 0 2px' }}>
            {in24h ? '🔥' : in48h ? '⚡' : '⭐'} {theme.label}
          </p>
          <p style={{ fontSize: 11, color: theme.color, opacity: 0.75, margin: 0 }}>{theme.sub}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: theme.color, margin: 0, lineHeight: 1, letterSpacing: '-0.5px' }}>+{totalPossible}</p>
          <p style={{ fontSize: 10, color: theme.color, opacity: 0.6, margin: '1px 0 0', fontWeight: 600 }}>puncte posibile</p>
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
          <span style={{ fontSize: 10, fontWeight: 700, background: 'white', color: '#059669', padding: '3px 8px', borderRadius: 100, border: '1px solid #6ee7b7' }}>+100 colaborare</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: 'white', color: '#059669', padding: '3px 8px', borderRadius: 100, border: '1px solid #6ee7b7' }}>+50 prima aprobare</span>
          {bonus > 0 && (
            <span style={{ fontSize: 10, fontWeight: 900, background: theme.timerBg, color: 'white', padding: '3px 8px', borderRadius: 100 }}>
              +{bonus} bonus {in24h ? '24h' : '48h'}
            </span>
          )}
          {expired && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#f3f4f6', color: '#6b7280', padding: '3px 8px', borderRadius: 100 }}>bonusuri expirate</span>
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
            <span style={{ fontSize: 9, color: theme.color, opacity: 0.6 }}>Acceptat</span>
            <span style={{ fontSize: 9, color: theme.color, opacity: 0.6, fontWeight: 700 }}>
              {in24h ? 'Deadline bonus 24h' : 'Deadline bonus 48h'}
            </span>
          </div>
        </div>
      )}
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
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Link-uri postări publice *</label>
          <div className="space-y-2">
            {urls.map((u, i) => (
              <div key={i} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={u}
                    onChange={e => { updateUrl(i, e.target.value); setError(null) }}
                    placeholder={`https://instagram.com/p/... (postarea ${i + 1})`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition"
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>
                {urls.length > 1 && (
                  <button onClick={() => removeUrl(i)} className="text-red-400 hover:text-red-600 transition p-1 flex-shrink-0" title="Șterge">✕</button>
                )}
              </div>
            ))}
            <button onClick={addUrl} className="text-xs font-bold text-purple-600 hover:text-purple-800 transition flex items-center gap-1">
              + Adaugă alt link (story, post, reel etc.)
            </button>
          </div>
        </div>
        {/* Screenshot thumbnail */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">
            Screenshot postare <span className="text-red-500 font-bold">*obligatoriu</span>
          </label>
          <ThumbnailUpload
            collabId={collab.id}
            currentUrl={thumbnailUrl}
            onUploaded={url => setThumbnailUrl(url)}
          />
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
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-600">
              Cod Spark Ads / Partnership Ads <span className="font-normal text-gray-400">(opțional)</span>
            </label>
            <button type="button" onClick={() => setShowAdsHelp(v => !v)}
              className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
              {showAdsHelp ? '▲ Ascunde' : '? Cum găsesc codul'}
            </button>
          </div>
          {showAdsHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5 text-xs mb-2">
              {platform === 'tiktok' ? (
                <>
                  <p className="font-black text-blue-700">📱 TikTok — Spark Ads:</p>
                  <ol className="space-y-1 text-blue-600 list-decimal list-inside">
                    <li>Deschide postul → apasă "..." → "Ad settings"</li>
                    <li>Activează "Ad authorization" → selectează 30 zile</li>
                    <li>Copiază codul de 7 cifre generat</li>
                  </ol>
                </>
              ) : platform === 'instagram' ? (
                <>
                  <p className="font-black text-blue-700">📸 Instagram — Partnership Ads:</p>
                  <ol className="space-y-1 text-blue-600 list-decimal list-inside">
                    <li>Deschide postul → "..." → activează "Allow brand partner to boost"</li>
                    <li>Brandul primește acces direct — nu există cod separat</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-black text-blue-700">💡 Cod Ads per platformă:</p>
                  <p className="text-blue-600"><strong>TikTok:</strong> postul → "..." → "Ad settings" → "Ad authorization" → cod 7 cifre</p>
                  <p className="text-blue-600"><strong>Instagram:</strong> postul → "..." → "Allow brand partner to boost"</p>
                </>
              )}
            </div>
          )}
          <input type="text" value={adsCode} onChange={e => setAdsCode(e.target.value)}
            placeholder={platform === 'tiktok' ? 'ex: 1234567 (7 cifre)' : 'Codul Spark Ads sau Partnership Ads'}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-blue-400 transition"
            style={{ fontFamily: 'inherit' }}
          />
          <p className="text-[10px] text-gray-400 mt-1">Permite brandului să ruleze ads cu postul tău — mai multă vizibilitate pentru ambii.</p>
        </div>
        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        {/* Acord licență conținut — Opțiunea 2 */}
        <label className="flex items-start gap-3 bg-purple-50 border-2 border-purple-200 rounded-xl p-3 cursor-pointer hover:bg-purple-100 transition">
          <input
            type="checkbox"
            checked={licenseConsent}
            onChange={e => setLicenseConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-purple-600 flex-shrink-0 cursor-pointer"
          />
          <span className="text-xs text-gray-700 leading-relaxed">
            <span className="font-black text-purple-700">Acord utilizare conținut</span> — Sunt de acord ca{' '}
            <strong>AddFame.ro</strong> să poată folosi acest conținut (postare, metrici, screenshot, repost) în
            materiale de promovare — inclusiv pe conturile oficiale <strong>@addfame.ro</strong>{' '}
            (Instagram, TikTok, LinkedIn, website), conform{' '}
            <a href="/termeni" target="_blank" rel="noreferrer" className="text-purple-600 underline font-bold">
              Termenilor și Condițiilor
            </a>
            . <span className="text-red-500 font-bold">*obligatoriu</span>
          </span>
        </label>
        <div className="flex gap-2">
          {editing && (
            <button onClick={() => { setEditing(false); setUrls(existingUrls); setNote(collab.deliverable_note || ''); setAdsCode(collab.ads_code || '') }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
              Anulează
            </button>
          )}
          <button onClick={submit} disabled={saving || !licenseConsent || !thumbnailUrl}
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
      {collab.ads_code && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <span className="text-xs font-black text-blue-700">Cod Ads:</span>
          <span className="text-xs font-mono font-bold text-blue-600">{collab.ads_code}</span>
        </div>
      )}
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

      {/* ── Motivare Creator Score cu Timer Live ─────────────────── */}
      <ScoreTimerBanner acceptedAt={collab.created_at} />

      <div className="bg-white p-4 space-y-3">
        {/* Brief complet campanie */}
        {(collab.campaigns?.deliverables || collab.campaigns?.content_type?.length > 0 || collab.campaigns?.required_caption || collab.campaigns?.required_hashtags?.length > 0 || collab.campaigns?.key_messages?.length > 0 || collab.campaigns?.min_duration || collab.campaigns?.min_days_online || collab.campaigns?.story_instructions || collab.campaigns?.forbidden_mentions?.length > 0 || collab.campaigns?.tasks_ig_reel || collab.campaigns?.tasks_ig_post || collab.campaigns?.tasks_include_post || (collab.campaigns?.tasks_stories_count ?? 0) > 0 || collab.campaigns?.tasks_tt_video || collab.campaigns?.tasks_tt_live || collab.campaigns?.tasks_yt_short || collab.campaigns?.tasks_yt_video || collab.campaigns?.tasks_fb_post || collab.campaigns?.promotion_link || collab.campaigns?.brief_pdf_url) && (
          <div className="bg-purple-50 border-2 border-purple-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1.5">📋 Brief campanie — ce trebuie să faci</p>

            {(() => {
              const tasks: { label: string; sub?: string; color: string; bg: string; border: string }[] = []
              const c = collab.campaigns
              if (!c) return null
              if ((c.tasks_stories_count ?? 0) > 0) tasks.push({ label: `${c.tasks_stories_count} Instagram ${c.tasks_stories_count === 1 ? 'Story' : 'Stories'}`, sub: c.tasks_ig_days_online ? `online minim ${c.tasks_ig_days_online} zile` : undefined, color: '#4c1d95', bg: '#f5f3ff', border: '#c4b5fd' })
              if (c.tasks_ig_reel) tasks.push({ label: 'Instagram Reel', sub: c.tasks_ig_reel_duration ? `minim ${c.tasks_ig_reel_duration} secunde` : undefined, color: '#4c1d95', bg: '#f5f3ff', border: '#c4b5fd' })
              if (c.tasks_ig_post || c.tasks_include_post) tasks.push({ label: 'Post Feed Instagram', sub: 'foto sau carousel', color: '#4c1d95', bg: '#f5f3ff', border: '#c4b5fd' })
              if (c.tasks_ig_live) tasks.push({ label: 'Instagram Live', sub: undefined, color: '#4c1d95', bg: '#f5f3ff', border: '#c4b5fd' })
              if (c.tasks_tt_video) tasks.push({ label: 'TikTok Video', sub: [c.tasks_tt_video_duration ? `minim ${c.tasks_tt_video_duration} sec` : '', c.tasks_tt_days_online ? `online minim ${c.tasks_tt_days_online === 9999 ? 'permanent' : c.tasks_tt_days_online + ' zile'}` : ''].filter(Boolean).join(' · ') || undefined, color: '#111827', bg: '#f3f4f6', border: '#d1d5db' })
              if (c.tasks_tt_live) tasks.push({ label: 'TikTok Live', sub: undefined, color: '#111827', bg: '#f3f4f6', border: '#d1d5db' })
              if (c.tasks_tt_duet) tasks.push({ label: 'TikTok Duet', sub: undefined, color: '#111827', bg: '#f3f4f6', border: '#d1d5db' })
              if (c.tasks_yt_short) tasks.push({ label: 'YouTube Short', sub: c.tasks_yt_short_duration ? `minim ${c.tasks_yt_short_duration} sec` : undefined, color: '#7f1d1d', bg: '#fef2f2', border: '#fca5a5' })
              if (c.tasks_yt_video) tasks.push({ label: 'Video YouTube', sub: c.tasks_yt_video_duration ? `minim ${c.tasks_yt_video_duration} min` : undefined, color: '#7f1d1d', bg: '#fef2f2', border: '#fca5a5' })
              if (c.tasks_yt_mention) tasks.push({ label: 'Mențiune YouTube', sub: undefined, color: '#7f1d1d', bg: '#fef2f2', border: '#fca5a5' })
              if (c.tasks_fb_post) tasks.push({ label: 'Facebook Post', sub: undefined, color: '#1e3a5f', bg: '#eff6ff', border: '#93c5fd' })
              if (c.tasks_fb_story) tasks.push({ label: 'Facebook Story', sub: undefined, color: '#1e3a5f', bg: '#eff6ff', border: '#93c5fd' })
              if (c.tasks_fb_reel) tasks.push({ label: 'Facebook Reel', sub: undefined, color: '#1e3a5f', bg: '#eff6ff', border: '#93c5fd' })
              if (c.tasks_fb_share) tasks.push({ label: 'Share postare Facebook', sub: undefined, color: '#1e3a5f', bg: '#eff6ff', border: '#93c5fd' })
              if (tasks.length === 0 && !c.deliverables) return null
              return (
                <div className="rounded-2xl overflow-hidden border-2 border-purple-300">
                  <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: '#7c3aed' }}>
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                    <p className="font-black text-white text-sm uppercase tracking-wide">Ce trebuie să postezi</p>
                    <span className="ml-auto bg-white/20 text-white text-xs font-black px-2.5 py-0.5 rounded-full">{tasks.length} task{tasks.length !== 1 ? 'uri' : ''}</span>
                  </div>
                  <div className="bg-white p-3 space-y-2">
                    {tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#7c3aed' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate" style={{ color: t.color }}>{t.label}</p>
                          {t.sub && <p className="text-xs" style={{ color: t.color, opacity: 0.7 }}>{t.sub}</p>}
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#7c3aed', color: 'white' }}>obligatoriu</span>
                      </div>
                    ))}
                    {tasks.length > 1 && (
                      <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-1" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <p className="text-xs font-bold" style={{ color: '#78350f' }}>Toate cele <strong>{tasks.length} task-uri sunt obligatorii</strong> — trimite link dovadă pentru fiecare postare.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
            {collab.campaigns?.content_type?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-purple-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">🎬 Tip conținut</p>
                <p className="text-xs font-bold text-gray-700">{collab.campaigns.content_type.join(', ')}</p>
              </div>
            )}
            {collab.campaigns?.brief_pdf_url && (
              <a href={collab.campaigns.brief_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-white font-black text-sm"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
                <span>📋</span> Citește Brieful Campaniei
                <span className="ml-auto text-white/70 text-xs">Deschide PDF →</span>
              </a>
            )}
            {collab.campaigns?.promotion_link && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-wider mb-1">🔗 Link de promovat</p>
                <a href={collab.campaigns.promotion_link} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-green-700 underline break-all">{collab.campaigns.promotion_link}</a>
              </div>
            )}
            {collab.campaigns?.story_instructions && (
              <div className="bg-white rounded-xl p-3 border border-purple-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">📝 Instrucțiuni story</p>
                <p className="text-xs text-gray-700 leading-relaxed">{collab.campaigns.story_instructions}</p>
              </div>
            )}
            {(collab.campaigns?.min_duration || collab.campaigns?.min_days_online) && (
              <div className="grid grid-cols-2 gap-2">
                {collab.campaigns?.min_duration && (
                  <div className="bg-white rounded-xl p-3 border border-purple-100">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">⏱️ Durată minimă</p>
                    <p className="text-xs font-bold text-gray-700">{collab.campaigns.min_duration} secunde</p>
                  </div>
                )}
                {collab.campaigns?.min_days_online && (
                  <div className="bg-white rounded-xl p-3 border border-purple-100">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">📅 Online minim</p>
                    <p className="text-xs font-bold text-gray-700">{collab.campaigns.min_days_online} zile</p>
                  </div>
                )}
              </div>
            )}
            {collab.campaigns?.required_caption && (
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-wider mb-1">✍️ Caption obligatoriu</p>
                <p className="text-xs text-gray-700 leading-relaxed font-medium">{collab.campaigns.required_caption}</p>
              </div>
            )}
            {collab.campaigns?.required_hashtags?.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1"># Hashtag-uri obligatorii</p>
                <p className="text-xs font-bold text-blue-700">#{collab.campaigns.required_hashtags.join(' #')}</p>
              </div>
            )}
            {collab.campaigns?.key_messages?.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-purple-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">⭐ Mesaje cheie de transmis</p>
                <ul className="space-y-1">{collab.campaigns.key_messages.map((m: string, i: number) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="text-purple-400 flex-shrink-0 mt-0.5">•</span>{m}</li>
                ))}</ul>
              </div>
            )}
            {collab.campaigns?.forbidden_mentions?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1">🚫 Nu menționa / evită</p>
                <p className="text-xs text-red-700 font-medium">{collab.campaigns.forbidden_mentions.join(', ')}</p>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">Link-uri postări publice *</label>
          <div className="space-y-2">
            {urls.map((u, i) => (
              <div key={i} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={u}
                    onChange={e => { updateUrl(i, e.target.value); setError(null) }}
                    placeholder={`https://instagram.com/p/... (postarea ${i + 1})`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-purple-400 transition"
                    style={{ fontFamily: 'inherit' }}
                  />
                </div>
                {urls.length > 1 && (
                  <button onClick={() => removeUrl(i)} className="text-red-400 hover:text-red-600 transition p-1 flex-shrink-0" title="Șterge">✕</button>
                )}
              </div>
            ))}
            <button onClick={addUrl} className="text-xs font-bold text-purple-600 hover:text-purple-800 transition flex items-center gap-1">
              + Adaugă alt link (story, post, reel etc.)
            </button>
          </div>
        </div>
        {/* Screenshot thumbnail */}
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1.5 block">
            Screenshot postare <span className="text-red-500 font-bold">*obligatoriu</span>
          </label>
          <ThumbnailUpload
            collabId={collab.id}
            currentUrl={thumbnailUrl}
            onUploaded={url => setThumbnailUrl(url)}
          />
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
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-600">
              Cod Spark Ads / Partnership Ads <span className="font-normal text-gray-400">(opțional)</span>
            </label>
            <button type="button" onClick={() => setShowAdsHelp(v => !v)}
              className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">
              {showAdsHelp ? '▲ Ascunde' : '? Cum găsesc codul'}
            </button>
          </div>
          {showAdsHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5 text-xs mb-2">
              {platform === 'tiktok' ? (
                <>
                  <p className="font-black text-blue-700">📱 TikTok — Spark Ads:</p>
                  <ol className="space-y-1 text-blue-600 list-decimal list-inside">
                    <li>Deschide postul → apasă "..." → "Ad settings"</li>
                    <li>Activează "Ad authorization" → selectează 30 zile</li>
                    <li>Copiază codul de 7 cifre generat</li>
                  </ol>
                </>
              ) : platform === 'instagram' ? (
                <>
                  <p className="font-black text-blue-700">📸 Instagram — Partnership Ads:</p>
                  <ol className="space-y-1 text-blue-600 list-decimal list-inside">
                    <li>Deschide postul → "..." → activează "Allow brand partner to boost"</li>
                    <li>Brandul primește acces direct — nu există cod separat</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-black text-blue-700">💡 Cod Ads per platformă:</p>
                  <p className="text-blue-600"><strong>TikTok:</strong> postul → "..." → "Ad settings" → "Ad authorization" → cod 7 cifre</p>
                  <p className="text-blue-600"><strong>Instagram:</strong> postul → "..." → "Allow brand partner to boost"</p>
                </>
              )}
            </div>
          )}
          <input type="text" value={adsCode} onChange={e => setAdsCode(e.target.value)}
            placeholder={platform === 'tiktok' ? 'ex: 1234567 (7 cifre)' : 'Codul Spark Ads sau Partnership Ads'}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-blue-400 transition"
            style={{ fontFamily: 'inherit' }}
          />
          <p className="text-[10px] text-gray-400 mt-1">Permite brandului să ruleze ads cu postul tău — mai multă vizibilitate pentru ambii.</p>
        </div>
        {error && <p className="text-xs text-red-600 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
        {/* Acord licență conținut — Opțiunea 2 */}
        <label className="flex items-start gap-3 bg-purple-50 border-2 border-purple-200 rounded-xl p-3 cursor-pointer hover:bg-purple-100 transition">
          <input
            type="checkbox"
            checked={licenseConsent}
            onChange={e => setLicenseConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-purple-600 flex-shrink-0 cursor-pointer"
          />
          <span className="text-xs text-gray-700 leading-relaxed">
            <span className="font-black text-purple-700">Acord utilizare conținut</span> — Sunt de acord ca{' '}
            <strong>AddFame.ro</strong> să poată folosi acest conținut (postare, metrici, screenshot, repost) în
            materiale de promovare — inclusiv pe conturile oficiale <strong>@addfame.ro</strong>{' '}
            (Instagram, TikTok, LinkedIn, website), conform{' '}
            <a href="/termeni" target="_blank" rel="noreferrer" className="text-purple-600 underline font-bold">
              Termenilor și Condițiilor
            </a>
            . <span className="text-red-500 font-bold">*obligatoriu</span>
          </span>
        </label>
        <button onClick={submit} disabled={saving || !licenseConsent || !thumbnailUrl}
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
        .select('*, reserved_amount, payment_amount, campaigns(id, title, brand_name, budget, budget_per_influencer, max_influencers, deadline, platforms, description, product_name, content_type, content_tone, min_duration, required_caption, required_hashtags, min_days_online, forbidden_mentions, forbidden_content, proof_requirements, key_messages, campaign_type, delivery_method, offer_name, offer_value, offer_description, story_instructions, offer_image_url, offer_image_urls, registrations_open, registration_opened_at, registration_deadline_days, deliverables, promotion_link, promotion_link_placement, tasks_stories_count, tasks_include_post, tasks_ig_reel, tasks_ig_reel_duration, tasks_ig_post, tasks_ig_live, tasks_ig_days_online, tasks_tt_video, tasks_tt_video_duration, tasks_tt_live, tasks_tt_duet, tasks_tt_days_online, tasks_yt_short, tasks_yt_short_duration, tasks_yt_video, tasks_yt_video_duration, tasks_yt_mention, tasks_fb_post, tasks_fb_story, tasks_fb_reel, tasks_fb_share, brief_pdf_url), package_sent_at, package_tracking, package_courier, package_received_at, post_deadline_days, checked_in_at')
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
      const newStatus = action === 'accept' ? 'ACTIVE' : 'REJECTED'
      const { error } = await sb.from('collaborations').update({ status: newStatus }).eq('id', collabId)
      if (error) throw error
      setCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: newStatus } : c))
      notify(action === 'accept' ? '🎉 Invitație acceptată! Ești activ pe această campanie.' : 'Invitație refuzată.', action === 'accept')
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
      const { error } = await sb.from('collaborations').update({
        status: 'ACTIVE',
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
        status: 'ACTIVE',
        delivery_name: address.name,
        delivery_phone: address.phone,
        delivery_address: address.address,
        delivery_city: address.city,
        delivery_county: address.county,
        delivery_postal_code: address.postal_code,
      } : c))
      setAddressModal(null)
      setAddress({ name: '', phone: '', address: '', city: '', county: '', postal_code: '' })
      notify('🎉 Invitație acceptată! Brandul va primi adresa ta de livrare.', true)
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

      {/* ── Search + Tabs ──────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-gray-100" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const label: Record<string, string> = { 'All': 'Toate', 'Invited': 'Invitate', 'Fara raspuns': 'Fără răspuns', 'Active': 'Active', 'Applied': 'Aplicate', 'Completed': 'Finalizate', 'Respinse': 'Respinse' }
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-btn ${activeTab === tab ? 'on' : ''}`}>
                {label[tab] || tab}
                {counts[tab] > 0 && (
                  <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/25 text-white' : tab === 'Fara raspuns' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                    {counts[tab]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="search-box" placeholder="Caută campanie sau brand…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>


      {/* ── Pending invitations ────────────────────────────── */}
      {invitations.filter(inv => !isExpiredInvite(inv)).length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-ring" />
            <h2 className="font-black text-gray-900">Invitații în așteptare</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-black px-2.5 py-0.5 rounded-full">Răspuns necesar</span>
          </div>
          <div className="space-y-4">
            {invitations.filter(inv => !isExpiredInvite(inv)).map(inv => (
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
                      <h3 className="font-black text-gray-900 text-lg leading-tight">
                        {inv.campaigns?.title || 'Campaign Invitation'}
                      </h3>
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
                      {/* BARTER specific info */}
                      {inv.campaigns?.campaign_type === 'BARTER' && (
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-2xl overflow-hidden">
                          {/* Poza produs */}
                          {inv.campaigns?.offer_image_url && (
                            <div className="w-full aspect-video overflow-hidden">
                              <img src={inv.campaigns.offer_image_url} alt={inv.campaigns.offer_name}
                                className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="p-4 space-y-3">
                            <p className="text-xs font-black text-orange-700 uppercase tracking-wider">🎁 Ofertă Barter</p>
                            {inv.campaigns?.offer_name && (
                              <div>
                                <p className="text-sm font-black text-gray-900">{inv.campaigns.offer_name}</p>
                              </div>
                            )}
                            {inv.campaigns?.offer_description && (
                              <p className="text-xs text-gray-600 leading-relaxed">{inv.campaigns.offer_description}</p>
                            )}
                            {inv.campaigns?.delivery_method && (
                              <p className="text-xs font-bold text-gray-500">
                                {inv.campaigns.delivery_method === 'delivery' ? '📦 Livrare la domiciliu' : '🏪 Ridicare personală'}
                              </p>
                            )}
                            {inv.campaigns?.deliverables && (
                              <div className="bg-white rounded-xl p-3 border border-orange-100">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">📋 Ce trebuie să postezi</p>
                                <p className="text-xs text-gray-700 font-bold">{inv.campaigns.deliverables}</p>
                              </div>
                            )}
                            {inv.campaigns?.story_instructions && (
                              <div className="bg-white rounded-xl p-3 border border-orange-100">
                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">📝 Instrucțiuni</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{inv.campaigns.story_instructions}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
                      {(inv.reserved_amount || inv.campaigns?.budget_per_influencer || inv.campaigns?.budget) && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-center sm:text-right">
                          <p className="text-xs text-gray-400 font-medium mb-0.5">Câștigul tău</p>
                          {inv.reserved_amount ? (
                            <>
                              <p className="text-2xl font-black text-green-600">{fmt(inv.reserved_amount)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">câștig net după finalizare</p>
                            </>
                          ) : (
                            <>
                              <p className="text-2xl font-black text-green-600">{fmt(inv.campaigns.budget_per_influencer || inv.campaigns.budget)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">câștig net după finalizare</p>
                            </>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button onClick={() => handleAction(inv.id, 'decline', inv)} disabled={actionLoading === inv.id} className="btn-decline flex-1 sm:flex-none">
                          {actionLoading === inv.id ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <X className="w-4 h-4" />}
                          Refuz
                        </button>
                        {inv.campaigns?.registrations_open === false ? (
                          <div className="flex flex-col gap-2 flex-1">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-red-500 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                              🚫 Înscrieri închise
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                              <p className="text-xs text-amber-700 leading-relaxed">
                                🌟 <strong>Nu-ți face griji!</strong> Brandurile lansează campanii noi regulat.<br/>
                                <span className="text-amber-600">Mai multe oferte vin în curând pe AddFame! 🚀</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => handleAction(inv.id, 'accept', inv)} disabled={actionLoading === inv.id} className="btn-accept flex-1 sm:flex-none">
                            {actionLoading === inv.id ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                            Accept
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mesaj Fără răspuns ──────────────────────────────── */}
      {activeTab === 'Fara raspuns' && expiredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2">
          <p className="text-sm font-black text-amber-800 mb-1">⏰ Invitații la care nu ai răspuns</p>
          <p className="text-xs text-amber-600 leading-relaxed">
            Perioada de înscriere pentru aceste campanii a expirat. Completează-ți profilul pentru a primi invitații mai relevante în viitor! 🚀
          </p>
        </div>
      )}

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
            const isExpiredInv = isExpiredInvite(c)

            if (isInvited && !isExpiredInv) return null

            if (isExpiredInv) return (
              <div key={c.id} className="rounded-2xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-700 truncate">{c.campaigns?.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.campaigns?.brand_name} · {c.campaigns?.campaign_type === 'BARTER' ? 'Barter' : 'Platit'}</p>
                    <div className="mt-2 bg-white border border-amber-100 rounded-xl p-3">
                      <p className="text-xs font-black text-amber-700 mb-1">⏰ Nu ai răspuns la timp</p>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Perioada de înscriere a expirat. Nu-ți face griji — brandurile lansează campanii noi regulat pe AddFame! 🚀
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                    Fără răspuns
                  </span>
                </div>
              </div>
            )

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
                      {hasDeliverablePending && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">📝 Postat — în așteptare</span>}
                      {c.status === 'ACTIVE' && !hasDeliverablePending && !wasRejected && c.package_received_at && !c.deliverable_submitted_at && (() => {
                        const isLate = c.post_deadline_days && (new Date().getTime() - new Date(c.package_received_at).getTime()) > c.post_deadline_days * 86400000
                        if (isLate) return <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⏰ Întârziat</span>
                        if (c.post_deadline_days) {
                          const msLeft = c.post_deadline_days * 86400000 - (new Date().getTime() - new Date(c.package_received_at).getTime())
                          const daysLeftToPost = Math.ceil(msLeft / 86400000)
                          if (daysLeftToPost <= 0) return <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⏰ Astăzi e ultima zi</span>
                          if (daysLeftToPost === 1) return <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">🔥 Ultima zi — postează azi!</span>
                          if (daysLeftToPost <= 3) return <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">📦 {daysLeftToPost} zile rămase</span>
                          return <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">📦 La tine · {daysLeftToPost} zile rămase</span>
                        }
                        return <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">📦 La tine · postează</span>
                      })()}
                      {c.status === 'ACTIVE' && !c.package_received_at && c.package_sent_at && <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">🚚 Colet în drum</span>}
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
                            ? camp.budget_per_influencer
                            : camp.max_influencers && camp.max_influencers > 0
                              ? (camp.budget / camp.max_influencers)
                              : camp.budget
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
                      {c.campaigns?.description && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Despre campanie</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{c.campaigns.description}</p>
                        </div>
                      )}


                      {/* Ofertă barter */}
                      {c.campaigns?.offer_name && (() => {
                        const imgs = (Array.isArray(c.campaigns?.offer_image_urls) && c.campaigns.offer_image_urls.length > 0)
                          ? c.campaigns.offer_image_urls.filter(Boolean)
                          : (c.campaigns?.offer_image_url ? [c.campaigns.offer_image_url] : [])
                        return (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
                            {/* Poza produsului */}
                            {imgs.length > 0 && (
                              <div className="relative w-full aspect-video overflow-hidden">
                                <img
                                  src={imgs[0]}
                                  alt={c.campaigns.offer_name}
                                  className="w-full h-full object-cover"
                                />
                                {imgs.length > 1 && (
                                  <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                    +{imgs.length - 1} imagini
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="p-3">
                              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-1.5">🎁 Ce primești</p>
                              <p className="text-sm font-bold text-gray-900 mb-1">{c.campaigns.offer_name}</p>
                              {c.campaigns.offer_description && (
                                <p className="text-xs text-gray-600 leading-relaxed">{c.campaigns.offer_description}</p>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Story instructions */}
                      {c.campaigns?.story_instructions && (
                        <div className="bg-pink-50 border border-pink-100 rounded-xl p-3">
                          <p className="text-[10px] font-black text-pink-700 uppercase tracking-wider mb-1.5">📱 Instrucțiuni postare</p>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.campaigns.story_instructions}</p>
                        </div>
                      )}

                      {/* Link promovare */}
                      {c.campaigns?.promotion_link && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-green-700 uppercase tracking-wider">🔗 Link produs / promovare</p>
                            <button
                              onClick={() => { navigator.clipboard.writeText(c.campaigns.promotion_link); notify('✅ Link copiat!') }}
                              className="text-[10px] font-bold text-green-700 hover:text-green-900"
                            >
                              📋 Copiază
                            </button>
                          </div>
                          <a href={c.campaigns.promotion_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold text-green-700 hover:text-green-900 underline break-all">
                            {c.campaigns.promotion_link}
                          </a>
                          {Array.isArray(c.campaigns.promotion_link_placement) && c.campaigns.promotion_link_placement.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.campaigns.promotion_link_placement.map((place: string) => (
                                <span key={place} className="text-[10px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{place}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Required caption */}
                      {c.campaigns?.required_caption && (
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider">📝 Caption obligatoriu</p>
                            <button
                              onClick={() => { navigator.clipboard.writeText(c.campaigns.required_caption); notify('✅ Caption copiat!') }}
                              className="text-[10px] font-bold text-purple-700 hover:text-purple-900"
                            >
                              📋 Copiază
                            </button>
                          </div>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">{c.campaigns.required_caption}</p>
                        </div>
                      )}

                      {/* Required hashtags */}
                      {Array.isArray(c.campaigns?.required_hashtags) && c.campaigns.required_hashtags.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider"># Hashtag-uri obligatorii</p>
                            <button
                              onClick={() => { navigator.clipboard.writeText(c.campaigns.required_hashtags.map((t: string) => '#' + t.replace(/^#/, '')).join(' ')); notify('✅ Hashtag-uri copiate!') }}
                              className="text-[10px] font-bold text-blue-700 hover:text-blue-900"
                            >
                              📋 Copiază
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.campaigns.required_hashtags.map((tag: string) => (
                              <span key={tag} className="text-xs font-bold bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                                #{tag.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Forbidden */}
                      {(c.campaigns?.forbidden_content || (Array.isArray(c.campaigns?.forbidden_mentions) && c.campaigns.forbidden_mentions.length > 0)) && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-[10px] font-black text-red-700 uppercase tracking-wider mb-1.5">🚫 Ce să eviți</p>
                          {c.campaigns.forbidden_content && (
                            <p className="text-xs text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">{c.campaigns.forbidden_content}</p>
                          )}
                          {Array.isArray(c.campaigns.forbidden_mentions) && c.campaigns.forbidden_mentions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {c.campaigns.forbidden_mentions.map((m: string) => (
                                <span key={m} className="text-[10px] font-bold bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{m}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link spre pagina detaliată */}
                      {c.campaigns?.id && (
                        <a
                          href={`/influencer/campaigns/${c.campaigns.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-700 transition"
                        >
                          Vezi pagina completă a campaniei →
                        </a>
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

                      {/* ── ADRESĂ LIVRARE - dacă lipsește la barter delivery ── */}
                      {c.status === 'ACTIVE' &&
                        c.campaigns?.campaign_type === 'BARTER' &&
                        c.campaigns?.delivery_method === 'delivery' &&
                        !c.delivery_name && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4">
                          <p className="text-sm font-black text-orange-800 mb-1">📦 Completează adresa de livrare</p>
                          <p className="text-xs text-orange-600 mb-3">Brandul are nevoie de adresa ta pentru a-ți trimite produsul.</p>
                          <button
                            onClick={() => setAddressModal({ collabId: c.id })}
                            className="w-full py-2.5 rounded-xl font-black text-sm text-white transition"
                            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
                          >
                            Adaugă adresa de livrare →
                          </button>
                        </div>
                      )}

                    {/* Check-in locatie - barter pickup */}
                    {c.status === 'ACTIVE' && c.campaigns?.campaign_type === 'BARTER' && c.campaigns?.delivery_method === 'pickup' && (
                      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                        {c.checked_in_at ? (
                          <div className="text-center py-1">
                            <p className="text-2xl mb-1">✅</p>
                            <p className="text-sm font-black text-indigo-700">Check-in confirmat!</p>
                            <p className="text-xs text-indigo-500 mt-1">
                              {new Date(c.checked_in_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-black text-indigo-800 mb-1">📍 Check-in la locație</p>
                            <p className="text-xs text-indigo-600 mb-3">Cere codul de 6 caractere de la brand când ajungi la locație</p>
                            <div className="flex gap-2">
                              <input
                                value={checkinInputs[c.id] || ''}
                                onChange={e => setCheckinInputs(p => ({ ...p, [c.id]: e.target.value.toUpperCase().slice(0, 6) }))}
                                placeholder="AB3X7K"
                                maxLength={6}
                                className="flex-1 px-3 py-2.5 border-2 border-indigo-200 rounded-xl text-sm font-black text-center outline-none focus:border-indigo-500 bg-white uppercase"
                                style={{ fontFamily: 'monospace', letterSpacing: '.2em' }}
                              />
                              <button
                                onClick={async () => {
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
                                }}
                                disabled={checkinLoading[c.id] || !checkinInputs[c.id]}
                                className="px-4 py-2.5 rounded-xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                                {checkinLoading[c.id] ? '...' : '✓ OK'}
                              </button>
                            </div>
                            {checkinError[c.id] && (
                              <p className="text-xs text-red-500 font-bold mt-2">⚠ {checkinError[c.id]}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Status livrare - barter */}
                    {c.status === 'ACTIVE' && c.campaigns?.campaign_type === 'BARTER' && c.campaigns?.delivery_method === 'delivery' && c.delivery_name && (
                      <div className="space-y-3">
                        {/* Pachet trimis de brand - influencerul confirmă primire */}
                        {c.package_sent_at && !c.package_received_at && (
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                            <p className="text-sm font-black text-blue-800 mb-1">🚚 Pachetul tău e în drum!</p>
                            {c.package_courier && <p className="text-xs text-blue-600 mb-1">Curier: {c.package_courier}{c.package_tracking ? ` · AWB: ${c.package_tracking}` : ''}</p>}
                            <p className="text-xs text-blue-600 mb-3">Trimis pe {new Date(c.package_sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}. Confirmă când ajunge!</p>
                            <button
                              onClick={async () => {
                                const sb = createClient()
                                await sb.from('collaborations').update({ package_received_at: new Date().toISOString() }).eq('id', c.id)
                                setCollabs(prev => prev.map(col => col.id === c.id ? { ...col, package_received_at: new Date().toISOString() } : col))
                              }}
                              className="w-full py-2.5 rounded-xl font-black text-sm text-white bg-blue-500 hover:bg-blue-600 transition">
                              ✅ Am primit coletul!
                            </button>
                          </div>
                        )}

                        {/* Countdown deadline postare — vizibil doar după primirea coletului */}
                        {!c.deliverable_submitted_at && !c.deliverable_approved_at && c.package_received_at && (() => {
                          const ref = c.package_received_at
                          if (!ref) return null
                          const deadline = new Date(new Date(ref).getTime() + (c.post_deadline_days || 14) * 86400000)
                          const msLeft = deadline.getTime() - Date.now()
                          const daysLeft = Math.max(0, Math.floor(msLeft / 86400000))
                          const hoursLeft = Math.max(0, Math.floor((msLeft % 86400000) / 3600000))
                          const urgent = daysLeft <= 2
                          const expired = msLeft <= 0
                          return (
                            <div className={`rounded-2xl p-4 border-2 ${expired ? 'bg-red-50 border-red-400' : urgent ? 'bg-orange-50 border-orange-300' : 'bg-amber-50 border-amber-200'}`}>
                              <p className={`text-xs font-black uppercase tracking-wider mb-2 ${expired ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-amber-700'}`}>
                                {expired ? '❌ Deadline depășit — riști un strike!' : urgent ? '🚨 URGENT — Mai ai puțin timp!' : '⏰ Timp rămas pentru postare'}
                              </p>
                              {!expired ? (
                                <>
                                  <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-black ${urgent ? 'text-orange-600' : 'text-amber-700'}`}>{daysLeft}</span>
                                    <span className={`text-sm ${urgent ? 'text-orange-500' : 'text-amber-600'}`}>zile</span>
                                    <span className={`text-xl font-black ${urgent ? 'text-orange-600' : 'text-amber-700'}`}>{hoursLeft}</span>
                                    <span className={`text-sm ${urgent ? 'text-orange-500' : 'text-amber-600'}`}>ore</span>
                                  </div>
                                  {urgent && (
                                    <p className="text-xs font-bold text-orange-600 mt-1.5">
                                      ⚠️ Postează și trimite dovada înainte de {deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}, ora {deadline.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <div>
                                  <p className="text-sm font-bold text-red-600">Termenul a expirat pe {deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}</p>
                                  <p className="text-xs text-red-500 mt-1">Contactează-ne la contact@addfame.ro dacă ai nevoie de ajutor.</p>
                                </div>
                              )}
                              {!expired && <p className={`text-xs mt-1 ${urgent ? 'text-orange-500' : 'text-amber-600'}`}>
                                Deadline: {deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>}
                            </div>
                          )
                        })()}
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

      {/* ── Modal adresă livrare barter ──────────────────────────────────── */}
      {addressModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="h-1 w-full" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }} />
            <div className="p-6">
              <h3 className="font-black text-gray-900 text-lg mb-1">📦 Adresă de livrare</h3>
              <p className="text-sm text-gray-500 mb-5">Brandul va trimite produsul la această adresă după aprobare.</p>
              <div className="space-y-3">
                <input value={address.name} onChange={e => setAddress(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nume complet *" className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={address.phone} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Telefon *" className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                  <input value={address.postal_code} onChange={e => setAddress(p => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Cod poștal" className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                </div>
                <input value={address.address} onChange={e => setAddress(p => ({ ...p, address: e.target.value }))}
                  placeholder="Stradă, număr, bloc, ap. *" className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                    placeholder="Oraș *" className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                  <input value={address.county} onChange={e => setAddress(p => ({ ...p, county: e.target.value }))}
                    placeholder="Județ *" className="px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition" />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">🔒 Adresa e vizibilă doar brandului după aprobare</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setAddressModal(null)}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                  Anulează
                </button>
                <button onClick={handleAcceptWithAddress} disabled={!!actionLoading}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                  {actionLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Accept invitația
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
