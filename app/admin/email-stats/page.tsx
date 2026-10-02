'use client'
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Eye, Clock, RefreshCw, CheckCircle, Search,
  TrendingUp, UserCheck, UserX, MessageSquare, Save, X, Send, Loader2
} from 'lucide-react'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

const STATUS_CFG = {
  registered: { label: '✅ Înregistrat', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  opened:     { label: '👁 Deschis',     bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200' },
  invited:    { label: '📧 Trimis',      bg: 'bg-gray-100', text: 'text-gray-500',  border: 'border-gray-200' },
}

function getStatus(item: any) {
  if (item.registered) return 'registered'
  if (item.clicked) return 'opened'
  return 'invited'
}

export default function EmailTrackingPage() {
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'registered' | 'opened' | 'invited'>('all')
  const [editNote, setEditNote] = useState<{ id: string; note: string } | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
  const [resendSubject, setResendSubject] = useState('Reminder: Te-am invitat pe AddFame 🚀')
  const [resendBody, setResendBody] = useState('Bună {{name}},\n\nTe-am contactat recent în legătură cu AddFame — platforma unde poți câștiga bani colaborând cu branduri românești.\n\nDacă nu ai avut timp atunci, înregistrarea durează doar 3 minute și este gratuită.\n\nTe așteptăm! 🎉\n\nEchipa AddFame')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [sendingFollowUp, setSendingFollowUp] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/email-tracking')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setEmails(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveNote(id: string, note: string) {
    setSavingNote(true)
    try {
      await fetch('/api/admin/email-tracking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: note }),
      })
      setEmails(prev => prev.map(e => e.id === id ? { ...e, notes: note } : e))
      setEditNote(null)
    } catch (e) { console.error(e) }
    finally { setSavingNote(false) }
  }

  const filtered = emails.filter(e => {
    const matchSearch = !search ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.name?.toLowerCase().includes(search.toLowerCase())
    const status = getStatus(e)
    const matchFilter = filter === 'all' ? true : status === filter
    return matchSearch && matchFilter
  })

  const totalSent = emails.length
  const totalClicked = emails.filter(e => e.clicked).length
  const totalRegistered = emails.filter(e => e.registered).length
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0
  const convRate = totalSent > 0 ? Math.round((totalRegistered / totalSent) * 100) : 0

  function exportCSV() {
    const rows = [['Nume', 'Email', 'Status', 'Trimis', 'Click', 'Înregistrat', 'Note']]
    filtered.forEach(e => {
      rows.push([e.name || '', e.email || '', getStatus(e),
        e.sent_at ? fmtDate(e.sent_at) : '', e.clicked_at ? fmtDate(e.clicked_at) : '',
        e.registered_at ? fmtDate(e.registered_at) : '', e.notes || ''])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `invitati-${filter}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  async function resendEmail(item: any) {
    setResending(item.id)
    try {
      const body = resendBody.replace(/\{\{name\}\}/g, item.name || 'Influencer').replace(/\n/g, '<br/>')
      await fetch('/api/admin/email-blast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: item.email, name: item.name, subject: resendSubject, body }),
      })
      await fetch('/api/admin/email-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, sent_at: new Date().toISOString() }),
      })
      setEmails(prev => prev.map(e => e.id === item.id ? { ...e, sent_at: new Date().toISOString() } : e))
    } catch (e) { console.error(e) }
    finally { setResending(null) }
  }

  async function sendFollowUpAll() {
    const targets = emails.filter(e => !e.registered && !e.clicked)
    if (!confirm(`Trimiți follow-up la ${targets.length} persoane fără acțiune?`)) return
    setSendingFollowUp(true)
    for (const item of targets) {
      const body = resendBody.replace(/\{\{name\}\}/g, item.name || 'Influencer').replace(/\n/g, '<br/>')
      await fetch('/api/admin/email-blast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: item.email, name: item.name, subject: resendSubject, body }),
      })
      await new Promise(r => setTimeout(r, 200))
    }
    setSendingFollowUp(false)
    alert(`✅ Follow-up trimis!`)
    load()
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" /> Tracking Invitații
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Urmărești cine a primit, deschis și s-a înregistrat</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizează
        </button>
        <button onClick={() => setShowFollowUp(v => !v)}
          className="flex items-center gap-2 text-sm font-bold text-orange-600 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl hover:bg-orange-100 transition">
          <Mail className="w-4 h-4" /> Follow-up ({emails.filter(e => !e.registered && !e.clicked).length})
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
          ⬇️ Export CSV
        </button>
      </div>

      {/* Panel Follow-up */}
      {showFollowUp && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-6">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-500" /> Follow-up pentru {emails.filter(e => !e.registered && !e.clicked).length} persoane fără acțiune
          </h2>
          <div className="space-y-3 mb-4">
            <input value={resendSubject} onChange={e => setResendSubject(e.target.value)}
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 bg-white"
              placeholder="Subiect follow-up" />
            <textarea value={resendBody} onChange={e => setResendBody(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 resize-none bg-white"
              style={{ fontFamily: 'inherit' }} />
          </div>
          <div className="flex gap-3">
            <button onClick={sendFollowUpAll} disabled={sendingFollowUp}
              className="flex-1 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              {sendingFollowUp
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se trimit…</>
                : <><Mail className="w-4 h-4" /> Trimite follow-up tuturor</>}
            </button>
            <button onClick={() => setShowFollowUp(false)}
              className="px-6 py-3 rounded-2xl font-bold text-sm border-2 border-orange-200 text-orange-700 hover:bg-orange-100 transition">
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{totalSent}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">📧 Trimise</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{totalClicked}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">🖱 Click-uri</p>
        </div>
        <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4 text-center">
          <p className="text-2xl font-black text-indigo-600">{clickRate}%</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Rată click</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-black text-green-600">{totalRegistered}</p>
          <p className="text-xs font-bold text-gray-400 mt-1">✅ Înregistrați</p>
        </div>
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-4 text-center">
          <p className="text-2xl font-black text-purple-600">{convRate}%</p>
          <p className="text-xs font-bold text-gray-400 mt-1">Rată conversie</p>
        </div>
      </div>

      {/* Funnel vizual */}
      {totalSent > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-black text-gray-900 mb-4">Funnel invitații</h2>
          <div className="space-y-3">
            {[
              { label: 'Emailuri trimise', value: totalSent, max: totalSent, color: '#6366f1', bg: '#eef2ff' },
              { label: 'Au dat click pe buton', value: totalClicked, max: totalSent, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'S-au înregistrat', value: totalRegistered, max: totalSent, color: '#22c55e', bg: '#f0fdf4' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-gray-700">{row.label}</span>
                  <span className="text-sm font-black text-gray-900">
                    {row.value}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      ({row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full rounded-full h-3" style={{ background: row.bg }}>
                  <div className="h-3 rounded-full transition-all"
                    style={{ width: `${row.max > 0 ? Math.round((row.value / row.max) * 100) : 0}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtre + Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Caută după nume sau email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: `Toți (${emails.length})` },
            { id: 'registered', label: `Înregistrați (${totalRegistered})` },
            { id: 'clicked', label: `Click (${totalClicked - totalRegistered})` },
            { id: 'invited', label: `Fără acțiune (${totalSent - totalClicked})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-black transition ${filter === f.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">Niciun contact găsit</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f5f5f5' }}>
                {['Nume', 'Email', 'Status', 'Trimis', 'Deschis', 'Înregistrat', 'Note', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const status = getStatus(item)
                const cfg = STATUS_CFG[status]
                return (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f9f9f9' : 'none' }}>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-sm text-gray-900">{item.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-500">{item.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs font-black px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-gray-400">{item.sent_at ? fmtDate(item.sent_at) : '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-gray-400">{item.clicked_at ? fmtDate(item.clicked_at) : '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.registered
                        ? <p className="text-xs text-green-600 font-bold">{item.registered_at ? fmtDate(item.registered_at) : '✅ Da'}</p>
                        : <p className="text-xs text-gray-300">—</p>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      {editNote?.id === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editNote.note}
                            onChange={e => setEditNote({ ...editNote, note: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(item.id, editNote.note); if (e.key === 'Escape') setEditNote(null) }}
                            className="flex-1 px-2 py-1 text-xs border-2 border-indigo-300 rounded-lg outline-none w-32"
                            placeholder="Notă..."
                          />
                          <button onClick={() => saveNote(item.id, editNote.note)} disabled={savingNote}
                            className="p-1 rounded-lg bg-green-100 hover:bg-green-200 transition">
                            <Save className="w-3.5 h-3.5 text-green-600" />
                          </button>
                          <button onClick={() => setEditNote(null)} className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
                            <X className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditNote({ id: item.id, note: item.notes || '' })}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition group">
                          <MessageSquare className="w-3.5 h-3.5 group-hover:text-indigo-500" />
                          <span className="max-w-24 truncate">{item.notes || 'Adaugă notă'}</span>
                        </button>
                      )}
                    </td>
                    {/* Retrimite */}
                    <td className="px-4 py-3.5">
                      {!item.registered && (
                        <button onClick={() => resendEmail(item)} disabled={resending === item.id}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl hover:bg-indigo-100 transition disabled:opacity-50">
                          {resending === item.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Send className="w-3 h-3" />}
                          Retrimite
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
