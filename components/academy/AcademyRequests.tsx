'use client'
// Academy Members: trimite un material la feedback sau cere analiza profilului; răspunsurile apar aici.
import { useCallback, useEffect, useState } from 'react'
import { getMyAcademyRequests, submitAcademyRequest, markAcademyRequestSeen } from '@/app/actions/academy-requests'
import { MATERIAL_TYPES, FEEDBACK_OPEN_MAX, ANALYSIS_EVERY_DAYS, type AcademyRequest, type AcademyRequestKind } from '@/lib/academy-requests'

const fmt = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })

export default function AcademyRequests() {
  const [st, setSt] = useState<any>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => getMyAcademyRequests().then(setSt).catch(() => setSt({ error: 'Nu am putut încărca cererile.' })), [])
  useEffect(() => { load() }, [load])

  if (!st) return null
  if (st.error) return <div className="ar-card"><style>{CSS}</style><p className="ar-muted">{st.error}</p></div>

  if (!st.member) {
    return (
      <div className="ar-wrap" id="cereri">
        <style>{CSS}</style>
        <div className="ar-card ar-locked">
          <div><b>🎬 Feedback pe materialele tale</b><p className="ar-muted">Trimiți un Reel, Story sau material de campanie și primești feedback de la echipa AddFame.</p></div>
          <div><b>🔎 Analiza profilului tău</b><p className="ar-muted">Puncte forte, branduri potrivite și ce poți îmbunătăți, o dată pe lună.</p></div>
          <a href="#academy-member" className="ar-btn">🔒 Disponibil pentru Academy Members</a>
        </div>
      </div>
    )
  }

  const requests: AcademyRequest[] = st.requests
  const toggle = (r: AcademyRequest) => {
    const next = open === r.id ? null : r.id
    setOpen(next)
    if (next && r.status === 'answered' && !r.seen_at) {
      markAcademyRequestSeen(r.id).catch(() => {})
      setSt((s: any) => ({ ...s, requests: s.requests.map((x: AcademyRequest) => x.id === r.id ? { ...x, seen_at: new Date().toISOString() } : x) }))
    }
  }

  return (
    <div className="ar-wrap" id="cereri">
      <style>{CSS}</style>
      <div className="ar-forms">
        <RequestForm kind="feedback" block={st.block.feedback} onDone={load} />
        <RequestForm kind="analysis" block={st.block.analysis} profileUrl={st.profileUrl} onDone={load} />
      </div>

      {requests.length > 0 && (
        <div className="ar-card">
          <b className="ar-h">Cererile tale</b>
          <ul className="ar-list">
            {requests.map(r => {
              const isNew = r.status === 'answered' && !r.seen_at
              return (
                <li key={r.id} className={open === r.id ? 'is-open' : ''}>
                  <button className="ar-row" onClick={() => toggle(r)} aria-expanded={open === r.id}>
                    <span>{r.kind === 'feedback' ? '🎬' : '🔎'}</span>
                    <span className="ar-row-t">
                      <b>{r.kind === 'feedback' ? `Feedback · ${r.material_type || 'Material'}` : 'Analiza profilului'}</b>
                      <small>Trimisă pe {fmt(r.created_at)}</small>
                    </span>
                    <span className={`ar-chip ${r.status === 'answered' ? 'ok' : ''}`}>{r.status === 'answered' ? (isNew ? 'Răspuns nou' : 'Răspuns') : 'În lucru'}</span>
                  </button>
                  {open === r.id && (
                    <div className="ar-body">
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="ar-link">{r.url}</a>}
                      {r.question && <p className="ar-q"><b>Ai întrebat:</b> {r.question}</p>}
                      {r.status !== 'answered' ? (
                        <p className="ar-muted">Echipa lucrează la răspuns. Primești notificare când e gata.</p>
                      ) : r.kind === 'feedback' ? (
                        <Answer title="Feedback" text={r.answer} />
                      ) : (<>
                        <Answer title="💪 Puncte forte" text={r.strengths} />
                        <Answer title="🤝 Branduri potrivite" text={r.brands} />
                        <Answer title="📈 Ce poți îmbunătăți" text={r.improve} />
                        {r.answer && <Answer title="Pe scurt" text={r.answer} />}
                      </>)}
                      {r.status === 'answered' && r.answered_at && (
                        <p className="ar-muted ar-small">{r.answered_by_name || 'Echipa AddFame'} · {fmt(r.answered_at)}</p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function Answer({ title, text }: { title: string; text: string | null }) {
  if (!text) return null
  return <div className="ar-ans"><b>{title}</b><p>{text}</p></div>
}

function RequestForm({ kind, block, profileUrl, onDone }: { kind: AcademyRequestKind; block: string | null; profileUrl?: string | null; onDone: () => void }) {
  const [url, setUrl] = useState(kind === 'analysis' ? profileUrl || '' : '')
  const [type, setType] = useState<string>(MATERIAL_TYPES[0])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const fb = kind === 'feedback'

  async function send() {
    setBusy(true); setMsg(null)
    const r: any = await submitAcademyRequest({ kind, url, materialType: type, question: q }).catch(() => ({ error: 'Nu am putut trimite cererea.' }))
    setBusy(false)
    if (r?.error) { setMsg({ ok: false, t: r.error }); return }
    setMsg({ ok: true, t: fb ? 'Am primit materialul. Te anunțăm când ai feedback.' : 'Am primit cererea. Te anunțăm când analiza e gata.' })
    if (fb) { setUrl(''); setQ('') } else setQ('')
    onDone()
  }

  return (
    <div className="ar-card">
      <b className="ar-h">{fb ? '🎬 Cere feedback pe un material' : '🔎 Cere analiza profilului'}</b>
      <p className="ar-muted">{fb
        ? `Reel, Story, TikTok sau material de campanie. Poți avea până la ${FEEDBACK_OPEN_MAX} materiale în așteptare.`
        : `Primești puncte forte, branduri potrivite și ce poți îmbunătăți. O analiză la ${ANALYSIS_EVERY_DAYS} de zile.`}</p>
      {block ? <p className="ar-note">{block}</p> : (<>
        {fb && (
          <label className="ar-l">Tipul materialului
            <select className="ar-in" value={type} onChange={e => setType(e.target.value)}>
              {MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}
        <label className="ar-l">{fb ? 'Linkul materialului' : 'Linkul profilului'}
          <input className="ar-in" value={url} onChange={e => setUrl(e.target.value)} placeholder={fb ? 'https://www.instagram.com/reel/…' : 'https://www.instagram.com/numele-tau/'} inputMode="url" />
        </label>
        <label className="ar-l">{fb ? 'La ce vrei feedback?' : 'Pe ce să ne concentrăm? (opțional)'}
          <textarea className="ar-in ar-ta" rows={3} value={q} onChange={e => setQ(e.target.value)} maxLength={1500}
            placeholder={fb ? 'Ex.: Începutul e destul de captivant? E clar ce recomand?' : 'Ex.: Vreau să lucrez cu branduri de beauty.'} />
        </label>
        <button className="ar-btn" disabled={busy || !url.trim() || (fb && !q.trim())} onClick={send}>{busy ? 'Se trimite…' : fb ? 'Trimite la feedback' : 'Cere analiza'}</button>
      </>)}
      {msg && <p className={msg.ok ? 'ar-ok' : 'ar-err'}>{msg.t}</p>}
    </div>
  )
}

const CSS = `
.ar-wrap{display:flex;flex-direction:column;gap:14px}
.ar-forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:14px}
.ar-card{background:#fff;border:1px solid #e8e5f3;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:10px;color:#14123a;min-width:0}
.ar-locked{background:#faf8ff}
.ar-locked b{font-size:15px}
.ar-h{font-size:16px;font-weight:800}
.ar-muted{color:#6a6690;font-size:13px;line-height:1.5;margin:0}.ar-small{font-size:12px}
.ar-note{margin:0;padding:10px 12px;border-radius:12px;background:#f5f1ff;color:#4a3a8a;font-size:13px;font-weight:600}
.ar-l{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#4a4770}
.ar-in{width:100%;box-sizing:border-box;min-height:42px;border:1px solid #e3e0f0;border-radius:12px;padding:0 12px;font:inherit;font-size:14px;font-weight:500;color:#14123a;background:#fff}
.ar-ta{padding:10px 12px;line-height:1.5;resize:vertical}
.ar-in:focus{outline:2px solid #c9bdf7;border-color:#5b2fd0}
.ar-btn{min-height:44px;padding:0 16px;border-radius:14px;border:0;background:linear-gradient(120deg,#5b2fd0,#3a8bff);color:#fff;font:inherit;font-weight:800;font-size:14.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.ar-btn:disabled{opacity:.45;cursor:not-allowed}
.ar-ok{margin:0;color:#14532d;font-weight:700;font-size:13px}
.ar-err{margin:0;color:#b42318;font-weight:700;font-size:13px}
.ar-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ar-list li{border:1px solid #eeebf7;border-radius:16px;overflow:hidden}
.ar-list li.is-open{border-color:#d9ccff}
.ar-row{width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border:0;font:inherit;color:#14123a;text-align:left;cursor:pointer}
.ar-row-t{flex:1;min-width:0;display:flex;flex-direction:column}
.ar-row-t b{font-size:14px}.ar-row-t small{font-size:12px;color:#6a6690}
.ar-chip{flex:none;font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:99px;background:#f3f1fa;color:#4a4770}
.ar-chip.ok{background:#e6f7ec;color:#14532d}
.ar-body{padding:0 14px 14px;display:flex;flex-direction:column;gap:10px}
.ar-link{font-size:12.5px;color:#5b2fd0;word-break:break-all}
.ar-q{margin:0;font-size:13.5px;color:#4a4770}
.ar-ans{background:#faf8ff;border-radius:14px;padding:12px}
.ar-ans b{font-size:13px}.ar-ans p{margin:6px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap}
`
