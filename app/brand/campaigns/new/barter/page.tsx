'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBarterCampaign } from '@/app/actions/barter-campaigns'
import { AIBriefGenerator } from '@/components/shared/AIBriefGenerator'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
  Gift, Wrench, Camera, MapPin, FileText, Target,
  CheckCircle2, Upload, X, Minus, Plus, Clock,
  Instagram, Zap, Users,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// ─── Types ───────────────────────────────────────────────────────────────────

type OfferType = 'product' | 'service'
type DeliveryMethod = 'pickup' | 'delivery'

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
  // Coordonate GPS locație pickup
  pickup_lat?: number
  pickup_lon?: number
  duration_days?: number
  deadline?: string
}

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
    <div className="mb-8">
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
              ${i < current ? 'bg-primary text-primary-foreground' : i === current ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}
            `}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 transition-all ${i < current ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center font-medium">
        Pasul {current + 1} din {STEPS.length} — <span className="text-foreground">{STEPS[current]?.label}</span>
      </p>
    </div>
  )
}

// ─── Option card ─────────────────────────────────────────────────────────────

function OptionCard({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full p-5 rounded-2xl border-2 text-left transition-all
        ${selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'
        }
      `}
    >
      {children}
    </button>
  )
}

// ─── Counter ─────────────────────────────────────────────────────────────────

