'use client'
// Admin → Academie → Academy Members: cine a plătit, până când are acces, plățile și facturile SmartBill; acces gratuit manual.
import { Fragment, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Download } from 'lucide-react'
import { adminAcademyMembers, adminGrantAcademy, adminRevokeAcademy, adminFindInfluencerByEmail, adminGetAcademyCommunity, adminSetAcademyCommunity, type AdminAcademyMember } from '@/app/actions/academy-member'

const fmtD = (d: string | null) => d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const lei = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} lei`
const STATUS: Record<AdminAcademyMember['status'], { label: string; bg: string; fg: string; hint: string }> = {
  activ: { label: 'Activ', bg: '#dcf5ec', fg: '#14532d', hint: 'Plătește lunar, se reînnoiește automat' },
  se_opreste: { label: 'Se oprește', bg: '#fff4d6', fg: '#7a5200', hint: 'A anulat; are acces până la data afișată' },
  plata_esuata: { label: 'Plată eșuată', bg: '#fde2e1', fg: '#9b1c1c', hint: 'Stripe reîncearcă plata câteva zile' },
  manual: { label: 'Gratuit (manual)', bg: '#efeaff', fg: '#4423c4', hint: 'Acces dat din admin, fără plată' },
  anulat: { label: 'Anulat', bg: '#f1f0f8', fg: '#4a4770', hint: 'Abonamentul s-a încheiat' },
  expirat: { label: 'Expirat', bg: '#f1f0f8', fg: '#4a4770', hint: 'Bifa veche a expirat' },
}

export default function AcademyMembers() {
  const [rows, setRows] = useState<AdminAcademyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'active' | 'all' | 'remove'>('active')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [grantFor, setGrantFor] = useState('')
  const [grantMonths, setGrantMonths] = useState(1)

  async function load() {
    setLoading(true); setErr('')
    const r: any = await adminAcademyMembers().catch(() => ({ error: 'Nu am putut încărca membrii.' }))
    setLoading(false)
    if (r.error) { setErr(r.error); return }
    setRows(r.members)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter(r => (filter === 'all' || (filter === 'remove' ? !r.active && r.status !== 'plata_esuata' : r.active || r.status === 'plata_esuata'))
      && (!t || [r.name, r.email, r.instagram].some(v => String(v || '').toLowerCase().includes(t))))
  }, [rows, q, filter])

  const active = rows.filter(r => r.active)
  const paying = rows.filter(r => r.status === 'activ').length
  const total = rows.reduce((s, r) => s + r.totalPaid, 0)
  const failed = rows.filter(r => r.status === 'plata_esuata').length

  async function grant(id: string, months: number) {
    setBusy(id); setNote('')
    const r: any = await adminGrantAcademy(id, months)
    setBusy(null)
    if (r.error) { setNote('⚠️ ' + r.error); return }
    setNote(`Acces dat până pe ${fmtD(r.until)}.`); setGrantFor(''); load()
  }
  async function revoke(id: string) {
    setBusy(id); setNote('')
    const r: any = await adminRevokeAcademy(id)
    setBusy(null)
    if (r.error) { setNote('⚠️ ' + r.error); return }
    setNote('Accesul a fost oprit.'); load()
  }

  function csv() {
    const head = ['Nume', 'Email', 'Instagram', 'Status', 'Acces până pe', 'Membru din', 'Plăți', 'Total plătit (lei)', 'Ultima plată']
    const lines = shown.map(r => [r.name, r.email, r.instagram, STATUS[r.status].label, fmtD(r.until), fmtD(r.since), r.payments, r.totalPaid, fmtD(r.lastPaymentAt)])
    const txt = [head, ...lines].map(l => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }))
    a.download = 'academy-members.csv'; a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        .am-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
        .am-stat{background:#fff;border:1px solid #e8e5f3;border-radius:16px;padding:12px 14px}
        .am-stat b{display:block;font-size:22px;font-variant-numeric:tabular-nums}.am-stat span{font-size:12px;color:#5a5780;font-weight:700}
        .am-tbl{width:100%;border-collapse:collapse;font-size:13.5px;min-width:820px}
        .am-tbl th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6b6890;padding:10px;border-bottom:1px solid #eee}
        .am-tbl td{padding:10px;border-bottom:1px solid #f3f1f9;vertical-align:top;font-variant-numeric:tabular-nums}
        .am-chip{font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;white-space:nowrap}
      `}</style>

      <div className="am-stats">
        <div className="am-stat"><b>{active.length}</b><span>Academy Members acum</span></div>
        <div className="am-stat"><b>{paying}</b><span>plătesc lunar (abonament activ)</span></div>
        <div className="am-stat"><b>{lei(total)}</b><span>încasat total din abonamente</span></div>
        <div className="am-stat" style={failed ? { borderColor: '#f5b5b1' } : undefined}><b style={failed ? { color: '#9b1c1c' } : undefined}>{failed}</b><span>plăți eșuate</span></div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: '#8a87a8' }} />
          <input className="aa-in" style={{ paddingLeft: 34 }} placeholder="Caută nume, email, Instagram" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="aa-in" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option value="active">Doar cu acces acum</option>
          <option value="all">Toți (și foști membri)</option>
          <option value="remove">De scos din grupul WhatsApp</option>
        </select>
        <button className="aa-b" onClick={load} disabled={loading}><RefreshCw size={14} /> Reîncarcă</button>
        <button className="aa-b" onClick={csv} disabled={!shown.length}><Download size={14} /> CSV</button>
      </div>

      <CommunityLink />

      <div className="bg-white border rounded-2xl" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="aa-l" style={{ flex: '1 1 260px' }}>Acces gratuit pentru un creator (email exact)
          <input className="aa-in" value={grantFor} onChange={e => setGrantFor(e.target.value)} placeholder="email@exemplu.ro" />
        </label>
        <label className="aa-l">Luni
          <select className="aa-in" style={{ width: 90 }} value={grantMonths} onChange={e => setGrantMonths(Number(e.target.value))}>
            {[1, 2, 3, 6, 12].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <GrantByEmail email={grantFor} months={grantMonths} onGrant={grant} disabled={!!busy} />
      </div>

      {note && <div className="bg-white border rounded-xl p-3 text-sm font-semibold">{note}</div>}
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold">{err}</div>}

      <div className="bg-white border rounded-2xl" style={{ overflowX: 'auto' }}>
        <table className="am-tbl">
          <thead><tr><th>Creator</th><th>Status</th><th>Acces până pe</th><th>Membru din</th><th>Plăți</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {loading && !rows.length && <tr><td colSpan={7}>Se încarcă…</td></tr>}
            {!loading && !shown.length && <tr><td colSpan={7} style={{ color: '#5a5780' }}>{rows.length ? 'Niciun rezultat.' : 'Încă nu s-a abonat nimeni.'}</td></tr>}
            {shown.map(r => {
              const s = STATUS[r.status]
              return (<Fragment key={r.id}>
                <tr>
                  <td><b>{r.name || '—'}</b><div style={{ fontSize: 12, color: '#5a5780' }}>{r.phone ? `${r.phone} · ` : ''}{r.email}{r.instagram ? ` · @${String(r.instagram).replace(/^@/, '')}` : ''}</div></td>
                  <td><span className="am-chip" title={s.hint} style={{ background: s.bg, color: s.fg }}>{s.label}</span></td>
                  <td>{fmtD(r.until)}</td>
                  <td>{fmtD(r.since)}</td>
                  <td>{r.payments}</td>
                  <td>{lei(r.totalPaid)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {r.payments > 0 && <button className="aa-b" style={{ height: 32 }} onClick={() => setOpen(open === r.id ? null : r.id)}>Plăți</button>}{' '}
                    <button className="aa-b" style={{ height: 32 }} disabled={busy === r.id} onClick={() => grant(r.id, 1)} title="Prelungește gratuit cu o lună">+1 lună</button>{' '}
                    {r.active && !r.hasSubscription && <button className="aa-b r" style={{ height: 32 }} disabled={busy === r.id} onClick={() => revoke(r.id)}>Oprește</button>}
                  </td>
                </tr>
                {open === r.id && (
                  <tr><td colSpan={7} style={{ background: '#faf8ff' }}>
                    {r.invoices.map((x, k) => (
                      <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13, padding: '3px 0', flexWrap: 'wrap' }}>
                        <span style={{ width: 110 }}>{fmtD(x.at)}</span><b style={{ width: 80 }}>{lei(x.amount)}</b>
                        <span style={{ color: x.error ? '#9b1c1c' : '#14532d' }}>{x.number ? `Factura ${x.number}` : x.error || 'Factură în curs'}</span>
                      </div>
                    ))}
                  </td></tr>
                )}
              </Fragment>)
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, color: '#5a5780', margin: 0 }}>
        Plata și reînnoirea vin automat din Stripe; la fiecare plată se emite factura SmartBill. „+1 lună” dă acces gratuit (fără plată și fără factură). Un abonament plătit se anulează din Stripe sau de către creator.
      </p>
    </div>
  )
}

