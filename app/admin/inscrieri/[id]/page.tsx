'use client'
// Admin → Înscrieri creatori → înscriși: filtre, cost / 1.000 vizualizări, status, detalii și export CSV.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, RefreshCw, X, ExternalLink } from 'lucide-react'
import { PLATFORMS, STATUS_LABEL, GENDERS, AUDIENCE_GENDERS, genderLabel, audienceGenderLabel, costPer1k, filterApplications, zoneLabel, type ApplicationFilter, type PlatformKey } from '@/lib/creator-signups'

const fmt = (n: number | null | undefined) => (n == null || n === 0 ? '—' : Number(n) >= 10000 ? `${(Number(n) / 1000).toFixed(1).replace('.', ',').replace(',0', '')}K` : Number(n).toLocaleString('ro-RO'))
const ron = (n: number | null | undefined) => (n ? `${Number(n).toLocaleString('ro-RO')} RON` : '—')
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  new: { bg: '#fff1c2', fg: '#854d0e' }, shortlisted: { bg: '#e8f0ff', fg: '#1d4ed8' },
  selected: { bg: '#efeaff', fg: '#4423c4' }, rejected: { bg: '#f0eff7', fg: '#4a4770' },
}
const costStyle = (c: number | null) => c == null ? { bg: '#f0eff7', fg: '#4a4770' } : c <= 50 ? { bg: '#dcf5ec', fg: '#14532d' } : c <= 120 ? { bg: '#f0eff7', fg: '#3d3a63' } : { bg: '#fff1e6', fg: '#9a4206' }

type SortKey = 'cost' | 'followers' | 'price' | 'date'

