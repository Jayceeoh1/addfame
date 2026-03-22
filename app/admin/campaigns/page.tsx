'use client'
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { getAllCampaigns, adminUpdateCampaignStatus, deleteCampaign, getAllInfluencers } from '@/app/actions/admin'
import { getManagedCampaigns, assignInfluencersToManaged } from '@/app/actions/managed-campaigns'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, Search, Trash2, RefreshCw, Play, Pause,
  Archive, EyeOff, Sparkles, Users, Send, Check, X,
  ChevronDown, ChevronUp, Eye, FileText, MapPin,
  CheckCircle, Clock, AlertCircle, Star, Package,
  MessageSquare, Ban, ExternalLink, Copy, Download
} from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  PAUSED: { label: 'Paused', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  COMPLETED: { label: 'Completed', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  PENDING_REVIEW: { label: 'Pending Review', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
}

const TYPE_CFG: Record<string, { label: string; bg: string; text: string; emoji: string }> = {
  PAID: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700', emoji: '💰' },
  BARTER: { label: 'Barter', bg: 'bg-orange-100', text: 'text-orange-700', emoji: '🎁' },
  MANAGED: { label: 'Managed', bg: 'bg-purple-100', text: 'text-purple-700', emoji: '✨' },
  STANDARD: { label: 'Standard', bg: 'bg-gray-100', text: 'text-gray-700', emoji: '📋' },
}

const OBJECTIVE_LABELS: Record<string, string> = {
  awareness: '📣 Brand Awareness', sales: '💰 Creștere vânzări',
  followers: '👥 Followeri', ugc: '🎬 UGC', local: '📍 Promovare locală',
}

function fmt(n: number) { return `${(n || 0).toLocaleString('ro-RO')} RON` }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
}
function fmtFollowers(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n || 0)
}
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || url.trim().length < 4) return false
  try {
    const u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`)
    return u.hostname.includes('.')
  } catch { return false }
}
function safeUrl(url: string): string {
  if (!url) return ''
  return url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
}

export default function AdminCampaigns() {
  const [tab, setTab] = useState<'all' | 'managed'>('all')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [managed, setManaged] = useState<any[]>([])
  const [influencers, setInfluencers] = useState<any[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [loadingManaged, setLoadingManaged] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [selectedInfluencers, setSelectedInfluencers] = useState<Record<string, string[]>>({})
  const [influencerAmounts, setInfluencerAmounts] = useState<Record<string, Record<string, string>>>({}) // campaignId -> infId -> amount
  const [budgetMode, setBudgetMode] = useState<Record<string, 'fixed' | 'manual'>>({}) // campaignId -> mode
  const [assigning, setAssigning] = useState<string | null>(null)
  const [infSearch, setInfSearch] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [activeSection, setActiveSection] = useState<'brief' | 'influencers' | 'actions'>('brief')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const loadAll = useCallback(async () => {
    setLoadingAll(true)
    const res = await getAllCampaigns()
    if (res.success) setCampaigns(res.data ?? [])
    setLoadingAll(false)
  }, [])

  const loadManaged = useCallback(async () => {
    setLoadingManaged(true)
    const res = await getManagedCampaigns()
    if (res.success) setManaged(res.data)
    setLoadingManaged(false)
  }, [])

  const loadInfluencers = useCallback(async () => {
    const res = await getAllInfluencers({ limit: 300 })
    if (res.success && res.data) setInfluencers(res.data)
  }, [])

  useEffect(() => { loadAll(); loadManaged(); loadInfluencers() }, [loadAll, loadManaged, loadInfluencers])

  async function changeStatus(id: string, status: string) {
    setActionId(id)
    const res = await adminUpdateCampaignStatus(id, status)
    if (res.success) {
      setCampaigns(p => p.map(c => c.id === id ? { ...c, status } : c))
      setManaged(p => p.map(c => c.id === id ? { ...c, status } : c))
      if (selectedCampaign?.id === id) setSelectedCampaign((p: any) => ({ ...p, status }))
      notify('✅ Status actualizat.')
    } else notify((res as any).error || 'Eroare.', false)
    setActionId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi această campanie? Acțiunea nu poate fi anulată.')) return
    setActionId(id)
    const res = await deleteCampaign(id)
    if (res.success) {
      setCampaigns(p => p.filter(c => c.id !== id))
      setManaged(p => p.filter(c => c.id !== id))
      if (selectedCampaign?.id === id) setSelectedCampaign(null)
      notify('🗑 Campanie ștearsă.')
    } else notify((res as any).error || 'Eroare.', false)
    setActionId(null)
  }

  async function handleAssign(campaignId: string) {
    const ids = selectedInfluencers[campaignId] || []
    if (ids.length === 0) { notify('Selectează cel puțin un influencer.', false); return }

    const camp = [...campaigns, ...managed].find(c => c.id === campaignId)
    const mode = budgetMode[campaignId] || 'manual'
    const amounts = influencerAmounts[campaignId] || {}
    const budget = camp?.budget || 0
    const commission = Math.round(budget * 0.25)
    const distributable = budget - commission

    // Validare sume
    if (mode === 'manual') {
      const totalDistributed = ids.reduce((sum, id) => sum + (parseFloat(amounts[id] || '0') || 0), 0)
      if (totalDistributed > distributable) {
        notify(`Total distribuit (${totalDistributed} RON) depășește bugetul disponibil (${distributable} RON după comision).`, false)
        return
      }
      // Dacă un influencer nu are sumă setată, primește 0 (admin poate distribui mai târziu)
    }

    // Construiește payload cu sume
    const influencersWithAmounts = ids.map(id => {
      const amount = mode === 'fixed'
        ? Math.round(distributable / ids.length)
        : Math.round(parseFloat(amounts[id] || '0'))
      return { id, amount }
    })

    setAssigning(campaignId)
    const res = await assignInfluencersToManaged(campaignId, ids, influencersWithAmounts)
    if (res.success) {
      notify(`✅ ${res.count} influenceri asignați și notificați!`)
      setManaged(p => p.map(c => c.id === campaignId ? { ...c, status: 'ACTIVE' } : c))
      setCampaigns(p => p.map(c => c.id === campaignId ? { ...c, status: 'ACTIVE' } : c))
      if (selectedCampaign?.id === campaignId) setSelectedCampaign((p: any) => ({ ...p, status: 'ACTIVE' }))
    } else notify(res.error || 'Eroare.', false)
    setAssigning(null)
  }

  function toggleInfluencer(campaignId: string, infId: string) {
    setSelectedInfluencers(prev => {
      const cur = prev[campaignId] || []
      return { ...prev, [campaignId]: cur.includes(infId) ? cur.filter(i => i !== infId) : [...cur, infId] }
    })
  }

  function setInfluencerAmount(campaignId: string, infId: string, amount: string) {
    setInfluencerAmounts(prev => ({
      ...prev,
      [campaignId]: { ...(prev[campaignId] || {}), [infId]: amount }
    }))
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    notify('📋 Copiat!')
  }

  const counts = {
    all: campaigns.length,
    ACTIVE: campaigns.filter(c => c.status === 'ACTIVE').length,
    DRAFT: campaigns.filter(c => c.status === 'DRAFT').length,
    PAUSED: campaigns.filter(c => c.status === 'PAUSED').length,
    COMPLETED: campaigns.filter(c => c.status === 'COMPLETED').length,
    PENDING_REVIEW: campaigns.filter(c => c.status === 'PENDING_REVIEW').length,
  }

  const visible = campaigns.filter(c => {
    const q = search.toLowerCase()
    const matchQ = !q || c.title?.toLowerCase().includes(q) || c.brand_name?.toLowerCase().includes(q)
    const matchF = filter === 'all' || c.status === filter
    return matchQ && matchF
  })

  const pendingManaged = managed.filter(c => c.status === 'PENDING_REVIEW').length

  const filteredInfs = influencers.filter(inf => {
    const q = infSearch.toLowerCase()
    return !q || inf.name?.toLowerCase().includes(q) || inf.city?.toLowerCase().includes(q) ||
      inf.niches?.some((n: string) => n.toLowerCase().includes(q))
  })

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .tab-btn { padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:none;white-space:nowrap;font-family:inherit;transition:all .15s; }
        .tab-btn.on { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;box-shadow:0 3px 10px rgba(99,102,241,.3); }
        .tab-btn:not(.on) { background:#f3f4f6;color:#6b7280; }
        .tab-btn:not(.on):hover { background:#eef2ff;color:#4f46e5; }
        .field { padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;width:100%; }
        .field:focus { border-color:#6366f1; }
        .action-btn { display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:#f3f4f6;border:none;cursor:pointer;transition:all .15s;color:#6b7280; }
        .action-btn:hover { background:#eef2ff;color:#4f46e5; }
        .action-btn.red:hover { background:#fff5f5;color:#ef4444; }
        .action-btn.green:hover { background:#f0fdf4;color:#22c55e; }
        tr:hover td { background:#fafbff; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
        .fade-up { animation:fadeUp .35s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .section-btn { padding:8px 16px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .15s; }
        .section-btn.active { background:#6366f1;color:white; }
        .section-btn:not(.active) { background:#f3f4f6;color:#6b7280; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Campanii</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {counts.ACTIVE > 0 && <span className="text-green-600 font-bold">{counts.ACTIVE} active · </span>}
            {counts.all} total
            {pendingManaged > 0 && <span className="ml-2 text-purple-600 font-bold animate-pulse">· ⚡ {pendingManaged} managed în așteptare</span>}
          </p>
        </div>
        <button onClick={() => { loadAll(); loadManaged() }}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-gray-200 bg-white">
          <RefreshCw className={`w-3.5 h-3.5 ${(loadingAll || loadingManaged) ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-5 fade-up" style={{ animationDelay: '.03s' }}>
        <button className={`tab-btn ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>
          Toate campaniile
          <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === 'all' ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>{counts.all}</span>
        </button>
        <button className={`tab-btn flex items-center gap-2 ${tab === 'managed' ? 'on' : ''}`}
          onClick={() => setTab('managed')}
          style={tab === 'managed' ? { background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' } : {}}>
          <Sparkles className="w-3.5 h-3.5" /> Managed
          {pendingManaged > 0 && (
            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === 'managed' ? 'bg-white/25' : 'bg-purple-100 text-purple-600'}`}>
              {pendingManaged} nou
            </span>
          )}
        </button>
      </div>

      {/* ── ALL CAMPAIGNS TAB ── */}
      {tab === 'all' && (
        <>
          <div className="card p-4 mb-5 fade-up">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="field" placeholder="Caută după titlu sau brand…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {(['all', 'ACTIVE', 'PENDING_REVIEW', 'DRAFT', 'PAUSED', 'COMPLETED'] as const).map(f => (
                <button key={f} className={`tab-btn flex-shrink-0 ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'PENDING_REVIEW' ? 'În așteptare' : f.charAt(0) + f.slice(1).toLowerCase()}
                  <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white/25' : 'bg-gray-200 text-gray-500'}`}>
                    {f === 'all' ? counts.all : counts[f as keyof typeof counts] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden fade-up">
            {loadingAll ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-400">Nicio campanie găsită</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1.5px solid #f0f0f0', background: '#fafafa' }}>
                    <tr>
                      {['Campanie', 'Brand', 'Tip', 'Buget', 'Deadline', 'Status', 'Acțiuni'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(c => {
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                      const typeCfg = TYPE_CFG[c.campaign_type] ?? TYPE_CFG.STANDARD
                      const busy = actionId === c.id
                      const days = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 864e5) : null
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                          onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote('') }}>
                          <td className="px-5 py-4">
                            <p className="font-black text-gray-900 max-w-[180px] truncate">{c.title?.replace('[Managed] ', '').replace('[Barter] ', '')}</p>
                            <p className="text-xs text-gray-400">{c.platforms?.join(', ')}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-600">{c.brand_name || '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeCfg.bg} ${typeCfg.text}`}>
                              {typeCfg.emoji} {typeCfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-black text-green-600">
                            {c.campaign_type === 'BARTER' ? `${c.offer_value || 0} RON` : fmt(c.budget || 0)}
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">
                            {c.deadline ? new Date(c.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '—'}
                            {days !== null && days < 0 && <span className="ml-1 text-red-400 font-bold">Expirat</span>}
                            {days !== null && days >= 0 && days <= 3 && <span className="ml-1 text-orange-400 font-bold">{days}z</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button className="action-btn" title="Vezi detalii"
                                onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote('') }}>
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {c.status === 'PENDING_REVIEW' && (
                                <button className="action-btn green" title="Aprobă"
                                  onClick={() => changeStatus(c.id, 'ACTIVE')} disabled={busy}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.status !== 'ACTIVE' && c.status !== 'PENDING_REVIEW' && (
                                <button className="action-btn" onClick={() => changeStatus(c.id, 'ACTIVE')} disabled={busy} title="Activează">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.status === 'ACTIVE' && (
                                <button className="action-btn" onClick={() => changeStatus(c.id, 'PAUSED')} disabled={busy} title="Pauză">
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button className="action-btn red" onClick={() => handleDelete(c.id)} disabled={busy} title="Șterge">
                                {busy ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MANAGED TAB ── */}
      {tab === 'managed' && (
        <div className="space-y-4 fade-up">
          {loadingManaged ? (
            <div className="card flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
            </div>
          ) : managed.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="font-black text-gray-700 text-lg mb-2">Nicio campanie Managed</p>
              <p className="text-sm text-gray-400">Când brandurile trimit campanii managed, apar aici.</p>
            </div>
          ) : managed.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
            const isPending = c.status === 'PENDING_REVIEW'
            const days = c.deadline ? daysLeft(c.deadline) : null
            return (
              <div key={c.id} className="card overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote('') }}>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                        </span>
                        {isPending && <span className="bg-yellow-100 text-yellow-700 text-xs font-black px-2.5 py-1 rounded-full animate-pulse">⚡ Necesită acțiune</span>}
                        {c.managed_objective && <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{OBJECTIVE_LABELS[c.managed_objective] || '🎯'}</span>}
                      </div>
                      <h3 className="font-black text-gray-900 text-base">{c.product_name || c.title?.replace('[Managed] ', '')}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{c.brand_name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{c.platforms?.join(', ')}</span>
                        {c.deadline && <span>· {days !== null && days >= 0 ? `${days}z rămase` : 'Expirat'}</span>}
                        <span>· {c.max_influencers} influenceri</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-green-600 text-xl">{fmt(c.budget)}</p>
                      <p className="text-xs text-gray-400">buget total</p>
                      <p className="text-xs font-bold text-purple-600 mt-1">{fmt(Math.round((c.budget || 0) * 0.25))} comision</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <button onClick={e => { e.stopPropagation(); setSelectedCampaign(c); setActiveSection('brief') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 transition">
                      <FileText className="w-3.5 h-3.5" /> Brief
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelectedCampaign(c); setActiveSection('influencers') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700 transition">
                      <Users className="w-3.5 h-3.5" /> Influenceri
                    </button>
                    {isPending && (
                      <button onClick={e => { e.stopPropagation(); changeStatus(c.id, 'ACTIVE') }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobă
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL FULL ACCESS — se deschide la click pe orice campanie
          ══════════════════════════════════════════════════════ */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedCampaign(null) }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-start justify-between flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {(() => {
                    const typeCfg = TYPE_CFG[selectedCampaign.campaign_type] ?? TYPE_CFG.STANDARD
                    const cfg = STATUS_CFG[selectedCampaign.status] ?? STATUS_CFG.DRAFT
                    return (<>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${typeCfg.bg} ${typeCfg.text}`}>{typeCfg.emoji} {typeCfg.label}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                      </span>
                    </>)
                  })()}
                  {selectedCampaign.status === 'PENDING_REVIEW' && (
                    <span className="text-xs font-black bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full animate-pulse">⚡ Necesită aprobare</span>
                  )}
                </div>
                <h2 className="font-black text-gray-900 text-xl leading-tight">
                  {selectedCampaign.product_name || selectedCampaign.title?.replace('[Managed] ', '').replace('[Barter] ', '')}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedCampaign.brand_name}</p>
              </div>
              <button onClick={() => setSelectedCampaign(null)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Section tabs */}
            <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0">
              {[
                { id: 'brief', label: 'Brief & Detalii', icon: FileText },
                { id: 'influencers', label: `Influenceri (${(selectedInfluencers[selectedCampaign.id] || []).length} sel.)`, icon: Users },
                { id: 'actions', label: 'Acțiuni Admin', icon: CheckCircle },
              ].map(s => (
                <button key={s.id}
                  className={`section-btn flex items-center gap-2 ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.id as any)}>
                  <s.icon className="w-3.5 h-3.5" />{s.label}
                </button>
              ))}
            </div>

            {/* Modal body — scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── BRIEF & DETALII ── */}
              {activeSection === 'brief' && (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 text-center">
                      <p className="text-lg font-black text-green-600">{fmt(selectedCampaign.budget || 0)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Buget total</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 text-center">
                      <p className="text-lg font-black text-purple-600">{fmt(Math.round((selectedCampaign.budget || 0) * 0.25))}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Comision AddFame</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 text-center">
                      <p className="text-lg font-black text-blue-600">{selectedCampaign.max_influencers || 0}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Influenceri dorit</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-center">
                      <p className="text-base font-black text-gray-900">
                        {selectedCampaign.deadline ? fmtDate(selectedCampaign.deadline) : '—'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Deadline</p>
                    </div>
                  </div>

                  {/* Imagine produs */}
                  {(selectedCampaign.offer_image_url || selectedCampaign.product_image_url) && (
                    <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ maxHeight: 200 }}>
                      <img src={selectedCampaign.offer_image_url || selectedCampaign.product_image_url}
                        alt="Produs" className="w-full h-full object-cover" style={{ maxHeight: 200 }} />
                    </div>
                  )}

                  {/* Obiectiv */}
                  {selectedCampaign.managed_objective && (
                    <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-2xl p-4">
                      <span className="text-2xl">{OBJECTIVE_LABELS[selectedCampaign.managed_objective]?.split(' ')[0]}</span>
                      <div>
                        <p className="text-xs font-black text-purple-700 uppercase tracking-wider">Obiectiv campanie</p>
                        <p className="font-black text-gray-900">{OBJECTIVE_LABELS[selectedCampaign.managed_objective]?.slice(2)}</p>
                      </div>
                    </div>
                  )}

                  {/* Produs */}
                  {(selectedCampaign.product_name || selectedCampaign.offer_name) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2">📦 Produs / Ofertă</p>
                      <p className="font-black text-gray-900">{selectedCampaign.product_name || selectedCampaign.offer_name}</p>
                      {selectedCampaign.product_url && isValidUrl(selectedCampaign.product_url) && (
                        <a href={safeUrl(selectedCampaign.product_url)} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1 transition">
                          <ExternalLink className="w-3 h-3" />{selectedCampaign.product_url}
                        </a>
                      )}
                      {(selectedCampaign.product_description || selectedCampaign.offer_description) && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                          {selectedCampaign.product_description || selectedCampaign.offer_description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Descriere */}
                  {selectedCampaign.description && (
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Descriere campanie</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedCampaign.description}</p>
                    </div>
                  )}

                  {/* Mesaje cheie */}
                  {selectedCampaign.key_messages?.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">⭐ Mesaje cheie obligatorii</p>
                      <ul className="space-y-2">
                        {selectedCampaign.key_messages.map((m: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            <span className="flex-1">{m}</span>
                            <button onClick={() => copyToClipboard(m)} className="text-gray-300 hover:text-amber-500 transition">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instrucțiuni conținut */}
                  {selectedCampaign.managed_instructions && (
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-purple-700 uppercase tracking-wider mb-2">📋 Instrucțiuni conținut</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedCampaign.managed_instructions}</p>
                    </div>
                  )}

                  {/* Story instructions (barter) */}
                  {selectedCampaign.story_instructions && (
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-pink-700 uppercase tracking-wider mb-2">📱 Instrucțiuni postare</p>
                      <p className="text-sm text-gray-600">{selectedCampaign.story_instructions}</p>
                    </div>
                  )}

                  {/* Ce să evite */}
                  {selectedCampaign.forbidden_content && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-red-700 uppercase tracking-wider mb-2">🚫 Ce să evite</p>
                      <p className="text-sm text-gray-600">{selectedCampaign.forbidden_content}</p>
                    </div>
                  )}

                  {/* Platforme + Nișe */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforme</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedCampaign.platforms || []).map((p: string) => (
                          <span key={p} className="text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{p}</span>
                        ))}
                      </div>
                    </div>
                    {selectedCampaign.niches?.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Nișe dorite</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCampaign.niches.map((n: string) => (
                            <span key={n} className="text-xs font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info barter */}
                  {selectedCampaign.campaign_type === 'BARTER' && (
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-gray-400">Tip ofertă</p><p className="font-black">{selectedCampaign.offer_type === 'product' ? '📦 Produs' : '🛠️ Serviciu'}</p></div>
                      <div><p className="text-xs text-gray-400">Valoare ofertă</p><p className="font-black text-orange-600">{selectedCampaign.offer_value} RON</p></div>
                      <div><p className="text-xs text-gray-400">Ridicare</p><p className="font-black">{selectedCampaign.delivery_method === 'pickup' ? '📍 Din locație' : '🚚 Livrare'}</p></div>
                      <div><p className="text-xs text-gray-400">Slots</p><p className="font-black">{selectedCampaign.current_influencers || 0}/{selectedCampaign.max_influencers}</p></div>
                      {selectedCampaign.pickup_location_name && (
                        <div className="col-span-2"><p className="text-xs text-gray-400">Locație pickup</p><p className="font-black">📍 {selectedCampaign.pickup_location_name}</p></div>
                      )}
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between"><span>ID campanie</span><span className="font-mono text-gray-600 cursor-pointer hover:text-indigo-600" onClick={() => copyToClipboard(selectedCampaign.id)}>{selectedCampaign.id.slice(0, 8)}... <Copy className="w-2.5 h-2.5 inline" /></span></div>
                    <div className="flex justify-between"><span>Creat</span><span>{selectedCampaign.created_at ? fmtDate(selectedCampaign.created_at) : '—'}</span></div>
                    <div className="flex justify-between"><span>Actualizat</span><span>{selectedCampaign.updated_at ? fmtDate(selectedCampaign.updated_at) : '—'}</span></div>
                  </div>
                </div>
              )}

              {/* ── INFLUENCERI ── */}
              {activeSection === 'influencers' && (
                <div className="space-y-4">
                  {/* Budget summary */}
                  {selectedCampaign.budget > 0 && (() => {
                    const budget = selectedCampaign.budget || 0
                    const commission = Math.round(budget * 0.25)
                    const distributable = budget - commission
                    const ids = selectedInfluencers[selectedCampaign.id] || []
                    const mode = budgetMode[selectedCampaign.id] || 'manual'
                    const amounts = influencerAmounts[selectedCampaign.id] || {}
                    const totalDistributed = mode === 'fixed'
                      ? (ids.length > 0 ? Math.round(distributable / ids.length) * ids.length : 0)
                      : ids.reduce((sum, id) => sum + (parseFloat(amounts[id] || '0') || 0), 0)
                    const remaining = distributable - totalDistributed
                    return (
                      <div className="bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200 rounded-2xl p-4">
                        <div className="grid grid-cols-4 gap-3 text-center mb-3">
                          <div>
                            <p className="text-xs text-gray-400">Buget total</p>
                            <p className="font-black text-gray-900">{fmt(budget)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Comision 25%</p>
                            <p className="font-black text-purple-600">{fmt(commission)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Distribuit</p>
                            <p className="font-black text-green-600">{fmt(totalDistributed)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Rămas</p>
                            <p className={`font-black ${remaining < 0 ? 'text-red-500' : 'text-gray-900'}`}>{fmt(remaining)}</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (totalDistributed / distributable) * 100)}%`,
                              background: remaining < 0 ? '#ef4444' : 'linear-gradient(90deg,#8b5cf6,#06b6d4)'
                            }} />
                        </div>
                        {remaining < 0 && (
                          <p className="text-xs text-red-500 font-bold mt-2">⚠️ Depășești bugetul disponibil cu {fmt(Math.abs(remaining))}</p>
                        )}
                      </div>
                    )
                  })()}

                  {/* Budget mode selector */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Mod distribuție</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBudgetMode(p => ({ ...p, [selectedCampaign.id]: 'manual' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-black transition ${(budgetMode[selectedCampaign.id] || 'manual') === 'manual' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        ✋ Manual (per influencer)
                      </button>
                      <button
                        onClick={() => setBudgetMode(p => ({ ...p, [selectedCampaign.id]: 'fixed' }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-black transition ${budgetMode[selectedCampaign.id] === 'fixed' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        ⚖️ Fix (împărțit egal)
                      </button>
                    </div>
                    {budgetMode[selectedCampaign.id] === 'fixed' && (selectedInfluencers[selectedCampaign.id] || []).length > 0 && (
                      <p className="text-xs text-purple-600 font-bold mt-1.5 text-center">
                        Fiecare influencer primește: {fmt(Math.round((selectedCampaign.budget * 0.75) / (selectedInfluencers[selectedCampaign.id] || []).length))}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-gray-900">Selectează influenceri</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {selectedCampaign.max_influencers ? `Brand vrea ${selectedCampaign.max_influencers} · ` : ''}
                        {(selectedInfluencers[selectedCampaign.id] || []).length} selectați
                      </p>
                    </div>
                    {(selectedInfluencers[selectedCampaign.id] || []).length > 0 && (
                      <button
                        onClick={() => handleAssign(selectedCampaign.id)}
                        disabled={assigning === selectedCampaign.id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                        {assigning === selectedCampaign.id
                          ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Asignez...</>
                          : <><Send className="w-4 h-4" /> Asignează & Notifică ({(selectedInfluencers[selectedCampaign.id] || []).length})</>
                        }
                      </button>
                    )}
                  </div>

                  {/* Nișe hint */}
                  {selectedCampaign.niches?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-xs text-gray-400 font-bold">Nișe dorite:</span>
                      {selectedCampaign.niches.map((n: string) => (
                        <span key={n} className="text-xs font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{n}</span>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 transition"
                      placeholder="Caută după nume, oraș, nișă..."
                      value={infSearch}
                      onChange={e => setInfSearch(e.target.value)}
                    />
                  </div>

                  {/* Influencers grid */}
                  {filteredInfs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                      <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="font-bold text-gray-400 text-sm">
                        {influencers.length === 0 ? 'Se încarcă influencerii...' : 'Niciun influencer găsit'}
                      </p>
                      {infSearch && <p className="text-xs text-gray-400 mt-1">Încearcă alt termen de căutare</p>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                      {filteredInfs.map(inf => {
                        const isSelected = (selectedInfluencers[selectedCampaign.id] || []).includes(inf.id)
                        const followers = (inf.ig_followers || 0) + (inf.tt_followers || 0) + (inf.yt_subscribers || 0)
                        const hasNicheMatch = selectedCampaign.niches?.some((n: string) => inf.niches?.includes(n))
                        return (
                          <button key={inf.id} type="button"
                            onClick={() => toggleInfluencer(selectedCampaign.id, inf.id)}
                            className={`p-3 rounded-2xl border-2 text-left transition relative ${isSelected ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-200 bg-white'}`}>
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {hasNicheMatch && !isSelected && (
                              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-green-400 flex items-center justify-center" title="Nișă potrivită">
                                <span className="text-[8px] text-white font-black">✓</span>
                              </div>
                            )}
                            {inf.is_verified && (
                              <div className="absolute top-2 left-2">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2 mt-1">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                                {inf.avatar
                                  ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                                  : <span className="text-white font-black text-sm">{inf.name?.[0]}</span>
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-xs text-gray-900 truncate">{inf.name}</p>
                                <div className="flex items-center gap-1">
                                  {inf.city && <p className="text-[10px] text-orange-500">📍 {inf.city}</p>}
                                  {inf.approval_status && inf.approval_status !== 'approved' && (
                                    <span className="text-[8px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-600">{inf.approval_status}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              {followers > 0 && <p className="text-[10px] font-bold text-gray-500">👥 {fmtFollowers(followers)} followeri</p>}
                              {inf.ig_engagement_rate > 0 && <p className="text-[10px] font-bold text-green-600">📊 ER {inf.ig_engagement_rate}%</p>}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {inf.niches?.slice(0, 2).map((n: string) => (
                                <span key={n} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedCampaign.niches?.includes(n) ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{n}</span>
                              ))}
                            </div>
                            {/* Amount input - shown when selected and manual mode */}
                            {isSelected && (budgetMode[selectedCampaign.id] || 'manual') === 'manual' && (
                              <div className="mt-2" onClick={e => e.stopPropagation()}>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="RON"
                                    value={(influencerAmounts[selectedCampaign.id] || {})[inf.id] || ''}
                                    onChange={e => setInfluencerAmount(selectedCampaign.id, inf.id, e.target.value)}
                                    className="w-full px-2 py-1.5 pr-10 border-2 border-purple-300 rounded-lg text-xs font-black outline-none focus:border-purple-500 bg-white"
                                    onClick={e => e.stopPropagation()}
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-purple-400">RON</span>
                                </div>
                              </div>
                            )}
                            {/* Show fixed amount when fixed mode */}
                            {isSelected && budgetMode[selectedCampaign.id] === 'fixed' && (selectedInfluencers[selectedCampaign.id] || []).length > 0 && (
                              <div className="mt-2 text-center">
                                <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                  {fmt(Math.round((selectedCampaign.budget * 0.75) / (selectedInfluencers[selectedCampaign.id] || []).length))}
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── ACȚIUNI ADMIN ── */}
              {activeSection === 'actions' && (
                <div className="space-y-4">

                  {/* Status quick actions */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Schimbă status</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedCampaign.status !== 'ACTIVE' && (
                        <button onClick={() => changeStatus(selectedCampaign.id, 'ACTIVE')}
                          className="flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm text-white bg-green-500 hover:bg-green-600 transition">
                          <Play className="w-4 h-4" /> Activează campania
                        </button>
                      )}
                      {selectedCampaign.status === 'PENDING_REVIEW' && (
                        <button onClick={() => changeStatus(selectedCampaign.id, 'ACTIVE')}
                          className="flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm text-white transition col-span-2"
                          style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                          <CheckCircle className="w-4 h-4" /> ✅ Aprobă campania
                        </button>
                      )}
                      {selectedCampaign.status === 'ACTIVE' && (
                        <button onClick={() => changeStatus(selectedCampaign.id, 'PAUSED')}
                          className="flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                          <Pause className="w-4 h-4" /> Pune în pauză
                        </button>
                      )}
                      {selectedCampaign.status !== 'DRAFT' && (
                        <button onClick={() => changeStatus(selectedCampaign.id, 'DRAFT')}
                          className="flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                          <EyeOff className="w-4 h-4" /> Setează Draft
                        </button>
                      )}
                      {selectedCampaign.status !== 'COMPLETED' && (
                        <button onClick={() => changeStatus(selectedCampaign.id, 'COMPLETED')}
                          className="flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                          <Archive className="w-4 h-4" /> Marchează completat
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notă admin */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Notă internă admin</p>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-400 transition resize-none"
                      rows={3}
                      placeholder="Notă internă despre această campanie (nu e vizibilă brandului)..."
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                    />
                    <button
                      onClick={async () => {
                        setSavingNote(true)
                        const sb = createClient()
                        await sb.from('campaigns').update({ admin_notes: adminNote }).eq('id', selectedCampaign.id)
                        setSavingNote(false)
                        notify('✅ Notă salvată.')
                      }}
                      disabled={savingNote || !adminNote.trim()}
                      className="mt-2 px-4 py-2 rounded-xl text-sm font-black text-white bg-indigo-500 hover:bg-indigo-600 transition disabled:opacity-40">
                      {savingNote ? 'Salvez...' : 'Salvează nota'}
                    </button>
                  </div>

                  {/* Link-uri rapide */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Link-uri rapide</p>
                    <div className="space-y-2">
                      <button onClick={() => copyToClipboard(selectedCampaign.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-left">
                        <Copy className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-black text-gray-700">Copiază ID campanie</p>
                          <p className="text-[10px] text-gray-400 font-mono">{selectedCampaign.id}</p>
                        </div>
                      </button>
                      {(isValidUrl(selectedCampaign.brand_website) || isValidUrl(selectedCampaign.product_url)) && (
                        <a href={safeUrl(selectedCampaign.brand_website || selectedCampaign.product_url)} target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-left">
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs font-black text-gray-700">Deschide website brand</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-xs">{selectedCampaign.brand_website || selectedCampaign.product_url}</p>
                          </div>
                        </a>
                      )}
                      {!isValidUrl(selectedCampaign.brand_website) && !isValidUrl(selectedCampaign.product_url) && (
                        <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 text-left opacity-50">
                          <ExternalLink className="w-4 h-4 text-gray-300" />
                          <p className="text-xs text-gray-400">Website brand — nesetat sau invalid</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-3">Danger Zone</p>
                    <button onClick={() => handleDelete(selectedCampaign.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-200">
                      <Trash2 className="w-4 h-4" /> Șterge campania definitiv
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