function Counter({ value, onChange, min = 1, max = 100 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-4xl font-black text-primary w-16 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
      >
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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        w-full flex items-center gap-3 p-3.5 rounded-xl border transition text-left
        ${checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/20 hover:bg-muted/20'}
      `}
    >
      <div className={`
        w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition
        ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'}
      `}>
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </button>
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
    <div className="space-y-3">
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((url, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden border border-border aspect-square">
              <img src={url} alt={`Imagine ${idx + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange(values.filter((_, i) => i !== idx))}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition">
                <X className="w-3 h-3" />
              </button>
              {idx === 0 && <span className="absolute bottom-1.5 left-1.5 text-[10px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Principală</span>}
            </div>
          ))}
          {values.length < 5 && (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition flex flex-col items-center justify-center gap-1 text-muted-foreground">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <><Plus className="w-5 h-5" /><span className="text-[10px] font-medium">{5 - values.length} rămase</span></>}
            </button>
          )}
        </div>
      )}
      {values.length === 0 && (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="w-full h-48 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition flex flex-col items-center justify-center gap-3 text-muted-foreground">
          {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <><Upload className="w-8 h-8" /><p className="text-sm font-medium">Click pentru upload</p><p className="text-xs">JPG, PNG · max 5MB · până la 5 imagini</p></>}
        </button>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      <p className="text-xs text-muted-foreground">{values.length}/5 imagini · Prima imagine va fi cea principală</p>
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
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-primary bg-primary/5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{address}</p>
          </div>
          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setQuery(''); onSelect('', ''); setShowResults(false) }}
          className="text-xs text-primary underline"
        >
          Schimbă locația
        </button>
      </div>
    )
  }

  if (manualMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-muted-foreground">Completează manual</p>
          <button type="button" onClick={() => setManualMode(false)} className="text-xs text-primary underline">
            ← Înapoi la căutare
          </button>
        </div>
        <input
          type="text"
          placeholder="Numele locației (ex. Salon TopFace)"
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="text"
          placeholder="Adresa completă (ex. Str. Națională nr. 5, Iași)"
          value={manualAddress}
          onChange={e => setManualAddress(e.target.value)}
          className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={handleManualSave}
          disabled={!manualName.trim() || !manualAddress.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
        >
          Confirmă locația
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      {/* Search input */}
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Caută afacerea ta (ex. Salon TopFace Iași)..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-full pl-10 pr-10 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {query && !searching && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setShowResults(false) }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden mt-1">
          {results.map(r => {
            const a = r.address
            const city = a.city || a.town || a.village || ''
            const street = [a.road, a.house_number].filter(Boolean).join(' ')
            return (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition text-left border-b border-border last:border-0"
              >
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{r.name || street || r.display_name.split(',')[0]}</p>
                  <p className="text-xs text-muted-foreground truncate">
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
          className="text-xs text-primary underline"
        >
          Nu găsesc afacerea mea → completez manual
        </button>
      )}

      <p className="text-xs text-muted-foreground">
        Powered by OpenStreetMap · caută în română pentru rezultate mai bune
      </p>
    </div>
  )
}



function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground flex-shrink-0 mr-4">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
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
  pickup_lat: undefined,
  pickup_lon: undefined,
}

export default function BarterCampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [activeTab, setActiveTab] = useState('instagram')
  const [influencerCount, setInfluencerCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  // Fetch influencer count când se schimbă min_followers_target (step 6)
  useEffect(() => {
    if (step !== 6) return
    setCountLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/influencer-count?min_followers=${data.min_followers_target}`)
        const json = await res.json()
        setInfluencerCount(json.count ?? 0)
      } catch { setInfluencerCount(null) }
      finally { setCountLoading(false) }
    }, 400)
    return () => clearTimeout(timer)
  }, [data.min_followers_target, step])

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

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await createBarterCampaign({
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
        platforms: [
          ...(data.tasks_stories_count > 0 || data.tasks_ig_reel || data.tasks_ig_post || data.tasks_ig_live ? ['INSTAGRAM'] : []),
          ...(data.tasks_tt_video || data.tasks_tt_live || data.tasks_tt_duet ? ['TIKTOK'] : []),
          ...(data.tasks_yt_short || data.tasks_yt_video || data.tasks_yt_mention ? ['YOUTUBE'] : []),
          ...(data.tasks_fb_post || data.tasks_fb_story || data.tasks_fb_reel || data.tasks_fb_share ? ['FACEBOOK'] : []),
        ],
      })
      if (!result.success) {
        if ((result as any).insufficientCredits) {
          router.push('/brand/wallet?topup=barter')
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            {/* Hourglass SVG */}
            <svg viewBox="0 0 96 120" className="w-full h-full">
              <rect x="12" y="4" width="72" height="16" rx="6" fill="#9FE1CB" />
              <rect x="12" y="100" width="72" height="16" rx="6" fill="#9FE1CB" />
              <path d="M20 20 L48 60 L76 20 Z" fill="#5DCAA5" opacity="0.7" />
              <path d="M20 100 L48 60 L76 100 Z" fill="#1D9E75" opacity="0.9" />
              <circle cx="48" cy="60" r="9" fill="#1D9E75" />
            </svg>
          </div>
          <h1 className="text-2xl font-black mb-2">Oferta ta e în review!</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Echipa AddFame verifică campania înainte de a o face vizibilă influencerilor locali.
            Vei primi o notificare când e aprobată.
          </p>
          <button
            onClick={() => router.push('/brand/campaigns')}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
          >
            Văd campaniile mele
          </button>
        </div>
      </div>
    )
  }

  const offerLabel = data.offer_type === 'product' ? 'Produs' : 'Serviciu'

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-6 pb-32">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={step === 0 ? () => router.back() : back}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-black text-lg">Campanie Barter</h1>
            <p className="text-xs text-muted-foreground">Ofertă gratuită pentru influenceri locali</p>
          </div>
        </div>

        <ProgressBar current={step} />

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-5">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* ── STEP 0: Tip ofertă ──────────────────────────────────── */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-black mb-1">Ce oferi gratuit influencerilor locali?</h2>
            <p className="text-sm text-muted-foreground mb-6">Alege tipul ofertei tale</p>
            <div className="space-y-3">
              <OptionCard selected={data.offer_type === 'product'} onClick={() => set({ offer_type: 'product' })}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🍕</div>
                  <div>
                    <p className="font-black text-base mb-0.5">Free Product</p>
                    <p className="text-sm text-muted-foreground">cafea, pizza, burger, cocktail, etc.</p>
                  </div>
                  {data.offer_type === 'product' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </OptionCard>
              <OptionCard selected={data.offer_type === 'service'} onClick={() => set({ offer_type: 'service' })}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">✂️</div>
                  <div>
                    <p className="font-black text-base mb-0.5">Free Service</p>
                    <p className="text-sm text-muted-foreground">gym, frizerie, salon de înfrumusețare, etc.</p>
                  </div>
                  {data.offer_type === 'service' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </OptionCard>
            </div>
          </div>
        )}

        {/* ── STEP 1: Name & Value ────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-black mb-1">Ce {offerLabel.toLowerCase()} oferi?</h2>
            <p className="text-sm text-muted-foreground mb-6">Completează detaliile ofertei</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Numele {data.offer_type === 'product' ? 'produsului' : 'serviciului'} *
                </label>
                <input
                  type="text"
                  placeholder={data.offer_type === 'product' ? 'ex. Meniu Dublu Quesadilla' : 'ex. Abonament sala lunar'}
                  value={data.offer_name}
                  onChange={e => set({ offer_name: e.target.value })}
                  maxLength={100}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  Valoarea {data.offer_type === 'product' ? 'produsului' : 'serviciului'} (RON) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">RON</span>
                  <input
                    type="number"
                    placeholder="ex: 200"
                    value={data.offer_value}
                    onChange={e => set({ offer_value: e.target.value })}
                    min="1"
                    className="w-full pl-14 pr-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  />
                </div>
                {data.offer_value && !(parseFloat(data.offer_value) > 0) && (
                  <p className="text-xs text-red-500 font-bold mt-1">Introdu o valoare numerică (ex: 200). Nu se acceptă intervale.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  Descriere <span className="font-normal text-muted-foreground">(opțional)</span>
                </label>
                <textarea
                  placeholder={`ex. ${data.offer_type === 'product' ? 'One of the best quesadilla in town 🌮' : 'Timp de 30 de zile ești invitatul nostru 😊'}`}
                  value={data.offer_description}
                  onChange={e => set({ offer_description: e.target.value })}
                  rows={8}
                  maxLength={1000}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>

              <div className="pt-2">
                <p className="text-sm font-bold mb-3">Influencerul trebuie să sune pentru rezervare?</p>
                <div className="grid grid-cols-2 gap-3">
                  <OptionCard selected={!data.reservation_required} onClick={() => set({ reservation_required: false })}>
                    <div className="text-center">
                      <p className="font-bold text-sm">Nu, nu e nevoie</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Vine direct</p>
                    </div>
                  </OptionCard>
                  <OptionCard selected={data.reservation_required} onClick={() => set({ reservation_required: true })}>
                    <div className="text-center">
                      <p className="font-bold text-sm">Da, sună întâi</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rezervare necesară</p>
                    </div>
                  </OptionCard>
                </div>
              </div>

              {/* Durata campaniei */}
              <div className="pt-2">
                <p className="text-sm font-bold mb-1">Durata campaniei *</p>
                <p className="text-xs text-muted-foreground mb-3">Câte zile rulează campania de la aprobare</p>
                <div className="relative">
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
                    className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">zile</span>
                </div>
                {/* Sugestii rapide */}
                <div className="flex gap-2 mt-2">
                  {[14, 30, 60, 90].map(d => (
                    <button key={d} type="button"
                      onClick={() => {
                        const deadline = new Date(Date.now() + d * 86400000).toISOString().split('T')[0]
                        set({ duration_days: d, deadline })
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${data.duration_days === d ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {d} zile
                    </button>
                  ))}
                </div>
                {data.deadline && (
                  <p className="text-xs text-primary font-bold mt-2">
                    ✓ Campania se încheie pe {new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 2: Photo & Number ──────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-black mb-1">Foto & număr de influenceri</h2>
            <p className="text-sm text-muted-foreground mb-6">Adaugă o imagine și setează câți primesc oferta</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-3">
                  Imaginea {data.offer_type === 'product' ? 'produsului' : 'serviciului'}
                </label>
                <MultiImageUploader values={data.offer_image_urls} onChange={urls => set({ offer_image_urls: urls })} />
              </div>
              <div>
                <p className="text-sm font-bold mb-1 text-center">
                  La câți influenceri vrei să dai {data.offer_type === 'product' ? 'acest produs' : 'acest serviciu'} gratuit?
                </p>
                <p className="text-xs text-muted-foreground text-center mb-5">Odată atins numărul, oferta se închide automat</p>
                <Counter value={data.offer_count} onChange={v => set({ offer_count: v })} min={1} max={50} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Location ────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-black mb-1">Cum va primi influencerul oferta?</h2>
            <p className="text-sm text-muted-foreground mb-6">Alege modul de livrare</p>
            <div className="space-y-3 mb-6">
              <OptionCard
                selected={data.delivery_method === 'delivery'}
                onClick={() => set({ delivery_method: 'delivery' })}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🚚</span>
                  <div>
                    <p className="font-black text-sm">Livrare la domiciliul influencerului</p>
                    <p className="text-xs text-muted-foreground">Tu trimiți produsul la adresa lor</p>
                  </div>
                  {data.delivery_method === 'delivery' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </OptionCard>
              <OptionCard
                selected={data.delivery_method === 'pickup'}
                onClick={() => { set({ delivery_method: 'pickup' }); loadBrandLocations() }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-black text-sm">Ridicare personală din locația noastră</p>
                    <p className="text-xs text-muted-foreground">Influencerul vine la tine</p>
                  </div>
                  {data.delivery_method === 'pickup' && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </OptionCard>
            </div>

            {data.delivery_method === 'pickup' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <p className="text-sm font-bold">De unde va ridica influencerul oferta?</p>
                <LocationPicker
                  name={data.pickup_location_name}
                  address={data.pickup_location_address}
                  onSelect={(name, address, lat, lon) => set({ pickup_location_name: name, pickup_location_address: address, pickup_lat: lat, pickup_lon: lon })}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Details / Brief ─────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-black mb-1">Ce vrei să includă influencerul în stories?</h2>
            <p className="text-sm text-muted-foreground mb-6">Brief-ul campaniei</p>
            <div className="space-y-2.5 mb-5">
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

            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">
                Instrucțiuni suplimentare <span className="font-normal text-muted-foreground">(opțional)</span>
              </label>
              <textarea
                placeholder="ex. Vreau să vorbești despre site-ul nostru, să menționezi că avem reducere 20% săptămâna asta..."
                value={data.story_instructions}
                onChange={e => set({ story_instructions: e.target.value })}
                rows={8}
                maxLength={2000}
                className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
              />
            </div>

            <div>
              <p className="text-sm font-bold mb-3">Influencerii pot accepta oferta imediat?</p>
              <div className="grid grid-cols-2 gap-3">
                <OptionCard selected={data.auto_accept_influencers} onClick={() => set({ auto_accept_influencers: true })}>
                  <div className="text-center">
                    <div className="text-xl mb-1">👍</div>
                    <p className="font-bold text-sm">Da, sigur!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Accept automat toți</p>
                  </div>
                </OptionCard>
                <OptionCard selected={!data.auto_accept_influencers} onClick={() => set({ auto_accept_influencers: false })}>
                  <div className="text-center">
                    <div className="text-xl mb-1">👎</div>
                    <p className="font-bold text-sm">Nu, verific eu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Aprob manual fiecare</p>
                  </div>
                </OptionCard>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Tasks ───────────────────────────────────────── */}
        {/* ── STEP 5: Tasks ───────────────────────────────────────── */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-black mb-1">Ce trebuie să creeze influencerul?</h2>
            <p className="text-sm text-muted-foreground mb-5">Selectează platforma și tipul de conținut</p>

            {/* Tab-uri platforme */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {platformTabs.map(p => (
                <button key={p.id} type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition ${activeTab === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  {p.active && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.bg }}>
                    {p.icon}
                  </div>
                  <span className={`text-[11px] font-black ${activeTab === p.id ? 'text-primary' : 'text-muted-foreground'}`}>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">

              {/* ── INSTAGRAM ── */}
              {activeTab === 'instagram' && (<>
                {[
                  { key: 'tasks_stories_count', label: 'Instagram Stories', desc: 'Stories de 24h', counter: true },
                  { key: 'tasks_ig_reel', label: 'Instagram Reel', desc: 'Video scurt în feed', duration: 'tasks_ig_reel_duration', durationLabel: 'sec. minim' },
                  { key: 'tasks_ig_post', label: 'Post Feed (foto/carousel)', desc: 'Postare permanentă în feed' },
                  { key: 'tasks_ig_live', label: 'Instagram Live', desc: 'Live stream cu brandul' },
                ].map(task => (
                  <div key={task.key} className={`w-full border-2 rounded-2xl overflow-hidden transition ${
                    (task.counter ? data.tasks_stories_count > 0 : (data as any)[task.key])
                      ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <button type="button" className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => task.counter
                        ? set({ tasks_stories_count: data.tasks_stories_count > 0 ? 0 : 2 })
                        : set({ [task.key]: !(data as any)[task.key] } as any)}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        (task.counter ? data.tasks_stories_count > 0 : (data as any)[task.key]) ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {(task.counter ? data.tasks_stories_count > 0 : (data as any)[task.key]) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1"><p className="font-bold text-sm">{task.label}</p><p className="text-xs text-muted-foreground">{task.desc}</p></div>
                    </button>
                    {task.counter && data.tasks_stories_count > 0 && (
                      <div className="px-4 pb-4">
                        <p className="text-xs text-muted-foreground mb-3 text-center">Câte stories?</p>
                        <Counter value={data.tasks_stories_count} onChange={v => set({ tasks_stories_count: v })} min={1} max={10} />
                      </div>
                    )}
                    {task.duration && (data as any)[task.key] && (
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <label className="text-xs text-muted-foreground whitespace-nowrap">{task.durationLabel}</label>
                        <input type="number" min="5" value={(data as any)[task.duration]}
                          onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                          className="w-20 px-2 py-1.5 text-sm border border-input rounded-xl" />
                        <span className="text-xs text-muted-foreground">secunde</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-muted/40 rounded-2xl p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Postarea rămâne online minim</p>
                  <div className="flex gap-2 flex-wrap">
                    {[7, 14, 30, 60, 90].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ tasks_ig_days_online: d })}
                        className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition ${data.tasks_ig_days_online === d ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
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
                  <div key={task.key} className={`w-full border-2 rounded-2xl overflow-hidden transition ${(data as any)[task.key] ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <button type="button" className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${(data as any)[task.key] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {(data as any)[task.key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1"><p className="font-bold text-sm">{task.label}</p><p className="text-xs text-muted-foreground">{task.desc}</p></div>
                    </button>
                    {task.duration && (data as any)[task.key] && (
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <label className="text-xs text-muted-foreground">{task.durationLabel}</label>
                        <input type="number" min="5" value={(data as any)[task.duration]}
                          onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                          className="w-20 px-2 py-1.5 text-sm border border-input rounded-xl" />
                        <span className="text-xs text-muted-foreground">secunde</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="bg-muted/40 rounded-2xl p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Videoul rămâne pe profil minim</p>
                  <div className="flex gap-2 flex-wrap">
                    {[7, 14, 30, 60].map(d => (
                      <button key={d} type="button"
                        onClick={() => set({ tasks_tt_days_online: d })}
                        className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition ${data.tasks_tt_days_online === d ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                        {d} zile
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => set({ tasks_tt_days_online: 9999 })}
                      className={`text-xs px-3 py-1.5 rounded-xl border-2 font-bold transition ${data.tasks_tt_days_online === 9999 ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
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
                  { key: 'tasks_yt_mention', label: 'Mentiune în video existent', desc: 'Câteva secunde în alt video', duration: undefined },
                ].map(task => (
                  <div key={task.key} className={`w-full border-2 rounded-2xl overflow-hidden transition ${(data as any)[task.key] ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <button type="button" className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${(data as any)[task.key] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {(data as any)[task.key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1"><p className="font-bold text-sm">{task.label}</p><p className="text-xs text-muted-foreground">{task.desc}</p></div>
                    </button>
                    {task.duration && (data as any)[task.key] && (
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <label className="text-xs text-muted-foreground">{task.durationLabel}</label>
                        <input type="number" min="1" value={(data as any)[task.duration]}
                          onChange={e => set({ [task.duration!]: parseInt(e.target.value) || 0 } as any)}
                          className="w-20 px-2 py-1.5 text-sm border border-input rounded-xl" />
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-2 border-border rounded-2xl p-4 space-y-2">
                  <button type="button" onClick={() => set({ tasks_yt_link_in_desc: !data.tasks_yt_link_in_desc })}
                    className="flex items-center gap-2 text-sm w-full">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${data.tasks_yt_link_in_desc ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                      {data.tasks_yt_link_in_desc && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    Link în descrierea video obligatoriu
                  </button>
                </div>
              </>)}

              {/* ── FACEBOOK ── */}
              {activeTab === 'facebook' && (<>
                {[
                  { key: 'tasks_fb_post', label: 'Post pe pagina personală', desc: 'Postare în feed' },
                  { key: 'tasks_fb_story', label: 'Facebook Story', desc: 'Story de 24h' },
                  { key: 'tasks_fb_reel', label: 'Facebook Reel', desc: 'Video scurt' },
                  { key: 'tasks_fb_share', label: 'Share postarea brandului', desc: 'Redistribuire' },
                ].map(task => (
                  <div key={task.key} className={`w-full border-2 rounded-2xl overflow-hidden transition ${(data as any)[task.key] ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <button type="button" className="w-full flex items-center gap-3 p-4 text-left"
                      onClick={() => set({ [task.key]: !(data as any)[task.key] } as any)}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${(data as any)[task.key] ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                        {(data as any)[task.key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1"><p className="font-bold text-sm">{task.label}</p><p className="text-xs text-muted-foreground">{task.desc}</p></div>
                    </button>
                  </div>
                ))}
              </>)}

            </div>
          </div>
        )}

        {/* ── STEP 6: Brief & Link ──────────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-black mb-1">Brief, link & hashtag-uri</h2>
            <p className="text-sm text-muted-foreground mb-5">Spune influencerilor exact cum să prezinte brandul</p>

            <div className="space-y-5">

              {/* Link promovare */}
              <div className="border-2 border-green-200 bg-green-50 rounded-2xl p-4">
                <p className="text-sm font-black text-green-800 mb-1">Link de promovat</p>
                <p className="text-xs text-green-600 mb-3">Influencerul va adăuga acest link în bio / stories</p>
                <input type="url" placeholder="https://site.ro/produs"
                  value={data.promotion_link}
                  onChange={e => set({ promotion_link: e.target.value })}
                  className="w-full px-4 py-3 border border-green-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <div className="mt-3 space-y-2">
                  {[
                    { key: 'bio', label: 'Adaugă în bio pe durata campaniei' },
                    { key: 'swipeup', label: 'Swipe-up în Stories' },
                    { key: 'verbal', label: 'Menționat verbal în video' },
                    { key: 'description', label: 'Link în descrierea video (YouTube)' },
                  ].map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => {
                        const cur = data.promotion_link_placement
                        set({ promotion_link_placement: cur.includes(opt.key) ? cur.filter(x => x !== opt.key) : [...cur, opt.key] })
                      }}
                      className={`flex items-center gap-2 text-sm w-full ${data.promotion_link_placement.includes(opt.key) ? 'text-green-800' : 'text-green-600'}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${data.promotion_link_placement.includes(opt.key) ? 'bg-green-500 border-green-500' : 'border-green-300'}`}>
                        {data.promotion_link_placement.includes(opt.key) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Brief Generator */}
              <AIBriefGenerator
                offerName={data.offer_name}
                offerValue={data.offer_value}
                offerDescription={data.offer_description}
                platforms={data.platforms}
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
              <div>
                <label className="block text-sm font-bold mb-2">Hashtag-uri obligatorii <span className="font-normal text-muted-foreground">(separat prin spațiu)</span></label>
                <input type="text" placeholder="#brand #produs #ad"
                  value={data.required_hashtags}
                  onChange={e => set({ required_hashtags: e.target.value })}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-bold mb-2">Caption obligatoriu <span className="font-normal text-muted-foreground">(opțional)</span></label>
                <textarea rows={3} placeholder='ex: "Parteneriat cu @brand. Am primit produsul în schimbul unei recenzii oneste."'
                  value={data.required_caption}
                  onChange={e => set({ required_caption: e.target.value })}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {/* Ton continut */}
              <div>
                <label className="block text-sm font-bold mb-2">Tonul conținutului</label>
                <div className="flex gap-2 flex-wrap">
                  {['Autentic', 'Distractiv', 'Educational', 'Lifestyle', 'Profesional', 'Inspirational'].map(tone => (
                    <button key={tone} type="button"
                      onClick={() => {
                        const cur = data.content_tone
                        set({ content_tone: cur.includes(tone) ? cur.filter(x => x !== tone) : [...cur, tone] })
                      }}
                      className={`text-sm px-4 py-2 rounded-xl border-2 font-bold transition ${data.content_tone.includes(tone) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructiuni */}
              <div>
                <label className="block text-sm font-bold mb-2">Instrucțiuni de creare conținut</label>
                <textarea rows={5} placeholder="ex: Arată cum folosești produsul în rutina zilnică. Filmează în lumină naturală. Menționează cele 3 beneficii: X, Y, Z..."
                  value={data.story_instructions}
                  onChange={e => set({ story_instructions: e.target.value })}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
              </div>

              {/* Mesaje cheie */}
              <div>
                <label className="block text-sm font-bold mb-2">Mesaje cheie de transmis <span className="font-normal text-muted-foreground">(opțional)</span></label>
                <textarea rows={3} placeholder="ex: Rezultate vizibile din prima săptămână. Formula cu 15% Vitamina C. Disponibil pe site.ro cu livrare în 24h."
                  value={data.key_messages}
                  onChange={e => set({ key_messages: e.target.value })}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
              </div>

              {/* Ce sa evite */}
              <div>
                <label className="block text-sm font-bold mb-2">Ce să evite <span className="font-normal text-muted-foreground">(opțional)</span></label>
                <textarea rows={2} placeholder="ex: Nu menționa competitorii. Evită filtrele puternice. Nu face promisiuni medicale."
                  value={data.forbidden_content}
                  onChange={e => set({ forbidden_content: e.target.value })}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
              </div>

              {/* Zile online */}
              <div>
                <label className="block text-sm font-bold mb-2">Postarea rămâne online minim</label>
                <div className="flex gap-2 flex-wrap">
                  {[7, 14, 30, 60, 90].map(d => (
                    <button key={d} type="button"
                      onClick={() => set({ min_days_online: d })}
                      className={`text-sm px-4 py-2 rounded-xl border-2 font-bold transition ${data.min_days_online === d ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      {d} zile
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}


        {/* ── STEP 6: Target ──────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-black mb-1">Target influenceri</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Cine va putea vedea și aplica la oferta ta
            </p>

            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-black text-green-800 text-base">
                  🎯 Toți influencerii din rețea
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Oferta ta va fi vizibilă tuturor celor <strong>179+ influenceri</strong> verificați din AddFame. Ei aplică, tu alegi cu cine colaborezi.
                </p>
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-700 font-semibold">
                💡 În curând vei putea filtra după numărul de followeri, nișă și locație.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 7: Review ──────────────────────────────────────── */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-black mb-1">Review & Publică</h2>
            <p className="text-sm text-muted-foreground mb-6">Verifică totul înainte de a trimite spre aprobare</p>

            {data.offer_image_urls.length > 0 && (
              <div className="mb-5">
                <div className="relative rounded-2xl overflow-hidden mb-2">
                  <img src={data.offer_image_urls[0]} alt="Offer" className="w-full h-44 object-cover" />
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-primary text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">Gratuit</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm font-black px-3 py-1 rounded-xl">{data.offer_name}</div>
                </div>
                {data.offer_image_urls.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {data.offer_image_urls.slice(1).map((url, idx) => (
                      <img key={idx} src={url} alt={`Imagine ${idx + 2}`} className="w-full h-16 object-cover rounded-xl border border-border" />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
              <div className="px-5 py-3 bg-muted/30 border-b border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Detalii ofertă</p>
              </div>
              <div className="px-5">
                <ReviewField label="Tip ofertă" value={data.offer_type === 'product' ? 'Free Product' : 'Free Service'} />
                <ReviewField label={data.offer_type === 'product' ? 'Produs' : 'Serviciu'} value={data.offer_name} />
                {data.offer_description && <ReviewField label="Descriere" value={data.offer_description} />}
                <ReviewField label="Valoare" value={`${data.offer_value} RON`} />
                <ReviewField label="Nr. influenceri" value={String(data.offer_count)} />
                <ReviewField label="Rezervare" value={data.reservation_required ? 'Necesară' : 'Nu e necesară'} />
                <ReviewField label="Durata campaniei" value={data.duration_days ? `${data.duration_days} zile (până pe ${new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })})` : 'Nesetată'} />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
              <div className="px-5 py-3 bg-muted/30 border-b border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Logistică & Brief</p>
              </div>
              <div className="px-5">
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
                <ReviewField
                  label="Followeri minimi"
                  value={data.min_followers_target === 0 ? 'Fără restricții' : `${data.min_followers_target.toLocaleString()}+`}
                />
              </div>
            </div>

            {/* Taxa publicare */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-amber-800">Taxă publicare campanie barter</p>
                <p className="text-xs text-amber-600 mt-0.5">Se debitează din wallet la publicare</p>
              </div>
              <p className="text-2xl font-black text-amber-700">149 RON</p>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground text-center mb-2">
              Prin publicare accepți{' '}
              <a href="/termeni" target="_blank" rel="noopener noreferrer" className="text-primary underline">Termenii Serviciului</a>
              {' '}și{' '}
              <a href="/politica-de-confidentialitate" target="_blank" rel="noopener noreferrer" className="text-primary underline">Politica de confidențialitate</a>.
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky CTA ──────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border px-4 py-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          {step < 7 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canProceed()}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canProceed() ? 'linear-gradient(135deg, #f97316, #ec4899)' : undefined,
                backgroundColor: canProceed() ? undefined : 'hsl(var(--muted))'
              }}
            >
              Continuă
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Se publică...</>
                : <><Zap className="w-4 h-4" />Publică oferta</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
