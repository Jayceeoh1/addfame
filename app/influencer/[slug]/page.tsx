'use client'
import { AvatarWithBadge } from '@/components/shared/CreatorBadge'
// @ts-nocheck
import { parseCount, getTier, formatCount } from '@/lib/tiers'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Globe, MapPin, Tag, Star, ArrowLeft, ExternalLink,
  Send, Shield, CheckCircle, TrendingUp, Award,
  Users, BarChart2, Clock, Copy, Share2
} from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import Link from 'next/link'
import Head from 'next/head'
import CollabPortfolio from '@/components/influencer/CollabPortfolio'

const PLATFORM_CFG = {
  instagram: { icon: <InstagramIcon className="w-5 h-5" />, bg: 'bg-pink-50', text: 'text-pink-600', label: 'Instagram', color: '#E1306C' },
  tiktok: { icon: <TikTokSVG className="w-5 h-5" />, bg: 'bg-gray-100', text: 'text-gray-700', label: 'TikTok', color: '#000' },
  youtube: { icon: <YoutubeIcon className="w-5 h-5" />, bg: 'bg-red-50', text: 'text-red-600', label: 'YouTube', color: '#FF0000' },
  twitter: { icon: <TwitterXIcon className="w-5 h-5" />, bg: 'bg-gray-900/5', text: 'text-gray-900', label: 'X / Twitter', color: '#000' },
  x: { icon: <TwitterXIcon className="w-5 h-5" />, bg: 'bg-gray-900/5', text: 'text-gray-900', label: 'X / Twitter', color: '#000' },
  linkedin: { icon: <LinkedInIcon className="w-5 h-5" />, bg: 'bg-blue-50', text: 'text-blue-700', label: 'LinkedIn', color: '#0A66C2' },
}

