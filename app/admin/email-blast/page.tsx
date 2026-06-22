'use client'
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Mail, Users, Send, CheckCircle, AlertCircle, RefreshCw,
  Filter, Eye, X, ChevronDown, Loader2, Zap
} from 'lucide-react'

const NICHES = ['Fashion', 'Beauty', 'Lifestyle', 'Food', 'Travel', 'Fitness', 'Tech', 'Gaming', 'Business', 'Entertainment', 'Parenting', 'Pets', 'Art', 'Music', 'Sport']
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook']

export default function EmailBlastPage() {
  const [influencers, setInfluencers] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ ok: number; fail: number } | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Filtre
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('approved')
  const [filterNiche, setFilterNiche] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterVerified, setFilterVerified] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')

  // Email content
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewName, setPreviewName] = useState('Maria Ionescu')

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data } = await sb
        .from('influencers')
        .select('id, name, email, approval_status, niches, platforms, is_verified, ig_followers, tt_followers')
        .not('email', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2000)
      setInfluencers(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Aplică filtrele
  useEffect(() => {
    let result = [...influencers]

    if (filterStatus !== 'all') {
      result = result.filter(i => i.approval_status === filterStatus)
    }
    if (filterNiche) {
      result = result.filter(i => i.niches?.includes(filterNiche))
    }
    if (filterPlatform) {
      result = result.filter(i =>
        i.platforms?.some((p: any) =>
          (typeof p === 'string' ? p : p.platform)?.toLowerCase() === filterPlatform.toLowerCase()
        )
      )
    }
    if (filterVerified) {
      result = result.filter(i => i.is_verified && i.badge_expires_at && new Date(i.badge_expires_at) > new Date())
    }
    if (searchEmail) {
      result = result.filter(i =>
        i.email?.toLowerCase().includes(searchEmail.toLowerCase()) ||
        i.name?.toLowerCase().includes(searchEmail.toLowerCase())
      )
    }

    setFiltered(result)
  }, [influencers, filterStatus, filterNiche, filterPlatform, filterVerified, searchEmail])

  // Înlocuiește placeholder-ele
  function renderBody(name: string, email: string) {
    return body
      .replace(/\{\{name\}\}/g, name || 'Influencer')
      .replace(/\{\{email\}\}/g, email || '')
      .replace(/\n/g, '<br/>')
  }

  async function handleSend() {
    if (!subject.trim()) { notify('Introdu subiectul emailului', false); return }
    if (!body.trim()) { notify('Introdu conținutul emailului', false); return }
    if (filtered.length === 0) { notify('Niciun destinatar selectat', false); return }
    if (!confirm(`Trimiți ${filtered.length} emailuri? Această acțiune nu poate fi anulată.`)) return

    setSending(true)
    setSent(null)

    let ok = 0
    let fail = 0

    // Trimitem în batch-uri de 10 ca să nu supraîncărcăm Resend
    const batchSize = 10
    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize)

      await Promise.all(batch.map(async (inf) => {
        try {
          const res = await fetch('/api/admin/email-blast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: inf.email,
              name: inf.name || 'Influencer',
              subject,
              body: renderBody(inf.name || 'Influencer', inf.email),
            }),
          })
          if (res.ok) ok++
          else fail++
        } catch {
          fail++
        }
      }))

      // Pauză între batch-uri
      if (i + batchSize < filtered.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    setSent({ ok, fail })
    setSending(false)
    notify(`✅ Trimis: ${ok} emailuri${fail > 0 ? ` · ❌ Eșuat: ${fail}` : ''}`, fail === 0)
  }

  const htmlPreview = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1.5px solid #f0f0f0">
      <div style="background:linear-gradient(135deg,#f97316,#ec4899);padding:24px;text-align:center">
        <span style="color:white;font-size:22px;font-weight:900">AddFame</span>
      </div>
      <div style="padding:32px">
        <p style="color:#111;line-height:1.7;font-size:15px">${renderBody(previewName, 'test@email.com')}</p>
      </div>
      <div style="background:#f9fafb;padding:16px;text-align:center">
        <p style="color:#9ca3af;font-size:12px">© AddFame · addfame.ro</p>
      </div>
    </div>
  `

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-500" /> Email Blast
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Trimite emailuri personalizate în masă</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizează
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Stânga: Filtre + Destinatari ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filtre */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-400" /> Filtrează destinatarii
            </h2>

            <div className="space-y-3">
              {/* Status */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Status</label>
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'Toți' },
                    { id: 'approved', label: 'Aprobați' },
                    { id: 'pending', label: 'În așteptare' },
                  ].map(s => (
                    <button key={s.id} onClick={() => setFilterStatus(s.id as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition ${filterStatus === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nișă */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Nișă</label>
                <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition">
                  <option value="">Toate nișele</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Platformă */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Platformă</label>
                <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition">
                  <option value="">Toate platformele</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Verified */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={filterVerified} onChange={e => setFilterVerified(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600" />
                <span className="text-sm font-bold text-gray-700">Doar Verified Creator ⭐</span>
              </label>

              {/* Search */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Caută după nume / email</label>
                <input value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                  placeholder="ex: maria sau @gmail"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
              </div>
            </div>
          </div>

          {/* Counter destinatari */}
          <div className={`rounded-2xl p-4 text-center ${filtered.length > 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
            <p className={`text-3xl font-black ${filtered.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>{filtered.length}</p>
            <p className="text-sm font-bold text-gray-500 mt-0.5">destinatari selectați</p>
            {filtered.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">din {influencers.length} total influenceri</p>
            )}
          </div>

          {/* Lista destinatari preview */}
          {filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 max-h-64 overflow-y-auto">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Primii {Math.min(filtered.length, 20)} destinatari</p>
              <div className="space-y-2">
                {filtered.slice(0, 20).map(inf => (
                  <div key={inf.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-black text-indigo-600">{inf.name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{inf.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{inf.email}</p>
                    </div>
                  </div>
                ))}
                {filtered.length > 20 && (
                  <p className="text-xs text-gray-400 text-center pt-1">+ {filtered.length - 20} alții</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Dreapta: Editor email ── */}
        <div className="lg:col-span-3 space-y-4">

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" /> Conținut email
            </h2>

            {/* Placeholder helper */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-black text-indigo-700 mb-1.5">Placeholder-uri disponibile:</p>
              <div className="flex flex-wrap gap-2">
                {['{{name}}', '{{email}}'].map(p => (
                  <button key={p} onClick={() => setBody(prev => prev + p)}
                    className="text-xs font-mono font-bold bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 transition">
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-indigo-500 mt-1.5">Click pe placeholder pentru a-l adăuga în text</p>
            </div>

            {/* Subiect */}
            <div className="mb-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Subiect *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="ex: Oportunitate nouă pe AddFame pentru tine, {{name}}!"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Mesaj *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                placeholder={`Bună {{name}},\n\nAm o oportunitate specială pentru tine pe AddFame...\n\nCu drag,\nEchipa AddFame`}
                rows={10}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition resize-none"
                style={{ fontFamily: 'inherit' }} />
            </div>

            {/* Preview toggle */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-100 transition">
                <Eye className="w-4 h-4" /> {showPreview ? 'Ascunde preview' : 'Previzualizează'}
              </button>
              {showPreview && (
                <input value={previewName} onChange={e => setPreviewName(e.target.value)}
                  placeholder="Nume test"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition" />
              )}
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="border-2 border-gray-100 rounded-2xl overflow-hidden mb-4">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-500">Subiect: <span className="text-gray-700">{subject.replace(/\{\{name\}\}/g, previewName)}</span></p>
                </div>
                <div className="p-4 bg-gray-50">
                  <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
                </div>
              </div>
            )}

            {/* Rezultat după trimitere */}
            {sent && (
              <div className={`rounded-2xl p-4 mb-4 ${sent.fail === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                <p className={`font-black text-sm ${sent.fail === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  ✅ Trimis cu succes: {sent.ok} emailuri
                  {sent.fail > 0 && ` · ❌ Eșuate: ${sent.fail}`}
                </p>
              </div>
            )}

            {/* Buton trimitere */}
            <button onClick={handleSend} disabled={sending || filtered.length === 0 || !subject || !body}
              className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              {sending
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Se trimite… ({filtered.length} emailuri)</>
                : <><Send className="w-5 h-5" /> Trimite {filtered.length} emailuri</>
              }
            </button>

            {filtered.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                Emailurile se trimit în batch-uri de 10 · poate dura câteva minute
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
