'use client'
// Admin → Rapoarte: toate colaborările active și finalizate, cu starea raportului și a cifrelor.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileBarChart2, RefreshCw, Search } from 'lucide-react'
import { adminListReports } from '@/app/actions/collab-report'
import { ADMIN_REPORT_CSS } from './admin-report-css'

type Item = {
  id: string; status: string; completedAt: string | null; campaignId: string; campaign: string; brand: string
  creator: string; handle: string | null; avatar: string | null
  report: { status: string; code: string | null; publishedAt: string | null } | null
  stats: { rows: number; filled: number; views: number }
}
type Filter = 'all' | 'todo' | 'draft' | 'published'

const initials = (s: string) => (s || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()

export default function AdminRapoartePage() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [camp, setCamp] = useState('')

  async function load() {
    setErr(''); setItems(null)
    const r: any = await adminListReports()
    if (r?.error) { setErr(r.error); setItems([]); return }
    setItems(r.rows)
  }
  useEffect(() => { load() }, [])

  const campaigns = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of items || []) m.set(i.campaignId, i.campaign)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [items])

  const counts = useMemo(() => {
    const l = items || []
    return {
      all: l.length,
      todo: l.filter(i => i.status === 'COMPLETED' && i.report?.status !== 'published').length,
      draft: l.filter(i => i.report?.status === 'draft').length,
      published: l.filter(i => i.report?.status === 'published').length,
    }
  }, [items])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (items || []).filter(i => {
      if (camp && i.campaignId !== camp) return false
      if (filter === 'todo' && !(i.status === 'COMPLETED' && i.report?.status !== 'published')) return false
      if (filter === 'draft' && i.report?.status !== 'draft') return false
      if (filter === 'published' && i.report?.status !== 'published') return false
      if (s && ![i.creator, i.handle || '', i.campaign, i.brand].some(x => x.toLowerCase().includes(s))) return false
      return true
    })
  }, [items, q, filter, camp])

  return (
    <div className="ar">
      <style>{ADMIN_REPORT_CSS}</style>
      <div className="ar-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><FileBarChart2 size={22} /> Rapoarte colaborări</h1>
          <span className="ar-sub">Câte un raport pentru fiecare creator dintr-o campanie. Completează sau corectează cifrele, apoi publică-l pentru brand și creator.</span>
        </div>
        <button type="button" className="ar-btn" onClick={load}><RefreshCw size={15} /> Reîncarcă</button>
      </div>

      <div className="ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ar-tabs" role="tablist">
          {([['all', 'Toate'], ['todo', 'Finalizate, fără raport publicat'], ['draft', 'Ciorne'], ['published', 'Publicate']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={`ar-tab${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l} · {counts[k]}</button>
          ))}
        </div>
        <div className="ar-row">
          <label style={{ position: 'relative', flex: '1 1 260px' }}>
            <span className="sr-only">Caută</span>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 13, color: '#8a86a8' }} aria-hidden="true" />
            <input className="ar-in" style={{ width: '100%', paddingLeft: 32 }} placeholder="Caută creator, campanie sau brand" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          <select className="ar-sel" style={{ flex: '1 1 220px', maxWidth: 360 }} value={camp} onChange={e => setCamp(e.target.value)} aria-label="Campanie">
            <option value="">Toate campaniile</option>
            {campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>

      <div className="ar-card">
        {items === null && <span className="ar-sub">Se încarcă…</span>}
        {err && <span className="ar-msg err">{err}</span>}
        {items && !shown.length && !err && <span className="ar-sub">Nicio colaborare aici.</span>}
        <div className="ar-list">
          {shown.slice(0, 400).map(i => (
            <Link key={i.id} href={`/admin/rapoarte/${i.id}`} className="ar-item">
              <span className="ar-av" aria-hidden="true">{i.avatar ? <img src={i.avatar} alt="" /> : initials(i.creator)}</span>
              <span className="ar-main">
                <b>{i.creator}{i.handle ? <span style={{ fontWeight: 600, color: '#57537a' }}> · {i.handle}</span> : null}</b>
                <span>{i.campaign}{i.brand ? ` · ${i.brand}` : ''}</span>
              </span>
              <span className="ar-sub" style={{ minWidth: 150 }}>
                {i.stats.rows ? `${i.stats.filled}/${i.stats.rows} cu cifre` : 'fără postări încă'}
                {i.stats.views ? ` · ${i.stats.views.toLocaleString('ro-RO')} viz.` : ''}
              </span>
              <span className={`ar-chip ${i.status === 'COMPLETED' ? 'pub' : 'none'}`}>{i.status === 'COMPLETED' ? 'Finalizată' : 'Activă'}</span>
              <span className={`ar-chip ${i.report?.status === 'published' ? 'pub' : i.report ? 'draft' : 'none'}`}>
                {i.report?.status === 'published' ? `Publicat${i.report.code ? ' · ' + i.report.code : ''}` : i.report ? 'Ciornă' : 'Fără raport'}
              </span>
            </Link>
          ))}
        </div>
        {shown.length > 400 && <span className="ar-sub">Se văd primele 400. Folosește căutarea sau filtrul pe campanie.</span>}
      </div>
    </div>
  )
}
