'use client'
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { getAllCampaigns, adminUpdateCampaignStatus, deleteCampaign, getAllInfluencers, adminUpdateDeliveryAddress, adminUpdateCampaign, adminImpersonateUser, updateCampaignImages } from '@/app/actions/admin'
import { getManagedCampaigns, assignInfluencersToManaged, inviteInfluencersToBarter } from '@/app/actions/managed-campaigns'
import { approveApplication, generateCheckinCode } from '@/app/actions/collaborations'
import { adminApproveApplication } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase, Search, Trash2, RefreshCw, Play, Pause,
  Archive, EyeOff, Sparkles, Users, Send, Check, X,
  ChevronDown, ChevronUp, Eye, FileText, MapPin,
  CheckCircle, Clock, AlertCircle, Star, Package,
  MessageSquare, Ban, ExternalLink, Copy, Download, Edit, User, MessageCircle
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

function ExtendDeadlineButton({ collabId, influencerId, onExtended }: { collabId: string; influencerId: string; onExtended: (days: number) => void }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(5)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function extend() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/strikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', collaboration_id: collabId, influencer_id: influencerId, days }),
      })
      const data = await res.json()
      if (res.ok) { onExtended(days); setOpen(false) }
      else setError(data.error || 'Eroare')
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (!open) return (
    <div className="px-4 pb-2">
      <button onClick={() => setOpen(true)}
        className="text-xs font-bold text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
        ⏳ Extinde deadline
      </button>
    </div>
  )

  return (
    <div className="mx-4 mb-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
      <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-2">⏳ Extinde deadline postare</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 font-bold">+</span>
        {[3, 5, 7, 14].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition ${days === d ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
            {d}z
          </button>
        ))}
        <span className="text-xs text-gray-500">zile</span>
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={extend} disabled={saving}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 rounded-xl transition disabled:opacity-50">
          {saving ? '⏳...' : `Extinde +${days} zile`}
        </button>
        <button onClick={() => { setOpen(false); setError(null) }}
          className="px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          ✕
        </button>
      </div>
      {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
    </div>
  )
}

