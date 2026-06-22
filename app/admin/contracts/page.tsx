'use client'

import { useEffect, useState } from 'react'
import { Plus, Copy, Check, ExternalLink, Trash2, FileText, Download, X } from 'lucide-react'

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

const STATUS_CFG = {
  draft:    { label: 'Draft',   bg: 'bg-gray-100',   text: 'text-gray-600',  dot: 'bg-gray-400' },
  sent:     { label: 'Trimis',  bg: 'bg-blue-100',   text: 'text-blue-700',  dot: 'bg-blue-500' },
  signed:   { label: 'Semnat',  bg: 'bg-green-100',  text: 'text-green-700', dot: 'bg-green-500' },
  archived: { label: 'Arhivat', bg: 'bg-orange-100', text: 'text-orange-700',dot: 'bg-orange-400' },
}

function makeSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îi]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

export default function ContractsPage() {
  const [tab, setTab] = useState<'ugc' | 'campanii'>('ugc')
  const [ugcContracts, setUgcContracts] = useState<UGCContract[]>([])
  const [colabContracts, setColabContracts] = useState<ColabContract[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [ugcForm, setUgcForm] = useState({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', notes: '' })
  const [colabForm, setColabForm] = useState({ influencer_name: '', influencer_email: '', influencer_phone: '', influencer_address: '', amount_lei: '', payment_days: '14', campaign_title: '', platform: '', deliverables: '', notes: '' })

  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/contracts/ugc').then(r => r.json()),
      fetch('/api/admin/contracts/colaborare').then(r => r.json()),
    ])
    setUgcContracts(r1.contracts || [])
    setColabContracts(r2.contracts || [])
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

  function copyLink(contract: UGCContract | ColabContract, type: 'ugc' | 'campanii') {
    const path = type === 'ugc' ? 'contract' : 'contract-colaborare'
    const url = `${window.location.origin}/${path}/${contract.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(contract.id)
    if (contract.status === 'draft') updateStatus(contract.id, 'sent', type)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function updateStatus(id: string, status: string, type: 'ugc' | 'campanii') {
    const endpoint = type === 'ugc' ? `/api/admin/contracts/ugc/${id}` : `/api/admin/contracts/colaborare/${id}`
    const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const data = await res.json()
    if (!data.error) {
      if (type === 'ugc') setUgcContracts(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c))
      else setColabContracts(prev => prev.map(c => c.id === id ? { ...c, status: status as any } : c))
    }
  }

  async function deleteContract(id: string, type: 'ugc' | 'campanii') {
    if (!confirm('Arhivezi acest contract?')) return
    const endpoint = type === 'ugc' ? `/api/admin/contracts/ugc/${id}` : `/api/admin/contracts/colaborare/${id}`
    const res = await fetch(endpoint, { method: 'DELETE' })
    const data = await res.json()
    if (!data.error) {
      if (type === 'ugc') setUgcContracts(prev => prev.filter(c => c.id !== id))
      else setColabContracts(prev => prev.filter(c => c.id !== id))
    }
  }

  const contracts = tab === 'ugc' ? ugcContracts : colabContracts
  const accentColor = tab === 'ugc' ? '#6366f1' : '#f97316'
  const accentGrad = tab === 'ugc' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#f97316,#ec4899)'

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8f9fb', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Contracte</h1>
            <p className="text-sm text-gray-500 mt-0.5">Generează și gestionează contracte digitale</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black transition hover:-translate-y-0.5"
            style={{ background: accentGrad, boxShadow: `0 4px 14px ${tab === 'ugc' ? 'rgba(99,102,241,0.35)' : 'rgba(249,115,22,0.35)'}` }}>
            <Plus className="w-4 h-4" /> Contract nou {tab === 'ugc' ? 'UGC' : 'Colaborare'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6">
          {([['ugc', 'Contracte UGC'], ['campanii', 'Contracte Colaborare']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${tab === key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === key ? { background: accentGrad } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-400 text-sm">Se încarcă...</div>
          ) : contracts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400">Niciun contract</p>
              <p className="text-gray-300 text-sm mt-1">Creează primul contract folosind butonul de mai sus.</p>
            </div>
          ) : contracts.map(c => {
            const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 transition hover:border-orange-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-black text-gray-900 truncate">{c.influencer_name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.influencer_email}</p>
                    {'campaign_title' in c && c.campaign_title && (
                      <p className="text-xs text-orange-500 font-semibold mt-0.5">📢 {c.campaign_title}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div>
                    <p className="font-black text-gray-900">{c.amount_lei.toLocaleString('ro-RO')} RON</p>
                    <p className="text-xs text-gray-400">{c.payment_days} zile termen</p>
                  </div>
                  <div className="border-l border-gray-100 pl-4">
                    <p className="text-xs text-gray-400">Creat: {fmt(c.created_at)}</p>
                    {c.signed_at && <p className="text-xs text-green-600 font-bold">Semnat: {fmt(c.signed_at)}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => copyLink(c, tab)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition ${copiedId === c.id ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                    style={copiedId !== c.id ? { color: accentColor, background: `${accentColor}15` } : {}}>
                    {copiedId === c.id ? <><Check className="w-3.5 h-3.5" /> Copiat!</> : <><Copy className="w-3.5 h-3.5" /> Copiază link</>}
                  </button>

                  <a href={`/${tab === 'ugc' ? 'contract' : 'contract-colaborare'}/${c.token}`} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                    <ExternalLink className="w-3.5 h-3.5" /> Deschide
                  </a>

                  {c.status === 'signed' && (
                    <a href={`/${tab === 'ugc' ? 'api/ugc-contracts' : 'api/colaborare-contracts'}/${c.token}/pdf`} target="_blank"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-green-50 text-green-700 hover:bg-green-100 transition">
                      <Download className="w-3.5 h-3.5" /> Descarcă
                    </a>
                  )}

                  <button onClick={() => deleteContract(c.id, tab)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-red-50 text-red-500 hover:bg-red-100 transition ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Arhivează
                  </button>
                </div>
              </div>
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
                <h2 className="font-black text-lg text-gray-900">Contract nou {tab === 'ugc' ? 'UGC' : 'Colaborare'}</h2>
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
            ) : (
              <form onSubmit={createColab} className="p-6 space-y-4">
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
