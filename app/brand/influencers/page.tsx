'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StarRating } from '@/components/shared/leave-review'
import {
  Search, Filter, Instagram, Youtube, Star, Users, TrendingUp,
  X, ChevronDown, Send, CheckCircle, AlertCircle, Eye,
  Bookmark, BookmarkCheck, SlidersHorizontal, Heart, ExternalLink,
  Lock, Wallet, Zap, ArrowRight, Award, Plus, MapPin, Sparkles, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { INFLUENCER_NICHES } from '@/lib/constants/registration'
import { TIERS, creatorTier } from '@/lib/tiers'
import TierChip from '@/components/shared/TierChip'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Platform = { platform: string; url?: string; followers?: string }

type Influencer = {
  id: string
  user_id: string
  name: string
  slug?: string
  bio: string | null
  avatar: string | null
  niches: string[]
  platforms: Platform[]
  approval_status: string
  is_verified: boolean
  verified_at?: string | null
  total_earned: number
  created_at: string
  price_story?: number | null
  price_reel?: number | null
  price_post?: number | null
  price_youtube?: number | null
  price_min?: number | null
  city?: string | null
  // Instagram
  instagram_connected?: boolean
  instagram_handle?: string
  ig_followers?: number
  ig_engagement_rate?: number
  // TikTok
  tiktok_connected?: boolean
  tt_followers?: number
}

type InfluencerStat = {
  total: number
  completed: number
  successRate: number
  totalEarned: number
}

type Campaign = { id: string; title: string; status: string }

type AccessState =
  | { granted: true }
  | { granted: false; reason: 'no_credits' | 'no_admin_access' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase()
  if (p === 'instagram') return <Instagram className="w-3.5 h-3.5 text-pink-500" />
  if (p === 'tiktok') return <TikTokIcon />
  if (p === 'youtube') return <Youtube className="w-3.5 h-3.5 text-red-500" />
  if (p === 'twitter' || p === 'x') return <span className="text-xs font-bold">𝕏</span>
  if (p === 'linkedin') return <span className="text-[10px] font-bold text-blue-600">in</span>
  return <Star className="w-3.5 h-3.5" />
}

function formatFollowers(val: string | number | undefined): string {
  if (!val) return '—'
  const n = typeof val === 'string' ? parseInt(val.replace(/[^0-9]/g, ''), 10) : val
  if (isNaN(n)) return String(val)
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function totalFollowers(platforms: Platform[] | null | undefined): number {
  if (!platforms) return 0
  return platforms.reduce((sum, p) => {
    const raw = p.followers ?? ''
    const n = parseInt(String(raw).replace(/[^0-9]/g, ''), 10)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
}

const PLATFORM_FILTERS = ['Toate Platformele', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Cele mai noi' },
  { value: 'followers', label: 'Cei mai urmăriți' },
  { value: 'engagement', label: 'Engagement rate' },
  { value: 'success', label: 'Success rate' },
  { value: 'name', label: 'Nume A–Z' },
]

const CREATOR_SCORE_LEVELS = ['Toate nivelurile', 'Starter', 'Rising', 'Pro', 'Elite']

const IF_CSS = `
.if-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
@media(max-width:1023px){.if-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:639px){.if-grid{grid-template-columns:minmax(0,1fr)}}
.if-card{padding:18px;display:flex;flex-direction:column;gap:12px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.if-card:hover{border-color:#c9b9fb;box-shadow:0 14px 30px -20px rgba(90,53,230,.45)}
.if-save{width:44px;height:44px;border-radius:12px;border:1.5px solid #e5e3f3;background:#fff;color:#8783a8;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.if-save.on{background:#efeaff;border-color:#c9b9fb;color:#5a35e6}
.if-stat{background:#f6f6fc;border-radius:12px;padding:10px 12px;min-width:0}
.if-stat b{display:block;font-family:var(--font-display,system-ui),system-ui,sans-serif;font-size:18px;font-weight:800;letter-spacing:-.02em}
.if-ov{position:fixed;inset:0;z-index:50;display:flex;background:rgba(20,18,58,.45);backdrop-filter:blur(3px)}
.if-dr{width:100%;max-width:460px;background:#fff;display:flex;flex-direction:column;overflow-y:auto;box-shadow:-20px 0 50px -20px rgba(20,18,58,.35);color:#14123a;font-family:var(--font-body,system-ui),system-ui,sans-serif}
.if-dr h2,.if-dr h3{font-family:var(--font-display,system-ui),system-ui,sans-serif;margin:0}
.if-sec{padding:20px;border-bottom:1px solid #eeecf7}
.if-sel{width:100%;height:46px;border:1.5px solid #e5e3f3;border-radius:12px;padding:0 12px;font:inherit;font-size:14px;background:#fff;color:#14123a;box-sizing:border-box}
.if-sel.sm{width:auto;height:42px;max-width:100%}
.if-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:767px){.if-filters{grid-template-columns:minmax(0,1fr)}}
.if-toast{position:fixed;bottom:20px;right:16px;left:16px;margin-left:auto;max-width:420px;z-index:60;display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;font-size:14px;font-weight:700;box-shadow:0 18px 40px -18px rgba(20,18,58,.4)}
.if-sheet{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(20,18,58,.45)}
.if-sheet>div{background:#fff;border-radius:24px 24px 0 0;padding:16px 16px 28px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box}
.if-opt{width:100%;display:flex;align-items:center;gap:14px;padding:14px;border-radius:16px;border:1.5px solid #e5e3f3;background:#fff;text-align:left;cursor:pointer;font-family:inherit;color:#14123a;min-height:44px}
.if-opt:hover{border-color:#c9b9fb;background:#faf8ff}
`

// ─── Locked screen ─────────────────────────────────────────────────────────────

const FAKE_INFLUENCERS = [
  { name: 'Alex M.', niches: ['Fashion', 'Lifestyle'], followers: '128K', platform: 'instagram' },
  { name: 'Diana P.', niches: ['Beauty', 'Skincare'], followers: '84K', platform: 'tiktok' },
  { name: 'Mihai R.', niches: ['Tech', 'Gaming'], followers: '210K', platform: 'youtube' },
  { name: 'Sofia L.', niches: ['Travel', 'Food'], followers: '56K', platform: 'instagram' },
  { name: 'Andrei T.', niches: ['Fitness'], followers: '97K', platform: 'tiktok' },
  { name: 'Elena V.', niches: ['Fashion'], followers: '143K', platform: 'instagram' },
]

function FakeCard() {
  const fake = FAKE_INFLUENCERS[Math.floor(Math.random() * FAKE_INFLUENCERS.length)]
  return (
    <div className="bu-card" style={{ padding: 14, userSelect: 'none' }}>
      <div className="bu-row" style={{ gap: 10, marginBottom: 10 }}>
        <div className="bu-face" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', opacity: .4 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, background: '#eeecf7', borderRadius: 6, width: 70, marginBottom: 6 }} />
          <div style={{ height: 8, background: '#f0eff7', borderRadius: 6, width: 44 }} />
        </div>
      </div>
      <div style={{ height: 8, background: '#f0eff7', borderRadius: 6, marginBottom: 6 }} />
      <div style={{ height: 8, background: '#f0eff7', borderRadius: 6, width: '70%', marginBottom: 12 }} />
      <div className="bu-row" style={{ gap: 6, marginBottom: 10 }}>
        {fake.niches.map(n => <span key={n} className="bu-chip" style={{ background: '#efeaff', color: '#4423c4', filter: 'blur(4px)' }}>{n}</span>)}
      </div>
      <div className="if-stat"><b style={{ filter: 'blur(5px)' }}>{fake.followers}</b></div>
    </div>
  )
}

function LockedScreen({ reason }: { reason: 'no_credits' }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="if-grid" style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: .6 }}>
        {Array.from({ length: 6 }).map((_, i) => <FakeCard key={i} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 0' }}>
        <div className="bu-card" style={{ padding: 24, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 30px 60px -30px rgba(20,18,58,.4)' }}>
          <div className="bu-ico" style={{ width: 56, height: 56, margin: '0 auto 14px', background: '#efeaff', color: '#5a35e6' }}>
            <Lock className="w-6 h-6" />
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>Lista de influenceri este blocată</h2>
          <p className="bu-muted bu-sm" style={{ margin: '0 0 18px' }}>
            Pentru a accesa rețeaua completă de creatori ai nevoie de <strong style={{ color: '#14123a' }}>minimum 250 RON credite</strong> în wallet sau aprobare din partea echipei AddFame.
          </p>
          <div className="bu-col" style={{ gap: 10, textAlign: 'left', marginBottom: 16 }}>
            <div className="bu-row" style={{ gap: 12, padding: 12, borderRadius: 14, background: '#fff1e6', flexWrap: 'wrap' }}>
              <div className="bu-ico" style={{ width: 36, height: 36, background: '#fff', color: '#9a4206' }}><Wallet className="w-4 h-4" /></div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#9a4206' }}>Adaugă credite în wallet</p>
                <p className="bu-xs" style={{ margin: 0, color: '#9a4206' }}>Minim 250 RON necesari pentru acces</p>
              </div>
              <Link href="/brand/wallet" className="bu-btn" style={{ height: 44 }}>Adaugă fonduri <ArrowRight className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="bu-row" style={{ gap: 12, padding: 12, borderRadius: 14, background: '#efeaff' }}>
              <div className="bu-ico" style={{ width: 36, height: 36, background: '#fff', color: '#4423c4' }}><Zap className="w-4 h-4" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#4423c4' }}>Aprobare echipă AddFame</p>
                <p className="bu-xs" style={{ margin: 0, color: '#4423c4' }}>Contactează-ne pentru acces rapid</p>
              </div>
            </div>
          </div>
          <p className="bu-muted bu-xs" style={{ margin: 0 }}>Una dintre cele două condiții este suficientă pentru a debloca accesul la rețeaua completă de creatori.</p>
        </div>
      </div>
    </div>
  )
}

function Face({ influencer, size }: { influencer: Influencer; size: number }) {
  return (
    <span className="bu-face" style={{ width: size, height: size, background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', color: '#fff', fontSize: size * 0.4 }}>
      {influencer.avatar
        ? <img src={influencer.avatar} alt={influencer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : influencer.name[0]?.toUpperCase()}
    </span>
  )
}

// ─── Profile Drawer ────────────────────────────────────────────────────────────

function InfluencerDrawer({ influencer, campaigns, savedIds, onClose, onSave, onInvite, stats }: {
  influencer: Influencer; campaigns: Campaign[]; savedIds: Set<string>
  onClose: () => void; onSave: (id: string) => void
  onInvite: (influencerId: string, campaignId: string) => Promise<void>
  stats?: InfluencerStat
}) {
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [inviteState, setInviteState] = useState<{ loading: boolean; success: boolean; error: string | null }>({ loading: false, success: false, error: null })
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'LIVE')
  const isSaved = savedIds.has(influencer.id)
  const totalF = totalFollowers(influencer.platforms)

  async function handleInvite() {
    if (!selectedCampaign) return
    setInviteState({ loading: true, success: false, error: null })
    try {
      await onInvite(influencer.id, selectedCampaign)
      setInviteState({ loading: false, success: true, error: null })
    } catch (err: any) {
      setInviteState({ loading: false, success: false, error: err.message || 'Trimitere eșuată.' })
    }
  }

  const rateColor = stats ? (stats.successRate >= 80 ? '#14532d' : stats.successRate >= 50 ? '#854d0e' : '#b42318') : '#14123a'

  return (
    <div className="if-ov">
      <div style={{ flex: 1, minWidth: 0 }} onClick={onClose} />
      <div className="if-dr">

        <div className="bu-row" style={{ justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #eeecf7', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Profil creator</h2>
          <button onClick={onClose} aria-label="Închide" className="if-save"><X className="w-4 h-4" /></button>
        </div>

        <div className="if-sec">
          <div className="bu-row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <Face influencer={influencer} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>{influencer.name}</h3>
                {influencer.is_verified && (
                  <span className="bu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}><Star className="w-3 h-3" /> Verified Creator</span>
                )}
                {influencer.approval_status === 'approved' && !influencer.is_verified && (
                  <CheckCircle className="w-4 h-4" style={{ color: '#5a35e6' }} />
                )}
                <TierChip of={influencer} />
              </div>
              {influencer.city && (
                <div className="bu-row bu-xs" style={{ gap: 4, marginTop: 4, color: '#5a35e6', fontWeight: 700 }}>
                  <MapPin className="w-3 h-3" /> {influencer.city}
                </div>
              )}
              {influencer.bio && <p className="bu-muted bu-sm" style={{ margin: '8px 0 0' }}>{influencer.bio}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 18 }}>
            <div className="if-stat"><b>{formatFollowers(totalF + (influencer.ig_followers || 0))}</b><span className="bu-muted bu-xs">Reach total</span></div>
            <div className="if-stat"><b>{(influencer.platforms?.length ?? 0) + (influencer.instagram_connected ? 1 : 0)}</b><span className="bu-muted bu-xs">Platforme</span></div>
            <div className="if-stat"><b>{influencer.niches.length}</b><span className="bu-muted bu-xs">Nișe</span></div>
          </div>

          {influencer.is_verified && stats && stats.total > 0 && (
            <div style={{ marginTop: 14, background: '#fff8dc', borderRadius: 16, padding: 14 }}>
              <p className="bu-row" style={{ gap: 6, margin: '0 0 10px', fontWeight: 800, fontSize: 12, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <Award className="w-3.5 h-3.5" /> Istoric colaborări
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 10 }}>
                <div><b className="bu-d" style={{ fontSize: 20, color: '#854d0e' }}>{stats.completed}</b><div className="bu-xs" style={{ color: '#854d0e' }}>Completate</div></div>
                <div><b className="bu-d" style={{ fontSize: 20, color: rateColor }}>{stats.successRate}%</b><div className="bu-xs" style={{ color: '#854d0e' }}>Rată succes</div></div>
                <div><b className="bu-d" style={{ fontSize: 20, color: '#854d0e' }}>{stats.totalEarned.toFixed(0)}</b><div className="bu-xs" style={{ color: '#854d0e' }}>Total câștigat</div></div>
              </div>
              <div className="bu-bar"><i style={{ width: `${stats.successRate}%` }} /></div>
            </div>
          )}
        </div>

        <div className="if-sec">
          <div className="bu-label" style={{ marginBottom: 10 }}>Platforme sociale</div>
          {(influencer.platforms?.length ?? 0) === 0 && !influencer.instagram_connected
            ? <p className="bu-muted bu-sm" style={{ margin: 0 }}>Nicio platformă conectată</p>
            : (
              <div className="bu-col">
                {influencer.instagram_connected && (
                  <div className="bu-row" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eeecf7', gap: 8, flexWrap: 'wrap' }}>
                    <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <Instagram className="w-3.5 h-3.5 text-pink-500" />
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Instagram</span>
                      {influencer.instagram_handle && (
                        <a href={`https://instagram.com/${influencer.instagram_handle}`} target="_blank" rel="noreferrer" style={{ color: '#6a6690' }}><ExternalLink className="w-3 h-3" /></a>
                      )}
                      <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d', height: 20, fontSize: 11 }}>Verificat API</span>
                    </div>
                    <div className="bu-row" style={{ gap: 8 }}>
                      <b className="bu-d">{(influencer.ig_followers || 0).toLocaleString()}</b>
                      {(influencer.ig_engagement_rate ?? 0) > 0 && <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>ER {influencer.ig_engagement_rate}%</span>}
                    </div>
                  </div>
                )}
                {(influencer.platforms ?? []).filter(p => !(p.platform === 'instagram' && influencer.instagram_connected)).map((p, i) => (
                  <div key={i} className="bu-row" style={{ justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eeecf7' }}>
                    <div className="bu-row" style={{ gap: 8 }}>
                      <PlatformIcon platform={p.platform} />
                      <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{p.platform}</span>
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ color: '#6a6690' }}><ExternalLink className="w-3 h-3" /></a>}
                    </div>
                    {p.followers && <b className="bu-d">{formatFollowers(p.followers)}</b>}
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="if-sec">
          <div className="bu-label" style={{ marginBottom: 10 }}>Nișe de conținut</div>
          <div className="bu-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {influencer.niches.length === 0
              ? <p className="bu-muted bu-sm" style={{ margin: 0 }}>Nicio nișă setată</p>
              : influencer.niches.map(n => <span key={n} className="bu-chip" style={{ background: '#efeaff', color: '#4423c4' }}>{n}</span>)}
          </div>
        </div>

        <div className="if-sec" style={{ marginTop: 'auto', borderBottom: 0 }}>
          <div className="bu-label" style={{ marginBottom: 10 }}>Invită la campanie</div>
          {inviteState.success ? (
            <div style={{ background: '#dcf5ec', borderRadius: 16, padding: 16, textAlign: 'center', color: '#14532d' }}>
              <CheckCircle className="w-8 h-8" style={{ margin: '0 auto 6px' }} />
              <p style={{ margin: 0, fontWeight: 800 }}>Invitație trimisă!</p>
              <p className="bu-xs" style={{ margin: '4px 0 12px' }}>Influencerul a fost notificat.</p>
              <button className="bu-btn" onClick={() => setInviteState({ loading: false, success: false, error: null })}>Trimite alta</button>
            </div>
          ) : (
            <>
              {inviteState.error && (
                <div className="bu-row bu-xs" style={{ gap: 8, background: '#fff1e6', color: '#9a4206', borderRadius: 12, padding: 12, marginBottom: 12, fontWeight: 700 }}>
                  <AlertCircle className="w-3.5 h-3.5" style={{ flex: 'none' }} /> {inviteState.error}
                </div>
              )}
              {activeCampaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 16, background: '#f6f6fc', borderRadius: 16 }}>
                  <p className="bu-muted bu-sm" style={{ margin: '0 0 10px' }}>Nu ai campanii active la care să inviți.</p>
                  <Link href="/brand/campaigns/new" className="bu-btn">Creează campanie</Link>
                </div>
              ) : (
                <div className="bu-col" style={{ gap: 10 }}>
                  <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} className="if-sel">
                    <option value="">Selectează o campanie…</option>
                    {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <div className="bu-row" style={{ gap: 8 }}>
                    <button className="bu-btn p big" style={{ flex: 1 }} onClick={handleInvite} disabled={!selectedCampaign || inviteState.loading}>
                      <Send className="w-4 h-4" /> {inviteState.loading ? 'Se trimite…' : 'Trimite invitația'}
                    </button>
                    <button className={`if-save${isSaved ? ' on' : ''}`} style={{ height: 46 }} aria-label="Salvează" onClick={() => onSave(influencer.id)}>
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function InfluencerCard({ influencer, isSaved, onSave, onClick, stats }: {
  influencer: Influencer; isSaved: boolean; onSave: (id: string) => void; onClick: () => void; stats?: InfluencerStat
}) {
  const totalF = totalFollowers(influencer.platforms)
  const reach = totalF + (influencer.instagram_connected && totalF === 0 ? (influencer.ig_followers || 0) : 0)
  const price = influencer.price_min ? `de la ${influencer.price_min} RON / campanie`
    : influencer.price_reel ? `Reel ${influencer.price_reel} RON`
      : influencer.price_story ? `Story ${influencer.price_story} RON` : null
  return (
    <div onClick={onClick} className="bu-card if-card" style={influencer.is_verified ? { borderColor: '#f3d98a' } : undefined}>
      <div className="bu-row" style={{ alignItems: 'flex-start', gap: 12 }}>
        <Face influencer={influencer} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bu-row" style={{ gap: 6 }}>
            <h3 style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{influencer.name}</h3>
            {influencer.approval_status === 'approved' && <CheckCircle className="w-3.5 h-3.5" style={{ color: '#1d4fb8', flex: 'none' }} />}
          </div>
          {influencer.city && (
            <div className="bu-row bu-xs" style={{ gap: 3, color: '#6a6690', marginTop: 2 }}>
              <MapPin className="w-3 h-3" style={{ flex: 'none' }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{influencer.city}</span>
            </div>
          )}
          <div className="bu-row" style={{ gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            {influencer.instagram_connected && (
              <span className="bu-row bu-xs" style={{ gap: 4, fontWeight: 700, color: '#14532d' }}>
                <Instagram className="w-3.5 h-3.5 text-pink-500" /> {(influencer.ig_followers || 0).toLocaleString()}
              </span>
            )}
            {(influencer.platforms ?? []).filter(p => !(p.platform === 'instagram' && influencer.instagram_connected)).slice(0, 2).map((p, i) => (
              <span key={i} className="bu-row bu-xs" style={{ gap: 4, fontWeight: 700, color: '#6a6690' }}>
                <PlatformIcon platform={p.platform} /> {p.followers && formatFollowers(p.followers)}
              </span>
            ))}
          </div>
        </div>
        <button className={`if-save${isSaved ? ' on' : ''}`} aria-label="Salvează" onClick={e => { e.stopPropagation(); onSave(influencer.id) }}>
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      <div className="bu-row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <TierChip of={influencer} />
        {influencer.is_verified && <span className="bu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}><Star className="w-3 h-3" /> Verified</span>}
      </div>

      {influencer.bio && <p className="bu-muted bu-sm" style={{ margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{influencer.bio}</p>}

      {(influencer.niches ?? []).length > 0 && (
        <div className="bu-row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {influencer.niches.slice(0, 3).map(n => <span key={n} className="bu-chip" style={{ background: '#efeaff', color: '#4423c4' }}>{n}</span>)}
          {influencer.niches.length > 3 && <span className="bu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>+{influencer.niches.length - 3}</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
        <div className="if-stat"><b>{totalF > 0 ? formatFollowers(totalF) : reach > 0 ? formatFollowers(reach) : '—'}</b><span className="bu-muted bu-xs">followeri</span></div>
        <div className="if-stat">
          <b>{stats && stats.total > 0 ? `${stats.successRate}%` : (influencer.ig_engagement_rate ?? 0) > 0 ? `${influencer.ig_engagement_rate}%` : '—'}</b>
          <span className="bu-muted bu-xs">{stats && stats.total > 0 ? 'rată succes' : 'engagement'}</span>
        </div>
      </div>

      {price && <div className="bu-sm" style={{ fontWeight: 700 }}><span className="bu-muted" style={{ fontWeight: 600 }}>Tarif · </span>{price}</div>}

      <button onClick={e => { e.stopPropagation(); onClick() }} className="bu-btn p" style={{ height: 44, marginTop: 'auto' }}>
        <Eye className="w-4 h-4" /> Vezi profilul · Invită
      </button>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BrandInfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [access, setAccess] = useState<AccessState | null>(null)
  const [statsMap, setStatsMap] = useState<Record<string, InfluencerStat>>({})
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('Toate Platformele')
  const [nicheFilter, setNicheFilter] = useState('Toate Nișele')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [minFollowers, setMinFollowers] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [maxFollowers, setMaxFollowers] = useState('')
  const [scoreFilter, setScoreFilter] = useState('Toate nivelurile')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [tierFilter, setTierFilter] = useState<string[]>([])
  const [aiRecs, setAiRecs] = useState<any[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedCampaignForAI, setSelectedCampaignForAI] = useState<string>('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showCampaignSheet, setShowCampaignSheet] = useState(false)
  const router = useRouter()

  useEffect(() => { fetchAll() }, [])

  async function getAIRecommendations() {
    if (!selectedCampaignForAI) { setAiError('Selectează o campanie mai întâi'); return }
    setAiLoading(true)
    setAiError(null)
    setAiRecs([])
    const campaign = campaigns.find(c => c.id === selectedCampaignForAI)
    if (!campaign) return
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recommend',
          data: {
            campaign: { title: campaign.title, type: campaign.campaign_type, platforms: campaign.platforms, min_followers: campaign.min_followers_target, description: campaign.offer_description, niche: campaign.target_niche },
            influencers: influencers.map(i => ({ name: i.name, niches: i.niches, city: i.city, ig_followers: i.ig_followers, ig_engagement_rate: i.ig_engagement_rate, tt_followers: i.tt_followers, is_verified: i.is_verified }))
          }
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiRecs(data.recommendations || [])
      setAiSummary(data.summary || '')
    } catch (e: any) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  async function fetchAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brand } = await supabase
        .from('brands')
        .select('id, credits_balance, influencers_access')
        .eq('user_id', user.id)
        .single()
      if (!brand) return
      setBrandId(brand.id)

      const hasCredits = (brand.credits_balance ?? 0) >= 250
      const adminAccess = brand.influencers_access === true

      const accessState: AccessState = (hasCredits || adminAccess)
        ? { granted: true }
        : { granted: false, reason: 'no_credits' }
      setAccess(accessState)

      if (accessState.granted) {
        const INF_COLS = 'id, user_id, name, slug, bio, avatar, niches, platforms, approval_status, is_verified, verified_at, total_earned, created_at, price_story, price_reel, price_post, price_youtube, price_min, city, instagram_connected, instagram_handle, ig_followers, ig_engagement_rate, tiktok_connected, tt_followers'
        // Profilurile publice (vederea fără date private); tabelul direct doar ca rezervă până rulează SQL 09
        let [infRes, campRes] = await Promise.all([
          supabase.from('influencers_public').select(INF_COLS).order('created_at', { ascending: false }),
          supabase.from('campaigns').select('id, title, status').eq('brand_id', brand.id),
        ])
        if (infRes.error) {
          infRes = await supabase.from('influencers').select(INF_COLS).eq('approval_status', 'approved').order('created_at', { ascending: false })
        }

        setInfluencers((infRes.data as Influencer[]) ?? [])
        setCampaigns((campRes.data as Campaign[]) ?? [])

        // Statistici agregate (doar cifre) — funcția din baza de date; citirea directă doar ca rezervă
        const infIds = ((infRes.data as any[]) ?? []).map((i: any) => i.id)
        const { data: statRows, error: statErr } = infIds.length
          ? await supabase.rpc('public_collab_stats', { p_influencer_ids: infIds })
          : { data: [], error: null }
        if (!statErr && Array.isArray(statRows)) {
          const sMap: Record<string, InfluencerStat> = {}
          for (const r of statRows as any[]) {
            const total = Number(r.total_main) || 0, completed = Number(r.completed) || 0
            sMap[r.influencer_id] = { total, completed, totalEarned: Number(r.earned) || 0, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
          }
          setStatsMap(sMap)
        } else {
          const { data: collabs } = await supabase
            .from('collaborations')
            .select('influencer_id, status, payment_amount')
            .in('status', ['COMPLETED', 'ACTIVE', 'PENDING', 'CANCELLED'])
          if (collabs) {
            const sMap: Record<string, InfluencerStat> = {}
            for (const c of collabs) {
              if (!sMap[c.influencer_id]) sMap[c.influencer_id] = { total: 0, completed: 0, successRate: 0, totalEarned: 0 }
              sMap[c.influencer_id].total++
              if (c.status === 'COMPLETED') {
                sMap[c.influencer_id].completed++
                sMap[c.influencer_id].totalEarned += c.payment_amount || 0
              }
            }
            for (const id in sMap) {
              const s = sMap[id]
              s.successRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
            }
            setStatsMap(sMap)
          }
        }

        const { data: savedData } = await supabase.from('saved_influencers').select('influencer_id').eq('brand_id', brand.id)
        if (savedData) setSavedIds(new Set(savedData.map((s: any) => s.influencer_id)))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function handleInvite(influencerId: string, campaignId: string) {
    const { inviteInfluencer } = await import('@/app/actions/collaborations')
    const result = await inviteInfluencer(influencerId, campaignId)
    if (result.error) throw new Error(result.error)
    const inf = influencers.find(i => i.id === influencerId)
    showToastMsg(`Invitație trimisă către ${inf?.name}! 🎯`, 'success')
  }

  function showToastMsg(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function toggleSave(id: string) {
    const isSaved = savedIds.has(id)
    setSavedIds(prev => { const next = new Set(prev); isSaved ? next.delete(id) : next.add(id); return next })
    try {
      const supabase = createClient()
      if (isSaved) await supabase.from('saved_influencers').delete().eq('brand_id', brandId).eq('influencer_id', id)
      else await supabase.from('saved_influencers').insert({ brand_id: brandId, influencer_id: id })
    } catch {
      setSavedIds(prev => { const next = new Set(prev); isSaved ? next.add(id) : next.delete(id); return next })
    }
  }

  useEffect(() => { setCurrentPage(1) }, [search, platformFilter, sortBy, showSavedOnly, cityFilter, minFollowers, maxFollowers, scoreFilter, verifiedOnly, nicheFilter, tierFilter])

  // Câți creatori are fiecare categorie (doar Instagram conectat)
  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of influencers) { const t = creatorTier(i); if (t) c[t.key] = (c[t.key] || 0) + 1 }
    return c
  }, [influencers])
  const toggleTier = (k: string) => setTierFilter(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])

  // Normalizare pentru filtrare oraș
  const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const displayed = useMemo(() => {
    let list = [...influencers]
    if (showSavedOnly) list = list.filter(i => savedIds.has(i.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.bio?.toLowerCase().includes(q) || i.niches.some(n => n.toLowerCase().includes(q)))
    }
    if (platformFilter !== 'Toate Platformele') {
      list = list.filter(i => (i.platforms ?? []).some(p => p.platform.toLowerCase() === platformFilter.toLowerCase()))
    }
    if (nicheFilter !== 'Toate Nișele') list = list.filter(i => i.niches.includes(nicheFilter))
    if (minFollowers) {
      const min = parseInt(minFollowers.replace(/[^0-9]/g, ''), 10) * 1000
      list = list.filter(i => totalFollowers(i.platforms) >= min)
    }
    if (maxFollowers) {
      const max = parseInt(maxFollowers.replace(/[^0-9]/g, ''), 10) * 1000
      list = list.filter(i => totalFollowers(i.platforms) <= max)
    }
    if (verifiedOnly) list = list.filter(i => i.is_verified)
    if (tierFilter.length) list = list.filter(i => { const t = creatorTier(i); return !!t && tierFilter.includes(t.key) })
    if (scoreFilter !== 'Toate nivelurile') {
      const scoreMap: Record<string, number[]> = {
        'Starter': [0, 199],
        'Rising': [200, 499],
        'Pro': [500, 999],
        'Elite': [1000, 99999],
      }
      const [min, max] = scoreMap[scoreFilter] || [0, 99999]
      list = list.filter(i => {
        const score = (i as any).creator_score ?? 0
        return score >= min && score <= max
      })
    }
    // Filtrare după oraș
    if (cityFilter.trim()) {
      const q = normalizeStr(cityFilter)
      list = list.filter(i => i.city && normalizeStr(i.city).includes(q))
    }
    if (sortBy === 'followers') list.sort((a, b) => totalFollowers(b.platforms) - totalFollowers(a.platforms))
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === 'engagement') list.sort((a, b) => (b.ig_engagement_rate || 0) - (a.ig_engagement_rate || 0))
    else if (sortBy === 'success') list.sort((a, b) => (statsMap[b.id]?.successRate || 0) - (statsMap[a.id]?.successRate || 0))
    list.sort((a, b) => {
      if (a.is_verified && !b.is_verified) return -1
      if (!a.is_verified && b.is_verified) return 1
      return 0
    })
    return list
  }, [influencers, search, platformFilter, nicheFilter, sortBy, minFollowers, maxFollowers, cityFilter, showSavedOnly, savedIds, scoreFilter, verifiedOnly, statsMap, tierFilter])

  const activeFilterCount = [
    platformFilter !== 'Toate Platformele',
    nicheFilter !== 'Toate Nișele',
    minFollowers !== '',
    maxFollowers !== '',
    showSavedOnly,
    cityFilter !== '',
    scoreFilter !== 'Toate nivelurile',
    verifiedOnly,
    tierFilter.length > 0,
  ].filter(Boolean).length

  if (loading) return (
    <div className="bu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#5a35e6' }} />
    </div>
  )

  const resetFilters = () => { setPlatformFilter('Toate Platformele'); setNicheFilter('Toate Nișele'); setMinFollowers(''); setMaxFollowers(''); setShowSavedOnly(false); setCityFilter(''); setScoreFilter('Toate nivelurile'); setVerifiedOnly(false); setTierFilter([]) }
  const totalPages = Math.max(1, Math.ceil(displayed.length / ITEMS_PER_PAGE))

  return (
    <div className="bu">
      <style>{IF_CSS}</style>
      {toast && (
        <div className="if-toast" style={toast.type === 'success' ? { background: '#dcf5ec', color: '#14532d' } : { background: '#fff1e6', color: '#9a4206' }}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bu-head">
        <div>
          <h1>Influenceri</h1>
          <p className="bu-muted" style={{ margin: '6px 0 0' }}>
            {access?.granted ? `${influencers.length} creator${influencers.length !== 1 ? 'i' : ''} pe platformă` : 'Descoperă rețeaua completă de creatori'}
          </p>
        </div>
        <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {access?.granted && (
            <button onClick={() => setShowSavedOnly(v => !v)} className={`bu-pill${showSavedOnly ? ' on' : ''}`} style={{ height: 44 }}>
              <Bookmark className="w-4 h-4" /> Salvați{savedIds.size > 0 && <span className="n">{savedIds.size}</span>}
            </button>
          )}
          <button onClick={() => setShowCampaignSheet(true)} className="bu-btn p big">
            <Plus className="w-4 h-4" /> Campanie nouă
          </button>
        </div>
      </div>

      {/* Campaign sheet */}
      {showCampaignSheet && (
        <div className="if-sheet" onClick={() => setShowCampaignSheet(false)}>
          <div onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#e5e3f3', borderRadius: 99, margin: '0 auto 16px' }} />
            <div className="bu-label" style={{ textAlign: 'center', marginBottom: 14 }}>Cum vrei să creezi campania?</div>

            <button onClick={() => { setShowCampaignSheet(false); router.push('/brand/campaigns/new/wizard') }} className="if-opt" style={{ marginBottom: 12, borderColor: '#c9b9fb', background: '#faf8ff' }}>
              <span className="bu-ico" style={{ background: '#efeaff', color: '#5a35e6' }}><Zap className="w-5 h-5" /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <b className="bu-d" style={{ fontSize: 16 }}>Rapid — Wizard</b>
                  <span className="bu-chip" style={{ background: '#5a35e6', color: '#fff', height: 20, fontSize: 10 }}>RECOMANDAT</span>
                </span>
                <span className="bu-muted bu-sm">Pas cu pas, gata în 5 minute</span>
              </span>
              <ArrowRight className="w-4 h-4" style={{ color: '#8783a8', flex: 'none' }} />
            </button>

            <div className="bu-muted bu-xs" style={{ textAlign: 'center', marginBottom: 10 }}>sau alege tipul manual</div>
            <div className="bu-row" style={{ gap: 10 }}>
              <button onClick={() => { setShowCampaignSheet(false); router.push('/brand/campaigns/new/barter') }} className="if-opt" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ minWidth: 0 }}>
                  <b className="bu-d" style={{ display: 'block' }}>Barter</b>
                  <span className="bu-muted bu-xs">Produs gratuit</span>
                </span>
              </button>
              <button onClick={() => { setShowCampaignSheet(false); router.push('/brand/campaigns/new') }} className="if-opt" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ minWidth: 0 }}>
                  <b className="bu-d" style={{ display: 'block' }}>Plătită</b>
                  <span className="bu-muted bu-xs">Cash per post</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {access && !access.granted ? (
        <LockedScreen reason='no_credits' />
      ) : (
        <>
          {/* AI Recomandări */}
          {campaigns.length > 0 && (
            <div className="bu-card bu-card-pad" style={{ background: '#faf8ff', borderColor: '#d9ccfb' }}>
              <div className="bu-row" style={{ gap: 12, marginBottom: 14 }}>
                <div className="bu-ico" style={{ background: '#efeaff', color: '#5a35e6' }}><Sparkles className="w-4 h-4" /></div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 16 }}>Recomandări AI</h3>
                  <p className="bu-muted bu-xs" style={{ margin: 0 }}>Claude analizează campania și găsește cei mai potriviți influenceri</p>
                </div>
              </div>
              <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={selectedCampaignForAI}
                  onChange={e => { setSelectedCampaignForAI(e.target.value); setAiRecs([]); setAiSummary('') }}
                  className="if-sel" style={{ flex: '1 1 220px', width: 'auto', minWidth: 0 }}
                >
                  <option value="">Selectează campania...</option>
                  {campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'DRAFT').map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <button onClick={getAIRecommendations} disabled={aiLoading || !selectedCampaignForAI} className="bu-btn p big">
                  {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Se analizează...</> : <><Sparkles className="w-3.5 h-3.5" /> Găsește potriviri</>}
                </button>
              </div>
              {aiError && <p className="bu-xs" style={{ color: '#9a4206', fontWeight: 700, margin: '10px 0 0' }}>{aiError}</p>}
              {aiSummary && <p className="bu-sm" style={{ margin: '12px 0 0', background: '#fff', border: '1px solid #e5e3f3', borderRadius: 12, padding: '10px 12px', color: '#4423c4', fontWeight: 600 }}>{aiSummary}</p>}
              {aiRecs.length > 0 && (
                <div className="bu-col" style={{ gap: 8, marginTop: 12 }}>
                  {aiRecs.map((rec, i) => {
                    const inf = influencers.find(inf => inf.name === rec.name)
                    return (
                      <div key={i} className="bu-row" style={{ alignItems: 'flex-start', gap: 12, background: '#fff', border: '1px solid #e5e3f3', borderRadius: 14, padding: '10px 12px' }}>
                        <span className="bu-face" style={{ width: 28, height: 28, background: '#efeaff', color: '#4423c4', fontSize: 12 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <b className="bu-d" style={{ fontSize: 15 }}>{rec.name}</b>
                            <span className="bu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>Match {rec.score}%</span>
                          </div>
                          <p className="bu-muted bu-xs" style={{ margin: '3px 0 0' }}>{rec.reason}</p>
                        </div>
                        {inf && (
                          <button onClick={() => setSelectedInfluencer(inf)} className="bu-btn" style={{ height: 44, flex: 'none' }}>Vezi →</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Search + filter bar */}
          <div className="bu-card bu-card-pad">
            <div className="bu-row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <label className="bu-search" style={{ flex: '1 1 260px', height: 44 }}>
                <Search className="w-4 h-4" style={{ flex: 'none' }} />
                <input type="text" placeholder="Caută după nume, bio sau nișă…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Șterge" style={{ border: 0, background: 'none', color: '#8783a8', cursor: 'pointer', padding: 8 }}><X className="w-3.5 h-3.5" /></button>}
              </label>
              <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} className="if-sel sm" style={{ height: 44 }}>
                {PLATFORM_FILTERS.map(p => <option key={p}>{p}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="if-sel sm" style={{ height: 44 }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={() => setShowFilters(v => !v)} className={`bu-pill${activeFilterCount > 0 || showFilters ? ' on' : ''}`} style={{ height: 44 }}>
                <SlidersHorizontal className="w-4 h-4" /> Filtre
                {activeFilterCount > 0 && <span className="n">{activeFilterCount}</span>}
              </button>
            </div>

            {/* Categorie (Nano … Mega), din urmăritorii de pe Instagram verificat */}
            <div style={{ marginTop: 14 }}>
              <div className="bu-label" style={{ marginBottom: 8 }}>Categorie</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
                <button type="button" onClick={() => setTierFilter([])} className={`bu-pill${tierFilter.length === 0 ? ' on' : ''}`} style={{ height: 40, flex: '0 0 auto' }}>Toate</button>
                {TIERS.map(t => {
                  const on = tierFilter.includes(t.key)
                  return (
                    <button key={t.key} type="button" onClick={() => toggleTier(t.key)} aria-pressed={on} title={`${t.range} urmăritori`}
                      className={`bu-pill${on ? ' on' : ''}`} style={{ height: 40, flex: '0 0 auto', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.dot, flex: 'none' }} />
                      {t.label}
                      {(tierCounts[t.key] || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: t.bg, color: t.fg }}>{tierCounts[t.key]}</span>}
                    </button>
                  )
                })}
              </div>
              {tierFilter.length > 0 && (
                <p className="bu-muted bu-xs" style={{ margin: '8px 0 0' }}>
                  {tierFilter.map(k => TIERS.find(t => t.key === k)).filter(Boolean).map(t => `${t!.label}: ${t!.range}`).join(' · ')} urmăritori · include și nivelurile estimate din numărul introdus de creator
                </p>
              )}
            </div>

            {showFilters && (
              <div className="bu-div" style={{ marginTop: 16, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="if-filters">
                  <div>
                    <div className="bu-label" style={{ marginBottom: 8 }}>Nișă</div>
                    <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)} className="if-sel">
                      <option>Toate Nișele</option>
                      {INFLUENCER_NICHES.map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="bu-label" style={{ marginBottom: 8 }}>Oraș</div>
                    <label className="bu-search" style={{ height: 46 }}>
                      <MapPin className="w-3.5 h-3.5" style={{ flex: 'none' }} />
                      <input type="text" placeholder="ex. București, Cluj, Iași..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
                      {cityFilter && <button type="button" onClick={() => setCityFilter('')} aria-label="Șterge" style={{ border: 0, background: 'none', color: '#8783a8', cursor: 'pointer', padding: 8 }}><X className="w-3 h-3" /></button>}
                    </label>
                  </div>
                  <div>
                    <div className="bu-label" style={{ marginBottom: 8 }}>Creator Score</div>
                    <div className="bu-tabs">
                      {CREATOR_SCORE_LEVELS.map(level => (
                        <button key={level} onClick={() => setScoreFilter(level)} className={`bu-pill${scoreFilter === level ? ' on' : ''}`} style={{ height: 44 }}>
                          {level === 'Toate nivelurile' ? 'Toate' : level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="if-filters">
                  <div>
                    <div className="bu-label" style={{ marginBottom: 8 }}>Followeri minimi (K)</div>
                    <input type="number" className="bu-input" style={{ width: '100%', height: 46 }} placeholder="ex. 5 = 5.000+" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} />
                  </div>
                  <div>
                    <div className="bu-label" style={{ marginBottom: 8 }}>Followeri maximi (K)</div>
                    <input type="number" className="bu-input" style={{ width: '100%', height: 46 }} placeholder="ex. 100 = max 100.000" value={maxFollowers} onChange={e => setMaxFollowers(e.target.value)} />
                  </div>
                  <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', alignSelf: 'end' }}>
                    <button onClick={() => setVerifiedOnly(v => !v)} className={`bu-pill${verifiedOnly ? ' on' : ''}`} style={{ height: 44 }}>
                      {verifiedOnly && <CheckCircle className="w-3.5 h-3.5" />} Doar verificați
                    </button>
                    <button onClick={() => setShowSavedOnly(v => !v)} className={`bu-pill${showSavedOnly ? ' on' : ''}`} style={{ height: 44 }}>
                      {showSavedOnly && <CheckCircle className="w-3.5 h-3.5" />} Doar salvați
                    </button>
                  </div>
                </div>

                <div className="bu-row" style={{ justifyContent: 'flex-end' }}>
                  <button onClick={resetFilters} className="bu-btn" style={{ height: 44 }}>Șterge toate filtrele</button>
                </div>
              </div>
            )}
          </div>

          {(search || activeFilterCount > 0) && (
            <p className="bu-muted bu-sm" style={{ margin: 0 }}>
              Se afișează <b style={{ color: '#14123a' }}>{displayed.length}</b> din {influencers.length} influenceri
            </p>
          )}

          {displayed.length === 0 ? (
            <div className="bu-card" style={{ padding: '56px 20px', textAlign: 'center' }}>
              <div className="bu-ico" style={{ margin: '0 auto 14px', background: '#f0eff7', color: '#4a4770' }}><Users className="w-5 h-5" /></div>
              <h3 style={{ marginBottom: 6 }}>{influencers.length === 0 ? 'Niciun influencer încă' : 'Niciun rezultat găsit'}</h3>
              <p className="bu-muted bu-sm" style={{ margin: 0 }}>
                {influencers.length === 0 ? 'Influencerii vor apărea aici după înregistrare și aprobare.' : 'Încearcă să ajustezi căutarea sau filtrele.'}
              </p>
              {(search || activeFilterCount > 0) && (
                <button className="bu-btn" style={{ marginTop: 16 }} onClick={() => { setSearch(''); resetFilters() }}>Resetează filtrele</button>
              )}
            </div>
          ) : (
            <>
              <div className="if-grid">
                {displayed.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(influencer => (
                  <InfluencerCard key={influencer.id} influencer={influencer} isSaved={savedIds.has(influencer.id)} onSave={toggleSave} onClick={() => setSelectedInfluencer(influencer)} stats={statsMap[influencer.id]} />
                ))}
              </div>
              {displayed.length > ITEMS_PER_PAGE && (
                <div className="bu-row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bu-btn" style={{ height: 44 }}>← Anterior</button>
                  {Array.from({ length: Math.min(5, Math.ceil(displayed.length / ITEMS_PER_PAGE)) }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`bu-btn${currentPage === page ? ' p' : ''}`} style={{ width: 44, padding: 0, height: 44 }}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayed.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(displayed.length / ITEMS_PER_PAGE)} className="bu-btn" style={{ height: 44 }}>Următor →</button>
                </div>
              )}
              <p className="bu-muted bu-xs" style={{ textAlign: 'center', margin: 0 }}>{displayed.length} influenceri · pagina {currentPage}/{totalPages}</p>
            </>
          )}
        </>
      )}

      {selectedInfluencer && (
        <InfluencerDrawer
          influencer={selectedInfluencer}
          campaigns={campaigns}
          savedIds={savedIds}
          onClose={() => setSelectedInfluencer(null)}
          onSave={toggleSave}
          onInvite={handleInvite}
          stats={statsMap[selectedInfluencer.id]}
        />
      )}
    </div>
  )
}
