'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, Trash2, FileText, Download, X, Send, ChevronDown } from 'lucide-react'
import { cesiuneLabel, CESIUNE_CLAUSES_VERSION } from '@/lib/cesiune-clauses'
import { campaignName } from '@/lib/campaign-name'

type UGCContract = {
  id: string; token: string; influencer_name: string; influencer_email: string
  influencer_phone?: string; influencer_address?: string
  amount_lei: number; payment_days: number; notes?: string
  status: 'draft' | 'sent' | 'signed' | 'archived'; signed_at?: string; created_at: string
}

type ColabContract = {
  id: string; token: string; influencer_name: string; influencer_email: string
  influencer_phone?: string; influencer_address?: string
  amount_lei: number; payment_days: number
  campaign_title?: string; platform?: string; deliverables?: string; notes?: string
  status: 'draft' | 'sent' | 'signed' | 'archived'; signed_at?: string; created_at: string
}

type CesiuneContract = {
  id: string; token: string; contract_number?: string
  influencer_name: string; influencer_email: string; influencer_phone?: string
  influencer_cnp?: string; influencer_ci_serie?: string; influencer_ci_numar?: string; influencer_address?: string
  campaign_id?: string | null; campaign_title?: string; product_name?: string; product_value_lei?: number
  brand_name?: string; brand_cui?: string; brand_reg_com?: string; brand_address?: string; brand_website?: string
  notes?: string; clauses_version?: number | null
  campaign?: { name: string; offer_name: string | null; status: string | null; brand: string | null } | null
  status: 'draft' | 'sent' | 'signed' | 'archived'; signed_at?: string; created_at: string
}

type Campaign = {
  id: string; title: string; status: string
  product_name?: string; deliverables?: string; platforms?: string[] | string
  brand_name?: string; brand_legal_name?: string; brand_cui?: string; brand_address?: string; brand_website?: string
}

type CampaignInfluencer = { influencer_id: string; name: string; email: string; has_contract: boolean }

type TabKey = 'ugc' | 'campanii' | 'cesiune'

const NO_CAMPAIGN = 'none'
const CAMP_STATUS: Record<string, string> = { active: 'Activă', ACTIVE: 'Activă', draft: 'Draft', DRAFT: 'Draft', completed: 'Încheiată', COMPLETED: 'Încheiată', paused: 'Pe pauză', PAUSED: 'Pe pauză', archived: 'Arhivată', ARCHIVED: 'Arhivată' }

