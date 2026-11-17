'use client'
// Briefuri individuale: brandul / adminul scrie mai multe briefuri și le dă creatorilor
// (același brief la mai mulți sau câte unul pentru fiecare). Folosit în pagina campaniei la brand și în admin.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Pencil, Trash2, Link2, ExternalLink, Check, Loader2, X } from 'lucide-react'
import { listCampaignBriefs, saveCampaignBrief, deleteCampaignBrief, assignCampaignBrief } from '@/app/actions/campaign-briefs'
import { briefSummary, type CampaignBrief, type BriefCreator } from '@/lib/campaign-briefs'

const C = { ink: '#14123a', muted: '#6a6690', line: '#e5e3f3', soft: '#f6f5fc', violet: '#5a35e6', violetSoft: '#efeaff', green: '#14532d', greenSoft: '#dcf5ec', red: '#b42318', redSoft: '#fde8e6', amber: '#92400e', amberSoft: '#fef3c7' }
const SHOWN = ['ACTIVE', 'COMPLETED', 'INVITED']
const STATUS_RO: Record<string, string> = { ACTIVE: 'Activ', COMPLETED: 'Finalizat', INVITED: 'Invitat', PENDING: 'Aplicant' }

type Form = { id?: string; title: string; body: string; file_url: string; ref_url: string }
const EMPTY: Form = { title: '', body: '', file_url: '', ref_url: '' }

const btn = (primary = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  border: primary ? 'none' : `1px solid ${C.line}`, background: primary ? C.violet : '#fff', color: primary ? '#fff' : C.ink,
})
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, color: C.ink, background: '#fff', boxSizing: 'border-box' }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4 }

