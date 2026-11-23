'use client'
// Admin → Academie → Cereri: feedback pe materiale și analize de profil cerute de Academy Members.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react'
import { adminAcademyRequests, adminAnswerAcademyRequest, type AdminAcademyRequest } from '@/app/actions/academy-requests'

const fmt = (iso: string) => new Date(iso).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
type Tab = 'open' | 'answered' | 'all'

export default function AdminAcademyRequestsPage() {
  const [rows, setRows] = useState<AdminAcademyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<Tab>('open')
  const [kind, setKind] = useState<'all' | 'feedback' | 'analysis'>('all')
  const [sel, setSel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    const r: any = await adminAcademyRequests().catch(() => ({ error: 'Nu am putut încărca cererile.' }))
    if (r.error) setErr(r.error); else setRows(r.requests)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const list = useMemo(() => rows
    .filter(r => tab === 'all' || r.status === tab)
    .filter(r => kind === 'all' || r.kind === kind)
    .sort((a, b) => tab === 'open' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)),
  [rows, tab, kind])
  const openCount = rows.filter(r => r.status === 'open').length
  const current = rows.find(r => r.id === sel) || null

  return (
    <div style={{ padding: '20px 16px 48px', maxWidth: 1200, margin: '0 auto', color: '#14123a' }}>
      <style>{CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div className="aq-kicker"><GraduationCap size={14} /> Admin · Academie</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Cereri Academy Members</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/admin/academie" className="aq-b"><ArrowLeft size={15} /> Lecții</Link>
          <button className="aq-b" onClick={load} disabled={loading}><RefreshCw size={15} /> Reîncarcă</button>
        </div>
      </div>

      <div className="aq-tabs">
        {([['open', `În așteptare (${openCount})`], ['answered', 'Cu răspuns'], ['all', 'Toate']] as [Tab, string][]).map(([k, l]) =>
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <span style={{ flex: 1 }} />
        <select className="aq-in" style={{ width: 'auto' }} value={kind} onChange={e => setKind(e.target.value as any)}>
          <option value="all">Feedback + analize</option>
          <option value="feedback">🎬 Doar feedback</option>
          <option value="analysis">🔎 Doar analize</option>
        </select>
      </div>

      {err && <p className="aq-err">{err}</p>}
      {loading ? <p className="aq-muted">Se încarcă…</p> : (
        <div className="aq-split">
          <ul className="aq-list">
            {list.length === 0 && <li className="aq-muted" style={{ padding: 16 }}>Nicio cerere aici.</li>}
            {list.map(r => (
              <li key={r.id}>
                <button className={`aq-item ${sel === r.id ? 'on' : ''}`} onClick={() => setSel(r.id)}>
                  <span style={{ fontSize: 18 }}>{r.kind === 'feedback' ? '🎬' : '🔎'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{r.influencer?.name || 'Creator'}</b>
                    <small>{r.kind === 'feedback' ? `Feedback · ${r.material_type || 'Material'}` : 'Analiză de profil'} · {fmt(r.created_at)}</small>
                  </span>
                  <span className={`aq-chip ${r.status === 'answered' ? 'ok' : 'wait'}`}>{r.status === 'answered' ? 'Răspuns' : 'Așteaptă'}</span>
                </button>
              </li>
            ))}
          </ul>
          <div>
            {current ? <AnswerPanel key={current.id + current.status} r={current} onSaved={load} /> : <div className="aq-card aq-muted">Alege o cerere din listă.</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function AnswerPanel({ r, onSaved }: { r: AdminAcademyRequest; onSaved: () => void }) {
  const [f, setF] = useState({ answer: r.answer || '', strengths: r.strengths || '', brands: r.brands || '', improve: r.improve || '', signedBy: r.answered_by_name || '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const set = (k: keyof typeof f) => (e: any) => setF(p => ({ ...p, [k]: e.target.value }))
  const fb = r.kind === 'feedback'
  const inf = r.influencer

  async function save() {
    setBusy(true); setMsg(null)
    const res: any = await adminAnswerAcademyRequest({ id: r.id, ...f }).catch(() => ({ error: 'Nu am putut salva.' }))
    setBusy(false)
    if (res.error) { setMsg({ ok: false, t: res.error }); return }
    setMsg({ ok: true, t: 'Trimis. Creatorul a primit notificare.' })
    onSaved()
  }

  return (
    <div className="aq-card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {inf?.avatar ? <img src={inf.avatar} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} /> : <div style={{ width: 44, height: 44, borderRadius: 12, background: '#efeafd' }} />}
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 16 }}>{inf?.name || 'Creator'}</b>
          <div className="aq-muted" style={{ fontSize: 12.5 }}>
            {inf?.instagram_handle ? `@${String(inf.instagram_handle).replace(/^@/, '')}` : ''}{inf?.email ? ` · ${inf.email}` : ''}
            {inf && !inf.member && <span className="aq-chip wait" style={{ marginLeft: 6 }}>Nu mai e membru</span>}
          </div>
        </div>
      </div>

      <div className="aq-box">
        <div className="aq-muted" style={{ fontSize: 12, fontWeight: 800 }}>{fb ? `🎬 Feedback · ${r.material_type || 'Material'}` : '🔎 Analiză de profil'} · trimisă {fmt(r.created_at)}</div>
        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="aq-link">{r.url} <ExternalLink size={12} /></a>}
        {r.question ? <p style={{ margin: 0, fontSize: 14, whiteSpace: 'pre-wrap' }}><b>Întrebarea:</b> {r.question}</p> : <p className="aq-muted" style={{ margin: 0 }}>Fără întrebare.</p>}
      </div>

      {fb ? (
        <label className="aq-l">Feedbackul tău
          <textarea className="aq-in aq-ta" rows={9} value={f.answer} onChange={set('answer')} placeholder="Ce merge bine, ce ai schimba (hook, ritm, text pe ecran, CTA) și un exemplu concret." />
        </label>
      ) : (<>
        <label className="aq-l">💪 Puncte forte
          <textarea className="aq-in aq-ta" rows={4} value={f.strengths} onChange={set('strengths')} />
        </label>
        <label className="aq-l">🤝 Branduri / nișe potrivite
          <textarea className="aq-in aq-ta" rows={4} value={f.brands} onChange={set('brands')} />
        </label>
        <label className="aq-l">📈 Ce poate îmbunătăți
          <textarea className="aq-in aq-ta" rows={4} value={f.improve} onChange={set('improve')} />
        </label>
        <label className="aq-l">Pe scurt (opțional)
          <textarea className="aq-in aq-ta" rows={2} value={f.answer} onChange={set('answer')} />
        </label>
      </>)}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <label className="aq-l" style={{ flex: '1 1 200px' }}>Semnat de (opțional)
          <input className="aq-in" value={f.signedBy} onChange={set('signedBy')} placeholder="Ex.: Natalia · altfel apare „Echipa AddFame”" />
        </label>
        <button className="aq-b p" onClick={save} disabled={busy}>{busy ? 'Se trimite…' : r.status === 'answered' ? 'Actualizează răspunsul' : 'Trimite răspunsul'}</button>
      </div>
      {msg && <p className={msg.ok ? 'aq-ok' : 'aq-err'}>{msg.t}</p>}
    </div>
  )
}

const CSS = `
.aq-kicker{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b6890;display:flex;align-items:center;gap:6px}
.aq-b{height:40px;padding:0 14px;border-radius:12px;border:1px solid #e3e0f0;background:#fff;font:inherit;font-weight:700;font-size:13.5px;color:#14123a;cursor:pointer;display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.aq-b:disabled{opacity:.5;cursor:default}
.aq-b.p{background:#5b2fd0;border-color:#5b2fd0;color:#fff;font-weight:800}
.aq-tabs{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.aq-tabs button{height:36px;padding:0 14px;border-radius:99px;border:1px solid #e3e0f0;background:#fff;font:inherit;font-weight:700;font-size:13px;color:#4a4770;cursor:pointer}
.aq-tabs button.on{background:#14123a;border-color:#14123a;color:#fff}
.aq-split{display:grid;grid-template-columns:minmax(260px,380px) 1fr;gap:16px;align-items:start}
@media (max-width:860px){.aq-split{grid-template-columns:1fr}}
.aq-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.aq-item{width:100%;display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;border:1px solid #e8e5f3;background:#fff;font:inherit;color:#14123a;text-align:left;cursor:pointer}
.aq-item.on{border-color:#5b2fd0;box-shadow:0 0 0 2px #e6dcff}
.aq-item b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aq-item small{display:block;font-size:12px;color:#6a6690}
.aq-chip{flex:none;font-size:11px;font-weight:800;padding:3px 9px;border-radius:99px}
.aq-chip.ok{background:#e6f7ec;color:#14532d}.aq-chip.wait{background:#fff4d6;color:#7a5200}
.aq-card{background:#fff;border:1px solid #e8e5f3;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:14px}
.aq-box{background:#faf8ff;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px}
.aq-link{font-size:13px;color:#5b2fd0;word-break:break-all;display:inline-flex;gap:4px;align-items:center}
.aq-l{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800;color:#4a4770}
.aq-in{width:100%;box-sizing:border-box;height:42px;border:1px solid #e3e0f0;border-radius:12px;padding:0 12px;font:inherit;font-size:14px;font-weight:500;color:#14123a;background:#fff}
.aq-ta{height:auto;padding:10px 12px;line-height:1.55;resize:vertical}
.aq-in:focus{outline:2px solid #c9bdf7;border-color:#5b2fd0}
.aq-muted{color:#6a6690;font-size:13.5px}
.aq-ok{margin:0;color:#14532d;font-weight:700;font-size:13px}
.aq-err{margin:0;color:#b42318;font-weight:700;font-size:13px}
`
