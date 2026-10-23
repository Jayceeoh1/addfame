'use client'
// Admin → Rating platformă: media, distribuția pe stele și lista evaluărilor cu cine le-a dat.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, RefreshCw, Download, Search } from 'lucide-react'
import { adminPlatformReviews, type PlatformReviewRow } from '@/app/actions/platform-reviews'

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
const tone = (n: number) => n >= 4 ? { bg: '#dcf5ec', fg: '#14532d' } : n === 3 ? { bg: '#fff1c2', fg: '#854d0e' } : { bg: '#fde8e8', fg: '#9b1c1c' }

export default function AdminRatingPage() {
  const [rows, setRows] = useState<PlatformReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [star, setStar] = useState<number | 0>(0)
  const [role, setRole] = useState<'all' | 'influencer' | 'brand'>('all')
  const [onlyComments, setOnlyComments] = useState(false)
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true); setErr('')
    const r = await adminPlatformReviews()
    setLoading(false)
    if ('error' in r) { setErr(r.error || 'Eroare'); return }
    setRows(r.rows)
  }
  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const total = rows.length
    const dist = [5, 4, 3, 2, 1].map(s => ({ s, n: rows.filter(r => r.rating === s).length }))
    const avg = total ? rows.reduce((a, r) => a + r.rating, 0) / total : 0
    const since7 = rows.filter(r => r.updated_at && Date.now() - new Date(r.updated_at).getTime() < 7 * 864e5).length
    return { total, dist, avg, since7, comments: rows.filter(r => r.comment).length }
  }, [rows])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows.filter(r =>
      (!star || r.rating === star) && (role === 'all' || r.role === role) && (!onlyComments || !!r.comment) &&
      (!t || [r.name, r.email, r.instagram, r.comment].some(v => (v || '').toLowerCase().includes(t))))
  }, [rows, star, role, onlyComments, q])

  function csv() {
    const c = (v: unknown) => { const s = String(v ?? ''); const x = /^[=+\-@]/.test(s) ? "'" + s : s; return /[",\n;]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }
    const head = ['Data', 'Nume', 'Rol', 'Stele', 'Email', 'Telefon', 'Instagram', 'Comentariu']
    const lines = shown.map(r => [fmt(r.updated_at), r.name, r.role, r.rating, r.email, r.phone, r.instagram ? '@' + r.instagram : '', r.comment].map(c).join(','))
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rating-addfame.csv'; a.click()
  }

  const btn = (on: boolean) => `px-3 py-1.5 rounded-xl text-sm font-bold border ${on ? 'bg-gray-900 text-white' : 'bg-white'}`

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Star size={22} color="#ff8a1f" fill="#ff8a1f" />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Rating platformă</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={csv} disabled={!shown.length} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1 disabled:opacity-50"><Download size={14} /> CSV</button>
          <button onClick={load} className="px-3 py-1.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err}</div>}

      <div className="bg-white border rounded-2xl p-5 mb-4" style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{stats.avg ? stats.avg.toFixed(2) : '—'}</div>
          <div style={{ color: '#ff8a1f', fontSize: 20, letterSpacing: 2 }}>{stars(Math.round(stats.avg))}</div>
          <div style={{ color: '#6a6690', fontSize: 13, marginTop: 4 }}>
            <b>{stats.total}</b> evaluări · <b>{stats.comments}</b> cu comentariu · <b>{stats.since7}</b> în ultimele 7 zile
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {stats.dist.map(d => (
            <button key={d.s} onClick={() => setStar(star === d.s ? 0 : d.s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 0, padding: 0, cursor: 'pointer', opacity: star && star !== d.s ? .45 : 1 }}>
              <span style={{ width: 28, fontSize: 13, fontWeight: 800, textAlign: 'right' }}>{d.s} ★</span>
              <span style={{ flex: 1, height: 10, background: '#f0eff7', borderRadius: 99, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${stats.total ? (d.n / stats.total) * 100 : 0}%`, background: d.s >= 4 ? '#1f9d6b' : d.s === 3 ? '#f0b429' : '#d94a3d' }} />
              </span>
              <span style={{ width: 34, fontSize: 13, color: '#6a6690', fontVariantNumeric: 'tabular-nums' }}>{d.n}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => setStar(0)} className={btn(!star)}>Toate</button>
        <button onClick={() => setStar(star === 1 ? 0 : 1)} className={btn(star === 1)}>Doar 1 ★</button>
        <button onClick={() => setRole('all')} className={btn(role === 'all')}>Toți</button>
        <button onClick={() => setRole('influencer')} className={btn(role === 'influencer')}>Creatori</button>
        <button onClick={() => setRole('brand')} className={btn(role === 'brand')}>Branduri</button>
        <button onClick={() => setOnlyComments(v => !v)} className={btn(onlyComments)}>Cu comentariu</button>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e4f0', borderRadius: 12, padding: '0 10px', background: '#fff' }}>
          <Search size={14} color="#6a6690" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută nume, email, @instagram…" style={{ height: 34, border: 0, outline: 0, fontSize: 13, minWidth: 200, background: 'transparent' }} />
        </label>
      </div>

      {loading ? <p>Se încarcă…</p> : shown.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center"><b>Nicio evaluare pentru filtrele alese</b></div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#6a6690' }}>{shown.length} afișate, cele mai recente primele</div>
          {shown.map(r => {
            const t = tone(r.rating)
            return (
              <div key={r.user_id} className="bg-white border rounded-2xl p-4">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: t.bg, color: t.fg, fontWeight: 900, fontSize: 13, padding: '3px 10px', borderRadius: 99 }}>{r.rating} ★</span>
                  <span style={{ color: '#ff8a1f', letterSpacing: 1 }}>{stars(r.rating)}</span>
                  <b>
                    {r.influencer_id
                      ? <Link href={`/admin/influencers/${r.influencer_id}`} target="_blank" style={{ color: '#5a35e6' }}>{r.name}</Link>
                      : r.name}
                  </b>
                  <span style={{ fontSize: 11, fontWeight: 800, background: '#f0eff7', color: '#4a4770', padding: '2px 8px', borderRadius: 99 }}>{r.role === 'brand' ? 'Brand' : 'Creator'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6a6690' }}>{fmt(r.updated_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6a6690', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {r.email && <span>{r.email}</span>}
                  {r.phone && <span>{r.phone}</span>}
                  {r.instagram && <a href={`https://instagram.com/${r.instagram}`} target="_blank" rel="noreferrer" style={{ color: '#5a35e6', fontWeight: 700 }}>@{r.instagram}</a>}
                </div>
                {r.comment && <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{r.comment}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
