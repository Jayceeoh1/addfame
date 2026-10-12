'use client'

// Mesaje din chat care par să mute discuția sau plata în afara AddFame (telefon, email, WhatsApp, „în privat”…).
// Regula: discuțiile în afara platformei se sancționează cu excluderea definitivă.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, CheckCircle2, RefreshCw, Ban, RotateCcw } from 'lucide-react'

type Flag = {
  id: string; collaboration_id: string | null; sender_id: string; sender_role: string; content: string
  reasons: string[]; reviewed: boolean; created_at: string
  sender: { name: string; email: string | null; kind: 'influencer' | 'brand'; profileId: string } | null
  sender_flags: number; sender_banned: boolean; campaign: string | null; partner: string | null
}

const REASON: Record<string, string> = {
  telefon: 'Telefon', email: 'Email', aplicatie: 'Aplicație externă', privat: 'În privat', plata: 'Plată în afara platformei',
}

const fmt = (iso: string) => new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function MesajeSemnalatePage() {
  const [rows, setRows] = useState<Flag[]>([])
  const [reviewed, setReviewed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [confirmBan, setConfirmBan] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`/api/admin/message-flags?reviewed=${reviewed ? 1 : 0}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setRows(j.flags)
    } catch (e: any) { setErr(e.message) }
    finally { setLoading(false) }
  }, [reviewed])

  useEffect(() => { load() }, [load])

  async function act(body: any, key: string) {
    setBusy(key); setErr(null)
    try {
      const r = await fetch('/api/admin/message-flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setConfirmBan(null)
      await load()
    } catch (e: any) { setErr(e.message) }
    finally { setBusy(null) }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <ShieldAlert size={22} color="#c0392b" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Mesaje semnalate</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setReviewed(false)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${!reviewed ? 'bg-gray-900 text-white' : 'bg-white'}`}>De verificat</button>
          <button onClick={() => setReviewed(true)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${reviewed ? 'bg-gray-900 text-white' : 'bg-white'}`}>Verificate</button>
          <button onClick={load} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
        </div>
      </div>
      <p style={{ color: '#6a6690', fontSize: 13, marginTop: 0 }}>
        Mesaje din chat care par să conțină telefon, email, WhatsApp/Telegram, „în privat” sau plată directă.
        Mesajele se trimit normal; aici decizi dacă e o încălcare. Excluderea blochează autentificarea contului (se poate anula).
      </p>

      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err} {/relation|does not exist/.test(err) && '— rulează SQL-ul 30 din supabase/security.'}</div>}

      {loading ? <p>Se încarcă…</p> : rows.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center">
          <CheckCircle2 size={28} color="#1f9d6b" style={{ margin: '0 auto 6px' }} />
          <b>{reviewed ? 'Niciun mesaj verificat' : 'Niciun mesaj de verificat'}</b>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(r => {
            const s = r.sender
            const profile = s ? (s.kind === 'influencer' ? `/admin/influencers/${s.profileId}` : '/admin/brands') : null
            return (
              <div key={r.id} className="bg-white border rounded-2xl p-4" style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: r.sender_role === 'brand' ? '#e6f0ff' : '#efeaff', color: r.sender_role === 'brand' ? '#1d4fb8' : '#4423c4' }}>
                    {r.sender_role === 'brand' ? 'Brand' : 'Influencer'}
                  </span>
                  {profile ? <Link href={profile} className="font-bold hover:underline">{s?.name}</Link> : <b>Cont necunoscut</b>}
                  {s?.email && <span style={{ fontSize: 12, color: '#6a6690' }}>{s.email}</span>}
                  {r.sender_flags > 1 && <span style={{ fontSize: 11, fontWeight: 800, color: '#9b1c1c' }}>{r.sender_flags} semnalări</span>}
                  {r.sender_banned && <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: '#fde8e8', color: '#9b1c1c' }}>Exclus</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6a6690' }}>{fmt(r.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6a6690' }}>
                  {r.campaign ? <>Campania <b style={{ color: '#14123a' }}>{r.campaign}</b></> : 'Campanie necunoscută'}
                  {r.partner ? <> · către <b style={{ color: '#14123a' }}>{r.partner}</b></> : null}
                </div>
                <blockquote style={{ margin: 0, background: '#f6f6fc', borderRadius: 12, padding: '10px 12px', fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {r.content}
                </blockquote>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {r.reasons.map(x => (
                    <span key={x} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: '#fff1c2', color: '#854d0e' }}>{REASON[x] || x}</span>
                  ))}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button disabled={busy === r.id} onClick={() => act({ id: r.id, action: r.reviewed ? 'reopen' : 'review' }, r.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white">
                      {r.reviewed ? 'Redeschide' : 'Marchează verificat (fără sancțiune)'}
                    </button>
                    {r.sender_banned ? (
                      <button disabled={busy === r.sender_id} onClick={() => act({ userId: r.sender_id, action: 'unban' }, r.sender_id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white flex items-center gap-1"><RotateCcw size={13} /> Reactivează contul</button>
                    ) : confirmBan === r.id ? (
                      <>
                        <button disabled={busy === r.sender_id} onClick={() => act({ userId: r.sender_id, action: 'ban' }, r.sender_id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1" style={{ background: '#b42318' }}>
                          <Ban size={13} /> Confirm: exclude {s?.name || 'contul'}
                        </button>
                        <button onClick={() => setConfirmBan(null)} className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white">Anulează</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmBan(r.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1" style={{ borderColor: '#f3b4ac', color: '#b42318', background: '#fff' }}>
                        <Ban size={13} /> Exclude din platformă
                      </button>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
