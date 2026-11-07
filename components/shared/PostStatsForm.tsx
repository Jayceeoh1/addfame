'use client'
// Creatorul completează statisticile pentru raportul colaborării: postările trimise și story-urile,
// cu o captură de ecran din Insights ca dovadă. Cifrele automate (Instagram: like-uri/comentarii; YouTube)
// și cele verificate de AddFame apar blocate. După publicarea raportului totul devine doar de citit.
import { useEffect, useRef, useState } from 'react'
import { BarChart3, ChevronDown, Check, Loader2, Plus, Trash2, ImagePlus, FileText, ShieldCheck } from 'lucide-react'

type Row = {
  id: string; url: string; linkable: boolean; platform: string; kind: 'post' | 'reel' | 'story' | 'video'; label: string
  source: string; locked: string[]; verified: boolean
  views: number | null; reach: number | null; likes: number | null; comments: number | null
  shares: number | null; saves: number | null; link_clicks: number | null
  screenshot_url: string | null
}
type Field = { key: keyof Row & string; label: string }

const POST_FIELDS: Field[] = [
  { key: 'views', label: 'Vizualizări' },
  { key: 'reach', label: 'Conturi atinse' },
  { key: 'likes', label: 'Like-uri' },
  { key: 'comments', label: 'Comentarii' },
  { key: 'shares', label: 'Distribuiri' },
  { key: 'saves', label: 'Salvări' },
]
const STORY_FIELDS: Field[] = [
  { key: 'views', label: 'Vizualizări' },
  { key: 'reach', label: 'Conturi atinse' },
  { key: 'link_clicks', label: 'Clicuri pe link' },
  { key: 'likes', label: 'Reacții' },
  { key: 'comments', label: 'Răspunsuri' },
  { key: 'shares', label: 'Distribuiri' },
]
const ALL_KEYS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'link_clicks']
const PLATFORM_NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', other: 'Postare' }

const toDraft = (r: Row) => Object.fromEntries(ALL_KEYS.map(k => [k, (r as any)[k] == null ? '' : String((r as any)[k])]))

