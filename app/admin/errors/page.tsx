'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

type Row = {
  id: string; source: string; message: string; stack: string | null; url: string | null
  user_id: string | null; context: any; count: number; first_seen: string; last_seen: string; resolved: boolean
}

const SRC: Record<string, { label: string; bg: string; fg: string }> = {
  server: { label: 'Server', bg: '#fde8e8', fg: '#9b1c1c' },
  client: { label: 'Browser', bg: '#e8f0ff', fg: '#1d4ed8' },
  action: { label: 'Acțiune', bg: '#fff1c2', fg: '#854d0e' },
  cron: { label: 'Cron', bg: '#efeaff', fg: '#4423c4' },
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'acum'
  if (m < 60) return `acum ${m} min`
  if (m < 1440) return `acum ${Math.round(m / 60)} h`
  return `acum ${Math.round(m / 1440)} zile`
}

export default function ErrorsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`/api/admin/errors?resolved=${resolved ? 1 : 0}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setRows(j.errors)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [resolved])

  useEffect(() => { load() }, [load])

  const toggle = async (row: Row) => {
    await fetch('/api/admin/errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, resolved: !row.resolved }) })
    setRows(rs => rs.filter(x => x.id !== row.id))
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <AlertTriangle size={22} color="#d97a1c" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Erori aplicație</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setResolved(false)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${!resolved ? 'bg-gray-900 text-white' : 'bg-white'}`}>Deschise</button>
          <button onClick={() => setResolved(true)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${resolved ? 'bg-gray-900 text-white' : 'bg-white'}`}>Rezolvate</button>
          <button onClick={load} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
        </div>
      </div>
      <p style={{ color: '#6a6690', fontSize: 13, marginTop: 0 }}>
        Aceeași eroare apare o singură dată, cu un contor. Dacă o eroare rezolvată reapare, se redeschide automat.
      </p>

      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err} {/relation|does not exist/.test(err) && '— rulează SQL-ul 20 din supabase/security.'}</div>}
      {loading ? <p>Se încarcă…</p> : rows.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center">
          <CheckCircle2 size={28} color="#1f9d6b" style={{ margin: '0 auto 6px' }} />
          <b>{resolved ? 'Nicio eroare rezolvată' : 'Nicio eroare deschisă'}</b>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(r => {
            const s = SRC[r.source] ?? SRC.server
            const isOpen = open === r.id
            return (
              <div key={r.id} className="bg-white border rounded-2xl p-4">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, flexShrink: 0 }}>{s.label}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, wordBreak: 'break-word' }}>{r.message}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6a6690' }}>
                      {r.url || '—'} · <b>{r.count}×</b> · ultima oară {ago(r.last_seen)} · prima oară {ago(r.first_seen)}
                    </p>
                  </div>
                  <button onClick={() => setOpen(isOpen ? null : r.id)} aria-label="Detalii" className="p-1">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                  <button onClick={() => toggle(r)} className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white whitespace-nowrap">{r.resolved ? 'Redeschide' : 'Marchează rezolvat'}</button>
                </div>
                {isOpen && (
                  <pre style={{ marginTop: 10, background: '#f6f6fc', borderRadius: 12, padding: 12, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {r.stack || 'Fără stack'}{r.context ? '\n\nContext: ' + JSON.stringify(r.context, null, 2) : ''}{r.user_id ? '\n\nUser: ' + r.user_id : ''}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
