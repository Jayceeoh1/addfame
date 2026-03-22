'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
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
  const n = typeof v === 'string' ? parseInt(v.replace(/\D/g, '')) : v
  if (isNaN(n)) return String(v)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
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
      <span className="text-sm font-bold text-gray-600">{rating.toFixed(1)}</span>
      {count > 0 && <span className="text-xs text-gray-400">({count} review{count !== 1 ? 's' : ''})</span>}
    </div>
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
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data } = await sb.from('influencers').select('id, slug, name, avatar, cover_image, bio, country, niches, platforms, engagement_rate, avg_views, is_verified, badge_expires_at, approval_status, avg_rating, review_count, price_story, price_reel, price_post, price_youtube, price_min').eq('slug', slug).eq('approval_status', 'approved').single()
      if (!data) { setNotFound(true); setLoading(false); return }
      setInf(data)

      // Load collab stats
      const { data: collabs } = await sb
        .from('collaborations')
        .select('status, payment_amount')
        .eq('influencer_id', data.id)
      if (collabs) {
        const completed = collabs.filter(c => c.status === 'COMPLETED').length
        const total = collabs.length
        const earned = collabs.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.payment_amount || 0), 0)
        setStats({ completed, total, successRate: total > 0 ? Math.round(completed / total * 100) : 0, earned })
      }

      // Load brand reviews
      const { data: revs } = await sb
        .from('reviews')
        .select('rating, comment, created_at')
        .eq('reviewer_role', 'brand')
        .in('collaboration_id',
          (await sb.from('collaborations').select('id').eq('influencer_id', data.id)).data?.map(c => c.id) || []
        )
      if (revs) setReviews(revs)

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-black text-gray-800 text-xl mb-2">Profil negăsit</p>
      <p className="text-sm text-gray-400 mb-6">Acest profil nu există sau nu este aprobat</p>
      <Link href="/" className="text-sm font-bold text-orange-500 hover:text-orange-700 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Înapoi</Link>
    </div>
  )

  const totalFollowers = (inf.platforms || []).reduce((s, p) => {
    const n = parseInt(String(p.followers || '0').replace(/\D/g, ''))
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  const avgRating = inf.avg_rating || 0
  const reviewCount = inf.review_count || 0
  const isVerified = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
  const isIdentityVerified = inf.identity_verified

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white; border:1.5px solid #f0f0f0; border-radius:20px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
      `}</style>

      {/* SEO meta via document title */}
      <title>{inf.name} — Creator pe AddFame</title>

      {/* Header gradient */}
      <div className="h-40 relative" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
        <div className="absolute top-4 left-4">
          <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-bold transition">
            <ArrowLeft className="w-4 h-4" /> AddFame
          </Link>
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={copyLink} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition">
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiat!' : 'Copiază link'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 -mt-20">

        {/* Main profile card */}
        <div className="card p-6 mb-5 fade-up">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex items-end gap-4">
              <div className="relative w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-orange-100 flex-shrink-0" style={{ marginTop: '-32px' }}>
                {inf.avatar
                  ? <img src={inf.avatar} className="w-full h-full object-cover" alt={inf.name} />
                  : <div className="w-full h-full flex items-center justify-center"><span className="font-black text-orange-500 text-3xl">{inf.name?.[0]?.toUpperCase()}</span></div>
                }
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}>
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-black text-gray-900">{inf.name}</h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Verified Creator
                    </span>
                  )}
                  {isIdentityVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      <Shield className="w-3 h-3" /> ID verificat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {inf.country && <span className="flex items-center gap-1 text-sm text-gray-400"><MapPin className="w-3.5 h-3.5" />{inf.country}</span>}
                  {totalFollowers > 0 && <span className="flex items-center gap-1 text-sm font-bold text-gray-600"><Users className="w-3.5 h-3.5 text-blue-400" />{fmtNum(totalFollowers)} followeri</span>}
                  {avgRating > 0 && <StarRow rating={avgRating} count={reviewCount} />}
                </div>
              </div>
            </div>
            {brandId && (
              <button onClick={() => setInviteOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
                <Send className="w-4 h-4" /> Invită la campanie
              </button>
            )}
          </div>

          {inf.bio && <p className="text-sm text-gray-600 leading-relaxed mt-5 pt-5" style={{ borderTop: '1.5px solid #f5f5f5' }}>{inf.bio}</p>}

          {(inf.price_min || inf.price_reel || inf.price_story || inf.price_post || inf.price_youtube) && (
            <div className="mt-4 pt-4" style={{ borderTop: '1.5px solid #f5f5f5' }}>
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Tarife</p>
              <div className="flex flex-wrap gap-2">
                {inf.price_min && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100 text-xs font-black text-orange-700">
                    🎯 Min. €{inf.price_min}/campanie
                  </span>
                )}
                {inf.price_story && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-100 text-xs font-bold text-pink-700">
                    Story €{inf.price_story}
                  </span>
                )}
                {inf.price_reel && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700">
                    Reel €{inf.price_reel}
                  </span>
                )}
                {inf.price_post && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
                    Post €{inf.price_post}
                  </span>
                )}
                {inf.price_youtube && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700">
                    YouTube €{inf.price_youtube}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        {stats && stats.total > 0 && (
          <div className="card p-5 mb-5 fade-up" style={{ animationDelay: '.04s' }}>
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              {[
                { icon: TrendingUp, label: 'Colaborări', value: stats.total, color: 'text-blue-600' },
                { icon: CheckCircle, label: 'Completate', value: stats.completed, color: 'text-green-600' },
                { icon: BarChart2, label: 'Rată succes', value: `${stats.successRate}%`, color: stats.successRate >= 80 ? 'text-green-600' : stats.successRate >= 50 ? 'text-amber-500' : 'text-red-500' },
                { icon: Award, label: 'Câștigat', value: `€${stats.earned.toFixed(0)}`, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="px-4 text-center first:pl-0 last:pr-0">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Social Platforms */}
          {inf.platforms?.length > 0 && (
            <div className="card p-5 fade-up" style={{ animationDelay: '.06s' }}>
              <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-gray-400" /> Platforme sociale
              </h2>
              <div className="space-y-2.5">
                {inf.platforms.map((p, i) => {
                  const cfg = PLATFORM_CFG[p.platform?.toLowerCase()] || { icon: <Globe className="w-4 h-4" />, bg: 'bg-gray-100', text: 'text-gray-600', label: p.platform }
                  const er = p.engagement_rate
                  const views = p.avg_views
                  return (
                    <div key={i} className={`px-3 py-2.5 rounded-xl ${cfg.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2.5 ${cfg.text}`}>
                          {cfg.icon}
                          <span className="font-bold text-sm">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {p.followers && <span className="text-xs font-black text-gray-700">{fmtNum(p.followers)}</span>}
                          {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600"><ExternalLink className="w-3.5 h-3.5" /></a>}
                        </div>
                      </div>
                      {(er || views) && (
                        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-black/5">
                          {er && <span className="text-xs text-gray-500 font-semibold">ER: <span className="text-green-600 font-bold">{er}%</span></span>}
                          {views && <span className="text-xs text-gray-500 font-semibold">Avg views: <span className="text-blue-600 font-bold">{fmtNum(views)}</span></span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Niches */}
          {inf.niches?.length > 0 && (
            <div className="card p-5 fade-up" style={{ animationDelay: '.1s' }}>
              <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" /> Nișe de conținut
              </h2>
              <div className="flex flex-wrap gap-2">
                {inf.niches.map(n => (
                  <span key={n} className="inline-flex items-center gap-1.5 text-sm font-bold bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-full">
                    <Tag className="w-3 h-3" />{n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="card p-5 mt-5 fade-up" style={{ animationDelay: '.14s' }}>
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Reviews de la branduri
              <span className="text-sm font-bold text-gray-400 ml-auto">{reviews.length} total</span>
            </h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(r.created_at).toLocaleDateString('ro-RO', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 italic">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
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
                      style={{ border: `2px solid ${selectedCamp === c.id ? '#f97316' : '#f0f0f0'}`, background: selectedCamp === c.id ? '#fff7ed' : 'white' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedCamp === c.id ? '#f97316' : '#e5e7eb' }} />
                      <span className={`text-sm font-bold ${selectedCamp === c.id ? 'text-orange-600' : 'text-gray-700'}`}>{c.title}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setInviteOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-100 hover:bg-gray-50 transition">Anulează</button>
                  <button onClick={handleInvite} disabled={!selectedCamp || inviting}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition"
                    style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
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
