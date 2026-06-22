'use client'
// @ts-nocheck
import React from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { applyToCampaign } from '@/app/actions/collaborations'
import {
  ArrowLeft, Clock, CheckCircle, AlertCircle, Send,
  Globe, Calendar, Users, Zap, Star, MessageSquare,
  Instagram, Youtube, Tag, Shield, ExternalLink, Hash, Quote
} from 'lucide-react'
import Link from 'next/link'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon } from '@/components/shared/platform-icons'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

export default function CampaignBriefPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [influencerId, setInfluencerId] = useState<string | null>(null)
  const [address, setAddress] = useState({
    name: '', phone: '', address: '', city: '', county: '', postal_code: ''
  })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: inf } = await sb.from('influencers').select('id, blacklisted').eq('user_id', user.id).single()
      if (inf) {
        setInfluencerId(inf.id)
        if (inf.blacklisted) setApplyError('Contul tău este suspendat și nu poți aplica la campanii.')
      }

      const { data: camp, error } = await sb
        .from('campaigns').select('*').eq('id', campaignId).eq('status', 'ACTIVE').single()

      if (error || !camp) { router.replace('/influencer/campaigns'); return }
      setCampaign(camp)

      if (inf) {
        const { data: collab } = await sb.from('collaborations').select('id, status')
          .eq('campaign_id', campaignId).eq('influencer_id', inf.id).maybeSingle()
        if (collab) setAlreadyApplied(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [campaignId, router])

  useEffect(() => { load() }, [load])

  const isBarter = campaign?.campaign_type?.toUpperCase() === 'BARTER'
  const isDelivery = campaign?.delivery_method === 'delivery'
  const needsAddress = isBarter && isDelivery

  async function handleApply() {
    if (!influencerId) { notify('Trebuie să fii logat ca influencer', false); return }
    if (needsAddress && (!address.name || !address.phone || !address.address || !address.city || !address.county)) {
      notify('Completează toate câmpurile adresei de livrare', false); return
    }
    setApplying(true)
    try {
      const result = await applyToCampaign(campaignId, applyMsg || undefined)
      if (result.success) {
        if (needsAddress) {
          const sb = createClient()
          const { data: inf } = await sb.from('influencers').select('id').eq('user_id', (await sb.auth.getUser()).data.user?.id || '').single()
          if (inf) {
            await sb.from('collaborations').update({
              delivery_name: address.name, delivery_phone: address.phone,
              delivery_address: address.address, delivery_city: address.city,
              delivery_county: address.county, delivery_postal_code: address.postal_code,
            }).eq('campaign_id', campaignId).eq('influencer_id', inf.id)
          }
        }
        setApplied(true); setAlreadyApplied(true)
        setShowApplyForm(false)
        notify('✅ Aplicație trimisă! Brandul te va contacta în curând.')
      } else {
        notify(result.error || 'Eroare la aplicare', false)
      }
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setApplying(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  if (!campaign) return null

  const days = daysLeft(campaign.deadline)
  const expired = days < 0
  const urgent = !expired && days <= 3
  const earnings = campaign.budget_per_influencer ? Math.round(campaign.budget_per_influencer * 0.85) : null

  // Parse câmpuri array
  const hashtags: string[] = typeof campaign.required_hashtags === 'string'
    ? campaign.required_hashtags.split(/\s+/).filter(Boolean)
    : Array.isArray(campaign.required_hashtags) ? campaign.required_hashtags : []
  const keyMessages: string[] = Array.isArray(campaign.key_messages) ? campaign.key_messages : []
  const forbiddenMentions: string[] = Array.isArray(campaign.forbidden_mentions) ? campaign.forbidden_mentions : []
  const contentTone: string[] = Array.isArray(campaign.content_tone) ? campaign.content_tone : []
  const linkPlacements: string[] = Array.isArray(campaign.promotion_link_placement) ? campaign.promotion_link_placement : []

  // Story includes din brief
  const storyIncludes = [
    campaign.story_include_instagram && 'Instagram-ul brandului (menționează @handle)',
    campaign.story_include_atmosphere && 'Atmosfera și ambianța locului',
    campaign.story_include_product && (isBarter ? 'Produsul/serviciul primit gratuit' : 'Produsul promovat'),
  ].filter(Boolean) as string[]

  // Toate platformele active
  const hasInstagram = campaign.tasks_stories_count > 0 || campaign.tasks_ig_reel || campaign.tasks_ig_post || campaign.tasks_include_post || campaign.tasks_ig_live
  const hasTikTok = campaign.tasks_tt_video || campaign.tasks_tt_live || campaign.tasks_tt_duet
  const hasYouTube = campaign.tasks_yt_short || campaign.tasks_yt_video || campaign.tasks_yt_mention
  const hasFacebook = campaign.tasks_fb_post || campaign.tasks_fb_story || campaign.tasks_fb_reel || campaign.tasks_fb_share

  return (
    <div className="pb-32" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .card { background: white; border-radius: 16px; border: 1px solid #f0f0f0; }
        .section-label { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; }
        .check-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .check-item:last-child { border-bottom: none; padding-bottom: 0; }
        .check-dot { width: 18px; height: 18px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .platform-header { padding: 9px 14px; background: #f9fafb; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 8px; }
        .platform-block { border: 1px solid #f0f0f0; border-radius: 12px; margin-bottom: 10px; overflow: hidden; }
        .platform-block:last-child { margin-bottom: 0; }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .anim { animation: slideUp .35s ease both; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Back + title */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <Link href="/influencer/campaigns" className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 truncate text-sm">{campaign.title?.replace(/^\[Barter\]\s*\[Barter\]\s*/i, '[Barter] ')}</p>
          <p className="text-xs text-gray-400">{campaign.brand_name}</p>
        </div>
        {alreadyApplied && (
          <span className="flex items-center gap-1.5 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Aplicat
          </span>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-0 pb-4">

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-2xl mb-3">
          {campaign.offer_image_url ? (
            <div className="relative" style={{ height: 220 }}>
              <img src={campaign.offer_image_url} alt={campaign.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.75))' }} />
            </div>
          ) : (
            <div className="relative flex items-end" style={{ height: 180, background: 'linear-gradient(135deg,#1c1033,#3b1d6e)' }}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #9333ea 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            </div>
          )}
          <div className="absolute top-12 left-4 flex gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.92)', color: '#78350f' }}>
              {campaign.campaign_type === 'BARTER' ? '🎁 Barter' : '💰 Plătit'}
            </span>
            {urgent && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>🔥 Urgent</span>}
            {!expired && (campaign.max_influencers || 0) - (campaign.current_influencers || 0) > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.9)', color: '#14532d' }}>
                {(campaign.max_influencers || 0) - (campaign.current_influencers || 0)} locuri rămase
              </span>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{campaign.brand_name}</p>
            <h1 className="font-bold text-white leading-tight" style={{ fontSize: 18 }}>{campaign.title?.replace(/^\[Barter\]\s*\[Barter\]\s*/i, '[Barter] ')}</h1>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-3 anim card mb-3" style={{ animationDelay: '.04s', border: '1px solid #f0f0f0' }}>
          <div className="py-3 px-4 text-center" style={{ borderRight: '1px solid #f0f0f0' }}>
            {isBarter ? (
              <>
                <p className="font-bold text-sm" style={{ color: '#ea580c', margin: 0 }}>{campaign.offer_name || 'Produs gratuit'}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-lg" style={{ color: '#7c3aed', margin: 0 }}>{campaign.budget_per_influencer ? `${campaign.budget_per_influencer} RON` : 'Negociat'}</p>
                <p className="text-xs text-gray-400">recompensă</p>
              </>
            )}
            <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{isBarter ? 'primești' : 'câștig'}</p>
          </div>
          <div className="py-3 px-4 text-center" style={{ borderRight: '1px solid #f0f0f0' }}>
            <p className="font-bold text-lg" style={{ color: expired ? '#dc2626' : urgent ? '#ea580c' : '#111827', margin: 0 }}>
              {expired ? 'Expirat' : `${days}z`}
            </p>
            <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>{fmtDate(campaign.deadline)}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="font-bold text-lg" style={{ color: '#111827', margin: 0 }}>{campaign.current_influencers || 0}/{campaign.max_influencers || '∞'}</p>
            <p style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em' }}>locuri</p>
          </div>
        </div>

        <div className="space-y-3 pt-4">

        {/* ── REZERVARE ── */}
        {campaign.reservation_required && (
          <div className="anim" style={{ animationDelay: '.05s', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>📞</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#c2410c', margin: 0 }}>Rezervare necesară</p>
              <p style={{ fontSize: 12, color: '#ea580c', margin: 0 }}>Trebuie să contactezi brandul înainte de vizită</p>
            </div>
          </div>
        )}

        {/* ── DESPRE CAMPANIE ── */}
        {(campaign.description || campaign.offer_description) && (
          <div className="card p-5 anim" style={{ animationDelay: '.06s' }}>
            <p className="section-label">Despre campanie</p>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.75 }}>{campaign.description || campaign.offer_description}</p>
          </div>
        )}

        {/* ── CE TREBUIE SĂ POSTEZI ── */}
        {(campaign.deliverables || hasInstagram || hasTikTok || hasYouTube || hasFacebook) && (
          <div className="card p-5 anim" style={{ animationDelay: '.07s' }}>
            <p className="section-label">Ce trebuie să postezi</p>

            {campaign.deliverables && (
              <div style={{ background: '#faf5ff', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #e9d5ff' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', margin: 0 }}>{campaign.deliverables}</p>
              </div>
            )}

            {/* INSTAGRAM */}
            {hasInstagram && (
              <div className="platform-block">
                <div className="platform-header">
                  <InstagramIcon className="w-4 h-4" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Instagram</span>
                  {campaign.tasks_ig_days_online && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>online minim {campaign.tasks_ig_days_online} zile</span>}
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {campaign.tasks_stories_count > 0 && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}><strong>{campaign.tasks_stories_count}</strong> Instagram {campaign.tasks_stories_count === 1 ? 'Story' : 'Stories'}</p>
                    </div>
                  )}
                  {campaign.tasks_ig_reel && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Reel{campaign.tasks_ig_reel_duration ? <span style={{ color: '#6b7280' }}> (minim {campaign.tasks_ig_reel_duration} sec)</span> : ''}</p>
                    </div>
                  )}
                  {(campaign.tasks_ig_post || campaign.tasks_include_post) && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Post Feed (foto/carousel)</p>
                    </div>
                  )}
                  {campaign.tasks_ig_live && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Instagram Live</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TIKTOK */}
            {hasTikTok && (
              <div className="platform-block">
                <div className="platform-header">
                  <TikTokSVG className="w-4 h-4" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>TikTok</span>
                  {campaign.tasks_tt_days_online && (
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                      {campaign.tasks_tt_days_online === 9999 ? 'permanent' : `online minim ${campaign.tasks_tt_days_online} zile`}
                    </span>
                  )}
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {campaign.tasks_tt_video && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>TikTok Video{campaign.tasks_tt_video_duration ? <span style={{ color: '#6b7280' }}> (minim {campaign.tasks_tt_video_duration} sec)</span> : ''}</p>
                    </div>
                  )}
                  {campaign.tasks_tt_live && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>TikTok Live</p>
                    </div>
                  )}
                  {campaign.tasks_tt_duet && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Duet / Stitch</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* YOUTUBE */}
            {hasYouTube && (
              <div className="platform-block">
                <div className="platform-header">
                  <YoutubeIcon className="w-4 h-4" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>YouTube</span>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {campaign.tasks_yt_short && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>YouTube Short{campaign.tasks_yt_short_duration ? <span style={{ color: '#6b7280' }}> (minim {campaign.tasks_yt_short_duration} sec)</span> : ''}</p>
                    </div>
                  )}
                  {campaign.tasks_yt_video && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Video lung dedicat{campaign.tasks_yt_video_duration ? <span style={{ color: '#6b7280' }}> (minim {campaign.tasks_yt_video_duration} min)</span> : ''}</p>
                    </div>
                  )}
                  {campaign.tasks_yt_mention && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Mențiune în video existent</p>
                    </div>
                  )}
                  {campaign.tasks_yt_link_in_desc && (
                    <div className="check-item">
                      <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Link în descrierea video</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FACEBOOK */}
            {hasFacebook && (
              <div className="platform-block">
                <div className="platform-header">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#2563eb"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Facebook</span>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  {campaign.tasks_fb_post && <div className="check-item"><div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Post pe pagina personală</p></div>}
                  {campaign.tasks_fb_story && <div className="check-item"><div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Facebook Story</p></div>}
                  {campaign.tasks_fb_reel && <div className="check-item"><div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Facebook Reel</p></div>}
                  {campaign.tasks_fb_share && <div className="check-item"><div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div><p style={{ fontSize: 13, color: '#374151', margin: 0 }}>Share postarea brandului</p></div>}
                </div>
              </div>
            )}

            {/* Zile online general (dacă nu e setat per-platformă) */}
            {campaign.min_days_online > 0 && !campaign.tasks_ig_days_online && !campaign.tasks_tt_days_online && (
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>⏱ Postarea rămâne online minim <strong>{campaign.min_days_online} zile</strong></p>
            )}
          </div>
        )}

        {/* ── STORY INCLUDES (ce să includă în stories) ── */}
        {storyIncludes.length > 0 && (
          <div className="card p-5 anim" style={{ animationDelay: '.08s' }}>
            <p className="section-label">Ce să incluzi în conținut</p>
            {storyIncludes.map((item, i) => (
              <div key={i} className="check-item">
                <div className="check-dot"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg></div>
                <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── LINK DE PROMOVAT ── */}
        {campaign.promotion_link && (
          <div className="anim" style={{ animationDelay: '.09s', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px' }}>
            <p className="section-label" style={{ color: '#15803d' }}>Link de promovat</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', margin: '0 0 10px', wordBreak: 'break-all' }}>{campaign.promotion_link}</p>
            {linkPlacements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {linkPlacements.map((p: string) => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                    {p === 'bio' ? 'Adaugă în bio pe durata campaniei' :
                     p === 'swipeup' ? 'Swipe-up în Stories' :
                     p === 'verbal' ? 'Menționat verbal în video' :
                     p === 'description' ? 'Link în descrierea video (YouTube)' : p}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HASHTAG-URI ── (NOU — lipsea complet) */}
        {hashtags.length > 0 && (
          <div className="anim" style={{ animationDelay: '.095s', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: '14px 16px' }}>
            <p className="section-label" style={{ color: '#6d28d9' }}>Hashtag-uri obligatorii</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {hashtags.map((h: string) => (
                <span key={h} style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '4px 10px', borderRadius: 99 }}>
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── CAPTION OBLIGATORIU ── (NOU — lipsea complet) */}
        {campaign.required_caption && (
          <div className="anim" style={{ animationDelay: '.1s', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 14, padding: '14px 16px' }}>
            <p className="section-label">Caption obligatoriu</p>
            <div style={{ borderLeft: '3px solid #d1d5db', paddingLeft: 12 }}>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>"{campaign.required_caption}"</p>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>📋 Copiază și folosește exact acest text în postarea ta</p>
          </div>
        )}

        {/* ── TON + INSTRUCȚIUNI ── */}
        {(contentTone.length > 0 || campaign.story_instructions) && (
          <div className="anim" style={{ animationDelay: '.11s', background: '#fffbeb', borderRadius: 14, padding: '14px 16px', border: '1px solid #fde68a' }}>
            {contentTone.length > 0 && (
              <div style={{ marginBottom: campaign.story_instructions ? 12 : 0 }}>
                <p className="section-label" style={{ color: '#b45309' }}>Ton dorit</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {contentTone.map((t: string) => (
                    <span key={t} style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            {campaign.story_instructions && (
              <>
                <p className="section-label" style={{ color: '#b45309' }}>Instrucțiuni speciale</p>
                <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.75 }}>{campaign.story_instructions}</p>
              </>
            )}
          </div>
        )}

        {/* ── MESAJE CHEIE ── */}
        {keyMessages.length > 0 && (
          <div className="card p-5 anim" style={{ animationDelay: '.12s' }}>
            <p className="section-label">Mesaje cheie de transmis</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {keyMessages.map((m: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.65 }}>{m}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CE NU E PERMIS ── */}
        {(forbiddenMentions.length > 0 || campaign.forbidden_content) && (
          <div className="anim" style={{ animationDelay: '.13s', background: '#fef2f2', borderRadius: 14, padding: '14px 16px', border: '1px solid #fecaca' }}>
            <p className="section-label" style={{ color: '#b91c1c' }}>🚫 Ce NU este permis</p>
            {forbiddenMentions.length > 0 && (
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 6px' }}>Mențiuni interzise: <strong>{forbiddenMentions.join(', ')}</strong></p>
            )}
            {campaign.forbidden_content && (
              <p style={{ fontSize: 13, color: '#7f1d1d', margin: 0 }}>{campaign.forbidden_content}</p>
            )}
          </div>
        )}

        {/* ── CUM FINALIZEZI ── */}
        <div className="card p-5 anim" style={{ animationDelay: '.14s' }}>
          <p className="section-label">Cum finalizezi colaborarea</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { num: '1', title: 'Aplică la campanie', sub: needsAddress ? 'Completează adresa de livrare' : 'Trimite aplicația ta' },
              isBarter && isDelivery && { num: '2', title: 'Primești produsul acasă', sub: 'Bifează în AddFame că l-ai primit' },
              isBarter && !isDelivery && { num: '2', title: 'Ridică de la locație', sub: campaign.pickup_location_name ? `Locație: ${campaign.pickup_location_name}` : 'Conform detaliilor brandului' },
              { num: isBarter ? '3' : '2', title: `Postează în ${campaign.min_days_online || 5} zile de la primire`, sub: 'Respectă instrucțiunile și hashtag-urile' },
              { num: isBarter ? '4' : '3', title: 'Trimite dovada în AddFame', sub: 'Link postare + screenshot obligatoriu' },
            ].filter(Boolean).map((step: any, i: number, arr: any[]) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: i < arr.length - 1 ? 16 : 0, position: 'relative' }}>
                {i < arr.length - 1 && <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: '#e5e7eb' }} />}
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', border: '1.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#6b7280', zIndex: 1 }}>{step.num}</div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 1px' }}>{step.title}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{step.sub}</p>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: 16, borderTop: '1px dashed #e5e7eb', marginTop: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', margin: '0 0 1px' }}>Colaborare finalizată!</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Brandul aprobă → primești rating și recenzie</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── PLATFORME + LIVRARE ── */}
        <div className="grid grid-cols-2 anim" style={{ animationDelay: '.15s', gap: 10 }}>
          {campaign.platforms?.length > 0 && (
            <div className="card" style={{ padding: '12px 14px' }}>
              <p className="section-label">Platformă</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{campaign.platforms.join(', ')}</p>
            </div>
          )}
          <div className="card" style={{ padding: '12px 14px' }}>
            <p className="section-label">Livrare</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
              {campaign.delivery_method === 'delivery' ? '🚚 Curier la adresă' : `📍 ${campaign.pickup_location_name || 'Ridicare personală'}`}
            </p>
            {campaign.pickup_location_address && campaign.delivery_method !== 'delivery' && (
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>{campaign.pickup_location_address}</p>
            )}
          </div>
        </div>

        {/* ── ÎNSCRIERI ÎNCHISE ── */}
        {campaign?.registrations_open === false && !alreadyApplied && !applied && (
          <div className="anim" style={{ animationDelay: '.16s', background: '#fef2f2', borderRadius: 16, padding: 16, border: '2px solid #fecaca', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🚫</div>
            <p style={{ fontWeight: 700, color: '#b91c1c', fontSize: 14, margin: '0 0 4px' }}>Brandul nu mai acceptă înscrieri</p>
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>Locurile disponibile s-au ocupat pentru această campanie.</p>
          </div>
        )}

        </div>
      </div>

      {/* ── Apply Bar ── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mt-4">
        <div>
          {alreadyApplied || applied ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-50 border-2 border-green-200 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="font-black text-green-700">Ai aplicat deja la această campanie!</p>
            </div>
          ) : showApplyForm ? (
            <div className="space-y-3">
              {needsAddress && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-wide mb-3">📦 Adresă de livrare produs</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={address.name} onChange={e => setAddress(p => ({ ...p, name: e.target.value }))} placeholder="Nume complet *" className="col-span-2 px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                    <input value={address.phone} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon *" className="px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                    <input value={address.postal_code} onChange={e => setAddress(p => ({ ...p, postal_code: e.target.value }))} placeholder="Cod poștal" className="px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                    <input value={address.address} onChange={e => setAddress(p => ({ ...p, address: e.target.value }))} placeholder="Stradă, număr, bloc, ap. *" className="col-span-2 px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                    <input value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} placeholder="Oraș *" className="px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                    <input value={address.county} onChange={e => setAddress(p => ({ ...p, county: e.target.value }))} placeholder="Județ *" className="px-3 py-2.5 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white" />
                  </div>
                </div>
              )}
              <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)}
                placeholder="Mesaj opțional pentru brand — de ce ești potrivit pentru această campanie..."
                rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none" style={{ fontFamily: 'inherit' }} />
              <div className="flex gap-3">
                <button onClick={() => setShowApplyForm(false)} className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
                <button onClick={handleApply} disabled={applying}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}>
                  {applying ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Se trimite…</> : <><Send className="w-4 h-4" />Trimite aplicația</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {earnings && (
                <div className="flex-shrink-0">
                  <p className="text-xs text-gray-400 font-semibold">Câștig net</p>
                  <p className="text-lg font-black text-green-600">{earnings.toLocaleString('ro-RO')} RON</p>
                </div>
              )}
              <button onClick={() => setShowApplyForm(true)}
                disabled={expired || campaign?.registrations_open === false || !!applyError}
                className="flex-1 py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>
                {expired ? 'Campanie expirată' : campaign?.registrations_open === false ? '🚫 Înscrieri închise' : needsAddress ? <><Zap className="w-5 h-5" />Aplică + adresă livrare</> : <><Zap className="w-5 h-5" />Aplică acum</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
