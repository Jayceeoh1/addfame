'use client'

// Admin → Campanii: pune o campanie în prim-plan pe dashboard + listă de DM-uri Instagram (300 de creatori potriviți).
import { useEffect, useMemo, useState } from 'react'
import { adminGetFeatured, adminSetFeatured, adminDmList, adminMarkDmSent, adminApplicants } from '@/app/actions/featured-campaign'
import { adminWaStatus, adminWaSend } from '@/app/actions/whatsapp-campaign'
import { toCsv, applicantsToCsv, dmMessage, type DmRow } from '@/lib/dm-list'

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
  const [last, setLast] = useState<number | null>(null)
  const [wa, setWa] = useState<{ configured: boolean; optedIn: number; remaining: number; sent: number } | null>(null)
  const [waArm, setWaArm] = useState(false)
  const [waCount, setWaCount] = useState(20)
  const [waProg, setWaProg] = useState('')

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
  async function setMany(ids: string[], value: boolean) {
    const next = new Set(sent)
    ids.forEach(id => value ? next.add(id) : next.delete(id))
    setSent(next)
    await adminMarkDmSent(sel, [...next])
  }
  /** Click pe bifă; cu Shift apăsat bifează/debifează tot intervalul de la ultima bifă. */
  function onCheck(i: number, shift: boolean) {
    if (!list) return
    const id = list.rows[i].id
    const value = !sent.has(id)
    if (shift && last !== null) {
      const [a, b] = [Math.min(last, i), Math.max(last, i)]
      setMany(list.rows.slice(a, b + 1).map(r => r.id), value)
    } else setMany([id], value)
    setLast(i)
  }
  function markNext(n: number) {
    if (!list) return
    setMany(list.rows.filter(r => !sent.has(r.id)).slice(0, n).map(r => r.id), true)
  }
  async function copy(r: DmRow) {
    if (!list) return
    const text = dmMessage(r.name, list.name, list.link)
    try { await navigator.clipboard.writeText(text) } catch { /* ignorat */ }
    setCopied(r.id); setTimeout(() => setCopied(''), 1500)
  }
  async function waCheck() {
    setBusy(true); setMsg('')
    const r = await adminWaStatus(sel)
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Eroare'); return }
    setWa({ configured: r.configured, optedIn: r.optedIn, remaining: r.remaining, sent: r.sent }); setWaArm(false)
  }
  /** Trimite exact câți ai ales (10…200), în pachete de câte 25, cei mai activi primii. */
  async function waSend() {
    if (!wa) return
    const target = Math.min(waCount, wa.remaining)
    setBusy(true); setMsg(''); setWaArm(false)
    let ok = 0, failed = 0, left = target, remaining = wa.remaining
    while (left > 0) {
      setWaProg(`Se trimite… ${ok + failed}/${target}`)
      const r = await adminWaSend(sel, Math.min(25, left))
      if ('error' in r) { setMsg(r.error || 'Eroare'); break }
      ok += r.ok; failed += r.failed; remaining = r.remaining
      const done = r.ok + r.failed
      if (done === 0) break
      left -= done
    }
    setBusy(false); setWaProg('')
    setMsg(`WhatsApp: ${ok} trimise${failed ? `, ${failed} eșuate (vezi WhatsApp logs)` : ''}. Mai rămân ${remaining} care au acceptat.`)
    waCheck()
  }
  async function exportApplicants() {
    setBusy(true); setMsg('')
    const r = await adminApplicants(sel)
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Eroare'); return }
    if (!r.rows.length) { setMsg('Nu a aplicat nimeni încă.'); return }
    save(applicantsToCsv(r.rows), `aplicanti-${new Date().toISOString().slice(0, 10)}.csv`)
    setMsg(`Am descărcat ${r.rows.length} aplicanți.`)
  }
  function save(csv: string, file: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = file
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  function download() {
    if (!list) return
    save(toCsv(list.rows, sent), `dm-instagram-${new Date().toISOString().slice(0, 10)}.csv`)
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
            <select value={sel} onChange={e => { setSel(e.target.value); setList(null); setWa(null); setWaArm(false) }} className="h-11 flex-1 min-w-[220px] rounded-xl border-2 border-gray-200 px-3 text-sm font-semibold">
              {camps.map(c => <option key={c.id} value={c.id}>{c.name}{c.brand ? ` — ${c.brand}` : ''} ({c.taken}/{c.slots})</option>)}
            </select>
            <button disabled={busy || !sel} onClick={() => toggle(!on)} className={`h-11 px-5 rounded-xl text-sm font-black text-white disabled:opacity-50 ${on ? 'bg-red-500' : 'bg-purple-600'}`}>
              {on ? 'Oprește cardul' : 'Pornește cardul'}
            </button>
            <button disabled={busy || !sel} onClick={load} className="h-11 px-5 rounded-xl text-sm font-black bg-gray-900 text-white disabled:opacity-50">Listă DM (300)</button>
            <button disabled={busy || !sel} onClick={exportApplicants} className="h-11 px-5 rounded-xl text-sm font-black bg-green-600 text-white disabled:opacity-50">Export aplicanți CSV</button>
          </div>
          <label className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
            Timer de urgență, „Înscrieri până la”:
            <input type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} className="h-11 rounded-xl border-2 border-gray-200 px-3 text-sm" />
            <button type="button" onClick={() => setEnds('')} className="text-xs font-bold text-gray-500 underline">fără timer</button>
            {on && <button type="button" disabled={busy} onClick={() => toggle(true)} className="h-10 px-4 rounded-xl bg-purple-600 text-white text-xs font-black disabled:opacity-50">Salvează timerul</button>}
          </label>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-3">
            <span className="text-sm font-bold text-green-900">Anunț WhatsApp</span>
            <button disabled={busy || !sel} onClick={waCheck} className="h-10 px-4 rounded-xl bg-white border-2 border-green-300 text-green-800 font-black text-sm disabled:opacity-50">Verifică publicul</button>
            {wa && <span className="text-sm text-green-900">{wa.optedIn} au acceptat WhatsApp · <b>{wa.remaining}</b> de trimis · {wa.sent} trimise deja{!wa.configured ? ' · lipsește șablonul Twilio' : ''}</span>}
            {wa && wa.configured && wa.remaining > 0 && (<span className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-bold text-green-900" htmlFor="wa-count">Câți primesc:</label>
              <select id="wa-count" value={waCount} disabled={busy} onChange={e => { setWaCount(Number(e.target.value)); setWaArm(false) }} className="h-10 rounded-xl border-2 border-green-300 px-2 text-sm font-bold">
                {[10, 20, 30, 50, 100, 200].map(n => <option key={n} value={n} disabled={n > wa.remaining && n !== 10}>{n}</option>)}
              </select>
              {waArm
                ? <><span className="text-sm font-bold text-green-900">Trimiți la {Math.min(waCount, wa.remaining)} creatori (cei mai activi)?</span>
                    <button disabled={busy} onClick={waSend} className="h-10 px-4 rounded-xl bg-green-600 text-white font-black text-sm disabled:opacity-50">Da, trimite</button>
                    <button onClick={() => setWaArm(false)} className="text-xs font-bold text-gray-600 underline">Anulează</button></>
                : <button disabled={busy} onClick={() => setWaArm(true)} className="h-10 px-4 rounded-xl bg-green-600 text-white font-black text-sm disabled:opacity-50">Trimite la {Math.min(waCount, wa.remaining)}</button>}
              {waProg && <span className="text-sm font-bold text-green-900">{waProg}</span>}
            </span>)}
          </div>
          {msg && <p className="text-sm font-semibold text-gray-700">{msg}</p>}
          {list && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-bold">{list.rows.length} creatori · rămași de contactat: {left}</span>
                <span className="text-gray-500">({list.excluded} au aplicat deja, din {list.approved} aprobați, {list.pool} cu Instagram)</span>
                <button onClick={() => markNext(40)} className="h-10 px-4 rounded-xl bg-purple-50 text-purple-700 font-black text-sm">Bifează următorii 40</button>
                <button onClick={() => { if (list) setMany(list.rows.map(r => r.id), false) }} className="text-xs font-bold text-gray-500 underline">debifează tot</button>
                <button onClick={download} className="ml-auto h-10 px-4 rounded-xl bg-green-600 text-white font-black text-sm">Descarcă CSV</button>
              </div>
              <p className="text-xs text-gray-500">Apasă pe @nume ca să deschizi profilul, „Copiază” pune mesajul gata scris, apoi bifează „Trimis”. Poți bifa mai mulți deodată: ține Shift apăsat și dă click pe ultima bifă dintr-un interval, sau folosește „Bifează următorii 40”. Recomandat: 30–40 pe zi, ca Instagram să nu limiteze contul.</p>
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
                        <td className="p-2"><input type="checkbox" checked={sent.has(r.id)} onClick={e => onCheck(i, e.shiftKey)} onChange={() => {}} className="w-5 h-5" aria-label={`Trimis către ${r.handle}`} /></td>
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
