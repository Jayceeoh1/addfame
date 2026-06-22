'use client'
// @ts-nocheck
import { useState } from 'react'
import {
  Mail, Send, CheckCircle, AlertCircle, Plus, X,
  Upload, Loader2, Users, Trash2
} from 'lucide-react'

type Recipient = {
  id: string
  name: string
  email: string
  status: 'pending' | 'sent' | 'error'
  error?: string
}

const DEFAULT_SUBJECT = 'Te invit să te alături AddFame — platforma de influencer marketing din România'
const DEFAULT_BODY = `Bună {{name}},

Am descoperit profilul tău și cred că ai putea câștiga bani frumoși colaborând cu branduri românești prin AddFame.

AddFame este platforma care conectează influencerii cu branduri — simplu, transparent și cu plată garantată:
• Aplici la campanii potrivite nișei tale
• Brandul îți blochează banii în escrow înainte să postezi
• Primești plata garantat după ce postul e aprobat

Înregistrarea este gratuită și durează 3 minute.

Te așteptăm pe AddFame!
Cu drag,
Echipa AddFame`

export default function InviteInfluencersPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<{ ok: number; fail: number } | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Form pentru adăugare manuală
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // CSV paste
  const [csvText, setCsvText] = useState('')
  const [showCsvImport, setShowCsvImport] = useState(false)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  function addRecipient() {
    if (!newEmail.trim()) { notify('Introdu un email', false); return }
    if (!newEmail.includes('@')) { notify('Email invalid', false); return }
    if (recipients.find(r => r.email === newEmail.trim())) { notify('Email deja în listă', false); return }
    setRecipients(prev => [...prev, {
      id: Date.now().toString(),
      name: newName.trim() || newEmail.split('@')[0],
      email: newEmail.trim(),
      status: 'pending'
    }])
    setNewName('')
    setNewEmail('')
  }

  function removeRecipient(id: string) {
    setRecipients(prev => prev.filter(r => r.id !== id))
  }

  function importCSV() {
    const lines = csvText.trim().split('\n').filter(l => l.trim())
    let added = 0
    let skipped = 0

    for (const line of lines) {
      // Suportă: "Nume, email" sau "email" sau "email, Nume"
      const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
      let email = '', name = ''

      if (parts.length === 1) {
        email = parts[0]
        name = email.split('@')[0]
      } else {
        // Detectăm care e email-ul
        const emailPart = parts.find(p => p.includes('@'))
        const namePart = parts.find(p => !p.includes('@'))
        email = emailPart || ''
        name = namePart || email.split('@')[0]
      }

      if (!email || !email.includes('@')) { skipped++; continue }
      if (recipients.find(r => r.email === email)) { skipped++; continue }

      setRecipients(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        name,
        email,
        status: 'pending'
      }])
      added++
    }

    setCsvText('')
    setShowCsvImport(false)
    notify(`✅ ${added} emailuri adăugate${skipped > 0 ? ` · ${skipped} ignorate (duplicate/invalide)` : ''}`)
  }

  function clearAll() {
    if (!confirm('Ștergi toată lista?')) return
    setRecipients([])
    setSent(null)
  }

  function resetStatus() {
    setRecipients(prev => prev.map(r => ({ ...r, status: 'pending', error: undefined })))
    setSent(null)
  }

  async function handleSend() {
    const pending = recipients.filter(r => r.status === 'pending')
    if (!subject.trim()) { notify('Introdu subiectul', false); return }
    if (!body.trim()) { notify('Introdu mesajul', false); return }
    if (pending.length === 0) { notify('Niciun destinatar în așteptare', false); return }
    if (!confirm(`Trimiți ${pending.length} invitații? Această acțiune nu poate fi anulată.`)) return

    setSending(true)
    let ok = 0
    let fail = 0

    for (const r of pending) {
      try {
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, r.name)
          .replace(/\{\{email\}\}/g, r.email)
          .replace(/\n/g, '<br/>')

        const res = await fetch('/api/admin/email-blast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: r.email,
            name: r.name,
            subject: subject.replace(/\{\{name\}\}/g, r.name),
            body: personalizedBody,
          }),
        })

        if (res.ok) {
          ok++
          setRecipients(prev => prev.map(p => p.id === r.id ? { ...p, status: 'sent' } : p))
        } else {
          const data = await res.json()
          fail++
          setRecipients(prev => prev.map(p => p.id === r.id ? { ...p, status: 'error', error: data.error } : p))
        }
      } catch (e: any) {
        fail++
        setRecipients(prev => prev.map(p => p.id === r.id ? { ...p, status: 'error', error: e.message } : p))
      }

      // Mică pauză între emailuri
      await new Promise(r => setTimeout(r, 200))
    }

    setSent({ ok, fail })
    setSending(false)
    notify(`✅ Trimis: ${ok}${fail > 0 ? ` · ❌ Eșuat: ${fail}` : ''}`, fail === 0)
  }

  const pendingCount = recipients.filter(r => r.status === 'pending').length
  const sentCount = recipients.filter(r => r.status === 'sent').length
  const errorCount = recipients.filter(r => r.status === 'error').length

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
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" /> Invitații Influenceri Externi
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Invită influenceri care nu sunt încă pe platformă să se înregistreze</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Stânga: Lista destinatari ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Adaugă manual */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Adaugă destinatar
            </h2>
            <div className="space-y-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nume (ex: Maria Ionescu)"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition"
                onKeyDown={e => e.key === 'Enter' && addRecipient()}
              />
              <div className="flex gap-2">
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@exemplu.com"
                  type="email"
                  className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition"
                  onKeyDown={e => e.key === 'Enter' && addRecipient()}
                />
                <button onClick={addRecipient}
                  className="px-4 py-2.5 rounded-xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Import CSV */}
            <button onClick={() => setShowCsvImport(v => !v)}
              className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-indigo-600 transition py-2 border border-dashed border-gray-300 rounded-xl hover:border-indigo-300">
              <Upload className="w-3.5 h-3.5" /> Import CSV / listă
            </button>

            {showCsvImport && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">Format acceptat: <code className="bg-gray-100 px-1 rounded">Nume, email</code> sau <code className="bg-gray-100 px-1 rounded">email</code> — câte unul pe linie</p>

                {/* Upload fișier CSV */}
                <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-indigo-200 border-dashed rounded-xl cursor-pointer hover:bg-indigo-50 transition text-sm font-bold text-indigo-600">
                  <Upload className="w-4 h-4" /> Încarcă fișier .csv sau .txt
                  <input type="file" accept=".csv,.txt" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => setCsvText(ev.target?.result as string || '')
                      reader.readAsText(file)
                      e.target.value = ''
                    }} />
                </label>

                <p className="text-xs text-gray-400 text-center">— sau lipește direct —</p>

                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder={"Maria Ionescu, maria@gmail.com\nioana@yahoo.ro\nAlex Pop, alex@gmail.com"}
                  rows={5}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-indigo-400 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={importCSV} className="flex-1 py-2 rounded-xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition">
                    Importă
                  </button>
                  <button onClick={() => { setShowCsvImport(false); setCsvText('') }} className="px-4 py-2 rounded-xl font-bold text-sm border border-gray-200 hover:bg-gray-50 transition">
                    Anulează
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Counter */}
          {recipients.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xl font-black text-gray-700">{pendingCount}</p>
                  <p className="text-[10px] font-bold text-gray-400">În așteptare</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xl font-black text-green-600">{sentCount}</p>
                  <p className="text-[10px] font-bold text-gray-400">Trimise</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xl font-black text-red-500">{errorCount}</p>
                  <p className="text-[10px] font-bold text-gray-400">Eșuate</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {errorCount > 0 && (
                  <button onClick={resetStatus} className="flex-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 py-2 rounded-xl hover:bg-amber-100 transition">
                    Reîncearcă eșuatele
                  </button>
                )}
                <button onClick={clearAll} className="flex-1 text-xs font-bold text-red-500 bg-red-50 border border-red-200 py-2 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Șterge tot
                </button>
              </div>
            </div>
          )}

          {/* Lista destinatari */}
          {recipients.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4 max-h-96 overflow-y-auto">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                {recipients.length} destinatari
              </p>
              <div className="space-y-2">
                {recipients.map(r => (
                  <div key={r.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                    r.status === 'sent' ? 'bg-green-50 border-green-200' :
                    r.status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{r.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.email}</p>
                      {r.error && <p className="text-[10px] text-red-500 truncate">{r.error}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {r.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {r.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {r.status === 'pending' && (
                        <button onClick={() => removeRecipient(r.id)}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipients.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-400 text-sm">Niciun destinatar încă</p>
              <p className="text-xs text-gray-300 mt-1">Adaugă manual sau importă CSV</p>
            </div>
          )}
        </div>

        {/* ── Dreapta: Email template ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" /> Template invitație
            </h2>

            {/* Placeholder helper */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-black text-indigo-700 mb-1.5">Placeholder-uri:</p>
              <div className="flex gap-2 flex-wrap">
                {['{{name}}', '{{email}}'].map(p => (
                  <button key={p} onClick={() => setBody(prev => prev + p)}
                    className="text-xs font-mono font-bold bg-white text-indigo-600 border border-indigo-200 px-2 py-1 rounded-lg hover:bg-indigo-100 transition">
                    {p}
                  </button>
                ))}
                <a href="https://addfame.ro/auth/register" target="_blank" rel="noreferrer"
                  className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-lg">
                  Link înregistrare →
                </a>
              </div>
            </div>

            {/* Subiect */}
            <div className="mb-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Subiect *</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
            </div>

            {/* Body */}
            <div className="mb-5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-1.5">Mesaj *</label>
              <textarea value={body} onChange={e => setBody(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition resize-none"
                style={{ fontFamily: 'inherit' }} />
            </div>

            {/* Link înregistrare info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5">
              <p className="text-xs font-bold text-green-700">
                💡 Include linkul de înregistrare în mesaj:
                <span className="font-mono ml-1 bg-white px-2 py-0.5 rounded border border-green-200">https://addfame.ro/auth/register</span>
              </p>
            </div>

            {/* Rezultat */}
            {sent && (
              <div className={`rounded-2xl p-4 mb-4 ${sent.fail === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                <p className={`font-black text-sm ${sent.fail === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  ✅ Trimis: {sent.ok} invitații{sent.fail > 0 && ` · ❌ Eșuat: ${sent.fail}`}
                </p>
              </div>
            )}

            {/* Buton */}
            <button onClick={handleSend}
              disabled={sending || pendingCount === 0 || !subject || !body}
              className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
              {sending
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Se trimit invitațiile…</>
                : <><Send className="w-5 h-5" /> Trimite {pendingCount} invitații</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
