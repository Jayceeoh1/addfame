'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBarterCampaign } from '@/app/actions/barter-campaigns'
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
  offer_image_url: string
  offer_count: number
  // Step 4
  delivery_method: DeliveryMethod | null
  pickup_location_name: string
  pickup_location_address: string
  // Step 5 — Tasks Instagram
  story_include_instagram: boolean
  story_include_atmosphere: boolean
  story_include_product: boolean
  story_instructions: string
  auto_accept_influencers: boolean
  // Step 6 — Tasks per platformă
  tasks_stories_count: number
  tasks_include_post: boolean
  // TikTok
  tasks_tiktok_video: boolean
  tasks_tiktok_count: number
  // YouTube
  tasks_youtube_short: boolean
  tasks_youtube_video: boolean
  // Facebook
  tasks_facebook_post: boolean
  tasks_facebook_story: boolean
  // Step 7
  min_followers_target: number
  // Coordonate GPS locație pickup
  pickup_lat?: number
  pickup_lon?: number
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

// ─── Image uploader ─────────────────────────────────────────────────────────

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Doar imagini sunt acceptate.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Imaginea trebuie să fie sub 5MB.'); return }
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Neautentificat')
      const ext = file.name.split('.').pop()
      const path = `barter/${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e: any) {
      setError(e.message || 'Upload eșuat. Încearcă din nou.')
    } finally {
      setUploading(false)
    }
  }, [onChange])

  return (
    <div>
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={value} alt="Offer" className="w-full h-52 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition flex flex-col items-center justify-center gap-3 text-muted-foreground"
        >
          {uploading
            ? <Loader2 className="w-8 h-8 animate-spin text-primary" />
            : <><Upload className="w-8 h-8" /><p className="text-sm font-medium">Click pentru upload</p><p className="text-xs">JPG, PNG · max 5MB</p></>
          }
        </button>
      )}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
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
  offer_image_url: '',
  offer_count: 3,
  delivery_method: null,
  pickup_location_name: '',
  pickup_location_address: '',
  story_include_instagram: true,
  story_include_atmosphere: true,
  story_include_product: true,
  story_instructions: '',
  auto_accept_influencers: true,
  tasks_stories_count: 4,
  tasks_include_post: false,
  tasks_tiktok_video: false,
  tasks_tiktok_count: 1,
  tasks_youtube_short: false,
  tasks_youtube_video: false,
  tasks_facebook_post: false,
  tasks_facebook_story: false,
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
        const sb = createClient()
        let query = sb.from('influencers')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved')
        if (data.min_followers_target > 0) {
          query = query.gte('ig_followers', data.min_followers_target)
        }
        const { count } = await query
        setInfluencerCount(count ?? 0)
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
      active: data.tasks_stories_count > 0 || data.tasks_include_post,
    },
    {
      id: 'tiktok', label: 'TikTok', bg: '#010101',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" /></svg>),
      active: data.tasks_tiktok_video,
    },
    {
      id: 'youtube', label: 'YouTube', bg: '#ef4444',
      icon: (<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>),
      active: data.tasks_youtube_short || data.tasks_youtube_video,
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
      case 1: return data.offer_name.trim().length > 0 && parseFloat(data.offer_value) > 0
      case 2: return data.offer_count >= 1
      case 3: return data.delivery_method !== null &&
        (data.delivery_method === 'delivery' || data.pickup_location_name.length > 0)
      case 4: return true
      case 5: return data.tasks_stories_count >= 1 || data.tasks_include_post ||
        data.tasks_tiktok_video || data.tasks_youtube_short || data.tasks_youtube_video ||
        data.tasks_facebook_post || data.tasks_facebook_story
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
        offer_image_url: data.offer_image_url,
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
        tasks_tiktok_video: data.tasks_tiktok_video,
        tasks_tiktok_count: data.tasks_tiktok_count,
        tasks_youtube_short: data.tasks_youtube_short,
        tasks_youtube_video: data.tasks_youtube_video,
        tasks_facebook_post: data.tasks_facebook_post,
        tasks_facebook_story: data.tasks_facebook_story,
        min_followers_target: data.min_followers_target,
        platforms: [
          ...(data.tasks_stories_count > 0 || data.tasks_include_post ? ['INSTAGRAM'] : []),
          ...(data.tasks_tiktok_video ? ['TIKTOK'] : []),
          ...(data.tasks_youtube_short || data.tasks_youtube_video ? ['YOUTUBE'] : []),
          ...(data.tasks_facebook_post || data.tasks_facebook_story ? ['FACEBOOK'] : []),
        ],
      })
      if (!result.success) throw new Error(result.error)
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
                    placeholder="0"
                    value={data.offer_value}
                    onChange={e => set({ offer_value: e.target.value })}
                    min="1"
                    className="w-full pl-14 pr-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  Descriere <span className="font-normal text-muted-foreground">(opțional)</span>
                </label>
                <textarea
                  placeholder={`ex. ${data.offer_type === 'product' ? 'One of the best quesadilla in town 🌮' : 'Timp de 30 de zile ești invitatul nostru 😊'}`}
                  value={data.offer_description}
                  onChange={e => set({ offer_description: e.target.value })}
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
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
                <ImageUploader value={data.offer_image_url} onChange={url => set({ offer_image_url: url })} />
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
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
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
                  className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition ${activeTab === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}>
                  {/* Badge activ */}
                  {p.active && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </span>
                  )}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: p.bg }}>
                    {p.icon}
                  </div>
                  <span className={`text-[11px] font-black ${activeTab === p.id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Conținut tab activ */}
            <div className="space-y-3">

              {/* ── INSTAGRAM ── */}
              {activeTab === 'instagram' && (<>
                <button type="button"
                  onClick={() => set({ tasks_stories_count: data.tasks_stories_count > 0 ? 0 : 4 })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_stories_count > 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_stories_count > 0 ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_stories_count > 0 && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Instagram Story</p>
                    <p className="text-xs text-muted-foreground">Stories în 24h pe profilul influencerului</p>
                  </div>
                </button>
                {data.tasks_stories_count > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 animate-in fade-in duration-200">
                    <p className="text-xs text-muted-foreground mb-4 text-center">Câte stories trebuie să posteze?</p>
                    <Counter value={data.tasks_stories_count} onChange={v => set({ tasks_stories_count: v })} min={1} max={10} />
                  </div>
                )}
                <button type="button"
                  onClick={() => set({ tasks_include_post: !data.tasks_include_post })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_include_post ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_include_post ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_include_post && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Instagram Post</p>
                    <p className="text-xs text-muted-foreground">Post permanent în feed (Reels sau foto)</p>
                  </div>
                </button>
              </>)}

              {/* ── TIKTOK ── */}
              {activeTab === 'tiktok' && (<>
                <button type="button"
                  onClick={() => set({ tasks_tiktok_video: !data.tasks_tiktok_video })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_tiktok_video ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_tiktok_video ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_tiktok_video && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">TikTok Video</p>
                    <p className="text-xs text-muted-foreground">Video organic postat pe contul influencerului</p>
                  </div>
                </button>
                {data.tasks_tiktok_video && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 animate-in fade-in duration-200">
                    <p className="text-xs text-muted-foreground mb-4 text-center">Câte videoclipuri TikTok?</p>
                    <Counter value={data.tasks_tiktok_count} onChange={v => set({ tasks_tiktok_count: v })} min={1} max={5} />
                  </div>
                )}
              </>)}

              {/* ── YOUTUBE ── */}
              {activeTab === 'youtube' && (<>
                <button type="button"
                  onClick={() => set({ tasks_youtube_short: !data.tasks_youtube_short })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_youtube_short ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_youtube_short ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_youtube_short && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">YouTube Short</p>
                    <p className="text-xs text-muted-foreground">Video scurt sub 60 secunde pe canalul influencerului</p>
                  </div>
                </button>
                <button type="button"
                  onClick={() => set({ tasks_youtube_video: !data.tasks_youtube_video })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_youtube_video ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_youtube_video ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_youtube_video && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">YouTube Video</p>
                    <p className="text-xs text-muted-foreground">Video lung cu mențiunea brandului/produsului</p>
                  </div>
                </button>
              </>)}

              {/* ── FACEBOOK ── */}
              {activeTab === 'facebook' && (<>
                <button type="button"
                  onClick={() => set({ tasks_facebook_post: !data.tasks_facebook_post })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_facebook_post ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_facebook_post ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_facebook_post && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Facebook Post</p>
                    <p className="text-xs text-muted-foreground">Post sau Reel pe pagina/profilul de Facebook</p>
                  </div>
                </button>
                <button type="button"
                  onClick={() => set({ tasks_facebook_story: !data.tasks_facebook_story })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${data.tasks_facebook_story ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${data.tasks_facebook_story ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>
                    {data.tasks_facebook_story && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">Facebook Story</p>
                    <p className="text-xs text-muted-foreground">Story de 24h pe Facebook</p>
                  </div>
                </button>
              </>)}

            </div>

            {/* Sumar selectii */}
            {(data.tasks_stories_count > 0 || data.tasks_include_post || data.tasks_tiktok_video ||
              data.tasks_youtube_short || data.tasks_youtube_video || data.tasks_facebook_post || data.tasks_facebook_story) && (
                <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <p className="text-xs font-black text-green-700 mb-2">✅ Conținut selectat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tasks_stories_count > 0 && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{data.tasks_stories_count}x IG Story</span>}
                    {data.tasks_include_post && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">1x IG Post</span>}
                    {data.tasks_tiktok_video && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">{data.tasks_tiktok_count}x TikTok</span>}
                    {data.tasks_youtube_short && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">1x YT Short</span>}
                    {data.tasks_youtube_video && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">1x YT Video</span>}
                    {data.tasks_facebook_post && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">1x FB Post</span>}
                    {data.tasks_facebook_story && <span className="text-[11px] font-bold bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">1x FB Story</span>}
                  </div>
                </div>
              )}
          </div>
        )}


        {/* ── STEP 6: Target ──────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-black mb-1">Target influenceri</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Stabilește numărul minim de followeri pentru a aplica la oferta ta
            </p>

            <div className="bg-card border border-border rounded-2xl p-6 mb-4">
              <p className="text-sm text-muted-foreground mb-1 text-center">Followeri minimi</p>
              <div className="flex items-center justify-center gap-4 my-4">
                {[0, 500, 1000, 5000, 10000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set({ min_followers_target: val })}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-bold border transition
                      ${data.min_followers_target === val
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                      }
                    `}
                  >
                    {val === 0 ? 'Orice' : val >= 1000 ? `${val / 1000}K+` : `${val}+`}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={50000}
                step={500}
                value={data.min_followers_target}
                onChange={e => set({ min_followers_target: parseInt(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span className="font-bold text-primary text-sm">
                  {data.min_followers_target === 0 ? 'Toți influencerii' : `min ${data.min_followers_target.toLocaleString()} followeri`}
                </span>
                <span>50K</span>
              </div>
            </div>

            {/* Counter live influenceri disponibili */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 border-2 transition ${influencerCount === 0 ? 'bg-red-50 border-red-200' :
                influencerCount !== null && influencerCount < 5 ? 'bg-amber-50 border-amber-200' :
                  'bg-green-50 border-green-200'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${influencerCount === 0 ? 'bg-red-100' :
                  influencerCount !== null && influencerCount < 5 ? 'bg-amber-100' : 'bg-green-100'
                }`}>
                {countLoading
                  ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                  : <Users className={`w-5 h-5 ${influencerCount === 0 ? 'text-red-500' :
                      influencerCount !== null && influencerCount < 5 ? 'text-amber-500' : 'text-green-500'
                    }`} />
                }
              </div>
              <div>
                {countLoading ? (
                  <p className="text-sm font-bold text-muted-foreground">Se calculează...</p>
                ) : influencerCount === null ? (
                  <p className="text-sm font-bold text-muted-foreground">Influencerii care nu îndeplinesc criteriul nu vor vedea oferta ta.</p>
                ) : influencerCount === 0 ? (
                  <>
                    <p className="text-sm font-black text-red-700">Niciun influencer nu îndeplinește criteriul</p>
                    <p className="text-xs text-red-500 mt-0.5">Scade numărul de followeri pentru a ajunge la mai mulți creatori.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-black text-green-700">
                      🎯 ~{influencerCount} influencer{influencerCount !== 1 ? 'i' : ''} disponibil{influencerCount !== 1 ? 'i' : ''}
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {influencerCount < 5
                        ? 'Audiență redusă — consideră să scazi pragul de followeri.'
                        : data.min_followers_target === 0
                          ? 'Toți influencerii înscriși vor putea vedea oferta.'
                          : `Cu minim ${data.min_followers_target.toLocaleString()} followeri din rețeaua AddFame.`
                      }
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 7: Review ──────────────────────────────────────── */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-black mb-1">Review & Publică</h2>
            <p className="text-sm text-muted-foreground mb-6">Verifică totul înainte de a trimite spre aprobare</p>

            {data.offer_image_url && (
              <div className="relative rounded-2xl overflow-hidden mb-5">
                <img src={data.offer_image_url} alt="Offer" className="w-full h-44 object-cover" />
                <div className="absolute bottom-3 left-3">
                  <span className="bg-primary text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
                    Gratuit
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm font-black px-3 py-1 rounded-xl">
                  {data.offer_name}
                </div>
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

            <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground text-center mb-2">
              Prin publicare accepți{' '}
              <Link href="/terms" className="text-primary underline">Termenii Serviciului</Link>
              {' '}și{' '}
              <Link href="/privacy" className="text-primary underline">Politica de confidențialitate</Link>.
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
