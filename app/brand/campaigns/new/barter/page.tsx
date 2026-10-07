'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBarterCampaign, saveDraftBarterCampaign, publishBarterDraft } from '@/app/actions/barter-campaigns'
import { AIBriefGenerator } from '@/components/shared/AIBriefGenerator'
import { InfluencerSlotsSelector, type FeeInfo } from '@/components/brand/InfluencerSlotsSelector'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  Gift, Wrench, Camera, MapPin, FileText, Target,
  CheckCircle2, Upload, X, Minus, Plus, Clock,
  Instagram, Zap, Users,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { TIERS } from '@/lib/tiers'
import { INFLUENCER_NICHES } from '@/lib/constants/registration'

// ─── Types ───────────────────────────────────────────────────────────────────

type OfferType = 'product' | 'service'
type DeliveryMethod = 'pickup' | 'delivery'

/** Platformele campaniei, deduse din sarcinile alese (aceeași regulă la draft, publicare și generatorul AI). */
function derivePlatforms(data: WizardData): string[] {
  return [
    ...(data.tasks_stories_count > 0 || data.tasks_ig_reel || data.tasks_ig_post || data.tasks_ig_live ? ['INSTAGRAM'] : []),
    ...(data.tasks_tt_video || data.tasks_tt_live || data.tasks_tt_duet ? ['TIKTOK'] : []),
    ...(data.tasks_yt_short || data.tasks_yt_video || data.tasks_yt_mention ? ['YOUTUBE'] : []),
    ...(data.tasks_fb_post || data.tasks_fb_story || data.tasks_fb_reel || data.tasks_fb_share ? ['FACEBOOK'] : []),
  ]
}

interface WizardData {
  // Step 1
  offer_type: OfferType | null
  // Step 2
  offer_name: string
  offer_value: string
  offer_description: string
  reservation_required: boolean
  // Step 3
  offer_image_urls: string[]
  offer_count: number
  // Step 4
  delivery_method: DeliveryMethod | null
  pickup_location_name: string
  pickup_location_address: string
  // Step 5 — Brief & Story
  story_include_instagram: boolean
  story_include_atmosphere: boolean
  story_include_product: boolean
  story_instructions: string
  auto_accept_influencers: boolean
  // Step 5 — Tasks Instagram
  tasks_stories_count: number
  tasks_include_post: boolean
  tasks_ig_reel: boolean
  tasks_ig_reel_duration: number
  tasks_ig_post: boolean
  tasks_ig_live: boolean
  tasks_ig_days_online: number
  // TikTok
  tasks_tiktok_video: boolean
  tasks_tiktok_count: number
  tasks_tt_video: boolean
  tasks_tt_video_duration: number
  tasks_tt_live: boolean
  tasks_tt_duet: boolean
  tasks_tt_days_online: number
  // YouTube
  tasks_youtube_short: boolean
  tasks_youtube_video: boolean
  tasks_yt_short: boolean
  tasks_yt_short_duration: number
  tasks_yt_video: boolean
  tasks_yt_video_duration: number
  tasks_yt_mention: boolean
  tasks_yt_link_in_desc: boolean
  // Facebook
  tasks_facebook_post: boolean
  tasks_facebook_story: boolean
  tasks_fb_post: boolean
  tasks_fb_story: boolean
  tasks_fb_reel: boolean
  tasks_fb_share: boolean
  // Step 6 — Brief extra
  promotion_link: string
  promotion_link_placement: string[]
  required_hashtags: string
  required_caption: string
  content_tone: string[]
  key_messages: string
  forbidden_mentions: string
  forbidden_content: string
  min_days_online: number
  // Step 7
  min_followers_target: number
  elig_tiers: string[]
  elig_niches: string[]
  // Coordonate GPS locație pickup
  pickup_lat?: number
  pickup_lon?: number
  duration_days?: number
  deadline?: string
}

// ─── Stiluri pagină (prefix bz-) ─────────────────────────────────────────────

const BZ_CSS = `
.bz-layout { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 22px; align-items: start; }
.bz-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.bz-side { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.bz-stepper { display: flex; align-items: center; gap: 0; padding: 14px 18px; }
.bz-st { display: flex; align-items: center; flex: 1; min-width: 0; }
.bz-st:last-child { flex: none; }
.bz-dot { width: 30px; height: 30px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: #f0eff7; color: #6a6690; }
.bz-dot.cur { background: #5a35e6; color: #fff; box-shadow: 0 0 0 4px rgba(90,53,230,.16); }
.bz-dot.ok { background: #14123a; color: #fff; }
.bz-line { flex: 1; height: 2px; margin: 0 6px; background: #e5e3f3; border-radius: 2px; }
.bz-line.ok { background: #14123a; }
.bz-badge { width: 32px; height: 32px; flex: none; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: #fff; background: linear-gradient(135deg,#2f6fe0,#5a35e6); font-family: var(--font-display, system-ui), system-ui, sans-serif; }
.bz-sec { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
.bz-sec-h { display: flex; align-items: flex-start; gap: 12px; }
.bz-sec-h p { margin: 2px 0 0; font-size: 13px; color: #6a6690; }
.bz-f { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.bz-f > label, .bz-lbl { font-size: 13px; font-weight: 700; color: #14123a; }
.bz-f > label small, .bz-lbl small { font-weight: 500; color: #8783a8; font-size: 12px; }
.bz-hint { font-size: 12px; color: #6a6690; margin: 0; }
.bz-input { width: 100%; height: 46px; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 0 14px; font: inherit; font-size: 14px; background: #fff; color: #14123a; outline: none; box-sizing: border-box; min-width: 0; }
.bz-input:focus { border-color: #5a35e6; box-shadow: 0 0 0 3px rgba(90,53,230,.1); }
textarea.bz-input { height: auto; padding: 12px 14px; line-height: 1.5; resize: vertical; }
.bz-adorn { position: relative; }
.bz-adorn > span { position: absolute; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 800; color: #8783a8; pointer-events: none; }
.bz-adorn > span.l { left: 14px; } .bz-adorn > span.r { right: 14px; }
.bz-adorn > input.pl { padding-left: 52px; } .bz-adorn > input.pr { padding-right: 56px; }
.bz-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bz-opt { width: 100%; display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 14px 16px; border-radius: 16px; border: 1.5px solid #e5e3f3; background: #fff; text-align: left; cursor: pointer; font: inherit; color: #14123a; position: relative; transition: border-color .15s, background .15s; box-sizing: border-box; }
.bz-opt:hover { border-color: #c9b9fb; background: #faf8ff; }
.bz-opt.on { border-color: #5a35e6; background: #f5f2ff; box-shadow: 0 0 0 3px rgba(90,53,230,.08); }
.bz-opt.ctr { flex-direction: column; justify-content: center; text-align: center; gap: 4px; }
.bz-opt b { font-size: 14px; font-weight: 700; display: block; }
.bz-opt small { font-size: 12px; color: #6a6690; display: block; margin-top: 1px; }
.bz-tick { margin-left: auto; width: 22px; height: 22px; flex: none; border-radius: 50%; background: #5a35e6; color: #fff; display: flex; align-items: center; justify-content: center; }
.bz-box { width: 22px; height: 22px; flex: none; border-radius: 7px; border: 2px solid #cfcbe6; display: flex; align-items: center; justify-content: center; color: #fff; background: #fff; }
.bz-opt.on .bz-box { background: #5a35e6; border-color: #5a35e6; }
.bz-emoji { font-size: 28px; line-height: 1; flex: none; width: 44px; height: 44px; border-radius: 12px; background: #f0eff7; display: flex; align-items: center; justify-content: center; }
.bz-opt.on .bz-emoji { background: #efeaff; }
.bz-task { border: 1.5px solid #e5e3f3; border-radius: 16px; background: #fff; overflow: hidden; }
.bz-task.on { border-color: #5a35e6; background: #f5f2ff; }
.bz-task > button { width: 100%; display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 12px 16px; background: transparent; border: 0; text-align: left; cursor: pointer; font: inherit; color: #14123a; }
.bz-task > button b { font-size: 14px; font-weight: 700; display: block; }
.bz-task > button small { font-size: 12px; color: #6a6690; }
.bz-task.on .bz-box { background: #5a35e6; border-color: #5a35e6; }
.bz-task-x { padding: 0 16px 14px 50px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #6a6690; }
.bz-task-x .bz-input { width: 84px; height: 40px; }
.bz-plat { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.bz-plat button { position: relative; min-height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border-radius: 16px; border: 1.5px solid #e5e3f3; background: #fff; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: #6a6690; padding: 8px 4px; }
.bz-plat button.on { border-color: #5a35e6; background: #f5f2ff; color: #4423c4; }
.bz-plat i { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.bz-plat em { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #16a34a; border: 2px solid #fff; color: #fff; display: flex; align-items: center; justify-content: center; }
.bz-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.bz-chipb { min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1.5px solid #e5e3f3; background: #fff; color: #4a4770; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.bz-chipb.on { background: #14123a; border-color: #14123a; color: #fff; }
.bz-sub { background: #f6f6fc; border: 1px solid #eeecf7; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.bz-note { border-radius: 14px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.45; }
.bz-note.green { background: #dcf5ec; color: #14532d; } .bz-note.amber { background: #fff1c2; color: #854d0e; } .bz-note.blue { background: #e6f0ff; color: #1d4fb8; } .bz-note.red { background: #fde8e6; color: #b42318; }
.bz-note a.bz-lnk { text-decoration: underline; font-weight: 700; color: inherit; }
.bz-drop { width: 100%; min-height: 190px; border-radius: 18px; border: 2px dashed #cfcbe6; background: #faf9ff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #6a6690; cursor: pointer; font: inherit; padding: 20px; text-align: center; }
.bz-drop:hover { border-color: #5a35e6; background: #f5f2ff; }
.bz-thumbs { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
.bz-thumb { position: relative; border-radius: 14px; overflow: hidden; border: 1px solid #e5e3f3; aspect-ratio: 1; }
.bz-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bz-thumb button.x { position: absolute; top: 6px; right: 6px; width: 28px; height: 28px; border-radius: 50%; border: 0; background: rgba(20,18,58,.7); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.bz-thumb .pr { position: absolute; left: 6px; bottom: 6px; font-size: 10px; font-weight: 800; background: #5a35e6; color: #fff; border-radius: 99px; padding: 2px 8px; }
.bz-thumbs .bz-drop { min-height: 0; aspect-ratio: 1; padding: 6px; gap: 2px; border-radius: 14px; font-size: 11px; }
.bz-cnt { display: flex; align-items: center; justify-content: center; gap: 22px; }
.bz-cnt button { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #5a35e6; background: #fff; color: #5a35e6; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.bz-cnt button:disabled { opacity: .35; cursor: not-allowed; }
.bz-cnt span { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 36px; font-weight: 800; color: #5a35e6; min-width: 56px; text-align: center; }
.bz-loc { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1.5px solid #5a35e6; background: #f5f2ff; border-radius: 16px; }
.bz-link { background: none; border: 0; padding: 8px 0; min-height: 36px; color: #5a35e6; font: inherit; font-size: 13px; font-weight: 700; text-decoration: underline; cursor: pointer; text-align: left; }
.bz-dd { position: absolute; top: 100%; left: 0; right: 0; z-index: 50; background: #fff; border: 1px solid #e5e3f3; border-radius: 14px; box-shadow: 0 18px 40px -18px rgba(20,18,58,.35); overflow: hidden; margin-top: 4px; }
.bz-dd button { width: 100%; display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; min-height: 48px; background: #fff; border: 0; border-bottom: 1px solid #f0eff7; text-align: left; cursor: pointer; font: inherit; color: #14123a; }
.bz-dd button:hover { background: #f7f4ff; }
.bz-rv h3 { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #8783a8; font-family: inherit; margin-bottom: 4px; }
.bz-rf { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid #eeecf7; font-size: 14px; }
.bz-rf:last-child { border-bottom: 0; }
.bz-rf span:first-child { color: #6a6690; flex: none; } .bz-rf span:last-child { font-weight: 600; text-align: right; min-width: 0; overflow-wrap: anywhere; }
.bz-sum { padding: 20px; display: flex; flex-direction: column; gap: 4px; }
.bz-sum-fee { margin-top: 10px; border-radius: 16px; padding: 14px 16px; background: #fff1c2; color: #854d0e; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bz-sum-fee b { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 22px; font-weight: 800; white-space: nowrap; }
.bz-foot { position: sticky; bottom: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 16px; background: rgba(255,255,255,.95); backdrop-filter: blur(8px); border: 1px solid #e5e3f3; border-radius: 18px; box-shadow: 0 -10px 30px -18px rgba(20,18,58,.35); }
.bz-foot .grp { display: flex; gap: 10px; align-items: center; }
.bz-foot .bu-btn { height: 46px; }
.bz-foot .bu-btn.ok { color: #14532d; background: #dcf5ec; border-color: #a7e3cc; }
.bz-spin { width: 32px; height: 32px; border: 4px solid #e5e3f3; border-top-color: #5a35e6; border-radius: 50%; animation: bzspin .8s linear infinite; }
@keyframes bzspin { to { transform: rotate(360deg); } }
@media (max-width: 1023px) { .bz-layout { grid-template-columns: minmax(0,1fr); } .bz-side { display: none; } }
@media (max-width: 767px) {
  .bz-sec { padding: 18px 16px; }
  .bz-stepper { padding: 12px 14px; }
  .bz-dot { width: 26px; height: 26px; font-size: 11px; }
  .bz-line { margin: 0 3px; }
  .bz-grid2 { grid-template-columns: 1fr; }
  .bz-grid2.keep { grid-template-columns: 1fr 1fr; }
  .bz-foot { padding: 10px 12px; border-radius: 16px; }
  .bz-foot .grp { width: 100%; }
  .bz-foot .grp .bu-btn { flex: 1; }
  .bz-foot .grp .bu-btn.p { flex: 2; }
  .bz-plat { gap: 6px; }
}
`

