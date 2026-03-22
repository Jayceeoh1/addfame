'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StarRating } from '@/components/shared/leave-review'
import {
  Search, Filter, Instagram, Youtube, Star, Users, TrendingUp,
  X, ChevronDown, Send, CheckCircle, AlertCircle, Eye,
  Bookmark, BookmarkCheck, SlidersHorizontal, Heart, ExternalLink,
  Lock, Wallet, Zap, ArrowRight, Award, Plus, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { INFLUENCER_NICHES } from '@/lib/constants/registration'

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
  | { granted: false; reason: 'no_credits' }
  | { granted: false; reason: 'no_active_campaign' }
  | { granted: false; reason: 'both' }

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

const PLATFORM_FILTERS = ['All Platforms', 'Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'followers', label: 'Most followers' },
  { value: 'name', label: 'Name A–Z' },
]

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
    <div className="bg-card border border-border rounded-xl p-3 select-none">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/40 to-accent/40 flex-shrink-0" />
        <div className="flex-1">
          <div className="h-3 bg-muted rounded w-16 mb-1" />
          <div className="h-2.5 bg-muted/60 rounded w-10" />
        </div>
      </div>
      <div className="h-2 bg-muted/50 rounded w-full mb-1.5" />
      <div className="h-2 bg-muted/30 rounded w-3/4 mb-3" />
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-muted/40 rounded-lg p-1.5 text-center">
          <p className="text-xs font-bold blur-sm">{fake.followers}</p>
          <p className="text-[10px] text-muted-foreground">Reach</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-1.5 text-center">
          <p className="text-xs font-bold blur-sm">{fake.platform}</p>
          <p className="text-[10px] text-muted-foreground">Platform</p>
        </div>
      </div>
      <div className="flex gap-1 mb-2">
        {fake.niches.map(n => (
          <span key={n} className="bg-primary/10 px-1.5 py-0.5 rounded-full text-[10px] blur-sm">{n}</span>
        ))}
      </div>
      <div className="h-7 bg-muted/40 rounded-lg" />
    </div>
  )
}

