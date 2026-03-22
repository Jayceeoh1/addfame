'use client'
// @ts-nocheck

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Download, Share2, MapPin, Star, CheckCircle,
  Shield, TrendingUp, Award, Users, BarChart2,
  ExternalLink, Copy, Check
} from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'
import Link from 'next/link'

const PLATFORM_CFG = {
  instagram: { icon: InstagramIcon, label: 'Instagram', color: '#E1306C', bg: '#fdf2f8' },
  tiktok: { icon: TikTokSVG, label: 'TikTok', color: '#000', bg: '#f3f4f6' },
  youtube: { icon: YoutubeIcon, label: 'YouTube', color: '#FF0000', bg: '#fff5f5' },
  twitter: { icon: TwitterXIcon, label: 'X / Twitter', color: '#000', bg: '#f9fafb' },
  x: { icon: TwitterXIcon, label: 'X / Twitter', color: '#000', bg: '#f9fafb' },
  linkedin: { icon: LinkedInIcon, label: 'LinkedIn', color: '#0A66C2', bg: '#eff6ff' },
}

function fmtNum(v) {
  const n = typeof v === 'string' ? parseInt(v.replace(/\D/g, '')) : Number(v)
  if (!n || isNaN(n)) return v || '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

export default function MediaKitPage() {
  const { slug } = useParams()
  const [inf, setInf] = useState(null)
  const [stats, setStats] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      // Find by slug — no approval_status restriction (owner must always see their kit)
      const { data } = await sb.from('influencers').select('*').eq('slug', slug).single()
      if (!data) { setLoading(false); return }
      setInf(data)

      // Check if owner
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: own } = await sb.from('influencers').select('id').eq('user_id', user.id).eq('id', data.id).single()
        if (own) setIsOwner(true)
      }

      // Collab stats
      const { data: collabs } = await sb.from('collaborations').select('status, payment_amount').eq('influencer_id', data.id)
      if (collabs) {
        const completed = collabs.filter(c => c.status === 'COMPLETED').length
        const total = collabs.length
        setStats({
          completed, total,
          successRate: total > 0 ? Math.round(completed / total * 100) : 0,
          earned: collabs.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.payment_amount || 0), 0),
        })
      }

      // Reviews
      const { data: collabIds } = await sb.from('collaborations').select('id').eq('influencer_id', data.id)
      if (collabIds?.length) {
        const { data: revs } = await sb.from('reviews').select('rating, comment, created_at').eq('reviewer_role', 'brand').in('collaboration_id', collabIds.map(c => c.id)).limit(3)
        if (revs) setReviews(revs)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadPDF() {
    window.print()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #f0f0f0', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (!inf) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>Profil negăsit</p>
      <Link href="/" style={{ color: '#8b5cf6', marginTop: 12, fontSize: 14 }}>← Înapoi la AddFame</Link>
    </div>
  )

  const totalFollowers = (inf.platforms || []).reduce((s, p) => {
    const n = parseInt(String(p.followers || '0').replace(/\D/g, ''))
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  const avgER = (() => {
    const withER = (inf.platforms || []).filter(p => p.engagement_rate)
    if (!withER.length) return null
    return (withER.reduce((s, p) => s + parseFloat(p.engagement_rate || 0), 0) / withER.length).toFixed(1)
  })()

  const isVerified = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8f7ff; }
        .no-print { }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .page-break { break-before: page; }
          .kit-wrapper { max-width: 100% !important; padding: 0 !important; }
          .kit-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Top bar — no print */}
      <div className="no-print" style={{ background: 'white', borderBottom: '1px solid #f0f0f0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: 16, textDecoration: 'none', color: '#111' }}>
          Add<span style={{ color: '#8b5cf6' }}>Fame</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          {isOwner && (
            <Link href={`/influencer/profile`}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#6b7280', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Editează profilul
            </Link>
          )}
          <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 700, background: 'white', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", color: copied ? '#16a34a' : '#374151' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiat!' : 'Copiază link'}
          </button>
          <button onClick={downloadPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: 'white', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Kit content */}
      <div className="kit-wrapper" style={{ maxWidth: 800, margin: '32px auto', padding: '0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header card */}
        <div className="kit-card" style={{ background: 'white', borderRadius: 24, overflow: 'hidden', marginBottom: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Gradient banner */}
          <div style={{ height: 100, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4,#f97316)', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: -40, left: 32 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, border: '4px solid white', overflow: 'hidden', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                {inf.avatar
                  ? <img src={inf.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={inf.name} />
                  : <span style={{ fontSize: 32, fontWeight: 900, color: '#8b5cf6' }}>{inf.name?.[0]?.toUpperCase()}</span>
                }
              </div>
            </div>
            {/* AddFame watermark */}
            <div style={{ position: 'absolute', bottom: 12, right: 20, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>
              addfame.ro/creator/{slug}
            </div>
          </div>

          <div style={{ padding: '52px 32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: '#111', margin: 0 }}>{inf.name}</h1>
                  {isVerified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 99, padding: '3px 10px' }}>
                      <Star size={10} style={{ fill: '#f59e0b', color: '#f59e0b' }} /> Verified Creator
                    </span>
                  )}
                  {inf.identity_verified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#3730a3', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 99, padding: '3px 10px' }}>
                      <Shield size={10} /> ID verificat
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {inf.country && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6b7280' }}>
                      <MapPin size={13} /> {inf.country}
                    </span>
                  )}
                  {(inf.price_from || inf.price_to) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                      €{inf.price_from || 0} – €{inf.price_to || '?'} / campanie
                    </span>
                  )}
                  {inf.avg_rating > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                      <Star size={13} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                      {inf.avg_rating.toFixed(1)} ({inf.review_count || 0} reviews)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {inf.bio && (
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.7, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f5f5f5' }}>
                {inf.bio}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: Users, label: 'Total followeri', value: totalFollowers > 0 ? fmtNum(totalFollowers) : '—', color: '#2563eb', bg: '#eff6ff' },
            { icon: BarChart2, label: 'Avg ER', value: avgER ? `${avgER}%` : '—', color: '#16a34a', bg: '#f0fdf4' },
            { icon: TrendingUp, label: 'Colaborări', value: stats?.completed || 0, color: '#7c3aed', bg: '#f5f3ff' },
            { icon: Award, label: 'Rată succes', value: stats ? `${stats.successRate}%` : '—', color: '#d97706', bg: '#fffbeb' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="kit-card" style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginTop: 3 }}>{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* Platforms + Niches */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Platforms */}
          {inf.platforms?.length > 0 && (
            <div className="kit-card" style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, margin: '0 0 14px' }}>
                Platforme sociale
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inf.platforms.map((p, i) => {
                  const cfg = PLATFORM_CFG[p.platform?.toLowerCase()] || { label: p.platform, color: '#6b7280', bg: '#f3f4f6', icon: null }
                  const Icon = cfg.icon
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: cfg.bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {Icon && <Icon style={{ width: 16, height: 16, color: cfg.color }} />}
                        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {p.followers && <span style={{ fontSize: 14, fontWeight: 900, color: '#111' }}>{fmtNum(p.followers)}</span>}
                        {p.engagement_rate && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginLeft: 8 }}>ER {p.engagement_rate}%</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Niches + contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inf.niches?.length > 0 && (
              <div className="kit-card" style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>
                  Nișe de conținut
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {inf.niches.map(n => (
                    <span key={n} style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '4px 12px' }}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="kit-card" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', borderRadius: 20, padding: '20px', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: 'white', margin: '0 0 4px' }}>Colaborează cu {inf.name}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '0 0 14px' }}>
                Invită-l la campania ta pe AddFame
              </p>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
                addfame.ro/creator/{slug}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="kit-card" style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px' }}>
              Ce spun brandurile
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${reviews.length}, 1fr)`, gap: 12 }}>
              {reviews.map((r, i) => (
                <div key={i} style={{ background: '#fafafa', borderRadius: 14, padding: '14px', border: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12} style={{ fill: s <= r.rating ? '#f59e0b' : '#e5e7eb', color: s <= r.rating ? '#f59e0b' : '#e5e7eb' }} />
                    ))}
                  </div>
                  {r.comment && <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="no-print" style={{ textAlign: 'center', padding: '16px 0 32px', color: '#9ca3af', fontSize: 12, fontWeight: 600 }}>
          Media kit generat automat de <span style={{ color: '#8b5cf6', fontWeight: 800 }}>AddFame</span> · addfame.ro
        </div>
      </div>
    </>
  )
}