// ─── Progress bar ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Tip ofertă' },
  { label: 'Detalii' },
  { label: 'Foto & Nr.' },
  { label: 'Locație' },
  { label: 'Brief' },
  { label: 'Tasks' },
  { label: 'Target' },
  { label: 'Review' },
]

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="bu-card">
      <div className="bz-stepper">
        {STEPS.map((s, i) => (
          <div key={i} className="bz-st">
            <div className={`bz-dot${i < current ? ' ok' : i === current ? ' cur' : ''}`} title={s.label}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`bz-line${i < current ? ' ok' : ''}`} />}
          </div>
        ))}
      </div>
      <div className="bu-bar" style={{ borderRadius: 0 }}><i style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} /></div>
      <p className="bu-sm bu-muted" style={{ margin: 0, padding: '10px 18px', fontWeight: 600 }}>
        Pasul {current + 1} din {STEPS.length} — <span style={{ color: '#14123a' }}>{STEPS[current]?.label}</span>
      </p>
    </div>
  )
}

// ─── Section card ────────────────────────────────────────────────────────────

function Section({ badge, title, sub, children }: {
  badge: React.ReactNode; title: string; sub?: string; children: React.ReactNode
}) {
  return (
    <section className="bu-card bz-sec">
      <div className="bz-sec-h">
        <div className="bz-badge">{badge}</div>
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

// ─── Option card ─────────────────────────────────────────────────────────────

function OptionCard({ selected, onClick, children, center }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; center?: boolean
}) {
  return (
    <button type="button" onClick={onClick} className={`bz-opt${selected ? ' on' : ''}${center ? ' ctr' : ''}`}>
      {children}
    </button>
  )
}

function Tick() {
  return <span className="bz-tick"><Check className="w-3 h-3" /></span>
}

// ─── Counter ─────────────────────────────────────────────────────────────────

function Counter({ value, onChange, min = 1, max = 100 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div className="bz-cnt">
      <button type="button" aria-label="Scade" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Minus className="w-4 h-4" />
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Crește" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Checkbox row ─────────────────────────────────────────────────────────────

function CheckRow({ checked, onChange, icon: Icon, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void;
  icon: any; label: string; sub?: string
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`bz-opt${checked ? ' on' : ''}`}>
      <span className="bz-box">{checked && <Check className="w-3.5 h-3.5" />}</span>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#5a35e6' }} />
      <div>
        <b>{label}</b>
        {sub && <small>{sub}</small>}
      </div>
    </button>
  )
}

// ─── Task tile (platform content type) ───────────────────────────────────────

function TaskTile({ on, onClick, label, desc, children }: {
  on: boolean; onClick: () => void; label: string; desc?: string; children?: React.ReactNode
}) {
  return (
    <div className={`bz-task${on ? ' on' : ''}`}>
      <button type="button" onClick={onClick}>
        <span className="bz-box">{on && <Check className="w-3.5 h-3.5" />}</span>
        <div style={{ flex: 1, minWidth: 0 }}><b>{label}</b>{desc && <small>{desc}</small>}</div>
      </button>
      {children}
    </div>
  )
}

// ─── Multi Image uploader (max 5) ────────────────────────────────────────────

function MultiImageUploader({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList) => {
    const remaining = 5 - values.length
    if (remaining <= 0) { setError('Maxim 5 imagini permise.'); return }
    const toUpload = Array.from(files).slice(0, remaining)
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Neautentificat')
      const newUrls: string[] = []
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 5 * 1024 * 1024) { setError('Fiecare imagine trebuie să fie sub 5MB.'); continue }
        const ext = file.name.split('.').pop()
        const path = `barter/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(path, file, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      onChange([...values, ...newUrls])
    } catch (e: any) {
      setError(e.message || 'Upload eșuat.')
    } finally {
      setUploading(false)
    }
  }, [values, onChange])

  return (
    <div className="bz-f">
      {values.length > 0 && (
        <div className="bz-thumbs">
          {values.map((url, idx) => (
            <div key={idx} className="bz-thumb">
              <img src={url} alt={`Imagine ${idx + 1}`} />
              <button type="button" className="x" aria-label="Șterge imaginea" onClick={() => onChange(values.filter((_, i) => i !== idx))}>
                <X className="w-3.5 h-3.5" />
              </button>
              {idx === 0 && <span className="pr">Principală</span>}
            </div>
          ))}
          {values.length < 5 && (
            <button type="button" className="bz-drop" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#5a35e6' }} /> : <><Plus className="w-5 h-5" /><span style={{ fontWeight: 700 }}>{5 - values.length} rămase</span></>}
            </button>
          )}
        </div>
      )}
      {values.length === 0 && (
        <button type="button" className="bz-drop" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading
            ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5a35e6' }} />
            : <>
                <span className="bu-ico" style={{ background: '#efeaff', color: '#4423c4' }}><Upload className="w-5 h-5" /></span>
                <b style={{ color: '#14123a', fontSize: 14 }}>Apasă pentru a încărca imagini</b>
                <span className="bu-xs">JPG, PNG · max 5MB · până la 5 imagini</span>
              </>}
        </button>
      )}
      {error && <p className="bz-hint" style={{ color: '#b42318', fontWeight: 600 }}>{error}</p>}
      <p className="bz-hint">{values.length}/5 imagini · Prima imagine va fi cea principală</p>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}

// ─── Location Picker (Nominatim / OpenStreetMap) ─────────────────────────────

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
  address: {
    road?: string
    house_number?: string
    city?: string
    town?: string
    village?: string
    county?: string
    country?: string
  }
  lat: string
  lon: string
}

function LocationPicker({ name, address, onSelect }: {
  name: string
  address: string
  onSelect: (name: string, address: string, lat?: number, lon?: number) => void
}) {
  const [query, setQuery] = useState(name || '')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState(name || '')
  const [manualAddress, setManualAddress] = useState(address || '')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Închide dropdown la click în afară
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setShowResults(false); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=ro`,
        { headers: { 'Accept-Language': 'ro', 'User-Agent': 'AddFame/1.0' } }
      )
      const data: NominatimResult[] = await res.json()
      setResults(data)
      setShowResults(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 500)
  }

  const handleSelect = (r: NominatimResult) => {
    // Construiește adresa curată
    const a = r.address
    const street = [a.road, a.house_number].filter(Boolean).join(' ')
    const city = a.city || a.town || a.village || a.county || ''
    const cleanAddress = [street, city].filter(Boolean).join(', ')
    const locName = r.name || query

    setQuery(locName)
    setResults([])
    setShowResults(false)
    onSelect(locName, cleanAddress || r.display_name.split(',').slice(0, 2).join(',').trim(), parseFloat(r.lat), parseFloat(r.lon))
  }

  const handleManualSave = () => {
    if (manualName.trim() && manualAddress.trim()) {
      onSelect(manualName.trim(), manualAddress.trim())
      setManualMode(false)
    }
  }

  // Dacă avem deja o locație selectată, afișăm preview + buton schimbare
  if (name && address && !manualMode) {
    return (
      <div className="bz-f">
        <div className="bz-loc">
          <span className="bu-ico" style={{ background: '#efeaff', color: '#4423c4', width: 36, height: 36 }}>
            <MapPin className="w-4 h-4" />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }} className="truncate">{name}</p>
            <p className="bz-hint truncate">{address}</p>
          </div>
          <Tick />
        </div>
        <button
          type="button"
          onClick={() => { setQuery(''); onSelect('', ''); setShowResults(false) }}
          className="bz-link"
        >
          Schimbă locația
        </button>
      </div>
    )
  }

  if (manualMode) {
    return (
      <div className="bz-f" style={{ gap: 12 }}>
        <div className="bu-row" style={{ justifyContent: 'space-between' }}>
          <p className="bz-lbl" style={{ margin: 0 }}>Completează manual</p>
          <button type="button" onClick={() => setManualMode(false)} className="bz-link">
            ← Înapoi la căutare
          </button>
        </div>
        <input
          type="text"
          placeholder="Numele locației (ex. Salon TopFace)"
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          className="bz-input"
        />
        <input
          type="text"
          placeholder="Adresa completă (ex. Str. Națională nr. 5, Iași)"
          value={manualAddress}
          onChange={e => setManualAddress(e.target.value)}
          className="bz-input"
        />
        <button
          type="button"
          onClick={handleManualSave}
          disabled={!manualName.trim() || !manualAddress.trim()}
          className="bu-btn p big"
          style={{ width: '100%' }}
        >
          Confirmă locația
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="bz-f" style={{ position: 'relative' }}>
      {/* Search input */}
      <div className="bu-search">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <input
          type="text"
          placeholder="Caută afacerea ta (ex. Salon TopFace Iași)..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {searching && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
        {query && !searching && (
          <button
            type="button"
            aria-label="Șterge"
            onClick={() => { setQuery(''); setResults([]); setShowResults(false) }}
            style={{ background: 'none', border: 0, padding: 8, margin: -8, cursor: 'pointer', color: 'inherit', display: 'flex' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="bz-dd" style={{ top: 48 }}>
          {results.map(r => {
            const a = r.address
            const city = a.city || a.town || a.village || ''
            const street = [a.road, a.house_number].filter(Boolean).join(' ')
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelect(r)}
              >
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#5a35e6' }} />
                <div className="min-w-0">
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }} className="truncate">{r.name || street || r.display_name.split(',')[0]}</p>
                  <p className="bz-hint truncate">
                    {[street, city].filter(Boolean).join(', ') || r.display_name.split(',').slice(0, 3).join(',')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Nu găsesc → manual */}
      {query.length >= 3 && !searching && (
        <button
          type="button"
          onClick={() => { setManualMode(true); setManualName(query); setShowResults(false) }}
          className="bz-link"
        >
          Nu găsesc afacerea mea → completez manual
        </button>
      )}

      <p className="bz-hint">
        Powered by OpenStreetMap · caută în română pentru rezultate mai bune
      </p>
    </div>
  )
}



function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bz-rf">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

const INITIAL: WizardData = {
  offer_type: null,
  offer_name: '',
  offer_value: '',
  offer_description: '',
  reservation_required: false,
  offer_image_urls: [],
  offer_count: 3,
  delivery_method: null,
  pickup_location_name: '',
  pickup_location_address: '',
  story_include_instagram: true,
  story_include_atmosphere: true,
  story_include_product: true,
  story_instructions: '',
  auto_accept_influencers: true,
  tasks_stories_count: 0,
  tasks_include_post: false,
  tasks_ig_reel: false,
  tasks_ig_reel_duration: 15,
  tasks_ig_post: false,
  tasks_ig_live: false,
  tasks_ig_days_online: 30,
  tasks_tiktok_video: false,
  tasks_tiktok_count: 1,
  tasks_tt_video: false,
  tasks_tt_video_duration: 30,
  tasks_tt_live: false,
  tasks_tt_duet: false,
  tasks_tt_days_online: 30,
  tasks_youtube_short: false,
  tasks_youtube_video: false,
  tasks_yt_short: false,
  tasks_yt_short_duration: 30,
  tasks_yt_video: false,
  tasks_yt_video_duration: 5,
  tasks_yt_mention: false,
  tasks_yt_link_in_desc: false,
  tasks_facebook_post: false,
  tasks_facebook_story: false,
  tasks_fb_post: false,
  tasks_fb_story: false,
  tasks_fb_reel: false,
  tasks_fb_share: false,
  promotion_link: '',
  promotion_link_placement: [],
  required_hashtags: '',
  required_caption: '',
  content_tone: [],
  key_messages: '',
  forbidden_mentions: '',
  forbidden_content: '',
  min_days_online: 30,
  min_followers_target: 500,
  elig_tiers: [],
  elig_niches: [],
  pickup_lat: undefined,
  pickup_lon: undefined,
}

export default function BarterCampaignWizard() {
  return (
    <Suspense fallback={<div className="bu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><style>{BZ_CSS}</style><div className="bz-spin" /></div>}>
      <BarterCampaignWizardContent />
    </Suspense>
  )
}

function BarterCampaignWizardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Preîncarcă draft din URL dacă există ?draftId=
  useEffect(() => {
    const urlDraftId = searchParams.get('draftId')
    if (!urlDraftId) return
    setDraftId(urlDraftId)
    const sb = createClient()
    sb.from('campaigns').select('*').eq('id', urlDraftId).single().then(({ data: c }) => {
      if (!c || c.status !== 'DRAFT') return
      setData(prev => ({
        ...prev,
        offer_type: c.offer_type || prev.offer_type,
        offer_name: c.offer_name || prev.offer_name,
        offer_value: c.offer_value ? String(c.offer_value) : prev.offer_value,
        offer_description: c.offer_description || prev.offer_description,
        offer_count: c.offer_count || prev.offer_count,
        offer_image_urls: (Array.isArray(c.offer_images) && c.offer_images.length) ? c.offer_images : (c.offer_image_url ? [c.offer_image_url] : prev.offer_image_urls),
        delivery_method: c.delivery_method || prev.delivery_method,
        pickup_location_name: c.pickup_location_name || prev.pickup_location_name,
        pickup_location_address: c.pickup_location_address || prev.pickup_location_address,
        pickup_lat: c.latitude || prev.pickup_lat,
        pickup_lon: c.longitude || prev.pickup_lon,
        reservation_required: c.reservation_required ?? prev.reservation_required,
        auto_accept_influencers: c.auto_accept_influencers ?? prev.auto_accept_influencers,
        story_include_instagram: c.story_include_instagram ?? prev.story_include_instagram,
        story_include_atmosphere: c.story_include_atmosphere ?? prev.story_include_atmosphere,
        story_include_product: c.story_include_product ?? prev.story_include_product,
        story_instructions: c.story_instructions || prev.story_instructions,
        tasks_stories_count: c.tasks_stories_count ?? prev.tasks_stories_count,
        tasks_include_post: c.tasks_include_post ?? prev.tasks_include_post,
        tasks_ig_reel: c.tasks_ig_reel ?? prev.tasks_ig_reel,
        tasks_ig_reel_duration: c.tasks_ig_reel_duration || prev.tasks_ig_reel_duration,
        tasks_ig_post: c.tasks_ig_post ?? prev.tasks_ig_post,
        tasks_ig_live: c.tasks_ig_live ?? prev.tasks_ig_live,
        tasks_ig_days_online: c.tasks_ig_days_online || prev.tasks_ig_days_online,
        tasks_tt_video: c.tasks_tt_video ?? prev.tasks_tt_video,
        tasks_tt_video_duration: c.tasks_tt_video_duration || prev.tasks_tt_video_duration,
        tasks_tt_live: c.tasks_tt_live ?? prev.tasks_tt_live,
        tasks_tt_duet: c.tasks_tt_duet ?? prev.tasks_tt_duet,
        tasks_tt_days_online: c.tasks_tt_days_online || prev.tasks_tt_days_online,
        tasks_yt_short: c.tasks_yt_short ?? prev.tasks_yt_short,
        tasks_yt_short_duration: c.tasks_yt_short_duration || prev.tasks_yt_short_duration,
        tasks_yt_video: c.tasks_yt_video ?? prev.tasks_yt_video,
        tasks_yt_video_duration: c.tasks_yt_video_duration || prev.tasks_yt_video_duration,
        tasks_yt_mention: c.tasks_yt_mention ?? prev.tasks_yt_mention,
        tasks_yt_link_in_desc: c.tasks_yt_link_in_desc ?? prev.tasks_yt_link_in_desc,
        tasks_fb_post: c.tasks_fb_post ?? prev.tasks_fb_post,
        tasks_fb_story: c.tasks_fb_story ?? prev.tasks_fb_story,
        tasks_fb_reel: c.tasks_fb_reel ?? prev.tasks_fb_reel,
        tasks_fb_share: c.tasks_fb_share ?? prev.tasks_fb_share,
        promotion_link: c.promotion_link || prev.promotion_link,
        required_hashtags: c.required_hashtags?.join(' ') || prev.required_hashtags,
        required_caption: c.required_caption || prev.required_caption,
        content_tone: c.content_tone || prev.content_tone,
        key_messages: c.key_messages?.join('\n') || prev.key_messages,
        forbidden_content: c.forbidden_content || prev.forbidden_content,
        min_days_online: c.min_days_online || prev.min_days_online,
        min_followers_target: c.min_followers_target || prev.min_followers_target,
        elig_tiers: c.elig_tiers || prev.elig_tiers,
        elig_niches: c.elig_niches || prev.elig_niches,
      }))
    })
  }, [])
  const [step, setStep] = useState(0)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null)
  // Sold insuficient la publicare → campania a rămas salvată ca draft
  const [savedDraftNotice, setSavedDraftNotice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('instagram')
  const [influencerCount, setInfluencerCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({})
  const [networkTotal, setNetworkTotal] = useState<number | null>(null)

  // Contor live: câți creatori ajung la oferta ta (step 6)
  useEffect(() => {
    if (step !== 6) return
    setCountLoading(true)
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          tiers: data.elig_tiers.join(','),
          niches: data.elig_niches.join(','),
          min_followers: String(data.min_followers_target || 0),
        })
        const res = await fetch(`/api/public/influencer-count?${qs}`)
        const json = await res.json()
        if (!res.ok) throw new Error('count')
        setInfluencerCount(json.count ?? 0)
        setTierCounts(json.byTier || {})
        setNetworkTotal(json.total ?? null)
      } catch { setInfluencerCount(null) }
      finally { setCountLoading(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [data.min_followers_target, data.elig_tiers, data.elig_niches, step])

  const toggleElig = (field: 'elig_tiers' | 'elig_niches', v: string) =>
    setData(d => ({ ...d, [field]: d[field].includes(v) ? d[field].filter(x => x !== v) : [...d[field], v] }))

  // Platform tabs pentru step 5 (folosește data — definit mai sus)
  const platformTabs = [
    {
      id: 'instagram', label: 'Instagram',
      bg: 'linear-gradient(135deg,#f43f5e,#a855f7)',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>),
      active: data.tasks_stories_count > 0 || data.tasks_ig_reel || data.tasks_ig_post || data.tasks_ig_live,
    },
    {
      id: 'tiktok', label: 'TikTok', bg: '#010101',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" /></svg>),
      active: data.tasks_tt_video || data.tasks_tt_live || data.tasks_tt_duet,
    },
    {
      id: 'youtube', label: 'YouTube', bg: '#ef4444',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>),
      active: data.tasks_yt_short || data.tasks_yt_video || data.tasks_yt_mention,
    },
    {
      id: 'facebook', label: 'Facebook', bg: '#2563eb',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>),
      active: data.tasks_facebook_post || data.tasks_facebook_story,
    },
  ]

  // Brand locations loaded from DB
  const [brandLocations, setBrandLocations] = useState<{ name: string; address: string }[]>([])
  const [locationsLoaded, setLocationsLoaded] = useState(false)

  const set = (partial: Partial<WizardData>) => setData(prev => ({ ...prev, ...partial }))

  // Load brand location for pickup step
  const loadBrandLocations = useCallback(async () => {
    if (locationsLoaded) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: brand } = await supabase
        .from('brands')
        .select('name')
        .eq('user_id', user.id)
        .single()
      if (brand) {
        const loc = {
          name: brand.name || 'Locația mea',
          address: 'Adaugă adresa din Setări',
        }
        setBrandLocations([loc])
        // Pre-select if empty
        setData(prev => ({
          ...prev,
          pickup_location_name: prev.pickup_location_name || loc.name,
          pickup_location_address: prev.pickup_location_address || loc.address,
        }))
      }
    } finally {
      setLocationsLoaded(true)
    }
  }, [locationsLoaded])

  // Validation per step
  const canProceed = (): boolean => {
    switch (step) {
      case 0: return data.offer_type !== null
      case 1: return data.offer_name.trim().length > 0 && parseFloat(data.offer_value) > 0 && !!data.deadline
      case 2: return data.offer_count >= 1
      case 3: return data.delivery_method !== null &&
        (data.delivery_method === 'delivery' || data.pickup_location_name.length > 0)
      case 4: return true
      case 5: return data.tasks_stories_count >= 1 || data.tasks_ig_reel || data.tasks_ig_post ||
        data.tasks_ig_live || data.tasks_tt_video || data.tasks_tt_live || data.tasks_tt_duet ||
        data.tasks_yt_short || data.tasks_yt_video || data.tasks_yt_mention ||
        data.tasks_fb_post || data.tasks_fb_story || data.tasks_fb_reel || data.tasks_fb_share
      case 6: return true
      case 6: return true
      case 7: return true
      default: return true
    }
  }

  const next = () => {
    setError(null)
    if (step === 3) loadBrandLocations()
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }
  const back = () => { setError(null); setStep(s => Math.max(0, s - 1)) }

  const saveDraft = async (): Promise<boolean> => {
    setSavingDraft(true)
    setDraftSaved(false)
    try {
      const result = await saveDraftBarterCampaign({
        offer_type: data.offer_type,
        offer_name: data.offer_name,
        offer_value: data.offer_value ? parseFloat(data.offer_value) : undefined,
        offer_description: data.offer_description,
        reservation_required: data.reservation_required,
        offer_image_urls: data.offer_image_urls,
        offer_count: data.offer_count,
        delivery_method: data.delivery_method,
        pickup_location_name: data.pickup_location_name,
        pickup_location_address: data.pickup_location_address,
        pickup_lat: data.pickup_lat,
        pickup_lon: data.pickup_lon,
        story_include_instagram: data.story_include_instagram,
        story_include_atmosphere: data.story_include_atmosphere,
        story_include_product: data.story_include_product,
        story_instructions: data.story_instructions,
        auto_accept_influencers: data.auto_accept_influencers,
        tasks_stories_count: data.tasks_stories_count,
        tasks_include_post: data.tasks_include_post,
        tasks_ig_reel: data.tasks_ig_reel,
        tasks_ig_reel_duration: data.tasks_ig_reel_duration,
        tasks_ig_post: data.tasks_ig_post,
        tasks_ig_live: data.tasks_ig_live,
        tasks_ig_days_online: data.tasks_ig_days_online,
        tasks_tt_video: data.tasks_tt_video,
        tasks_tt_video_duration: data.tasks_tt_video_duration,
        tasks_tt_live: data.tasks_tt_live,
        tasks_tt_duet: data.tasks_tt_duet,
        tasks_tt_days_online: data.tasks_tt_days_online,
        tasks_yt_short: data.tasks_yt_short,
        tasks_yt_short_duration: data.tasks_yt_short_duration,
        tasks_yt_video: data.tasks_yt_video,
        tasks_yt_video_duration: data.tasks_yt_video_duration,
        tasks_yt_mention: data.tasks_yt_mention,
        tasks_yt_link_in_desc: data.tasks_yt_link_in_desc,
        tasks_fb_post: data.tasks_fb_post,
        tasks_fb_story: data.tasks_fb_story,
        tasks_fb_reel: data.tasks_fb_reel,
        tasks_fb_share: data.tasks_fb_share,
        promotion_link: data.promotion_link,
        promotion_link_placement: data.promotion_link_placement,
        required_hashtags: data.required_hashtags ? data.required_hashtags.split(/\s+/).filter(Boolean).map(h => h.replace(/^#/, '')) : [],
        required_caption: data.required_caption,
        content_tone: data.content_tone,
        key_messages: data.key_messages ? data.key_messages.split('\n').filter(Boolean) : [],
        forbidden_content: data.forbidden_content,
        min_days_online: data.min_days_online,
        min_followers_target: data.min_followers_target,
        elig_tiers: data.elig_tiers,
        elig_niches: data.elig_niches,
        platforms: derivePlatforms(data),
      }, draftId || undefined)
      if (result.success && result.campaignId) {
        setDraftId(result.campaignId)
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 3000)
        return true
      }
      setError(result.error || 'Eroare la salvare draft.')
      return false
    } catch (e: any) {
      setError(e.message || 'Eroare la salvare draft.')
      return false
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      let result: { success: boolean; error?: string; insufficientCredits?: boolean; savedAsDraft?: boolean; campaign?: any; campaignId?: string }

      if (draftId) {
        // Salvează întâi ultimele modificări (ex. număr de influenceri redus), apoi publică.
        // Dacă salvarea eșuează, NU publicăm (s-ar plăti pe datele vechi).
        const saved = await saveDraft()
        if (!saved) return
        result = await publishBarterDraft(draftId)
      } else {
        // Creare + publicare directă
        result = await createBarterCampaign({
        offer_type: data.offer_type!,
        offer_name: data.offer_name,
        offer_value: parseFloat(data.offer_value),
        offer_description: data.offer_description,
        reservation_required: data.reservation_required,
        offer_image_urls: data.offer_image_urls,
        offer_count: data.offer_count,
        delivery_method: data.delivery_method!,
        pickup_location_name: data.pickup_location_name,
        pickup_location_address: data.pickup_location_address,
        pickup_lat: data.pickup_lat,
        pickup_lon: data.pickup_lon,
        story_include_instagram: data.story_include_instagram,
        story_include_atmosphere: data.story_include_atmosphere,
        story_include_product: data.story_include_product,
        story_instructions: data.story_instructions,
        auto_accept_influencers: data.auto_accept_influencers,
        tasks_stories_count: data.tasks_stories_count,
        tasks_include_post: data.tasks_include_post,
        tasks_ig_reel: data.tasks_ig_reel,
        tasks_ig_reel_duration: data.tasks_ig_reel_duration,
        tasks_ig_post: data.tasks_ig_post,
        tasks_ig_live: data.tasks_ig_live,
        tasks_ig_days_online: data.tasks_ig_days_online,
        tasks_tiktok_video: data.tasks_tt_video,
        tasks_tt_video: data.tasks_tt_video,
        tasks_tt_video_duration: data.tasks_tt_video_duration,
        tasks_tt_live: data.tasks_tt_live,
        tasks_tt_duet: data.tasks_tt_duet,
        tasks_tt_days_online: data.tasks_tt_days_online,
        tasks_youtube_short: data.tasks_yt_short,
        tasks_yt_short: data.tasks_yt_short,
        tasks_yt_short_duration: data.tasks_yt_short_duration,
        tasks_youtube_video: data.tasks_yt_video,
        tasks_yt_video: data.tasks_yt_video,
        tasks_yt_video_duration: data.tasks_yt_video_duration,
        tasks_yt_mention: data.tasks_yt_mention,
        tasks_yt_link_in_desc: data.tasks_yt_link_in_desc,
        tasks_facebook_post: data.tasks_fb_post,
        tasks_fb_post: data.tasks_fb_post,
        tasks_facebook_story: data.tasks_fb_story,
        tasks_fb_story: data.tasks_fb_story,
        tasks_fb_reel: data.tasks_fb_reel,
        tasks_fb_share: data.tasks_fb_share,
        tasks_tiktok_count: 1,
        promotion_link: data.promotion_link,
        promotion_link_placement: data.promotion_link_placement,
        required_hashtags: data.required_hashtags ? data.required_hashtags.split(/\s+/).filter(Boolean).map(h => h.replace(/^#/, '')) : [],
        required_caption: data.required_caption,
        content_tone: data.content_tone,
        key_messages: data.key_messages ? data.key_messages.split('\n').filter(Boolean) : [],
        forbidden_content: data.forbidden_content,
        min_days_online: data.min_days_online,
        min_followers_target: data.min_followers_target,
        elig_tiers: data.elig_tiers,
        elig_niches: data.elig_niches,
        platforms: derivePlatforms(data),
        })
      }
      if (!result.success) {
        if ((result as any).savedAsDraft) {
          // Campania e salvată ca draft; nu pierdem munca brandului
          if ((result as any).campaignId) setDraftId((result as any).campaignId)
          setSavedDraftNotice(result.error || 'Sold insuficient. Campania a fost salvată ca draft.')
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        throw new Error(result.error)
      }
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Eroare la publicare.')
    } finally {
      setLoading(false)
    }
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="bu" style={{ minHeight: '70vh', justifyContent: 'center', alignItems: 'center' }}>
        <style>{BZ_CSS}</style>
        <div className="bu-card" style={{ padding: 32, maxWidth: 440, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 88, height: 88 }}>
            {/* Hourglass SVG */}
            <svg viewBox="0 0 96 120" className="w-full h-full">
              <rect x="12" y="4" width="72" height="16" rx="6" fill="#9FE1CB" />
              <rect x="12" y="100" width="72" height="16" rx="6" fill="#9FE1CB" />
              <path d="M20 20 L48 60 L76 20 Z" fill="#5DCAA5" opacity="0.7" />
              <path d="M20 100 L48 60 L76 100 Z" fill="#1D9E75" opacity="0.9" />
              <circle cx="48" cy="60" r="9" fill="#1D9E75" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26 }}>Oferta ta e în review!</h1>
          <p className="bu-muted" style={{ margin: 0, lineHeight: 1.6 }}>
            Echipa AddFame verifică campania înainte de a o face vizibilă influencerilor locali.
            Vei primi o notificare când e aprobată.
          </p>
          <button
            onClick={() => router.push('/brand/campaigns')}
            className="bu-btn p big"
            style={{ width: '100%', marginTop: 8 }}
          >
            Văd campaniile mele
          </button>
        </div>
      </div>
    )
  }

  const offerLabel = data.offer_type === 'product' ? 'Produs' : 'Serviciu'
  const activePlatforms = platformTabs.filter(p => p.active).map(p => p.label)
  const feeTotal = feeInfo ? data.offer_count * feeInfo.price : null
  const ronFmt = (n: number) => `${n.toLocaleString('ro-RO')} RON`

  return (
    <div className="bu">
      <style>{BZ_CSS}</style>

      {/* Header */}
      <div className="bu-head">
        <div className="bu-row" style={{ gap: 14 }}>
          <button
            type="button"
            aria-label="Înapoi"
            onClick={step === 0 ? () => router.back() : back}
            className="bu-btn"
            style={{ width: 44, height: 44, padding: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="bu-label" style={{ margin: 0 }}>Campanie nouă</p>
            <h1>Campanie Barter</h1>
            <p className="bu-muted bu-sm" style={{ margin: '4px 0 0' }}>Ofertă gratuită pentru influenceri locali</p>
          </div>
        </div>
      </div>

      <ProgressBar current={step} />

      {savedDraftNotice && (
        <div className="bz-note amber" style={{ flexDirection: 'column', padding: 16 }}>
          <b style={{ fontSize: 14 }}>💾 Campania a fost salvată ca draft</b>
          <span>{savedDraftNotice}</span>
          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <a href="/brand/wallet" className="bu-btn p">Adaugă credite</a>
            <a href="/brand/campaigns" className="bu-btn">Vezi campaniile mele</a>
          </div>
        </div>
      )}

      {error && (
        <div className="bz-note red" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span style={{ fontWeight: 600 }}>{error}</span>
        </div>
      )}

      <div className="bz-layout">
        <div className="bz-main">

        {/* ── STEP 0: Tip ofertă ──────────────────────────────────── */}
        {step === 0 && (
          <Section badge={1} title="Ce oferi gratuit influencerilor locali?" sub="Alege tipul ofertei tale">
            <div className="bz-f" style={{ gap: 12 }}>
              <OptionCard selected={data.offer_type === 'product'} onClick={() => set({ offer_type: 'product' })}>
                <span className="bz-emoji">🍕</span>
                <div>
                  <b style={{ fontSize: 16 }}>Free Product</b>
                  <small>cafea, pizza, burger, cocktail, etc.</small>
                </div>
                {data.offer_type === 'product' && <Tick />}
              </OptionCard>
              <OptionCard selected={data.offer_type === 'service'} onClick={() => set({ offer_type: 'service' })}>
                <span className="bz-emoji">✂️</span>
                <div>
                  <b style={{ fontSize: 16 }}>Free Service</b>
                  <small>gym, frizerie, salon de înfrumusețare, etc.</small>
                </div>
                {data.offer_type === 'service' && <Tick />}
              </OptionCard>
            </div>
          </Section>
        )}

        {/* ── STEP 1: Name & Value ────────────────────────────────── */}
        {step === 1 && (
          <Section badge={2} title={`Ce ${offerLabel.toLowerCase()} oferi?`} sub="Completează detaliile ofertei">
            <div className="bz-f">
              <label>Numele {data.offer_type === 'product' ? 'produsului' : 'serviciului'} *</label>
              <input
                type="text"
                placeholder={data.offer_type === 'product' ? 'ex. Meniu Dublu Quesadilla' : 'ex. Abonament sala lunar'}
                value={data.offer_name}
                onChange={e => set({ offer_name: e.target.value })}
                maxLength={100}
                className="bz-input"
              />
            </div>
            <div className="bz-f">
              <label>Valoarea {data.offer_type === 'product' ? 'produsului' : 'serviciului'} (RON) *</label>
              <div className="bz-adorn">
                <span className="l">RON</span>
                <input
                  type="number"
                  placeholder="ex: 200"
                  value={data.offer_value}
                  onChange={e => set({ offer_value: e.target.value })}
                  min="1"
                  className="bz-input pl"
                />
              </div>
              {data.offer_value && !(parseFloat(data.offer_value) > 0) && (
                <p className="bz-hint" style={{ color: '#b42318', fontWeight: 700 }}>Introdu o valoare numerică (ex: 200). Nu se acceptă intervale.</p>
              )}
            </div>
            <div className="bz-f">
              <label>Descriere <small>(opțional)</small></label>
              <textarea
                placeholder={`ex. ${data.offer_type === 'product' ? 'One of the best quesadilla in town 🌮' : 'Timp de 30 de zile ești invitatul nostru 😊'}`}
                value={data.offer_description}
                onChange={e => set({ offer_description: e.target.value })}
                rows={6}
                maxLength={1000}
                className="bz-input"
              />
            </div>

            <div className="bz-f">
              <p className="bz-lbl" style={{ margin: 0 }}>Influencerul trebuie să sune pentru rezervare?</p>
              <div className="bz-grid2 keep">
                <OptionCard center selected={!data.reservation_required} onClick={() => set({ reservation_required: false })}>
                  <b>Nu, nu e nevoie</b>
                  <small>Vine direct</small>
                </OptionCard>
                <OptionCard center selected={data.reservation_required} onClick={() => set({ reservation_required: true })}>
                  <b>Da, sună întâi</b>
                  <small>Rezervare necesară</small>
                </OptionCard>
              </div>
            </div>

            {/* Durata campaniei */}
            <div className="bz-f">
              <p className="bz-lbl" style={{ margin: 0 }}>Durata campaniei *</p>
              <p className="bz-hint">Câte zile rulează campania de la aprobare</p>
              <div className="bz-adorn">
                <input
                  type="number"
                  min="7"
                  max="365"
                  placeholder="ex. 30"
                  value={data.duration_days || ''}
                  onChange={e => {
                    const days = parseInt(e.target.value)
                    if (days > 0) {
                      const deadline = new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
                      set({ duration_days: days, deadline })
                    } else {
                      set({ duration_days: undefined, deadline: '' })
                    }
                  }}
                  className="bz-input pr"
                />
                <span className="r">zile</span>
              </div>
              {/* Sugestii rapide */}
              <div className="bz-chips">
                {[14, 30, 60, 90].map(d => (
                  <button key={d} type="button"
                    onClick={() => {
                      const deadline = new Date(Date.now() + d * 86400000).toISOString().split('T')[0]
                      set({ duration_days: d, deadline })
                    }}
                    className={`bz-chipb${data.duration_days === d ? ' on' : ''}`}>
                    {d} zile
                  </button>
                ))}
              </div>
              {data.deadline && (
                <p className="bz-hint" style={{ color: '#14532d', fontWeight: 700 }}>
                  ✓ Campania se încheie pe {new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ── STEP 2: Photo & Number ──────────────────────────────── */}
        {step === 2 && (
          <>
            <Section badge={3} title="Imagini" sub="Adaugă imagini cu oferta ta (opțional)">
              <div className="bz-f">
                <label>Imaginea {data.offer_type === 'product' ? 'produsului' : 'serviciului'}</label>
                <MultiImageUploader values={data.offer_image_urls} onChange={urls => set({ offer_image_urls: urls })} />
              </div>
            </Section>
            <Section badge={<Users className="w-4 h-4" />} title="Număr de influenceri" sub="Odată atins numărul, oferta se închide automat">
              <InfluencerSlotsSelector
                value={data.offer_count}
                onChange={v => set({ offer_count: v })}
                min={1}
                max={500}
                label={`La câți influenceri vrei să dai ${data.offer_type === 'product' ? 'acest produs' : 'acest serviciu'} gratuit?`}
                onInfo={setFeeInfo}
              />
            </Section>
          </>
        )}

        {/* ── STEP 3: Location ────────────────────────────────────── */}
        {step === 3 && (
          <Section badge={4} title="Cum va primi influencerul oferta?" sub="Alege modul de livrare">
            <div className="bz-f" style={{ gap: 12 }}>
              <OptionCard
                selected={data.delivery_method === 'delivery'}
                onClick={() => set({ delivery_method: 'delivery' })}
              >
                <span className="bz-emoji">🚚</span>
                <div>
                  <b>Livrare la domiciliul influencerului</b>
                  <small>Tu trimiți produsul la adresa lor</small>
                </div>
                {data.delivery_method === 'delivery' && <Tick />}
              </OptionCard>
              <OptionCard
                selected={data.delivery_method === 'pickup'}
                onClick={() => { set({ delivery_method: 'pickup' }); loadBrandLocations() }}
              >
                <span className="bz-emoji">📍</span>
                <div>
                  <b>Ridicare personală din locația noastră</b>
                  <small>Influencerul vine la tine</small>
                </div>
                {data.delivery_method === 'pickup' && <Tick />}
              </OptionCard>
            </div>

            {data.delivery_method === 'pickup' && (
              <div className="bz-f animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ gap: 12 }}>
                <p className="bz-lbl" style={{ margin: 0 }}>De unde va ridica influencerul oferta?</p>
                <LocationPicker
                  name={data.pickup_location_name}
                  address={data.pickup_location_address}
                  onSelect={(name, address, lat, lon) => set({ pickup_location_name: name, pickup_location_address: address, pickup_lat: lat, pickup_lon: lon })}
                />
              </div>
            )}
          </Section>
        )}

        {/* ── STEP 4: Details / Brief ─────────────────────────────── */}
        {step === 4 && (
          <Section badge={5} title="Ce vrei să includă influencerul în stories?" sub="Brief-ul campaniei">
            <div className="bz-f" style={{ gap: 10 }}>
              <CheckRow
                checked={data.story_include_instagram}
                onChange={v => set({ story_include_instagram: v })}
                icon={Instagram}
                label="Instagram-ul nostru"
                sub="Menționează @handle-ul brandului"
              />
              <CheckRow
                checked={data.story_include_atmosphere}
                onChange={v => set({ story_include_atmosphere: v })}
                icon={Camera}
                label="Atmosfera locului"
                sub="Prezintă spațiul / ambianța"
              />
              <CheckRow
                checked={data.story_include_product}
                onChange={v => set({ story_include_product: v })}
                icon={Gift}
                label={`${offerLabel}ul oferit`}
                sub={`Prezintă ${data.offer_type === 'product' ? 'produsul' : 'serviciul'} gratuit primit`}
              />
            </div>

            <div className="bz-f">
              <label>Instrucțiuni suplimentare <small>(opțional)</small></label>
              <textarea
                placeholder="ex. Vreau să vorbești despre site-ul nostru, să menționezi că avem reducere 20% săptămâna asta..."
                value={data.story_instructions}
                onChange={e => set({ story_instructions: e.target.value })}
                rows={6}
                maxLength={2000}
                className="bz-input"
              />
            </div>

            <div className="bz-f">
              <p className="bz-lbl" style={{ margin: 0 }}>Influencerii pot accepta oferta imediat?</p>
              <div className="bz-grid2 keep">
                <OptionCard center selected={data.auto_accept_influencers} onClick={() => set({ auto_accept_influencers: true })}>
                  <span style={{ fontSize: 22 }}>👍</span>
                  <b>Da, sigur!</b>
                  <small>Accept automat toți</small>
                </OptionCard>
                <OptionCard center selected={!data.auto_accept_influencers} onClick={() => set({ auto_accept_influencers: false })}>
                  <span style={{ fontSize: 22 }}>👎</span>
                  <b>Nu, verific eu</b>
                  <small>Aprob manual fiecare</small>
                </OptionCard>
              </div>
            </div>
          </Section>
        )}

        {/* ── STEP 5: Tasks ───────────────────────────────────────── */}
        {step === 5 && (
          <Section badge={6} title="Ce trebuie să creeze influencerul?" sub="Selectează platforma și tipul de conținut">
            {/* Tab-uri platforme */}
            <div className="bz-plat">
              {platformTabs.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={activeTab === p.id ? 'on' : ''}>
                  {p.active && <em><Check className="w-2.5 h-2.5" /></em>}
                  <i style={{ background: p.bg }}>{p.icon}</i>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="bz-f" style={{ gap: 10 }}>

              {/* ── INSTAGRAM ── */}
              {activeTab === 'instagram' && (<>
                {[
                  { key: 'tasks_stories_count', label: 'Instagram Stories', desc: 'Stories de 24h', counter: true },
                  { key: 'tasks_ig_reel', label: 'Instagram Reel', desc: 'Video scurt în feed', duration: 'tasks_ig_reel_duration', durationLabel: 'sec. minim' },
                  { key: 'tasks_ig_post', label: 'Post Feed (foto/carousel)', desc: 'Postare permanentă în feed' },
                  { key: 'tasks_ig_live', label: 'Instagram Live', desc: 'Live stream cu brandul' },
                ].map(task => {
                  const on = task.counter ? data.tasks_stories_count > 0 : (data as any)[task.key]
                  return (
                    <TaskTile key={task.key} on={!!on} label={task.label} desc={task.desc}
                      onClick={() => task.counter
                        ? set({ tasks_stories_count: data.tasks_stories_count > 0 ? 0 : 2 })
                        : set({ [task.key]: !(data as any)[task.key] } as any)}>
                      {task.counter && data.tasks_stories_count > 0 && (
                        <div style={{ padding: '0 16px 16px' }}>
                          <p className="bz-hint" style={{ textAlign: 'center', marginBottom: 10 }}>Câte stories?</p>
                          <Counter value={data.tasks_stories_count} onChange={v => set({ tasks_stories_count: v })} min={1} max={10} />
                        </div>
                      )}
                      {task.duration && (data as any)[task.key] && (
                        <div className="bz-task-x">
                          <span>{task.durationLabel}</span>
                          <input type="number" min="5" value={(data as any)[task.duration]}
                            onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                            className="bz-input" />
                          <span>secunde</span>
                        </div>
                      )}
                    </TaskTile>
                  )
                })}
                <div className="bz-sub">
                  <p className="bz-lbl" style={{ margin: 0 }}>Postarea rămâne online minim</p>
                  <div className="bz-chips">
                    {[7, 14, 30, 60, 90].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ tasks_ig_days_online: d })}
                        className={`bz-chipb${data.tasks_ig_days_online === d ? ' on' : ''}`}>
                        {d} zile
                      </button>
                    ))}
                  </div>
                </div>
              </>)}

              {/* ── TIKTOK ── */}
              {activeTab === 'tiktok' && (<>
                {[
                  { key: 'tasks_tt_video', label: 'TikTok Video', desc: 'Video pe profil', duration: 'tasks_tt_video_duration', durationLabel: 'sec. minim' },
                  { key: 'tasks_tt_live', label: 'TikTok Live', desc: 'Live stream', duration: undefined },
                  { key: 'tasks_tt_duet', label: 'Duet / Stitch', desc: 'Duet cu videoul brandului', duration: undefined },
                ].map(task => (
                  <TaskTile key={task.key} on={!!(data as any)[task.key]} label={task.label} desc={task.desc}
                    onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)}>
                    {task.duration && (data as any)[task.key] && (
                      <div className="bz-task-x">
                        <span>{task.durationLabel}</span>
                        <input type="number" min="5" value={(data as any)[task.duration]}
                          onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                          className="bz-input" />
                        <span>secunde</span>
                      </div>
                    )}
                  </TaskTile>
                ))}
                <div className="bz-sub">
                  <p className="bz-lbl" style={{ margin: 0 }}>Videoul rămâne pe profil minim</p>
                  <div className="bz-chips">
                    {[7, 14, 30, 60].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ tasks_tt_days_online: d })}
                        className={`bz-chipb${data.tasks_tt_days_online === d ? ' on' : ''}`}>
                        {d} zile
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => set({ tasks_tt_days_online: 9999 })}
                      className={`bz-chipb${data.tasks_tt_days_online === 9999 ? ' on' : ''}`}>
                      permanent
                    </button>
                  </div>
                </div>
              </>)}

              {/* ── YOUTUBE ── */}
              {activeTab === 'youtube' && (<>
                {[
                  { key: 'tasks_yt_short', label: 'YouTube Short', desc: 'Video scurt max 60 sec', duration: 'tasks_yt_short_duration', durationLabel: 'sec. minim' },
                  { key: 'tasks_yt_video', label: 'Video lung dedicat', desc: 'Video dedicat brandului', duration: 'tasks_yt_video_duration', durationLabel: 'min. minim' },
                  { key: 'tasks_yt_mention', label: 'Mențiune în video existent', desc: 'Câteva secunde în alt video', duration: undefined },
                ].map(task => (
                  <TaskTile key={task.key} on={!!(data as any)[task.key]} label={task.label} desc={task.desc}
                    onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)}>
                    {task.duration && (data as any)[task.key] && (
                      <div className="bz-task-x">
                        <span>{task.durationLabel}</span>
                        <input type="number" min="1" value={(data as any)[task.duration]}
                          onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                          className="bz-input" />
                      </div>
                    )}
                  </TaskTile>
                ))}
                <TaskTile on={data.tasks_yt_link_in_desc} label="Link în descrierea video obligatoriu"
                  onClick={() => set({ tasks_yt_link_in_desc: !data.tasks_yt_link_in_desc })} />
              </>)}

              {/* ── FACEBOOK ── */}
              {activeTab === 'facebook' && (<>
                {[
                  { key: 'tasks_fb_post', label: 'Post pe pagina personală', desc: 'Postare în feed' },
                  { key: 'tasks_fb_story', label: 'Facebook Story', desc: 'Story de 24h' },
                  { key: 'tasks_fb_reel', label: 'Facebook Reel', desc: 'Video scurt' },
                  { key: 'tasks_fb_share', label: 'Share postarea brandului', desc: 'Redistribuire' },
                ].map(task => (
                  <TaskTile key={task.key} on={!!(data as any)[task.key]} label={task.label} desc={task.desc}
                    onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)} />
                ))}
              </>)}

            </div>
          </Section>
        )}

        {/* ── STEP 6: Brief & Link ──────────────────────────────────────────── */}
        {step === 6 && (
          <Section badge={7} title="Brief, link & hashtag-uri" sub="Spune influencerilor exact cum să prezinte brandul">

            {/* Link promovare */}
            <div className="bz-note green" style={{ flexDirection: 'column', padding: 16, gap: 8 }}>
              <b style={{ fontSize: 14 }}>Link de promovat</b>
              <span>Influencerul va adăuga acest link în bio / stories</span>
              <input type="url" placeholder="https://site.ro/produs"
                value={data.promotion_link}
                onChange={e => set({ promotion_link: e.target.value })}
                className="bz-input" style={{ borderColor: '#a7e3cc' }} />
              <div className="bz-f" style={{ gap: 8, marginTop: 4 }}>
                {[
                  { key: 'bio', label: 'Adaugă în bio pe durata campaniei' },
                  { key: 'swipeup', label: 'Swipe-up în Stories' },
                  { key: 'verbal', label: 'Menționat verbal în video' },
                  { key: 'description', label: 'Link în descrierea video (YouTube)' },
                ].map(opt => {
                  const on = data.promotion_link_placement.includes(opt.key)
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        const cur = data.promotion_link_placement
                        set({ promotion_link_placement: cur.includes(opt.key) ? cur.filter(x => x !== opt.key) : [...cur, opt.key] })
                      }}
                      className="bu-row" style={{ gap: 10, minHeight: 44, background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left', fontWeight: on ? 700 : 500 }}>
                      <span className="bz-box" style={on ? { background: '#16a34a', borderColor: '#16a34a' } : { borderColor: '#a7e3cc' }}>
                        {on && <Check className="w-3.5 h-3.5" />}
                      </span>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AI Brief Generator */}
            <AIBriefGenerator
              offerName={data.offer_name}
              offerValue={data.offer_value}
              offerDescription={data.offer_description}
              platforms={derivePlatforms(data)}
              campaignType="BARTER"
              onApply={(brief) => {
                if (brief.story_instructions) set({ story_instructions: brief.story_instructions })
                if (brief.required_hashtags) set({ required_hashtags: brief.required_hashtags })
                if (brief.required_caption) set({ required_caption: brief.required_caption })
                if (brief.key_messages) set({ key_messages: Array.isArray(brief.key_messages) ? brief.key_messages.join('\n') : brief.key_messages })
                if (brief.forbidden_content) set({ forbidden_content: brief.forbidden_content })
                if (brief.content_tone) set({ content_tone: brief.content_tone })
              }}
            />

            {/* Hashtag-uri */}
            <div className="bz-f">
              <label>Hashtag-uri obligatorii <small>(separat prin spațiu)</small></label>
              <input type="text" placeholder="#brand #produs #ad"
                value={data.required_hashtags}
                onChange={e => set({ required_hashtags: e.target.value })}
                className="bz-input" />
            </div>

            {/* Caption */}
            <div className="bz-f">
              <label>Caption obligatoriu <small>(opțional)</small></label>
              <textarea rows={3} placeholder='ex: "Parteneriat cu @brand. Am primit produsul în schimbul unei recenzii oneste."'
                value={data.required_caption}
                onChange={e => set({ required_caption: e.target.value })}
                className="bz-input" />
            </div>

            {/* Ton continut */}
            <div className="bz-f">
              <label>Tonul conținutului</label>
              <div className="bz-chips">
                {['Autentic', 'Distractiv', 'Educational', 'Lifestyle', 'Profesional', 'Inspirational'].map(tone => (
                  <button key={tone} type="button"
                    onClick={() => {
                      const cur = data.content_tone
                      set({ content_tone: cur.includes(tone) ? cur.filter(x => x !== tone) : [...cur, tone] })
                    }}
                    className={`bz-chipb${data.content_tone.includes(tone) ? ' on' : ''}`}>
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructiuni */}
            <div className="bz-f">
              <label>Instrucțiuni de creare conținut</label>
              <textarea rows={5} placeholder="ex: Arată cum folosești produsul în rutina zilnică. Filmează în lumină naturală. Menționează cele 3 beneficii: X, Y, Z..."
                value={data.story_instructions}
                onChange={e => set({ story_instructions: e.target.value })}
                maxLength={2000}
                className="bz-input" />
            </div>

            {/* Mesaje cheie */}
            <div className="bz-f">
              <label>Mesaje cheie de transmis <small>(opțional)</small></label>
              <textarea rows={3} placeholder="ex: Rezultate vizibile din prima săptămână. Formula cu 15% Vitamina C. Disponibil pe site.ro cu livrare în 24h."
                value={data.key_messages}
                onChange={e => set({ key_messages: e.target.value })}
                className="bz-input" />
            </div>

            {/* Ce sa evite */}
            <div className="bz-f">
              <label>Ce să evite <small>(opțional)</small></label>
              <textarea rows={2} placeholder="ex: Nu menționa competitorii. Evită filtrele puternice. Nu face promisiuni medicale."
                value={data.forbidden_content}
                onChange={e => set({ forbidden_content: e.target.value })}
                className="bz-input" />
            </div>

            {/* Zile online */}
            <div className="bz-f">
              <label>Postarea rămâne online minim</label>
              <div className="bz-chips">
                {[7, 14, 30, 60, 90].map(d => (
                  <button key={d} type="button"
                    onClick={() => set({ min_days_online: d })}
                    className={`bz-chipb${data.min_days_online === d ? ' on' : ''}`}>
                    {d} zile
                  </button>
                ))}
              </div>
            </div>

          </Section>
        )}

        {/* ── STEP 6: Target ──────────────────────────────────────── */}
        {step === 6 && (
          <Section badge={<Target className="w-4 h-4" />} title="Target influenceri" sub="Cine va putea vedea și aplica la oferta ta">
            <div className="bz-note green" style={{ alignItems: 'center', padding: 18, gap: 14 }}>
              <span className="bu-ico" style={{ background: '#fff', color: '#14532d' }}><Users className="w-5 h-5" /></span>
              <div>
                <b style={{ fontSize: 15 }}>
                  🎯 {countLoading && influencerCount === null ? 'Se numără…' : influencerCount === null ? 'Creatori eligibili' : `Ajungi la ${influencerCount} ${influencerCount === 1 ? 'creator' : 'creatori'}`}
                </b>
                <p style={{ margin: '4px 0 0' }}>
                  {data.elig_tiers.length === 0 && data.elig_niches.length === 0
                    ? <>Fără restricții: oferta e vizibilă tuturor creatorilor aprobați{networkTotal ? <> (<strong>{networkTotal}</strong>)</> : null}. Ei aplică, tu alegi cu cine colaborezi.</>
                    : <>Doar creatorii care se potrivesc cu alegerile de mai jos vor vedea oferta și vor putea aplica.</>}
                </p>
              </div>
            </div>

            <div className="bz-f">
              <label className="bz-lbl">Categorie creator <span style={{ fontWeight: 500, color: '#6a6690' }}>(după urmăritori; nimic bifat = toate)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TIERS.map(t => {
                  const on = data.elig_tiers.includes(t.key)
                  return (
                    <button key={t.key} type="button" onClick={() => toggleElig('elig_tiers', t.key)}
                      aria-pressed={on}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999,
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        background: on ? t.bg : '#fff', color: on ? t.fg : '#14123a',
                        border: `2px solid ${on ? t.dot : '#e5e3f3'}`,
                      }}>
                      <span style={{ width: 9, height: 9, borderRadius: 99, background: t.dot }} />
                      {t.label}
                      {tierCounts[t.key] > 0 && <span style={{ fontWeight: 600, opacity: .7 }}>{tierCounts[t.key]}</span>}
                      {on && <Check className="w-3.5 h-3.5" />}
                    </button>
                  )
                })}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6a6690' }}>
                Creatorii fără date de urmăritori nu pot aplica dacă alegi categorii.
              </p>
            </div>

            <div className="bz-f">
              <label className="bz-lbl">Nișe <span style={{ fontWeight: 500, color: '#6a6690' }}>(nimic bifat = toate)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INFLUENCER_NICHES.map((n: string) => {
                  const on = data.elig_niches.includes(n)
                  return (
                    <button key={n} type="button" onClick={() => toggleElig('elig_niches', n)}
                      aria-pressed={on}
                      style={{
                        padding: '7px 13px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        background: on ? '#efeaff' : '#fff', color: on ? '#4423c4' : '#14123a',
                        border: `2px solid ${on ? '#5a35e6' : '#e5e3f3'}`,
                      }}>
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bz-f">
              <label className="bz-lbl">Followeri minimi <span style={{ fontWeight: 500, color: '#6a6690' }}>(Instagram + TikTok verificate)</span></label>
              <input type="number" min={0} step={100} className="bz-input" value={data.min_followers_target}
                onChange={e => setData(d => ({ ...d, min_followers_target: Math.max(0, parseInt(e.target.value || '0', 10) || 0) }))} />
            </div>
          </Section>
        )}

        {/* ── STEP 7: Review ──────────────────────────────────────── */}
        {step === 7 && (
          <Section badge={<CheckCircle2 className="w-4 h-4" />} title="Review & Publică" sub="Verifică totul înainte de a trimite spre aprobare">

            {data.offer_image_urls.length > 0 && (
              <div className="bz-f">
                <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
                  <img src={data.offer_image_urls[0]} alt="Offer" style={{ width: '100%', height: 176, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
                    <span className="bu-chip" style={{ background: '#5a35e6', color: '#fff', textTransform: 'uppercase', letterSpacing: '.05em' }}>Gratuit</span>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, maxWidth: '60%', background: 'rgba(20,18,58,.72)', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 10 }}>{data.offer_name}</div>
                </div>
                {data.offer_image_urls.length > 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {data.offer_image_urls.slice(1).map((url, idx) => (
                      <img key={idx} src={url} alt={`Imagine ${idx + 2}`} style={{ width: '100%', height: 64, objectFit: 'cover', borderRadius: 12, border: '1px solid #e5e3f3' }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bz-rv">
              <h3>Detalii ofertă</h3>
              <ReviewField label="Tip ofertă" value={data.offer_type === 'product' ? 'Free Product' : 'Free Service'} />
              <ReviewField label={data.offer_type === 'product' ? 'Produs' : 'Serviciu'} value={data.offer_name} />
              {data.offer_description && <ReviewField label="Descriere" value={data.offer_description} />}
              <ReviewField label="Valoare" value={`${data.offer_value} RON`} />
              <ReviewField label="Nr. influenceri" value={String(data.offer_count)} />
              <ReviewField label="Rezervare" value={data.reservation_required ? 'Necesară' : 'Nu e necesară'} />
              <ReviewField label="Durata campaniei" value={data.duration_days ? `${data.duration_days} zile (până pe ${new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })})` : 'Nesetată'} />
            </div>

            <div className="bz-rv">
              <h3>Logistică & Brief</h3>
              <ReviewField
                label="Ridicare ofertă"
                value={data.delivery_method === 'pickup'
                  ? `Ridicare: ${data.pickup_location_name}`
                  : 'Livrare la domiciliu'}
              />
              <ReviewField
                label="Stories solicitate"
                value={`${data.tasks_stories_count} Instagram Stor${data.tasks_stories_count > 1 ? 'ies' : 'y'}${data.tasks_include_post ? ' + 1 Post' : ''}`}
              />
              <ReviewField label="Accept influenceri" value={data.auto_accept_influencers ? 'Automat' : 'Manual (eu aprob)'} />
              <ReviewField label="Categorii creatori" value={data.elig_tiers.length ? data.elig_tiers.map(k => TIERS.find(t => t.key === k)?.label || k).join(', ') : 'Toate'} />
              <ReviewField label="Nișe" value={data.elig_niches.length ? data.elig_niches.join(', ') : 'Toate'} />
              <ReviewField
                label="Followeri minimi"
                value={data.min_followers_target === 0 ? 'Fără restricții' : `${data.min_followers_target.toLocaleString()}+`}
              />
            </div>

            {/* Taxa AddFame per influencer */}
            <div className="bz-note amber" style={{ alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>Taxă AddFame</b>
                <p style={{ margin: '2px 0 0', fontSize: 12 }}>
                  {feeInfo
                    ? `${data.offer_count} influenceri × ${feeInfo.price.toLocaleString('ro-RO')} RON · se plătește la publicare`
                    : 'Se plătește la publicare'}
                </p>
                {feeInfo && !feeInfo.enough && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 700 }}>
                    Sold insuficient — campania se va salva ca draft.{' '}
                    <a href="/brand/wallet" className="bz-lnk">Adaugă credite</a>
                  </p>
                )}
              </div>
              <b style={{ fontFamily: 'var(--font-display, system-ui)', fontSize: 24, whiteSpace: 'nowrap' }}>
                {feeTotal !== null ? ronFmt(feeTotal) : '…'}
              </b>
            </div>

            <p className="bz-hint" style={{ textAlign: 'center' }}>
              Prin publicare accepți{' '}
              <a href="/termeni" target="_blank" rel="noopener noreferrer" style={{ color: '#5a35e6', textDecoration: 'underline' }}>Termenii Serviciului</a>
              {' '}și{' '}
              <a href="/politica-de-confidentialitate" target="_blank" rel="noopener noreferrer" style={{ color: '#5a35e6', textDecoration: 'underline' }}>Politica de confidențialitate</a>.
            </p>
          </Section>
        )}

        {/* ── Bară de acțiuni (sticky) ────────────────────────────────────── */}
        <div className="bz-foot">
          <button type="button" className="bu-btn" onClick={step === 0 ? () => router.back() : back}>
            <ArrowLeft className="w-4 h-4" />Înapoi
          </button>
          <div className="grp">
            <button
              type="button"
              onClick={saveDraft}
              disabled={savingDraft}
              className={`bu-btn${draftSaved ? ' ok' : ''}`}
            >
              {savingDraft
                ? <><Loader2 className="w-4 h-4 animate-spin" />Se salvează...</>
                : draftSaved
                  ? <>✓ Draft salvat!</>
                  : <>Salvează draft</>
              }
            </button>
            {step < 7 ? (
              <button type="button" onClick={next} disabled={!canProceed()} className="bu-btn p">
                Continuă
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading} className="bu-btn p">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Se publică...</>
                  : <><Zap className="w-4 h-4" />{feeInfo && !feeInfo.enough ? 'Salvează ca draft (sold insuficient)' : feeInfo ? `Publică · ${(data.offer_count * feeInfo.price).toLocaleString('ro-RO')} RON` : 'Publică oferta'}</>
                }
              </button>
            )}
          </div>
        </div>

        </div>

        {/* ── Rezumat (coloană dreapta, desktop) ──────────────────────────── */}
        <div className="bz-side">
          <div className="bu-card bz-sum">
            <p className="bu-label" style={{ margin: 0 }}>Rezumat</p>
            <h3 style={{ marginBottom: 6 }}>{data.offer_name || 'Campania ta barter'}</h3>
            <ReviewField label="Tip campanie" value="Barter" />
            <ReviewField label="Ofertă" value={data.offer_type ? (data.offer_type === 'product' ? 'Free Product' : 'Free Service') : '—'} />
            <ReviewField label="Valoare" value={parseFloat(data.offer_value) > 0 ? `${data.offer_value} RON` : '—'} />
            <ReviewField label="Locuri (influenceri)" value={String(data.offer_count)} />
            <ReviewField label="Livrare" value={data.delivery_method ? (data.delivery_method === 'pickup' ? 'Ridicare' : 'La domiciliu') : '—'} />
            <ReviewField label="Durată" value={data.duration_days ? `${data.duration_days} zile` : '—'} />
            <ReviewField label="Platforme" value={activePlatforms.length ? activePlatforms.join(', ') : '—'} />
            <div className="bz-sum-fee">
              <div>
                <b style={{ fontSize: 13, fontFamily: 'inherit' }}>Taxă AddFame</b>
                <div style={{ fontSize: 12 }}>
                  {feeInfo ? `${data.offer_count} × ${feeInfo.price.toLocaleString('ro-RO')} RON` : 'se plătește la publicare'}
                </div>
              </div>
              <b>{feeTotal !== null ? ronFmt(feeTotal) : '…'}</b>
            </div>
            {feeInfo && !feeInfo.enough && (
              <p className="bz-hint" style={{ color: '#9a4206', fontWeight: 700, marginTop: 8 }}>Sold insuficient — se salvează ca draft.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
