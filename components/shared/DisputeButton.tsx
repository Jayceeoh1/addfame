'use client'
// Litigiu pe o colaborare: deschidere, răspuns și starea deciziei. Același component pentru brand și creator.
import { useCallback, useEffect, useState } from 'react'
import { REASONS, USER_REASONS, RESOLUTIONS, type DisputeReason } from '@/lib/disputes'

type Role = 'brand' | 'influencer'
interface Dispute {
  id: string; opened_by_role: Role | 'system'; reason: DisputeReason; description: string
  status: 'awaiting_response' | 'under_review' | 'resolved'; respond_by: string | null
  response: string | null; resolution: keyof typeof RESOLUTIONS | null; resolution_note: string | null; created_at: string
}

const box: React.CSSProperties = { border: '1.5px solid #f3a867', background: '#fff1e6', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, color: '#14123a' }
const field: React.CSSProperties = { width: '100%', border: '1px solid #e5e3f3', borderRadius: 12, padding: 10, fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box', background: '#fff' }
const btn = (primary: boolean): React.CSSProperties => ({ height: 40, padding: '0 16px', borderRadius: 12, border: primary ? 0 : '1px solid #e5e3f3', background: primary ? '#5a35e6' : '#fff', color: primary ? '#fff' : '#14123a', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' })

export default function DisputeButton({ collabId, role }: { collabId: string; role: Role }) {
  const [d, setD] = useState<Dispute | null>(null)
  const [canOpen, setCanOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState(false)
  const [reason, setReason] = useState<DisputeReason>('no_post')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/disputes?collabId=${collabId}`, { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) { setD(j.dispute); setCanOpen(!!j.canOpen) }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [collabId])
  useEffect(() => { load() }, [load])

  async function send(url: string, body: object) {
    setBusy(true); setErr('')
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(j.error || 'Nu am putut trimite.'); return }
      setForm(false); setText(''); await load()
    } finally { setBusy(false) }
  }

  if (!loaded) return null
  const fmt = (iso: string) => new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  // ── Există un litigiu ──
  if (d && d.status !== 'resolved') {
    const mustRespond = d.status === 'awaiting_response' && d.opened_by_role !== role
    return (
      <div style={box}>
        <b style={{ fontSize: 15 }}>Litigiu deschis · {REASONS[d.reason]}</b>
        <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
          <b>{d.opened_by_role === 'system' ? 'Deschis automat' : d.opened_by_role === role ? 'Ai scris tu' : 'A scris cealaltă parte'}:</b> „{d.description}”
        </div>
        {d.response && <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}><b>Răspuns:</b> „{d.response}”</div>}
        {d.status === 'under_review' && <div style={{ fontSize: 13 }}>Echipa AddFame analizează cazul și revine cu o decizie.</div>}
        {d.status === 'awaiting_response' && !mustRespond && d.respond_by && <div style={{ fontSize: 13 }}>Cealaltă parte poate răspunde până pe {fmt(d.respond_by)}.</div>}
        {mustRespond && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Poți răspunde până pe {d.respond_by ? fmt(d.respond_by) : '—'}</div>
            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Povestea ta, pe scurt" style={{ ...field, height: 80, resize: 'none' }} />
            <button type="button" style={{ ...btn(true), opacity: busy || !text.trim() ? .5 : 1 }} disabled={busy || !text.trim()} onClick={() => send('/api/disputes/respond', { id: d.id, response: text })}>Trimite răspunsul</button>
          </>
        )}
        {err && <div role="alert" style={{ color: '#b42318', fontSize: 13, fontWeight: 600 }}>{err}</div>}
      </div>
    )
  }

  // ── Decizie luată (ultimul litigiu) ──
  if (d && d.status === 'resolved') {
    return (
      <div style={{ ...box, background: '#efeaff', borderColor: '#cdb8ff' }}>
        <b style={{ fontSize: 15 }}>Litigiu rezolvat · {d.resolution ? RESOLUTIONS[d.resolution] : ''}</b>
        {d.resolution_note && <div style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{d.resolution_note}</div>}
      </div>
    )
  }

  if (!canOpen) return null

  // ── Deschidere ──
  if (!form) {
    return <button type="button" onClick={() => setForm(true)} style={{ ...btn(false), alignSelf: 'flex-start', height: 36, fontSize: 13, color: '#9a4206' }}>Deschide un litigiu</button>
  }
  return (
    <div style={box}>
      <b style={{ fontSize: 15 }}>Deschide un litigiu</b>
      <div style={{ fontSize: 12, color: '#6a6690' }}>Cealaltă parte are 72 de ore să răspundă, apoi echipa AddFame decide. Încearcă întâi să vă înțelegeți în mesaje.</div>
      <select value={reason} onChange={e => setReason(e.target.value as DisputeReason)} style={field}>
        {USER_REASONS.map(r => <option key={r} value={r}>{REASONS[r]}</option>)}
      </select>
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Descrie ce s-a întâmplat (minimum 10 caractere)" style={{ ...field, height: 90, resize: 'none' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={{ ...btn(false), flex: 1 }} onClick={() => { setForm(false); setErr('') }}>Anulează</button>
        <button type="button" style={{ ...btn(true), flex: 1.4, opacity: busy || text.trim().length < 10 ? .5 : 1 }} disabled={busy || text.trim().length < 10} onClick={() => send('/api/disputes', { collabId, reason, description: text })}>Trimite litigiul</button>
      </div>
      {err && <div role="alert" style={{ color: '#b42318', fontSize: 13, fontWeight: 600 }}>{err}</div>}
    </div>
  )
}
