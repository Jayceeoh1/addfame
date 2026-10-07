'use client'

import { useCallback, useEffect, useState } from 'react'
import { Scale, RefreshCw } from 'lucide-react'
import { REASONS, RESOLUTIONS, type Resolution } from '@/lib/disputes'

const STATUS: Record<string, { t: string; bg: string; fg: string }> = {
  awaiting_response: { t: 'Așteaptă răspuns', bg: '#fff1c2', fg: '#854d0e' },
  under_review: { t: 'De decis', bg: '#fde8e8', fg: '#9b1c1c' },
  resolved: { t: 'Rezolvat', bg: '#dcf5ec', fg: '#14532d' },
}
const WHO: Record<string, string> = { brand: 'Brand', influencer: 'Creator', system: 'Sistem' }
const fmt = (iso: string) => new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function DisputesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState<Record<string, Resolution>>({})
  const [note, setNote] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/disputes?resolved=${resolved ? 1 : 0}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setRows(j.disputes)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [resolved])
  useEffect(() => { load() }, [load])

  async function decide(id: string) {
    setBusy(id); setErr('')
    try {
      const r = await fetch('/api/admin/disputes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, resolution: pick[id], note: note[id] }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Eroare'); return }
      setRows(rs => rs.filter(x => x.id !== id))
    } finally { setBusy(null) }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <Scale size={22} color="#5a35e6" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Litigii</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setResolved(false)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${!resolved ? 'bg-gray-900 text-white' : 'bg-white'}`}>Active</button>
          <button onClick={() => setResolved(true)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${resolved ? 'bg-gray-900 text-white' : 'bg-white'}`}>Rezolvate</button>
          <button onClick={load} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
        </div>
      </div>
      <p style={{ color: '#6a6690', fontSize: 13, marginTop: 0 }}>Decizia se înregistrează și ambele părți sunt anunțate. Plata nu se mută automat: o gestionezi din Plăți / Colaborări.</p>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err} {/relation|does not exist/.test(err) && '— rulează SQL-ul 23 din supabase/security.'}</div>}

      {loading ? <p>Se încarcă…</p> : rows.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center"><b>{resolved ? 'Niciun litigiu rezolvat' : 'Niciun litigiu activ'}</b></div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map(d => {
            const s = STATUS[d.status]; const camp = d.collaborations?.campaigns
            return (
              <div key={d.id} className="bg-white border rounded-2xl p-4" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99 }}>{s.t}</span>
                  <b>{camp?.title || 'Campanie'}</b>
                  <span style={{ color: '#6a6690', fontSize: 13 }}>{camp?.brand_name} ↔ {d.collaborations?.influencers?.name} · {d.collaborations?.payment_amount ?? 0} RON</span>
                  <span style={{ marginLeft: 'auto', color: '#6a6690', fontSize: 12 }}>{fmt(d.created_at)}</span>
                </div>
                <div style={{ fontSize: 13 }}><b>{REASONS[d.reason as keyof typeof REASONS]}</b> · deschis de {WHO[d.opened_by_role]}</div>
                <div style={{ fontSize: 14, background: '#f6f6fc', borderRadius: 12, padding: 10, overflowWrap: 'anywhere' }}>{d.description}</div>
                {d.response && <div style={{ fontSize: 14, background: '#f6f6fc', borderRadius: 12, padding: 10, overflowWrap: 'anywhere' }}><b>Răspuns:</b> {d.response}</div>}
                {d.status === 'awaiting_response' && d.respond_by && <div style={{ fontSize: 12, color: '#854d0e' }}>Termen de răspuns: {fmt(d.respond_by)}</div>}

                {d.status !== 'resolved' ? (
                  <div style={{ display: 'grid', gap: 8, borderTop: '1px solid #e5e3f3', paddingTop: 10 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(Object.keys(RESOLUTIONS) as Resolution[]).map(k => (
                        <button key={k} onClick={() => setPick(p => ({ ...p, [d.id]: k }))}
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${pick[d.id] === k ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{RESOLUTIONS[k]}</button>
                      ))}
                    </div>
                    <textarea value={note[d.id] || ''} onChange={e => setNote(n => ({ ...n, [d.id]: e.target.value }))} maxLength={2000} placeholder="Motivarea deciziei (o văd ambele părți)"
                      style={{ border: '1px solid #e5e3f3', borderRadius: 12, padding: 10, height: 70, fontFamily: 'inherit', fontSize: 14, resize: 'none' }} />
                    <button disabled={!pick[d.id] || (note[d.id] || '').trim().length < 5 || busy === d.id} onClick={() => decide(d.id)}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-900 text-white disabled:opacity-40" style={{ justifySelf: 'start' }}>Înregistrează decizia</button>
                  </div>
                ) : (
                  <div style={{ fontSize: 13 }}><b>{RESOLUTIONS[d.resolution as Resolution]}</b> — {d.resolution_note}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
