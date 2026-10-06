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
  Instagram, Youtube, Tag, Shield, ExternalLink, Hash, Quote, Ban
} from 'lucide-react'
import Link from 'next/link'
import { CampaignHero, CampaignStats, CampaignSections, CAMPAIGN_CSS, daysLeft, fmtDate } from '../campaign-sections'


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
      // Redirectăm OPEN_CALL la pagina de evenimente
      if (camp.campaign_type === 'OPEN_CALL') { router.replace('/influencer/castinguri/' + campaignId); return }
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
        notify('Aplicație trimisă! Brandul te va contacta în curând.')
      } else {
        notify(result.error || 'Eroare la aplicare', false)
      }
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setApplying(false) }
  }

  if (loading) return (
    <div className="iu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e3f3', borderTopColor: '#7040f0', animation: 'cpspin .8s linear infinite' }} />
      <style>{`@keyframes cpspin { to { transform: rotate(360deg); } }`}</style>
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

  const cleanTitle = campaign.title?.replace(/^\[Barter\]\s*\[Barter\]\s*/i, '[Barter] ')
  const spotsLeft = (campaign.max_influencers || 0) - (campaign.current_influencers || 0)
  const closed = campaign?.registrations_open === false
  const applyDone = alreadyApplied || applied

  return (
    <div className="iu cp">
      <style>{CAMPAIGN_CSS}</style>
      <style>{`
        .cp { max-width: 1120px; }
        .cp-top { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .cp-back { width: 44px; height: 44px; flex: none; padding: 0; }
        .cp-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
        .cp-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .cp-side { display: block; position: sticky; top: 16px; }
        .cp-apply { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
        .cp-addr { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 14px; border-radius: 14px; background: #fff7ed; border: 1px solid #fbdcc0; }
        .cp-addr .iu-input { font-size: 16px; width: 100%; }
        .cp-addr .full { grid-column: 1 / -1; }
        .cp-ta { width: 100%; height: auto; min-height: 84px; padding: 12px 14px; resize: none; font-size: 16px; line-height: 1.5; }
        .cp-toast { position: fixed; top: 76px; right: 20px; z-index: 60; display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 14px; background: #fff; font-size: 14px; font-weight: 700; max-width: 380px; box-shadow: 0 18px 40px -18px rgba(20,18,58,.4); }
        .cp-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: cpspin .8s linear infinite; }
        @keyframes cpspin { to { transform: rotate(360deg); } }
        @media (max-width: 960px) {
          .cp-grid { display: flex; flex-direction: column; align-items: stretch; }
          .cp-side { display: contents; }
        }
        @media (max-width: 767px) {
          .cp-toast { top: 12px; left: 12px; right: 12px; max-width: none; }
          .cp-apply { position: sticky; bottom: var(--mobile-nav-h, 0px); z-index: 20; margin: 0 -16px; border-radius: 20px 20px 0 0; border-bottom: 0; padding: 14px 16px calc(14px + env(safe-area-inset-bottom)); box-shadow: 0 -14px 30px -18px rgba(20,18,58,.35); max-height: 78dvh; overflow-y: auto; }
          .cp-apply .iu-btn { min-height: 48px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="cp-toast" role="status" style={{ border: `1.5px solid ${toast.ok ? '#bfe8d4' : '#f3c9c4'}`, color: toast.ok ? '#14532d' : '#b42318' }}>
          {toast.ok ? <CheckCircle size={16} style={{ flex: 'none' }} /> : <AlertCircle size={16} style={{ flex: 'none' }} />}
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <div className="cp-top">
        <Link href="/influencer/campaigns" className="iu-btn cp-back" aria-label="Înapoi la campanii"><ArrowLeft size={18} /></Link>
        <div className="iu-col" style={{ flex: 1, minWidth: 0 }}>
          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle}</b>
          <span className="iu-xs iu-muted">{campaign.brand_name}</span>
        </div>
        {applyDone && (
          <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}><CheckCircle size={13} /> Aplicat</span>
        )}
      </div>

      {/* ── HERO ── */}
      <CampaignHero c={campaign} applied={applyDone} imageUrl={campaign.offer_image_url} />

      {/* ── STATS ── */}
      <CampaignStats c={campaign} />

      <div className="cp-grid">
        <div className="cp-main">

          <CampaignSections c={campaign} onCopy={(text, msg) => { navigator.clipboard.writeText(text); notify(msg) }} />

          {closed && !alreadyApplied && !applied && (
            <div className="cp-note" style={{ background: '#fff4f2', borderColor: '#f3c9c4', textAlign: 'center', alignItems: 'center', padding: 18 }}>
              <Ban size={26} color="#b42318" />
              <b style={{ color: '#b42318' }}>Brandul nu mai acceptă înscrieri</b>
              <span className="iu-sm" style={{ color: '#b42318' }}>Locurile disponibile s-au ocupat pentru această campanie.</span>
            </div>
          )}
        </div>

        {/* ── Apply (coloană lipicioasă pe desktop, bară jos pe mobil) ── */}
        <div className="cp-side">
          <div className="iu-card cp-apply">
            {applyDone ? (
              <div className="iu-row" style={{ justifyContent: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#dcf5ec', color: '#14532d' }}>
                <CheckCircle size={20} style={{ flex: 'none' }} />
                <b className="iu-sm">Ai aplicat deja la această campanie!</b>
              </div>
            ) : showApplyForm ? (
              <>
                {needsAddress && (
                  <div className="cp-addr">
                    <span className="iu-label full" style={{ color: '#9a4206' }}>Adresă de livrare produs</span>
                    <input className="iu-input full" value={address.name} onChange={e => setAddress(p => ({ ...p, name: e.target.value }))} placeholder="Nume complet *" />
                    <input className="iu-input" value={address.phone} onChange={e => setAddress(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon *" />
                    <input className="iu-input" value={address.postal_code} onChange={e => setAddress(p => ({ ...p, postal_code: e.target.value }))} placeholder="Cod poștal" />
                    <input className="iu-input full" value={address.address} onChange={e => setAddress(p => ({ ...p, address: e.target.value }))} placeholder="Stradă, număr, bloc, ap. *" />
                    <input className="iu-input" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} placeholder="Oraș *" />
                    <input className="iu-input" value={address.county} onChange={e => setAddress(p => ({ ...p, county: e.target.value }))} placeholder="Județ *" />
                  </div>
                )}
                <textarea className="iu-input cp-ta" value={applyMsg} onChange={e => setApplyMsg(e.target.value)}
                  placeholder="Mesaj opțional pentru brand — de ce ești potrivit pentru această campanie..."
                  rows={3} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowApplyForm(false)} className="iu-btn big" style={{ flex: 1 }}>Anulează</button>
                  <button onClick={handleApply} disabled={applying} className="iu-btn p big" style={{ flex: 1.4 }}>
                    {applying ? <><span className="cp-spin" />Se trimite…</> : <><Send size={16} />Trimite aplicația</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                {earnings && (
                  <div className="iu-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                    <span className="iu-sm iu-muted" style={{ fontWeight: 600 }}>Câștig net</span>
                    <b className="iu-d" style={{ fontSize: 22, color: '#14532d' }}>{earnings.toLocaleString('ro-RO')} RON</b>
                  </div>
                )}
                {applyError && (
                  <div className="iu-row iu-sm" style={{ gap: 8, padding: '10px 12px', borderRadius: 12, background: '#fff4f2', border: '1px solid #f3c9c4', color: '#b42318', fontWeight: 700, alignItems: 'flex-start' }}>
                    <AlertCircle size={16} style={{ flex: 'none', marginTop: 2 }} /> {applyError}
                  </div>
                )}
                <button onClick={() => setShowApplyForm(true)}
                  disabled={expired || closed || !!applyError}
                  className="iu-btn p big" style={{ width: '100%' }}>
                  {expired ? 'Campanie expirată' : closed ? 'Înscrieri închise' : needsAddress ? <><Zap size={18} />Aplică + adresă livrare</> : <><Zap size={18} />Aplică acum</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
