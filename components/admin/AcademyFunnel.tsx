'use client'
// Admin → Academie → Statistici: câți au deschis Academia, câți au văzut oferta, câți au deschis plata, câți au plătit
// + lista celor interesați care încă nu sunt membri (pentru un mesaj personal).
import { useEffect, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { adminAcademyFunnel, type FunnelPerson } from '@/app/actions/academy-funnel'
import { pct } from '@/lib/academy-funnel'

const fmt = (d: string) => new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const PERIODS: [number, string][] = [[7, '7 zile'], [30, '30 de zile'], [90, '90 de zile'], [3650, 'De la început']]

export default function AcademyFunnel() {
  const [days, setDays] = useState(30)
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function load(n = days) {
    setLoading(true); setErr('')
    const r: any = await adminAcademyFunnel(n).catch(() => ({ error: 'Nu am putut încărca statisticile.' }))
    setLoading(false)
    if (r.error) { setErr(r.error); return }
    setD(r)
  }
  useEffect(() => { load(days) }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  function csv() {
    if (!d?.people?.length) return
    const head = ['Nume', 'Email', 'Telefon', 'Instagram', 'Până unde a ajuns', 'Ultima dată']
    const rows = d.people.map((p: FunnelPerson) => [p.name, p.email, p.phone, p.instagram, p.step, fmt(p.last)])
    const txt = [head, ...rows].map((l: any[]) => l.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }))
    a.download = 'academy-interesati.csv'; a.click()
  }

  const top = d?.steps?.[0]?.count || 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        .af-bar{display:grid;grid-template-columns:minmax(150px,220px) 1fr 120px;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f3f1f9}
        .af-bar:last-child{border-bottom:0}
        .af-track{height:28px;background:#f3f1fa;border-radius:8px;overflow:hidden}
        .af-fill{height:100%;background:linear-gradient(90deg,#5b2fd0,#3a8bff);border-radius:8px;min-width:2px}
        .af-n{font-variant-numeric:tabular-nums;text-align:right}
        .af-n b{font-size:18px}.af-n small{display:block;font-size:11.5px;color:#6b6890}
        @media (max-width:640px){.af-bar{grid-template-columns:1fr 90px}.af-track{grid-column:1/-1;grid-row:2}}
        .af-tbl{width:100%;border-collapse:collapse;font-size:13.5px;min-width:720px}
        .af-tbl th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6b6890;padding:10px;border-bottom:1px solid #eee}
        .af-tbl td{padding:10px;border-bottom:1px solid #f3f1f9}
      `}</style>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIODS.map(([n, l]) => (
          <button key={n} className={`aa-b ${days === n ? 'd' : ''}`} onClick={() => setDays(n)}>{l}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="aa-b" onClick={() => load()} disabled={loading}><RefreshCw size={14} /> Reîncarcă</button>
      </div>

      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold">{err}</div>}
      {loading && !d && <p style={{ fontSize: 13 }}>Se încarcă…</p>}

      {d && (<>
        <div className="bg-white border rounded-2xl" style={{ padding: '6px 16px' }}>
          {d.steps.map((s: any, k: number) => (
            <div className="af-bar" key={s.key}>
              <div><b style={{ fontSize: 14 }}>{s.label}</b><div style={{ fontSize: 12, color: '#6b6890' }}>{s.hint}</div></div>
              <div className="af-track"><div className="af-fill" style={{ width: `${top ? Math.max(1, (s.count / top) * 100) : 0}%` }} /></div>
              <div className="af-n"><b>{s.count}</b><small>{k === 0 ? 'creatori' : `${pct(s.count, d.steps[k - 1].count)}% din pasul anterior`}</small></div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          <div className="bg-white border rounded-2xl" style={{ padding: '12px 14px' }}><b style={{ fontSize: 22 }}>{d.lockedClicks}</b><div style={{ fontSize: 12, color: '#5a5780', fontWeight: 700 }}>au apăsat pe o lecție cu lacăt</div></div>
          <div className="bg-white border rounded-2xl" style={{ padding: '12px 14px' }}><b style={{ fontSize: 22 }}>{d.closedCheckout}</b><div style={{ fontSize: 12, color: '#5a5780', fontWeight: 700 }}>au închis plata fără să plătească</div></div>
          <div className="bg-white border rounded-2xl" style={{ padding: '12px 14px' }}><b style={{ fontSize: 22 }}>{pct(d.steps[4].count, top)}%</b><div style={{ fontSize: 12, color: '#5a5780', fontWeight: 700 }}>din cei care au deschis Academia au plătit</div></div>
        </div>

        <div className="bg-white border rounded-2xl" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div><b style={{ fontSize: 15 }}>Interesați, dar încă nu sunt membri ({d.people.length})</b>
              <div style={{ fontSize: 12.5, color: '#5a5780' }}>Au văzut oferta sau au încercat o lecție cu lacăt. Primii sunt cei care au ajuns cel mai aproape de plată.</div></div>
            <button className="aa-b" onClick={csv} disabled={!d.people.length}><Download size={14} /> CSV</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="af-tbl">
              <thead><tr><th>Creator</th><th>Telefon</th><th>Până unde a ajuns</th><th>Ultima dată</th></tr></thead>
              <tbody>
                {!d.people.length && <tr><td colSpan={4} style={{ color: '#5a5780' }}>Nimeni încă în perioada asta.</td></tr>}
                {d.people.map((p: FunnelPerson) => (
                  <tr key={p.id}>
                    <td><b>{p.name || '—'}</b><div style={{ fontSize: 12, color: '#5a5780' }}>{p.email}{p.instagram ? ` · @${String(p.instagram).replace(/^@/, '')}` : ''}</div></td>
                    <td>{p.phone || '—'}</td>
                    <td>{p.step}</td>
                    <td>{fmt(p.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: '#5a5780', margin: 0 }}>Fiecare creator e numărat o singură dată pe pas, chiar dacă revine de mai multe ori. Datele se adună de la publicarea acestei versiuni, nu și din urmă.</p>
      </>)}
    </div>
  )
}
