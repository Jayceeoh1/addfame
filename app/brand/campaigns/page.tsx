'use client'
// @ts-nocheck

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateCampaignStatus, deleteCampaign, getCampaignFeeInfo } from '@/app/actions/campaigns'
import { VerificationBanner } from '@/components/shared/verification-banner'
import {
  Plus, Search, Briefcase, Clock, Users,
  CheckCircle, AlertCircle, EyeOff, Lock,
  MoreHorizontal, Play, Pause, Archive, X, Trash2,
  Wallet, Gift, Megaphone, Sparkles, Hourglass
} from 'lucide-react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  description: string
  brand_name: string
  budget: number
  max_influencers?: number
  platforms: string[]
  deliverables: string
  deadline: string
  niches: string[]
  countries: string[]
  status: string
  invited_influencers: string[]
  accepted_influencers: string[]
  created_at: string
}

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)

const STATUS_CONFIG: Record<string, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: 'Ciornă', bg: '#f0eff7', fg: '#4a4770' },
  PENDING_REVIEW: { label: 'În aprobare', bg: '#fff1c2', fg: '#854d0e' },
  ACTIVE: { label: 'Activă', bg: '#dcf5ec', fg: '#14532d' },
  PAUSED: { label: 'În pauză', bg: '#e6f0ff', fg: '#1d4fb8' },
  COMPLETED: { label: 'Finalizată', bg: '#efeaff', fg: '#4423c4' },
  REJECTED: { label: 'Respinsă', bg: '#fde8e6', fg: '#b42318' },
}

const TYPE_CONFIG: Record<string, { label: string; cover: string }> = {
  PAID: { label: 'Plătită', cover: 'linear-gradient(135deg,#2f6fe0,#5a35e6)' },
  BARTER: { label: 'Barter', cover: 'linear-gradient(135deg,#7040f0,#9030f0)' },
  OPEN_CALL: { label: 'Open Call', cover: 'linear-gradient(135deg,#22c8f0,#3090f0)' },
  MANAGED: { label: 'Managed', cover: 'linear-gradient(135deg,#14123a,#3a2f8f)' },
}

const TAB_LABEL: Record<string, string> = {
  'All': 'Toate', 'În aprobare': 'În aprobare', 'Active': 'Active', 'Draft': 'Ciorne', 'Paused': 'Pauză', 'Completed': 'Finalizate',
}

const TABS = ['All', 'În aprobare', 'Active', 'Draft', 'Paused', 'Completed'] as const
type Tab = typeof TABS[number]

const TAB_FILTER: Record<Tab, string[]> = {
  'All': ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED'],
  'În aprobare': ['PENDING_REVIEW'],
  'Active': ['ACTIVE'],
  'Draft': ['DRAFT'],
  'Paused': ['PAUSED'],
  'Completed': ['COMPLETED'],
}