export default function SignupEntriesPage() {
  const { id } = useParams() as { id: string }
  const [form, setForm] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<ApplicationFilter>({ zone: 'priority', platform: '', licenseOnly: true, status: '', gender: '', audienceGender: '' })
  const [minF, setMinF] = useState(''), [maxP, setMaxP] = useState('')
  const [sort, setSort] = useState<SortKey>('cost')
  const [open, setOpen] = useState<any | null>(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch(`/api/admin/inscrieri/entries?form=${id}`); const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setForm(j.form); setRows(j.applications)
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load])

  const list = useMemo(() => {
    const parse = (v: string) => { const n = parseFloat(v.replace(/\./g, '').replace(',', '.').replace(/k$/i, '')) * (/k$/i.test(v.trim()) ? 1000 : 1); return Number.isFinite(n) ? n : 0 }
    const out = filterApplications(rows, { ...filter, minFollowers: minF ? parse(minF) : 0, maxPrice: maxP ? parse(maxP) : 0 })
      .map(r => ({ ...r, cost: costPer1k(r.price_video, r.main_avg_views) }))
    const by: Record<SortKey, (a: any, b: any) => number> = {
      cost: (a, b) => (a.cost ?? 1e9) - (b.cost ?? 1e9),
      followers: (a, b) => b.main_followers - a.main_followers,
      price: (a, b) => (a.price_video ?? 1e9) - (b.price_video ?? 1e9),
      date: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    }
    return out.sort(by[sort])
  }, [rows, filter, minF, maxP, sort])

  const counts = useMemo(() => ({
    total: rows.length,
    priority: rows.filter(r => r.zone !== 'other').length,
    selected: rows.filter(r => r.status === 'selected').length,
    female: rows.filter(r => r.gender === 'female').length,
    male: rows.filter(r => r.gender === 'male').length,
  }), [rows])

  async function patch(appId: string, body: any) {
    const r = await fetch('/api/admin/inscrieri/entries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: appId, ...body }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(j.error || 'Eroare'); return }
    setRows(rs => rs.map(x => x.id === appId ? { ...x, ...j.application } : x))
    setOpen((o: any) => o && o.id === appId ? { ...o, ...j.application } : o)
  }
  async function openInsight(appId: string) {
    const r = await fetch(`/api/admin/inscrieri/entries?insight=${appId}`); const j = await r.json()
    if (r.ok && j.url) window.open(j.url, '_blank', 'noopener')
    else setErr(j.error || 'Nu am putut deschide captura.')
  }

  const sel = 'h-10 px-3 rounded-xl border-2 border-gray-100 text-sm font-medium bg-white w-full'
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Link href="/admin/inscrieri" className="text-sm font-bold text-gray-500 flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Înscrieri creatori</Link>
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-violet-600">{form?.brand_name || 'Dealer necompletat'} · /inscriere/{form?.slug}</div>
          <h1 className="text-2xl font-black m-0">{form?.title || 'Înscriși'}</h1>
          <div className="text-sm text-gray-500 mt-1">{counts.total} înscrieri · {counts.priority} din București și Ilfov · {counts.selected} selectați · {counts.female} feminin, {counts.male} masculin</div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          <button onClick={load} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
          <a href={`/api/admin/inscrieri/export?form=${id}`} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><Download size={14} /> CSV toți</a>
          <a href={`/api/admin/inscrieri/export?form=${id}&status=selected`} className="px-3 py-2 rounded-xl text-sm font-black bg-violet-600 text-white flex items-center gap-1"><Download size={14} /> CSV selectați (pentru brand)</a>
        </div>
      </div>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err}</div>}

      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 grid gap-3 items-end" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Zonă
          <select className={sel} value={filter.zone} onChange={e => setFilter(f => ({ ...f, zone: e.target.value as any }))}>
            <option value="priority">București + Ilfov</option><option value="bucuresti">Doar București</option><option value="all">Toate</option>
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Platformă
          <select className={sel} value={filter.platform} onChange={e => setFilter(f => ({ ...f, platform: e.target.value as PlatformKey | '' }))}>
            <option value="">Toate</option>{PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Gen
          <select className={sel} value={filter.gender} onChange={e => setFilter(f => ({ ...f, gender: e.target.value }))}>
            <option value="">Toți</option>{GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Audiență
          <select className={sel} value={filter.audienceGender} onChange={e => setFilter(f => ({ ...f, audienceGender: e.target.value }))}>
            <option value="">Oricare</option>{AUDIENCE_GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Minim urmăritori<input className={sel} value={minF} onChange={e => setMinF(e.target.value)} placeholder="ex. 10K" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Preț maxim / video<input className={sel} value={maxP} onChange={e => setMaxP(e.target.value)} placeholder="ex. 1500" /></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Status
          <select className={sel} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">Toate</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Sortează după
          <select className={sel} value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            <option value="cost">Cost / 1.000 vizualizări</option><option value="followers">Urmăritori</option><option value="price">Preț</option><option value="date">Cele mai noi</option>
          </select></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!filter.licenseOnly} onChange={e => setFilter(f => ({ ...f, licenseOnly: e.target.checked }))} className="w-4 h-4 accent-violet-600" /> Doar cu permis B</label>
      </div>

      {loading ? <p>Se încarcă…</p> : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500" style={{ background: '#faf9fe' }}>
              {['Creator', 'Zonă', 'Platformă principală', 'Viz. medii', 'Preț / video', 'Cost / 1.000 viz.', 'Permis', 'Status'].map(h => <th key={h} className="px-3 py-3 font-black whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">Niciun aplicant pentru filtrele alese.</td></tr>}
              {list.map(r => {
                const main = PLATFORMS.find(p => p.key === r.main_platform)
                const cs = costStyle(r.cost), ss = STATUS_STYLE[r.status] || STATUS_STYLE.new
                return (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-violet-50/40 cursor-pointer" onClick={() => { setOpen(r); setNote(r.admin_note || '') }}>
                    <td className="px-3 py-3 whitespace-nowrap"><div className="font-bold">{r.first_name} {r.last_name}</div><div className="text-xs text-gray-500">{r.gender ? genderLabel(r.gender) : 'Gen nespecificat'}{(r.content_types || []).length ? ` · ${(r.content_types || []).slice(0, 2).join(', ')}` : ''}</div></td>
                    <td className="px-3 py-3 whitespace-nowrap">{zoneLabel(r.zone, r.other_city)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{main?.label} · <b>{fmt(r.main_followers)}</b></td>
                    <td className="px-3 py-3 text-right">{fmt(r.main_avg_views)}</td>
                    <td className="px-3 py-3 text-right font-bold whitespace-nowrap">{ron(r.price_video)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap"><span className="font-black px-2 py-1 rounded-lg" style={{ background: cs.bg, color: cs.fg }}>{r.cost == null ? '—' : `${r.cost} RON`}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap">{r.has_license ? `Da${r.driving_years ? ` · ${r.driving_years}` : ''}` : 'Nu'}</td>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <select value={r.status} onChange={e => patch(r.id, { status: e.target.value })} className="text-xs font-bold rounded-full px-2.5 py-1 border-0" style={{ background: ss.bg, color: ss.fg }} aria-label={`Status ${r.first_name} ${r.last_name}`}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-3 max-w-3xl">Cost / 1.000 vizualizări = prețul cerut ÷ vizualizările medii pe platforma principală × 1.000. Compară corect un creator mic și ieftin cu unul mare și scump. Verde: sub 50 RON; portocaliu: peste 120 RON.</p>

      {/* Detalii */}
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={`Detalii ${open.first_name} ${open.last_name}`}>
          <button className="flex-1 bg-black/30" onClick={() => setOpen(null)} aria-label="Închide" />
          <div className="w-full max-w-[520px] bg-white h-full overflow-y-auto p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-1"><h2 className="text-xl font-black m-0">{open.first_name} {open.last_name}</h2><div className="text-sm text-gray-500">{genderLabel(open.gender)} · {zoneLabel(open.zone, open.other_city)}{open.can_travel ? ` · ${open.can_travel}` : ''}</div></div>
              <button onClick={() => setOpen(null)} className="w-9 h-9 rounded-xl bg-gray-100 grid place-items-center" aria-label="Închide"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500 font-bold">Email</div><a href={`mailto:${open.email}`} className="font-semibold break-all">{open.email}</a></div>
              <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500 font-bold">Telefon</div><a href={`tel:${open.phone}`} className="font-semibold">{open.phone}</a></div>
            </div>
            <section>
              <h3 className="text-sm font-black mb-2">Platforme</h3>
              <div className="flex flex-col gap-2">
                {PLATFORMS.filter(p => open.platforms?.[p.key]).map(p => {
                  const x = open.platforms[p.key]
                  const href = /^https?:/.test(x.handle) ? x.handle : p.key === 'tiktok' ? `https://www.tiktok.com/@${x.handle.replace(/^@/, '')}` : p.key === 'instagram' ? `https://www.instagram.com/${x.handle.replace(/^@/, '')}` : `https://${x.handle.replace(/^\/+/, '')}`
                  return (
                    <div key={p.key} className="border rounded-xl p-3 flex items-center gap-3 text-sm" style={{ borderColor: open.main_platform === p.key ? '#5a35e6' : '#eee' }}>
                      <b className="w-20">{p.label}</b>
                      <a href={href} target="_blank" rel="noreferrer" className="flex-1 font-semibold text-violet-700 truncate flex items-center gap-1">{x.handle} <ExternalLink size={12} /></a>
                      <span>{fmt(x.followers)} urm.</span><span className="text-gray-500">{fmt(x.avg_views)} viz.</span>
                    </div>
                  )
                })}
              </div>
            </section>
            <section className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Preț / video', ron(open.price_video)], ['Cost / 1.000 viz.', costPer1k(open.price_video, open.main_avg_views) ? `${costPer1k(open.price_video, open.main_avg_views)} RON` : '—'],
                ['Integrare YouTube', ron(open.price_youtube)], ['3 story-uri', ron(open.price_stories)],
                ['Facturare', open.invoicing || '—'], ['Drepturi reclame', open.usage_rights || '—'],
                ['Acceptă barter', open.accepts_barter ? 'Da' : 'Nu'], ['Permis', open.has_license ? `Da${open.driving_years ? ` · ${open.driving_years}` : ''}` : 'Nu'],
                ['Audiență din București', open.audience_city_share || '—'], ['Vârstă audiență', open.audience_age || '—'],
                ['Gen audiență', audienceGenderLabel(open.audience_gender)], ['Gen', genderLabel(open.gender)],
                ['Disponibil', (open.availability || []).join(', ') || '—'], ['Postează', open.posting_time || '—'],
              ].map(([k, v]) => <div key={k} className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500 font-bold">{k}</div><div className="font-semibold">{v}</div></div>)}
            </section>
            <section className="text-sm flex flex-col gap-2">
              <h3 className="text-sm font-black m-0">Conținut</h3>
              <div>{(open.content_types || []).join(', ') || '—'}</div>
              {(open.sample_links || []).map((l: string) => <a key={l} href={l} target="_blank" rel="noreferrer" className="text-violet-700 font-semibold break-all">{l}</a>)}
              {open.auto_experience && <div><b>Experiență auto:</b> {open.auto_experience}</div>}
              {open.notes && <div className="bg-gray-50 rounded-xl p-3 italic">„{open.notes}”</div>}
              {open.insights_path && <button onClick={() => openInsight(open.id)} className="self-start px-3 py-2 rounded-xl text-sm font-bold border bg-white">Vezi captura cu statistici</button>}
            </section>
            <section className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-600 flex flex-col gap-1.5">Notă internă (nu o vede creatorul)
                <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full min-h-[80px] p-3 rounded-xl border-2 border-gray-100 text-sm" />
              </label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => patch(open.id, { admin_note: note })} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white">Salvează nota</button>
                <button onClick={() => patch(open.id, { status: 'shortlisted' })} className="px-3 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700">Pe listă</button>
                <button onClick={() => patch(open.id, { status: 'selected' })} className="px-3 py-2 rounded-xl text-sm font-black bg-violet-600 text-white">Selectează</button>
                <button onClick={() => patch(open.id, { status: 'rejected' })} className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-100">Respinge</button>
              </div>
              <div className="text-xs text-gray-400">Înscris pe {new Date(open.created_at).toLocaleString('ro-RO')}{open.wants_account ? ' · vrea și alte campanii' : ''}</div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