export default function BriefsPanel({ campaignId }: { campaignId: string }) {
  const [briefs, setBriefs] = useState<CampaignBrief[]>([])
  const [creators, setCreators] = useState<BriefCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [bulkBrief, setBulkBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | 'none'>('all')
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const r = await listCampaignBriefs(campaignId)
    if ('error' in r) setErr(r.error)
    else { setErr(''); setBriefs(r.briefs); setCreators(r.creators) }
    setLoading(false)
  }, [campaignId])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => creators.filter(c => SHOWN.includes(c.status) && (filter === 'all' || !c.briefId)), [creators, filter])
  const sum = useMemo(() => briefSummary(briefs, creators), [briefs, creators])
  const letter = (i: number) => String.fromCharCode(65 + (i % 26))

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  async function save() {
    if (!form) return
    setSaving(true); setErr('')
    const r = await saveCampaignBrief(campaignId, form)
    setSaving(false)
    if ('error' in r) { setErr(r.error); return }
    flash(form.id ? 'Brief salvat. Creatorii care îl aveau trebuie să-l bifeze din nou.' : 'Brief creat. Acum dă-l creatorilor de mai jos.')
    setForm(null); load()
  }

  async function remove(b: CampaignBrief) {
    const n = sum.per[b.id]?.assigned || 0
    if (!window.confirm(`Ștergi „${b.title}”?${n ? ` ${n} ${n === 1 ? 'creator rămâne' : 'creatori rămân'} fără brief.` : ''}`)) return
    const r = await deleteCampaignBrief(campaignId, b.id)
    if ('error' in r) { setErr(r.error); return }
    flash('Brief șters.'); load()
  }

  async function assign(ids: string[], briefId: string | null) {
    setBusy(true); setErr('')
    const r = await assignCampaignBrief(campaignId, ids, briefId)
    setBusy(false)
    if ('error' in r) { setErr(r.error); return }
    flash(briefId ? `Brief dat la ${r.count} ${r.count === 1 ? 'creator' : 'creatori'}. Au primit notificare.` : 'Brief scos.')
    setSel([]); load()
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 14 }}>Se încarcă…</div>

  const allSel = shown.length > 0 && shown.every(c => sel.includes(c.collabId))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: C.ink }}>
      {/* Antet */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0, maxWidth: 560 }}>
          <div style={{ fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} color={C.violet} /> Briefuri individuale</div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            Scrie unul sau mai multe briefuri și dă-le creatorilor: același brief la mai mulți sau câte unul pentru fiecare. Fiecare creator își vede doar briefil lui și bifează că l-a citit înainte să posteze.
          </p>
        </div>
        {!form && <button style={btn(true)} onClick={() => setForm({ ...EMPTY, title: `Brief ${letter(briefs.length)}` })}><Plus size={15} /> Brief nou</button>}
      </div>

      {err && <div style={{ padding: '10px 14px', borderRadius: 12, background: C.redSoft, color: C.red, fontSize: 13, fontWeight: 600 }}>{err}</div>}
      {msg && <div style={{ padding: '10px 14px', borderRadius: 12, background: C.greenSoft, color: C.green, fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      {/* Formular */}
      {form && (
        <div style={{ border: `1px solid ${C.violet}`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{form.id ? 'Editează briefil' : 'Brief nou'}</div>
          <div>
            <span style={label}>Titlu</span>
            <input style={input} value={form.title} maxLength={120} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="ex. Brief A · Rutina de dimineață" />
          </div>
          <div>
            <span style={label}>Ce trebuie să facă creatorul</span>
            <textarea style={{ ...input, minHeight: 180, resize: 'vertical', lineHeight: 1.5 }} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder={'Scriptul, mesajele cheie, ce să arate, ce să evite…'} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <span style={label}>Link la fișier (opțional)</span>
              <input style={input} value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://drive.google.com/…" />
            </div>
            <div>
              <span style={label}>Video / postare de referință (opțional)</span>
              <input style={input} value={form.ref_url} onChange={e => setForm({ ...form, ref_url: e.target.value })} placeholder="https://www.instagram.com/reel/…" />
            </div>
          </div>
          {form.id && (sum.per[form.id]?.assigned || 0) > 0 && (
            <div style={{ fontSize: 12, color: C.amber, background: C.amberSoft, padding: '8px 12px', borderRadius: 10 }}>
              La salvare, cei {sum.per[form.id].assigned} creatori care au acest brief primesc notificare și trebuie să-l bifeze din nou.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button style={btn()} onClick={() => setForm(null)} disabled={saving}>Anulează</button>
            <button style={btn(true)} onClick={save} disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvează</button>
          </div>
        </div>
      )}

      {/* Lista briefurilor */}
      {briefs.length === 0 && !form && (
        <div style={{ padding: 20, borderRadius: 16, background: C.soft, fontSize: 14, color: C.muted, textAlign: 'center' }}>
          Nu ai încă briefuri individuale. Creatorii văd doar briefil general al campaniei.
        </div>
      )}
      {briefs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {briefs.map(b => {
            const s = sum.per[b.id] || { assigned: 0, read: 0 }
            return (
              <div key={b.id} style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <b style={{ fontSize: 15, overflowWrap: 'anywhere' }}>{b.title}</b>
                  <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
                    <button title="Editează" style={{ ...btn(), padding: 6 }} onClick={() => setForm({ id: b.id, title: b.title, body: b.body, file_url: b.file_url || '', ref_url: b.ref_url || '' })}><Pencil size={14} /></button>
                    <button title="Șterge" style={{ ...btn(), padding: 6, color: C.red }} onClick={() => remove(b)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, fontWeight: 700 }}>
                  <span style={{ padding: '2px 9px', borderRadius: 99, background: C.violetSoft, color: C.violet }}>{s.assigned} {s.assigned === 1 ? 'creator' : 'creatori'}</span>
                  {s.assigned > 0 && <span style={{ padding: '2px 9px', borderRadius: 99, background: s.read === s.assigned ? C.greenSoft : C.amberSoft, color: s.read === s.assigned ? C.green : C.amber }}>{s.read} din {s.assigned} au citit</span>}
                </div>
                {b.body && (
                  <div style={{ fontSize: 13, color: '#2b2955', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...(open[b.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }) }}>{b.body}</div>
                )}
                {b.body && b.body.length > 220 && (
                  <button onClick={() => setOpen(o => ({ ...o, [b.id]: !o[b.id] }))} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: C.violet, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{open[b.id] ? 'Mai puțin' : 'Citește tot'}</button>
                )}
                {(b.file_url || b.ref_url) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {b.file_url && <a href={b.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.violet, fontWeight: 700, display: 'inline-flex', gap: 5, alignItems: 'center' }}><Link2 size={13} /> Fișierul briefului <ExternalLink size={11} /></a>}
                    {b.ref_url && <a href={b.ref_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.violet, fontWeight: 700, display: 'inline-flex', gap: 5, alignItems: 'center' }}><Link2 size={13} /> Referință <ExternalLink size={11} /></a>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Cine ce brief are */}
      {briefs.length > 0 && (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}` }}>
            <b style={{ fontSize: 14 }}>Creatori ({shown.length}){sum.withoutBrief > 0 && <span style={{ color: C.amber, fontWeight: 700 }}> · {sum.withoutBrief} fără brief</span>}</b>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'none'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...btn(), padding: '5px 11px', fontSize: 12, background: filter === f ? C.ink : '#fff', color: filter === f ? '#fff' : C.ink, border: filter === f ? 'none' : `1px solid ${C.line}` }}>
                  {f === 'all' ? 'Toți' : 'Fără brief'}
                </button>
              ))}
            </div>
          </div>

          {sel.length > 0 && (
            <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: C.violetSoft }}>
              <b style={{ fontSize: 13 }}>{sel.length} {sel.length === 1 ? 'selectat' : 'selectați'}</b>
              <select value={bulkBrief} onChange={e => setBulkBrief(e.target.value)} style={{ ...input, width: 'auto', minWidth: 180, padding: '7px 10px' }}>
                <option value="">Alege briefil…</option>
                {briefs.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <button style={btn(true)} disabled={!bulkBrief || busy} onClick={() => assign(sel, bulkBrief)}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Dă briefil</button>
              <button style={btn()} disabled={busy} onClick={() => assign(sel, null)}>Scoate briefil</button>
              <button style={{ ...btn(), padding: 6 }} title="Renunță" onClick={() => setSel([])}><X size={14} /></button>
            </div>
          )}

          {shown.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: C.muted, textAlign: 'center' }}>
              {filter === 'none' ? 'Toți creatorii au brief.' : 'Încă nu ai creatori selectați în campanie.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    <th style={{ padding: '8px 14px', width: 28 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? [] : shown.map(c => c.collabId))} /></th>
                    <th style={{ padding: '8px 6px' }}>Creator</th>
                    <th style={{ padding: '8px 6px' }}>Stare</th>
                    <th style={{ padding: '8px 6px' }}>Brief</th>
                    <th style={{ padding: '8px 14px 8px 6px' }}>Citit</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(c => (
                    <tr key={c.collabId} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: '8px 14px' }}><input type="checkbox" checked={sel.includes(c.collabId)} onChange={() => setSel(s => s.includes(c.collabId) ? s.filter(x => x !== c.collabId) : [...s, c.collabId])} /></td>
                      <td style={{ padding: '8px 6px' }}>
                        <b>{c.name}</b>
                        {c.handle && <div style={{ fontSize: 11, color: C.muted }}>@{c.handle.replace(/^@/, '')}</div>}
                      </td>
                      <td style={{ padding: '8px 6px', color: C.muted }}>{STATUS_RO[c.status] || c.status}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <select value={c.briefId || ''} disabled={busy} onChange={e => assign([c.collabId], e.target.value || null)}
                          style={{ ...input, padding: '6px 8px', fontSize: 13, minWidth: 150, borderColor: c.briefId ? C.line : '#f5c97a', background: c.briefId ? '#fff' : '#fffbeb' }}>
                          <option value="">— fără brief —</option>
                          {briefs.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 14px 8px 6px', whiteSpace: 'nowrap' }}>
                        {!c.briefId ? <span style={{ color: C.muted }}>—</span>
                          : c.ackAt ? <span style={{ color: C.green, fontWeight: 700 }}>✓ {new Date(c.ackAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                          : <span style={{ color: C.amber, fontWeight: 700 }}>Necitit</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