export default function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const router = useRouter()
  const [collabCounts, setCollabCounts] = useState<Record<string, number>>({})
  const [brandVerification, setBrandVerification] = useState<{ status: string; reason?: string | null }>({ status: 'unverified' })
  const [canCreateCampaign, setCanCreateCampaign] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [feeInfo, setFeeInfo] = useState<{ price?: number } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCampaigns = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: brand } = await supabase.from('brands').select('id, verification_status, verification_rejection_reason, credits_balance, influencers_access').eq('user_id', user.id).single()
      if (brand) {
        setBrandVerification({ status: brand.verification_status || 'unverified', reason: brand.verification_rejection_reason })
        const hasAccess = (brand.credits_balance ?? 0) >= 250 || brand.influencers_access === true
        setCanCreateCampaign(hasAccess)
      }
      if (!brand) return

      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (data) setCampaigns(data)

      // Fetch collaboration counts per campaign
      const { data: collabs } = await supabase
        .from('collaborations')
        .select('campaign_id, status')
        .eq('brand_id', brand.id)

      if (collabs) {
        const counts: Record<string, number> = {}
        collabs.forEach(c => { counts[c.campaign_id] = (counts[c.campaign_id] || 0) + 1 })
        setCollabCounts(counts)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchCampaigns()
    const handleClick = () => setOpenMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [fetchCampaigns])

  useEffect(() => {
    getCampaignFeeInfo().then((i: any) => { if (i) setFeeInfo(i) }).catch(() => {})
  }, [])

  async function handleStatusChange(campaignId: string, newStatus: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
    if (newStatus === 'ACTIVE' && brandVerification.status !== 'verified') {
      showToast('⚠️ Verifică-ți brandul înainte de a publica campanii.', 'error')
      return
    }
    setOpenMenu(null)
    // Publicarea unui draft = plata taxei per influencer → confirmare cu suma exactă
    const camp = campaigns.find(c => c.id === campaignId)
    if (newStatus === 'ACTIVE' && camp && ['DRAFT', 'REJECTED'].includes(camp.status)) {
      const info: any = await getCampaignFeeInfo().catch(() => null)
      if (info) {
        const slots = camp.max_influencers || 1
        const total = slots * (info.price || 0)
        if ((info.available || 0) < total) {
          showToast(`Sold insuficient: publicarea costă ${total.toLocaleString('ro-RO')} RON (${slots} × ${info.price} RON). Adaugă credite din Wallet.`, 'error')
          return
        }
        if (!confirm(`Publicarea costă ${total.toLocaleString('ro-RO')} RON (${slots} influenceri × ${info.price} RON) și se plătește din wallet.\n\nLocurile neocupate se returnează la închiderea campaniei. Continui?`)) return
      }
    }
    setActionLoading(campaignId)
    try {
      const result: any = await updateCampaignStatus(campaignId, newStatus)
      if (!result.success) throw new Error(result.error)
      const msgs: Record<string, string> = {
        ACTIVE: '📋 Campania a fost trimisă la aprobare! Vei fi notificat când este activată.',
        DRAFT: 'Campaign moved back to draft.',
        PAUSED: 'Campaign paused.',
        COMPLETED: 'Campaign marked as completed.',
      }
      // Publish → campania merge în PENDING_REVIEW; reluarea din pauză → ACTIVE
      const displayStatus = result.pendingReview ? 'PENDING_REVIEW' : newStatus
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: displayStatus } : c))
      showToast(
        result.pendingReview
          ? `📋 Taxa de ${Number(result.feeCharged || 0).toLocaleString('ro-RO')} RON a fost plătită. Campania a fost trimisă la aprobare.`
          : newStatus === 'ACTIVE' ? '▶️ Campania a fost reluată.' : (msgs[newStatus] || 'Status actualizat.'),
        'success'
      )
    } catch (err: any) {
      showToast(err.message || 'Eroare la actualizarea statusului.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(campaignId: string) {
    setActionLoading(campaignId)
    setOpenMenu(null)
    setConfirmDelete(null)
    try {
      const result = await deleteCampaign(campaignId)
      if (!result.success) throw new Error(result.error)
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      showToast('Campania a fost ștearsă.', 'success')
    } catch (err: any) {
      showToast(err.message || 'Eroare la ștergere.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchTab = TAB_FILTER[activeTab].includes(c.status)
    const q = search.toLowerCase()
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q)
    return matchTab && matchSearch
  })

  const counts: Record<Tab, number> = {
    'All': campaigns.length,
    'În aprobare': campaigns.filter(c => c.status === 'PENDING_REVIEW').length,
    'Active': campaigns.filter(c => c.status === 'ACTIVE').length,
    'Draft': campaigns.filter(c => c.status === 'DRAFT').length,
    'Paused': campaigns.filter(c => c.status === 'PAUSED').length,
    'Completed': campaigns.filter(c => c.status === 'COMPLETED').length,
  }

  if (loading) return (
    <div className="bu" style={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e3f3', borderTopColor: '#5a35e6', animation: 'cpSpin .8s linear infinite' }} />
      <style>{`@keyframes cpSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const TILES = [
    { name: 'Plătită', desc: 'Plătești creatorul direct pentru postare.', Icon: Wallet, bg: '#e6f0ff', fg: '#1d4fb8', href: '/brand/campaigns/new/wizard?type=PAID' },
    { name: 'Barter', desc: 'Trimiți produsul, primești conținut.', Icon: Gift, bg: '#efeaff', fg: '#4423c4', href: '/brand/campaigns/new/barter', note: 'Taxă publicare: 149 RON' },
    { name: 'Open Call', desc: 'Oricine se potrivește poate aplica.', Icon: Megaphone, bg: '#dff4fd', fg: '#0c4a6e', href: '/brand/campaigns/new/opencall' },
    { name: 'Managed', desc: 'Echipa AddFame o rulează pentru tine.', Icon: Sparkles, bg: '#14123a', fg: '#ffffff', href: '/brand/campaigns/new/managed' },
  ]

  const newBtn = (extra = '') => canCreateCampaign ? (
    <button onClick={() => setShowSheet(true)} className={`bu-btn p big ${extra}`}><Plus size={16} strokeWidth={2.4} /> Campanie nouă</button>
  ) : (
    <Link href="/brand/wallet" className={`bu-btn big ${extra}`} title="Ai nevoie de minimum 250 RON credite sau aprobare admin pentru a crea campanii"><Lock size={16} /> Campanie nouă</Link>
  )

  return (
    <div className="bu">
      <style>{`
        .cp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:18px; align-items:stretch; }
        .cp-card { background:#fff; border:1px solid #e5e3f3; border-radius:20px; display:flex; flex-direction:column; min-width:0; transition:box-shadow .2s, border-color .2s; }
        .cp-card:hover { border-color:#cfc6f5; box-shadow:0 14px 30px -18px rgba(90,53,230,.35); }
        .cp-cover { height:76px; position:relative; display:flex; align-items:flex-start; justify-content:space-between; padding:12px 14px; border-radius:20px 20px 0 0; gap:8px; }
        .cp-cover-clip { position:absolute; inset:0; overflow:hidden; border-radius:20px 20px 0 0; pointer-events:none; }
        .cp-cover-clip i { position:absolute; right:-30px; bottom:-60px; width:150px; height:150px; border-radius:50%; background:rgba(255,255,255,.14); }
        .cp-tchip { position:relative; display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; background:rgba(255,255,255,.2); color:#fff; font-size:12px; font-weight:700; backdrop-filter:blur(4px); }
        .cp-body { padding:16px 18px 18px; display:flex; flex-direction:column; gap:12px; flex:1; min-width:0; }
        .cp-title { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-weight:700; font-size:18px; letter-spacing:-.01em; line-height:1.25; color:#14123a; text-decoration:none; overflow-wrap:anywhere; }
        .cp-title:hover { color:#5a35e6; }
        .cp-stat { display:flex; gap:6px; padding:12px 0; border-top:1px solid #eeecf7; border-bottom:1px solid #eeecf7; }
        .cp-stat > div { flex:1; min-width:0; display:flex; flex-direction:column; }
        .cp-stat b { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:18px; line-height:1.1; }
        .cp-stat span { font-size:12px; color:#6a6690; }
        .cp-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; flex-wrap:wrap; }
        .cp-notice { display:flex; flex-direction:column; gap:8px; padding:12px 14px; border-radius:14px; }
        .cp-new-tile { min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border:2px dashed #cfc8ee; border-radius:20px; color:#5a35e6; text-decoration:none; font-weight:800; background:rgba(255,255,255,.5); cursor:pointer; font-family:inherit; font-size:15px; padding:0; }
        .cp-new-tile:hover { background:#f7f4ff; }
        .cp-new-tile span.i { width:46px; height:46px; border-radius:14px; background:#efeaff; display:flex; align-items:center; justify-content:center; }
        .cp-menu-btn { position:relative; width:32px; height:32px; border-radius:10px; border:0; background:rgba(255,255,255,.22); color:#fff; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex:none; }
        .cp-menu-btn:hover { background:rgba(255,255,255,.34); }
        .cp-dd { position:absolute; right:0; top:calc(100% + 6px); background:#fff; border:1px solid #e5e3f3; border-radius:14px; padding:6px; z-index:60; min-width:200px; box-shadow:0 12px 32px rgba(20,18,58,.16); }
        .cp-dd button { display:flex; align-items:center; gap:8px; padding:0 12px; min-height:44px; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; border:0; background:transparent; width:100%; text-align:left; font-family:inherit; color:#14123a; }
        .cp-dd button:hover { background:#f7f4ff; }
        .cp-dd button.danger { color:#b42318; }
        .cp-dd button.danger:hover { background:#fff4f2; }
        .cp-toast { position:fixed; top:20px; right:20px; z-index:90; display:flex; align-items:center; gap:10px; padding:14px 18px; border-radius:16px; background:#fff; font-size:14px; font-weight:700; max-width:380px; box-shadow:0 16px 40px -12px rgba(20,18,58,.3); animation:cpIn .3s ease; }
        @keyframes cpIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .cp-overlay { position:fixed; inset:0; z-index:80; background:rgba(20,18,58,.5); display:flex; align-items:center; justify-content:center; padding:16px; }
        .cp-overlay.sheet { align-items:center; }
        .cp-sheet { background:#fff; border-radius:24px; padding:22px; width:100%; max-width:640px; max-height:92vh; overflow-y:auto; position:relative; }
        .cp-tiles { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .cp-tile { display:flex; flex-direction:column; gap:10px; padding:16px; border-radius:16px; border:1.5px solid #e5e3f3; background:#fff; text-align:left; cursor:pointer; font-family:inherit; color:#14123a; min-height:44px; transition:border-color .15s, background .15s; }
        .cp-tile:hover { border-color:#b9a5f5; background:#faf8ff; }
        .cp-tile .ti { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; }
        .cp-tile b { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:17px; }
        .cp-x { width:44px; height:44px; border-radius:12px; border:0; background:#f0eff7; color:#4a4770; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; flex:none; }
        .cp-toolbar { min-width:0; display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center; }
        @media (max-width:767px) {
          .cp-grid { grid-template-columns:1fr; gap:14px; }
          .cp-cover { height:64px; }
          .cp-body { padding:14px; }
          .cp-title { font-size:17px; }
          .cp-toolbar { flex-direction:column; align-items:stretch; }
          .cp-tabs { min-width:0; max-width:calc(100% + 32px); flex-wrap:nowrap !important; overflow-x:auto; margin:0 -16px; padding:0 16px; scrollbar-width:none; }
          .cp-tabs::-webkit-scrollbar { display:none; }
          .cp-tabs .bu-pill { min-height:44px; flex:none; }
          .cp-overlay { align-items:flex-end; padding:0; }
          .cp-sheet { border-radius:24px 24px 0 0; max-width:none; padding:18px 16px 28px; }
          .cp-tiles { gap:10px; }
          .cp-tile { padding:12px; }
          .cp-tile b { font-size:15px; }
          .cp-toast { left:16px; right:16px; top:12px; max-width:none; }
          .cp-new-tile { min-height:120px; }
          .cp-foot .bu-btn { min-height:44px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className="cp-toast" style={{ border: `1.5px solid ${toast.type === 'success' ? '#a7e3cb' : '#f3c9c4'}`, color: toast.type === 'success' ? '#14532d' : '#b42318' }}>
          {toast.type === 'success' ? <CheckCircle size={16} style={{ flex: 'none' }} /> : <AlertCircle size={16} style={{ flex: 'none' }} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <section className="bu-head">
        <div className="bu-col" style={{ gap: 4 }}>
          <h1>Campanii</h1>
          <p style={{ margin: 0, color: '#4a4770' }}>
            {campaigns.length} {campaigns.length === 1 ? 'campanie' : 'campanii'} · <b style={{ color: '#5a35e6' }}>{counts.Active} {counts.Active === 1 ? 'activă' : 'active'}</b> acum
            {counts.Draft > 0 && <> · {counts.Draft} {counts.Draft === 1 ? 'ciornă' : 'ciorne'}</>}
          </p>
        </div>
        {newBtn()}
      </section>

      {/* Verification banner */}
      {brandVerification.status !== 'verified' && (
        <VerificationBanner status={brandVerification.status as any} rejectionReason={brandVerification.reason} compact />
      )}

      {/* Filters */}
      <section className="cp-toolbar">
        <div className="bu-tabs cp-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`bu-pill ${activeTab === tab ? 'on' : ''}`} onClick={() => setActiveTab(tab)}>
              {TAB_LABEL[tab]}<span className="n">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <label className="bu-search" style={{ width: 260, maxWidth: '100%' }}>
          <Search size={16} />
          <input placeholder="Caută o campanie…" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </section>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <div className="bu-card" style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div className="bu-ico" style={{ width: 56, height: 56, margin: '0 auto 16px', background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', color: '#fff' }}>
            <Briefcase size={26} />
          </div>
          <h2 style={{ marginBottom: 6 }}>Nicio campanie încă</h2>
          <p className="bu-muted" style={{ margin: '0 auto 20px', maxWidth: 320 }}>
            {campaigns.length === 0
              ? 'Creează prima ta campanie pentru a găsi influencerii potriviți.'
              : `Nu există campanii în categoria „${TAB_LABEL[activeTab]}”.`}
          </p>
          {campaigns.length === 0 && (
            canCreateCampaign ? (
              <button onClick={() => setShowSheet(true)} className="bu-btn p big"><Plus size={16} /> Creează campania</button>
            ) : (
              <Link href="/brand/wallet" className="bu-btn p big"><Lock size={16} /> Adaugă 250 RON pentru a crea campanii</Link>
            )
          )}
        </div>
      ) : (
        <section className="cp-grid">
          {filtered.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT
            const tcfg = TYPE_CONFIG[(c as any).campaign_type] ?? { label: 'Campanie', cover: 'linear-gradient(135deg,#2f6fe0,#5a35e6)' }
            const days = c.deadline ? daysLeft(c.deadline) : null
            const expired = days !== null && days < 0
            const urgent = days !== null && days >= 0 && days <= 3
            const isLoading = actionLoading === c.id
            const collabs = collabCounts[c.id] || 0
            const slotsTotal = c.max_influencers || 0
            const slotsUsed = Array.isArray(c.accepted_influencers) ? c.accepted_influencers.length : 0
            const pct = slotsTotal > 0 ? Math.min(100, Math.round((slotsUsed / slotsTotal) * 100)) : 0
            const isDraft = c.status === 'DRAFT'
            const isLive = c.status === 'ACTIVE' || c.status === 'PAUSED' || c.status === 'COMPLETED'
            const dl = days === null || c.status === 'COMPLETED' ? null
              : expired ? { t: 'Expirat', bg: '#f0eff7', fg: '#4a4770' }
              : urgent ? { t: days === 0 ? 'Ultima zi' : days === 1 ? 'Se închide mâine' : `Se închide în ${days} zile`, bg: '#fff1e6', fg: '#9a4206' }
              : { t: `${days} ${days === 1 ? 'zi rămasă' : 'zile rămase'}`, bg: '#f0eff7', fg: '#4a4770' }
            const platforms = (c.platforms || []).slice(0, 3).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(', ')
            const fee = feeInfo?.price ? feeInfo.price * (c.max_influencers || 1) : null

            return (
              <article key={c.id} className="cp-card">
                <div className="cp-cover" style={{ background: tcfg.cover }}>
                  <span className="cp-cover-clip"><i /></span>
                  <span className="cp-tchip">{tcfg.label}</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <span className="bu-chip" style={{ background: cfg.bg, color: cfg.fg }}>{cfg.label}</span>
                    <button className="cp-menu-btn" aria-label="Acțiuni" onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}>
                      <MoreHorizontal size={16} />
                    </button>
                    {openMenu === c.id && (
                      <div className="cp-dd">
                        {c.status === 'DRAFT' && (
                          <button onClick={() => handleStatusChange(c.id, 'ACTIVE')}><Play size={16} color="#14532d" /> Publică campania</button>
                        )}
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => handleStatusChange(c.id, 'PAUSED')}><Pause size={16} color="#6a6690" /> Pune pe pauză</button>
                        )}
                        {c.status === 'PAUSED' && (
                          <button onClick={() => handleStatusChange(c.id, 'ACTIVE')}><Play size={16} color="#14532d" /> Reia campania</button>
                        )}
                        {(c.status === 'ACTIVE' || c.status === 'PAUSED') && (
                          <button onClick={() => handleStatusChange(c.id, 'DRAFT')}><EyeOff size={16} color="#854d0e" /> Mută în ciorne</button>
                        )}
                        {c.status !== 'COMPLETED' && (
                          <button className="danger" onClick={() => handleStatusChange(c.id, 'COMPLETED')}><Archive size={16} /> Marchează finalizată</button>
                        )}
                        {(c.status === 'DRAFT' || c.status === 'REJECTED') && (
                          <>
                            <div style={{ height: 1, background: '#eeecf7', margin: '4px 0' }} />
                            <button className="danger" onClick={() => { setConfirmDelete(c.id); setOpenMenu(null) }}><Trash2 size={16} /> Șterge campania</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cp-body">
                  <div className="bu-col" style={{ gap: 2 }}>
                    <Link href={`/brand/campaigns/${c.id}`} className="cp-title">{c.title}</Link>
                    <span className="bu-sm bu-muted">
                      {[platforms, c.budget ? fmt(c.budget) : null].filter(Boolean).join(' · ') || ' '}
                    </span>
                  </div>

                  {/* Status-specific body */}
                  {isDraft && (
                    <div className="cp-notice" style={{ background: '#f7f4ff', border: '1px dashed #b9a5f5' }}>
                      <div className="bu-row" style={{ justifyContent: 'space-between', gap: 10 }}>
                        <b className="bu-sm" style={{ color: '#4423c4' }}>Taxă de publicare</b>
                        <b className="bu-d" style={{ fontSize: 20, color: '#4423c4' }}>
                          {(c as any).campaign_type === 'BARTER' ? '149 RON' : fee ? fmt(fee) : '—'}
                        </b>
                      </div>
                      <span className="bu-xs bu-muted">
                        {fee && (c as any).campaign_type !== 'BARTER'
                          ? `${c.max_influencers || 1} × ${feeInfo?.price} RON. `
                          : ''}
                        Se plătește la publicare. Creatorii nu văd campania până atunci.
                      </span>
                    </div>
                  )}
                  {c.status === 'PENDING_REVIEW' && (
                    <div className="cp-notice" style={{ background: '#fffbea', border: '1px solid #f6e7a6', gap: 4 }}>
                      <b className="bu-sm" style={{ color: '#854d0e' }}>Echipa AddFame o verifică</b>
                      <span className="bu-xs" style={{ color: '#854d0e' }}>De obicei durează sub 24 h. Te anunțăm când e publicată.</span>
                    </div>
                  )}
                  {c.status === 'REJECTED' && (
                    <div className="cp-notice" style={{ background: '#fff4f2', border: '1px solid #f3c9c4', gap: 4 }}>
                      <b className="bu-sm" style={{ color: '#b42318' }}>Campania a fost respinsă</b>
                      <span className="bu-xs" style={{ color: '#b42318' }}>Deschide campania pentru detalii, apoi o poți retrimite.</span>
                    </div>
                  )}
                  {isLive && (
                    <>
                      <div className="cp-stat">
                        <div><b>{collabs}</b><span>{collabs === 1 ? 'colaborare' : 'colaborări'}</span></div>
                        {slotsTotal > 0 && <div><b>{slotsUsed}</b><span>selectați</span></div>}
                      </div>
                      {slotsTotal > 0 && (
                        <div className="bu-col" style={{ gap: 6 }}>
                          <div className="bu-row" style={{ justifyContent: 'space-between' }}>
                            <span className="bu-xs bu-muted" style={{ fontWeight: 600 }}>Locuri ocupate</span>
                            <b className="bu-xs">{slotsUsed} din {slotsTotal}</b>
                          </div>
                          <div className="bu-bar"><i style={{ width: `${pct}%` }} /></div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Footer */}
                  <div className="cp-foot">
                    {isDraft ? (
                      <>
                        <Link href={`/brand/campaigns/${c.id}`} className="bu-btn" style={{ flex: 1 }}>Continuă editarea</Link>
                        <button className="bu-btn p" style={{ flex: 1 }} onClick={() => handleStatusChange(c.id, 'ACTIVE')} disabled={isLoading}>
                          {isLoading ? '...' : 'Publică'}
                        </button>
                      </>
                    ) : (
                      <>
                        {dl ? (
                          <span className="bu-chip" style={{ background: dl.bg, color: dl.fg }}><Clock size={13} strokeWidth={2.2} />{dl.t}</span>
                        ) : c.status === 'PENDING_REVIEW' ? (
                          <span className="bu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}><Hourglass size={13} strokeWidth={2.2} />În așteptare</span>
                        ) : <span />}
                        <div className="bu-row" style={{ gap: 8 }}>
                          {c.status === 'ACTIVE' && (
                            <button className="bu-btn" onClick={() => handleStatusChange(c.id, 'PAUSED')} disabled={isLoading}>
                              <Pause size={14} /> {isLoading ? '...' : 'Pauză'}
                            </button>
                          )}
                          {c.status === 'PAUSED' && (
                            <button className="bu-btn p" onClick={() => handleStatusChange(c.id, 'ACTIVE')} disabled={isLoading}>
                              <Play size={14} /> {isLoading ? '...' : 'Reia'}
                            </button>
                          )}
                          <Link href={`/brand/campaigns/${c.id}`} className="bu-btn">Deschide</Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
          {canCreateCampaign ? (
            <button className="cp-new-tile" onClick={() => setShowSheet(true)}>
              <span className="i"><Plus size={22} strokeWidth={2.4} /></span>Campanie nouă
            </button>
          ) : (
            <Link href="/brand/wallet" className="cp-new-tile">
              <span className="i"><Lock size={20} /></span>Adaugă credite pentru a crea campanii
            </Link>
          )}
        </section>
      )}

      {/* ── Campaign type chooser ─────────────────────────────────────── */}
      {showSheet && (
        <div className="cp-overlay sheet" onClick={() => setShowSheet(false)}>
          <div className="cp-sheet" onClick={e => e.stopPropagation()}>
            <div className="bu-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div className="bu-col" style={{ gap: 2 }}>
                <h2 style={{ fontSize: 20 }}>Ce fel de campanie vrei să pornești?</h2>
                <span className="bu-sm bu-muted">Taxa de publicare e 149 RON pentru Barter.</span>
              </div>
              <button className="cp-x" aria-label="Închide" onClick={() => setShowSheet(false)}><X size={18} /></button>
            </div>
            <div className="cp-tiles">
              {TILES.map(t => (
                <button key={t.name} className="cp-tile" onClick={() => { setShowSheet(false); router.push(t.href) }}>
                  <span className="ti" style={{ background: t.bg, color: t.fg }}><t.Icon size={20} /></span>
                  <b>{t.name}</b>
                  <span className="bu-sm bu-muted">{t.desc}</span>
                  {t.note && <span className="bu-chip" style={{ background: '#fff1e6', color: '#9a4206', alignSelf: 'flex-start', height: 22, fontSize: 11 }}>{t.note}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="cp-overlay" style={{ alignItems: 'center' }}>
          <div className="bu-card" style={{ padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 24px 60px -20px rgba(20,18,58,.5)' }}>
            <div className="bu-ico" style={{ width: 48, height: 48, borderRadius: '50%', background: '#fde8e6', color: '#b42318', margin: '0 auto 14px' }}>
              <Trash2 size={22} />
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: 8, fontSize: 19 }}>Ștergi campania?</h3>
            <p className="bu-sm bu-muted" style={{ textAlign: 'center', margin: '0 0 20px' }}>
              Campania va fi mutată în arhivă și poate fi recuperată în termen de 30 de zile de echipa AddFame.
            </p>
            <div className="bu-row" style={{ gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} className="bu-btn" style={{ flex: 1, height: 46 }}>Anulează</button>
              <button onClick={() => handleDelete(confirmDelete)} className="bu-btn danger" style={{ flex: 1, height: 46, background: '#b42318', color: '#fff', borderColor: '#b42318' }} disabled={!!actionLoading}>
                {actionLoading ? '...' : 'Șterge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