function LockedScreen({ reason }: { reason: 'no_credits' | 'no_active_campaign' | 'both' }) {
  const noCredits = reason === 'no_credits' || reason === 'both'
  const noCampaign = reason === 'no_active_campaign' || reason === 'both'
  return (
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 blur-sm pointer-events-none select-none opacity-60">
        {Array.from({ length: 12 }).map((_, i) => <FakeCard key={i} />)}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card/95 border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">Influencer list is locked</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            To access our full creator network you need{' '}
            {reason === 'both' ? 'an active campaign and credits in your wallet.'
              : reason === 'no_credits' ? 'credits in your wallet.'
                : 'at least one active campaign.'}
          </p>
          <div className="space-y-3 mb-6 text-left">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${noCampaign ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800' : 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${noCampaign ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                {noCampaign ? <Zap className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${noCampaign ? 'text-amber-800 dark:text-amber-300' : 'text-green-800 dark:text-green-300'}`}>
                  {noCampaign ? 'Create an active campaign' : 'Active campaign ✓'}
                </p>
                {noCampaign && <p className="text-xs text-amber-600 dark:text-amber-400">Draft campaigns don't count — publish it first</p>}
              </div>
              {noCampaign && (
                <Link href="/brand/campaigns/new">
                  <Button size="sm" variant="outline" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100 flex-shrink-0">
                    Create <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${noCredits ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800' : 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${noCredits ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                {noCredits ? <Wallet className="w-3.5 h-3.5 text-orange-600" /> : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${noCredits ? 'text-orange-800 dark:text-orange-300' : 'text-green-800 dark:text-green-300'}`}>
                  {noCredits ? 'Add credits to your wallet' : 'Wallet funded ✓'}
                </p>
                {noCredits && <p className="text-xs text-orange-600 dark:text-orange-400">Minimum €50 required to unlock</p>}
              </div>
              {noCredits && (
                <Link href="/brand/wallet">
                  <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0">
                    Add funds <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Once both conditions are met, the full creator list unlocks instantly.</p>
        </div>
      </div>
    </div>
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
      setInviteState({ loading: false, success: false, error: err.message || 'Failed to send invite.' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-bold">Influencer Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden ring-4 ring-primary/20 flex-shrink-0">
              {influencer.avatar
                ? <img src={influencer.avatar} alt={influencer.name} className="w-full h-full object-cover" />
                : <span className="text-white text-2xl font-bold">{influencer.name[0]?.toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-lg leading-tight">{influencer.name}</h3>
                {influencer.is_verified && (
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Verified Creator
                  </span>
                )}
                {influencer.approval_status === 'approved' && !influencer.is_verified && (
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </div>
              {/* Oraș în drawer */}
              {influencer.city && (
                <div className="flex items-center gap-1 mt-1 mb-1">
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-xs font-semibold text-primary">{influencer.city}</span>
                </div>
              )}
              {influencer.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{influencer.bio}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{formatFollowers(totalF + (influencer.ig_followers || 0))}</p>
              <p className="text-xs text-muted-foreground">Total Reach</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{(influencer.platforms?.length ?? 0) + (influencer.instagram_connected ? 1 : 0)}</p>
              <p className="text-xs text-muted-foreground">Platforms</p>
            </div>
            <div className="bg-muted/40 rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{influencer.niches.length}</p>
              <p className="text-xs text-muted-foreground">Niches</p>
            </div>
          </div>

          {influencer.is_verified && stats && stats.total > 0 && (
            <div className="mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Track Record
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">{stats.completed}</p>
                  <p className="text-[10px] text-amber-600">Completate</p>
                </div>
                <div className="text-center">
                  <p className={`text-xl font-black ${stats.successRate >= 80 ? 'text-green-600' : stats.successRate >= 50 ? 'text-amber-600' : 'text-destructive'}`}>{stats.successRate}%</p>
                  <p className="text-[10px] text-amber-600">Rată succes</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-amber-700 dark:text-amber-300">€{stats.totalEarned.toFixed(0)}</p>
                  <p className="text-[10px] text-amber-600">Total câștigat</p>
                </div>
              </div>
              <div className="h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${stats.successRate >= 80 ? 'bg-green-500' : stats.successRate >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                  style={{ width: `${stats.successRate}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Platforms */}
        <div className="p-5 border-b border-border">
          <h4 className="text-sm font-semibold mb-3">Social Platforms</h4>
          {(influencer.platforms?.length ?? 0) === 0 && !influencer.instagram_connected
            ? <p className="text-sm text-muted-foreground">No platforms connected</p>
            : (
              <div className="space-y-2">
                {influencer.instagram_connected && (
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Instagram className="w-3.5 h-3.5 text-pink-500" />
                      <span className="text-sm font-medium">Instagram</span>
                      {influencer.instagram_handle && (
                        <a href={`https://instagram.com/${influencer.instagram_handle}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-[10px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">✅ Verificat API</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-sm font-black">{(influencer.ig_followers || 0).toLocaleString()}</span>
                      {influencer.ig_engagement_rate > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">ER {influencer.ig_engagement_rate}%</span>
                      )}
                    </div>
                  </div>
                )}
                {(influencer.platforms ?? []).filter(p => !(p.platform === 'instagram' && influencer.instagram_connected)).map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={p.platform} />
                      <span className="text-sm font-medium capitalize">{p.platform}</span>
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition"><ExternalLink className="w-3 h-3" /></a>}
                    </div>
                    {p.followers && <span className="text-sm font-semibold">{formatFollowers(p.followers)}</span>}
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Niches */}
        <div className="p-5 border-b border-border">
          <h4 className="text-sm font-semibold mb-3">Content Niches</h4>
          <div className="flex flex-wrap gap-2">
            {influencer.niches.length === 0
              ? <p className="text-sm text-muted-foreground">No niches set</p>
              : influencer.niches.map(n => (
                <span key={n} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">{n}</span>
              ))}
          </div>
        </div>

        {/* Invite */}
        <div className="p-5 mt-auto">
          <h4 className="text-sm font-semibold mb-3">Invite to Campaign</h4>
          {inviteState.success ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-sm">Invite sent!</p>
              <p className="text-xs text-muted-foreground mt-1">The influencer has been notified.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setInviteState({ loading: false, success: false, error: null })}>Send Another</Button>
            </div>
          ) : (
            <>
              {inviteState.error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3 flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {inviteState.error}
                </div>
              )}
              {activeCampaigns.length === 0 ? (
                <div className="text-center py-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground">No active campaigns to invite to.</p>
                  <Button asChild variant="outline" size="sm" className="mt-2"><Link href="/brand/campaigns/new">Create Campaign</Link></Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                    className="w-full px-3 py-2.5 border border-input rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Select a campaign…</option>
                    {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-gradient-to-r from-primary to-accent" onClick={handleInvite} disabled={!selectedCampaign || inviteState.loading}>
                      <Send className="w-4 h-4 mr-2" />
                      {inviteState.loading ? 'Sending…' : 'Send Invite'}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onSave(influencer.id)} className={isSaved ? 'text-primary border-primary/40 bg-primary/5' : ''}>
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
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
  return (
    <div onClick={onClick} className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all group hover:shadow-xl hover:-translate-y-0.5"
      style={{ border: influencer.is_verified ? '2px solid #fbbf24' : '1.5px solid #f0f0f0' }}>
      <div className="relative h-20" style={{ background: influencer.is_verified ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
        <button onClick={e => { e.stopPropagation(); onSave(influencer.id) }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center hover:bg-white shadow-sm transition">
          {isSaved ? <BookmarkCheck className="w-4 h-4 text-orange-500" /> : <Bookmark className="w-4 h-4 text-gray-400" />}
        </button>
        {influencer.is_verified && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 fill-white" /> Verified
          </div>
        )}
        <div className="absolute -bottom-6 left-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-4 border-white shadow-md" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
            {influencer.avatar
              ? <img src={influencer.avatar} alt={influencer.name} className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center text-white font-black text-lg">{influencer.name[0]?.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      <div className="pt-8 px-4 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-black text-sm text-gray-900 truncate">{influencer.name}</h3>
              {influencer.approval_status === 'approved' && <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
            </div>
            {/* Oraș sub nume */}
            {influencer.city && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                <span className="text-[10px] font-semibold text-primary truncate">{influencer.city}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {influencer.instagram_connected && (
                <span className="flex items-center gap-0.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  <span className="text-[10px] font-black text-green-600">{(influencer.ig_followers || 0).toLocaleString()}</span>
                  <span className="text-[10px] text-green-500">✅</span>
                </span>
              )}
              {(influencer.platforms ?? []).filter(p => !(p.platform === 'instagram' && influencer.instagram_connected)).slice(0, 2).map((p, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  <PlatformIcon platform={p.platform} />
                  {p.followers && <span className="text-[10px] font-bold text-gray-400">{formatFollowers(p.followers)}</span>}
                </span>
              ))}
            </div>
          </div>
          {totalF > 0 && (
            <div className="text-right ml-2 flex-shrink-0">
              <p className="text-sm font-black text-gray-900">{formatFollowers(totalF)}</p>
              <p className="text-[10px] text-gray-400">followeri</p>
            </div>
          )}
        </div>

        {influencer.bio && <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3 mt-2">{influencer.bio}</p>}

        {(influencer.niches ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {influencer.niches.slice(0, 3).map(n => <span key={n} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">{n}</span>)}
            {influencer.niches.length > 3 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">+{influencer.niches.length - 3}</span>}
          </div>
        )}

        {(influencer.price_min || influencer.price_reel || influencer.price_story) && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
            <span className="text-xs font-black text-orange-500">€</span>
            <span className="text-xs font-bold text-orange-700 truncate">
              {influencer.price_min ? `de la €${influencer.price_min}/campanie`
                : influencer.price_reel ? `Reel €${influencer.price_reel}`
                  : `Story €${influencer.price_story}`}
            </span>
          </div>
        )}

        <button onClick={onClick} className="w-full py-2 rounded-xl text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
          <Eye className="w-3.5 h-3.5 inline mr-1.5" /> View Profile
        </button>
      </div>
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
  const [platformFilter, setPlatformFilter] = useState('All Platforms')
  const [nicheFilter, setNicheFilter] = useState('All Niches')
  const [sortBy, setSortBy] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [minFollowers, setMinFollowers] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null)
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showCampaignSheet, setShowCampaignSheet] = useState(false)
  const router = useRouter()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brand } = await supabase
        .from('brands')
        .select('id, credits_balance')
        .eq('user_id', user.id)
        .single()
      if (!brand) return
      setBrandId(brand.id)

      const { data: activeCampaigns } = await supabase
        .from('campaigns')
        .select('id, title, status')
        .eq('brand_id', brand.id)
        .eq('status', 'ACTIVE')

      const hasCredits = (brand.credits_balance ?? 0) >= 50
      const hasActiveCampaign = (activeCampaigns?.length ?? 0) > 0

      let accessState: AccessState
      if (hasCredits && hasActiveCampaign) accessState = { granted: true }
      else if (!hasCredits && !hasActiveCampaign) accessState = { granted: false, reason: 'both' }
      else if (!hasCredits) accessState = { granted: false, reason: 'no_credits' }
      else accessState = { granted: false, reason: 'no_active_campaign' }
      setAccess(accessState)

      if (accessState.granted) {
        const [infRes, campRes] = await Promise.all([
          supabase
            .from('influencers')
            .select('id, user_id, name, slug, bio, avatar, niches, platforms, approval_status, is_verified, verified_at, total_earned, created_at, price_story, price_reel, price_post, price_youtube, price_min, city, instagram_connected, instagram_handle, ig_followers, ig_engagement_rate, tiktok_connected, tt_followers')
            .eq('approval_status', 'approved')
            .order('created_at', { ascending: false }),
          supabase.from('campaigns').select('id, title, status').eq('brand_id', brand.id),
        ])

        setInfluencers((infRes.data as Influencer[]) ?? [])
        setCampaigns((campRes.data as Campaign[]) ?? [])

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
    showToastMsg(`Invite sent to ${inf?.name}! 🎯`, 'success')
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

  useEffect(() => { setCurrentPage(1) }, [search, platformFilter, sortBy, showSavedOnly, cityFilter])

  // Normalizare pentru filtrare oraș
  const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const displayed = useMemo(() => {
    let list = [...influencers]
    if (showSavedOnly) list = list.filter(i => savedIds.has(i.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.bio?.toLowerCase().includes(q) || i.niches.some(n => n.toLowerCase().includes(q)))
    }
    if (platformFilter !== 'All Platforms') {
      list = list.filter(i => (i.platforms ?? []).some(p => p.platform.toLowerCase() === platformFilter.toLowerCase()))
    }
    if (nicheFilter !== 'All Niches') list = list.filter(i => i.niches.includes(nicheFilter))
    if (minFollowers) {
      const min = parseInt(minFollowers.replace(/[^0-9]/g, ''), 10) * 1000
      list = list.filter(i => totalFollowers(i.platforms) >= min)
    }
    // Filtrare după oraș
    if (cityFilter.trim()) {
      const q = normalizeStr(cityFilter)
      list = list.filter(i => i.city && normalizeStr(i.city).includes(q))
    }
    if (sortBy === 'followers') list.sort((a, b) => totalFollowers(b.platforms) - totalFollowers(a.platforms))
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    list.sort((a, b) => {
      if (a.is_verified && !b.is_verified) return -1
      if (!a.is_verified && b.is_verified) return 1
      return 0
    })
    return list
  }, [influencers, search, platformFilter, nicheFilter, sortBy, minFollowers, cityFilter, showSavedOnly, savedIds])

  const activeFilterCount = [
    platformFilter !== 'All Platforms',
    nicheFilter !== 'All Niches',
    minFollowers !== '',
    showSavedOnly,
    cityFilter !== '',
  ].filter(Boolean).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-700' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Influencers</h1>
          <p className="text-muted-foreground text-sm">
            {access?.granted ? `${influencers.length} creator${influencers.length !== 1 ? 's' : ''} on the platform` : 'Unlock the full creator network'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {access?.granted && (
            <button onClick={() => setShowSavedOnly(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition ${showSavedOnly ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}>
              <Bookmark className="w-4 h-4" />
              Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ''}
            </button>
          )}
          <button onClick={() => setShowCampaignSheet(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}>
            <Plus className="w-4 h-4" /> Campanie nouă
          </button>
        </div>
      </div>

      {/* Campaign sheet */}
      {showCampaignSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowCampaignSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-background rounded-t-3xl border-t border-border px-4 pt-4 pb-10 animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <p className="text-xs text-muted-foreground text-center mb-4 font-medium uppercase tracking-wider">Alege tipul campaniei</p>
            <button onClick={() => { setShowCampaignSheet(false); router.push('/brand/campaigns/new/barter') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition mb-3 text-left group">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-105 transition">🎁</div>
              <div className="min-w-0"><p className="font-black text-base">Free Offer</p><p className="text-sm text-muted-foreground">Produs / serviciu gratuit în schimbul postărilor</p></div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
            </button>
            <button onClick={() => { setShowCampaignSheet(false); router.push('/brand/campaigns/new') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition text-left group">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-105 transition">💰</div>
              <div className="min-w-0"><p className="font-black text-base">Paid Campaign</p><p className="text-sm text-muted-foreground">Plătești influencerii per conținut livrat</p></div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
            </button>
          </div>
        </div>
      )}

      {access && !access.granted ? (
        <LockedScreen reason={access.reason} />
      ) : (
        <>
          {/* Search + filter bar */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search by name, bio or niche…" value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-muted/40 border border-input rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}
                  className="px-3 py-2.5 border border-input rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  {PLATFORM_FILTERS.map(p => <option key={p}>{p}</option>)}
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-2.5 border border-input rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm font-medium transition ${activeFilterCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'border-input hover:border-primary/30 text-muted-foreground hover:text-foreground'}`}>
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{activeFilterCount}</span>}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Niche</label>
                  <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm outline-none">
                    <option>All Niches</option>
                    {INFLUENCER_NICHES.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Minimum Followers (K)</label>
                  <Input type="number" placeholder="e.g. 10 = 10K+" value={minFollowers} onChange={e => setMinFollowers(e.target.value)} className="text-sm" />
                </div>
                {/* Filtru oraș */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Oraș
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input type="text" placeholder="ex. Iași, Cluj..." value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                    {cityFilter && <button onClick={() => setCityFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3 h-3" /></button>}
                  </div>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setPlatformFilter('All Platforms'); setNicheFilter('All Niches'); setMinFollowers(''); setShowSavedOnly(false); setCityFilter('') }}
                    className="text-sm text-muted-foreground hover:text-foreground underline">
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {(search || activeFilterCount > 0) && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing <span className="font-semibold text-foreground">{displayed.length}</span> of {influencers.length} influencers
            </p>
          )}

          {displayed.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-16 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-semibold mb-2">{influencers.length === 0 ? 'No influencers yet' : 'No results found'}</p>
              <p className="text-sm text-muted-foreground">
                {influencers.length === 0 ? 'Influencers will appear here once they register and get approved.' : 'Try adjusting your search or filters.'}
              </p>
              {(search || activeFilterCount > 0) && (
                <Button variant="outline" size="sm" className="mt-4"
                  onClick={() => { setSearch(''); setPlatformFilter('All Platforms'); setNicheFilter('All Niches'); setMinFollowers(''); setShowSavedOnly(false); setCityFilter('') }}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayed.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(influencer => (
                  <InfluencerCard key={influencer.id} influencer={influencer} isSaved={savedIds.has(influencer.id)} onSave={toggleSave} onClick={() => setSelectedInfluencer(influencer)} stats={statsMap[influencer.id]} />
                ))}
              </div>
              {displayed.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-center gap-2 mt-8 pb-4">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">← Anterior</button>
                  {Array.from({ length: Math.min(5, Math.ceil(displayed.length / ITEMS_PER_PAGE)) }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={"w-9 h-9 rounded-xl text-sm font-black transition " + (currentPage === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100')}
                      style={currentPage === page ? { background: 'linear-gradient(135deg,#f97316,#ec4899)' } : {}}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayed.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(displayed.length / ITEMS_PER_PAGE)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">Următor →</button>
                </div>
              )}
              <p className="text-center text-xs text-gray-400 mt-1 mb-4">{displayed.length} influenceri · pagina {currentPage}/{Math.max(1, Math.ceil(displayed.length / ITEMS_PER_PAGE))}</p>
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
