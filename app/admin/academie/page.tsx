'use client'
// Admin → Academie: lecțiile (ordine, ciornă/publicată), editorul de conținut și de întrebări, importul din text.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Plus, ChevronUp, ChevronDown, Trash2, Eye, RefreshCw } from 'lucide-react'
import AcademyPeople from '@/components/admin/AcademyPeople'
import { adminAcademy, adminSaveLesson, adminDeleteLesson, adminMoveLesson } from '@/app/actions/academy'
import { parseQuestionsText, passNeeded, videoEmbed, TIERS, TIER_ORDER, type AcademyLesson, type AcademyQuestion, type AcademyStep } from '@/lib/academy'

type Row = AcademyLesson & { stats: { tried: number; passed: number } }
const LETTERS = ['A', 'B', 'C', 'D']
const EMPTY: Omit<AcademyLesson, 'id' | 'position'> = {
  title: '', summary: '', badge_name: '', minutes: 5, points: 20, body: '', video_url: '', questions: [], steps: [], pass_min: 0, published: false,
}

export default function AdminAcademiePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [meta, setMeta] = useState<{ started: number; certified: number; byTier?: Record<string, number> }>({ started: 0, certified: 0 })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selId, setSelId] = useState<string | 'new' | null>(null)
  const [f, setF] = useState<any>(EMPTY)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const [tab, setTab] = useState<'people' | 'lessons'>('people')

  async function load(keep?: string | null) {
    setLoading(true); setErr('')
    const r: any = await adminAcademy()
    setLoading(false)
    if (r?.error) { setErr(r.error); return }
    setRows(r.lessons); setMeta({ started: r.started, certified: r.certified, byTier: r.byTier })
    const want = keep ?? selId
    const pick = (want && want !== 'new' && r.lessons.find((l: Row) => l.id === want)) || (want === 'new' ? null : r.lessons[0])
    if (pick) open(pick)
    else if (want !== 'new') { setSelId(null) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function open(l: Row | null) {
    setConfirmDel(false); setNote(''); setImportOpen(false); setDirty(false)
    if (!l) { setSelId('new'); setF({ ...EMPTY, questions: [], steps: [] }); return }
    setSelId(l.id)
    setF({ ...l, summary: l.summary || '', badge_name: l.badge_name || '', body: l.body || '', video_url: l.video_url || '', questions: l.questions.map(q => ({ ...q, options: [...q.options] })), steps: (l.steps || []).map(st => ({ ...st, ...(st.type === 'concept' ? { checklist: [...(st.checklist || [])] } : {}) })) })
  }
  function set(k: string, v: any) { setF((p: any) => ({ ...p, [k]: v })); setDirty(true); setNote('') }
  function setQ(i: number, patch: Partial<AcademyQuestion>) { set('questions', f.questions.map((q: AcademyQuestion, k: number) => k === i ? { ...q, ...patch } : q)) }
  function setOpt(i: number, j: number, v: string) { const q = f.questions[i]; setQ(i, { options: q.options.map((o: string, k: number) => k === j ? v : o) }) }
  function addOpt(i: number) { const q = f.questions[i]; if (q.options.length < 4) setQ(i, { options: [...q.options, ''] }) }
  function delOpt(i: number, j: number) {
    const q = f.questions[i]; if (q.options.length <= 2) return
    const options = q.options.filter((_: string, k: number) => k !== j)
    setQ(i, { options, correct: q.correct === j ? 0 : q.correct > j ? q.correct - 1 : q.correct })
  }
  function addQ() { set('questions', [...f.questions, { q: '', options: ['', '', ''], correct: 0, explain: '' }]) }
  function delQ(i: number) { set('questions', f.questions.filter((_: any, k: number) => k !== i)) }
  function moveQ(i: number, d: -1 | 1) {
    const j = i + d; if (j < 0 || j >= f.questions.length) return
    const a = [...f.questions]; [a[i], a[j]] = [a[j], a[i]]; set('questions', a)
  }

  function setStep(i: number, patch: any) { set('steps', f.steps.map((st: any, k: number) => k === i ? { ...st, ...patch } : st)) }
  function addStep(type: AcademyStep['type']) {
    const blank: any = type === 'concept' ? { type, title: '', what: '', why: '', bad: '', good: '', checklist: [] }
      : type === 'choose' ? { type, prompt: '', a: '', b: '', better: 'b', explain: '' } : { type, prompt: '', brief: '', example: '', why: '' }
    set('steps', [...(f.steps || []), blank])
  }
  function delStep(i: number) { set('steps', f.steps.filter((_: any, k: number) => k !== i)) }
  function moveStep(i: number, d: -1 | 1) { const j = i + d; if (j < 0 || j >= f.steps.length) return; const a = [...f.steps]; [a[i], a[j]] = [a[j], a[i]]; set('steps', a) }

  const parsed = useMemo(() => importText.trim() ? parseQuestionsText(importText) : null, [importText])
  function applyImport(mode: 'replace' | 'append') {
    if (!parsed?.questions.length) return
    set('questions', mode === 'replace' ? parsed.questions : [...f.questions, ...parsed.questions])
    setImportOpen(false); setImportText('')
    setNote(`Am importat ${parsed.questions.length} întrebări. Nu uita să salvezi.`)
  }

  async function save(publish?: boolean) {
    setSaving(true); setNote('')
    const payload = { ...f, published: publish === undefined ? f.published : publish }
    if (selId && selId !== 'new') payload.id = selId
    const r: any = await adminSaveLesson(payload)
    setSaving(false)
    if (r?.error) { setNote('⚠️ ' + r.error); return }
    await load(r.id)
    setNote(publish ? 'Lecția e publicată. Creatorii o văd în Academie.' : 'Salvat.')
  }
  async function del() {
    if (!selId || selId === 'new') return
    const r: any = await adminDeleteLesson(selId)
    if (r?.error) { setNote('⚠️ ' + r.error); setConfirmDel(false); return }
    setSelId(null); await load(null)
  }
  async function move(id: string, d: -1 | 1) { await adminMoveLesson(id, d); await load(selId) }

  const qCount = f.questions?.length || 0
  const needed = passNeeded(Number(f.pass_min) || 0, qCount)
  const badVideo = f.video_url && !videoEmbed(f.video_url)
  const sel = rows.find(r => r.id === selId)

  return (
    <div style={{ padding: '20px 16px 48px', maxWidth: 1200, margin: '0 auto', color: '#14123a' }}>
      <style>{`
        .aa-in { width: 100%; box-sizing: border-box; height: 42px; border: 1px solid #e3e0f0; border-radius: 12px; padding: 0 12px; font: inherit; font-size: 14px; color: #14123a; background: #fff; }
        .aa-in:focus, .aa-ta:focus { outline: 2px solid #c9bdf7; border-color: #5b2fd0; }
        .aa-ta { width: 100%; box-sizing: border-box; border: 1px solid #e3e0f0; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 14px; line-height: 1.55; color: #14123a; resize: vertical; background: #fff; }
        .aa-l { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 800; color: #4a4770; min-width: 0; }
        .aa-b { height: 40px; padding: 0 14px; border-radius: 12px; border: 1px solid #e3e0f0; background: #fff; font: inherit; font-weight: 700; font-size: 13.5px; color: #14123a; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .aa-b:disabled { opacity: .5; cursor: default; }
        .aa-b.p { background: #5b2fd0; border-color: #5b2fd0; color: #fff; font-weight: 800; }
        .aa-b.d { background: #14123a; border-color: #14123a; color: #fff; font-weight: 800; }
        .aa-b.r { color: #9b1c1c; }
        .aa-ib { width: 34px; height: 34px; border-radius: 10px; border: 1px solid #e3e0f0; background: #fff; display: grid; place-items: center; cursor: pointer; color: #4a4770; flex: none; }
        .aa-ib:disabled { opacity: .35; cursor: default; }
        .aa-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6b6890', display: 'flex', alignItems: 'center', gap: 6 }}><GraduationCap size={14} /> Admin · Academie</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Lecții</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="bg-white border rounded-2xl" style={{ padding: '6px 14px' }}><b style={{ fontSize: 18 }}>{meta.certified}</b> <span style={{ fontSize: 12, color: '#5a5780' }}>creatori certificați</span></div>
          <div className="bg-white border rounded-2xl" style={{ padding: '6px 14px' }}><b style={{ fontSize: 18 }}>{meta.started}</b> <span style={{ fontSize: 12, color: '#5a5780' }}>au început</span></div>
          {meta.certified > 0 && meta.byTier && (
            <div className="bg-white border rounded-2xl" style={{ padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
              {TIER_ORDER.map(k => <span key={k} title={TIERS[k].label} style={{ fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: TIERS[k].bg, color: TIERS[k].fg }}>{TIERS[k].label} {meta.byTier?.[k] || 0}</span>)}
            </div>
          )}
          <button className="aa-b" onClick={() => load(selId)}><RefreshCw size={14} /> Reîncarcă</button>
          <button className="aa-b p" onClick={() => open(null)}><Plus size={16} /> Lecție nouă</button>
        </div>
      </div>

      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err}</div>}

      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: '1px solid #e8e5f3' }}>
        {([['people', 'Creatori'], ['lessons', 'Lecția și testul']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            style={{ height: 42, padding: '0 14px', border: 0, background: 'none', font: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer', color: tab === k ? '#5b2fd0' : '#6b6890', borderBottom: `3px solid ${tab === k ? '#5b2fd0' : 'transparent'}`, marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {tab === 'people' && <AcademyPeople onChange={() => load(selId)} />}

      <div style={{ display: tab === 'lessons' ? 'flex' : 'none', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <aside className="bg-white border rounded-2xl" style={{ flex: '1 1 280px', minWidth: 0, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loading && !rows.length && <p style={{ padding: 10, fontSize: 13 }}>Se încarcă…</p>}
          {!loading && !rows.length && !err && <p style={{ padding: 10, fontSize: 13, color: '#5a5780' }}>Nicio lecție încă. Apasă „Lecție nouă”.</p>}
          {rows.map((l, k) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12, padding: 6, background: l.id === selId ? '#f1edff' : 'transparent' }}>
              <button onClick={() => open(l)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 0, padding: '4px 6px', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
                <b style={{ fontSize: 14, display: 'block' }}>{k + 1}. {l.title}</b>
                <span style={{ fontSize: 12, color: '#5a5780' }}>{l.minutes} min · {l.questions.length} întrebări · +{l.points} p · {l.stats.passed}/{l.stats.tried} au trecut</span>
              </button>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99, flex: 'none', background: l.published ? '#dcf5ec' : '#f1f0f8', color: l.published ? '#14532d' : '#4a4770' }}>{l.published ? 'Publicată' : 'Ciornă'}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="aa-ib" style={{ width: 26, height: 22 }} disabled={k === 0} onClick={() => move(l.id, -1)} aria-label="Mută mai sus"><ChevronUp size={14} /></button>
                <button className="aa-ib" style={{ width: 26, height: 22 }} disabled={k === rows.length - 1} onClick={() => move(l.id, 1)} aria-label="Mută mai jos"><ChevronDown size={14} /></button>
              </div>
            </div>
          ))}
        </aside>

        {selId && (
          <main className="bg-white border rounded-2xl" style={{ flex: '999 1 560px', minWidth: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selId === 'new' ? 'Lecție nouă' : `Editezi: ${sel?.title || ''}`}{dirty && <span style={{ fontSize: 12, color: '#b4500a', marginLeft: 8 }}>· nesalvat</span>}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selId !== 'new' && f.published && <Link href={`/influencer/academie/${selId}`} target="_blank" className="aa-b"><Eye size={14} /> Vezi ca un creator</Link>}
                <button className="aa-b" disabled={saving} onClick={() => save()}>{f.published ? 'Salvează' : 'Salvează ciorna'}</button>
                {f.published
                  ? <button className="aa-b" disabled={saving} onClick={() => save(false)}>Treci pe ciornă</button>
                  : <button className="aa-b d" disabled={saving} onClick={() => save(true)}>Publică</button>}
              </div>
            </div>
            {note && <div style={{ fontSize: 13.5, fontWeight: 700, color: note.startsWith('⚠️') ? '#9b1c1c' : '#14532d' }}>{note}</div>}

            <div className="aa-grid">
              <label className="aa-l" style={{ gridColumn: '1 / -1' }}>Titlu lecție<input className="aa-in" value={f.title} onChange={e => set('title', e.target.value)} /></label>
              <label className="aa-l" style={{ gridColumn: '1 / -1' }}>Rezumat (apare pe cardul lecției)<input className="aa-in" value={f.summary} onChange={e => set('summary', e.target.value)} /></label>
              <label className="aa-l">Durată (min)<input className="aa-in" type="number" min={1} value={f.minutes} onChange={e => set('minutes', e.target.value)} /></label>
              <label className="aa-l">Puncte la trecere<input className="aa-in" type="number" min={0} value={f.points} onChange={e => set('points', e.target.value)} /></label>
              <label className="aa-l">Răspunsuri corecte necesare<input className="aa-in" type="number" min={0} value={f.pass_min} onChange={e => set('pass_min', e.target.value)} /><span style={{ fontWeight: 600, color: '#6b6890' }}>{qCount ? `Trece cu ${needed} din ${qCount}${!Number(f.pass_min) ? ' (80%)' : ''}` : '0 = 80% din întrebări'}</span></label>
              <label className="aa-l">Nume badge<input className="aa-in" value={f.badge_name} onChange={e => set('badge_name', e.target.value)} /></label>
            </div>

            <label className="aa-l">Video (opțional) · link YouTube sau Vimeo
              <input className="aa-in" value={f.video_url} placeholder="https://youtu.be/…" onChange={e => set('video_url', e.target.value)} />
              {badVideo && <span style={{ color: '#9b1c1c', fontWeight: 700 }}>Linkul nu pare YouTube sau Vimeo, nu va apărea în lecție.</span>}
            </label>

            <label className="aa-l">Text introductiv (opțional, apare înaintea pașilor)
              <textarea className="aa-ta" rows={4} value={f.body} onChange={e => set('body', e.target.value)} />
              <span style={{ fontWeight: 600, color: '#6b6890' }}>Rând gol = paragraf nou · **text** = bold · „&gt; ” la început = casetă de atenție · „- ” = listă</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#4a4770' }}>Pașii lecției · {(f.steps || []).length} (înainte de test)</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="aa-b" onClick={() => addStep('concept')}><Plus size={14} /> Concept</button>
                  <button className="aa-b" onClick={() => addStep('choose')}><Plus size={14} /> Care e mai bun?</button>
                  <button className="aa-b" onClick={() => addStep('exercise')}><Plus size={14} /> Exercițiu</button>
                </div>
              </div>
              {(f.steps || []).map((st: any, i: number) => (
                <div key={i} style={{ border: '1px solid #ece9f5', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: st.type === 'concept' ? '#fcfbff' : st.type === 'choose' ? '#f7faff' : '#f6fcf9' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <b style={{ fontSize: 12, color: '#6b6890', flex: 1 }}>{i + 1}. {st.type === 'concept' ? 'Concept' : st.type === 'choose' ? 'Care e mai bun?' : 'Exercițiu'}</b>
                    <button className="aa-ib" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Mai sus"><ChevronUp size={14} /></button>
                    <button className="aa-ib" disabled={i === f.steps.length - 1} onClick={() => moveStep(i, 1)} aria-label="Mai jos"><ChevronDown size={14} /></button>
                    <button className="aa-ib" onClick={() => delStep(i)} aria-label="Șterge pasul" style={{ color: '#9b1c1c' }}><Trash2 size={14} /></button>
                  </div>
                  {st.type === 'concept' && (<>
                    <input className="aa-in" style={{ fontWeight: 700 }} value={st.title} placeholder="Titlu (ex. Hook-ul)" onChange={e => setStep(i, { title: e.target.value })} />
                    <textarea className="aa-ta" rows={2} value={st.what} placeholder="Ce este" onChange={e => setStep(i, { what: e.target.value })} />
                    <textarea className="aa-ta" rows={2} value={st.why} placeholder="De ce contează pentru brand" onChange={e => setStep(i, { why: e.target.value })} />
                    <div className="aa-grid">
                      <textarea className="aa-ta" rows={2} value={st.bad} placeholder="Așa nu (opțional)" onChange={e => setStep(i, { bad: e.target.value })} />
                      <textarea className="aa-ta" rows={2} value={st.good} placeholder="Așa da (opțional)" onChange={e => setStep(i, { good: e.target.value })} />
                    </div>
                    <textarea className="aa-ta" rows={3} value={(st.checklist || []).join('\n')} placeholder="Verifică înainte să postezi: câte un punct pe rând" onChange={e => setStep(i, { checklist: e.target.value.split('\n') })} />
                  </>)}
                  {st.type === 'choose' && (<>
                    <input className="aa-in" style={{ fontWeight: 700 }} value={st.prompt} placeholder="Întrebarea (ex. Care caption e mai bun?)" onChange={e => setStep(i, { prompt: e.target.value })} />
                    {(['a', 'b'] as const).map(k => (
                      <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <input type="radio" name={`st${i}`} checked={st.better === k} onChange={() => setStep(i, { better: k })} style={{ width: 18, height: 18, accentColor: '#1f9d6b', marginTop: 10, flex: 'none' }} aria-label={`Varianta ${k.toUpperCase()} e mai bună`} />
                        <textarea className="aa-ta" rows={2} value={st[k]} placeholder={`Varianta ${k.toUpperCase()}`} onChange={e => setStep(i, { [k]: e.target.value })} style={st.better === k ? { borderColor: '#1f9d6b' } : undefined} />
                      </label>
                    ))}
                    <input className="aa-in" value={st.explain} placeholder="De ce e mai bună (apare după alegere)" onChange={e => setStep(i, { explain: e.target.value })} />
                  </>)}
                  {st.type === 'exercise' && (<>
                    <input className="aa-in" style={{ fontWeight: 700 }} value={st.prompt} placeholder="Cerința (ex. Scrie hook-ul pentru…)" onChange={e => setStep(i, { prompt: e.target.value })} />
                    <textarea className="aa-ta" rows={2} value={st.brief} placeholder="Din brief (contextul)" onChange={e => setStep(i, { brief: e.target.value })} />
                    <textarea className="aa-ta" rows={2} value={st.example} placeholder="Un exemplu bun" onChange={e => setStep(i, { example: e.target.value })} />
                    <input className="aa-in" value={st.why} placeholder="De ce merge exemplul" onChange={e => setStep(i, { why: e.target.value })} />
                  </>)}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#4a4770' }}>Test · {qCount} întrebări</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="aa-b" onClick={() => setImportOpen(v => !v)}>Importă din text</button>
                  <button className="aa-b" style={{ color: '#5b2fd0' }} onClick={addQ}><Plus size={14} /> Întrebare</button>
                </div>
              </div>

              {importOpen && (
                <div style={{ border: '1.5px dashed #d9d4ee', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#fcfbff' }}>
                  <span style={{ fontSize: 13, color: '#4a4770' }}>Lipește întrebările în formatul: „1. Întrebare”, apoi „A. …”, „B. …”, „C. …” și „✅ Răspuns corect: B — explicație (opțional)”.</span>
                  <textarea className="aa-ta" rows={8} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'1. Cum trebuie să fie hook-ul unui videoclip?\nA. …\nB. …\nC. …\n✅ Răspuns corect: B'} />
                  {parsed && <span style={{ fontSize: 13, fontWeight: 700, color: parsed.questions.length ? '#14532d' : '#9b1c1c' }}>Am găsit {parsed.questions.length} întrebări{parsed.errors.length ? ` · ${parsed.errors.length} cu probleme: ${parsed.errors.join('; ')}` : ''}</span>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="aa-b p" disabled={!parsed?.questions.length} onClick={() => applyImport('replace')}>Înlocuiește întrebările</button>
                    <button className="aa-b" disabled={!parsed?.questions.length} onClick={() => applyImport('append')}>Adaugă la final</button>
                  </div>
                </div>
              )}

              {f.questions.map((q: AcademyQuestion, i: number) => (
                <div key={i} style={{ border: '1px solid #ece9f5', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#fcfbff' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <b style={{ fontSize: 13, color: '#6b6890', width: 26, flex: 'none' }}>{i + 1}.</b>
                    <input className="aa-in" style={{ fontWeight: 700 }} value={q.q} placeholder="Întrebarea" aria-label={`Întrebarea ${i + 1}`} onChange={e => setQ(i, { q: e.target.value })} />
                    <button className="aa-ib" disabled={i === 0} onClick={() => moveQ(i, -1)} aria-label="Mai sus"><ChevronUp size={14} /></button>
                    <button className="aa-ib" disabled={i === f.questions.length - 1} onClick={() => moveQ(i, 1)} aria-label="Mai jos"><ChevronDown size={14} /></button>
                    <button className="aa-ib" onClick={() => delQ(i)} aria-label="Șterge întrebarea" style={{ color: '#9b1c1c' }}><Trash2 size={14} /></button>
                  </div>
                  {q.options.map((o, j) => (
                    <label key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 32 }}>
                      <input type="radio" name={`q${i}`} checked={q.correct === j} onChange={() => setQ(i, { correct: j })} style={{ width: 18, height: 18, accentColor: '#1f9d6b', flex: 'none' }} aria-label={`Varianta ${LETTERS[j]} e corectă`} />
                      <b style={{ fontSize: 13, width: 16, flex: 'none' }}>{LETTERS[j]}</b>
                      <input className="aa-in" value={o} onChange={e => setOpt(i, j, e.target.value)} style={q.correct === j ? { borderColor: '#1f9d6b', borderWidth: 1.5 } : undefined} />
                      <button className="aa-ib" disabled={q.options.length <= 2} onClick={e => { e.preventDefault(); delOpt(i, j) }} aria-label="Șterge varianta">×</button>
                    </label>
                  ))}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingLeft: 32, flexWrap: 'wrap' }}>
                    {q.options.length < 4 && <button className="aa-b" style={{ height: 32, fontSize: 12.5 }} onClick={() => addOpt(i)}>+ Variantă</button>}
                    <span style={{ fontSize: 12, color: '#5a5780' }}>Bifa verde marchează răspunsul corect.</span>
                  </div>
                  <input className="aa-in" style={{ marginLeft: 32, width: 'calc(100% - 32px)', fontSize: 13 }} value={q.explain || ''} placeholder="Explicație arătată după test (opțional)" onChange={e => setQ(i, { explain: e.target.value })} />
                </div>
              ))}
              {qCount === 0 && <p style={{ fontSize: 13, color: '#5a5780', margin: 0 }}>Nicio întrebare. Adaugă una sau importă din text.</p>}
            </div>

            {selId !== 'new' && (
              <div style={{ borderTop: '1px solid #ece9f5', paddingTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {!confirmDel
                  ? <button className="aa-b r" onClick={() => setConfirmDel(true)}><Trash2 size={14} /> Șterge lecția</button>
                  : <>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Sigur ștergi lecția?</span>
                    <button className="aa-b r" onClick={del}>Da, șterge</button>
                    <button className="aa-b" onClick={() => setConfirmDel(false)}>Renunță</button>
                  </>}
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}
