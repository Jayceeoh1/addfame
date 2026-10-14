'use client'
// Drepturi de autor — toate contractele de cesiune semnate, pe campanii, pentru brand.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Download, ChevronDown, Search, Clock, ArrowUpRight } from 'lucide-react'
import { RightsRows, type Item } from '@/components/brand/campaigns/RightsPanel'

type Camp = { id: string; name: string; status: string | null; items: Item[]; pending: number }

const ink = '#14123a', muted = '#6a6690', line = '#ebe8f7', violet = '#5a35e6'

export default function BrandRightsPage() {
  const [camps, setCamps] = useState<Camp[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'ads' | 'soon'>('all')
  const [open, setOpen] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/brand/rights').then(async r => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) setErr(d.error || 'Nu am putut încărca drepturile.')
      else { setCamps(d.campaigns || []); if (d.campaigns?.[0]) setOpen(new Set([d.campaigns[0].id])) }
    }).catch(() => setErr('Nu am putut încărca drepturile.'))
  }, [])

  const all = camps || []
  const items = all.flatMap(c => c.items)
  const stats = {
    signed: items.length,
    ads: items.filter(i => i.rights.state === 'ads').length,
    soon: items.filter(i => i.rights.state === 'ads' && i.rights.daysLeftAds <= 30).length,
    pending: all.reduce((s, c) => s + c.pending, 0),
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.map(c => ({
      ...c,
      view: c.items.filter(i =>
        (!term || i.creator.toLowerCase().includes(term) || c.name.toLowerCase().includes(term)) &&
        (filter === 'all' || (filter === 'ads' ? i.rights.state === 'ads' : i.rights.state === 'ads' && i.rights.daysLeftAds <= 30))),
    })).filter(c => c.view.length || (!term && filter === 'all'))
  }, [all, q, filter])

  const toggle = (id: string) => setOpen(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ width: 46, height: 46, borderRadius: 14, background: '#efeafe', color: violet, display: 'grid', placeItems: 'center', flex: 'none' }}><ShieldCheck size={22} /></span>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: ink }}>Drepturi de autor</h1>
          <p style={{ margin: '4px 0 0', color: muted, fontSize: 14, maxWidth: 620 }}>
            Clipurile pe care le poți folosi, pe campanii. Organic fără limită de timp, în reclame plătite 6 luni de la semnare, inclusiv prin partenerii tăi. Pentru fiecare campanie descarci atestarea PDF.
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { l: 'Contracte semnate', v: stats.signed, c: ink },
          { l: 'Cu reclame active', v: stats.ads, c: '#166534' },
          { l: 'Reclame care expiră în 30 de zile', v: stats.soon, c: stats.soon ? '#b45309' : ink },
          { l: 'Așteaptă semnătura', v: stats.pending, c: muted },
        ].map(s => (
          <div key={s.l} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{camps ? s.v : '–'}</div>
            <div style={{ fontSize: 12.5, color: muted, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: '#fff', border: `1px solid ${line}`, borderRadius: 16, padding: 10 }}>
        <label style={{ flex: '1 1 220px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${line}`, borderRadius: 12, padding: '8px 12px' }}>
          <Search size={16} color={muted} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută creator sau campanie…"
            style={{ border: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14, background: 'transparent', color: ink }} />
        </label>
        <div style={{ display: 'flex', gap: 4, background: '#f6f5fb', borderRadius: 12, padding: 4 }}>
          {([['all', 'Toate'], ['ads', 'Ads active'], ['soon', 'Expiră curând']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ border: 'none', cursor: 'pointer', padding: '7px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, background: filter === v ? '#fff' : 'transparent', color: filter === v ? ink : muted, boxShadow: filter === v ? '0 1px 3px rgba(20,18,58,.08)' : 'none' }}>{l}</button>
          ))}
        </div>
      </div>

      {stats.soon > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, background: '#fff7e6', border: '1px solid #fde3b0', color: '#7a4b00', fontSize: 13.5 }}>
          <Clock size={16} style={{ flex: 'none', marginTop: 2 }} />
          <span>Pentru {stats.soon === 1 ? 'un clip' : `${stats.soon} clipuri`} perioada de reclame plătite se încheie în curând. După aceea le poți folosi doar organic. Pentru prelungire scrie-ne la support@addfame.ro.</span>
        </div>
      )}

      {err ? <div style={{ color: '#b42318', fontSize: 14 }}>{err}</div>
        : !camps ? <div style={{ textAlign: 'center', color: muted, padding: 40 }}>Se încarcă…</div>
        : all.length === 0 ? (
          <div style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 18, padding: '40px 20px', textAlign: 'center', color: muted }}>
            <ShieldCheck size={30} style={{ margin: '0 auto 10px', color: '#c9c3ea' }} />
            <div style={{ fontWeight: 800, color: ink, marginBottom: 4 }}>Încă nu ai contracte de cesiune</div>
            <div style={{ fontSize: 14 }}>Când creatorii din campaniile tale semnează cesiunea drepturilor, apar aici, pe campanii.</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: 30 }}>Nimic pentru filtrele alese.</div>
        ) : shown.map(c => {
          const total = c.items.length + c.pending
          const pct = total ? Math.round((c.items.length / total) * 100) : 0
          const isOpen = open.has(c.id) || !!q || filter !== 'all'
          const adsCount = c.items.filter(i => i.rights.state === 'ads').length
          return (
            <section key={c.id} style={{ background: '#fff', border: `1px solid ${line}`, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', padding: '14px 16px', borderLeft: `5px solid ${violet}` }}>
                <button onClick={() => toggle(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 260px', minWidth: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#f6f5fb', display: 'grid', placeItems: 'center', flex: 'none', transform: isOpen ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }}><ChevronDown size={16} color={muted} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: ink, fontSize: 15.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: muted }}>
                      {c.items.length} {c.items.length === 1 ? 'semnat' : 'semnate'}{c.pending ? ` · ${c.pending} în așteptare` : ''} · {adsCount} cu ads active
                    </span>
                  </span>
                </button>
                <div style={{ width: 140, flex: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                    <span style={{ color: '#166534' }}>{c.items.length}/{total} semnate</span><span style={{ color: muted }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#f1eff9', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
                  <Link href={`/brand/campaigns/${c.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 11, background: '#f6f5fb', color: ink, fontWeight: 800, fontSize: 12.5, textDecoration: 'none' }}>
                    Campania <ArrowUpRight size={14} />
                  </Link>
                  <a href={`/api/brand/campaigns/${c.id}/rights/pdf`} target="_blank" rel="noopener"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 11, background: violet, color: '#fff', fontWeight: 800, fontSize: 12.5, textDecoration: 'none' }}>
                    <Download size={14} /> Atestare PDF
                  </a>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  {c.view.length ? <RightsRows items={c.view} /> : (
                    <div style={{ fontSize: 13.5, color: muted, padding: '6px 2px' }}>Niciun contract semnat încă — {c.pending} {c.pending === 1 ? 'așteaptă' : 'așteaptă'} semnătura creatorilor.</div>
                  )}
                </div>
              )}
            </section>
          )
        })}
    </div>
  )
}
