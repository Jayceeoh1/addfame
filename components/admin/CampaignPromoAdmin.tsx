'use client'

// Admin → Campanii: pune o campanie în prim-plan pe dashboard + listă de DM-uri Instagram (300 de creatori potriviți).
import { useEffect, useMemo, useState } from 'react'
import { adminGetFeatured, adminSetFeatured, adminDmList, adminMarkDmSent } from '@/app/actions/featured-campaign'
import { toCsv, dmMessage, type DmRow } from '@/lib/dm-list'

const pad = (n: number) => String(n).padStart(2, '0')
function toLocalInput(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
/** Următoarea duminică la 00:00 (ora din browserul adminului). */
function nextSunday() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return d }

export default function CampaignPromoAdmin() {
  const [open, setOpen] = useState(false)
  const [camps, setCamps] = useState<{ id: string; name: string; brand: string; slots: number; taken: number }[]>([])
  const [sel, setSel] = useState('')
  const [on, setOn] = useState(false)
  const [ends, setEnds] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [list, setList] = useState<{ rows: DmRow[]; name: string; link: string; excluded: number; pool: number; approved: number } | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState('')

  useEffect(() => {
    adminGetFeatured().then(r => {
      if ('error' in r) return
      setCamps(r.campaigns); setOn(r.enabled); setEnds(r.endsAt ? toLocalInput(new Date(r.endsAt)) : toLocalInput(nextSunday())); setSel(r.campaignId || r.campaigns[0]?.id || '')
    }).catch(() => {})
  }, [])

  async function toggle(next: boolean) {
    setBusy(true); setMsg('')
    const r = await adminSetFeatured(sel, next, ends ? new Date(ends).toISOString() : null)
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Eroare'); return }
    setOn(next); setMsg(next ? 'Cardul e pe dashboardul creatorilor.' : 'Cardul a fost oprit.')
  }
  async function load() {
    setBusy(true); setMsg('')
    const r = await adminDmList(sel, 300)
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Eroare'); return }
    setList({ rows: r.rows, name: r.campaignName, link: r.link, excluded: r.excluded, pool: r.pool, approved: r.approved })
    setSent(new Set(r.sent))
  }
  async function mark(id: string) {
    const next = new Set(sent); next.has(id) ? next.delete(id) : next.add(id)
    setSent(next)
    await adminMarkDmSent(sel, [...next])
  }
  async function copy(r: DmRow) {
    if (!list) return
    const text = dmMessage(r.name, list.name, list.link)
    try { await navigator.clipboard.writeText(text) } catch { /* ignorat */ }
    setCopied(r.id); setTimeout(() => setCopied(''), 1500)
  }
  function download() {
    if (!list) return
    const blob = new Blob([toCsv(list.rows, sent)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `dm-instagram-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const left = useMemo(() => list ? list.rows.filter(r => !sent.has(r.id)).length : 0, [list, sent])

  return (
    <div className="mb-6 rounded-2xl border-2 border-purple-200 bg-white p-4 sm:p-5">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="font-black text-gray-900">📣 Promovare campanie (card pe dashboard + DM Instagram)</span>
        <span className="text-sm font-bold text-purple-700">{on ? 'Card pornit' : 'Card oprit'} · {open ? 'Ascunde' : 'Deschide'}</span>
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={sel} onChange={e => { setSel(e.target.value); setList(null) }} className="h-11 flex-1 min-w-[220px] rounded-xl border-2 border-gray-200 px-3 text-sm font-semibold">
              {camps.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand ? ` — ${c.brand}` : ''} ({c.taken}/{c.slots})</option>)}
            </select>
            <button disabled={busy || !sel} onClick={() => toggle(!on)} className={`h-11 px-5 rounded-xl text-sm font-black text-white disabled:opacity-50 ${on ? 'bg-red-500' : 'bg-purple-600'}`}>
              {on ? 'Oprește cardul' : 'Pornește cardul'}
            </button>
            <button disabled={busy || !sel} onClick={load} className="h-11 px-5 rounded-xl text-sm font-black bg-gray-900 text-white disabled:opacity-50">Listă DM (300)</button>
          </div>
          <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
            Timer de urgență, „Înscrieri până la”:
            <input type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} className="h-11 rounded-xl border-2 border-gray-200 px-3 text-sm" />
            <button type="button" onClick={() => setEnds('')} className="text-xs font-bold text-gray-500 underline">fără timer</button>
            {on && <button type="button" disabled={busy} onClick={() => toggle(true)} className="h-10 px-4 rounded-xl bg-purple-600 text-white text-xs font-black disabled:opacity-50">Salvează timerul</button>}
          </label>
          {msg && <p className="text-sm font-semibold text-gray-700">{msg}</p>}
          {list && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-bold">{list.rows.length} creatori · rămași de contactat: {left}</span>
                <span className="text-gray-500">({list.excluded} au aplicat deja, din {list.approved} aprobați, {list.pool} cu Instagram)</span>
                <button onClick={download} className="ml-auto h-10 px-4 rounded-xl bg-green-600 text-white font-black text-sm">Descarcă CSV</button>
              </div>
              <p className="text-xs text-gray-500">Apasă pe @nume ca să deschizi profilul, „Copiază” pune mesajul gata scris, apoi bifează „Trimis”. Recomandat: 30–40 pe zi, ca Instagram să nu limiteze contul.</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0"><tr className="text-left text-xs uppercase text-gray-500">
                    <th className="p-2">#</th><th className="p-2">Creator</th><th className="p-2">Urmăritori</th><th className="p-2">Scor</th><th className="p-2">Mesaj</th><th className="p-2">Trimis</th>
                  </tr></thead>
                  <tbody>
                    {list.rows.map((r, i) => (
                      <tr key={r.id} className={`border-t border-gray-100 ${sent.has(r.id) ? 'opacity-50' : ''}`}>
                        <td className="p-2 tabular-nums">{i + 1}</td>
                        <td className="p-2"><a href={r.url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple-700 underline">@{r.handle}</a><div className="text-xs text-gray-500">{r.name}{r.city ? ` · ${r.city}` : ''}</div></td>
                        <td className="p-2 tabular-nums">{r.followers ? r.followers.toLocaleString('ro-RO') : '—'}</td>
                        <td className="p-2 tabular-nums">{r.score}</td>
                        <td className="p-2"><button onClick={() => copy(r)} className="h-9 px-3 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs whitespace-nowrap">{copied === r.id ? 'Copiat ✓' : 'Copiază'}</button></td>
                        <td className="p-2"><input type="checkbox" checked={sent.has(r.id)} onChange={() => mark(r.id)} className="w-5 h-5" aria-label={`Trimis către ${r.handle}`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
