'use client'
// Draft video pentru aprobare: același component pentru creator (încarcă) și brand (revizuiește).
// Fișierele stau într-un bucket privat; accesul trece doar prin /api/deliverables/*.
import { useCallback, useEffect, useRef, useState } from 'react'

type Role = 'brand' | 'influencer'
interface Comment { id: string; draft_id: string; author_role: Role; at_second: number | null; body: string; created_at: string }
interface Draft {
  id: string; version: number; file_name: string; file_size: number | null; duration_sec: number | null
  caption: string | null; note: string | null; status: 'pending' | 'approved' | 'changes_requested'
  review_note: string | null; created_at: string; viewUrl: string | null; comments: Comment[]
  revision_round?: number | null; revision_due_at?: string | null
}

const MAX = 200 * 1024 * 1024
const OK_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const fmtMB = (b: number | null) => (b ? `${(b / 1048576).toFixed(b > 10485760 ? 0 : 1)} MB` : '')

const STATUS: Record<Draft['status'], { t: string; bg: string; fg: string }> = {
  pending: { t: 'De revizuit', bg: '#fff1c2', fg: '#854d0e' },
  approved: { t: 'Aprobat', bg: '#dcf5ec', fg: '#14532d' },
  changes_requested: { t: 'Modificări cerute', bg: '#fff1e6', fg: '#9a4206' },
}

