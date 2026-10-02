'use client'
// @ts-nocheck
import { useEffect, useState, useMemo } from 'react'
import { Mail, Plus, Send, Trash2, X, Search, RefreshCw, AlertCircle, CheckCircle, Building2, Users, User, Eye, EyeOff, ExternalLink, Instagram, Globe, Phone, FileText, Clock, ChevronRight, Edit2, Save, Upload, FileSpreadsheet } from 'lucide-react'

const STATUS_CFG = {
  new:        { label: 'Nou',         bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
  contacted:  { label: 'Contactat',   bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  replied:    { label: 'Răspuns',     bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  registered: { label: 'Înregistrat', bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  ignored:    { label: 'Ignorat',     bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400' },
}

const BRAND_TEMPLATES = [
  { key: 'invite',         label: '📩 Invitație înregistrare',        industries: [] },
  { key: 'invite_fashion', label: '👗 Invitație — Fashion & Beauty',  industries: ['Fashion & Retail','Beauty & Cosmetics'] },
  { key: 'invite_food',    label: '🍕 Invitație — Food & Beverage',   industries: ['Food & Beverage'] },
  { key: 'invite_tech',    label: '💻 Invitație — Tech & Gadgets',    industries: ['Tech & Gadgets'] },
  { key: 'invite_fitness', label: '💪 Invitație — Fitness & Health',  industries: ['Fitness & Health'] },
  { key: 'invite_travel',  label: '✈️ Invitație — Travel',            industries: ['Travel'] },
  { key: 'presentation',   label: '📊 Prezentare platformă',          industries: [] },
  { key: 'followup',       label: '🔔 Follow-up campanie',            industries: [] },
  { key: 'promo',          label: '🎁 Ofertă specială',               industries: [] },
  { key: 'ai_personalize', label: '✨ AI Personalizat (Claude)',        industries: [] },
  { key: 'custom',         label: '✏️ Custom',                        industries: [] },
]

const INF_TEMPLATES = [
  { key: 'invite_inf',    label: '📩 Invitație influencer' },
  { key: 'tips_inf',      label: '💡 5 sfaturi să câștigi mai mult' },
  { key: 'followup_inf',  label: '🔔 Follow-up profil incomplet' },
  { key: 'custom',        label: '✏️ Custom' },
]

const INDUSTRIES = ['Fashion & Retail', 'Beauty & Cosmetics', 'Food & Beverage', 'Tech & Gadgets', 'Fitness & Health', 'Travel', 'Finance', 'Auto', 'Home & Deco', 'Education', 'Altul']
const NICHES = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Tech', 'Gaming', 'Music', 'Comedy', 'Lifestyle', 'Auto', 'Parenting', 'Altul']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'X']

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function LeadDrawer({ lead, type, onClose, onUpdate, onSendEmail, onDelete }) {
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState(lead?.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(lead?.notes || '')
    setEditNotes(false)
  }, [lead?.id])

  if (!lead) return null

  const cfg = STATUS_CFG[lead.status] || STATUS_CFG.new
  const name = type === 'brand' ? lead.company_name : lead.full_name
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  async function saveNotes() {
    setSaving(true)
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, notes, type }),
    })
    setSaving(false)
    setEditNotes(false)
    onUpdate()
  }

  async function changeStatus(status: string) {
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, status, type }),
    })
    onUpdate()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
        style={{ animation: 'slideInRight 0.22s ease-out' }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
              {initials}
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight">{name}</p>
              {lead.contact_name && lead.contact_name !== name && (
                <p className="text-xs text-gray-400">{lead.contact_name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Status */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => changeStatus(k)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                    lead.status === k
                      ? `${v.bg} ${v.text} border-current`
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Contact</p>
            <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
              {/* Email */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm font-semibold text-blue-600 hover:underline truncate block">
                    {lead.email}
                  </a>
                </div>
              </div>

              {/* Website */}
              {lead.website && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Website</p>
                    <a href={lead.website} target="_blank" rel="noreferrer"
                      className="text-sm font-semibold text-blue-600 hover:underline truncate flex items-center gap-1">
                      {lead.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              {/* Instagram */}
              {lead.instagram_handle && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Instagram className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">Instagram</p>
                    <a href={`https://instagram.com/${lead.instagram_handle}`} target="_blank" rel="noreferrer"
                      className="text-sm font-semibold text-pink-500 hover:underline flex items-center gap-1">
                      @{lead.instagram_handle}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              {/* TikTok */}
              {lead.tiktok_handle && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="w-4 h-4 text-gray-800 flex-shrink-0 text-xs font-black flex items-center justify-center">TK</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">TikTok</p>
                    <a href={`https://tiktok.com/@${lead.tiktok_handle}`} target="_blank" rel="noreferrer"
                      className="text-sm font-semibold text-gray-800 hover:underline flex items-center gap-1">
                      @{lead.tiktok_handle}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile info */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
              {type === 'brand' ? 'Detalii brand' : 'Detalii influencer'}
            </p>
            <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
              {type === 'brand' ? (
                <>
                  {lead.industry && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Industrie</span>
                      <span className="text-sm font-semibold text-gray-700">{lead.industry}</span>
                    </div>
                  )}
                  {lead.language && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Limbă comunicare</span>
                      <span className="text-sm font-semibold text-gray-700">{lead.language === 'ro' ? '🇷🇴 Română' : '🇬🇧 English'}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {lead.niche && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Nișă</span>
                      <span className="text-sm font-semibold text-gray-700">{lead.niche}</span>
                    </div>
                  )}
                  {lead.platform && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Platformă</span>
                      <span className="text-sm font-semibold text-gray-700">{lead.platform}</span>
                    </div>
                  )}
                  {lead.followers && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Followeri</span>
                      <span className="text-sm font-bold text-gray-900">{lead.followers.toLocaleString('ro-RO')}</span>
                    </div>
                  )}
                  {lead.language && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-400">Limbă comunicare</span>
                      <span className="text-sm font-semibold text-gray-700">{lead.language === 'ro' ? '🇷🇴 Română' : '🇬🇧 English'}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Email activity */}
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Activitate email</p>
            <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-400">Emailuri trimise</span>
                <span className="text-sm font-bold text-gray-900">{lead.emails_sent || 0}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-400">Deschideri</span>
                {lead.open_count > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                    <Eye className="w-3.5 h-3.5" /> {lead.open_count}x
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
              {lead.last_contacted_at && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-gray-400">Ultima trimitere</span>
                  <span className="text-sm text-gray-600">
                    {new Date(lead.last_contacted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}
              {lead.last_opened_at && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-gray-400">Ultima deschidere</span>
                  <span className="text-sm text-gray-600">
                    {new Date(lead.last_opened_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-400">Adăugat pe</span>
                <span className="text-sm text-gray-600">
                  {new Date(lead.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Note interne</p>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)}
                  className="flex items-center gap-1 text-xs font-bold text-purple-500 hover:text-purple-700 transition">
                  <Edit2 className="w-3 h-3" /> Editează
                </button>
              )}
            </div>
            {editNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Adaugă observații despre acest contact..."
                  className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-xl text-sm outline-none resize-none focus:border-purple-500 transition"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setEditNotes(false); setNotes(lead.notes || '') }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition">
                    Anulează
                  </button>
                  <button onClick={saveNotes} disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-black text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                    <Save className="w-3 h-3" />
                    {saving ? 'Salvez...' : 'Salvează'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditNotes(true)}
                className={`px-4 py-3 rounded-2xl text-sm cursor-pointer transition min-h-[60px] ${
                  notes ? 'bg-gray-50 text-gray-700 hover:bg-gray-100' : 'bg-gray-50 text-gray-300 italic hover:bg-gray-100'
                }`}>
                {notes || 'Nicio notă adăugată. Click pentru a adăuga...'}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onSendEmail(lead.id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white transition"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <Send className="w-4 h-4" /> Trimite email
          </button>
          <button
            onClick={() => { if (confirm('Ștergi acest lead?')) { onDelete(lead.id); onClose() } }}
            className="p-3 rounded-xl border-2 border-red-100 text-red-400 hover:bg-red-50 hover:border-red-300 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OutreachPage() {
  const [activeTab, setActiveTab] = useState<'brand' | 'influencer'>('brand')
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<{ok: number; fail: number} | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [toast, setToast] = useState<{msg: string; ok: boolean} | null>(null)
  const [sending, setSending] = useState(false)
  const [template, setTemplate] = useState('invite')
  const [language, setLanguage] = useState('ro')
  const [customSubject, setCustomSubject] = useState('')
  const [customHtml, setCustomHtml] = useState('')

  // Detail drawer
  const [drawerLead, setDrawerLead] = useState<any>(null)

  // Brand form
  const [bForm, setBForm] = useState({ company_name: '', contact_name: '', email: '', industry: '', website: '', language: 'ro', notes: '' })
  // Influencer form
  const [iForm, setIForm] = useState({ full_name: '', contact_name: '', email: '', niche: '', platform: 'Instagram', followers: '', instagram_handle: '', tiktok_handle: '', website: '', language: 'ro', notes: '' })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/outreach?type=${activeTab}`)
    const data = await res.json()
    const freshLeads = data.leads || []
    setLeads(freshLeads)
    setSelected(new Set())
    // Dacă drawer-ul e deschis, actualizează lead-ul curent
    if (drawerLead) {
      const updated = freshLeads.find(l => l.id === drawerLead.id)
      if (updated) setDrawerLead(updated)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [activeTab])

  useEffect(() => {
    setTemplate(activeTab === 'brand' ? 'invite' : 'invite_inf')
  }, [activeTab])

  const filtered = useMemo(() => {
    let list = leads
    if (filterStatus !== 'all') list = list.filter(l => l.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l =>
        (l.company_name || l.full_name)?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.contact_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [leads, filterStatus, search])

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(l => l.id)))
  }

  function parseCsv(text: string) {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
      const row: any = {}
      headers.forEach((h, i) => { row[h] = vals[i] || '' })
      return {
        company_name: row['company_name'] || row['nume'] || row['brand'] || row['company'] || '',
        contact_name: row['contact_name'] || row['contact'] || row['persoana'] || '',
        email: row['email'] || row['e-mail'] || '',
        industry: row['industry'] || row['industrie'] || row['domeniu'] || '',
        website: row['website'] || row['site'] || '',
        notes: row['notes'] || row['note'] || row['observatii'] || '',
        language: row['language'] || row['limba'] || 'ro',
      }
    }).filter(r => r.email && r.company_name)
  }

  async function handleCsvFile(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvResult(null)

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Folosim SheetJS pentru Excel
      try {
        // @ts-ignore - dynamic ESM import from CDN, no type declarations
        const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const parsed = json.map((row: any) => ({
          company_name: row['company_name'] || row['Nume'] || row['Brand'] || row['Company'] || '',
          contact_name: row['contact_name'] || row['Contact'] || row['Persoana'] || '',
          email: row['email'] || row['Email'] || row['E-mail'] || '',
          industry: row['industry'] || row['Industrie'] || row['Domeniu'] || '',
          website: row['website'] || row['Website'] || row['Site'] || '',
          notes: row['notes'] || row['Note'] || row['Observatii'] || '',
          language: row['language'] || row['Limba'] || 'ro',
        })).filter((r: any) => r.email && r.company_name)
        setCsvData(parsed)
      } catch (err) {
        alert('Eroare la citirea fișierului Excel. Verifică formatul.')
      }
    } else {
      // CSV normal
      const text = await file.text()
      const parsed = parseCsv(text)
      setCsvData(parsed)
    }
  }

  async function importCsv() {
    if (!csvData.length) return
    setCsvImporting(true)
    let ok = 0, fail = 0
    for (const row of csvData) {
      try {
        const res = await fetch('/api/admin/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...row, type: 'brand' }),
        })
        const data = await res.json()
        if (data.error) fail++; else ok++
      } catch { fail++ }
      await new Promise(r => setTimeout(r, 80))
    }
    setCsvResult({ ok, fail })
    setCsvImporting(false)
    if (ok > 0) { load(); setCsvData([]) }
  }

  async function addLead() {
    const body = activeTab === 'brand'
      ? { ...bForm, type: 'brand' }
      : { ...iForm, followers: iForm.followers ? parseInt(iForm.followers) : null, type: 'influencer' }
    const nameField = activeTab === 'brand' ? bForm.company_name : iForm.full_name
    if (!nameField || !(activeTab === 'brand' ? bForm.email : iForm.email)) return
    const res = await fetch('/api/admin/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.error) { notify(data.error, false); return }
    notify('Lead adăugat!')
    setShowAdd(false)
    setBForm({ company_name: '', contact_name: '', email: '', industry: '', website: '', language: 'ro', notes: '' })
    setIForm({ full_name: '', contact_name: '', email: '', niche: '', platform: 'Instagram', followers: '', instagram_handle: '', tiktok_handle: '', website: '', language: 'ro', notes: '' })
    load()
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/outreach', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, type: activeTab }) })
    load()
  }

  async function deleteLead(id: string) {
    if (!confirm('Ștergi acest lead?')) return
    await fetch('/api/admin/outreach', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type: activeTab }) })
    load()
  }

  async function autoSelect100() {
    // Selectează primele 100 cu status 'new' din lista curentă
    const newLeads = leads.filter(l => l.status === 'new').slice(0, 100)
    if (newLeads.length === 0) { notify('Nu există leads noi de trimis!', false); return }
    setSelected(new Set(newLeads.map(l => l.id)))
    setShowSend(true)
    notify(`✅ ${newLeads.length} leads selectate automat — verifică setările și trimite!`)
  }

  async function sendEmails() {
    if (!selected.size) return
    setSending(true)
    const res = await fetch('/api/admin/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send', lead_ids: [...selected], template, language, type: activeTab,
        custom_subject: template === 'custom' ? customSubject : undefined,
        custom_html: template === 'custom' ? customHtml : undefined,
      }),
    })
    const data = await res.json()
    setSending(false)
    if (data.error) { notify(data.error, false); return }
    notify(`✅ ${data.sent}/${data.total} emailuri trimise!`)
    setShowSend(false)
    setSelected(new Set())
    load()
  }

  function openDrawer(lead: any) {
    setDrawerLead(lead)
  }

  function openSendForLead(leadId: string) {
    setSelected(new Set([leadId]))
    setDrawerLead(null)
    setShowSend(true)
  }

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    replied: leads.filter(l => l.status === 'replied').length,
    registered: leads.filter(l => l.status === 'registered').length,
    opened: leads.filter(l => l.open_count > 0).length,
  }

  const templates = activeTab === 'brand' ? BRAND_TEMPLATES : INF_TEMPLATES

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Mail className="w-6 h-6 text-orange-500" /> Outreach
          </h1>
          <p className="text-sm text-gray-400 mt-1">Mini-CRM pentru contactarea brandurilor și influencerilor</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
          {selected.size > 0 && (
            <button onClick={() => setShowSend(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              <Send className="w-4 h-4" /> Trimite ({selected.size})
            </button>
          )}
          <button onClick={autoSelect100}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition"
            style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #fde68a' }}
            title="Selectează automat primele 100 leads noi și deschide fereastra de trimitere">
            🚀 Trimite azi 100
          </button>
          {activeTab === 'brand' && (
            <button onClick={() => setShowCsvImport(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition"
              style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #bbf7d0' }}>
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          )}
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
            <Plus className="w-4 h-4" /> Adaugă
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        {[
          { key: 'brand', label: 'Branduri', icon: Building2 },
          { key: 'influencer', label: 'Influenceri', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key as any); setDrawerLead(null) }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Noi', value: stats.new, color: 'text-gray-600' },
          { label: 'Contactați', value: stats.contacted, color: 'text-blue-600' },
          { label: 'Au răspuns', value: stats.replied, color: 'text-amber-600' },
          { label: 'Înregistrați', value: stats.registered, color: 'text-green-600' },
          { label: 'Au deschis', value: stats.opened, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'brand' ? "Caută brand, email..." : "Caută influencer, email..."}
            className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {['all', 'new', 'contacted', 'replied', 'registered', 'ignored'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {s === 'all' ? 'Toți' : STATUS_CFG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid #f5f5f5', background: '#fafafa' }}>
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll} className="w-4 h-4 accent-purple-600" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                {activeTab === 'brand' ? 'Brand' : 'Influencer'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">
                {activeTab === 'brand' ? 'Industrie' : 'Nișă / Platformă'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-black text-gray-400 uppercase tracking-wider">Emailuri</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Ultima contact</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Deschis</th>
              <th className="px-4 py-3 text-left text-xs font-black text-gray-400 uppercase tracking-wider">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Se încarcă...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                {activeTab === 'brand' ? <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-200" /> : <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />}
                <p className="font-bold">Niciun {activeTab === 'brand' ? 'brand' : 'influencer'} adăugat</p>
              </td></tr>
            ) : filtered.map(lead => {
              const cfg = STATUS_CFG[lead.status] || STATUS_CFG.new
              const name = activeTab === 'brand' ? lead.company_name : lead.full_name
              const sub = activeTab === 'brand' ? lead.industry : (lead.niche || lead.platform)
              const isActive = drawerLead?.id === lead.id
              return (
                <tr
                  key={lead.id}
                  className={`border-b border-gray-50 transition ${isActive ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="w-4 h-4 accent-purple-600" />
                  </td>
                  {/* Click pe nume deschide drawer-ul */}
                  <td className="px-4 py-3 cursor-pointer" onClick={() => openDrawer(lead)}>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className={`font-black text-sm ${isActive ? 'text-purple-700' : 'text-gray-900'} hover:text-purple-600 transition`}>{name}</p>
                        {lead.contact_name && <p className="text-xs text-gray-400">{lead.contact_name}</p>}
                        {activeTab === 'influencer' && lead.instagram_handle && (
                          <p className="text-xs text-pink-500">@{lead.instagram_handle}</p>
                        )}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition ${isActive ? 'text-purple-400' : 'text-gray-200'}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {sub || '—'}
                    {activeTab === 'influencer' && lead.followers && (
                      <span className="ml-1 text-gray-400">· {lead.followers.toLocaleString('ro-RO')} followeri</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${cfg.bg} ${cfg.text}`}>
                      {Object.entries(STATUS_CFG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold text-gray-500">{lead.emails_sent || 0}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.open_count > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-green-500" />
                        <div>
                          <p className="text-xs font-bold text-green-600">{lead.open_count}x deschis</p>
                          {lead.last_opened_at && (
                            <p className="text-xs text-gray-400">{new Date(lead.last_opened_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span className="text-xs">—</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelected(new Set([lead.id])); setShowSend(true) }}
                        className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteLead(lead.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Lead Detail Drawer */}
      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          type={activeTab}
          onClose={() => setDrawerLead(null)}
          onUpdate={load}
          onSendEmail={openSendForLead}
          onDelete={deleteLead}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-black text-gray-900">
                {activeTab === 'brand' ? 'Adaugă brand extern' : 'Adaugă influencer extern'}
              </h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {activeTab === 'brand' ? (
                <>
                  {[
                    { key: 'company_name', label: 'Nume companie *', placeholder: 'ex: Zara România' },
                    { key: 'contact_name', label: 'Nume contact', placeholder: 'ex: Maria Ionescu' },
                    { key: 'email', label: 'Email *', placeholder: 'contact@brand.ro' },
                    { key: 'website', label: 'Website', placeholder: 'https://brand.ro' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                      <input value={bForm[f.key]} onChange={e => setBForm(p => ({...p, [f.key]: e.target.value}))}
                        placeholder={f.placeholder} type={f.key === 'email' ? 'email' : 'text'}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Industrie</label>
                    <select value={bForm.industry} onChange={e => setBForm(p => ({...p, industry: e.target.value}))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition">
                      <option value="">Selectează...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Limbă</label>
                    <div className="flex gap-2">
                      {['ro', 'en'].map(l => (
                        <button key={l} onClick={() => setBForm(p => ({...p, language: l}))}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${bForm.language === l ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
                          {l === 'ro' ? 'Română' : 'English'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { key: 'full_name', label: 'Nume influencer *', placeholder: 'ex: Andreea Pop' },
                    { key: 'contact_name', label: 'Nume contact (dacă diferit)', placeholder: 'ex: Manager' },
                    { key: 'email', label: 'Email *', placeholder: 'contact@influencer.ro' },
                    { key: 'instagram_handle', label: 'Instagram handle', placeholder: 'ex: andreea.pop' },
                    { key: 'tiktok_handle', label: 'TikTok handle', placeholder: 'ex: andreea.pop' },
                    { key: 'website', label: 'Website / Linktree', placeholder: 'https://...' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                      <input value={iForm[f.key]} onChange={e => setIForm(p => ({...p, [f.key]: e.target.value}))}
                        placeholder={f.placeholder} type={f.key === 'email' ? 'email' : 'text'}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Număr followeri (aproximativ)</label>
                    <input value={iForm.followers} onChange={e => setIForm(p => ({...p, followers: e.target.value}))}
                      placeholder="ex: 15000" type="number"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Nișă principală</label>
                    <select value={iForm.niche} onChange={e => setIForm(p => ({...p, niche: e.target.value}))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition">
                      <option value="">Selectează...</option>
                      {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Platformă principală</label>
                    <select value={iForm.platform} onChange={e => setIForm(p => ({...p, platform: e.target.value}))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition">
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Limbă</label>
                    <div className="flex gap-2">
                      {['ro', 'en'].map(l => (
                        <button key={l} onClick={() => setIForm(p => ({...p, language: l}))}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${iForm.language === l ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>
                          {l === 'ro' ? 'Română' : 'English'}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Note interne</label>
                <textarea
                  value={activeTab === 'brand' ? bForm.notes : iForm.notes}
                  onChange={e => activeTab === 'brand' ? setBForm(p => ({...p, notes: e.target.value})) : setIForm(p => ({...p, notes: e.target.value}))}
                  placeholder="Observații..." rows={2}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
                <button onClick={addLead}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white transition"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>Adaugă</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Import Branduri (CSV / Excel)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Încarcă sute de branduri dintr-o dată</p>
              </div>
              <button onClick={() => { setShowCsvImport(false); setCsvData([]); setCsvResult(null) }} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Format explicat */}
              <div style={{ background: '#f8faff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '12px 14px' }}>
                <p className="text-xs font-black text-purple-700 mb-2">Format CSV acceptat:</p>
                <code style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', display: 'block', lineHeight: 1.6 }}>
                  company_name,email,contact_name,industry,website,notes<br/>
                  Nike Romania,contact@nike.ro,Ion Popescu,Fashion & Retail,nike.ro,<br/>
                  Zara Romania,hello@zara.ro,,Fashion & Retail,,
                </code>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  Coloane obligatorii: <strong>company_name</strong>, <strong>email</strong>. Restul opționale.
                </p>
              </div>

              {/* Upload */}
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', border: '2px dashed #ddd6fe', borderRadius: 14, cursor: 'pointer', background: csvData.length ? '#f0fdf4' : 'white', transition: 'all .15s' }}>
                  <FileSpreadsheet style={{ width: 32, height: 32, color: csvData.length ? '#16a34a' : '#8b5cf6', marginBottom: 8 }} />
                  <p style={{ fontSize: 13, fontWeight: 800, color: csvData.length ? '#15803d' : '#4c1d95', margin: '0 0 2px' }}>
                    {csvData.length ? `✓ ${csvData.length} branduri gata de import` : 'Click să încarci fișierul CSV'}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Acceptă .csv și .xlsx (Excel)</p>
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCsvFile} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Preview */}
              {csvData.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid #f0f0f0', borderRadius: 12 }}>
                  {csvData.slice(0, 5).map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #f5f5f5', fontSize: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#7c3aed', flexShrink: 0 }}>
                        {row.company_name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, color: '#1e1b4b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.company_name}</p>
                        <p style={{ color: '#9ca3af', margin: 0 }}>{row.email}</p>
                      </div>
                      {row.industry && <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{row.industry}</span>}
                    </div>
                  ))}
                  {csvData.length > 5 && <p style={{ padding: '8px 12px', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>+{csvData.length - 5} mai multe...</p>}
                </div>
              )}

              {/* Result */}
              {csvResult && (
                <div style={{ background: csvResult.fail === 0 ? '#f0fdf4' : '#fff7ed', border: `1.5px solid ${csvResult.fail === 0 ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 800, color: csvResult.fail === 0 ? '#15803d' : '#92400e' }}>
                  ✓ {csvResult.ok} importate cu succes{csvResult.fail > 0 ? ` · ${csvResult.fail} duplicate/erori` : ''}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowCsvImport(false); setCsvData([]); setCsvResult(null) }}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                  {csvResult ? 'Închide' : 'Anulează'}
                </button>
                {!csvResult && (
                  <button onClick={importCsv} disabled={!csvData.length || csvImporting}
                    className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                    {csvImporting
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Importez…</>
                      : <><Upload className="w-4 h-4" /> Importă {csvData.length} branduri</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">Trimite email</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selected.size} {activeTab === 'brand' ? 'brand' : 'influencer'}{selected.size !== 1 ? 'uri' : ''} selectat{selected.size !== 1 ? 'e' : ''}</p>
              </div>
              <button onClick={() => setShowSend(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Template email</label>
                {activeTab === 'brand' && selected.size > 0 && (() => {
                  const selectedLeads = leads.filter(l => selected.has(l.id))
                  const industries = [...new Set(selectedLeads.map(l => l.industry).filter(Boolean))]
                  const suggested = BRAND_TEMPLATES.filter(t => t.industries?.some(i => industries.includes(i)))
                  if (suggested.length > 0) return (
                    <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>
                      💡 Template sugerat pentru {industries.join(', ')}: <span style={{ color: '#f97316' }}>{suggested[0].label}</span>
                    </div>
                  )
                })()}
                <select
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-orange-400 transition bg-white"
                >
                  {templates.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              {template === 'ai_personalize' && (
                <div style={{ background: 'linear-gradient(135deg,#f3e8ff,#ede9fe)', border: '2px solid #c4b5fd', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#6d28d9' }}>✨ Mod AI Activ</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#7c3aed', lineHeight: 1.5 }}>
                    Claude va genera un email unic pentru fiecare companie selectată, personalizat pe baza numelui companiei și industriei. Durează ~3-5 secunde per email.
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>
                    💡 Funcționează cel mai bine când leads-urile au completat câmpul "Industrie".
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Limbă</label>
                <div className="flex gap-2">
                  {['ro', 'en'].map(l => (
                    <button key={l} onClick={() => setLanguage(l)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${language === l ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                      {l === 'ro' ? 'Română' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              {template === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Subiect *</label>
                    <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                      placeholder="Subiectul emailului..."
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Conținut HTML *</label>
                    <textarea value={customHtml} onChange={e => setCustomHtml(e.target.value)}
                      placeholder="<p>Conținutul emailului...</p>" rows={5}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition resize-none font-mono" />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSend(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
                <button onClick={sendEmails} disabled={sending || (template === 'custom' && (!customSubject || !customHtml))}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                  {sending
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Trimit…</>
                    : <><Send className="w-4 h-4" /> Trimite {selected.size} email{selected.size !== 1 ? 'uri' : ''}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
