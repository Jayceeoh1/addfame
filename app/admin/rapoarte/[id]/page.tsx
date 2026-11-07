'use client'
// Admin → Rapoarte → editor: cifrele fiecărei postări și story (corectate de admin devin „verificat de AddFame”),
// capturile de ecran, costul, citatul brandului, „de ce a mers”, briefului, secțiunile vizibile și publicarea.
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, Check, Loader2, Plus, Trash2, ImagePlus, Send, Undo2, X } from 'lucide-react'
import { adminGetReport, adminSaveReport, adminPublishReport, adminSaveMetric, adminAddRow, adminDeleteRow } from '@/app/actions/collab-report'
import { fmtInt, fmtLei, fmtPct, REPORT_SECTIONS, type CollabReport, type ReportRow, type ReportSection } from '@/lib/collab-report'
import { ADMIN_REPORT_CSS } from '../admin-report-css'

const FIELDS: { key: keyof ReportRow & string; label: string }[] = [
  { key: 'views', label: 'Vizualizări' },
  { key: 'reach', label: 'Conturi atinse' },
  { key: 'likes', label: 'Like-uri / reacții' },
  { key: 'comments', label: 'Comentarii' },
  { key: 'shares', label: 'Distribuiri' },
  { key: 'saves', label: 'Salvări' },
  { key: 'link_clicks', label: 'Clicuri pe link' },
]
const SECTION_LABEL: Record<ReportSection, string> = { cost: 'Cost', timeline: 'Parcursul colaborării', quote: 'Ce spune brandul', highlights: 'De ce a mers', brief: 'Respectarea briefului' }
const SRC: Record<string, [string, string]> = {
  instagram: ['auto', 'automat · Instagram'], youtube: ['auto', 'automat · YouTube'], admin: ['admin', 'verificat de AddFame'],
  creator: ['creator', 'raportat de creator'], pending: ['pending', 'necompletat'],
}

type Settings = {
  cost_lei: string; followers: string; brand_quote: string; brand_quote_author: string
  highlights: string[]; brief_checks: { text: string; ok: boolean }[]; hidden: ReportSection[]; admin_note: string
}