export function PostStatsForm({ collabId }: { collabId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [published, setPublished] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [topMsg, setTopMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [shotFor, setShotFor] = useState<string | null>(null)
  const [dragRow, setDragRow] = useState<string | null>(null)
  const activeRow = useRef<string | null>(null)
  const uploadRef = useRef<(f: File, id?: string) => void>(() => {})

  // Ctrl+V cu o captură în clipboard → se încarcă la rândul peste care e mouse-ul
  useEffect(() => {
    if (!open || published) return
    function onPaste(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.items || [])].find(i => i.kind === 'file' && i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (!file || !activeRow.current) return
      e.preventDefault()
      uploadRef.current(file, activeRow.current)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, published])

  function apply(j: any) {
    const list: Row[] = j.rows || []
    setRows(list)
    setPublished(!!j.published); setReportUrl(j.report_url || null)
    setDraft(Object.fromEntries(list.map(r => [r.id, toDraft(r)])))
    setLabels(Object.fromEntries(list.map(r => [r.id, r.label])))
  }

  useEffect(() => {
    fetch(`/api/post-metrics/report?collaboration_id=${collabId}`)
      .then(r => r.json()).then(apply).catch(() => setRows([]))
  }, [collabId])

  async function post(body: any) {
    const res = await fetch('/api/post-metrics/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collaboration_id: collabId, ...body }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j.error || 'Eroare')
    return j
  }

  async function save(r: Row) {
    setBusy(r.id); setMsg(m => ({ ...m, [r.id]: undefined as any }))
    const values: Record<string, string> = {}
    for (const k of ALL_KEYS) if (!r.locked.includes(k)) values[k] = draft[r.id]?.[k] ?? ''
    try {
      const j = await post({ row_id: r.id, ...values, ...(r.kind === 'story' ? { label: labels[r.id] ?? '' } : {}) })
      apply(j)
      setMsg(m => ({ ...m, [r.id]: { ok: true, text: r.screenshot_url ? 'Salvat. Cifrele apar în raport.' : 'Salvat. Adaugă și captura de ecran, ca dovadă.' } }))
    } catch (e: any) {
      setMsg(m => ({ ...m, [r.id]: { ok: false, text: e.message || 'Nu am putut salva.' } }))
    } finally { setBusy(null) }
  }

  async function addStory() {
    setBusy('add'); setTopMsg(null)
    try { apply(await post({ action: 'add_story' })) } catch (e: any) { setTopMsg(e.message) } finally { setBusy(null) }
  }

  async function delStory(r: Row) {
    setBusy(r.id)
    try { apply(await post({ action: 'delete_story', row_id: r.id })) } catch (e: any) { setMsg(m => ({ ...m, [r.id]: { ok: false, text: e.message } })) } finally { setBusy(null) }
  }

  function pickShot(id: string) { setShotFor(id); fileRef.current?.click() }

  async function uploadShot(file: File, target?: string) {
    const id = target || shotFor; if (!id) return
    if (!file.type.startsWith('image/')) { setMsg(m => ({ ...m, [id]: { ok: false, text: 'Trage o imagine (captură de ecran).' } })); return }
    setBusy('shot:' + id)
    try {
      const fd = new FormData(); fd.append('row_id', id); fd.append('file', file)
      const res = await fetch('/api/post-metrics/screenshot', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Nu am putut încărca.')
      setRows(list => (list || []).map(x => x.id === id ? { ...x, screenshot_url: j.screenshot_url } : x))
      setMsg(m => ({ ...m, [id]: { ok: true, text: 'Captura a fost încărcată.' } }))
    } catch (e: any) {
      setMsg(m => ({ ...m, [id]: { ok: false, text: e.message } }))
    } finally { setBusy(null); setShotFor(null); if (fileRef.current) fileRef.current.value = '' }
  }

  uploadRef.current = uploadShot

  const filled = (rows || []).filter(r => ALL_KEYS.some(k => (r as any)[k] != null)).length
  const total = rows?.length || 0

  return (
    <div style={{ border: '1.5px solid #ebe8f7', borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
      <style>{'@media (pointer:coarse){.psf-hint{display:none}}'}</style>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadShot(f) }} />
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', minHeight: 44 }}>
        <BarChart3 size={16} color="#7040f0" style={{ flex: 'none' }} />
        <span style={{ flex: 1 }}>
          <b style={{ fontSize: 14, color: '#14123a' }}>Statistici pentru raport{total ? ` · ${filled}/${total} completate` : ''}</b>
          <span style={{ display: 'block', fontSize: 12, color: '#6a6690' }}>
            {published ? 'Raportul e publicat. Cifrele nu se mai pot schimba.' : 'Pune cifrele din Insights pentru postare și fiecare story, plus o captură de ecran.'}
          </span>
        </span>
        <ChevronDown size={16} color="#6a6690" style={{ flex: 'none', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>

      {reportUrl && (
        <div style={{ padding: '0 14px 12px' }}>
          <a href={reportUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 14px', borderRadius: 10, background: '#f1edff', color: '#4a24c4', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
            <FileText size={15} /> Vezi raportul și imaginea pentru Story
          </a>
        </div>
      )}

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 14 }}>
          {rows === null && <span style={{ fontSize: 13, color: '#6a6690' }}>Se încarcă…</span>}
          {rows?.length === 0 && <span style={{ fontSize: 13, color: '#6a6690' }}>După ce trimiți linkul postării, apare aici. Story-urile le poți adăuga oricând de mai jos.</span>}
          {rows?.map(r => {
            const fields = r.kind === 'story' ? STORY_FIELDS : POST_FIELDS
            const ro = published || r.verified
            return (
              <div key={r.id}
                onMouseEnter={() => { activeRow.current = ro ? null : r.id }} onFocusCapture={() => { activeRow.current = ro ? null : r.id }}
                onDragOver={e => { if (!ro && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (dragRow !== r.id) setDragRow(r.id) } }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragRow(null) }}
                onDrop={e => { if (ro) return; e.preventDefault(); setDragRow(null); const f = e.dataTransfer.files?.[0]; if (f) uploadShot(f, r.id) }}
                style={{ borderTop: '1px solid #f0eef8', paddingTop: 12, display: 'grid', gap: 10, borderRadius: 12, outline: `2px dashed ${dragRow === r.id ? '#7c5cf0' : 'transparent'}`, outlineOffset: 4, background: dragRow === r.id ? '#f6f2ff' : undefined }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  {r.kind === 'story' ? (
                    <input value={labels[r.id] ?? ''} disabled={ro} aria-label="Numele story-ului" placeholder="ex. Story 1 · unboxing"
                      onChange={e => setLabels(l => ({ ...l, [r.id]: e.target.value }))}
                      style={{ flex: '1 1 200px', minWidth: 0, height: 38, borderRadius: 10, border: '1.5px solid #e5e3f3', padding: '0 10px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', background: ro ? '#f6f6fc' : '#fff' }} />
                  ) : r.linkable ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: '#5a35e6', wordBreak: 'break-all', flex: '1 1 200px' }}>
                      {PLATFORM_NAME[r.platform] || 'Postare'} · {r.url.replace(/^https:\/\//, '')}
                    </a>
                  ) : <b style={{ fontSize: 13, flex: '1 1 200px' }}>{r.label}</b>}
                  {r.verified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#14532d', background: '#e3f6ec', padding: '3px 8px', borderRadius: 99 }}><ShieldCheck size={12} /> verificat de AddFame</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                  {fields.map(f => {
                    const locked = r.locked.includes(f.key)
                    const auto = locked && !published && !r.verified
                    return (
                      <label key={f.key} style={{ display: 'grid', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#4a4770' }}>
                        <span>{f.label}{auto && <span style={{ color: '#14532d', fontWeight: 600 }}> · automat</span>}</span>
                        <input
                          inputMode="numeric" placeholder="ex. 12400" disabled={locked}
                          value={locked ? ((r as any)[f.key] == null ? '' : Number((r as any)[f.key]).toLocaleString('ro-RO')) : (draft[r.id]?.[f.key] ?? '')}
                          onChange={e => setDraft(d => ({ ...d, [r.id]: { ...(d[r.id] || {}), [f.key]: e.target.value } }))}
                          style={{ height: 38, borderRadius: 10, border: '1.5px solid #e5e3f3', padding: '0 10px', fontSize: 14, fontFamily: 'inherit', background: locked ? '#f6f6fc' : '#fff', fontVariantNumeric: 'tabular-nums', minWidth: 0 }}
                        />
                      </label>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {r.screenshot_url && (
                    <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" title="Captura de ecran" style={{ display: 'block', width: 40, height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e3f3', flex: 'none' }}>
                      <img src={r.screenshot_url} alt="Captura cu statisticile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  )}
                  {!ro && (
                    <>
                      <button type="button" onClick={() => save(r)} disabled={!!busy}
                        style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 'none', background: '#7040f0', color: '#fff', fontWeight: 800, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvează
                      </button>
                      <button type="button" onClick={() => pickShot(r.id)} disabled={!!busy}
                        style={{ height: 40, padding: '0 12px', borderRadius: 10, border: '1.5px solid #e5e3f3', background: '#fff', color: '#14123a', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {busy === 'shot:' + r.id ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} {r.screenshot_url ? 'Schimbă captura' : 'Adaugă captura'}
                      </button>
                      {r.kind === 'story' && (
                        <button type="button" onClick={() => delStory(r)} disabled={!!busy} aria-label="Șterge story-ul"
                          style={{ height: 40, width: 40, borderRadius: 10, border: '1.5px solid #f3d6d6', background: '#fff', color: '#b42318', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                  {!ro && !msg[r.id] && <span className="psf-hint" style={{ fontSize: 12, color: '#6a6690' }}>{dragRow === r.id ? 'Dă drumul imaginii aici' : 'sau trage captura aici / Ctrl+V'}</span>}
                  {msg[r.id] && <span style={{ fontSize: 12, color: msg[r.id].ok ? '#14532d' : '#b42318' }}>{msg[r.id].text}</span>}
                </div>
              </div>
            )
          })}
          {!published && rows !== null && (
            <div style={{ borderTop: '1px solid #f0eef8', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={addStory} disabled={!!busy}
                style={{ height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px dashed #c9bdf5', background: '#faf8ff', color: '#4a24c4', fontWeight: 800, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                {busy === 'add' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adaugă un story
              </button>
              <span style={{ fontSize: 12, color: '#6a6690' }}>Completează story-urile cât mai repede: statisticile lor rămân puțin timp în Insights.</span>
              {topMsg && <span style={{ fontSize: 12, color: '#b42318' }}>{topMsg}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PostStatsForm