export default function DraftReview({ collabId, role, canUpload = true, onChanged }: {
  collabId: string; role: Role; canUpload?: boolean; onChanged?: () => void
}) {
  const accent = role === 'brand' ? '#5a35e6' : '#7040f0'
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [text, setText] = useState('')
  const [askChanges, setAskChanges] = useState(false)
  const [changesNote, setChangesNote] = useState('')
  const [open, setOpen] = useState(false)
  // upload
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [note, setNote] = useState('')
  const [prog, setProg] = useState<number | null>(null)
  const vref = useRef<HTMLVideoElement>(null)
  const first = useRef(true)
  const [verr, setVerr] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/deliverables?collabId=${collabId}`, { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) { setDrafts(j.drafts || []); setSel(s => s && (j.drafts || []).some((d: Draft) => d.id === s) ? s : (j.drafts?.[0]?.id ?? null)) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [collabId, role])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const draft = drafts.find(d => d.id === sel) || null
  const latest = drafts[0] || null
  const canSendNew = role === 'influencer' && canUpload && (!latest || latest.status === 'changes_requested')

  async function upload() {
    if (!file) return
    setErr('')
    if (!OK_MIME.includes(file.type)) return setErr('Format neacceptat. Folosește MP4, MOV sau WebM.')
    if (file.size > MAX) return setErr('Fișierul depășește 200 MB.')
    setBusy(true); setProg(0)
    try {
      const r = await fetch('/api/deliverables/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collabId, fileName: file.name, size: file.size, mime: file.type, caption, note }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Nu am putut începe încărcarea.')
      let seconds: number | null = null
      try {
        seconds = await new Promise<number>((res, rej) => {
          const v = document.createElement('video'); v.preload = 'metadata'
          v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(v.src) }
          v.onerror = () => rej(new Error('meta')); v.src = URL.createObjectURL(file)
        })
      } catch { /* durata e opțională */ }
      await new Promise<void>((res, rej) => {
        const x = new XMLHttpRequest()
        x.open('PUT', j.signedUrl)
        x.setRequestHeader('x-upsert', 'false')
        x.upload.onprogress = e => { if (e.lengthComputable) setProg(Math.round((e.loaded / e.total) * 100)) }
        x.onload = () => (x.status >= 200 && x.status < 300 ? res() : rej(new Error('Încărcarea a eșuat. Încearcă din nou.')))
        x.onerror = () => rej(new Error('Conexiune întreruptă. Încearcă din nou.'))
        const fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', file)
        x.send(fd)
      })
      const c = await fetch('/api/deliverables/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: j.draftId, durationSec: seconds && isFinite(seconds) ? seconds : null }),
      })
      const cj = await c.json()
      if (!c.ok) throw new Error(cj.error || 'Nu am putut trimite draftul.')
      setFile(null); setCaption(''); setNote('')
      await load(); onChanged?.()
    } catch (e: any) { setErr(e.message || 'Eroare la încărcare.') }
    setBusy(false); setProg(null)
  }

  async function review(action: 'approve' | 'changes') {
    if (!draft) return
    setBusy(true); setErr('')
    const r = await fetch('/api/deliverables/review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: draft.id, action, note: action === 'changes' ? changesNote : '' }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setErr(j.error || 'Nu am putut salva.')
    else { setAskChanges(false); setChangesNote(''); await load(); onChanged?.() }
    setBusy(false)
  }

  async function addComment() {
    if (!draft || !text.trim()) return
    setBusy(true); setErr('')
    const r = await fetch('/api/deliverables/comment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId: draft.id, atSecond: Math.floor(cur), body: text }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setErr(j.error || 'Nu am putut salva comentariul.')
    else { setText(''); await load() }
    setBusy(false)
  }

  async function download() {
    if (!draft) return
    const r = await fetch(`/api/deliverables/download?draftId=${draft.id}`)
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.url) window.location.href = j.url
    else setErr(j.error || 'Fișierul nu mai este disponibil.')
  }

  const chip = (s: Draft['status']) => (
    <span style={{ background: STATUS[s].bg, color: STATUS[s].fg, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>{STATUS[s].t}</span>
  )
  const box: React.CSSProperties = { background: '#fff', border: '1px solid #e5e3f3', borderRadius: 16, padding: 14 }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6a6690' }
  const btn = (primary: boolean): React.CSSProperties => ({
    height: 46, padding: '0 18px', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
    opacity: busy ? 0.6 : 1, border: primary ? 'none' : '1.5px solid #e5e3f3', background: primary ? accent : '#fff', color: primary ? '#fff' : '#14123a',
  })

  if (loading) return null
  // brandul nu are nimic de văzut dacă nu există draft
  if (role === 'brand' && !draft) return null

  const summary = draft ? `Draft video v${draft.version}` : 'Draft video'

  // ── Panou vizibil pe card (stare + ce trebuie făcut) ──
  type Tone = { bg: string; border: string; fg: string }
  const T: Record<string, Tone> = {
    none: { bg: '#efeaff', border: '#cdb8ff', fg: '#4423c4' },
    pending: { bg: '#fff8e1', border: '#f0c85a', fg: '#713f12' },
    changes: { bg: '#fff1e6', border: '#f3a867', fg: '#9a4206' },
    approved: { bg: '#dcf5ec', border: '#8fd6b8', fg: '#14532d' },
  }
  const st = !draft ? 'none' : draft.status === 'pending' ? 'pending' : draft.status === 'changes_requested' ? 'changes' : 'approved'
  const nComments = draft ? draft.comments.length : 0
  let title = '', body = '', cta = '', primary = true
  if (role === 'influencer') {
    if (st === 'none') { title = 'Trimite draftul video'; body = 'Încarcă videoclipul pentru aprobarea brandului, înainte să postezi.'; cta = 'Încarcă draftul' }
    else if (st === 'pending') { title = 'Draft trimis, așteaptă brandul'; body = 'Brandul răspunde de obicei în 48 de ore. Nu posta înainte de aprobare.'; cta = 'Vezi draftul'; primary = false }
    else if (st === 'changes') { title = 'Brandul cere modificări'; body = nComments ? `${nComments} ${nComments === 1 ? 'comentariu' : 'comentarii'} pe video. Refă clipul și trimite o versiune nouă.` : 'Refă clipul și trimite o versiune nouă.'; cta = 'Vezi modificările și trimite versiunea nouă' }
    else { title = 'Draft aprobat'; body = 'Poți posta exact varianta aprobată.'; cta = 'Vezi draftul'; primary = false }
  } else {
    if (st === 'pending') { title = 'Draft de revizuit'; body = `Creatorul a trimis versiunea ${draft!.version}. Aprobă-o sau cere modificări.`; cta = 'Revizuiește draftul' }
    else if (st === 'changes') { title = 'Ai cerut modificări'; body = 'Aștepți versiunea nouă de la creator.'; cta = 'Vezi draftul'; primary = false }
    else { title = 'Draft aprobat'; body = 'Poți descărca materialul oricând în următoarele zile.'; cta = 'Vezi draftul'; primary = false }
  }
  const tone = T[st]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'inherit', minWidth: 0 }}>
      <div style={{ background: tone.bg, border: `1.5px solid ${tone.border}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: tone.fg }}>{title}</span>
          {draft && <span style={{ fontSize: 12, fontWeight: 700, color: tone.fg }}>v{draft.version} · {fmtMB(draft.file_size)}</span>}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: '#14123a' }}>{body}</div>
        {st === 'changes' && draft?.revision_due_at && (() => {
          const ms = new Date(draft.revision_due_at).getTime() - Date.now()
          const late = ms <= 0
          const hrs = Math.ceil(ms / 3600000)
          const when = new Date(draft.revision_due_at).toLocaleString('ro-RO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
          return (
            <div style={{ background: late ? '#fde8e8' : '#fff', color: late ? '#9b1c1c' : '#14123a', borderRadius: 12, padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>
              {late ? 'Termenul a trecut' : `Termen: ${when} (mai sunt ${hrs} ${hrs === 1 ? 'oră' : 'ore'})`}
              {draft.revision_round ? ` · runda ${draft.revision_round} din 2` : ''}
            </div>
          )
        })()}
        {st === 'changes' && draft?.review_note && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '10px 12px', fontSize: 14, lineHeight: 1.45, color: '#14123a', overflowWrap: 'anywhere' }}>
            <b style={{ fontSize: 12, color: tone.fg, display: 'block', marginBottom: 2 }}>{role === 'influencer' ? 'Ce a scris brandul' : 'Ce ai cerut'}</b>
            „{draft.review_note}”
          </div>
        )}
        <button type="button" onClick={() => setOpen(true)}
          style={{ height: 48, borderRadius: 13, border: primary ? 'none' : `1.5px solid ${tone.border}`, background: primary ? accent : '#fff', color: primary ? '#fff' : '#14123a', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', padding: '0 16px' }}>
          {cta}
        </button>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Draft video"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,18,58,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: '#f6f6fc', borderRadius: 20, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 30px 80px -20px rgba(20,18,58,.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#14123a' }}>{summary}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Închide"
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e3f3', background: '#fff', cursor: 'pointer', fontSize: 16, color: '#14123a' }}>✕</button>
          </div>
          {drafts.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {drafts.map(d => (
                <button key={d.id} type="button" onClick={() => { setSel(d.id); setCur(0); setVerr(false) }}
                  style={{ padding: '6px 12px', borderRadius: 9, border: '1px solid #e5e3f3', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    fontWeight: sel === d.id ? 800 : 600, background: sel === d.id ? '#efeaff' : '#fff', color: sel === d.id ? '#4423c4' : '#6a6690' }}>
                  v{d.version}{d.id === latest?.id ? ' · actuală' : ''}
                </button>
              ))}
            </div>
          )}

          {draft && (
            <>
              {draft.viewUrl ? (
                <div style={{ background: '#14123a', borderRadius: 16, padding: 12 }}>
                  <video ref={vref} src={draft.viewUrl} controls playsInline preload="metadata"
                    onTimeUpdate={e => setCur(e.currentTarget.currentTime)}
                    onLoadedMetadata={e => { setDur(e.currentTarget.duration); setVerr(false) }}
                    onError={() => setVerr(true)}
                    style={{ display: 'block', margin: '0 auto', maxWidth: '100%', maxHeight: '60vh', borderRadius: 10, background: '#000' }} />
                  {verr && <div style={{ color: '#fff', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Browserul nu poate reda acest format. Folosește „Descarcă materialul”.</div>}
                  {dur > 0 && draft.comments.some(c => c.at_second !== null) && (
                    <div style={{ position: 'relative', height: 14, marginTop: 10 }}>
                      {draft.comments.filter(c => c.at_second !== null).map(c => (
                        <button key={c.id} type="button" title={`${fmtT(c.at_second!)} · ${c.body}`}
                          onClick={() => { if (vref.current) { vref.current.currentTime = c.at_second!; vref.current.pause() } }}
                          style={{ position: 'absolute', left: `${Math.min(98, (c.at_second! / dur) * 100)}%`, top: 0, width: 10, height: 14, borderRadius: 5, border: 0, padding: 0, cursor: 'pointer', background: '#ffd24d' }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : <div style={{ ...box, color: '#6a6690', fontSize: 13 }}>Videoclipul nu mai este disponibil.</div>}

              {draft.caption && (
                <div style={{ ...box, background: '#fbfbff', padding: 12 }}>
                  <div style={label}>Descrierea postării</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, whiteSpace: 'pre-wrap', color: '#14123a' }}>{draft.caption}</div>
                </div>
              )}
              {draft.note && <div style={{ fontSize: 13, color: '#6a6690' }}>Notă creator: „{draft.note}”</div>}
              {draft.review_note && (
                <div style={{ background: '#fff1e6', color: '#9a4206', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>
                  Brandul: „{draft.review_note}”
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={label}>Comentarii pe video ({draft.comments.length})</div>
                {draft.comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <button type="button" disabled={c.at_second === null}
                      onClick={() => { if (vref.current && c.at_second !== null) { vref.current.currentTime = c.at_second; vref.current.pause() } }}
                      style={{ background: c.at_second === null ? '#efeaff' : '#ffd24d', color: '#14123a', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontWeight: 800, border: 0, cursor: c.at_second === null ? 'default' : 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                      {c.at_second === null ? '—' : fmtT(c.at_second)}
                    </button>
                    <div style={{ fontSize: 14, lineHeight: 1.45, color: '#14123a', minWidth: 0, overflowWrap: 'anywhere' }}>
                      <b style={{ fontSize: 12, color: '#6a6690' }}>{c.author_role === 'brand' ? 'Brand' : 'Creator'} · </b>{c.body}
                    </div>
                  </div>
                ))}
                <div style={{ border: '1px solid #e5e3f3', borderRadius: 14, padding: '10px 12px', background: '#fbfbff' }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#6a6690' }}>Comentariu la {fmtT(cur)}</label>
                  <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder={role === 'brand' ? 'Scrie ce vrei să schimbe creatorul…' : 'Răspunde brandului…'}
                    style={{ width: '100%', height: 54, marginTop: 6, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, color: '#14123a', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                  <button type="button" onClick={addComment} disabled={busy || !text.trim()} style={{ ...btn(false), height: 38, opacity: busy || !text.trim() ? 0.5 : 1 }}>Adaugă comentariu</button>
                </div>
              </div>

              {role === 'brand' && draft.status === 'pending' && (
                <>
                  {askChanges ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={changesNote} onChange={e => setChangesNote(e.target.value)} maxLength={1000} placeholder="Ce trebuie modificat, pe scurt…"
                        style={{ width: '100%', height: 70, border: '1px solid #e5e3f3', borderRadius: 12, padding: 10, fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={{ ...btn(false), flex: 1 }} onClick={() => setAskChanges(false)}>Anulează</button>
                        <button type="button" style={{ ...btn(true), flex: 1.4 }} disabled={busy || !changesNote.trim()} onClick={() => review('changes')}>Trimite cererea</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" style={{ ...btn(false), flex: 1, minWidth: 140 }} onClick={() => setAskChanges(true)}>Cere modificări</button>
                      <button type="button" style={{ ...btn(true), flex: 1.4, minWidth: 160 }} disabled={busy} onClick={() => review('approve')}>Aprobă draftul</button>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#6a6690', textAlign: 'center' }}>Aprobarea draftului nu eliberează plata.</div>
                </>
              )}

              {draft.viewUrl && (
                <button type="button" onClick={download} style={{ ...btn(false), alignSelf: 'flex-start' }}>Descarcă materialul</button>
              )}
              {role === 'influencer' && draft.status === 'approved' && (
                <div style={{ background: '#dcf5ec', color: '#14532d', borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>Draft aprobat de brand. Postează exact varianta aprobată.</div>
              )}
              {role === 'influencer' && draft.status === 'pending' && (
                <div style={{ fontSize: 12, color: '#6a6690' }}>Brandul răspunde de obicei în 48 de ore. Nu posta înainte de aprobare.</div>
              )}
            </>
          )}

          {canSendNew && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: draft ? '1px solid #e5e3f3' : 0, paddingTop: draft ? 12 : 0 }}>
              <div style={label}>{draft ? 'Trimite o versiune nouă' : 'Trimite draftul video'}</div>
              <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" disabled={busy}
                onChange={e => { setErr(''); setFile(e.target.files?.[0] ?? null) }} aria-label="Alege videoclipul"
                style={{ fontSize: 13, fontFamily: 'inherit' }} />
              {file && <div style={{ fontSize: 12, color: '#6a6690' }}>{file.name} · {fmtMB(file.size)}</div>}
              <textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} placeholder="Descrierea postării (opțional)"
                style={{ width: '100%', height: 62, border: '1px solid #e5e3f3', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, resize: 'none', background: '#fbfbff', boxSizing: 'border-box' }} />
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="Notă pentru brand (opțional)"
                style={{ width: '100%', height: 42, border: '1px solid #e5e3f3', borderRadius: 12, padding: '0 12px', fontFamily: 'inherit', fontSize: 13, background: '#fbfbff', boxSizing: 'border-box' }} />
              {prog !== null && (
                <div>
                  <div style={{ height: 6, borderRadius: 3, background: '#e5e3f3', overflow: 'hidden' }}><div style={{ width: `${prog}%`, height: '100%', background: '#16a06c', transition: 'width .2s' }} /></div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#14532d', marginTop: 6 }}>{prog < 100 ? `Se încarcă… ${prog}%` : 'Se finalizează…'}</div>
                </div>
              )}
              <button type="button" onClick={upload} disabled={!file || busy} style={{ ...btn(true), background: 'linear-gradient(135deg,#7040f0,#9030f0)', opacity: !file || busy ? 0.5 : 1 }}>
                Trimite la aprobare
              </button>
              <div style={{ fontSize: 12, color: '#6a6690' }}>MP4, MOV sau WebM, maximum 200 MB. Materialul se șterge automat la 10 zile după finalizarea colaborării.</div>
            </div>
          )}
          {err && <div role="alert" style={{ color: '#b42318', fontSize: 13, fontWeight: 600 }}>{err}</div>}
        </div>
        </div>
      )}
      {err && !open && <div role="alert" style={{ color: '#b42318', fontSize: 13, fontWeight: 600 }}>{err}</div>}
    </div>
  )
}
