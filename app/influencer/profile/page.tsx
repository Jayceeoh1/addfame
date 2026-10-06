'use client'
// @ts-nocheck

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Camera, CheckCircle, AlertCircle, X, Upload,
  ExternalLink, Trash2, Plus, Link2
} from 'lucide-react'


import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'

const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: InstagramIcon,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    placeholder: 'https://instagram.com/yourhandle',
    handlePrefix: 'instagram.com/',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: TikTokSVG,
    color: 'text-gray-900',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    placeholder: 'https://tiktok.com/@yourhandle',
    handlePrefix: 'tiktok.com/@',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: YoutubeIcon,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    placeholder: 'https://youtube.com/@yourchannel',
    handlePrefix: 'youtube.com/@',
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    icon: TwitterXIcon,
    color: 'text-gray-900',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    placeholder: 'https://x.com/yourhandle',
    handlePrefix: 'x.com/',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: LinkedInIcon,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    placeholder: 'https://linkedin.com/in/yourprofile',
    handlePrefix: 'linkedin.com/in/',
  },
]
const NICHES_OPTIONS = [
  'Fashion', 'Beauty', 'Lifestyle', 'Travel', 'Food', 'Fitness',
  'Tech', 'Gaming', 'Music', 'Comedy', 'Education', 'Business',
  'Finance', 'Health', 'Sports', 'Photography', 'Art', 'Parenting',
]

type SocialLink = { platform: string; url: string; followers?: string; engagement_rate?: string; avg_views?: string }


// ── Pricing thresholds Romania 2025-2026 (sursa: MOCAPP) ───────────────────
const PRICE_CONFIG = [
  { key: 'story', label: 'Story (Instagram/TikTok)', placeholder: 'ex: 50', warn: 100, max: 300, min: 5 },
  { key: 'reel', label: 'Reel / TikTok Video', placeholder: 'ex: 150', warn: 300, max: 800, min: 10 },
  { key: 'post', label: 'Post foto (Instagram)', placeholder: 'ex: 100', warn: 200, max: 500, min: 5 },
  { key: 'youtube', label: 'YouTube Video sponsorizat', placeholder: 'ex: 300', warn: 500, max: 1500, min: 20 },
]

function getPriceStatus(val: string, warn: number, max: number, min: number) {
  const n = parseInt(val)
  if (!val || isNaN(n) || n === 0) return null
  if (n < min) return { level: 'low', msg: `Sub ${min} RON — riști să te devalorizezi față de branduri.` }
  if (n > max) return { level: 'high', msg: `Peste ${max} RON — reduce semnificativ șansele de colaborare pe piața RO.` }
  if (n > warn) return { level: 'warn', msg: `Peste media pieței (${warn} RON). Unele branduri pot prefera influenceri mai accesibili.` }
  return { level: 'ok', msg: `Preț competitiv pentru piața din România ✓` }
}