/** Caută creatorul după email printre toți influencerii, apoi dă acces. */
function GrantByEmail({ email, months, onGrant, disabled }: { email: string; months: number; onGrant: (id: string, m: number) => void; disabled: boolean }) {
  const [msg, setMsg] = useState('')
  async function go() {
    setMsg('')
    const r: any = await adminFindInfluencerByEmail(email)
    if (r.error) { setMsg(r.error); return }
    onGrant(r.id, months)
  }
  return (<>
    <button className="aa-b p" onClick={go} disabled={disabled || !email.includes('@')}>Dă acces</button>
    {msg && <span style={{ fontSize: 13, color: '#9b1c1c', fontWeight: 700 }}>{msg}</span>}
  </>)
}

/** Linkul grupului privat: îl văd doar membrii activi, în Academie. */
function CommunityLink() {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { adminGetAcademyCommunity().then((r: any) => { if (r.success) { setUrl(r.url || ''); setSaved(r.url || '') } }).catch(() => {}) }, [])
  async function save() {
    setBusy(true); setMsg(null)
    const r: any = await adminSetAcademyCommunity(url).catch(() => ({ error: 'Nu am putut salva.' }))
    setBusy(false)
    if (r.error) { setMsg({ ok: false, t: r.error }); return }
    setSaved(r.url || ''); setMsg({ ok: true, t: r.url ? 'Salvat. Membrii activi văd butonul „Intră în grup” în Academie.' : 'Linkul a fost scos.' })
  }
  return (
    <div className="bg-white border rounded-2xl" style={{ padding: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <label className="aa-l" style={{ flex: '1 1 320px' }}>💬 Linkul grupului privat (îl văd doar membrii activi)
        <input className="aa-in" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
      </label>
      <button className="aa-b p" onClick={save} disabled={busy || url.trim() === (saved || '')}>{busy ? 'Se salvează…' : 'Salvează linkul'}</button>
      {msg && <span style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? '#14532d' : '#9b1c1c', flexBasis: '100%' }}>{msg.t}</span>}
      <span style={{ fontSize: 12, color: '#5a5780', flexBasis: '100%' }}>Dacă linkul scapă: în WhatsApp → Invite via link → Reset link, apoi pune aici linkul nou.</span>
    </div>
  )
}
