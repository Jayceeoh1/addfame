'use client'

// Academia AddFame — o lecție: pașii interactivi (concept, „care e mai bun?”, exercițiu),
// apoi testul cu verificare pe loc la fiecare întrebare, rezultatul și, la final, certificatul cu rama nivelului.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getLesson, submitLesson, checkAnswer } from '@/app/actions/academy'
import { parseBody, videoEmbed, type AcademyStep } from '@/lib/academy'
import CertificateCard from '@/components/academy/CertificateCard'
import { ACADEMY_CSS } from '../academy-css'

type Screen = 'learn' | 'quiz' | 'result'
type Page = { kind: 'intro' } | { kind: 'step'; step: AcademyStep; n: number }
const LETTERS = ['A', 'B', 'C', 'D']

export default function LectiePage() {
  const { id } = useParams() as { id: string }
  const [st, setSt] = useState<any>(null)
  const [screen, setScreen] = useState<Screen>('learn')
  const [p, setP] = useState(0)                       // pagina din partea de învățare
  const [i, setI] = useState(0)                       // întrebarea curentă
  const [answers, setAnswers] = useState<number[]>([])
  const [checks, setChecks] = useState<Record<number, { ok: boolean; correct: number; explain: string | null }>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [res, setRes] = useState<any>(null)

  useEffect(() => { getLesson(id).then(setSt).catch(() => setSt({ error: 'Nu am putut încărca lecția.' })) }, [id])

  const L = st?.lesson
  const qs: { q: string; options: string[] }[] = L?.questions || []
  const blocks = useMemo(() => parseBody(L?.body), [L?.body])
  const embed = videoEmbed(L?.video_url)
  const pages: Page[] = useMemo(() => {
    const out: Page[] = []
    if (blocks.length || embed) out.push({ kind: 'intro' })
    const steps: AcademyStep[] = L?.steps || []
    let n = 0
    steps.forEach(s => { if (s.type === 'concept') n++; out.push({ kind: 'step', step: s, n }) })
    return out
  }, [L, blocks.length, embed])
  const concepts = (L?.steps || []).filter((s: AcademyStep) => s.type === 'concept').length
  const totalUnits = pages.length + qs.length
  const doneUnits = screen === 'learn' ? p : screen === 'quiz' ? pages.length + i : totalUnits
  const pct = totalUnits ? Math.round(Math.min(1, (doneUnits + (screen === 'result' ? 0 : 1)) / totalUnits) * 100) : 0

  function top() { try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* ok */ } }
  function nextPage() { if (p < pages.length - 1) { setP(p + 1); top() } else startQuiz() }
  function prevPage() { if (p > 0) { setP(p - 1); top() } }
  function startQuiz() { setAnswers([]); setChecks({}); setI(0); setRes(null); setMsg(null); setScreen('quiz'); top() }

  async function pick(k: number) {
    if (checks[i] || busy) return
    const a = answers.slice(); a[i] = k; setAnswers(a)
    setBusy(true)
    const r: any = await checkAnswer(id, i, k).catch(() => null)
    setBusy(false)
    if (r?.success) setChecks(c => ({ ...c, [i]: { ok: r.ok, correct: r.correct, explain: r.explain } }))
    else setChecks(c => ({ ...c, [i]: { ok: false, correct: -1, explain: null } }))
  }

  async function next() {
    if (answers[i] === undefined) return
    if (i < qs.length - 1) { setI(i + 1); top(); return }
    setBusy(true); setMsg(null)
    const r: any = await submitLesson(id, answers)
    setBusy(false)
    if (r?.error) { setMsg(r.error); return }
    setRes(r)
    if (r.passed) setSt((s: any) => ({ ...s, progress: { ...(s.progress || {}), passed: true, bestScore: Math.max(s.progress?.bestScore || 0, r.score) } }))
    setScreen('result'); top()
  }

  const head = L && (
    <div className="al-top">
      <Link href="/influencer/academie" className="al-back" aria-label="Înapoi la Academie">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Academia
      </Link>
      <span className="ac-muted" style={{ fontWeight: 700 }}>Lecția {L.position} · {L.title}</span>
      <div className="ac-bar al-pbar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
    </div>
  )

  const pg = pages[p]
  const q = qs[i]
  const chk = checks[i]

  return (
    <div className="ac">
      <style>{ACADEMY_CSS}</style>
      <div className="ac-wrap al">
        {!st && <p className="ac-muted">Se încarcă…</p>}
        {st?.error && <div className="ac-card"><p>{st.error}</p><Link href="/influencer/academie" className="al-back">← Academia</Link></div>}

        {L && head}

        {/* ── Învățare ── */}
        {L && screen === 'learn' && (pages.length === 0 || !pg) && (
          <LessonStart L={L} st={st} qs={qs} concepts={concepts} onStart={startQuiz} />
        )}

        {L && screen === 'learn' && pg && (<>
          {p === 0 && (
            <div className="al-head">
              <h1>{L.title}</h1>
              <div className="al-meta">
                <span className="ac-chip v">+{L.points} puncte</span>
                <span className="ac-chip">{concepts ? `${concepts} concepte · ` : ''}{qs.length} întrebări</span>
                {st.progress?.passed && <span className="ac-chip ok">Trecută · {st.progress.bestScore}/{qs.length}</span>}
              </div>
              {L.summary && <p className="ac-muted" style={{ fontSize: 15 }}>{L.summary}</p>}
            </div>
          )}

          {pg.kind === 'intro' && (<>
            {embed && <div className="al-video"><iframe src={embed} title={L.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" /></div>}
            {blocks.length > 0 && (
              <div className="ac-card al-body">
                {blocks.map((b, k) => b.kind === 'list' ? (
                  <ul key={k} className="al-list">{b.parts.map((pp, j) => <li key={j}>{pp.map((s, n) => s.bold ? <b key={n}>{s.text}</b> : <span key={n}>{s.text}</span>)}</li>)}</ul>
                ) : (
                  <p key={k} className={b.kind === 'note' ? 'al-note' : undefined}>{b.parts[0].map((s, n) => s.bold ? <b key={n}>{s.text}</b> : <span key={n}>{s.text}</span>)}</p>
                ))}
              </div>
            )}
          </>)}

          {pg.kind === 'step' && <StepView key={p} step={pg.step} n={pg.n} total={concepts} />}

          <div className="al-nav al-sticky">
            {p > 0 && <button className="al-btn2" onClick={prevPage}>Înapoi</button>}
            <button className="al-btn" onClick={nextPage}>{p < pages.length - 1 ? 'Continuă' : `Începe testul · ${qs.length} întrebări`}</button>
          </div>
          {p === pages.length - 1 && !st.approved && !st.progress?.passed && <p className="ac-warn">Poți da testul acum, dar punctele se acordă doar profilurilor aprobate.</p>}
        </>)}

        {/* ── Test ── */}
        {L && screen === 'quiz' && q && (
          <div className="ac-card al-quiz">
            <div className="al-qtop">
              <span className="ac-chip" style={{ background: '#fff1c2', color: '#854d0e' }}>Test</span>
              <span className="al-step">{i + 1}/{qs.length}</span>
            </div>
            <h2 className="al-q">{q.q}</h2>
            <div className="al-opts" role="radiogroup" aria-label={q.q}>
              {q.options.map((o, k) => {
                const picked = answers[i] === k
                const cls = chk ? (k === chk.correct ? 'ok' : picked ? 'bad' : 'dim') : picked ? 'on' : ''
                return (
                  <button key={k} role="radio" aria-checked={picked} className={`al-opt ${cls}`} onClick={() => pick(k)} disabled={!!chk}>
                    <b>{LETTERS[k]}</b><span>{o}</span>
                  </button>
                )
              })}
            </div>
            {chk && (
              <div className={`al-fb ${chk.ok ? 'ok' : 'bad'}`}>
                <b>{chk.ok ? 'Corect!' : chk.correct >= 0 ? `Nu chiar. Răspunsul bun e ${LETTERS[chk.correct]}.` : 'Nu am putut verifica acum.'}</b>
                {chk.explain && <span>{chk.explain}</span>}
              </div>
            )}
            <div className="al-nav">
              <button className="al-btn" onClick={next} disabled={!chk || busy}>
                {busy && i === qs.length - 1 && chk ? 'Se trimite…' : i === qs.length - 1 ? 'Vezi rezultatul' : 'Următoarea'}
              </button>
            </div>
            {!st.progress?.bestScore && i === 0 && !chk && <p className="ac-muted">Prima încercare contează pentru nivelul tău de certificat (Bronze, Silver, Gold, Platinum).</p>}
            {msg && <p className="al-msg">{msg}</p>}
          </div>
        )}

        {/* ── Rezultat ── */}
        {L && screen === 'result' && res && (<>
          {res.justCertified && res.tier ? (
            <CertificateCard tier={res.tier} name={st.me?.name} avatar={st.me?.avatar} score={(st.me?.score || 0) + (res.points || 0) + (res.bonus || 0)}
              handle={st.me?.handle || ''} fresh correct={res.firstCorrect} total={res.firstTotal} bonus={res.bonus} code={res.certCode} at={res.certifiedAt} />
          ) : res.passed ? (
            <div className="ac-card al-done">
              <div className="al-medal" aria-hidden="true">{(L.badge_name || L.title || '?').slice(0, 1).toUpperCase()}</div>
              <span className="ac-label" style={{ color: '#5b2fd0' }}>{L.badge_name ? `Badge nou · ${L.badge_name}` : 'Lecție trecută'}</span>
              <h2 style={{ fontSize: 26, fontWeight: 800 }}>Lecția {L.position} e gata!</h2>
              <div className="al-chips">
                <span className="ac-chip" style={{ height: 30, padding: '0 12px', fontSize: 13 }}>Test: {res.score} din {res.total}</span>
                {res.points > 0 && <span className="ac-chip v" style={{ height: 30, padding: '0 12px', fontSize: 13, background: '#5b2fd0', color: '#fff' }}>+{res.points} puncte Creator Score</span>}
                {!res.firstPass && <span className="ac-chip">Reluat · fără puncte noi</span>}
              </div>
            </div>
          ) : (
            <div className="ac-card al-done">
              <span className="ac-label">Încă puțin</span>
              <span className="al-score">{res.score}/{res.total}</span>
              <p className="ac-muted" style={{ fontSize: 15 }}>Ai nevoie de {res.needed} răspunsuri corecte. Recitește conceptele și reia testul, poți încerca de câte ori vrei.</p>
            </div>
          )}

          {res.passed && concepts > 0 && (
            <div className="ac-card">
              <b style={{ fontSize: 15 }}>Ce ai învățat</b>
              {(L.steps as AcademyStep[]).filter(s => s.type === 'concept').map((s, k) => (
                <span key={k} className="al-learned"><Tick /> {(s as any).title}</span>
              ))}
            </div>
          )}

          <div className="al-nav">
            {!res.passed && <button className="al-btn" onClick={() => { setScreen('learn'); setP(0); top() }}>Recitește lecția</button>}
            {!res.passed && <button className="al-btn2" onClick={startQuiz}>Reia testul</button>}
            {res.passed && st.next && !res.justCertified && <Link href={`/influencer/academie/${st.next.id}`} className="al-btn">Lecția {st.next.position}: {st.next.title}</Link>}
            <Link href="/influencer/academie" className={res.passed && (!st.next || res.justCertified) ? 'al-btn' : 'al-btn2'}>Înapoi la Academie</Link>
          </div>
        </>)}
      </div>
    </div>
  )
}

function LessonStart({ L, st, qs, concepts, onStart }: any) {
  return (<>
    <div className="al-head">
      <h1>{L.title}</h1>
      <div className="al-meta">
        <span className="ac-chip v">+{L.points} puncte</span>
        <span className="ac-chip">{concepts ? `${concepts} concepte · ` : ''}{qs.length} întrebări</span>
        {st.progress?.passed && <span className="ac-chip ok">Trecută · {st.progress.bestScore}/{qs.length}</span>}
      </div>
      {L.summary && <p className="ac-muted" style={{ fontSize: 15 }}>{L.summary}</p>}
    </div>
    {qs.length > 0 && <div className="al-nav"><button className="al-btn" onClick={onStart}>Începe testul · {qs.length} întrebări</button></div>}
  </>)
}

function StepView({ step, n, total }: { step: AcademyStep; n: number; total: number }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [picked, setPicked] = useState<'a' | 'b' | null>(null)
  const [shown, setShown] = useState(false)
  const [draft, setDraft] = useState('')

  if (step.type === 'concept') return (
    <div className="al-step-c">
      <span className="ac-chip v" style={{ alignSelf: 'flex-start', height: 26, padding: '0 10px', fontSize: 12 }}>Concept {n} din {total}</span>
      <h2 className="al-h2">{step.title}</h2>
      {step.what && <div className="al-sec"><span className="al-k">Ce este</span><p>{step.what}</p></div>}
      {step.why && <div className="al-sec"><span className="al-k">De ce contează pentru brand</span><p>{step.why}</p></div>}
      {(step.bad || step.good) && (
        <div className="al-pair">
          {step.bad && <div className="al-ex bad"><span><Cross /> Așa nu</span><p>{step.bad}</p></div>}
          {step.good && <div className="al-ex good"><span><Tick /> Așa da</span><p>{step.good}</p></div>}
        </div>
      )}
      {step.checklist && step.checklist.length > 0 && (
        <div className="ac-card al-check">
          <b>Verifică înainte să postezi</b>
          {step.checklist.map((c, k) => (
            <label key={k}><input type="checkbox" checked={!!checked[k]} onChange={e => setChecked(s => ({ ...s, [k]: e.target.checked }))} />{c}</label>
          ))}
        </div>
      )}
    </div>
  )

  if (step.type === 'choose') return (
    <div className="al-step-c">
      <span className="ac-chip" style={{ alignSelf: 'flex-start', height: 26, padding: '0 10px', fontSize: 12, background: '#e8f0ff', color: '#1d4ed8' }}>Care e mai bun?</span>
      <h2 className="al-h2" style={{ fontSize: 21 }}>{step.prompt}</h2>
      {(['a', 'b'] as const).map((k, idx) => {
        const better = step.better === k
        const cls = picked ? (better ? 'ok' : 'dim') : ''
        return (
          <button key={k} type="button" className={`al-choice ${cls}`} onClick={() => !picked && setPicked(k)} disabled={!!picked}>
            <span className="al-choice-h"><span className="al-k">Varianta {LETTERS[idx]}</span>{picked && <span className={`ac-chip ${better ? 'ok' : ''}`}>{better ? 'Mai bună' : 'Mai slabă'}</span>}</span>
            <span>{step[k]}</span>
          </button>
        )
      })}
      {picked && (
        <div className={`al-fb ${picked === step.better ? 'ok' : 'bad'}`}>
          <b>{picked === step.better ? 'Exact!' : `Mai degrabă varianta ${step.better === 'a' ? 'A' : 'B'}.`}</b>
          {step.explain && <span>{step.explain}</span>}
        </div>
      )}
      {!picked && <p className="ac-muted">Atinge varianta pe care o alegi. Aici nu pierzi nimic dacă greșești.</p>}
    </div>
  )

  return (
    <div className="al-step-c">
      <span className="ac-chip ok" style={{ alignSelf: 'flex-start', height: 26, padding: '0 10px', fontSize: 12 }}>Exercițiu</span>
      <h2 className="al-h2" style={{ fontSize: 21 }}>{step.prompt}</h2>
      {step.brief && <div className="ac-card" style={{ gap: 4, padding: '12px 14px' }}><span className="al-k">Din brief</span><p style={{ fontSize: 14.5, lineHeight: 1.5 }}>{step.brief}</p></div>}
      <label className="al-k" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>Răspunsul tău
        <textarea className="al-ta" rows={4} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Scrie aici…" />
      </label>
      {step.example && <button type="button" className="al-btn2" onClick={() => setShown(v => !v)}>{shown ? 'Ascunde exemplul' : 'Compară cu un exemplu'}</button>}
      {shown && step.example && (
        <div className="al-ex good"><span>Un exemplu bun</span><p>{step.example}</p>{step.why && <p style={{ fontSize: 13.5 }}>De ce merge: {step.why}</p>}</div>
      )}
      <p className="ac-muted">Nu se notează. E pentru tine, ca să exersezi.</p>
    </div>
  )
}

function Tick() { return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> }
function Cross() { return <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg> }