function fmtNum(v) {
  if (!v) return null
  const raw = String(v).trim().toLowerCase().replace(/\s/g, '')
  let n: number
  if (raw.endsWith('m')) {
    n = Math.round(parseFloat(raw) * 1_000_000)
  } else if (raw.endsWith('k')) {
    n = Math.round(parseFloat(raw) * 1_000)
  } else {
    n = typeof v === 'number' ? v : parseInt(raw.replace(/\D/g, ''))
  }
  if (isNaN(n)) return String(v)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Brandurile nu primesc link-uri spre conturile de social media ale creatorilor (regula AddFame:
// colaborările se stabilesc doar prin platformă). Pentru ele, postările sunt doar imagini, fără link.
function MaybeLink({ hide, href, children, ...rest }: { hide: boolean; href: string; children: React.ReactNode; [k: string]: any }) {
  return hide
    ? <div {...rest}>{children}</div>
    : <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
}

function getPostPreviewInfo(url: string): { type: 'instagram' | 'tiktok' | 'unknown', embedUrl: string, directUrl: string } | null {
  if (!url) return null
  try {
    const igMatch = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
    if (igMatch) return {
      type: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed/`,
      directUrl: url
    }
    const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
    if (ttMatch) return {
      type: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
      directUrl: url
    }
    return null
  } catch { return null }
}

function getEmbedInfo(url: string): { embedUrl: string; type: 'tiktok' | 'instagram' | 'unknown' } | null {
  if (!url) return null
  try {
    // TikTok: https://www.tiktok.com/@user/video/123
    const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
    if (ttMatch) return { embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`, type: 'tiktok' }
    // Instagram reel: https://www.instagram.com/reel/ABC123/
    const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/)
    if (igMatch) return { embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed/`, type: 'instagram' }
    return null
  } catch { return null }
}

function StarRow({ rating, count }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-sm font-bold text-gray-600">{Number(rating).toFixed(1).replace('.', ',')}</span>
      {count > 0 && <span className="text-xs text-gray-400">({count} {count === 1 ? 'recenzie' : 'recenzii'})</span>}
    </div>
  )
}

// Ce fel de material e un link din portofoliu (pentru plăcuța afișată când nu avem miniatură).
function describeMaterial(url: string): { kind: 'ig' | 'tt' | 'ot'; label: string; source: string; video: boolean } {
  const u = String(url || '').toLowerCase()
  if (u.includes('instagram.com')) {
    if (/\/(reel|reels|tv)\//.test(u)) return { kind: 'ig', label: 'Reel', source: 'Instagram', video: true }
    if (u.includes('/stories/')) return { kind: 'ig', label: 'Story', source: 'Instagram', video: false }
    if (u.includes('/p/')) return { kind: 'ig', label: 'Postare', source: 'Instagram', video: false }
    return { kind: 'ig', label: 'Profil', source: 'Instagram', video: false }
  }
  if (u.includes('tiktok.com')) return { kind: 'tt', label: u.includes('/photo/') ? 'Postare foto' : 'Video', source: 'TikTok', video: !u.includes('/photo/') }
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { kind: 'ot', label: u.includes('/shorts/') ? 'Short' : 'Video', source: 'YouTube', video: true }
  if (u.includes('drive.google.com')) return { kind: 'ot', label: 'Material', source: 'Google Drive', video: false }
  let host = 'Link extern'
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch {}
  return { kind: 'ot', label: 'Material', source: host, video: false }
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} role="img" aria-label={`${Number(value).toFixed(1)} din 5 stele`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} style={{ color: s <= Math.round(value) ? '#f5a524' : '#e2dfec' }} fill={s <= Math.round(value) ? '#f5a524' : '#e2dfec'} />
      ))}
    </span>
  )
}

export default function PublicInfluencerProfile() {
  const { slug } = useParams()
  const [inf, setInf] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCampaigns, setActiveCampaigns] = useState([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedCamp, setSelectedCamp] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invited, setInvited] = useState(false)
  const [brandId, setBrandId] = useState(null)
  // vizitator = brand → fără link-uri spre social media
  const hideSocial = !!brandId
  const [reviews, setReviews] = useState([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  // secțiunea „Colaborări finalizate” include recenziile; lista veche rămâne doar ca rezervă
  const [portfolioOk, setPortfolioOk] = useState(false)
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      // Cauta dupa slug sau dupa id (UUID fallback pentru brand)
      const COLS = 'id, slug, name, avatar, cover_image, bio, country, niches, platforms, engagement_rate, avg_views, is_verified, badge_expires_at, approval_status, avg_rating, review_count, price_story, price_reel, price_post, price_youtube, price_min, creator_score, portfolio_urls, recent_posts_urls'
      // Detectam daca e UUID sau slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug as string)
      const byKey = (q: any) => isUUID ? q.eq('id', slug) : q.eq('slug', slug)

      // 1) profilul public (vederea fără date private)
      let { data, error: viewErr } = await byKey(sb.from('influencers_public').select(COLS)).maybeSingle()
      // 2) tabelul direct: propriul profil, un partener de colaborare sau (până rulează SQL 09) orice profil aprobat
      if (!data) {
        let q = byKey(sb.from('influencers').select(COLS))
        if (!isUUID && viewErr) q = q.eq('approval_status', 'approved')
        ;({ data } = await q.maybeSingle())
      }

      // Fallback: daca RLS blocheaza citirea directa (ex: profil neaprobat dar activ in campanii),
      // incercam prin API public cu service role
      if (!data) {
        try {
          const res = await fetch(`/api/public/influencer-profile?id=${encodeURIComponent(slug as string)}`)
          if (res.ok) {
            const json = await res.json()
            data = json.influencer || null
          }
        } catch {}
      }

      if (!data) { setNotFound(true); setLoading(false); return }
      setInf(data)
      // urmăritorii completați de echipă / Instagram conectat (nu sunt în vederea publică)
      fetch(`/api/influencer-profile?id=${encodeURIComponent(data.id)}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => { const x = j?.influencer; if (x) setInf(prev => prev ? { ...prev, ig_followers: x.ig_followers, tt_followers: x.tt_followers, instagram_followers: x.instagram_followers } : prev) })
        .catch(() => {})

      // Load collab stats (cifre agregate din baza de date; citirea directă doar ca rezervă)
      const { data: statRows, error: statErr } = await sb.rpc('public_collab_stats', { p_influencer_ids: [data.id] })
      if (!statErr && Array.isArray(statRows)) {
        const r: any = statRows[0] || {}
        const completed = Number(r.completed) || 0, accepted = Number(r.accepted) || 0
        setStats({ completed, total: Number(r.total_all) || 0, successRate: accepted > 0 ? Math.round(completed / accepted * 100) : 0, earned: Number(r.earned) || 0 })
      } else {
        const { data: collabs } = await sb
          .from('collaborations')
          .select('status, payment_amount')
          .eq('influencer_id', data.id)
        if (collabs) {
          const completed = collabs.filter(c => c.status === 'COMPLETED').length
          const accepted = collabs.filter(c => c.status !== 'PENDING' && c.status !== 'INVITED').length
          const total = collabs.length // toate aplicarile (inclusiv PENDING/INVITED)
          const earned = collabs.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.payment_amount || 0), 0)
          setStats({ completed, total, successRate: accepted > 0 ? Math.round(completed / accepted * 100) : 0, earned })
        }
      }

      // Load brand reviews
      // SQL 24: recenziile publice (și pentru vizitatori nelogați), cu brandul și campania
      let { data: revRows, error: revErr } = await sb.rpc('influencer_public_reviews', { p_influencer_id: data.id, p_limit: 50 })
      if (revErr) ({ data: revRows, error: revErr } = await sb.rpc('influencer_brand_reviews', { p_influencer_id: data.id, p_limit: 20 }))
      if (!revErr && Array.isArray(revRows)) {
        setReviews(revRows)
      } else {
        const { data: revs } = await sb
          .from('reviews')
          .select('rating, comment, created_at')
          .eq('reviewer_role', 'brand')
          .in('collaboration_id',
            (await sb.from('collaborations').select('id').eq('influencer_id', data.id)).data?.map(c => c.id) || []
          )
        if (revs) setReviews(revs)
      }
      // Fetch thumbnails pentru postari si portfolio
      const allUrls = [
        ...(data.recent_posts_urls || []),
        ...(data.portfolio_urls || []),
      ].filter(Boolean)
      allUrls.forEach((url: string) => {
        fetch(`/api/public/oembed?url=${encodeURIComponent(url)}`)
          .then(r => r.json())
          .then(d => setThumbnails(prev => ({ ...prev, [url]: d.thumbnail_url || null })))
          .catch(() => setThumbnails(prev => ({ ...prev, [url]: null })))
      })

      // Check if viewer is a brand
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
        if (brand) {
          setBrandId(brand.id)
          const { data: camps } = await sb.from('campaigns').select('id, title').eq('brand_id', brand.id).in('status', ['ACTIVE', 'LIVE'])
          setActiveCampaigns(camps || [])
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleInvite() {
    if (!selectedCamp || !brandId || !inf) return
    setInviting(true)
    const sb = createClient()
    await sb.from('collaborations').upsert({ campaign_id: selectedCamp, influencer_id: inf.id, brand_id: brandId, status: 'INVITED' }, { onConflict: 'campaign_id,influencer_id' })
    setInvited(true); setInviting(false)
    setTimeout(() => setInviteOpen(false), 1500)
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-violet-400 border-violet-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center" style={{ fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" }}>
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-black text-gray-800 text-xl mb-2">Profil negăsit</p>
      <p className="text-sm text-gray-400 mb-6">Acest profil nu există sau nu este aprobat</p>
      <Link href="/" className="text-sm font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Înapoi</Link>
    </div>
  )

  // Urmăritori pe platformă: cel mai mare dintre platforms[] și câmpurile completate de echipă / Instagram conectat
  const platList = (inf.platforms || []).filter((p: any) => p && p.platform)
  const igExtra = Math.max(parseCount(inf.ig_followers), parseCount(inf.instagram_followers))
  const ttExtra = parseCount(inf.tt_followers)
  const followersOf = (p: any) => {
    const key = String(p.platform || '').toLowerCase()
    const own = parseCount(p.followers)
    if (key === 'instagram') return Math.max(own, igExtra)
    if (key === 'tiktok') return Math.max(own, ttExtra)
    return own
  }
  const platCards = [...platList]
  if (igExtra > 0 && !platCards.some((p: any) => String(p.platform).toLowerCase() === 'instagram')) platCards.push({ platform: 'instagram' })
  if (ttExtra > 0 && !platCards.some((p: any) => String(p.platform).toLowerCase() === 'tiktok')) platCards.push({ platform: 'tiktok' })
  const totalFollowers = platCards.reduce((s: number, p: any) => s + followersOf(p), 0)
  const tier = getTier(Math.max(0, ...platCards.map(followersOf)))

  const avgRating = inf.avg_rating || 0
  const reviewCount = inf.review_count || 0
  const isVerified = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
  const isIdentityVerified = inf.identity_verified
  const erValues = [inf.engagement_rate, ...platList.map((p: any) => p.engagement_rate)].map(v => parseFloat(String(v ?? '').replace(',', '.'))).filter(v => v > 0)
  const er = erValues.length ? Math.max(...erValues) : 0
  const prices = [
    { k: 'Minim / campanie', v: inf.price_min },
    { k: 'Reel / TikTok', v: inf.price_reel },
    { k: 'Story', v: inf.price_story },
    { k: 'Postare feed', v: inf.price_post },
    { k: 'YouTube', v: inf.price_youtube },
  ].filter(p => p.v)
  const completed = stats?.completed || 0
  const applied = stats?.total || 0
  const ratingAvg = reviews.length ? reviews.reduce((t, r) => t + Number(r.rating || 0), 0) / reviews.length : avgRating
  const ratingCount = reviews.length || reviewCount
  const typesOf = (key: string) => key === 'instagram' ? ['Reel', 'Story', 'Post feed', 'Carousel']
    : key === 'tiktok' ? ['Video TikTok', 'Live TikTok']
    : key === 'youtube' ? ['Video YouTube', 'YouTube Short'] : ['Conținut organic']
  const recentPosts = (inf.recent_posts_urls || []).filter((u: string) => u)
  const clips = (inf.portfolio_urls || []).filter((u: string) => u)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 6)

  return (
    <div className="pf" style={{ fontFamily: "var(--font-body, 'Plus Jakarta Sans'), system-ui, sans-serif" }}>
      <style>{`
        .pf { min-height: 100vh; background: #f5f4fa; color: #14123a; padding: 20px 16px 64px; }
        .pf * { box-sizing: border-box; }
        .pf-wrap { max-width: 1120px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        .pf-card { background: #fff; border: 1px solid #e8e5f3; border-radius: 24px; }
        .pf-pad { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .pf-h2 { margin: 0; font-size: 18px; font-weight: 800; }
        .pf-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
        .pf-back { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; font-size: 14px; font-weight: 700; color: #4a4770; text-decoration: none; }
        .pf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid #e3e0f0; background: #fff; font: inherit; font-size: 14px; font-weight: 700; color: #14123a; cursor: pointer; }
        .pf-btn.p { height: 48px; padding: 0 22px; border: 0; background: #5b2fd0; color: #fff; font-size: 15px; font-weight: 800; border-radius: 14px; }
        .pf-btn.p:hover { background: #4b22c0; }
        .pf-cover { height: 132px; background: #5b2fd0; position: relative; background-size: cover; background-position: center; }
        .pf-cover.dots::after { content: ''; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.14) 1.5px, transparent 1.5px); background-size: 18px 18px; }
        .pf-hero { padding: 0 28px 24px; display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; margin-top: -52px; position: relative; }
        .pf-ava { width: 112px; height: 112px; border-radius: 28px; border: 5px solid #fff; background: #efeaff; overflow: hidden; flex: none; box-shadow: 0 10px 24px -14px rgba(20,18,58,.45); position: relative; }
        .pf-id { flex: 999 1 340px; min-width: 0; display: flex; flex-direction: column; gap: 8px; padding-top: 60px; }
        .pf-name { margin: 0; font-size: 30px; line-height: 1.1; font-weight: 800; letter-spacing: -.02em; overflow-wrap: anywhere; }
        .pf-chip { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 800; }
        .pf-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 14px; color: #5a5780; font-weight: 600; }
        .pf-meta span { display: inline-flex; align-items: center; gap: 6px; }
        .pf-actions { display: flex; gap: 10px; flex-wrap: wrap; flex: 1 1 240px; justify-content: flex-end; }
        .pf-about { padding: 0 28px 24px; display: flex; flex-direction: column; gap: 14px; }
        .pf-bio { margin: 0; font-size: 16px; line-height: 1.6; color: #2c2950; max-width: 62ch; overflow-wrap: anywhere; white-space: pre-line; }
        .pf-niches { display: flex; flex-wrap: wrap; gap: 8px; }
        .pf-niche { height: 32px; padding: 0 12px; border-radius: 999px; background: #f3effe; color: #4b2bb0; font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; }
        .pf-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; }
        .pf-stat { padding: 20px; display: flex; flex-direction: column; gap: 6px; }
        .pf-lab { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6b6890; }
        .pf-big { font-size: 30px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .pf-sub { font-size: 13px; color: #5a5780; }
        .pf-cols { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
        .pf-main { flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
        .pf-side { flex: 1 1 300px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
        .pf-plats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
        .pf-plat { border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 14px; border: 1px solid #e3e3ea; background: #f8f8fa; }
        .pf-plat.ig { border-color: #f1d6e6; background: #fff7fb; }
        .pf-plat-ico { width: 40px; height: 40px; border-radius: 12px; background: #fff; border: 1px solid #ece9f5; display: flex; align-items: center; justify-content: center; flex: none; }
        .pf-num { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .pf-tag { height: 26px; padding: 0 10px; border-radius: 8px; background: #fff; border: 1px solid #e6e3ef; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; }
        .pf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .pf-tile { display: block; position: relative; border-radius: 14px; overflow: hidden; background: #efeaff; aspect-ratio: 4 / 5; max-width: 100%; }
        .pf-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .pf-tile-ph { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; padding: 12px; }
        .pf-tile-ph .ic { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.9); }
        .pf-tile-ph .ic svg { width: 18px; height: 18px; }
        .pf-tile-ph b { font-size: 13px; line-height: 1.25; }
        .pf-tile-ph small { font-size: 11px; font-weight: 700; opacity: .75; }
        .pf-tile.ig .pf-tile-ph { background: #fde9f1; color: #9d1c52; }
        .pf-tile.tt .pf-tile-ph { background: #18162e; color: #fff; }
        .pf-tile.tt .pf-tile-ph .ic { color: #18162e; }
        .pf-tile.ot .pf-tile-ph { background: #efeaff; color: #4423c4; }
        .pf-tile .pf-play { position: absolute; right: 10px; bottom: 10px; width: 30px; height: 30px; border-radius: 999px; background: rgba(255,255,255,.92); color: #14123a; display: flex; align-items: center; justify-content: center; }
        .pf-dark { background: #14123a; color: #fff; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .pf-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
        .pf-row + .pf-row { padding-top: 10px; border-top: 1px solid #f1eff7; }
        .pf-dark .pf-row + .pf-row { border-top-color: rgba(255,255,255,.14); }
        .pf-rev-sum { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; }
        .pf-rev-avg { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 110px; }
        .pf-rev-avg b { font-size: 44px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
        .pf-dist { flex: 1 1 220px; display: flex; flex-direction: column; gap: 6px; }
        .pf-dist-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #5a5780; font-variant-numeric: tabular-nums; }
        .pf-bar { flex: 1; height: 8px; border-radius: 999px; background: #f1eff7; overflow: hidden; }
        .pf-bar i { display: block; height: 100%; background: #f5a524; border-radius: 999px; }
        .pf-revs { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .pf-rev { border: 1px solid #ece9f5; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 12px; background: #fcfbff; }
        .pf-rev-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .pf-rev-logo { width: 40px; height: 40px; border-radius: 12px; background: #efeaff; color: #5b2fd0; font-weight: 800; display: flex; align-items: center; justify-content: center; flex: none; overflow: hidden; }
        .pf-rev-logo img { width: 100%; height: 100%; object-fit: cover; }
        .pf-quote { margin: 0; font-size: 15px; line-height: 1.55; color: #2c2950; overflow-wrap: anywhere; }
        .pf-empty { border: 1px dashed #d9d4ee; border-radius: 16px; padding: 22px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
        .pf-ico { width: 44px; height: 44px; border-radius: 14px; background: #f3effe; color: #5b2fd0; display: flex; align-items: center; justify-content: center; flex: none; }
        @media (max-width: 640px) {
          .pf-hero { padding: 0 18px 20px; } .pf-about { padding: 0 18px 20px; } .pf-pad { padding: 18px; }
          .pf-name { font-size: 26px; } .pf-actions { justify-content: stretch; } .pf-actions .pf-btn { flex: 1 1 auto; }
        }
      `}</style>
      <title>{`${inf.name} — Creator pe AddFame`}</title>

      <div className="pf-wrap">
        <div className="pf-top">
          <Link href={brandId ? '/brand/influencers' : '/'} className="pf-back"><ArrowLeft size={18} /> {brandId ? 'Înapoi la creatori' : 'AddFame'}</Link>
          <button type="button" onClick={copyLink} className="pf-btn">
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}{copied ? 'Copiat!' : 'Copiază link'}
          </button>
        </div>

        {/* Hero */}
        <section className="pf-card" style={{ overflow: 'hidden' }}>
          <div className={`pf-cover ${inf.cover_image ? '' : 'dots'}`} style={inf.cover_image ? { backgroundImage: `url(${inf.cover_image})` } : undefined} />
          <div className="pf-hero">
            <div className="pf-ava">
              <AvatarWithBadge avatarUrl={inf.avatar || undefined} name={inf.name} score={inf.creator_score ?? 0} size={102} />
            </div>
            <div className="pf-id">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <h1 className="pf-name">{inf.name}</h1>
                {tier && <span className="pf-chip" style={{ background: tier.bg, color: tier.fg }}>{tier.label} · {formatCount(Math.max(...platCards.map(followersOf)))}</span>}
                {isVerified && <span className="pf-chip" style={{ background: '#fff1c2', color: '#854d0e' }}><Star size={12} fill="currentColor" /> Verified Creator</span>}
                {isIdentityVerified && <span className="pf-chip" style={{ background: '#e8f0ff', color: '#1d4ed8' }}><Shield size={12} /> ID verificat</span>}
              </div>
              <div className="pf-meta">
                {inf.country && <span><MapPin size={15} />{inf.country}</span>}
                {platCards.map((p: any, i: number) => {
                  const cfg = PLATFORM_CFG[String(p.platform).toLowerCase()]
                  return <span key={i}>{cfg?.icon || <Globe size={15} />}{cfg?.label || p.platform}</span>
                })}
                {ratingAvg > 0 && <span><Star size={15} style={{ color: '#f5a524' }} fill="#f5a524" />{Number(ratingAvg).toFixed(1).replace('.', ',')} ({ratingCount})</span>}
              </div>
            </div>
            {brandId && (
              <div className="pf-actions">
                <button type="button" onClick={() => setInviteOpen(true)} className="pf-btn p"><Send size={16} /> Invită la campanie</button>
              </div>
            )}
          </div>
          {(inf.bio || inf.niches?.length > 0) && (
            <div className="pf-about">
              {inf.bio && <p className="pf-bio">{inf.bio}</p>}
              {inf.niches?.length > 0 && (
                <div className="pf-niches">{inf.niches.map((n: string) => <span key={n} className="pf-niche">{n}</span>)}</div>
              )}
            </div>
          )}
        </section>

        {/* Cifrele importante */}
        <section className="pf-stats" aria-label="Pe scurt">
          <div className="pf-card pf-stat">
            <span className="pf-lab">Audiență totală</span>
            <span className="pf-big">{totalFollowers > 0 ? totalFollowers.toLocaleString('ro-RO') : '—'}</span>
            <span className="pf-sub">{platCards.length ? platCards.map((p: any) => PLATFORM_CFG[String(p.platform).toLowerCase()]?.label || p.platform).join(' + ') : 'Platforme necompletate'}</span>
          </div>
          <div className="pf-card pf-stat">
            <span className="pf-lab">Engagement</span>
            <span className="pf-big">{er > 0 ? `${String(er).replace('.', ',')}%` : '—'}</span>
            <span className="pf-sub">{er > 0 ? 'Rata medie de interacțiune' : 'Încă necalculat'}</span>
          </div>
          <div className="pf-card pf-stat">
            <span className="pf-lab">Rating branduri</span>
            <span className="pf-big">{ratingAvg > 0 ? Number(ratingAvg).toFixed(1).replace('.', ',') : '—'}</span>
            <span className="pf-sub">{ratingCount > 0 ? `${ratingCount} ${ratingCount === 1 ? 'recenzie' : 'recenzii'}` : 'Încă nicio recenzie'}</span>
          </div>
          <div className="pf-card pf-stat">
            <span className="pf-lab">Pe AddFame</span>
            <span className="pf-big">{completed > 0 ? completed : 'Nou'}</span>
            <span className="pf-sub">{completed > 0 ? `${completed === 1 ? 'colaborare finalizată' : 'colaborări finalizate'}` : applied > 0 ? `${applied} ${applied === 1 ? 'aplicare' : 'aplicări'} la campanii` : 'Primele campanii urmează'}</span>
          </div>
        </section>

        <div className="pf-cols">
          <div className="pf-main">

            {/* Platforme */}
            {platCards.length > 0 && (
              <section className="pf-card pf-pad">
                <h2 className="pf-h2">Platforme</h2>
                <div className="pf-plats">
                  {platCards.map((p: any, i: number) => {
                    const key = String(p.platform).toLowerCase()
                    const cfg = PLATFORM_CFG[key] || { icon: <Globe size={18} />, label: p.platform, color: '#14123a' }
                    const f = followersOf(p)
                    const pEr = parseFloat(String(p.engagement_rate ?? '').replace(',', '.'))
                    return (
                      <div key={i} className={`pf-plat ${key === 'instagram' ? 'ig' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                            <span className="pf-plat-ico" style={{ color: cfg.color }}>{cfg.icon}</span>
                            <b style={{ fontSize: 15 }}>{cfg.label}</b>
                          </div>
                          {p.url && !hideSocial && <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Deschide ${cfg.label}`} style={{ color: '#6b6890', display: 'inline-flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={16} /></a>}
                        </div>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}><span className="pf-num">{f > 0 ? f.toLocaleString('ro-RO') : '—'}</span><span className="pf-sub" style={{ fontSize: 12 }}>followeri</span></div>
                          {pEr > 0 && <div style={{ display: 'flex', flexDirection: 'column' }}><span className="pf-num">{String(pEr).replace('.', ',')}%</span><span className="pf-sub" style={{ fontSize: 12 }}>engagement</span></div>}
                          {p.avg_views && <div style={{ display: 'flex', flexDirection: 'column' }}><span className="pf-num">{fmtNum(p.avg_views)}</span><span className="pf-sub" style={{ fontSize: 12 }}>vizualizări medii</span></div>}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {typesOf(key).map(t => <span key={t} className="pf-tag">{t}</span>)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Postări recente + clipuri */}
            {(recentPosts.length > 0 || clips.length > 0) && (
              <section className="pf-card pf-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <h2 className="pf-h2">Portofoliu</h2>
                  <span className="pf-sub">{recentPosts.length + clips.length} {recentPosts.length + clips.length === 1 ? 'material' : 'materiale'}</span>
                </div>
                <div className="pf-grid">
                  {[...clips, ...recentPosts].map((url: string, i: number) => {
                    const info = getPostPreviewInfo(url)
                    const thumb = thumbnails[url]
                    const m = describeMaterial(url)
                    return (
                      <MaybeLink key={url + i} hide={hideSocial} href={url} className={`pf-tile ${m.kind}`}>
                        {thumb
                          ? <img src={thumb} alt={m.label} loading="lazy" />
                          : <div className="pf-tile-ph">
                              <span className="ic" aria-hidden="true">{m.kind === 'ig' ? <InstagramIcon /> : m.kind === 'tt' ? <TikTokSVG /> : <Globe />}</span>
                              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><b>{m.label}</b><small>{m.source}</small></span>
                            </div>}
                        {m.video && <span className="pf-play" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>}
                      </MaybeLink>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Colaborări finalizate: branduri, postări reale și cifrele lor */}
            <CollabPortfolio influencerId={inf.id} onLoaded={setPortfolioOk} />

            {/* Recenzii de la branduri */}
            <section className="pf-card pf-pad" id="recenzii">
              <h2 className="pf-h2">Recenzii de la branduri</h2>
              {reviews.length > 0 ? (
                <>
                  <div className="pf-rev-sum">
                    <div className="pf-rev-avg">
                      <b>{ratingAvg.toFixed(1).replace('.', ',')}</b>
                      <Stars value={ratingAvg} size={16} />
                      <span className="pf-sub" style={{ fontWeight: 700 }}>{reviews.length} {reviews.length === 1 ? 'recenzie' : 'recenzii'}</span>
                    </div>
                    <div className="pf-dist">
                      {[5, 4, 3, 2, 1].map(st => {
                        const n = reviews.filter(r => Math.round(Number(r.rating)) === st).length
                        return (
                          <div key={st} className="pf-dist-row">
                            <span style={{ width: 10, fontWeight: 800 }}>{st}</span>
                            <Star size={12} style={{ color: '#f5a524' }} fill="#f5a524" />
                            <span className="pf-bar"><i style={{ width: `${(n / reviews.length) * 100}%` }} /></span>
                            <span style={{ width: 22, textAlign: 'right' }}>{n}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="pf-revs">
                    {shownReviews.map((r, i) => (
                      <article key={i} className="pf-rev">
                        <div className="pf-rev-head">
                          <span className="pf-rev-logo">{r.brand_logo ? <img src={r.brand_logo} alt="" /> : (r.brand_name || 'B').trim()[0]?.toUpperCase()}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.brand_name || 'Brand verificat'}</b>
                            <span className="pf-sub" style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</span>
                          </div>
                          <span style={{ marginLeft: 'auto' }}><Stars value={Number(r.rating) || 0} size={14} /></span>
                        </div>
                        {r.comment
                          ? <p className="pf-quote">„{r.comment}”</p>
                          : <p className="pf-quote" style={{ color: '#6b6890' }}>A dat {Number(r.rating)} {Number(r.rating) === 1 ? 'stea' : 'stele'}, fără comentariu.</p>}
                        {r.campaign_title && <span className="pf-sub" style={{ fontSize: 12 }}>Campania: <b style={{ color: '#4a4770' }}>{r.campaign_title}</b></span>}
                      </article>
                    ))}
                  </div>
                  {reviews.length > 6 && (
                    <button type="button" onClick={() => setShowAllReviews(v => !v)} className="pf-btn" style={{ alignSelf: 'flex-start' }}>
                      {showAllReviews ? 'Arată mai puține' : `Vezi toate cele ${reviews.length} recenzii`}
                    </button>
                  )}
                </>
              ) : (
                <div className="pf-empty">
                  <span className="pf-ico"><Star size={20} /></span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 240px', minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>Primele recenzii vin după prima colaborare finalizată</b>
                    <span className="pf-sub">{completed > 0 ? 'Brandurile n-au lăsat încă o recenzie.' : 'Creator nou pe AddFame. Poți fi primul brand care lucrează cu el.'}</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="pf-side">
            <section className="pf-dark">
              <h2 className="pf-h2">Tarife orientative</h2>
              {prices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {prices.map(p => (
                    <div key={p.k} className="pf-row"><span style={{ color: '#d6d2f0' }}>{p.k}</span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{p.v} RON</b></div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#d6d2f0', lineHeight: 1.5 }}>Prețul se stabilește în campanie, în funcție de formatul cerut.</p>
              )}
              {brandId && <button type="button" onClick={() => setInviteOpen(true)} className="pf-btn" style={{ height: 48, border: 0, fontSize: 15, fontWeight: 800 }}>Invită la campanie</button>}
              <span style={{ fontSize: 12, color: '#b9b4dc' }}>Plata se face prin AddFame, după aprobarea postării.</span>
            </section>

            <section className="pf-card pf-pad">
              <h2 className="pf-h2">Pe scurt</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tier && <div className="pf-row"><span style={{ color: '#6b6890' }}>Nivel</span><b>{tier.label} ({tier.range})</b></div>}
                {inf.country && <div className="pf-row"><span style={{ color: '#6b6890' }}>Țară</span><b>{inf.country}</b></div>}
                {isIdentityVerified && <div className="pf-row"><span style={{ color: '#6b6890' }}>Identitate</span><b style={{ color: '#14532d' }}>Verificată</b></div>}
                <div className="pf-row"><span style={{ color: '#6b6890' }}>Aplicări</span><b>{applied}</b></div>
                <div className="pf-row"><span style={{ color: '#6b6890' }}>Colaborări finalizate</span><b>{completed}</b></div>
              </div>
            </section>
          </aside>
        </div>
      </div>
      {/* Invite modal */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
            <h2 className="font-black text-gray-900 text-lg mb-1">Invită la campanie</h2>
            <p className="text-sm text-gray-400 mb-5">Selectează campania pentru <span className="font-bold text-gray-600">{inf.name}</span></p>
            {invited ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="font-black text-green-700">Invitație trimisă! ✅</p>
              </div>
            ) : activeCampaigns.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Nu ai campanii active.</p>
                <Link href="/brand/campaigns/new" className="text-sm font-bold text-orange-500 hover:underline">Creează o campanie →</Link>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-5">
                  {activeCampaigns.map(c => (
                    <button key={c.id} onClick={() => setSelectedCamp(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition"
                      style={{ border: `2px solid ${selectedCamp === c.id ? '#5a35e6' : '#f0f0f0'}`, background: selectedCamp === c.id ? '#f5f3ff' : 'white' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedCamp === c.id ? '#5a35e6' : '#e5e7eb' }} />
                      <span className={`text-sm font-bold ${selectedCamp === c.id ? 'text-orange-600' : 'text-gray-700'}`}>{c.title}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setInviteOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-100 hover:bg-gray-50 transition">Anulează</button>
                  <button onClick={handleInvite} disabled={!selectedCamp || inviting}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition"
                    style={{ background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)' }}>
                    {inviting ? 'Se trimite…' : 'Trimite invitația'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