function PricingSection({ priceStory, setPriceStory, priceReel, setPriceReel, pricePost, setPricePost, priceYoutube, setPriceYoutube, priceMin, setPriceMin }: any) {
  const vals: Record<string, string> = { story: priceStory, reel: priceReel, post: pricePost, youtube: priceYoutube }
  const setters: Record<string, (v: string) => void> = { story: setPriceStory, reel: setPriceReel, post: setPricePost, youtube: setPriceYoutube }

  return (
    <div className="iu-card iu-card-pad">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7040f0, #9030f0)' }}>
          <span className="text-white font-black">RON</span>
        </div>
        <div>
          <h3 className="font-black text-gray-900">Tarifele mele</h3>
          <p className="text-xs text-gray-400 mt-0.5">Brandurile văd aceste prețuri pe profilul tău public</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {PRICE_CONFIG.map(cfg => {
          const status = getPriceStatus(vals[cfg.key], cfg.warn, cfg.max, cfg.min)
          const borderColor = !status ? '#e5e7eb' : status.level === 'ok' ? '#86efac' : status.level === 'warn' ? '#fcd34d' : status.level === 'high' ? '#fca5a5' : '#c4b5fd'
          return (
            <div key={cfg.key}>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">{cfg.label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">RON</span>
                <input
                  type="number" min="0" value={vals[cfg.key]}
                  onChange={e => setters[cfg.key](e.target.value)}
                  placeholder={cfg.placeholder}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-semibold outline-none transition"
                  style={{ border: `2px solid ${borderColor}` }}
                />
              </div>
              {status && (
                <p className={`text-[11px] mt-1.5 font-semibold ${status.level === 'ok' ? 'text-green-600' : status.level === 'warn' ? 'text-amber-600' : status.level === 'high' ? 'text-red-500' : 'text-orange-500'
                  }`}>
                  {status.level === 'ok' ? '✓ ' : status.level === 'high' ? '⚠️ ' : status.level === 'low' ? '⬇️ ' : '⚡ '}
                  {status.msg}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Preț minim per campanie</label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">RON</span>
          <input type="number" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)}
            placeholder="ex: 50"
            className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold outline-none focus:border-purple-400 transition" />
        </div>
        <p className="text-xs text-gray-400 mt-1">Brandurile văd că nu colaborezi sub această sumă per campanie.</p>
      </div>

      <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
        <p className="text-xs text-purple-700 font-semibold leading-relaxed">
          💡 Prețurile sunt orientative și vizibile brandurilor pe profilul tău. Suma finală se negociază direct în campanie.
        </p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile fields
  const [userId, setUserId] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [niches, setNiches] = useState<string[]>([])
  const [nicheInput, setNicheInput] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [addingSocial, setAddingSocial] = useState<string | null>(null)
  const [socialUrl, setSocialUrl] = useState('')
  const [socialFollowers, setSocialFollowers] = useState('')
  const [socialEngRate, setSocialEngRate] = useState('')
  const [socialAvgViews, setSocialAvgViews] = useState('')
  const [erCalcOpen, setErCalcOpen] = useState(false)
  const [erCalcPlatform, setErCalcPlatform] = useState('')
  const [erFollowers, setErFollowers] = useState('')
  const [erLikes, setErLikes] = useState('')
  const [erComments, setErComments] = useState('')
  const [erShares, setErShares] = useState('')
  const [erPosts, setErPosts] = useState('10')
  const [priceStory, setPriceStory] = useState('')
  const [priceReel, setPriceReel] = useState('')
  const [pricePost, setPricePost] = useState('')
  const [igFollowers, setIgFollowers] = useState('')
  const [ttFollowers, setTtFollowers] = useState('')
  const [priceYoutube, setPriceYoutube] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [igStatus, setIgStatus] = useState<'idle' | 'success' | 'error' | 'no_account'>('idle')
  const [igErrMsg, setIgErrMsg] = useState('')
  const [igErrDetail, setIgErrDetail] = useState('')
  const [erResult, setErResult] = useState<number | null>(null)
  const [igData, setIgData] = useState<{
    connected: boolean; handle: string; followers: number; following: number;
    posts: number; engagement: number; avatar: string | null; bio: string | null; lastSync: string | null;
  } | null>(null)

  useEffect(() => { fetchProfile() }, [])

  // ── Feedback după redirectul OAuth Instagram ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('instagram')
    if (status === 'success') {
      setIgStatus('success')
      // Curățăm query-ul din URL ca să nu apară la refresh
      window.history.replaceState({}, '', '/influencer/profile')
      // Reîncărcăm profilul ca să afișăm datele proaspete
      fetchProfile()
      setTimeout(() => setIgStatus('idle'), 6000)
    } else if (status === 'error') {
      setIgStatus('error')
      const reason = params.get('reason')
      const msg = params.get('msg')
      console.error('[IG OAuth] error', { reason, msg })
      setIgErrMsg(
        reason === 'not_professional' ? 'Contul trebuie să fie Professional (Business sau Creator). În Instagram: Setări → Tip cont → Comută la cont profesional, apoi reconectează-te.'
        : reason === 'already_linked' ? 'Acest cont Instagram este deja conectat la alt cont AddFame.'
        : reason === 'denied' ? 'Ai refuzat permisiunile cerute de Instagram.'
        : 'Încearcă din nou. Dacă problema persistă, contactează-ne.')
      setIgErrDetail([reason, msg].filter(Boolean).join(' — '))
      window.history.replaceState({}, '', '/influencer/profile')
      setTimeout(() => setIgStatus('idle'), 60000)
    }
  }, [])

  async function disconnectInstagram() {
    if (!confirm('Sigur vrei să deconectezi contul Instagram? Va trebui să te reconectezi ca să vezi date live.')) return
    try {
      const r = await fetch('/api/auth/instagram/disconnect', { method: 'POST' })
      if (!r.ok) throw new Error('disconnect failed')
      setIgData(null)
    } catch (e) {
      console.error('Disconnect failed', e)
    }
  }

  async function fetchProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('influencers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setName(data.name || '')
        setPriceStory(data.price_story?.toString() || '')
        setPriceReel(data.price_reel?.toString() || '')
        setPricePost(data.price_post?.toString() || '')
        setIgFollowers(data.instagram_followers?.toString() || '')
        setTtFollowers(data.tt_followers?.toString() || '')
        setPriceYoutube(data.price_youtube?.toString() || '')
        setPriceMin(data.price_min?.toString() || '')
        setSlug(data.slug || '')
        setBio(data.bio || '')
        setCountry(data.country || '')
        setNiches(data.niches || [])
        setAvatar(data.avatar || null)
        setAvatarPreview(data.avatar || null)
        // platforms stored as [{platform, url, followers}] or legacy object
        if (Array.isArray(data.platforms)) {
          setSocialLinks(data.platforms)
        } else if (data.platforms && typeof data.platforms === 'object') {
          // convert legacy {instagram: 'url'} format
          const converted = Object.entries(data.platforms).map(([platform, url]) => ({
            platform,
            url: url as string,
            followers: '',
          }))
          setSocialLinks(converted)
        }
        // Load Instagram live data
        if (data.instagram_connected) {
          setIgData({
            connected: true,
            handle: data.instagram_handle || '',
            followers: data.ig_followers || 0,
            following: data.ig_following || 0,
            posts: data.ig_posts_count || 0,
            engagement: data.ig_engagement_rate || 0,
            avatar: data.ig_avatar || null,
            bio: data.ig_bio || null,
            lastSync: data.ig_last_sync || null,
          })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Fotografia trebuie să fie sub 5MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)
    setAvatarUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('influencer-avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = reader.result as string
            setAvatar(base64)
            setAvatarPreview(base64)
            const { error: dbError } = await supabase
              .from('influencers')
              .update({ avatar: base64 })
              .eq('user_id', userId)
            if (dbError) setError('Eroare la salvarea fotografiei: ' + dbError.message)
            setAvatarUploading(false)
          }
          reader.readAsDataURL(file)
          return
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('influencer-avatars')
        .getPublicUrl(path)

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
      setAvatar(urlWithCacheBust)
      setAvatarPreview(urlWithCacheBust)

      const { error: dbError } = await supabase
        .from('influencers')
        .update({ avatar: urlWithCacheBust })
        .eq('user_id', userId)

      if (dbError) throw dbError

    } catch (err: any) {
      setError('Eroare la încărcarea fotografiei: ' + err.message)
      setAvatarPreview(avatar)
    } finally {
      setAvatarUploading(false)
    }
  }

  function addNiche(niche: string) {
    if (!niches.includes(niche)) setNiches(prev => [...prev, niche])
  }

  function removeNiche(niche: string) {
    setNiches(prev => prev.filter(n => n !== niche))
  }

  function handleAddCustomNiche() {
    if (nicheInput.trim() && !niches.includes(nicheInput.trim())) {
      setNiches(prev => [...prev, nicheInput.trim()])
      setNicheInput('')
    }
  }

  function handleAddSocial() {
    if (!addingSocial || !socialUrl.trim()) return
    const existing = socialLinks.findIndex(s => s.platform === addingSocial)
    const newLink: SocialLink = { platform: addingSocial, url: socialUrl.trim(), followers: socialFollowers.trim(), engagement_rate: socialEngRate.trim() || undefined, avg_views: socialAvgViews.trim() || undefined }
    if (existing >= 0) {
      setSocialLinks(prev => prev.map((s, i) => i === existing ? newLink : s))
    } else {
      setSocialLinks(prev => [...prev, newLink])
    }
    setAddingSocial(null)
    setSocialUrl('')
    setSocialFollowers('')
    setSocialEngRate('')
    setSocialAvgViews('')
  }

  function removeSocial(platform: string) {
    setSocialLinks(prev => prev.filter(s => s.platform !== platform))
  }

  function openAddSocial(platformId: string) {
    const existing = socialLinks.find(s => s.platform === platformId)
    setSocialUrl(existing?.url || '')
    setSocialFollowers(existing?.followers || '')
    setSocialEngRate(existing?.engagement_rate || '')
    setSocialAvgViews(existing?.avg_views || '')
    setAddingSocial(platformId)
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase.from('influencers').update({
        name,
        slug,
        bio,
        country,
        niches,
        platforms: socialLinks,
        avatar,
        price_story: priceStory ? parseInt(priceStory) : null,
        price_reel: priceReel ? parseInt(priceReel) : null,
        price_post: pricePost ? parseInt(pricePost) : null,
        instagram_followers: (() => {
          const ig = socialLinks.find((s: any) => s.platform === 'instagram' || s.key === 'instagram')
          const manual = igFollowers ? parseInt(igFollowers.replace(/[^0-9]/g, '')) : null
          return ig?.followers || manual || null
        })(),
        tt_followers: (() => {
          const tt = socialLinks.find((s: any) => s.platform === 'tiktok' || s.key === 'tiktok')
          const manual = ttFollowers ? parseInt(ttFollowers.replace(/[^0-9]/g, '')) : null
          return tt?.followers || manual || null
        })(),
        price_youtube: priceYoutube ? parseInt(priceYoutube) : null,
        price_min: priceMin ? parseInt(priceMin) : null,
      }).eq('user_id', user.id)

      if (updateError) throw updateError

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  function calcEngRate() {
    const followers = parseFloat(erFollowers.replace(/[K k]/g, '000').replace(/[M m]/g, '000000'))
    const likes = parseFloat(erLikes.replace(/[K k]/g, '000').replace(/[M m]/g, '000000'))
    const comments = parseFloat(erComments.replace(/[K k]/g, '000').replace(/[M m]/g, '000000')) || 0
    const shares = parseFloat(erShares.replace(/[K k]/g, '000').replace(/[M m]/g, '000000')) || 0
    const posts = parseFloat(erPosts) || 10
    if (!followers || !likes) return
    const er = ((likes + comments + shares) / posts / followers) * 100
    setErResult(Math.round(er * 100) / 100)
  }

  function saveErToPlatform() {
    if (erResult === null || !erCalcPlatform) return
    setSocialLinks(prev => prev.map(s =>
      s.platform === erCalcPlatform
        ? { ...s, engagement_rate: String(erResult) }
        : s
    ))
    setErCalcOpen(false)
    setErResult(null)
    setErFollowers(''); setErLikes(''); setErComments(''); setErShares('')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="iu pf">
      <style>{`
        .pf { max-width: 820px; }
        .pf input:not([type=file]):not([type=checkbox]):not([type=radio]), .pf select { height: 44px; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 0 14px; background: #fff; color: #14123a; font-size: 14px; box-sizing: border-box; }
        .pf textarea { border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 10px 14px; background: #fff; color: #14123a; font-size: 14px; }
        .pf input:focus, .pf select:focus, .pf textarea:focus { border-color: #7040f0; outline: none; box-shadow: 0 0 0 3px rgba(112,64,240,.1); }
        .pf input.pl-9:not([type=file]):not([type=checkbox]):not([type=radio]) { padding-left: 36px; }
        .pf input.pl-7:not([type=file]):not([type=checkbox]):not([type=radio]) { padding-left: 46px; }
        .pf label.block { font-size: 12px; font-weight: 700; color: #4a4770; }
        .pf button.bg-gradient-to-r { min-height: 44px; border-radius: 12px; background: #7040f0; color: #fff; font-weight: 700; border: 0; box-shadow: 0 10px 22px -12px rgba(112,64,240,.7); }
        .pf button.bg-gradient-to-r:hover { background: #5b2fd0; }
        .pf button.bg-gradient-to-r:disabled { opacity: .55; }
        .pf [data-slot=button], .pf button[class*="border-input"] { min-height: 44px; border-radius: 12px; }
        .pf-slug { display: flex; align-items: center; border: 1.5px solid #e5e3f3; border-radius: 12px; overflow: hidden; background: #fff; }
        .pf-slug:focus-within { border-color: #7040f0; box-shadow: 0 0 0 3px rgba(112,64,240,.1); }
        .pf-slug > span { padding: 0 12px; height: 44px; display: flex; align-items: center; background: #f6f6fc; color: #6a6690; font-size: 14px; border-right: 1.5px solid #e5e3f3; }
        .pf .pf-slug input:not([type=file]):not([type=checkbox]):not([type=radio]) { flex: 1; border: 0; border-radius: 0; box-shadow: none; min-width: 0; }
        .pf-niche { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border-radius: 999px; border: 1.5px solid #e5e3f3; background: #fff; color: #4a4770; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .pf-niche.on { background: #7040f0; border-color: #7040f0; color: #fff; }
        .pf-plat { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 14px; border: 1.5px solid #e5e3f3; border-radius: 16px; background: #fff; }
        .pf-plat.on { background: #faf8ff; border-color: #d8ccff; }
        .pf-save { position: sticky; bottom: 0; z-index: 5; display: flex; justify-content: flex-end; padding: 14px 20px; margin: 0 -20px; background: rgba(246,246,252,.94); backdrop-filter: blur(6px); border-top: 1px solid #e5e3f3; }
        .pf-msg { border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; }
        .pf-todo { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        @media (max-width: 767px) { .pf-save { margin: 0 -16px; padding: 12px 16px; bottom: 64px; } .pf-save button { width: 100%; } }
      `}</style>
      <div className="iu-head">
        <div>
          <div className="iu-label" style={{ marginBottom: 6 }}>Profil public</div>
          <h1>Profilul Tău</h1>
          <p className="iu-muted iu-sm" style={{ margin: '6px 0 0' }}>Gestionează profilul tău public și conturile conectate</p>
        </div>
        {slug && <a href={`/influencer/${slug}`} target="_blank" rel="noopener noreferrer" className="iu-btn"><ExternalLink size={15} /> Vezi profilul public</a>}
      </div>

      {/* ── Completitudine profil ───────────────────────────────────────── */}
      {(() => {
        const items = [
          { label: 'Fotografie', done: !!(avatarPreview || avatar) },
          { label: 'Nume', done: !!name.trim() },
          { label: 'Bio', done: !!bio.trim() },
          { label: 'Nișe', done: niches.length > 0 },
          { label: 'Cont social', done: socialLinks.length > 0 || !!igData?.connected },
        ]
        const done = items.filter(i => i.done).length
        const pct = Math.round((done / items.length) * 100)
        return (
          <div className="iu-card iu-card-pad">
            <div className="iu-row" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div>
                <div className="iu-label">Completitudine profil</div>
                <h2 style={{ marginTop: 4 }}>{pct}% completat</h2>
              </div>
              <span className="iu-chip" style={pct === 100 ? { background: '#dcf5ec', color: '#14532d' } : { background: '#efeaff', color: '#5b2fd0' }}>{done}/{items.length}</span>
            </div>
            <div className="iu-bar" style={{ marginBottom: 14 }}><i style={{ width: `${pct}%` }} /></div>
            <div className="iu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {items.map(i => (
                <span key={i.label} className="pf-todo" style={i.done ? { background: '#dcf5ec', color: '#14532d' } : { background: '#f0eff7', color: '#4a4770' }}>
                  {i.done ? <CheckCircle size={13} /> : <Plus size={13} />} {i.label}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Banner rezultat OAuth Instagram ─────────────────────────────── */}
      {igStatus === 'success' && (
        <div className="pf-msg" style={{ background: "#dcf5ec", color: "#14532d", alignItems: "flex-start" }}>
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-green-900">Instagram conectat cu succes!</p>
            <p className="text-green-700">Datele contului tău (followers, engagement, media) au fost sincronizate.</p>
          </div>
        </div>
      )}
      {igStatus === 'error' && (
        <div className="pf-msg" style={{ background: "#fde8e6", color: "#b42318", alignItems: "flex-start" }}>
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-red-900">Conectarea Instagram a eșuat</p>
            <p className="text-red-700">{igErrMsg || 'Încearcă din nou. Dacă problema persistă, contactează-ne.'}</p>
            {igErrDetail && <p className="text-red-700" style={{ fontSize: 11, opacity: 0.8, wordBreak: 'break-word' }}>Cod: {igErrDetail}</p>}
          </div>
        </div>
      )}

      <div className="space-y-5">

        {/* Avatar */}
        <div className="iu-card iu-card-pad">
          <h2 className="mb-5">Fotografie de profil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">{name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="mb-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                {avatarUploading ? 'Se încarcă...' : 'Încarcă Fotografie'}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG sau WEBP. Max 5MB.</p>
              {avatarPreview && (
                <button
                  onClick={() => { setAvatarPreview(null); setAvatar(null) }}
                  className="text-xs text-destructive hover:underline mt-1 block"
                >
                  Șterge fotografia
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="iu-card iu-card-pad">
          <h2 className="mb-5">Informații personale</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nume Complet</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Numele tău" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nume utilizator / Slug</label>
              <div className="pf-slug">
                <span>AddFame.ro/</span>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="numeleTau"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Țară</label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Romania" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                placeholder="Spune brandurilor despre tine..."
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{bio.length}/500</p>
            </div>
          </div>
        </div>

        {/* Niches */}
        <div className="iu-card iu-card-pad">
          <h2 className="mb-2">Nișe & subiecte</h2>
          <p className="text-sm text-muted-foreground mb-4">Selectează subiectele care îți descriu cel mai bine conținutul</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {NICHES_OPTIONS.map(niche => (
              <button
                key={niche}
                type="button"
                onClick={() => niches.includes(niche) ? removeNiche(niche) : addNiche(niche)}
                className={`pf-niche${niches.includes(niche) ? ' on' : ''}`}
              >
                {niche}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Adaugă nișă personalizată..."
              value={nicheInput}
              onChange={e => setNicheInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomNiche() } }}
            />
            <Button type="button" variant="outline" onClick={handleAddCustomNiche}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {niches.filter(n => !NICHES_OPTIONS.includes(n)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {niches.filter(n => !NICHES_OPTIONS.includes(n)).map(niche => (
                <span key={niche} className="pf-niche on" style={{ gap: 6, cursor: 'default' }}>
                  {niche}
                  <button onClick={() => removeNiche(niche)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Social Accounts */}
        <div className="iu-card iu-card-pad">
          <h2 className="mb-2">Conturi sociale</h2>
          <p className="text-sm text-muted-foreground mb-5">Conectează-ți profilurile sociale ca brandurile să te descopere</p>

          <div className="space-y-3">
            {SOCIAL_PLATFORMS.map(platform => {
              const Icon = platform.icon
              const connected = socialLinks.find(s => s.platform === platform.id)
              return (
                <div key={platform.id} className={`pf-plat${connected ? ' on' : ''}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? platform.bg : 'bg-muted'}`}>
                      <Icon className={`w-5 h-5 ${connected ? platform.color : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{platform.label}</p>
                      {platform.id === 'instagram' && igData?.connected ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="text-xs font-black text-gray-800">@{igData?.handle}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{(igData?.followers || 0).toLocaleString()} followers</span>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{igData?.posts} posts</span>
                          {(igData?.engagement || 0) > 0 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ER {igData?.engagement}%</span>}
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">API</span>
                          {igData?.lastSync && <span className="text-xs text-gray-400">Sync: {new Date(igData.lastSync).toLocaleDateString('ro-RO')}</span>}
                        </div>
                      ) : connected ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{connected.url}</p>
                          {connected.followers && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{connected.followers} followers</span>
                          )}
                          {connected.engagement_rate && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ER: {connected.engagement_rate}%</span>
                          )}
                          {connected.avg_views && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{connected.avg_views} views</span>
                          )}
                          {platform.id === 'instagram' && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">manual</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Neconectat</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {connected && (
                      <>
                        <a href={connected.url} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition" style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => removeSocial(platform.id)}
                          className="text-muted-foreground hover:text-destructive transition" style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setErCalcPlatform(platform.id); setErCalcOpen(true); setErResult(null) }}
                          className="iu-btn" style={{ height: 44, padding: '0 12px', fontSize: 12, background: '#efeaff', color: '#5b2fd0', borderColor: '#d8ccff' }}
                          title="Calculează Engagement Rate"
                        >
                          ER %
                        </button>
                      </>
                    )}
                    {platform.id === 'instagram' ? (
                      igData?.connected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={disconnectInstagram}
                        >
                          Deconectează
                        </Button>
                      ) : connected ? (
                        // Are deja intrare manuală — poate edita SAU face upgrade la OAuth
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => { window.location.href = '/api/auth/instagram' }}
                            className="bg-gradient-to-r from-primary to-accent"
                          >
                            Conectează cu API
                          </Button>
                          <button
                            onClick={() => openAddSocial(platform.id)}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Editează manual
                          </button>
                        </div>
                      ) : (
                        // Nimic — arată ambele opțiuni
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => { window.location.href = '/api/auth/instagram' }}
                            className="bg-gradient-to-r from-primary to-accent"
                          >
                            Conectează cu Instagram
                          </Button>
                          <button
                            onClick={() => openAddSocial(platform.id)}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            sau adaugă manual
                          </button>
                        </div>
                      )
                    ) : (
                      <Button
                        variant={connected ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => openAddSocial(platform.id)}
                        className={!connected ? 'bg-gradient-to-r from-primary to-accent' : ''}
                      >
                        {connected ? 'Editează' : 'Conectează'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Prețuri ──────────────────────────────────────────── */}
        {/* Followeri - sincronizati automat din Social Accounts */}

        {/* Prețuri - Coming Soon */}
        <div className="relative rounded-2xl overflow-hidden">
          <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.5 }}>
            <PricingSection
          priceStory={priceStory} setPriceStory={setPriceStory}
          priceReel={priceReel} setPriceReel={setPriceReel}
          pricePost={pricePost} setPricePost={setPricePost}
          priceYoutube={priceYoutube} setPriceYoutube={setPriceYoutube}
          priceMin={priceMin} setPriceMin={setPriceMin}
        />
          </div>
          {/* Coming Soon overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
            <span className="text-3xl mb-2">🔒</span>
            <p className="font-black text-gray-800 text-lg">În curând</p>
            <p className="text-xs text-gray-500 mt-1">Tarifele vor fi disponibile în curând</p>
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="pf-msg" style={{ background: "#fde8e6", color: "#b42318" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <div className="pf-msg" style={{ background: "#dcf5ec", color: "#14532d" }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Profilul a fost salvat!
          </div>
        )}

        <div className="pf-save">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-primary to-accent px-8">
            {saving ? 'Se salvează...' : 'Salvează profilul'}
          </Button>
        </div>
      </div>

      {/* Add Social Modal */}
      {/* ── Engagement Rate Calculator Modal ─────────────────────── */}
      {erCalcOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Calculator Engagement Rate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {erCalcPlatform && SOCIAL_PLATFORMS.find(p => p.id === erCalcPlatform)?.label}
                </p>
              </div>
              <button onClick={() => setErCalcOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Număr followeri *</label>
                <Input placeholder="Ex: 50000 sau 50K" value={erFollowers} onChange={e => setErFollowers(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Total likes (suma ultimelor {erPosts} posturi) *</label>
                <Input placeholder="Ex: 15000 sau 15K" value={erLikes} onChange={e => setErLikes(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Total comentarii</label>
                  <Input placeholder="Ex: 500" value={erComments} onChange={e => setErComments(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Total share-uri</label>
                  <Input placeholder="Ex: 200" value={erShares} onChange={e => setErShares(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">Număr posturi analizate</label>
                <Input placeholder="10" value={erPosts} onChange={e => setErPosts(e.target.value)} />
              </div>
            </div>

            {erResult !== null && (
              <div className={`mt-4 rounded-2xl p-4 text-center border-2 ${erResult >= 6 ? 'bg-green-50 border-green-200' :
                erResult >= 3 ? 'bg-amber-50 border-amber-200' :
                  'bg-red-50 border-red-200'
                }`}>
                <p className={`text-4xl font-black mb-1 ${erResult >= 6 ? 'text-green-600' :
                  erResult >= 3 ? 'text-amber-600' : 'text-red-500'
                  }`}>{erResult}%</p>
                <p className={`text-sm font-bold ${erResult >= 6 ? 'text-green-700' :
                  erResult >= 3 ? 'text-amber-700' : 'text-red-600'
                  }`}>
                  {erResult >= 6 ? '🔥 Excelent — top creator' :
                    erResult >= 3 ? '👍 Bun — peste medie' :
                      erResult >= 1 ? '😐 Mediu — îmbunătățește conținutul' :
                        '⚠️ Scăzut — verifică strategia'}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Medie industrie: TikTok 5-9% · Instagram 1-5% · YouTube 2-5%
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setErCalcOpen(false)}>Anulează</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-accent"
                onClick={calcEngRate}
                disabled={!erFollowers || !erLikes}
              >
                Calculează
              </Button>
            </div>
            {erResult !== null && (
              <Button
                variant="outline"
                className="w-full mt-2 border-green-200 text-green-700 hover:bg-green-50"
                onClick={saveErToPlatform}
              >
                ✓ Salvează {erResult}% pe profil
              </Button>
            )}
          </div>
        </div>
      )}

      {addingSocial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {(() => {
              const platform = SOCIAL_PLATFORMS.find(p => p.id === addingSocial)!
              const Icon = platform.icon
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bg}`}>
                        <Icon className={`w-5 h-5 ${platform.color}`} />
                      </div>
                      <h2 className="text-lg font-bold">Conectează {platform.label}</h2>
                    </div>
                    <button onClick={() => setAddingSocial(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">URL profil</label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder={platform.placeholder}
                          value={socialUrl}
                          onChange={e => setSocialUrl(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Lipește URL-ul complet al profilului</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Număr followeri <span className="text-muted-foreground font-normal">(opțional)</span></label>
                      <Input
                        placeholder="ex. 45K, 1.2M"
                        value={socialFollowers}
                        onChange={e => setSocialFollowers(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Engagement Rate % <span className="text-muted-foreground font-normal">(opțional)</span></label>
                      <Input
                        placeholder="ex. 3.5"
                        value={socialEngRate}
                        onChange={e => setSocialEngRate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Vizualizări medii / post <span className="text-muted-foreground font-normal">(opțional)</span></label>
                      <Input
                        placeholder="ex. 15K, 200K"
                        value={socialAvgViews}
                        onChange={e => setSocialAvgViews(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      onClick={handleAddSocial}
                      disabled={!socialUrl.trim()}
                    >
                      Salvează contul
                    </Button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
