'use client'
// Admin → Academie → Creatori: cine a început și cine a terminat, scorul din prima încercare, nivelul, codul și resetarea.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, Download, RotateCcw } from 'lucide-react'
import { adminAcademyPeople, adminResetAcademy } from '@/app/actions/academy'
import { TIERS, isTier } from '@/lib/academy'

type P = {
  id: string; name: string; email: string | null; phone: string | null; slug: string; instagram: string | null
  certifiedAt: string | null; tier: string | null; code: string | null; attempts: number; passed: number; lessons: number
  first: number; firstTotal: number; best: number; total: number; points: number; lessonTitles: string[]; last: string | null
}
const fmt = (d: string | null) => d ? new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AcademyPeople({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<P[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'cert' | 'progress'>('all')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function load() {
    setLoading(true); setErr('')
    const r: any = await adminAcademyPeople()
    setLoading(false)
    if (r?.error) { setErr(r.error); return }
    setRows(r.people)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter(r => (filter === 'all' || (filter === 'cert' ? !!r.certifiedAt : !r.certifiedAt))
      && (!t || [r.name, r.email, r.instagram, r.code].some(v => String(v || '').toLowerCase().includes(t))))
  }, [rows, q, filter])
  const cert = rows.filter(r => r.certifiedAt).length

  async function reset(p: P) {
    const r: any = await adminResetAcademy(p.id)
    setConfirm(null)
    if (r?.error) { setNote('⚠️ ' + r.error); return }
    setNote(`${p.name}: Academia resetată${r.minus ? `, i-am scăzut ${r.minus} puncte` : ''}. Poate da testul din nou.`)
    await load(); onChange?.()
  }

  function csv() {
    const head = ['Nume', 'Email', 'Telefon', 'Instagram', 'Status', 'Nivel', 'Scor prima încercare', 'Cel mai bun scor', 'Încercări', 'Puncte', 'Cod certificat', 'Certificat la', 'Ultima activitate']
    const lines = shown.map(r => [r.name, r.email, r.phone, r.instagram ? '@' + r.instagram : '', r.certifiedAt ? 'Certificat' : r.passed ? 'Trecut' : r.attempts ? 'A dat testul' : 'A început',
      r.tier && isTier(r.tier) ? TIERS[r.tier].label : '', r.firstTotal ? `${r.first}/${r.firstTotal}` : '', r.total ? `${r.best}/${r.total}` : '', r.attempts, r.points, r.code || '', r.certifiedAt || '', r.last || ''])
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const blob = new Blob(['﻿' + [head, ...lines].map(l => l.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'academie-creatori.csv'; a.click()
  }

  const btn = (on: boolean) => `px-3 py-1.5 rounded-xl text-sm font-bold border ${on ? 'bg-[#14123a] text-white border-[#14123a]' : 'bg-white'}`

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button className={btn(filter === 'all')} onClick={() => setFilter('all')}>Toți · {rows.length}</button>
        <button className={btn(filter === 'cert')} onClick={() => setFilter('cert')}>Certificați · {cert}</button>
        <button className={btn(filter === 'progress')} onClick={() => setFilter('progress')}>În curs · {rows.length - cert}</button>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e4f0', borderRadius: 12, padding: '0 10px', background: '#fff' }}>
          <Search size={14} color="#6a6690" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nume, email, @instagram, cod…" style={{ height: 34, border: 0, outline: 0, fontSize: 13, minWidth: 180, background: 'transparent' }} />
        </label>
        <button onClick={csv} disabled={!shown.length} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1 disabled:opacity-50"><Download size={14} /> CSV</button>
        <button onClick={load} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
      </div>
      {note && <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10, color: note.startsWith('⚠️') ? '#9b1c1c' : '#14532d' }}>{note}</div>}
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err}</div>}

      {loading ? <p>Se încarcă…</p> : shown.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center"><b>Nimeni încă{filter !== 'all' || q ? ' pentru filtrele alese' : ''}</b></div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {shown.map(r => {
            const t = r.tier && isTier(r.tier) ? TIERS[r.tier] : null
            const status = r.certifiedAt ? null : r.passed ? 'Trecut' : r.attempts ? 'A dat testul, n-a trecut' : 'A început lecția'
            return (
              <div key={r.id} className="bg-white border rounded-2xl p-4" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link href={`/admin/influencers/${r.id}`} target="_blank" style={{ fontWeight: 800, color: '#14123a' }}>{r.name}</Link>
                    {t ? <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: t.bg, color: t.fg }}>Certificat {t.label}</span>
                      : <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: '#f1f0f8', color: '#4a4770' }}>{status}</span>}
                    {r.code && <a href={`/certificat/${r.code}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#5b2fd0' }}>{r.code}</a>}
                  </div>
                  <div style={{ fontSize: 12, color: '#6a6690', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {r.email && <span>{r.email}</span>}
                    {r.phone && <span>{r.phone}</span>}
                    {r.instagram && <a href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noreferrer" style={{ color: '#5a35e6', fontWeight: 700 }}>@{r.instagram}</a>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 12.5, color: '#4a4770', fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap' }}>
                  <span title="Răspunsuri corecte la primul răspuns dat fiecărei întrebări (decide nivelul)"><b style={{ color: '#14123a', fontSize: 15 }}>{r.firstTotal ? `${r.first}/${r.firstTotal}` : '—'}</b><br />din prima</span>
                  <span><b style={{ color: '#14123a', fontSize: 15 }}>{r.total ? `${r.best}/${r.total}` : '—'}</b><br />cel mai bun</span>
                  <span><b style={{ color: '#14123a', fontSize: 15 }}>{r.attempts}</b><br />încercări</span>
                  <span><b style={{ color: '#14123a', fontSize: 15 }}>{r.points}</b><br />puncte</span>
                  <span><b style={{ color: '#14123a', fontSize: 13 }}>{fmt(r.certifiedAt || r.last)}</b><br />{r.certifiedAt ? 'certificat' : 'ultima activitate'}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {confirm === r.id ? (<>
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>Resetezi?</span>
                    <button onClick={() => reset(r)} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white" style={{ color: '#9b1c1c' }}>Da</button>
                    <button onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white">Nu</button>
                  </>) : (
                    <button onClick={() => setConfirm(r.id)} title="Șterge progresul, certificatul și punctele din Academie" className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1" style={{ color: '#9b1c1c' }}><RotateCcw size={14} /> Resetează</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