const STATUS_CFG = {
  draft:    { label: 'Draft',   bg: 'bg-gray-100',   text: 'text-gray-600',  dot: 'bg-gray-400' },
  sent:     { label: 'Trimis',  bg: 'bg-blue-100',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  signed:   { label: 'Semnat',  bg: 'bg-green-100',  text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Arhivat', bg: 'bg-orange-100', text: 'text-orange-700',dot: 'bg-orange-400' },
}

// path/endpoint + culori per tip de contract
const CFG: Record<TabKey, { label: string; list: string; pdf: string; api: string; accent: string; grad: string; shadow: string }> = {
  ugc:      { label: 'UGC',           list: 'contract',            pdf: 'ugc-contracts',       api: 'ugc',       accent: '#6366f1', grad: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', shadow: 'rgba(99,102,241,0.35)' },
  campanii: { label: 'Colaborare',    list: 'contract-colaborare', pdf: 'colaborare-contracts',api: 'colaborare',accent: '#f97316', grad: 'linear-gradient(135deg,#22c8f0,#7040f0)', shadow: 'rgba(249,115,22,0.35)' },
  cesiune:  { label: 'Cesiune Autor', list: 'contract-cesiune',    pdf: 'cesiune-contracts',   api: 'cesiune',   accent: '#0ea5e9', grad: 'linear-gradient(135deg,#22c8f0,#5a35e6)', shadow: 'rgba(14,165,233,0.35)' },
}

export default function ContractsPage() {
  const [tab, setTab] = useState<TabKey>('ugc')
  const [ugcContracts, setUgcContracts] = useState<UGCContract[]>([])
  const [colabContracts, setColabContracts] = useState<ColabContract[]>([])
  const [cesContracts, setCesContracts] = useState<CesiuneContract[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campInfluencers, setCampInfluencers] = useState<CampaignInfluencer[]>([])
  const [loadingInf, setLoadingInf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendNow, setSendNow] = useState(true) // „Creează și trimite creatorului” (cesiune)
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null)
  const [campFilter, setCampFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsigned' | 'signed'>('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [bulkArmed, setBulkArmed] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState<string | null>(null)
  const flash = (msg: string, ok = true) => { setNotice({ msg, ok }); setTimeout(() => setNotice(null), 6000) }

  /** Un click: notificare în platformă + email + Telegram (dacă e legat). */
  async function sendContract(id: string) {
    setSendingId(id)
    try {
      const r = await fetch(`/api/admin/contracts/cesiune/${id}/send`, { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { flash(d.error || 'Nu am putut trimite contractul.', false); return false }
      const ch = [d.sent?.app && 'platformă', d.sent?.email && 'email', d.sent?.whatsapp && 'WhatsApp', d.sent?.telegram && 'Telegram'].filter(Boolean).join(' + ')
      flash(`✉️ Contract trimis la semnat (${ch}).${d.whatsappNote && d.whatsappNote !== 'neconfigurat' ? ` WhatsApp: ${d.whatsappNote}.` : ''}`)
      setCesContracts(prev => prev.map(c => c.id === id ? { ...c, status: 'sent' } : c))
      return true
    } finally { setSendingId(null) }
  }

  const [ugcForm, setUgcForm] = useState({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', notes: '' })
  const [colabForm, setColabForm] = useState({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', campaign_title: '', platform: '', deliverables: '', notes: '' })
  const [cesForm, setCesForm] = useState({
    influencer_name: '', influencer_email: '', influencer_phone: '',
    influencer_cnp: '', influencer_ci_serie: '', influencer_ci_numar: '', influencer_address: '',
    campaign_title: '', product_name: '', product_value_lei: '', contract_number: '',
    brand_name: '', brand_cui: '', brand_reg_com: '', brand_address: '', brand_website: '', notes: '',
    campaign_id: '', influencer_id: '',
  })

  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [r1, r2, r3, r4] = await Promise.all([
      fetch('/api/admin/contracts/ugc').then(r => r.json()),
      fetch('/api/admin/contracts/colaborare').then(r => r.json()),
      fetch('/api/admin/contracts/cesiune').then(r => r.json()),
      fetch('/api/admin/contracts/campaigns').then(r => r.json()),
    ])
    setUgcContracts(r1.contracts || [])
    setColabContracts(r2.contracts || [])
    setCesContracts(r3.contracts || [])
    setCampaigns(r4.campaigns || [])
    setLoading(false)
  }

  async function createUGC(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/admin/contracts/ugc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ugcForm, amount_lei: parseFloat(ugcForm.amount_lei), payment_days: parseInt(ugcForm.payment_days) }) })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setUgcContracts(prev => [data.contract, ...prev])
      setShowNew(false)
      setUgcForm({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', notes: '' })
    } finally { setSaving(false) }
  }

  async function createColab(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/admin/contracts/colaborare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...colabForm, amount_lei: parseFloat(colabForm.amount_lei), payment_days: parseInt(colabForm.payment_days) }) })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setColabContracts(prev => [data.contract, ...prev])
      setShowNew(false)
      setColabForm({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', campaign_title: '', platform: '', deliverables: '', notes: '' })
    } finally { setSaving(false) }
  }

  async function createCes(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...cesForm, product_value_lei: cesForm.product_value_lei ? parseFloat(cesForm.product_value_lei) : null }
      const res = await fetch('/api/admin/contracts/cesiune', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setCesContracts(prev => [data.contract, ...prev])
      if (sendNow && data.contract?.id) await sendContract(data.contract.id)
      // marchează influencerul ca având deja contract (bifă în selector)
      if (cesForm.influencer_id) {
        setCampInfluencers(prev => prev.map(i => i.influencer_id === cesForm.influencer_id ? { ...i, has_contract: true } : i))
      }
      // resetează doar influencerul; păstrează campania + brandul ca să creezi rapid următorul
      setCesForm(f => ({
        ...f,
        influencer_name: '', influencer_email: '', influencer_phone: '',
        influencer_cnp: '', influencer_ci_serie: '', influencer_ci_numar: '', influencer_address: '',
        contract_number: '', influencer_id: '',
      }))
    } finally { setSaving(false) }
  }

  async function selectCesCampaign(id: string) {
    applyCampaign(id, 'ces')
    setCesForm(f => ({ ...f, campaign_id: id, influencer_id: '' }))
    setCampInfluencers([])
    if (!id) return
    setLoadingInf(true)
    try {
      const r = await fetch(`/api/admin/contracts/campaign-influencers?campaign_id=${id}`).then(r => r.json())
      setCampInfluencers(r.influencers || [])
    } finally { setLoadingInf(false) }
  }

  function selectCesInfluencer(influencerId: string) {
    const inf = campInfluencers.find(i => i.influencer_id === influencerId)
    if (!inf) { setCesForm(f => ({ ...f, influencer_id: '' })); return }
    setCesForm(f => ({ ...f, influencer_id: influencerId, influencer_name: inf.name, influencer_email: inf.email }))
  }

  function applyCampaign(id: string, target: 'ces' | 'colab') {
    const camp = campaigns.find(c => c.id === id)
    if (!camp) return
    const platforms = Array.isArray(camp.platforms) ? camp.platforms.join(', ') : (camp.platforms || '')
    if (target === 'ces') {
      setCesForm(f => ({
        ...f,
        campaign_title: camp.title || f.campaign_title,
        product_name: camp.product_name || f.product_name,
        brand_name: camp.brand_legal_name || camp.brand_name || f.brand_name,
        brand_cui: camp.brand_cui || f.brand_cui,
        brand_address: camp.brand_address || f.brand_address,
        brand_website: camp.brand_website || f.brand_website,
      }))
    } else {
      setColabForm(f => ({
        ...f,
        campaign_title: camp.title || f.campaign_title,
        platform: platforms || f.platform,
        deliverables: camp.deliverables || f.deliverables,
      }))
    }
  }

  function copyLink(contract: { id: string; token: string; status: string }, type: TabKey) {
    const url = `${window.location.origin}/${CFG[type].list}/${contract.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(contract.id)
    if (contract.status === 'draft') updateStatus(contract.id, 'sent', type)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function updateStatus(id: string, status: string, type: TabKey) {
    const endpoint = `/api/admin/contracts/${CFG[type].api}/${id}`
    const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const data = await res.json()
    if (!data.error) {
      if (type === 'ugc') setUgcContracts(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c))
      else if (type === 'campanii') setColabContracts(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c))
      else setCesContracts(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c))
    }
  }

  async function deleteContract(id: string, type: TabKey) {
    if (!confirm('Arhivezi acest contract?')) return
    const endpoint = `/api/admin/contracts/${CFG[type].api}/${id}`
    const res = await fetch(endpoint, { method: 'DELETE' })
    const data = await res.json()
    if (!data.error) {
      if (type === 'ugc') setUgcContracts(prev => prev.filter(c => c.id !== id))
      else if (type === 'campanii') setColabContracts(prev => prev.filter(c => c.id !== id))
      else setCesContracts(prev => prev.filter(c => c.id !== id))
    }
  }

  const contracts: Array<UGCContract | ColabContract | CesiuneContract> =
    tab === 'ugc' ? ugcContracts : tab === 'campanii' ? colabContracts : cesContracts
  const accentColor = CFG[tab].accent
  const accentGrad = CFG[tab].grad

  // ── Gruparea pe campanii ───────────────────────────────────────────────
  const campById = new Map(campaigns.map(c => [c.id, c]))
  const groupKeyOf = (c: any) => c.campaign_id ? `id:${c.campaign_id}` : (c.campaign_title ? `t:${String(c.campaign_title).trim().toLowerCase()}` : NO_CAMPAIGN)
  type Group = { key: string; title: string; brand: string | null; status: string | null; campaignId: string | null; items: typeof contracts; latest: string }
  const groupMap = new Map<string, Group>()
  for (const c of contracts as any[]) {
    const key = groupKeyOf(c)
    let g = groupMap.get(key)
    if (!g) {
      const camp = c.campaign_id ? campById.get(c.campaign_id) : undefined
      g = {
        key, campaignId: c.campaign_id || null,
        title: c.campaign?.name || camp?.title || (c.campaign_title ? campaignName({ title: c.campaign_title }) : 'Fără campanie'),
        brand: c.campaign?.brand || camp?.brand_legal_name || camp?.brand_name || c.brand_name || null,
        status: c.campaign?.status || camp?.status || null, items: [], latest: c.created_at,
      }
      groupMap.set(key, g)
    }
    g.items.push(c)
    if (!g.brand && c.brand_name) g.brand = c.brand_name
    if (String(c.created_at) > String(g.latest)) g.latest = c.created_at
  }
  const groups = [...groupMap.values()].sort((a, b) =>
    a.key === NO_CAMPAIGN ? 1 : b.key === NO_CAMPAIGN ? -1 : String(b.latest).localeCompare(String(a.latest)))
  const q = search.trim().toLowerCase()
  const rowMatches = (c: any) =>
    (statusFilter === 'all' || (statusFilter === 'signed' ? c.status === 'signed' : c.status !== 'signed')) &&
    (!q || String(c.influencer_name || '').toLowerCase().includes(q) || String(c.influencer_email || '').toLowerCase().includes(q))
  const visibleGroups = groups.filter(g => (campFilter === 'all' || g.key === campFilter) && g.items.some(rowMatches))

  function toggleGroup(key: string) {
    setCollapsed(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function newForCampaign(campaignId: string) {
    setShowNew(true)
    selectCesCampaign(campaignId)
  }
  /** Trimite la semnat toate contractele nesemnate dintr-o campanie (unul câte unul). */
  async function sendGroup(key: string, ids: string[]) {
    setBulkBusy(key)
    let ok = 0
    for (const id of ids) { if (await sendContract(id)) ok++ }
    setBulkBusy(null); setBulkArmed(null)
    flash(`✉️ Trimise la semnat: ${ok} din ${ids.length}.`, ok === ids.length)
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Contracte</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generează și gestionează contracte digitale</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black transition hover:-translate-y-0.5"
            style={{ background: accentGrad, boxShadow: `0 4px 14px ${CFG[tab].shadow}` }}>
            <Plus className="w-4 h-4" /> Contract nou {CFG[tab].label}
          </button>
        </div>

        {notice && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-xl font-bold text-sm text-white max-w-sm ${notice.ok ? 'bg-green-500' : 'bg-red-500'}`}>{notice.msg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6">
          {([['ugc', 'Contracte UGC'], ['campanii', 'Contracte Colaborare'], ['cesiune', 'Cesiune Drepturi Autor']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setCampFilter('all'); setBulkArmed(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === key ? { background: CFG[key].grad } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', value: contracts.length, color: 'text-gray-900' },
            { label: 'Trimise', value: contracts.filter(c => c.status === 'sent').length, color: 'text-blue-600' },
            { label: 'Semnate', value: contracts.filter(c => c.status === 'signed').length, color: 'text-green-600' },
            { label: 'Draft', value: contracts.filter(c => c.status === 'draft').length, color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtre: campanie, status, căutare */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-5 flex flex-wrap items-center gap-2">
          <select value={campFilter} onChange={e => setCampFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 bg-white outline-none focus:ring-2 focus:ring-sky-100 max-w-full">
            <option value="all">Toate campaniile ({groups.length})</option>
            {groups.map(g => <option key={g.key} value={g.key}>{g.title} · {g.items.length}</option>)}
          </select>
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            {([['all', 'Toate'], ['unsigned', 'Nesemnate'], ['signed', 'Semnate']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${statusFilter === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută creator sau email…"
            className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-sky-100" />
        </div>

        {/* Contracte pe campanii */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-sm">Se încarcă...</div>
          ) : visibleGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400">{contracts.length ? 'Niciun contract pentru filtrele alese' : 'Niciun contract'}</p>
              <p className="text-gray-300 text-sm mt-1">{contracts.length ? 'Schimbă campania sau statusul de mai sus.' : 'Creează primul contract folosind butonul de mai sus.'}</p>
            </div>
          ) : visibleGroups.map(g => {
            const all = g.items
            const signed = all.filter(c => c.status === 'signed').length
            const unsigned = all.filter(c => c.status !== 'signed')
            const pct = all.length ? Math.round((signed / all.length) * 100) : 0
            const open = !collapsed.has(g.key)
            const rows = all.filter(rowMatches)
            const isCes = tab === 'cesiune'
            return (
              <section key={g.key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Antet campanie */}
                <div className="flex items-stretch">
                  <div className="w-1.5 flex-none" style={{ background: g.key === NO_CAMPAIGN ? '#e5e7eb' : accentGrad }} />
                  <div className="flex-1 min-w-0 p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <button onClick={() => toggleGroup(g.key)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      <span className={`w-7 h-7 rounded-lg grid place-items-center flex-none text-gray-500 bg-gray-50 transition ${open ? '' : '-rotate-90'}`}>
                        <ChevronDown className="w-4 h-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-gray-900 truncate">{g.title}</span>
                          {g.status && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{CAMP_STATUS[g.status] || g.status}</span>}
                        </span>
                        <span className="block text-xs text-gray-400 truncate mt-0.5">
                          {g.brand ? <>🏷️ {g.brand} · </> : null}{all.length} {all.length === 1 ? 'contract' : 'contracte'}
                        </span>
                      </span>
                    </button>

                    <div className="flex items-center gap-3 flex-none">
                      <div className="w-36">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-green-700">{signed}/{all.length} semnate</span>
                          <span className="text-gray-400">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {isCes && g.campaignId && (
                        <button onClick={() => newForCampaign(g.campaignId!)} title="Contract nou pentru această campanie"
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black bg-gray-50 text-gray-700 hover:bg-gray-100 transition">
                          <Plus className="w-3.5 h-3.5" /> Contract
                        </button>
                      )}
                      {isCes && unsigned.length > 0 && (
                        bulkArmed === g.key ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => sendGroup(g.key, unsigned.map(c => c.id))} disabled={!!bulkBusy}
                              className="px-3 py-2 rounded-xl text-xs font-black bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60">
                              {bulkBusy === g.key ? 'Se trimite…' : `Da, trimite ${unsigned.length}`}
                            </button>
                            <button onClick={() => setBulkArmed(null)} className="px-2 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50">Renunță</button>
                          </span>
                        ) : (
                          <button onClick={() => setBulkArmed(g.key)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black bg-sky-50 text-sky-700 hover:bg-sky-100 transition">
                            <Send className="w-3.5 h-3.5" /> Trimite nesemnatelor ({unsigned.length})
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Rânduri */}
                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {rows.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-gray-400">Niciun contract pentru filtrul ales.</p>
                    ) : rows.map(c => {
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft
                      const ces = c as CesiuneContract
                      return (
                        <div key={c.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-gray-50/60 transition">
                          <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
                            <span className="w-9 h-9 rounded-full grid place-items-center flex-none text-white text-sm font-black" style={{ background: accentGrad }}>
                              {(c.influencer_name || '?').trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-black text-gray-900 text-sm truncate">{c.influencer_name}</span>
                              <span className="block text-xs text-gray-400 truncate">{c.influencer_email}</span>
                            </span>
                          </div>

                          <div className="text-xs min-w-0 w-full sm:w-64 sm:flex-none">
                            {isCes ? (
                              <>
                                <span className="block font-bold text-gray-700 truncate">
                                  {ces.product_name || ces.campaign?.offer_name || 'Barter (produs)'}{ces.product_value_lei ? ` · ${Number(ces.product_value_lei).toLocaleString('ro-RO')} RON` : ''}
                                </span>
                                <span className="block text-gray-400 truncate">{cesiuneLabel(ces.status === 'signed' ? ces.clauses_version : CESIUNE_CLAUSES_VERSION)}{ces.contract_number ? ` · Nr. ${ces.contract_number}` : ''}</span>
                              </>
                            ) : (
                              <>
                                <span className="block font-bold text-gray-700">{(c as UGCContract).amount_lei?.toLocaleString('ro-RO')} RON</span>
                                <span className="block text-gray-400">{(c as UGCContract).payment_days} zile termen</span>
                              </>
                            )}
                          </div>

                          <div className="flex flex-col items-start gap-0.5 w-32 flex-none">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                            </span>
                            <span className="text-[11px] text-gray-400">{c.signed_at ? `semnat ${fmt(c.signed_at)}` : `creat ${fmt(c.created_at)}`}</span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 flex-none ml-auto sm:w-[300px]">
                            {isCes && c.status !== 'signed' && (
                              <button onClick={() => sendContract(c.id)} disabled={sendingId === c.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black bg-sky-600 text-white hover:bg-sky-700 transition disabled:opacity-60">
                                <Send className="w-3.5 h-3.5" /> {sendingId === c.id ? '…' : c.status === 'sent' ? 'Retrimite' : 'Trimite'}
                              </button>
                            )}
                            {c.status === 'signed' && (
                              <a href={`/api/${CFG[tab].pdf}/${c.token}/pdf`} target="_blank" rel="noopener"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black bg-green-50 text-green-700 hover:bg-green-100 transition">
                                <Download className="w-3.5 h-3.5" /> PDF
                              </a>
                            )}
                            {isCes && c.status === 'signed' && (
                              <a href={`/api/${CFG[tab].pdf}/${c.token}/pdf?redact=1`} target="_blank" rel="noopener" title="PDF fără CNP, buletin, adresă, telefon — pentru brand"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                                <Download className="w-3.5 h-3.5" /> Pt. brand
                              </a>
                            )}
                            <button onClick={() => copyLink(c, tab)} title="Copiază linkul"
                              className={`w-8 h-8 grid place-items-center rounded-lg transition ${copiedId === c.id ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                              {copiedId === c.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <a href={`/${CFG[tab].list}/${c.token}`} target="_blank" rel="noopener" title="Deschide contractul"
                              className="w-8 h-8 grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 transition">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button onClick={() => deleteContract(c.id, tab)} title="Arhivează"
                              className="w-8 h-8 grid place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-black text-lg text-gray-900">Contract nou {CFG[tab].label}</h2>
                <p className="text-sm text-gray-400 mt-0.5">Completează datele influencerului</p>
              </div>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-xl hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {tab === 'ugc' ? (
              <form onSubmit={createUGC} className="p-6 space-y-4">
                <FieldGrid>
                  <Field label="Nume complet *" colSpan={2}><input required value={ugcForm.influencer_name} onChange={e => setUgcForm(f => ({ ...f, influencer_name: e.target.value }))} placeholder="ex. Maria Ionescu" className="field" /></Field>
                  <Field label="Email *"><input required type="email" value={ugcForm.influencer_email} onChange={e => setUgcForm(f => ({ ...f, influencer_email: e.target.value }))} placeholder="maria@email.com" className="field" /></Field>
                  <Field label="Telefon"><input value={ugcForm.influencer_phone} onChange={e => setUgcForm(f => ({ ...f, influencer_phone: e.target.value }))} placeholder="07xx xxx xxx" className="field" /></Field>
                  <Field label="Adresă" colSpan={2}><input value={ugcForm.influencer_address} onChange={e => setUgcForm(f => ({ ...f, influencer_address: e.target.value }))} placeholder="Str. Exemplu nr. 1, Cluj-Napoca" className="field" /></Field>
                  <Field label="Sumă (LEI) *"><input required type="number" min="1" value={ugcForm.amount_lei} onChange={e => setUgcForm(f => ({ ...f, amount_lei: e.target.value }))} placeholder="500" className="field" /></Field>
                  <Field label="Termen plată (zile) *"><input required type="number" min="1" max="90" value={ugcForm.payment_days} onChange={e => setUgcForm(f => ({ ...f, payment_days: e.target.value }))} className="field" /></Field>
                  <Field label="Observații interne" colSpan={2}><textarea value={ugcForm.notes} onChange={e => setUgcForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Note interne..." className="field resize-none" /></Field>
                </FieldGrid>
                <ModalButtons onCancel={() => setShowNew(false)} saving={saving} grad={accentGrad} />
              </form>
            ) : tab === 'campanii' ? (
              <form onSubmit={createColab} className="p-6 space-y-4">
                {campaigns.length > 0 && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Selectează campania (completează titlu + platformă + livrabile)</label>
                    <select className="field" defaultValue="" onChange={e => applyCampaign(e.target.value, 'colab')}>
                      <option value="">— alege o campanie activă —</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}{(c.brand_legal_name || c.brand_name) ? ` · ${c.brand_legal_name || c.brand_name}` : ''}</option>)}
                    </select>
                  </div>
                )}
                <FieldGrid>
                  <Field label="Nume complet *" colSpan={2}><input required value={colabForm.influencer_name} onChange={e => setColabForm(f => ({ ...f, influencer_name: e.target.value }))} placeholder="ex. Maria Ionescu" className="field" /></Field>
                  <Field label="Email *"><input required type="email" value={colabForm.influencer_email} onChange={e => setColabForm(f => ({ ...f, influencer_email: e.target.value }))} placeholder="maria@email.com" className="field" /></Field>
                  <Field label="Telefon"><input value={colabForm.influencer_phone} onChange={e => setColabForm(f => ({ ...f, influencer_phone: e.target.value }))} placeholder="07xx xxx xxx" className="field" /></Field>
                  <Field label="Adresă" colSpan={2}><input value={colabForm.influencer_address} onChange={e => setColabForm(f => ({ ...f, influencer_address: e.target.value }))} placeholder="Str. Exemplu nr. 1, Cluj-Napoca" className="field" /></Field>
                  <Field label="Titlu campanie"><input value={colabForm.campaign_title} onChange={e => setColabForm(f => ({ ...f, campaign_title: e.target.value }))} placeholder="ex. Fi Ambasador AddFame" className="field" /></Field>
                  <Field label="Platformă"><input value={colabForm.platform} onChange={e => setColabForm(f => ({ ...f, platform: e.target.value }))} placeholder="ex. Instagram, TikTok" className="field" /></Field>
                  <Field label="Livrabile" colSpan={2}><input value={colabForm.deliverables} onChange={e => setColabForm(f => ({ ...f, deliverables: e.target.value }))} placeholder="ex. 2 Reels + 3 Stories pe Instagram" className="field" /></Field>
                  <Field label="Sumă (LEI) *"><input required type="number" min="1" value={colabForm.amount_lei} onChange={e => setColabForm(f => ({ ...f, amount_lei: e.target.value }))} placeholder="500" className="field" /></Field>
                  <Field label="Termen plată (zile) *"><input required type="number" min="1" max="90" value={colabForm.payment_days} onChange={e => setColabForm(f => ({ ...f, payment_days: e.target.value }))} className="field" /></Field>
                  <Field label="Observații interne" colSpan={2}><textarea value={colabForm.notes} onChange={e => setColabForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Note interne..." className="field resize-none" /></Field>
                </FieldGrid>
                <ModalButtons onCancel={() => setShowNew(false)} saving={saving} grad={accentGrad} label="Colaborare" />
              </form>
            ) : (
              <form onSubmit={createCes} className="p-6 space-y-4">
                {campaigns.length > 0 && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">1. Selectează campania (completează automat brand + produs)</label>
                    <select className="field" value={cesForm.campaign_id} onChange={e => selectCesCampaign(e.target.value)}>
                      <option value="">— alege o campanie activă —</option>
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}{(c.brand_legal_name || c.brand_name) ? ` · ${c.brand_legal_name || c.brand_name}` : ''}</option>)}
                    </select>
                  </div>
                )}
                {cesForm.campaign_id && (
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      2. Selectează influencerul {loadingInf ? '(se încarcă...)' : `(${campInfluencers.length} activi pe campanie)`}
                    </label>
                    <select className="field" value={cesForm.influencer_id} onChange={e => selectCesInfluencer(e.target.value)}>
                      <option value="">— alege influencerul —</option>
                      {campInfluencers.map(i => (
                        <option key={i.influencer_id} value={i.influencer_id} disabled={i.has_contract}>
                          {i.has_contract ? '✓ ' : ''}{i.name}{i.has_contract ? ' — are deja contract' : ''}
                        </option>
                      ))}
                    </select>
                    {!loadingInf && campInfluencers.length === 0 && <p className="text-xs text-gray-400 mt-1">Niciun influencer activ pe această campanie.</p>}
                    {campInfluencers.some(i => i.has_contract) && <p className="text-xs text-green-600 mt-1">Cei cu ✓ au deja contract și sunt blocați ca să nu creezi dublură.</p>}
                  </div>
                )}
                <SectionLabel>Influencer (Autor)</SectionLabel>
                <FieldGrid>
                  <Field label="Nume complet *" colSpan={2}><input required value={cesForm.influencer_name} onChange={e => setCesForm(f => ({ ...f, influencer_name: e.target.value }))} placeholder="ex. Maria Ionescu" className="field" /></Field>
                  <Field label="Email *"><input required type="email" value={cesForm.influencer_email} onChange={e => setCesForm(f => ({ ...f, influencer_email: e.target.value }))} placeholder="maria@email.com" className="field" /></Field>
                  <Field label="Telefon"><input value={cesForm.influencer_phone} onChange={e => setCesForm(f => ({ ...f, influencer_phone: e.target.value }))} placeholder="07xx xxx xxx" className="field" /></Field>
                </FieldGrid>
                <p className="text-xs text-gray-400 -mt-1">CNP, C.I. și domiciliul le completează influencerul la semnare (sau le poți pune tu aici).</p>
                <FieldGrid>
                  <Field label="CNP"><input value={cesForm.influencer_cnp} onChange={e => setCesForm(f => ({ ...f, influencer_cnp: e.target.value }))} placeholder="opțional aici" className="field" /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="C.I. seria"><input value={cesForm.influencer_ci_serie} onChange={e => setCesForm(f => ({ ...f, influencer_ci_serie: e.target.value }))} placeholder="XX" className="field" /></Field>
                    <Field label="C.I. nr."><input value={cesForm.influencer_ci_numar} onChange={e => setCesForm(f => ({ ...f, influencer_ci_numar: e.target.value }))} placeholder="123456" className="field" /></Field>
                  </div>
                  <Field label="Domiciliu" colSpan={2}><input value={cesForm.influencer_address} onChange={e => setCesForm(f => ({ ...f, influencer_address: e.target.value }))} placeholder="Localitate, județ, stradă, nr..." className="field" /></Field>
                </FieldGrid>

                <SectionLabel>Brand partener (advertiser)</SectionLabel>
                <FieldGrid>
                  <Field label="Denumire brand" colSpan={2}><input value={cesForm.brand_name} onChange={e => setCesForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="ex. Echilibru International SRL" className="field" /></Field>
                  <Field label="CUI brand"><input value={cesForm.brand_cui} onChange={e => setCesForm(f => ({ ...f, brand_cui: e.target.value }))} placeholder="ex. RO44778609" className="field" /></Field>
                  <Field label="Reg. Com. brand"><input value={cesForm.brand_reg_com} onChange={e => setCesForm(f => ({ ...f, brand_reg_com: e.target.value }))} placeholder="ex. J40/14477/2021" className="field" /></Field>
                  <Field label="Sediu brand" colSpan={2}><input value={cesForm.brand_address} onChange={e => setCesForm(f => ({ ...f, brand_address: e.target.value }))} placeholder="Str. ..., București" className="field" /></Field>
                  <Field label="Website brand" colSpan={2}><input value={cesForm.brand_website} onChange={e => setCesForm(f => ({ ...f, brand_website: e.target.value }))} placeholder="ex. vioi.ro" className="field" /></Field>
                </FieldGrid>

                <SectionLabel>Campanie / produs</SectionLabel>
                <FieldGrid>
                  <Field label="Titlu campanie"><input value={cesForm.campaign_title} onChange={e => setCesForm(f => ({ ...f, campaign_title: e.target.value }))} placeholder="ex. Vioi.ro suplimente" className="field" /></Field>
                  <Field label="Nr. contract"><input value={cesForm.contract_number} onChange={e => setCesForm(f => ({ ...f, contract_number: e.target.value }))} placeholder="auto dacă e gol" className="field" /></Field>
                  <Field label="Produs (remunerație)"><input value={cesForm.product_name} onChange={e => setCesForm(f => ({ ...f, product_name: e.target.value }))} placeholder="ex. Pachet suplimente" className="field" /></Field>
                  <Field label="Valoare produs (LEI)"><input type="number" min="0" value={cesForm.product_value_lei} onChange={e => setCesForm(f => ({ ...f, product_value_lei: e.target.value }))} placeholder="ex. 250" className="field" /></Field>
                  <Field label="Observații interne" colSpan={2}><textarea value={cesForm.notes} onChange={e => setCesForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Note interne..." className="field resize-none" /></Field>
                </FieldGrid>
                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer bg-sky-50 border border-sky-100 rounded-xl p-3">
                  <input type="checkbox" checked={sendNow} onChange={e => setSendNow(e.target.checked)} className="mt-0.5" />
                  <span><b>Trimite imediat creatorului la semnat</b><br /><span className="text-xs text-gray-500">Notificare în platformă, email, WhatsApp (dacă are telefon) și Telegram (dacă și-a legat contul). Nu mai trebuie să-i scrii pe Instagram.</span></span>
                </label>
                <ModalButtons onCancel={() => setShowNew(false)} saving={saving} grad={accentGrad} label="Cesiune" />
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .field { width:100%; border:1px solid #e5e7eb; border-radius:12px; padding:10px 14px; font-size:14px; outline:none; font-family:inherit; }
        .field:focus { border-color:#f97316; box-shadow:0 0 0 3px rgba(249,115,22,0.1); }
      `}</style>
    </div>
  )
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-black text-gray-400 uppercase tracking-wider pt-1">{children}</p>
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ModalButtons({ onCancel, saving, grad, label = 'UGC' }: { onCancel: () => void; saving: boolean; grad: string; label?: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-black hover:bg-gray-50 transition">Anulează</button>
      <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl text-white text-sm font-black transition hover:-translate-y-0.5 disabled:opacity-60" style={{ background: grad }}>
        {saving ? 'Se creează...' : `Creează contract`}
      </button>
    </div>
  )
}
