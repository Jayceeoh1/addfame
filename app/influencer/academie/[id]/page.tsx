'use client'

// Academia AddFame — o lecție: conținut, video opțional, apoi testul (o întrebare pe ecran) și rezultatul.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getLesson, submitLesson } from '@/app/actions/academy'
import { parseBody, videoEmbed } from '@/lib/academy'
import { ACADEMY_CSS } from '../academy-css'

type Screen = 'read' | 'quiz' | 'result'
const LETTERS = ['A', 'B', 'C', 'D']

export default function LectiePage() {
  const { id } = useParams() as { id: string }
  const [st, setSt] = useState<any>(null)
  const [screen, setScreen] = useState<Screen>('read')
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [res, setRes] = useState<any>(null)

  useEffect(() => { getLesson(id).then(setSt).catch(() => setSt({ error: 'Nu am putut încărca lecția.' })) }, [id])

  const L = st?.lesson
  const qs: { q: string; options: string[] }[] = L?.questions || []
  const blocks = useMemo(() => parseBody(L?.body), [L?.body])
  const embed = videoEmbed(L?.video_url)

  function startQuiz() { setAnswers([]); setI(0); setRes(null); setMsg(null); setScreen('quiz'); top() }
  function top() { try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* ok */ } }
  function pick(k: number) { const a = answers.slice(); a[i] = k; setAnswers(a) }

  async function next() {
    if (answers[i] === undefined) return
    if (i < qs.length - 1) { setI(i + 1); return }
    setBusy(true); setMsg(null)
    const r: any = await submitLesson(id, answers)
    setBusy(false)
    if (r?.error) { setMsg(r.error); return }
    setRes(r)
    if (r.passed) setSt((s: any) => ({ ...s, progress: { ...(s.progress || {}), passed: true, bestScore: Math.max(s.progress?.bestScore || 0, r.score) } }))
    setScreen('result'); top()
  }

  return (
    <div className="ac">
      <style>{ACADEMY_CSS}</style>
      <div className="ac-wrap al">
        <Link href="/influencer/academie" className="al-back">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Academia
        </Link>

        {!st && <p className="ac-muted">Se încarcă…</p>}
        {st?.error && <div className="ac-card"><p>{st.error}</p></div>}

        {L && screen === 'read' && (<>
          <div className="al-head">
            <span className="ac-muted">Lecția {L.position} · {L.minutes} min · {qs.length} întrebări</span>
            <h1>{L.title}</h1>
            <div className="al-meta">
              <span className="ac-chip v">+{L.points} puncte</span>
              <span className="ac-chip">Treci cu {L.needed} din {qs.length}</span>
              {st.progress?.passed && <span className="ac-chip ok">Trecută · {st.progress.bestScore}/{qs.length}</span>}
            </div>
          </div>

          {embed && <div className="al-video"><iframe src={embed} title={L.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" /></div>}

          {blocks.length > 0 && (
            <div className="ac-card al-body">
              {blocks.map((b, k) => b.kind === 'list' ? (
                <ul key={k} className="al-list">{b.parts.map((p, j) => <li key={j}>{p.map((s, n) => s.bold ? <b key={n}>{s.text}</b> : <span key={n}>{s.text}</span>)}</li>)}</ul>
              ) : (
                <p key={k} className={b.kind === 'note' ? 'al-note' : undefined}>{b.parts[0].map((s, n) => s.bold ? <b key={n}>{s.text}</b> : <span key={n}>{s.text}</span>)}</p>
              ))}
            </div>
          )}

          {qs.length > 0 && (
            <div className="al-nav">
              <button className="al-btn" onClick={startQuiz}>{st.progress?.passed ? 'Reia testul (fără puncte noi)' : `Începe testul · ${qs.length} întrebări`}</button>
            </div>
          )}
          {!st.approved && !st.progress?.passed && <p className="ac-warn">Poți da testul acum, dar punctele se acordă doar profilurilor aprobate.</p>}
        </>)}

        {L && screen === 'quiz' && qs[i] && (
          <div className="ac-card al-quiz">
            <div className="al-qtop">
              <div className="ac-bar" aria-hidden="true"><i style={{ width: `${Math.round((i + 1) / qs.length * 100)}%` }} /></div>
              <span className="al-step">{i + 1}/{qs.length}</span>
            </div>
            <h2 className="al-q">{qs[i].q}</h2>
            <div className="al-opts" role="radiogroup" aria-label={qs[i].q}>
              {qs[i].options.map((o, k) => (
                <button key={k} role="radio" aria-checked={answers[i] === k} className={`al-opt ${answers[i] === k ? 'on' : ''}`} onClick={() => pick(k)}>
                  <b>{LETTERS[k]}</b><span>{o}</span>
                </button>
              ))}
            </div>
            <div className="al-nav">
              <button className="al-btn2" onClick={() => i === 0 ? setScreen('read') : setI(i - 1)}>Înapoi</button>
              <button className="al-btn" onClick={next} disabled={answers[i] === undefined || busy}>
                {busy ? 'Se verifică…' : i === qs.length - 1 ? 'Trimite testul' : 'Următoarea'}
              </button>
            </div>
            {msg && <p className="al-msg">{msg}</p>}
          </div>
        )}

        {L && screen === 'result' && res && (<>
          {res.justCertified && (
            <div className="al-cert">
              <span style={{ fontSize: 40 }} aria-hidden="true">🎓</span>
              <h2>Ești creator certificat AddFame!</h2>
              <p>Badge-ul „Creator certificat” apare acum pe profilul tău și îl văd brandurile.</p>
            </div>
          )}
          <div className="ac-card al-result">
            <span className="ac-label">{res.passed ? 'Felicitări, ai trecut!' : 'Încă puțin'}</span>
            <span className="al-score">{res.score}/{res.total}</span>
            <div className="al-chips">
              {res.points > 0 && <span className="ac-chip v">+{res.points} puncte Creator Score</span>}
              {res.passed && !res.firstPass && <span className="ac-chip">Reluat · fără puncte noi</span>}
              {!res.passed && <span className="ac-chip">Ai nevoie de {res.needed} răspunsuri corecte</span>}
            </div>
            <p className="ac-muted" style={{ fontSize: 14.5 }}>
              {res.passed ? 'Mai jos vezi răspunsurile corecte la întrebările greșite.' : 'Citește explicațiile de mai jos și reia testul. Poți încerca de câte ori vrei.'}
            </p>
            <div className="al-nav" style={{ width: '100%' }}>
              {!res.passed && <button className="al-btn" onClick={startQuiz}>Reia testul</button>}
              <Link href="/influencer/academie" className={res.passed ? 'al-btn' : 'al-btn2'}>Înapoi la Academie</Link>
            </div>
          </div>

          {res.review.some((r: any) => !r.ok) && (
            <div className="al-rev">
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Unde ai greșit</h2>
              {res.review.map((r: any, k: number) => r.ok ? null : (
                <div key={k} className="al-rev-i bad">
                  <b>{k + 1}. {qs[k]?.q}</b>
                  <span>Ai ales: {LETTERS[answers[k]]}. {qs[k]?.options[answers[k]]}</span>
                  <span style={{ color: '#14532d', fontWeight: 700 }}>Corect: {LETTERS[r.correct]}. {qs[k]?.options[r.correct]}</span>
                  {r.explain && <span>{r.explain}</span>}
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