function AdminDeliverableForm({ collabId, onSaved }: { collabId: string; onSaved: (url: string, thumb: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    const reader = new FileReader()
    reader.onload = ev => setThumbPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function save() {
    if (!url.trim()) { setError('Link-ul postării este obligatoriu'); return }
    setSaving(true); setError(null)
    try {
      let thumbnailUrl: string | null = null

      // Upload thumbnail dacă există
      if (thumbFile) {
        const fd = new FormData()
        fd.append('file', thumbFile)
        fd.append('collab_id', collabId)
        fd.append('is_admin', 'true')
        const res = await fetch('/api/collaborations/thumbnail', { method: 'POST', body: fd })
        const data = await res.json()
        if (res.ok) thumbnailUrl = data.thumbnail_url
      }

      // Salvează dovada
      const sb = (await import('@/lib/supabase/client')).createClient()
      const { error: err } = await sb.from('collaborations').update({
        deliverable_url: url.trim(),
        deliverable_note: note.trim() || null,
        thumbnail_url: thumbnailUrl,
        deliverable_submitted_at: new Date().toISOString(),
        status: 'ACTIVE',
      }).eq('id', collabId)

      if (err) throw err
      onSaved(url.trim(), thumbnailUrl)
      setOpen(false)
      setUrl(''); setNote(''); setThumbFile(null); setThumbPreview(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <div className="px-4 pb-3">
      <button onClick={() => setOpen(true)}
        className="w-full text-xs font-bold text-purple-700 border-2 border-purple-200 border-dashed py-2 rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-1.5">
        📤 Adaugă dovada postării (admin)
      </button>
    </div>
  )

  return (
    <div className="mx-4 mb-3 bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-2.5">
      <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider">📤 Adaugă dovada postării</p>

      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Link postare *</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://instagram.com/p/..."
          className="w-full text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400 bg-white"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Screenshot postare (opțional)</label>
        {thumbPreview ? (
          <div className="relative">
            <img src={thumbPreview} className="w-full h-28 object-cover rounded-lg" alt="" />
            <button onClick={() => { setThumbFile(null); setThumbPreview(null) }}
              className="absolute top-1 right-1 w-5 h-5 bg-black bg-opacity-60 text-white rounded-full text-xs flex items-center justify-center">×</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-purple-200 rounded-lg py-3 cursor-pointer hover:bg-purple-100 transition">
            <span className="text-lg">📸</span>
            <span className="text-[10px] text-purple-600 font-bold">Click pentru a adăuga screenshot</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleThumb} />
          </label>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Notă (opțional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder="ex: Adăugat de admin în locul influencerului..."
          className="w-full text-xs border border-purple-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400 resize-none bg-white"
        />
      </div>

      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl transition disabled:opacity-50">
          {saving ? '⏳ Se salvează...' : '📤 Salvează dovada'}
        </button>
        <button onClick={() => { setOpen(false); setError(null) }}
          className="px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          Anulează
        </button>
      </div>
    </div>
  )
}

function fmtNum(n: number) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function AnnounceInlineButton({ campaignId, campaignTitle, availableCities, availableNiches, selectedIds }: { campaignId: string; campaignTitle: string; availableCities: string[]; availableNiches: string[]; selectedIds: string[] }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<number | null>(null)
  const [extraMsg, setExtraMsg] = useState('')
  const [open, setOpen] = useState(false)
  const [selCities, setSelCities] = useState<string[]>([])
  const [selNiches, setSelNiches] = useState<string[]>([])
  const [useSelection, setUseSelection] = useState(true) // default: dacă există selecție, o folosim

  async function send() {
    setSending(true)
    try {
      const usingSelection = useSelection && selectedIds.length > 0
      const res = await fetch('/api/admin/announce-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          extra_message: extraMsg.trim() || undefined,
          // Dacă folosim selecția, trimitem ID-urile exacte
          influencer_ids: usingSelection ? selectedIds : undefined,
          // Filtrele de orașe/nișe se aplică DOAR când NU folosim selecția
          filter_cities: !usingSelection && selCities.length > 0 ? selCities : undefined,
          filter_niches: !usingSelection && selNiches.length > 0 ? selNiches : undefined,
        }),
      })
      const data = await res.json()
      setSent(data.sent ?? 0)
      setOpen(false)
      setExtraMsg('')
      setSelCities([])
      setSelNiches([])
    } catch {}
    finally { setSending(false) }
  }

  const toggleCity = (c: string) => setSelCities(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  const toggleNiche = (n: string) => setSelNiches(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n])

  if (sent !== null) return (
    <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-xl">✅ {sent} notificați</span>
  )

  if (open) return (
    <div className="absolute right-0 top-12 bg-white border-2 border-blue-200 rounded-2xl shadow-2xl p-4 z-30 w-[400px] max-w-[90vw]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-gray-900">📢 Anunță influencerii</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      {/* Mod de trimitere */}
      {selectedIds.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Către cine?</p>
          <div className="flex flex-col gap-1.5">
            <label className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition ${useSelection ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <input type="radio" name="mode" checked={useSelection} onChange={() => setUseSelection(true)} className="w-4 h-4" />
              <div>
                <p className="text-xs font-black text-gray-900">Doar influencerii selectați ({selectedIds.length})</p>
                <p className="text-[10px] text-gray-500">Cei pe care i-ai bifat în lista de mai jos</p>
              </div>
            </label>
            <label className={`flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition ${!useSelection ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
              <input type="radio" name="mode" checked={!useSelection} onChange={() => setUseSelection(false)} className="w-4 h-4" />
              <div>
                <p className="text-xs font-black text-gray-900">Toți influencerii aprobați</p>
                <p className="text-[10px] text-gray-500">Cu filtre opționale pe orașe/nișe</p>
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Filtru orașe — apare DOAR dacă NU folosim selecția */}
        {!useSelection && availableCities.length > 0 && (
          <div>
            <p className="text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">📍 Orașe (opțional)</p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {availableCities.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCity(c)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-full border-2 transition ${selCities.includes(c) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtru nișe */}
        {!useSelection && availableNiches.length > 0 && (
          <div>
            <p className="text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">🎯 Nișe (opțional)</p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {availableNiches.map(n => (
                <button
                  key={n}
                  onClick={() => toggleNiche(n)}
                  className={`text-[11px] font-bold px-2 py-1 rounded-full border-2 transition ${selNiches.includes(n) ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mesaj extra */}
        <div>
          <p className="text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">💬 Mesaj extra (opțional)</p>
          <input
            value={extraMsg}
            onChange={e => setExtraMsg(e.target.value)}
            placeholder="ex: Campanie urgentă, deadline săptămâna asta"
            className="w-full text-xs border-2 border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
          />
        </div>

        {/* Submit */}
        <button
          onClick={send}
          disabled={sending}
          className="w-full text-xs font-black bg-blue-600 text-white px-3 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {sending
            ? '⏳ Se trimit emailurile...'
            : useSelection && selectedIds.length > 0
              ? `📢 Trimite la ${selectedIds.length} selectați`
              : '📢 Trimite anunțul'
          }
        </button>
      </div>
    </div>
  )

  return (
    <button onClick={() => setOpen(true)}
      className="text-xs font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap">
      📢 Anunță influencerii
    </button>
  )
}

function AnnouncePanel({ campaign }: { campaign: any }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [extraMsg, setExtraMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendAnnounce() {
    setSending(true); setError(null)
    try {
      const res = await fetch('/api/admin/announce-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, extra_message: extraMsg.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare')
      setResult({ sent: data.sent })
      setShowForm(false)
      setExtraMsg('')
    } catch (e: any) { setError(e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="border border-blue-100 rounded-2xl p-4 space-y-3 bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-blue-700 uppercase tracking-wider">📢 Anunță campania</p>
          <p className="text-xs text-blue-500 mt-0.5">Trimite email tuturor influencerilor eligibili că această campanie e activă</p>
        </div>
        {result && (
          <div className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-xl">
            ✅ {result.sent} emailuri trimise
          </div>
        )}
      </div>

      {showForm ? (
        <div className="space-y-2">
          <textarea
            value={extraMsg}
            onChange={e => setExtraMsg(e.target.value)}
            placeholder="Adaugă un mesaj extra (opțional) — apare în email după detaliile campaniei..."
            rows={3}
            className="w-full text-xs border border-blue-200 rounded-xl p-2.5 outline-none focus:border-blue-400 resize-none bg-white"
          />
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <p className="text-[10px] text-blue-400">Emailul conține automat: titlu campanie, brand, recompensă, deadline, livrabile, hashtag-uri.</p>
          <div className="flex gap-2">
            <button onClick={sendAnnounce} disabled={sending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5">
              {sending ? <><span className="animate-spin">⏳</span> Se trimite...</> : <>📢 Trimite anunțul</>}
            </button>
            <button onClick={() => { setShowForm(false); setExtraMsg(''); setError(null) }}
              className="px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Anulează
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setShowForm(true); setResult(null) }}
          className="w-full text-xs font-bold text-blue-700 border-2 border-blue-200 border-dashed py-2.5 rounded-xl hover:bg-blue-100 transition flex items-center justify-center gap-1.5">
          📢 Anunță campania acum
        </button>
      )}
    </div>
  )
}

function ReminderPanel({ campaignId, campaignTitle }: { campaignId: string; campaignTitle: string }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [customMsg, setCustomMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendReminder() {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/campaign-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId, custom_message: customMsg.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare la trimitere')
      setResult({ sent: data.sent, total: data.total })
      setShowForm(false)
      setCustomMsg('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border border-purple-100 rounded-2xl p-4 space-y-3 bg-purple-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-purple-700 uppercase tracking-wider">📨 Reminder influenceri activi</p>
          <p className="text-xs text-purple-500 mt-0.5">Trimite email + notificare celor care nu au urcat dovada încă</p>
        </div>
        {result && (
          <div className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-xl">
            ✅ {result.sent}/{result.total} trimiși
          </div>
        )}
      </div>

      {showForm ? (
        <div className="space-y-2">
          <textarea
            value={customMsg}
            onChange={e => setCustomMsg(e.target.value)}
            placeholder="Mesaj personalizat (opțional) — lasă gol pentru mesajul standard..."
            rows={3}
            className="w-full text-xs border border-purple-200 rounded-xl p-2.5 outline-none focus:border-purple-400 resize-none bg-white"
          />
          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={sendReminder}
              disabled={sending}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {sending ? (
                <><span className="animate-spin">⏳</span> Se trimite...</>
              ) : (
                <>📨 Trimite reminder</>
              )}
            </button>
            <button
              onClick={() => { setShowForm(false); setCustomMsg(''); setError(null) }}
              className="px-3 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Anulează
            </button>
          </div>
          <p className="text-[10px] text-purple-400">
            Vor primi: email + notificare în platformă + push pe telefon (dacă au activat)
          </p>
        </div>
      ) : (
        <button
          onClick={() => { setShowForm(true); setResult(null) }}
          className="w-full text-xs font-bold text-purple-700 border-2 border-purple-200 border-dashed py-2.5 rounded-xl hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
        >
          📨 Trimite reminder acum
        </button>
      )}
    </div>
  )
}

function WhatsAppReminderPanel({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false)
  const [collabs, setCollabs] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function loadEligible() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Folosim API server-side cu admin client — bypass RLS
      const res = await fetch(`/api/admin/whatsapp-eligible?campaign_id=${campaignId}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Eroare la încărcare'); setLoading(false); return }
      const eligible = data.eligible || []
      setCollabs(eligible)
      setSelected(new Set(eligible.map((c: any) => c.id)))
    } catch (e: any) {
      setError('Eroare la încărcare')
    }
    setLoading(false)
  }

  function toggleOpen() {
    if (!open) loadEligible()
    setOpen(o => !o)
  }

  function toggleAll() {
    if (selected.size === collabs.length) setSelected(new Set())
    else setSelected(new Set(collabs.map((c: any) => c.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function sendReminders() {
    if (selected.size === 0) return
    setSending(true)
    setError(null)
    setResult(null)

    const collabIds = Array.from(selected)
    let sent = 0, failed = 0

    for (const collabId of collabIds) {
      try {
        const res = await fetch('/api/admin/whatsapp-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collaboration_id: collabId, campaign_id: campaignId }),
        })
        if (res.ok) sent++
        else failed++
      } catch { failed++ }
    }

    setResult({ sent, failed })
    setSending(false)
    setSelected(new Set())
    // Reîncărcăm lista
    loadEligible()
  }

  function deadlineInfo(collab: any) {
    if (!collab.package_received_at) return null
    const ref = new Date(collab.package_received_at)
    const days = collab.post_deadline_days || 5
    const deadline = new Date(ref.getTime() + days * 86400000)
    const hoursLeft = Math.round((deadline.getTime() - Date.now()) / 3600000)
    return { deadline, hoursLeft }
  }

  return (
    <div className="border border-green-100 rounded-2xl bg-green-50 overflow-hidden">
      {/* Header — click to expand */}
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-4 hover:bg-green-100/50 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-green-800 uppercase tracking-wider">💬 WhatsApp Reminder manual</p>
            <p className="text-xs text-green-600 mt-0.5">Doar influenceri cu colet primit, fără dovadă trimisă</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-green-100">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-3 border-green-200 border-t-green-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 font-bold py-3">{error}</p>
          ) : collabs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-2">📦</p>
              <p className="text-xs font-bold text-gray-500">Niciun influencer eligibil</p>
              <p className="text-xs text-gray-400 mt-1">Toți au trimis dovada sau nu au confirmat primirea coletului</p>
            </div>
          ) : (
            <>
              {/* Result banner */}
              {result && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${result.failed === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {result.failed === 0
                    ? `✅ ${result.sent} mesaje trimise cu succes!`
                    : `✅ ${result.sent} trimise · ❌ ${result.failed} eșuate`}
                </div>
              )}

              {/* Select all + count */}
              <div className="flex items-center justify-between pt-2">
                <button onClick={toggleAll}
                  className="text-xs font-bold text-green-700 hover:text-green-900 transition flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${selected.size === collabs.length ? 'bg-green-500 border-green-500' : 'border-green-400 bg-white'}`}>
                    {selected.size === collabs.length && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {selected.size === collabs.length ? 'Deselectează toți' : 'Selectează toți'}
                </button>
                <span className="text-xs text-green-600 font-bold">{selected.size}/{collabs.length} selectați</span>
              </div>

              {/* Influencer list */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {collabs.map((collab: any) => {
                  const inf = collab.influencers
                  const di = deadlineInfo(collab)
                  const isSelected = selected.has(collab.id)
                  const urgent = di && di.hoursLeft < 24
                  const sentFlags = [collab.reminder_48h_sent, collab.reminder_24h_sent, collab.reminder_12h_sent].filter(Boolean).length

                  return (
                    <div
                      key={collab.id}
                      onClick={() => toggleOne(collab.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                        isSelected ? 'bg-white border-green-300' : 'bg-green-50/50 border-transparent hover:bg-white/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${isSelected ? 'bg-green-500 border-green-500' : 'border-green-300 bg-white'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-900 truncate">{inf?.name}</p>
                          {(inf?.strikes || 0) > 0 && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-lg flex-shrink-0">
                              ⚡ {inf.strikes} strike
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-gray-400">{collab.resolved_phone || inf?.phone || '—'}</p>
                          {sentFlags > 0 && (
                            <span className="text-[10px] text-blue-500 font-bold">{sentFlags} auto trimis</span>
                          )}
                        </div>
                      </div>

                      {/* Deadline */}
                      {di && (
                        <div className={`text-right flex-shrink-0 ${urgent ? 'text-red-500' : 'text-gray-400'}`}>
                          <p className="text-[10px] font-black">{urgent ? '🔥' : '⏰'} {di.hoursLeft}h rămase</p>
                          <p className="text-[9px]">{di.deadline.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Send button */}
              <button
                onClick={sendReminders}
                disabled={sending || selected.size === 0}
                className="w-full py-2.5 rounded-xl text-xs font-black text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
              >
                {sending ? (
                  <><span className="animate-spin">⏳</span> Se trimite...</>
                ) : (
                  <><MessageCircle className="w-4 h-4" /> Trimite WhatsApp ({selected.size})</>
                )}
              </button>
              <p className="text-[10px] text-green-600 text-center">
                Mesajele se loghează automat în WhatsApp Logs
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
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
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterNiche, setFilterNiche] = useState<string>('')
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null)
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [savingImage, setSavingImage] = useState(false)
  const [editInstructionsText, setEditInstructionsText] = useState('')
  const [editingDeliverableUrl, setEditingDeliverableUrl] = useState('')
  const [savingDeliverableUrl, setSavingDeliverableUrl] = useState(false)
  const [activeSection, setActiveSection] = useState<'brief' | 'influencers' | 'actions' | 'collabs'>('brief')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [notifyInfluencers, setNotifyInfluencers] = useState(true)
  const [regDeadlineDays, setRegDeadlineDays] = useState(2)
  const [regLoading, setRegLoading] = useState(false)
  const [campaignCollabs, setCampaignCollabs] = useState<any[]>([])
  const [loadingCollabs, setLoadingCollabs] = useState(false)
  const [collabFilter, setCollabFilter] = useState<string>('ALL')
  const [collabAction, setCollabAction] = useState<string | null>(null)
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null)
  const [deliveryForm, setDeliveryForm] = useState({ delivery_name: '', delivery_phone: '', delivery_address: '', delivery_city: '', delivery_county: '', delivery_postal_code: '' })
  const [deliverySaving, setDeliverySaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editSaving, setEditSaving] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [checkinCode, setCheckinCode] = useState<Record<string, string>>({})
  const [generatingCode, setGeneratingCode] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedCampaign) return
    setUploadingImage(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { notify('❌ Neautentificat'); return }
      const remaining = 6 - (editForm.offer_image_urls?.length || 0)
      const toUpload = Array.from(files).slice(0, remaining)
      const newUrls: string[] = []
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 5 * 1024 * 1024) { notify('❌ Imagine sub 5MB necesară'); continue }
        const ext = file.name.split('.').pop()
        const path = `barter/admin/${selectedCampaign.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await sb.storage.from('campaign-images').upload(path, file, { upsert: true })
        if (uploadErr) { notify('❌ ' + uploadErr.message); continue }
        const { data } = sb.storage.from('campaign-images').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
      setEditForm((p: any) => ({ ...p, offer_image_urls: [...(p.offer_image_urls || []), ...newUrls] }))
      if (newUrls.length > 0) notify('✅ ' + newUrls.length + ' imagine(i) încărcate')
    } catch (e: any) {
      notify('❌ ' + (e.message || 'Eroare upload'))
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (url: string) => {
    setEditForm((p: any) => ({ ...p, offer_image_urls: (p.offer_image_urls || []).filter((u: string) => u !== url) }))
  }
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  async function fetchCampaignCollabs(campaignId: string) {
    setLoadingCollabs(true)
    try {
      const res = await fetch(`/api/admin/influencer-details?campaign_id=${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaignCollabs(data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoadingCollabs(false) }
  }

  async function approveCollab(collabId: string) {
    setCollabAction(collabId)
    try {
      const result = await adminApproveApplication(collabId) as any
      if (result.error) { alert(result.error); return }
      setCampaignCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: 'ACTIVE' } : c))
    } catch (e: any) { alert(e.message) }
    finally { setCollabAction(null) }
  }

  async function rejectCollab(collabId: string) {
    setCollabAction(collabId)
    try {
      const sb = createClient()
      await sb.from('collaborations').update({ status: 'REJECTED' }).eq('id', collabId)
      setCampaignCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: 'REJECTED' } : c))
    } catch (e: any) { alert(e.message) }
    finally { setCollabAction(null) }
  }

  async function approveDeliverable(collabId: string) {
    setCollabAction(collabId)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const { error } = await sb.from('collaborations').update({
        status: 'COMPLETED',
        deliverable_approved_at: now,
        completed_at: now,
      }).eq('id', collabId)
      if (error) throw error
      notify('✅ Aprobat! Plata a fost eliberată.')
      setCampaignCollabs(prev => prev.map(c => c.id === collabId ? { ...c, status: 'COMPLETED', deliverable_approved_at: now } : c))
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setCollabAction(null) }
  }

  async function rejectDeliverable(collabId: string) {
    if (!rejectReason.trim()) { notify('Introdu motivul', false); return }
    setCollabAction(collabId)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const { error } = await sb.from('collaborations').update({
        deliverable_rejected_at: now,
        deliverable_rejection_reason: rejectReason.trim(),
        deliverable_submitted_at: null,
      }).eq('id', collabId)
      if (error) throw error
      notify('Post respins. Influencerul poate retrimite.')
      setCampaignCollabs(prev => prev.map(c => c.id === collabId ? { ...c, deliverable_rejected_at: now, deliverable_rejection_reason: rejectReason, deliverable_submitted_at: null } : c))
      setShowReject(null)
      setRejectReason('')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setCollabAction(null) }
  }

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

  async function toggleRegistrations(campaignId: string, open: boolean, days?: number) {
    setRegLoading(true)
    try {
      const sb = createClient()
      const update: any = { registrations_open: open }
      if (open) {
        update.registration_deadline_days = days ?? regDeadlineDays
        update.registration_opened_at = new Date().toISOString()
      }
      await sb.from('campaigns').update(update).eq('id', campaignId)
      setCampaigns(p => p.map(c => c.id === campaignId ? { ...c, ...update } : c))
      setManaged(p => p.map(c => c.id === campaignId ? { ...c, ...update } : c))
      if (selectedCampaign?.id === campaignId) setSelectedCampaign((p: any) => ({ ...p, ...update }))
      notify(open ? `✅ Înscrieri deschise pentru ${days ?? regDeadlineDays} zile!` : '🚫 Înscrieri oprite. Influencerii văd mesaj de blocare.')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setRegLoading(false) }
  }

  async function changeStatus(id: string, status: string, shouldNotify?: boolean) {
    setActionId(id)
    const res = await adminUpdateCampaignStatus(id, status, shouldNotify ?? (status === 'ACTIVE' ? notifyInfluencers : false))
    if (res.success) {
      setCampaigns(p => p.map(c => c.id === id ? { ...c, status } : c))
      setManaged(p => p.map(c => c.id === id ? { ...c, status } : c))
      if (selectedCampaign?.id === id) setSelectedCampaign((p: any) => ({ ...p, status }))
      notify(status === 'ACTIVE' && (shouldNotify ?? notifyInfluencers) ? '✅ Campanie aprobată și influencerii notificați!' : '✅ Status actualizat.')

      // Notifică influencerii când campania devine ACTIVE
      if (status === 'ACTIVE') {
        fetch('/api/notify/campaign-launched', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: id }),
        }).catch(console.error)
      }
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
    let res
    if (selectedCampaign?.campaign_type?.toUpperCase() === 'BARTER') {
      res = await inviteInfluencersToBarter(campaignId, ids)
    } else {
      res = await assignInfluencersToManaged(campaignId, ids, influencersWithAmounts)
    }
    if (res.success) {
      const isBarter = selectedCampaign?.campaign_type?.toUpperCase() === 'BARTER'
      notify(`✅ ${res.count} ${isBarter ? 'invitații trimise' : 'influenceri asignați și notificați'}!`)
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
    const matchSearch = !q || inf.name?.toLowerCase().includes(q) || inf.city?.toLowerCase().includes(q) ||
      inf.niches?.some((n: string) => n.toLowerCase().includes(q))
    const matchCity = !filterCity || inf.city?.toLowerCase() === filterCity.toLowerCase()
    const matchNiche = !filterNiche || (inf.niches?.some((n: string) => n.toLowerCase() === filterNiche.toLowerCase()))
    return matchSearch && matchCity && matchNiche
  })

  // Lista unică de orașe și nișe din influenceri
  const uniqueCities = Array.from(new Set(influencers.map(i => i.city).filter(Boolean))).sort() as string[]
  const uniqueNiches = Array.from(new Set(influencers.flatMap(i => i.niches || []).filter(Boolean))).sort() as string[]

  // Helper bulk select: selectează toți influencerii filtrați
  const handleSelectAllFiltered = () => {
    if (!selectedCampaign) return
    const filteredIds = filteredInfs.map(i => i.id)
    const currentIds = selectedInfluencers[selectedCampaign.id] || []
    const allFilteredSelected = filteredIds.every(id => currentIds.includes(id))

    if (allFilteredSelected) {
      // Toți cei filtrați deja selectați → deselectează doar pe ei
      setSelectedInfluencers(prev => ({
        ...prev,
        [selectedCampaign.id]: currentIds.filter(id => !filteredIds.includes(id))
      }))
    } else {
      // Adaugă pe cei filtrați la selecție (fără duplicate)
      setSelectedInfluencers(prev => ({
        ...prev,
        [selectedCampaign.id]: Array.from(new Set([...currentIds, ...filteredIds]))
      }))
    }
  }

  const handleImpersonate = async (userId: string, label: string) => {
    if (!confirm(`Vrei să te loghezi ca ${label}?\n\nO să fii deconectat de la contul de admin și o să intri direct pe contul lor în acest tab.\n\nPentru a reveni la admin, fă logout și loghează-te din nou cu contul tău de admin.`)) return
    const res = await adminImpersonateUser(userId) as any
    if (res?.error) { notify('❌ ' + res.error); return }
    if (res?.magicLink) {
      // Redirect spre magic link — va loga adminul automat ca user-ul țintă
      window.location.href = res.magicLink
    }
  }

  const openEditModal = () => {
    if (!selectedCampaign) return
    setEditForm({
      // Date generale
      title: selectedCampaign.title || '',
      description: selectedCampaign.description || '',
      budget: selectedCampaign.budget || 0,
      max_influencers: selectedCampaign.max_influencers || 0,
      deadline: selectedCampaign.deadline ? selectedCampaign.deadline.split('T')[0] : '',
      platforms: selectedCampaign.platforms || [],

      // Ofertă
      offer_name: selectedCampaign.offer_name || '',
      offer_value: selectedCampaign.offer_value || 0,
      offer_description: selectedCampaign.offer_description || '',
      offer_type: selectedCampaign.offer_type || 'product',
      offer_image_urls: selectedCampaign.offer_image_urls || (selectedCampaign.offer_image_url ? [selectedCampaign.offer_image_url] : []),
      offer_count: selectedCampaign.offer_count || 1,
      reservation_required: selectedCampaign.reservation_required || false,

      // Delivery
      delivery_method: selectedCampaign.delivery_method || 'delivery',
      pickup_location_name: selectedCampaign.pickup_location_name || '',
      pickup_location_address: selectedCampaign.pickup_location_address || '',

      // Story
      story_include_instagram: selectedCampaign.story_include_instagram ?? true,
      story_include_atmosphere: selectedCampaign.story_include_atmosphere ?? true,
      story_include_product: selectedCampaign.story_include_product ?? true,
      story_instructions: selectedCampaign.story_instructions || '',

      // Auto-accept
      auto_accept_influencers: selectedCampaign.auto_accept_influencers ?? false,

      // Tasks Stories
      tasks_stories_count: selectedCampaign.tasks_stories_count || 0,
      tasks_include_post: selectedCampaign.tasks_include_post ?? false,

      // Tasks IG
      tasks_ig_reel: selectedCampaign.tasks_ig_reel ?? false,
      tasks_ig_reel_duration: selectedCampaign.tasks_ig_reel_duration || 15,
      tasks_ig_post: selectedCampaign.tasks_ig_post ?? false,
      tasks_ig_live: selectedCampaign.tasks_ig_live ?? false,
      tasks_ig_days_online: selectedCampaign.tasks_ig_days_online || 0,

      // Tasks TT
      tasks_tt_video: selectedCampaign.tasks_tt_video ?? false,
      tasks_tt_video_duration: selectedCampaign.tasks_tt_video_duration || 15,
      tasks_tt_live: selectedCampaign.tasks_tt_live ?? false,
      tasks_tt_duet: selectedCampaign.tasks_tt_duet ?? false,
      tasks_tt_days_online: selectedCampaign.tasks_tt_days_online || 0,

      // Tasks YT
      tasks_yt_short: selectedCampaign.tasks_yt_short ?? false,
      tasks_yt_short_duration: selectedCampaign.tasks_yt_short_duration || 30,
      tasks_yt_video: selectedCampaign.tasks_yt_video ?? false,
      tasks_yt_video_duration: selectedCampaign.tasks_yt_video_duration || 5,
      tasks_yt_mention: selectedCampaign.tasks_yt_mention ?? false,
      tasks_yt_link_in_desc: selectedCampaign.tasks_yt_link_in_desc ?? false,

      // Cerințe
      min_followers_target: selectedCampaign.min_followers_target || 0,
      niches: selectedCampaign.niches || [],

      // Brief & promovare
      promotion_link: selectedCampaign.promotion_link || '',
      promotion_link_placement: selectedCampaign.promotion_link_placement || [],
      required_hashtags: Array.isArray(selectedCampaign.required_hashtags) ? selectedCampaign.required_hashtags.join(', ') : '',
      required_caption: selectedCampaign.required_caption || '',
      forbidden_content: selectedCampaign.forbidden_content || '',
    })
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!selectedCampaign) return
    setEditSaving(true)

    // Transformăm pentru DB: păstrăm doar prima imagine ca string
    // (DB are coloana offer_image_url singular, nu array)
    const dataToSave = { ...editForm }
    // Salvăm AMBELE: array-ul complet ȘI prima imagine ca singular (pentru compatibilitate)
    if (Array.isArray(dataToSave.offer_image_urls)) {
      dataToSave.offer_image_url = dataToSave.offer_image_urls[0] || null
      // Păstrăm și array-ul (allowlist permite acum offer_image_urls)
    }
    // Convert hashtags string to array
    if (typeof dataToSave.required_hashtags === 'string') {
      dataToSave.required_hashtags = dataToSave.required_hashtags
        .split(',')
        .map((t: string) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
    }

    const res = await adminUpdateCampaign(selectedCampaign.id, dataToSave)
    if (res?.error) {
      notify('❌ ' + res.error)
    } else {
      setSelectedCampaign((p: any) => ({ ...p, ...dataToSave, offer_image_urls: editForm.offer_image_urls }))
      setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, ...dataToSave } : c))
      notify('✅ Campanie actualizată!')
      setShowEditModal(false)
    }
    setEditSaving(false)
  }

  const saveDeliverableUrl = async (collabId: string) => {
    if (!editingDeliverableUrl.trim()) return
    setSavingDeliverableUrl(true)
    try {
      const sb = (await import('@/lib/supabase/client')).createClient()
      const { error } = await sb.from('collaborations')
        .update({ deliverable_url: editingDeliverableUrl.trim() })
        .eq('id', collabId)
      if (error) throw error
      setSelectedCampaign((prev: any) => ({
        ...prev,
        collaborations: prev.collaborations?.map((c: any) =>
          c.id === collabId ? { ...c, deliverable_url: editingDeliverableUrl.trim() } : c
        )
      }))
      setEditingDeliverableId(null)
      setEditingDeliverableUrl('')
    } catch (e: any) {
      alert('Eroare: ' + e.message)
    } finally {
      setSavingDeliverableUrl(false)
    }
  }

  const saveDelivery = async (collabId: string) => {
    setDeliverySaving(true)
    const res = await adminUpdateDeliveryAddress(collabId, deliveryForm)
    if (res?.error) { notify('❌ ' + res.error) }
    else {
      setCampaignCollabs(prev => prev.map((c: any) => c.id === collabId ? { ...c, ...deliveryForm } : c))
      notify('✅ Adresă salvată!')
      setEditingDelivery(null)
    }
    setDeliverySaving(false)
  }

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
          <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === 'all' ? 'bg-white bg-opacity-25' : 'bg-gray-200 text-gray-500'}`}>{counts.all}</span>
        </button>
        <button className={`tab-btn flex items-center gap-2 ${tab === 'managed' ? 'on' : ''}`}
          onClick={() => setTab('managed')}
          style={tab === 'managed' ? { background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' } : {}}>
          <Sparkles className="w-3.5 h-3.5" /> Managed
          {pendingManaged > 0 && (
            <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${tab === 'managed' ? 'bg-white bg-opacity-25' : 'bg-purple-100 text-purple-600'}`}>
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
                  <span className={`ml-1.5 text-[11px] font-black px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-white bg-opacity-25' : 'bg-gray-200 text-gray-500'}`}>
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
                          onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote(''); setCollabFilter('ALL'); fetchCampaignCollabs(c.id) }}>
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
                                onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote(''); setCollabFilter('ALL'); fetchCampaignCollabs(c.id) }}>
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
                onClick={() => { setSelectedCampaign(c); setActiveSection('brief'); setAdminNote(''); setCollabFilter('ALL'); fetchCampaignCollabs(c.id) }}>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
            <div className="px-4 py-3 border-b border-gray-100 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {[
                { id: 'brief', label: 'Brief & Detalii', icon: FileText },
                { id: 'influencers', label: `Influenceri (${(selectedInfluencers[selectedCampaign.id] || []).length} sel.)`, icon: Users },
                { id: 'collabs', label: `Colaborări (${campaignCollabs.length})`, icon: CheckCircle },
                { id: 'actions', label: 'Acțiuni Admin', icon: CheckCircle },
              ].map(s => (
                <button key={s.id}
                  className={`section-btn flex items-center gap-2 flex-shrink-0 ${activeSection === s.id ? 'active' : ''}`}
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
                  {/* Admin Edit + Impersonate Buttons */}
                  <div className="flex justify-end gap-2">
                    {selectedCampaign.brands?.user_id && (
                      <button
                        onClick={() => handleImpersonate(selectedCampaign.brands.user_id, `brandul ${selectedCampaign.brands?.name || ''}`)}
                        className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                        title="Te loghezi automat ca acest brand"
                      >
                        <User className="w-3.5 h-3.5" /> Login ca brand
                      </button>
                    )}
                    <button
                      onClick={openEditModal}
                      className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editează campanie (admin)
                    </button>

                    {/* Upload Brief PDF / Imagine */}
                    <label className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer">
                      <FileText className="w-3.5 h-3.5" />
                      {selectedCampaign.brief_pdf_url ? '🔄 Înlocuiește Brief' : '📎 Atașează Brief'}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const sb = createClient()
                          const path = `briefs/${selectedCampaign.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
                          const { error } = await sb.storage.from('campaign-images').upload(path, file, { upsert: true })
                          if (error) { alert('Eroare upload: ' + error.message); return }
                          const { data: urlData } = sb.storage.from('campaign-images').getPublicUrl(path)
                          await sb.from('campaigns').update({ brief_pdf_url: urlData.publicUrl }).eq('id', selectedCampaign.id)
                          setSelectedCampaign((p: any) => ({ ...p, brief_pdf_url: urlData.publicUrl }))
                          setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, brief_pdf_url: urlData.publicUrl } : c))
                          alert('Brief atașat cu succes!')
                        }}
                      />
                    </label>

                    {selectedCampaign.brief_pdf_url && (() => {
                      const url = selectedCampaign.brief_pdf_url as string
                      const isImage = /\.(png|jpe?g|webp)$/i.test(url)
                      return (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm">
                          {isImage ? '🖼 Vezi Brief (imagine)' : <><FileText className="w-3.5 h-3.5" /> Vezi Brief PDF</>}
                        </a>
                      )
                    })()}
                  </div>

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
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <button onClick={async () => {
                          const newVal = Math.max(1, (selectedCampaign.max_influencers || 0) - 1)
                          const sb = createClient()
                          await sb.from('campaigns').update({ max_influencers: newVal }).eq('id', selectedCampaign.id)
                          setSelectedCampaign((p: any) => ({ ...p, max_influencers: newVal }))
                          setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, max_influencers: newVal } : c))
                        }} className="w-5 h-5 rounded bg-blue-200 text-blue-700 font-black text-sm flex items-center justify-center hover:bg-blue-300">-</button>
                        <button onClick={async () => {
                          const newVal = (selectedCampaign.max_influencers || 0) + 1
                          const sb = createClient()
                          await sb.from('campaigns').update({ max_influencers: newVal }).eq('id', selectedCampaign.id)
                          setSelectedCampaign((p: any) => ({ ...p, max_influencers: newVal }))
                          setCampaigns(prev => prev.map(c => c.id === selectedCampaign.id ? { ...c, max_influencers: newVal } : c))
                        }} className="w-5 h-5 rounded bg-blue-200 text-blue-700 font-black text-sm flex items-center justify-center hover:bg-blue-300">+</button>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 text-center">
                      <p className="text-base font-black text-gray-900">
                        {selectedCampaign.deadline ? fmtDate(selectedCampaign.deadline) : '—'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Deadline</p>
                    </div>
                  </div>

                  {/* ── MANAGER IMAGINI CAMPANIE ── */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wider">🖼 Imagini campanie</p>
                      <label className="cursor-pointer text-[10px] font-black text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition border border-indigo-200">
                        + Adaugă
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const sb = (await import('@/lib/supabase/client')).createClient()
                          const path = `campaigns/${selectedCampaign.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
                          const { error: uploadErr } = await sb.storage.from('campaign-images').upload(path, file, { upsert: true })
                          if (uploadErr) { alert('Eroare upload: ' + uploadErr.message); return }
                          const { data: urlData } = sb.storage.from('campaign-images').getPublicUrl(path)
                          const newUrl = urlData?.publicUrl
                          if (newUrl) setPendingImageUrl(newUrl)
                        }} />
                      </label>
                    </div>
                    {/* Preview poza noua + buton Save */}
                    {pendingImageUrl && (
                      <div className="mt-3 border-2 border-indigo-300 rounded-xl overflow-hidden">
                        <div className="bg-indigo-50 px-3 py-1.5 flex items-center justify-between">
                          <p className="text-xs font-black text-indigo-600">Previzualizare — nesalvată încă</p>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                setSavingImage(true)
                                try {
                                  const result = await updateCampaignImages(selectedCampaign.id, pendingImageUrl!)
                                  if ('error' in result) { alert('Eroare: ' + result.error); return }
                                  setSelectedCampaign((p: any) => ({ ...p, offer_image_url: result.offer_image_url, offer_images: result.offer_images }))
                                  setCampaigns((prev: any[]) => prev.map(c => c.id === selectedCampaign.id ? { ...c, offer_image_url: result.offer_image_url, offer_images: result.offer_images } : c))
                                  setPendingImageUrl(null)
                                } catch(e: any) { alert('Eroare: ' + e.message) }
                                finally { setSavingImage(false) }
                              }}
                              disabled={savingImage}
                              className="text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg transition disabled:opacity-50"
                            >{savingImage ? 'Se salvează...' : '✓ Salvează'}</button>
                            <button
                              onClick={() => setPendingImageUrl(null)}
                              className="text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg transition"
                            >Anulează</button>
                          </div>
                        </div>
                        <img src={pendingImageUrl} alt="Preview" className="w-full object-cover" style={{ maxHeight: 200 }} />
                      </div>
                    )}

                    {/* Grid imagini existente */}
                    {(() => {
                      const imgs = [
                        ...(selectedCampaign.offer_images || []),
                        ...((selectedCampaign.offer_image_url && !(selectedCampaign.offer_images || []).includes(selectedCampaign.offer_image_url)) ? [selectedCampaign.offer_image_url] : []),
                        ...((selectedCampaign.product_image_url && !(selectedCampaign.offer_images || []).includes(selectedCampaign.product_image_url)) ? [selectedCampaign.product_image_url] : []),
                      ].filter(Boolean)
                      if (!imgs.length) return <p className="text-xs text-gray-400 text-center py-3">Nicio imagine adăugată</p>
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          {imgs.map((url: string, i: number) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                              <img src={url} alt="" className="w-full h-full object-cover" />
                              <button
                                onClick={async () => {
                                  const sb = (await import('@/lib/supabase/client')).createClient()
                                  // Șterge din offer_images array
                                  const updatedArr = (selectedCampaign.offer_images || []).filter((u: string) => u !== url)
                                  // Dacă era și în offer_image_url sau product_image_url, le curățăm
                                  const updateObj: any = { offer_images: updatedArr }
                                  if (selectedCampaign.offer_image_url === url) updateObj.offer_image_url = null
                                  if (selectedCampaign.product_image_url === url) updateObj.product_image_url = null
                                  const { error } = await sb.from('campaigns').update(updateObj).eq('id', selectedCampaign.id)
                                  if (error) { alert('Eroare ștergere: ' + error.message); return }
                                  setSelectedCampaign((p: any) => ({ ...p, ...updateObj }))
                                  setCampaigns((prev: any[]) => prev.map(c => c.id === selectedCampaign.id ? { ...c, ...updateObj } : c))
                                }}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

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
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedCampaign.managed_instructions}</p>
                    </div>
                  )}

                  {/* Story instructions (barter) */}
                  {selectedCampaign.story_instructions && (
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black text-pink-700 uppercase tracking-wider">📱 Instrucțiuni postare</p>
                        <button
                          onClick={() => { setEditingSection('instructions'); setEditInstructionsText(selectedCampaign.story_instructions || '') }}
                          className="text-[10px] font-black text-pink-500 hover:text-pink-700 px-2 py-0.5 rounded-lg hover:bg-pink-100 transition border border-pink-200"
                        >✏️ Editează</button>
                      </div>
                      {editingSection === 'instructions'
                        ? <div className="space-y-2">
                            <textarea
                              value={editInstructionsText}
                              onChange={e => setEditInstructionsText(e.target.value)}
                              rows={10}
                              className="w-full text-xs border border-pink-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white font-mono"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={async () => {
                                const sb = (await import('@/lib/supabase/client')).createClient()
                                await sb.from('campaigns').update({ story_instructions: editInstructionsText }).eq('id', selectedCampaign.id)
                                setSelectedCampaign((p: any) => ({ ...p, story_instructions: editInstructionsText }))
                                setEditingSection(null)
                              }} className="flex-1 text-xs font-black bg-pink-600 hover:bg-pink-700 text-white rounded-xl py-2 transition">✓ Salvează</button>
                              <button onClick={() => setEditingSection(null)} className="text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-2 transition">Anulează</button>
                            </div>
                          </div>
                        : <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedCampaign.story_instructions}</p>
                      }
                    </div>
                  )}

                  {/* Link promovare produs */}
                  {selectedCampaign.promotion_link && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                        <p className="text-xs font-black text-blue-700 uppercase tracking-wider">🔗 Link produs / promovare</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedCampaign.promotion_link); notify('✅ Link copiat!') }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copiază
                        </button>
                      </div>
                      <a
                        href={selectedCampaign.promotion_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline break-all flex items-center gap-1.5"
                      >
                        {selectedCampaign.promotion_link}
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                      {Array.isArray(selectedCampaign.promotion_link_placement) && selectedCampaign.promotion_link_placement.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-100">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1.5">Unde trebuie inclus link-ul</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCampaign.promotion_link_placement.map((place: string) => (
                              <span key={place} className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{place}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hashtag-uri obligatorii */}
                  {Array.isArray(selectedCampaign.required_hashtags) && selectedCampaign.required_hashtags.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                      <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-2"># Hashtag-uri obligatorii</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCampaign.required_hashtags.map((tag: string) => (
                          <span key={tag} className="text-xs font-bold bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">#{tag.replace(/^#/, '')}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caption obligatoriu */}
                  {selectedCampaign.required_caption && (
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                        <p className="text-xs font-black text-purple-700 uppercase tracking-wider">📝 Caption obligatoriu</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedCampaign.required_caption); notify('✅ Caption copiat!') }}
                          className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Copiază
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedCampaign.required_caption}</p>
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
                  {/* Budget summary - doar pentru MANAGED */}
                  {selectedCampaign.campaign_type !== 'BARTER' && selectedCampaign.budget > 0 && (() => {
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

                  {/* Budget mode selector - doar pentru MANAGED */}
                  {selectedCampaign.campaign_type !== 'BARTER' && <div>
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
                  </div>}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-gray-900">Selectează influenceri</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {selectedCampaign.max_influencers ? `Brand vrea ${selectedCampaign.max_influencers} · ` : ''}
                        {(selectedInfluencers[selectedCampaign.id] || []).length} selectați
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Buton anunță campania */}
                      <div className="relative">
                        <AnnounceInlineButton
                          campaignId={selectedCampaign.id}
                          campaignTitle={selectedCampaign.title}
                          availableCities={uniqueCities}
                          availableNiches={uniqueNiches}
                          selectedIds={selectedInfluencers[selectedCampaign.id] || []}
                        />
                      </div>
                      {(selectedInfluencers[selectedCampaign.id] || []).length > 0 && (
                      <button
                        onClick={() => handleAssign(selectedCampaign.id)}
                        disabled={assigning === selectedCampaign.id}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 12px rgba(34,197,94,0.3)' }}>
                        {assigning === selectedCampaign.id
                          ? <><div className="w-4 h-4 border-2 border-white border-opacity-40 border-t-white rounded-full animate-spin" /> Trimit invitațiile...</>
                          : <><Send className="w-4 h-4" /> Invită & Notifică ({(selectedInfluencers[selectedCampaign.id] || []).length})</>
                        }
                      </button>
                    )}
                    </div>
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

                  {/* Search + filtre */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 transition"
                        placeholder="Caută după nume, oraș, nișă..."
                        value={infSearch}
                        onChange={e => setInfSearch(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Filter oraș */}
                      <select
                        value={filterCity}
                        onChange={e => setFilterCity(e.target.value)}
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-purple-400 transition bg-white cursor-pointer"
                      >
                        <option value="">📍 Toate orașele</option>
                        {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>

                      {/* Filter nișă */}
                      <select
                        value={filterNiche}
                        onChange={e => setFilterNiche(e.target.value)}
                        className="px-3 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-purple-400 transition bg-white cursor-pointer"
                      >
                        <option value="">🎯 Toate nișele</option>
                        {uniqueNiches.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>

                      {/* Clear filters */}
                      {(filterCity || filterNiche || infSearch) && (
                        <button
                          onClick={() => { setFilterCity(''); setFilterNiche(''); setInfSearch('') }}
                          className="text-xs font-bold text-gray-400 hover:text-red-500 transition flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Resetează filtre
                        </button>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        {/* Count rezultate */}
                        <span className="text-xs font-bold text-gray-500">
                          {filteredInfs.length} {filteredInfs.length === 1 ? 'rezultat' : 'rezultate'}
                        </span>

                        {/* Bulk select toți filtrați */}
                        {filteredInfs.length > 0 && (() => {
                          const filteredIds = filteredInfs.map(i => i.id)
                          const currentIds = selectedInfluencers[selectedCampaign.id] || []
                          const allSelected = filteredIds.every(id => currentIds.includes(id))
                          return (
                            <button
                              onClick={handleSelectAllFiltered}
                              className="text-xs font-bold text-purple-600 hover:text-purple-800 transition px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100"
                            >
                              {allSelected ? '✕ Deselectează toți' : `✓ Selectează toți (${filteredInfs.length})`}
                            </button>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Helper: indicații rapide pentru filtre */}
                    {filterCity && (
                      <p className="text-[11px] text-purple-600 font-bold bg-purple-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                        📍 Filtrat după <strong>{filterCity}</strong> — perfect pentru campanii barter locale
                      </p>
                    )}
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
                        const followers = (inf.ig_followers || 0) + (inf.tt_followers || 0)
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

              {/* ── COLABORĂRI ── */}
              {activeSection === 'collabs' && (
                <div className="space-y-3">
                  {/* Export adrese livrare */}
                  {campaignCollabs.filter((c: any) => c.status === 'ACTIVE' && c.delivery_name).length > 0 && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const rows = campaignCollabs.filter((c: any) => c.status === 'ACTIVE' && c.delivery_name)
                          const inf = rows.map((c: any) => ({
                            name: c.delivery_name || '',
                            email: c.influencers?.email || '',
                            phone: c.delivery_phone || '',
                            address: c.delivery_address || '',
                            city: c.delivery_city || '',
                            county: c.delivery_county || '',
                            postal: c.delivery_postal_code || '',
                          }))
                          const header = 'Nume,Email,Telefon,Adresa,Oras,Judet,Cod Postal'
                          const csv = [header, ...inf.map((r: any) =>
                            `"${r.name}","${r.email}","${r.phone}","${r.address}","${r.city}","${r.county}","${r.postal}"`
                          )].join('\n')
                          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                          const a = document.createElement('a')
                          a.href = URL.createObjectURL(blob)
                          a.download = `adrese_livrare_${selectedCampaign?.title?.slice(0, 20) || 'campanie'}.csv`
                          a.click()
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-100 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Exportă adrese livrare ({campaignCollabs.filter((c: any) => c.status === 'ACTIVE' && c.delivery_name).length})
                      </button>
                    </div>
                  )}
                  {/* Filtre status */}
                  {campaignCollabs.length > 0 && (() => {
                    const statusCounts: Record<string, number> = {}
                    campaignCollabs.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })
                    return (
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { key: 'ALL', label: 'Toți', color: 'bg-gray-100 text-gray-600' },
                          { key: 'PENDING', label: `Aplicat (${statusCounts.PENDING || 0})`, color: 'bg-amber-50 text-amber-700' },
                          { key: 'INVITED', label: `Invitat (${statusCounts.INVITED || 0})`, color: 'bg-blue-50 text-blue-700' },
                          { key: 'ACTIVE', label: `Activ (${statusCounts.ACTIVE || 0})`, color: 'bg-purple-50 text-purple-700' },
                          { key: 'COMPLETED', label: `Finalizat (${statusCounts.COMPLETED || 0})`, color: 'bg-green-50 text-green-700' },
                          { key: 'REJECTED', label: `Respins (${statusCounts.REJECTED || 0})`, color: 'bg-red-50 text-red-600' },
                        ].filter(f => f.key === 'ALL' || statusCounts[f.key] > 0).map(f => (
                          <button key={f.key}
                            onClick={() => setCollabFilter((prev: string) => prev === f.key ? 'ALL' : f.key)}
                            className={`text-xs font-black px-3 py-1.5 rounded-full transition ${collabFilter === f.key ? 'ring-2 ring-offset-1 ring-gray-400' : ''} ${f.color}`}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                  {loadingCollabs ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : campaignCollabs.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                      <p className="font-bold text-gray-400 text-sm">Nicio colaborare încă</p>
                      <p className="text-xs text-gray-300 mt-1">Influencerii vor apărea here odată ce aplică sau sunt invitați.</p>
                    </div>
                  ) : (
                    campaignCollabs
                    .filter(c => collabFilter === 'ALL' || c.status === collabFilter)
                    .map(collab => {
                      const inf = collab.influencers
                      const hasPending = !!collab.deliverable_submitted_at && !collab.deliverable_approved_at && !collab.deliverable_rejected_at && collab.status !== 'COMPLETED'
                      const wasRejected = !!collab.deliverable_rejected_at && !collab.deliverable_submitted_at

                      const STATUS_COLORS: Record<string, string> = {
                        PENDING: 'bg-amber-50 text-amber-700',
                        INVITED: 'bg-blue-50 text-blue-700',
                        ACTIVE: 'bg-purple-50 text-purple-700',
                        COMPLETED: 'bg-green-50 text-green-700',
                        REJECTED: 'bg-gray-100 text-gray-500',
                      }
                      const STATUS_LABELS: Record<string, string> = {
                        PENDING: 'Aplicat', INVITED: 'Invitat', ACTIVE: 'Activ', COMPLETED: 'Finalizat', REJECTED: 'Respins'
                      }

                      // Sub-status vizual — calculat din campurile existente, nu schimba DB
                      function getSubStatus(c: any) {
                        if (c.status !== 'ACTIVE') return null
                        const now = new Date()
                        const isLate = c.package_received_at && !c.deliverable_submitted_at &&
                          c.post_deadline_days &&
                          (now.getTime() - new Date(c.package_received_at).getTime()) > c.post_deadline_days * 86400000
                        if (isLate) return { label: '⏰ Întârziat', cls: 'bg-red-50 text-red-600 border border-red-200' }
                        if (c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at)
                          return { label: '📝 Postat', cls: 'bg-amber-50 text-amber-700 border border-amber-200' }
                        if (c.package_received_at && !c.deliverable_submitted_at)
                          return { label: '📦 La influencer', cls: 'bg-orange-50 text-orange-600 border border-orange-200' }
                        if (c.package_sent_at && !c.package_received_at)
                          return { label: '🚚 Colet trimis', cls: 'bg-blue-50 text-blue-600 border border-blue-200' }
                        return null
                      }

                      return (
                        <div key={collab.id} className={`rounded-2xl border-2 bg-white overflow-hidden ${hasPending ? 'border-amber-300' : wasRejected ? 'border-red-200' : 'border-gray-100'}`}>
                          {/* Header */}
                          <div className="flex items-center gap-3 p-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {inf?.avatar
                                ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                                : <span className="text-xs font-black text-indigo-600">{inf?.name?.[0] ?? '?'}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-sm text-gray-900">{inf?.name ?? '—'}</p>
                                {inf?.avg_rating > 0 && <span className="text-xs text-amber-500">⭐ {inf.avg_rating.toFixed(1)}</span>}
                              </div>
                              <p className="text-xs text-gray-400 mb-1">{inf?.email}</p>
                              {/* Social media followers */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {(inf?.ig_followers > 0 || inf?.instagram_followers > 0) && (
                                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-md">
                                    IG {fmtNum(inf.ig_followers || inf.instagram_followers)}
                                  </span>
                                )}
                                {inf?.tt_followers > 0 && (
                                  <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                    TT {fmtNum(inf.tt_followers)}
                                  </span>
                                )}
                
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {inf?.slug && (
                                <a href={`/admin/influencers/${collab.influencer_id}`} target="_blank" rel="noreferrer"
                                  className="text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition">
                                  Vezi profil ↗
                                </a>
                              )}
                              {!inf?.slug && (
                                <a href={`/admin/influencers/${collab.influencer_id}`} target="_blank" rel="noreferrer"
                                  className="text-[10px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition">
                                  Vezi profil ↗
                                </a>
                              )}
                              {hasPending && <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">⏳ Verificare necesară</span>}
                              {collab.ads_code && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🎯 Ads</span>}
                              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${STATUS_COLORS[collab.status] || 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_LABELS[collab.status] || collab.status}
                              </span>
                              {(() => { const sub = getSubStatus(collab); return sub ? <span className={`text-xs font-black px-2.5 py-1 rounded-full ${sub.cls}`}>{sub.label}</span> : null })()}
                              {selectedCampaign?.delivery_method === 'pickup' && collab.status === 'ACTIVE' && (
                                collab.checked_in_at
                                  ? <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full" title={new Date(collab.checked_in_at).toLocaleString('ro-RO')}>
                                      📍 {new Date(collab.checked_in_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  : <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">📍 Neconfirmat</span>
                              )}
                            </div>
                          </div>

                          {/* Sume */}
                          {(collab.reserved_amount || collab.payment_amount) && (
                            <div className="px-4 pb-3 flex gap-2">
                              {collab.reserved_amount > 0 && collab.status !== 'COMPLETED' && (
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">🔒 {collab.reserved_amount.toLocaleString('ro-RO')} RON</span>
                              )}
                              {collab.payment_amount > 0 && (
                                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✅ {collab.payment_amount.toLocaleString('ro-RO')} RON plătit</span>
                              )}
                            </div>
                          )}

                          {/* Adresă livrare */}
                          {selectedCampaign?.delivery_method !== 'pickup' && (
                            <div className="mx-4 mb-3">
                              {collab.delivery_address ? (
                                <div className="bg-white border-2 border-green-200 rounded-xl overflow-hidden">
                                  {/* Header */}
                                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 border-b border-green-200">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm">📦</span>
                                      <p className="text-[10px] font-black text-green-700 uppercase tracking-wider">Adresă livrare</p>
                                    </div>
                                    <button onClick={() => { setEditingDelivery(collab.id); setDeliveryForm({ delivery_name: collab.delivery_name || '', delivery_phone: collab.delivery_phone || '', delivery_address: collab.delivery_address || '', delivery_city: collab.delivery_city || '', delivery_county: collab.delivery_county || '', delivery_postal_code: collab.delivery_postal_code || '' }) }}
                                      className="text-[10px] font-bold text-green-700 hover:underline">✏️ Editează</button>
                                  </div>
                                  {/* Body — shipping label */}
                                  <div className="px-3 py-2.5 space-y-1.5">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Destinatar</span>
                                      <p className="text-xs font-black text-gray-900">{collab.delivery_name || '—'}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Telefon</span>
                                      <p className="text-xs font-bold text-gray-800">{collab.delivery_phone || '—'}</p>
                                    </div>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Stradă</span>
                                      <p className="text-xs font-bold text-gray-800">{collab.delivery_address || '—'}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Oraș</span>
                                      <p className="text-xs font-bold text-gray-800">{collab.delivery_city || '—'}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Județ</span>
                                      <p className="text-xs font-bold text-gray-800">{collab.delivery_county || '—'}</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] text-gray-400 w-14 flex-shrink-0 pt-0.5">Cod poștal</span>
                                      <p className="text-xs font-bold text-gray-800">{collab.delivery_postal_code || '—'}</p>
                                    </div>
                                  </div>
                                  {/* Copy all button */}
                                  <div className="border-t border-green-100 px-3 py-2">
                                    <button
                                      onClick={() => {
                                        const text = `${collab.delivery_name}\n${collab.delivery_phone}\n${collab.delivery_address}\n${collab.delivery_city}, ${collab.delivery_county} ${collab.delivery_postal_code}`
                                        navigator.clipboard.writeText(text)
                                        notify('📋 Adresă copiată!')
                                      }}
                                      className="w-full text-[11px] font-bold text-green-700 hover:text-green-900 flex items-center justify-center gap-1.5 py-0.5">
                                      📋 Copiază adresa completă
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">⚠️</span>
                                    <p className="text-xs font-black text-red-600">Adresă de livrare lipsă</p>
                                  </div>
                                  <button onClick={() => { setEditingDelivery(collab.id); setDeliveryForm({ delivery_name: '', delivery_phone: '', delivery_address: '', delivery_city: '', delivery_county: '', delivery_postal_code: '' }) }}
                                    className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition">+ Adaugă adresă</button>
                                </div>
                              )}

                              {/* Form inline */}
                              {editingDelivery === collab.id && (
                                <div className="mt-2 bg-white border-2 border-indigo-200 rounded-xl p-3 space-y-2">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Adresă livrare</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Nume complet" value={deliveryForm.delivery_name} onChange={e => setDeliveryForm(p => ({ ...p, delivery_name: e.target.value }))}
                                      className="col-span-2 px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                    <input placeholder="Telefon" value={deliveryForm.delivery_phone} onChange={e => setDeliveryForm(p => ({ ...p, delivery_phone: e.target.value }))}
                                      className="col-span-2 px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                    <input placeholder="Adresă (stradă, nr, bloc...)" value={deliveryForm.delivery_address} onChange={e => setDeliveryForm(p => ({ ...p, delivery_address: e.target.value }))}
                                      className="col-span-2 px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                    <input placeholder="Oraș" value={deliveryForm.delivery_city} onChange={e => setDeliveryForm(p => ({ ...p, delivery_city: e.target.value }))}
                                      className="px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                    <input placeholder="Județ" value={deliveryForm.delivery_county} onChange={e => setDeliveryForm(p => ({ ...p, delivery_county: e.target.value }))}
                                      className="px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                    <input placeholder="Cod poștal" value={deliveryForm.delivery_postal_code} onChange={e => setDeliveryForm(p => ({ ...p, delivery_postal_code: e.target.value }))}
                                      className="px-3 py-2 text-xs border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-400 font-medium" />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => saveDelivery(collab.id)} disabled={deliverySaving}
                                      className="flex-1 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50">
                                      {deliverySaving ? 'Se salvează...' : '✓ Salvează'}
                                    </button>
                                    <button onClick={() => setEditingDelivery(null)}
                                      className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Anulează</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Deliverable */}
                          {collab.deliverable_url && (
                            <div className="mx-4 mb-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">📦 Post trimis</p>
                                <div className="flex items-center gap-2">
                                  {collab.deliverable_submitted_at && (
                                    <p className="text-[10px] text-gray-400">{new Date(collab.deliverable_submitted_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingDeliverableId(collab.id)
                                      setEditingDeliverableUrl(collab.deliverable_url)
                                    }}
                                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded-lg hover:bg-indigo-50 transition border border-indigo-200"
                                  >
                                    ✏️ Editează link
                                  </button>
                                </div>
                              </div>

                              {editingDeliverableId === collab.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="url"
                                    value={editingDeliverableUrl}
                                    onChange={e => setEditingDeliverableUrl(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveDeliverableUrl(collab.id); if (e.key === 'Escape') { setEditingDeliverableId(null); setEditingDeliverableUrl('') } }}
                                    placeholder="https://www.instagram.com/p/..."
                                    className="w-full text-xs font-mono border border-indigo-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveDeliverableUrl(collab.id)}
                                      disabled={savingDeliverableUrl || !editingDeliverableUrl.trim()}
                                      className="flex-1 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 transition disabled:opacity-50"
                                    >
                                      {savingDeliverableUrl ? 'Se salvează...' : '✓ Salvează'}
                                    </button>
                                    <button
                                      onClick={() => { setEditingDeliverableId(null); setEditingDeliverableUrl('') }}
                                      className="text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-2 transition"
                                    >
                                      Anulează
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <a href={collab.deliverable_url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 hover:bg-indigo-50 transition group">
                                  <span className="text-xs font-bold text-indigo-600 truncate flex-1">{collab.deliverable_url}</span>
                                  <span className="text-indigo-400 group-hover:text-indigo-600 text-xs">↗</span>
                                </a>
                              )}

                              {collab.deliverable_note && (
                                <p className="text-xs text-gray-500 italic">„{collab.deliverable_note}"</p>
                              )}
                            </div>
                          )}

                          {/* Ads Code */}
                          {collab.ads_code && (
                            <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-1.5">🎯 Cod Spark Ads / Partnership Ads</p>
                              <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-2">
                                <span className="font-mono font-black text-blue-700 text-sm flex-1">{collab.ads_code}</span>
                                <button onClick={() => navigator.clipboard.writeText(collab.ads_code)}
                                  className="text-xs font-bold text-blue-500 hover:text-blue-700 transition">Copiază</button>
                              </div>
                            </div>
                          )}

                          {/* Rejected reason */}
                          {collab.deliverable_rejected_at && collab.deliverable_rejection_reason && (
                            <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">Motiv respingere</p>
                              <p className="text-xs text-red-600">{collab.deliverable_rejection_reason}</p>
                            </div>
                          )}

                          {/* Aprobă / Refuză aplicație PENDING */}
                          {collab.status === 'PENDING' && (
                            <div className="px-4 pb-4 flex gap-2">
                              <button onClick={() => approveCollab(collab.id)} disabled={collabAction === collab.id}
                                className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                {collabAction === collab.id ? <div className="w-4 h-4 border-2 border-white border-opacity-40 border-t-white rounded-full animate-spin" /> : '✓'}
                                Aprobă aplicația
                              </button>
                              <button onClick={() => rejectCollab(collab.id)} disabled={collabAction === collab.id}
                                className="flex-1 py-2.5 rounded-xl font-black text-sm text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 disabled:opacity-50 transition">
                                ✕ Refuză
                              </button>
                            </div>
                          )}

                          {/* Admin: activează din INVITED */}
                          {collab.status === 'INVITED' && (
                            <div className="px-4 pb-4 flex gap-2">
                              <button onClick={() => approveCollab(collab.id)} disabled={collabAction === collab.id}
                                className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                ✓ Activează direct
                              </button>
                              <button onClick={() => rejectCollab(collab.id)} disabled={collabAction === collab.id}
                                className="px-4 py-2.5 rounded-xl font-black text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition">
                                ✕
                              </button>
                            </div>
                          )}

                          {/* Admin: marchează colet primit dacă influencerul nu a bifat */}
                          {collab.status === 'ACTIVE' && !collab.package_received_at && (
                            <div className="mx-4 mb-2">
                              <button
                                onClick={async () => {
                                  const sb = (await import('@/lib/supabase/client')).createClient()
                                  const now = new Date().toISOString()
                                  await sb.from('collaborations').update({ package_received_at: now }).eq('id', collab.id)
                                  setCampaignCollabs(prev => prev.map(c => c.id === collab.id ? { ...c, package_received_at: now } : c))

                                  // Notificare influencer
                                  const inf = collab.influencers as any
                                  if (inf?.user_id) {
                                    await sb.from('notifications').insert({
                                      user_id: inf.user_id,
                                      title: '📦 Coletul tău a fost confirmat!',
                                      body: `Countdown-ul de postare a pornit. Ai ${collab.post_deadline_days || 5} zile să postezi și să trimiți dovada.`,
                                      link: '/influencer/collaborations',
                                      read: false,
                                    })
                                  }

                                  // Email influencer
                                  if (inf?.email) {
                                    await fetch('/api/admin/notify-package-received', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        collab_id: collab.id,
                                        influencer_email: inf.email,
                                        influencer_name: inf.name,
                                        campaign_title: selectedCampaign?.title,
                                        deadline_days: collab.post_deadline_days || 5,
                                      }),
                                    })
                                  }

                                  notify('✅ Colet marcat ca primit! Influencerul a fost notificat.')
                                }}
                                className="w-full text-xs font-bold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5"
                              >
                                📦 Marchează colet primit + notifică influencerul
                              </button>
                            </div>
                          )}
                          {collab.status === 'ACTIVE' && collab.package_received_at && !collab.deliverable_submitted_at && (
                            <div className="mx-4 mb-2">
                              <p className="text-[10px] text-amber-600 font-bold">
                                📦 Colet primit {new Date(collab.package_received_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} — countdown activ
                              </p>
                            </div>
                          )}

                          {/* Admin: adaugă dovada dacă influencerul a uitat */}
                          {(collab.status === 'ACTIVE' || collab.status === 'COMPLETED') && !collab.deliverable_url && (
                            <AdminDeliverableForm collabId={collab.id} onSaved={(url, thumb) => {
                              setCampaignCollabs(prev => prev.map(c => c.id === collab.id
                                ? { ...c, deliverable_url: url, thumbnail_url: thumb, deliverable_submitted_at: new Date().toISOString() }
                                : c))
                              notify('✅ Dovada adăugată!')
                            }} />
                          )}

                          {/* Admin: extinde deadline */}
                          {collab.status === 'ACTIVE' && !collab.deliverable_submitted_at && (
                            <ExtendDeadlineButton
                              collabId={collab.id}
                              influencerId={collab.influencer_id}
                              onExtended={(days) => {
                                setCampaignCollabs(prev => prev.map(c => c.id === collab.id
                                  ? { ...c, post_deadline_days: (c.post_deadline_days || 14) + days }
                                  : c))
                                notify(`✅ Deadline extins cu ${days} zile! Influencerul a primit email.`)
                              }} />
                          )}

                          {/* Admin: finalizează / refuză din ACTIVE */}
                          {collab.status === 'ACTIVE' && !hasPending && (
                            <div className="px-4 pb-4 flex gap-2">
                              <button onClick={async () => {
                                setCollabAction(collab.id)
                                const sb = createClient()
                                await sb.from('collaborations').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', collab.id)
                                setCampaignCollabs(prev => prev.map(c => c.id === collab.id ? { ...c, status: 'COMPLETED' } : c))
                                notify('✅ Colaborare finalizată.')
                                setCollabAction(null)
                              }} disabled={collabAction === collab.id}
                                className="flex-1 py-2 rounded-xl font-black text-xs text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                                ✓ Finalizează
                              </button>
                              <button onClick={() => rejectCollab(collab.id)} disabled={collabAction === collab.id}
                                className="px-3 py-2 rounded-xl font-black text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition">
                                ✕ Revocă
                              </button>
                            </div>
                          )}

                          {/* Acțiuni deliverable */}
                          {hasPending && (
                            <div className="px-4 pb-4 space-y-2">
                              {showReject !== collab.id ? (
                                <div className="flex gap-2">
                                  <button onClick={() => approveDeliverable(collab.id)} disabled={collabAction === collab.id}
                                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                    {collabAction === collab.id ? <div className="w-4 h-4 border-2 border-white border-opacity-40 border-t-white rounded-full animate-spin" /> : '✓'}
                                    Aprobă & eliberează plata
                                  </button>
                                  <button onClick={() => { setShowReject(collab.id); setRejectReason('') }}
                                    className="flex-1 py-2.5 rounded-xl font-black text-sm text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition">
                                    ✕ Respinge
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                    placeholder="Motivul respingerii (influencerul îl va vedea)…"
                                    rows={2} className="w-full px-3 py-2 border-2 border-red-200 rounded-xl text-sm outline-none focus:border-red-400 resize-none"
                                    style={{ fontFamily: 'inherit' }} />
                                  <div className="flex gap-2">
                                    <button onClick={() => rejectDeliverable(collab.id)} disabled={collabAction === collab.id || !rejectReason.trim()}
                                      className="flex-1 py-2 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition">
                                      Confirmă respingerea
                                    </button>
                                    <button onClick={() => { setShowReject(null); setRejectReason('') }}
                                      className="px-4 py-2 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition">
                                      Anulează
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {collab.status === 'COMPLETED' && (
                            <div className="px-4 pb-4">
                              <p className="text-xs font-black text-green-600 text-center">✅ Finalizat {collab.completed_at ? new Date(collab.completed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : ''}</p>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ── ACȚIUNI ADMIN ── */}
              {activeSection === 'actions' && (
                <div className="space-y-4">

                  {/* Performance & Raport — disponibil pentru ACTIVE și COMPLETED */}
                  {(selectedCampaign.status === 'ACTIVE' || selectedCampaign.status === 'COMPLETED' || selectedCampaign.status === 'LIVE') && (
                    <div className="border-2 border-orange-200 rounded-2xl p-4 bg-gradient-to-br from-orange-50 to-pink-50">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <p className="text-xs font-black text-orange-600 uppercase tracking-wider mb-1">📊 Performance & Raport</p>
                          <p className="text-sm font-black text-gray-900 mb-1">Tracking date influenceri + generare raport PDF</p>
                          <p className="text-xs text-gray-500">Adaugă manual statisticile (reach, likes, sentiment, audiență) per influencer. Raportul se actualizează live.</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <a href={`/admin/campaigns/${selectedCampaign.id}/performance`}
                            className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition">
                            <Edit className="w-3.5 h-3.5" /> Introdu date
                          </a>
                          <a href={`/admin/campaigns/${selectedCampaign.id}/report`} target="_blank"
                            className="px-3 py-2 rounded-lg bg-white border-2 border-orange-200 hover:border-orange-400 text-orange-600 text-xs font-black flex items-center gap-1.5 transition">
                            <Eye className="w-3.5 h-3.5" /> Preview raport
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Check-in cod locatie */}
                  {selectedCampaign.delivery_method === 'pickup' && selectedCampaign.status === 'ACTIVE' && (
                    <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📍</span>
                        <div>
                          <p className="text-xs font-black text-indigo-700 uppercase tracking-wider">Cod check-in locație</p>
                          <p className="text-xs text-indigo-500">Dă acest cod influencerilor când ajung la locație</p>
                        </div>
                      </div>
                      {(checkinCode[selectedCampaign.id] || selectedCampaign.checkin_code) ? (
                        <div>
                          <div className="bg-white rounded-2xl border-2 border-indigo-200 p-4 text-center mb-3">
                            <p className="text-3xl font-black tracking-[.35em] text-indigo-700 select-all cursor-pointer"
                              onClick={() => navigator.clipboard?.writeText(checkinCode[selectedCampaign.id] || selectedCampaign.checkin_code)}>
                              {checkinCode[selectedCampaign.id] || selectedCampaign.checkin_code}
                            </p>
                            <p className="text-xs text-indigo-400 mt-1">Click pentru a copia</p>
                          </div>
                          <button onClick={async () => {
                            setGeneratingCode(true)
                            const res = await generateCheckinCode(selectedCampaign.id) as any
                            if (res.success) setCheckinCode(p => ({ ...p, [selectedCampaign.id]: res.code }))
                            setGeneratingCode(false)
                          }} disabled={generatingCode}
                            className="w-full py-2 rounded-xl text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50">
                            {generatingCode ? 'Se generează...' : '🔄 Regenerează cod nou'}
                          </button>
                          <p className="text-[10px] text-indigo-400 text-center mt-1.5">Regenerarea invalidează codul vechi</p>
                        </div>
                      ) : (
                        <button onClick={async () => {
                          setGeneratingCode(true)
                          const res = await generateCheckinCode(selectedCampaign.id) as any
                          if (res.success) setCheckinCode(p => ({ ...p, [selectedCampaign.id]: res.code }))
                          setGeneratingCode(false)
                        }} disabled={generatingCode}
                          className="w-full py-3 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                          {generatingCode
                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Se generează...</>
                            : <><span>🔑</span>Generează cod check-in</>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reminder influenceri activi */}
                  {selectedCampaign.status === 'ACTIVE' && (
                    <ReminderPanel campaignId={selectedCampaign.id} campaignTitle={selectedCampaign.title} />
                  )}

                  {/* WhatsApp Reminder manual */}
                  {selectedCampaign.status === 'ACTIVE' && (
                    <WhatsAppReminderPanel campaignId={selectedCampaign.id} />
                  )}

                  {/* Control înscrieri — Varianta 3 Timeline */}
                  {selectedCampaign.status === 'ACTIVE' && (() => {
                    const isOpen = selectedCampaign.registrations_open === true
                    const openedAt = selectedCampaign.registration_opened_at
                    const deadlineDays = selectedCampaign.registration_deadline_days || 30
                    const deadline = openedAt ? new Date(new Date(openedAt).getTime() + deadlineDays * 86400000) : null
                    const msLeft = deadline ? deadline.getTime() - Date.now() : null
                    const daysLeft = msLeft ? Math.max(0, Math.floor(msLeft / 86400000)) : 0
                    const hoursLeft = msLeft ? Math.max(0, Math.floor((msLeft % 86400000) / 3600000)) : 0
                    const pct = (msLeft && deadlineDays) ? Math.min(100, Math.max(0, (msLeft / (deadlineDays * 86400000)) * 100)) : 0
                    const expired = msLeft !== null && msLeft <= 0

                    return (
                      <div className="border border-gray-100 rounded-2xl p-4 space-y-4 bg-white">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Control înscrieri</p>

                        {/* Status + toggle row */}
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isOpen ? 'bg-green-50' : 'bg-gray-100'}`}>
                            <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-gray-900">{isOpen ? 'Înscrieri active' : 'Înscrieri oprite'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {deadline ? `Expiră ${deadline.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} la ${deadline.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}` : 'Nicio perioadă setată'}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleRegistrations(selectedCampaign.id, !isOpen)}
                            disabled={regLoading}
                            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 flex-shrink-0 ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                        </div>

                        {/* Timeline progress */}
                        {openedAt && isOpen && (
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                              <span>{new Date(openedAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                              <span className={`font-black ${expired ? 'text-red-500' : daysLeft === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                {expired ? 'Expirat' : `${daysLeft}z ${hoursLeft}h rămase`}
                              </span>
                              <span>{deadline?.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: pct < 20 ? '#E24B4A' : pct < 50 ? '#EF9F27' : '#1D9E75' }} />
                            </div>
                          </div>
                        )}

                        {/* Durata */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-500">Durata perioadei</p>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">implicit: 2 zile</span>
                          </div>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(d => (
                              <button key={d} onClick={() => setRegDeadlineDays(d)}
                                className={`flex-1 py-2 rounded-xl font-black text-sm border transition ${regDeadlineDays === d ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200 text-gray-500 hover:border-blue-300 bg-white'}`}>
                                {d}z
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Buton principal */}
                        {isOpen ? (
                          <button onClick={() => toggleRegistrations(selectedCampaign.id, false)} disabled={regLoading}
                            className="w-full py-2.5 rounded-xl font-black text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition">
                            Oprește înscrierile
                          </button>
                        ) : (
                          <button onClick={() => toggleRegistrations(selectedCampaign.id, true)} disabled={regLoading}
                            className="w-full py-2.5 rounded-xl font-black text-sm text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition">
                            Redeschide înscrierile · {regDeadlineDays} zile
                          </button>
                        )}
                      </div>
                    )
                  })()}

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
                        <div className="col-span-2 space-y-3">
                          {/* Toggle notifică influencerii */}
                          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm font-black text-blue-800">Notifică influencerii</p>
                              <p className="text-xs text-blue-600">Toți influencerii aprobați vor primi o notificare</p>
                            </div>
                            <button
                              onClick={() => setNotifyInfluencers(v => !v)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${notifyInfluencers ? 'bg-blue-500' : 'bg-gray-300'}`}
                            >
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyInfluencers ? 'translate-x-5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <button onClick={() => changeStatus(selectedCampaign.id, 'ACTIVE')}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl font-black text-sm text-white transition"
                            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                            <CheckCircle className="w-4 h-4" /> ✅ Aprobă campania
                          </button>
                        </div>
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
                        <button onClick={() => { setCompletingId(selectedCampaign.id); setShowCompleteConfirm(true) }}
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

      {/* ── ADMIN EDIT MODAL ─────────────────────────────────────── */}
      {showEditModal && selectedCampaign && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
              <div>
                <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">Admin · Editare campanie</p>
                <h2 className="text-lg font-black text-gray-900 mt-0.5">{selectedCampaign.title}</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Date generale</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Titlu campanie</label>
                    <input value={editForm.title} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Descriere</label>
                    <textarea value={editForm.description} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Buget & target</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Buget (RON)</label>
                    <input type="number" min="0" value={editForm.budget} onChange={e => setEditForm((p: any) => ({ ...p, budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Influenceri doriți</label>
                    <input type="number" min="1" value={editForm.max_influencers} onChange={e => setEditForm((p: any) => ({ ...p, max_influencers: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">Deadline</label>
                    <input type="date" value={editForm.deadline} onChange={e => setEditForm((p: any) => ({ ...p, deadline: e.target.value }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Platforme</p>
                <div className="flex flex-wrap gap-2">
                  {['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK'].map(p => {
                    const isSelected = (editForm.platforms || []).includes(p)
                    return (
                      <button key={p}
                        onClick={() => setEditForm((prev: any) => ({ ...prev, platforms: isSelected ? prev.platforms.filter((x: string) => x !== p) : [...(prev.platforms || []), p] }))}
                        className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(selectedCampaign.campaign_type === 'barter' || selectedCampaign.campaign_type === 'BARTER') && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Ofertă barter</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Tip ofertă</label>
                        <select value={editForm.offer_type} onChange={e => setEditForm((p: any) => ({ ...p, offer_type: e.target.value }))}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold bg-white">
                          <option value="product">Produs</option>
                          <option value="service">Serviciu</option>
                          <option value="experience">Experiență</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Valoare ofertă (RON)</label>
                        <input type="number" min="0" value={editForm.offer_value} onChange={e => setEditForm((p: any) => ({ ...p, offer_value: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">Nume produs / ofertă</label>
                      <input value={editForm.offer_name} onChange={e => setEditForm((p: any) => ({ ...p, offer_name: e.target.value }))}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">Descriere ofertă</label>
                      <textarea value={editForm.offer_description} onChange={e => setEditForm((p: any) => ({ ...p, offer_description: e.target.value }))} rows={3}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">Mod ridicare</label>
                      <div className="flex gap-2">
                        {[{ v: 'delivery', l: '📦 Livrare' }, { v: 'pickup', l: '📍 Pickup' }].map(m => (
                          <button key={m.v} onClick={() => setEditForm((p: any) => ({ ...p, delivery_method: m.v }))}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black border-2 transition ${editForm.delivery_method === m.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                            {m.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    {editForm.delivery_method === 'pickup' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1.5 block">Locație pickup (nume)</label>
                          <input value={editForm.pickup_location_name} onChange={e => setEditForm((p: any) => ({ ...p, pickup_location_name: e.target.value }))}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1.5 block">Adresă pickup</label>
                          <input value={editForm.pickup_location_address} onChange={e => setEditForm((p: any) => ({ ...p, pickup_location_address: e.target.value }))}
                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                        </div>
                      </div>
                    )}

                    {/* Număr disponibil + rezervare */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Bucăți disponibile</label>
                        <input type="number" min="1" value={editForm.offer_count} onChange={e => setEditForm((p: any) => ({ ...p, offer_count: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!editForm.reservation_required}
                            onChange={e => setEditForm((p: any) => ({ ...p, reservation_required: e.target.checked }))}
                            className="w-4 h-4 rounded accent-indigo-500" />
                          <span className="text-xs font-bold text-gray-700">Rezervare necesară</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Imagini ofertă */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Imagini ofertă (max 6)</p>
                {(editForm.offer_image_urls || []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {editForm.offer_image_urls.map((url: string, idx: number) => (
                      <div key={url + idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(editForm.offer_image_urls || []).length < 6 && (
                  <label className="cursor-pointer block">
                    <input type="file" multiple accept="image/*" onChange={e => handleImageUpload(e.target.files)} disabled={uploadingImage} className="hidden" />
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${uploadingImage ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                      {uploadingImage ? (
                        <p className="text-xs font-bold text-indigo-500">Se încarcă...</p>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-gray-500">📤 Click pentru upload imagini</p>
                          <p className="text-[10px] text-gray-400 mt-1">PNG / JPG, max 5MB · {6 - (editForm.offer_image_urls?.length || 0)} disponibile</p>
                        </>
                      )}
                    </div>
                  </label>
                )}
              </div>

              {/* Auto-accept */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Auto-accept influenceri</p>
                <label className="flex items-start gap-3 p-3 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-indigo-200">
                  <input type="checkbox" checked={!!editForm.auto_accept_influencers}
                    onChange={e => setEditForm((p: any) => ({ ...p, auto_accept_influencers: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 rounded accent-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">Acceptare automată</p>
                    <p className="text-xs text-gray-500 mt-0.5">Influencerii care îndeplinesc criteriile sunt acceptați automat fără review manual.</p>
                  </div>
                </label>
              </div>

              {/* Story settings */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Conținut Story (Instagram)</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={!!editForm.story_include_instagram}
                      onChange={e => setEditForm((p: any) => ({ ...p, story_include_instagram: e.target.checked }))}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs font-bold text-gray-700">Mention @brand pe Instagram</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={!!editForm.story_include_atmosphere}
                      onChange={e => setEditForm((p: any) => ({ ...p, story_include_atmosphere: e.target.checked }))}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs font-bold text-gray-700">Atmosferă / context vizual</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input type="checkbox" checked={!!editForm.story_include_product}
                      onChange={e => setEditForm((p: any) => ({ ...p, story_include_product: e.target.checked }))}
                      className="w-4 h-4 rounded accent-indigo-500" />
                    <span className="text-xs font-bold text-gray-700">Produsul vizibil clar</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">Număr stories</label>
                      <input type="number" min="0" value={editForm.tasks_stories_count}
                        onChange={e => setEditForm((p: any) => ({ ...p, tasks_stories_count: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!editForm.tasks_include_post}
                          onChange={e => setEditForm((p: any) => ({ ...p, tasks_include_post: e.target.checked }))}
                          className="w-4 h-4 rounded accent-indigo-500" />
                        <span className="text-xs font-bold text-gray-700">Include și postare</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks Instagram */}
              {(editForm.platforms || []).includes('INSTAGRAM') && (
                <div>
                  <p className="text-xs font-black text-pink-500 uppercase tracking-wider mb-3">📸 Task-uri Instagram</p>
                  <div className="space-y-2 p-3 bg-pink-50/40 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_ig_reel} onChange={e => setEditForm((p: any) => ({ ...p, tasks_ig_reel: e.target.checked }))} className="w-4 h-4 rounded accent-pink-500" />
                      <span className="text-xs font-bold text-gray-700">Reel</span>
                      {editForm.tasks_ig_reel && (
                        <input type="number" min="5" value={editForm.tasks_ig_reel_duration}
                          onChange={e => setEditForm((p: any) => ({ ...p, tasks_ig_reel_duration: parseInt(e.target.value) || 0 }))}
                          className="ml-2 w-20 px-2 py-1 text-xs border border-pink-200 rounded-lg" placeholder="secunde" />
                      )}
                      {editForm.tasks_ig_reel && <span className="text-[10px] text-gray-500">secunde</span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_ig_post} onChange={e => setEditForm((p: any) => ({ ...p, tasks_ig_post: e.target.checked }))} className="w-4 h-4 rounded accent-pink-500" />
                      <span className="text-xs font-bold text-gray-700">Postare feed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_ig_live} onChange={e => setEditForm((p: any) => ({ ...p, tasks_ig_live: e.target.checked }))} className="w-4 h-4 rounded accent-pink-500" />
                      <span className="text-xs font-bold text-gray-700">Live</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-gray-500">Postările active timp de</span>
                      <input type="number" min="0" value={editForm.tasks_ig_days_online}
                        onChange={e => setEditForm((p: any) => ({ ...p, tasks_ig_days_online: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 text-xs border border-pink-200 rounded-lg" />
                      <span className="text-[10px] text-gray-500">zile</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks TikTok */}
              {(editForm.platforms || []).includes('TIKTOK') && (
                <div>
                  <p className="text-xs font-black text-cyan-500 uppercase tracking-wider mb-3">🎵 Task-uri TikTok</p>
                  <div className="space-y-2 p-3 bg-cyan-50/40 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_tt_video} onChange={e => setEditForm((p: any) => ({ ...p, tasks_tt_video: e.target.checked }))} className="w-4 h-4 rounded accent-cyan-500" />
                      <span className="text-xs font-bold text-gray-700">Video</span>
                      {editForm.tasks_tt_video && (
                        <input type="number" min="5" value={editForm.tasks_tt_video_duration}
                          onChange={e => setEditForm((p: any) => ({ ...p, tasks_tt_video_duration: parseInt(e.target.value) || 0 }))}
                          className="ml-2 w-20 px-2 py-1 text-xs border border-cyan-200 rounded-lg" placeholder="secunde" />
                      )}
                      {editForm.tasks_tt_video && <span className="text-[10px] text-gray-500">secunde</span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_tt_live} onChange={e => setEditForm((p: any) => ({ ...p, tasks_tt_live: e.target.checked }))} className="w-4 h-4 rounded accent-cyan-500" />
                      <span className="text-xs font-bold text-gray-700">Live</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_tt_duet} onChange={e => setEditForm((p: any) => ({ ...p, tasks_tt_duet: e.target.checked }))} className="w-4 h-4 rounded accent-cyan-500" />
                      <span className="text-xs font-bold text-gray-700">Duet / Stitch</span>
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-gray-500">Active timp de</span>
                      <input type="number" min="0" value={editForm.tasks_tt_days_online}
                        onChange={e => setEditForm((p: any) => ({ ...p, tasks_tt_days_online: parseInt(e.target.value) || 0 }))}
                        className="w-16 px-2 py-1 text-xs border border-cyan-200 rounded-lg" />
                      <span className="text-[10px] text-gray-500">zile</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks YouTube */}
              {(editForm.platforms || []).includes('YOUTUBE') && (
                <div>
                  <p className="text-xs font-black text-red-500 uppercase tracking-wider mb-3">▶️ Task-uri YouTube</p>
                  <div className="space-y-2 p-3 bg-red-50/40 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_yt_short} onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_short: e.target.checked }))} className="w-4 h-4 rounded accent-red-500" />
                      <span className="text-xs font-bold text-gray-700">YT Short</span>
                      {editForm.tasks_yt_short && (
                        <input type="number" min="5" value={editForm.tasks_yt_short_duration}
                          onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_short_duration: parseInt(e.target.value) || 0 }))}
                          className="ml-2 w-20 px-2 py-1 text-xs border border-red-200 rounded-lg" placeholder="secunde" />
                      )}
                      {editForm.tasks_yt_short && <span className="text-[10px] text-gray-500">secunde</span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_yt_video} onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_video: e.target.checked }))} className="w-4 h-4 rounded accent-red-500" />
                      <span className="text-xs font-bold text-gray-700">Video lung</span>
                      {editForm.tasks_yt_video && (
                        <input type="number" min="1" value={editForm.tasks_yt_video_duration}
                          onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_video_duration: parseInt(e.target.value) || 0 }))}
                          className="ml-2 w-20 px-2 py-1 text-xs border border-red-200 rounded-lg" placeholder="minute" />
                      )}
                      {editForm.tasks_yt_video && <span className="text-[10px] text-gray-500">minute</span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_yt_mention} onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_mention: e.target.checked }))} className="w-4 h-4 rounded accent-red-500" />
                      <span className="text-xs font-bold text-gray-700">Mention în video</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.tasks_yt_link_in_desc} onChange={e => setEditForm((p: any) => ({ ...p, tasks_yt_link_in_desc: e.target.checked }))} className="w-4 h-4 rounded accent-red-500" />
                      <span className="text-xs font-bold text-gray-700">Link în descriere</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Cerințe influenceri</p>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">Followers minim</label>
                  <input type="number" min="0" value={editForm.min_followers_target} onChange={e => setEditForm((p: any) => ({ ...p, min_followers_target: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 font-bold" />
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Instrucțiuni conținut</p>
                <textarea value={editForm.story_instructions} onChange={e => setEditForm((p: any) => ({ ...p, story_instructions: e.target.value }))} rows={4}
                  placeholder="Hashtag-uri obligatorii, mențiuni, ton de voce, etc."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>

              {/* Link promovare */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">🔗 Link promovare produs</p>
                <input type="url" value={editForm.promotion_link}
                  onChange={e => setEditForm((p: any) => ({ ...p, promotion_link: e.target.value }))}
                  placeholder="https://brand.ro/produs"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 mb-2" />
                <p className="text-[10px] text-gray-500 mb-2">Unde trebuie inclus link-ul?</p>
                <div className="flex flex-wrap gap-2">
                  {['Story', 'Bio', 'Caption postare', 'Descriere video', 'Comment'].map(place => {
                    const isSelected = (editForm.promotion_link_placement || []).includes(place)
                    return (
                      <button key={place}
                        onClick={() => setEditForm((prev: any) => ({
                          ...prev,
                          promotion_link_placement: isSelected
                            ? (prev.promotion_link_placement || []).filter((x: string) => x !== place)
                            : [...(prev.promotion_link_placement || []), place]
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {place}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Hashtag-uri obligatorii */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3"># Hashtag-uri obligatorii</p>
                <input type="text" value={editForm.required_hashtags}
                  onChange={e => setEditForm((p: any) => ({ ...p, required_hashtags: e.target.value }))}
                  placeholder="ex: addfame, gifted, sublim3"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
                <p className="text-[10px] text-gray-500 mt-1">Separate prin virgulă. Nu include simbolul # — se adaugă automat.</p>
              </div>

              {/* Caption obligatoriu */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">📝 Caption obligatoriu (opțional)</p>
                <textarea value={editForm.required_caption}
                  onChange={e => setEditForm((p: any) => ({ ...p, required_caption: e.target.value }))} rows={3}
                  placeholder="Text exact care trebuie inclus în postare..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>

              {/* Forbidden content */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">🚫 Ce să evite</p>
                <textarea value={editForm.forbidden_content}
                  onChange={e => setEditForm((p: any) => ({ ...p, forbidden_content: e.target.value }))} rows={3}
                  placeholder="Mențiuni, branduri concurente, subiecte de evitat..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-2 justify-end rounded-b-3xl">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
                Anulează
              </button>
              <button onClick={saveEdit} disabled={editSaving}
                className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 transition disabled:opacity-50">
                {editSaving ? 'Se salvează...' : <><Check className="w-3.5 h-3.5" /> Salvează modificările</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Complete Dialog ── */}
      {showCompleteConfirm && completingId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏁</span>
            </div>
            <h2 className="text-lg font-black text-gray-900 text-center mb-2">Finalizezi campania?</h2>
            <p className="text-sm text-gray-600 text-center font-semibold mb-1 leading-snug">
              {selectedCampaign?.title}
            </p>
            <p className="text-xs text-gray-400 text-center mb-5">
              Campania va fi marcată ca finalizată. Influencerii nu mai pot aplica sau urca dovezi noi.
            </p>
            <div className="bg-blue-50 rounded-2xl p-3 mb-5 flex items-center gap-3">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-xs font-black text-blue-800">
                  Campania #{campaigns.filter(c => c.status === 'COMPLETED').length + 1} finalizată pe AddFame
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  {campaigns.filter(c => c.status === 'COMPLETED').length} campanii finalizate până acum
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCompleteConfirm(false); setCompletingId(null) }}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={() => {
                setShowCompleteConfirm(false)
                changeStatus(completingId, 'COMPLETED')
                setCompletingId(null)
              }} className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2">
                <span>🏁</span> Da, finalizează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