export default function AdminRaportEditor() {
  const { id } = useParams<{ id: string }>()
  const [rep, setRep] = useState<CollabReport | null>(null)
  const [err, setErr] = useState('')
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})
  const [s, setS] = useState<Settings | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [newLink, setNewLink] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [shotFor, setShotFor] = useState<string | null>(null)
  const [dragRow, setDragRow] = useState<string | null>(null)
  const activeRow = useRef<string | null>(null)
  const uploadRef = useRef(uploadShot)
  uploadRef.current = uploadShot

  // Ctrl+V cu o captură în clipboard → se încarcă la rândul peste care e mouse-ul (sau ultimul atins)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items || [])].find(i => i.kind === 'file' && i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file || !activeRow.current) return
      e.preventDefault()
      uploadRef.current(file, activeRow.current)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  function fill(r: CollabReport, keepSettings = false) {
    setRep(r)
    setDraft(Object.fromEntries(r.rows.map(x => [x.id, { label: x.label, kind: x.kind, ...Object.fromEntries(FIELDS.map(f => [f.key, x[f.key] == null ? '' : String(x[f.key])])) }])))
    if (!keepSettings) {
      const st = r.settings
      setS({
        cost_lei: st.cost_lei == null ? '' : String(st.cost_lei), followers: st.followers == null ? '' : String(st.followers),
        brand_quote: st.brand_quote || '', brand_quote_author: st.brand_quote_author || '',
        highlights: st.highlights.length ? st.highlights : [], brief_checks: st.brief_checks, hidden: st.hidden, admin_note: st.admin_note || '',
      })
      setDirty(false)
    }
  }

  async function load(keepSettings = false) {
    const r: any = await adminGetReport(String(id))
    if (r?.error) { setErr(r.error); return }
    fill(r.report, keepSettings)
  }
  useEffect(() => { load() }, [id])

  const note = (k: string, ok: boolean, text: string) => setMsg(m => ({ ...m, [k]: { ok, text } }))
  const upd = (patch: Partial<Settings>) => { setS(v => ({ ...(v as Settings), ...patch })); setDirty(true) }

  async function saveRow(row: ReportRow) {
    setBusy(row.id)
    const d = draft[row.id] || {}
    const r: any = await adminSaveMetric(row.id, { ...Object.fromEntries(FIELDS.map(f => [f.key, d[f.key] ?? ''])), label: d.label ?? '', kind: d.kind })
    setBusy(null)
    if (r?.error) return note(row.id, false, r.error)
    note(row.id, true, 'Salvat · verificat de AddFame')
    await load(true)
  }

  async function addRow(kind: 'story' | 'post') {
    setBusy('add:' + kind)
    const r: any = await adminAddRow(String(id), kind === 'story' ? { kind: 'story' } : { kind: 'post', url: newLink })
    setBusy(null)
    if (r?.error) return note('add', false, r.error)
    setNewLink(''); note('add', true, kind === 'story' ? 'Story adăugat.' : 'Postare adăugată.')
    await load(true)
  }

  async function delRow(rowId: string) {
    setBusy(rowId); setConfirmDel(null)
    const r: any = await adminDeleteRow(rowId)
    setBusy(null)
    if (r?.error) return note(rowId, false, r.error)
    await load(true)
  }

  async function uploadShot(file: File, target?: string) {
    const rowId = target || shotFor; if (!rowId) return
    if (!file.type.startsWith('image/')) return note(rowId, false, 'Trage o imagine (captură de ecran).')
    setBusy('shot:' + rowId)
    try {
      const fd = new FormData(); fd.append('row_id', rowId); fd.append('file', file)
      const res = await fetch('/api/post-metrics/screenshot', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Nu am putut încărca.')
      note(rowId, true, 'Captura a fost încărcată.')
      await load(true)
    } catch (e: any) { note(rowId, false, e.message) }
    finally { setBusy(null); setShotFor(null); if (fileRef.current) fileRef.current.value = '' }
  }

  async function removeShot(rowId: string) {
    setBusy('shot:' + rowId)
    await fetch(`/api/post-metrics/screenshot?row_id=${rowId}`, { method: 'DELETE' }).catch(() => null)
    setBusy(null); await load(true)
  }

  async function saveSettings() {
    if (!s) return
    setBusy('settings')
    const r: any = await adminSaveReport(String(id), s)
    setBusy(null)
    if (r?.error) return note('settings', false, r.error)
    note('settings', true, 'Raportul a fost salvat.')
    await load()
  }

  async function publish(on: boolean) {
    if (dirty && s) { const r: any = await adminSaveReport(String(id), s); if (r?.error) return note('publish', false, r.error) }
    setBusy('publish')
    const r: any = await adminPublishReport(String(id), on)
    setBusy(null)
    if (r?.error) return note('publish', false, r.error)
    note('publish', true, on ? 'Publicat. Brandul și creatorul au primit notificare.' : 'Raportul a fost retras. Nu se mai vede.')
    await load()
  }

  if (err) return <div className="ar"><style>{ADMIN_REPORT_CSS}</style><div className="ar-card"><span className="ar-msg err">{err}</span></div></div>
  if (!rep || !s) return <div className="ar"><style>{ADMIN_REPORT_CSS}</style><div className="ar-card ar-sub">Se încarcă…</div></div>

  const published = rep.settings.status === 'published'
  const t = rep.totals
  const autoQuote = rep.review.comment || ''

  return (
    <div className="ar">
      <style>{ADMIN_REPORT_CSS}</style>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadShot(f) }} />

      <div className="ar-row" style={{ justifyContent: 'space-between' }}>
        <div className="ar-row">
          <Link href="/admin/rapoarte" className="ar-btn" aria-label="Înapoi la rapoarte"><ArrowLeft size={15} /> Rapoarte</Link>
          <div>
            <h1>{rep.creator.name}{rep.creator.handle ? <span style={{ color: '#57537a', fontWeight: 600, fontSize: 17 }}> · {rep.creator.handle}</span> : null}</h1>
            <span className="ar-sub">{rep.campaign.name} · {rep.campaign.brandName} · colaborare {rep.status === 'COMPLETED' ? 'finalizată' : 'activă'}</span>
          </div>
        </div>
        <div className="ar-row">
          <span className={`ar-chip ${published ? 'pub' : 'draft'}`}>{published ? `Publicat${rep.settings.code ? ' · ' + rep.settings.code : ''}` : 'Ciornă'}</span>
          <a href={`/raport/${id}`} target="_blank" rel="noopener noreferrer" className="ar-btn"><Eye size={15} /> Previzualizează</a>
          {published
            ? <button type="button" className="ar-btn" onClick={() => publish(false)} disabled={!!busy}><Undo2 size={15} /> Retrage</button>
            : <button type="button" className="ar-btn g" onClick={() => publish(true)} disabled={!!busy}>{busy === 'publish' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publică raportul</button>}
        </div>
      </div>
      {msg.publish && <span className={`ar-msg ${msg.publish.ok ? 'ok' : 'err'}`}>{msg.publish.text}</span>}

      <section className="ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>Cum arată acum</h2>
        <div className="ar-kpis">
          <div className="ar-kpi"><div>Vizualizări</div><div>{fmtInt(t.views)}</div></div>
          <div className="ar-kpi"><div>Conturi atinse</div><div>{fmtInt(t.reach)}</div></div>
          <div className="ar-kpi"><div>Interacțiuni</div><div>{fmtInt(t.interactions)}</div></div>
          <div className="ar-kpi"><div>Clicuri</div><div>{fmtInt(t.clicks)}</div></div>
          <div className="ar-kpi"><div>Engagement</div><div>{fmtPct(t.er)}</div></div>
          <div className="ar-kpi"><div>Cost / 1.000 viz.</div><div>{fmtLei(rep.cost.perThousand)}</div></div>
        </div>
        <span className="ar-sub">{t.withData}/{rep.rows.length} rânduri au cifre. Engagement-ul se calculează din {t.erBase === 'reach' ? 'conturile atinse' : 'vizualizări'} ale postărilor.</span>
      </section>

      <section className="ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="ar-row" style={{ justifyContent: 'space-between' }}>
          <h2>Postări și story-uri</h2>
          <span className="ar-sub">Ce salvezi aici devine „verificat de AddFame” și creatorul nu mai poate schimba rândul.</span>
        </div>
        {!rep.rows.length && <span className="ar-sub">Creatorul nu a trimis încă linkul și nu are story-uri. Le poți adăuga tu mai jos.</span>}
        {rep.rows.map(row => {
          const d = draft[row.id] || {}
          const [cls, txt] = SRC[row.source] || SRC.pending
          const deletable = row.kind === 'story' || row.source === 'admin'
          return (
            <div key={row.id} className={`ar-metric${dragRow === row.id ? ' drop' : ''}`}
              onMouseEnter={() => { activeRow.current = row.id }} onFocusCapture={() => { activeRow.current = row.id }}
              onDragOver={e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (dragRow !== row.id) setDragRow(row.id) } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragRow(null) }}
              onDrop={e => { e.preventDefault(); setDragRow(null); const f = e.dataTransfer.files?.[0]; if (f) uploadShot(f, row.id) }}>
              <div className="ar-row">
                <input className="ar-in" style={{ flex: '1 1 220px', fontWeight: 700 }} aria-label="Numele din raport" value={d.label ?? ''} onChange={e => setDraft(v => ({ ...v, [row.id]: { ...d, label: e.target.value } }))} />
                <select className="ar-sel" aria-label="Tip" value={d.kind || row.kind} onChange={e => setDraft(v => ({ ...v, [row.id]: { ...d, kind: e.target.value } }))}>
                  <option value="post">Postare</option><option value="reel">Reel</option><option value="story">Story</option><option value="video">Video</option>
                </select>
                <span className={`ar-chip ${cls}`}>{txt}</span>
                {row.linkable && <a href={row.url} target="_blank" rel="noopener noreferrer" className="ar-sub" style={{ color: '#4a24c4', fontWeight: 600, overflowWrap: 'anywhere' }}>{row.url.replace(/^https:\/\//, '').slice(0, 50)}</a>}
              </div>
              <div className="ar-grid">
                {FIELDS.map(f => (
                  <label key={f.key} className="ar-lbl">{f.label}
                    <input className="ar-in" inputMode="numeric" placeholder="—" value={d[f.key] ?? ''} onChange={e => setDraft(v => ({ ...v, [row.id]: { ...d, [f.key]: e.target.value } }))} />
                  </label>
                ))}
              </div>
              <div className="ar-row">
                {row.screenshot_url && <a href={row.screenshot_url} target="_blank" rel="noopener noreferrer" className="ar-shot" title="Captura de ecran"><img src={row.screenshot_url} alt="Captura cu statisticile" /></a>}
                <button type="button" className="ar-btn p" onClick={() => saveRow(row)} disabled={!!busy}>{busy === row.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvează</button>
                <button type="button" className="ar-btn" onClick={() => { setShotFor(row.id); fileRef.current?.click() }} disabled={!!busy}>
                  {busy === 'shot:' + row.id ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {row.screenshot_url ? 'Schimbă captura' : 'Adaugă captura'}
                </button>
                {row.screenshot_url && <button type="button" className="ar-btn" onClick={() => removeShot(row.id)} disabled={!!busy}><X size={14} /> Scoate captura</button>}
                <span className="ar-sub" style={{ fontSize: 12 }}>{dragRow === row.id ? 'Dă drumul imaginii aici' : 'sau trage captura aici / Ctrl+V'}</span>
                {deletable && (confirmDel === row.id
                  ? <><button type="button" className="ar-btn d" onClick={() => delRow(row.id)}>Da, șterge</button><button type="button" className="ar-btn" onClick={() => setConfirmDel(null)}>Nu</button></>
                  : <button type="button" className="ar-btn d" onClick={() => setConfirmDel(row.id)} aria-label="Șterge rândul"><Trash2 size={14} /></button>)}
                {msg[row.id] && <span className={`ar-msg ${msg[row.id].ok ? 'ok' : 'err'}`}>{msg[row.id].text}</span>}
              </div>
            </div>
          )
        })}
        <div className="ar-row" style={{ borderTop: '1px solid #eeebf6', paddingTop: 14 }}>
          <button type="button" className="ar-btn dash" onClick={() => addRow('story')} disabled={!!busy}><Plus size={14} /> Adaugă story</button>
          <input className="ar-in" style={{ flex: '1 1 260px' }} placeholder="Link postare (Instagram, TikTok, YouTube)" value={newLink} onChange={e => setNewLink(e.target.value)} aria-label="Link postare" />
          <button type="button" className="ar-btn dash" onClick={() => addRow('post')} disabled={!!busy || !newLink.trim()}><Plus size={14} /> Adaugă postarea</button>
          {msg.add && <span className={`ar-msg ${msg.add.ok ? 'ok' : 'err'}`}>{msg.add.text}</span>}
        </div>
      </section>

      <section className="ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2>Textele și setările raportului</h2>
        <div className="ar-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
          <label className="ar-lbl">Cost colaborare (lei)
            <input className="ar-in" inputMode="decimal" value={s.cost_lei} onChange={e => upd({ cost_lei: e.target.value })}
              placeholder={rep.cost.source && rep.cost.source !== 'raport' ? `automat: ${fmtLei(rep.cost.lei)} (din ${rep.cost.source})` : 'ex. 200'} />
          </label>
          <label className="ar-lbl">Urmăritori
            <input className="ar-in" inputMode="numeric" value={s.followers} onChange={e => upd({ followers: e.target.value })}
              placeholder={rep.creator.followers && !rep.settings.followers ? `automat: ${fmtInt(rep.creator.followers)}` : 'ex. 12600'} />
          </label>
        </div>

        <label className="ar-lbl">Ce spune brandul (citat)
          <textarea className="ar-ta" value={s.brand_quote} onChange={e => upd({ brand_quote: e.target.value })}
            placeholder={autoQuote ? `Gol = recenzia brandului: „${autoQuote.slice(0, 120)}”` : 'ex. Conținut natural, exact pe brief.'} />
        </label>
        <label className="ar-lbl">Autorul citatului
          <input className="ar-in" value={s.brand_quote_author} onChange={e => upd({ brand_quote_author: e.target.value })} placeholder={`Echipa ${rep.campaign.brandName}`} />
        </label>

        <div className="ar-lbl">De ce a mers (puncte scurte)
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.highlights.map((h, i) => (
              <div key={i} className="ar-row">
                <input className="ar-in" style={{ flex: 1 }} value={h} onChange={e => upd({ highlights: s.highlights.map((x, j) => j === i ? e.target.value : x) })} aria-label={`Punctul ${i + 1}`} />
                <button type="button" className="ar-btn d" onClick={() => upd({ highlights: s.highlights.filter((_, j) => j !== i) })} aria-label="Șterge punctul"><Trash2 size={14} /></button>
              </div>
            ))}
            {s.highlights.length < 8 && <button type="button" className="ar-btn dash" style={{ alignSelf: 'flex-start' }} onClick={() => upd({ highlights: [...s.highlights, ''] })}><Plus size={14} /> Adaugă un punct</button>}
          </div>
        </div>

        <div className="ar-lbl">Respectarea briefului
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.brief_checks.map((b, i) => (
              <div key={i} className="ar-row">
                <label className="ar-check"><input type="checkbox" checked={b.ok} onChange={e => upd({ brief_checks: s.brief_checks.map((x, j) => j === i ? { ...x, ok: e.target.checked } : x) })} /> respectat</label>
                <input className="ar-in" style={{ flex: 1 }} value={b.text} onChange={e => upd({ brief_checks: s.brief_checks.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} aria-label={`Cerința ${i + 1}`} />
                <button type="button" className="ar-btn d" onClick={() => upd({ brief_checks: s.brief_checks.filter((_, j) => j !== i) })} aria-label="Șterge cerința"><Trash2 size={14} /></button>
              </div>
            ))}
            {s.brief_checks.length < 12 && <button type="button" className="ar-btn dash" style={{ alignSelf: 'flex-start' }} onClick={() => upd({ brief_checks: [...s.brief_checks, { text: '', ok: true }] })}><Plus size={14} /> Adaugă o cerință</button>}
          </div>
        </div>

        <div className="ar-lbl">Secțiuni afișate în raport
          <div className="ar-row">
            {REPORT_SECTIONS.map(k => (
              <label key={k} className="ar-check">
                <input type="checkbox" checked={!s.hidden.includes(k)} onChange={e => upd({ hidden: e.target.checked ? s.hidden.filter(x => x !== k) : [...s.hidden, k] })} /> {SECTION_LABEL[k]}
              </label>
            ))}
          </div>
        </div>

        <label className="ar-lbl">Notă internă (nu apare în raport)
          <textarea className="ar-ta" value={s.admin_note} onChange={e => upd({ admin_note: e.target.value })} placeholder="ex. Cifrele de la story 2 confirmate telefonic." />
        </label>

        <div className="ar-row">
          <button type="button" className="ar-btn p" onClick={saveSettings} disabled={!!busy || !dirty}>{busy === 'settings' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvează textele</button>
          {dirty && <span className="ar-sub">Ai modificări nesalvate.</span>}
          {msg.settings && <span className={`ar-msg ${msg.settings.ok ? 'ok' : 'err'}`}>{msg.settings.text}</span>}
        </div>
      </section>
    </div>
  )
}
