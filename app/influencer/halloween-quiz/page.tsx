'use client'

// Quiz „Ce influencer de Halloween ești?” — 8 întrebări, rezultat cu personaj, +25 puncte o dată, card de Story cu logo AddFame.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getQuizState, submitQuiz } from '@/app/actions/halloween-quiz'
import { QUIZ_QUESTIONS, QUIZ_POINTS, characterById, scoreQuiz, type QuizCharacter } from '@/lib/halloween-quiz'
import { makeStoryImage, shareOrDownload } from '@/lib/halloween-story'

type Screen = 'start' | 'q' | 'result'
const LETTERS = ['A', 'B', 'C', 'D']

export default function HalloweenQuizPage() {
  const root = useRef<HTMLDivElement>(null)
  const [st, setSt] = useState<any>(null)
  const [screen, setScreen] = useState<Screen>('start')
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<{ ch: QuizCharacter; score: number; points: number; replay: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => { getQuizState().then(setSt).catch(() => setSt({ enabled: false })) }, [])

  const played = st?.result ? characterById(st.result.characterId) : null

  function start() { setAnswers([]); setI(0); setResult(null); setMsg(null); setScreen('q') }
  function showSaved() {
    if (!played) return
    setResult({ ch: played, score: st.result.score, points: 0, replay: false }); setMsg(null); setScreen('result')
  }
  function pick(k: number) { const a = answers.slice(); a[i] = k + 1; setAnswers(a) }
  function back() { if (i === 0) setScreen('start'); else setI(i - 1) }

  async function next() {
    if (!answers[i]) return
    if (i < QUIZ_QUESTIONS.length - 1) { setI(i + 1); return }
    // a mai jucat: rezultatul nou se arată, fără puncte și fără să-l salvăm
    if (st?.result) {
      const r = scoreQuiz(answers)
      if (r) { setResult({ ch: r.character, score: r.score, points: 0, replay: true }); setScreen('result') }
      return
    }
    setBusy(true); setMsg(null)
    const r: any = await submitQuiz(answers)
    setBusy(false)
    if (r?.error) { setMsg(r.error); return }
    const ch = characterById(r.characterId)
    if (!ch) return
    setResult({ ch, score: r.score, points: r.points || 0, replay: !!r.alreadyPlayed })
    setSt((s: any) => ({ ...s, result: { score: r.score, characterId: r.characterId, points: r.points } }))
    setScreen('result')
  }

  async function share() {
    if (!result || sharing) return
    setSharing(true); setMsg(null)
    try {
      const cs = root.current ? getComputedStyle(root.current) : null
      const blob = await makeStoryImage({
        character: result.ch, handle: st?.handle || '',
        fontDisplay: cs?.getPropertyValue('--font-display'), fontBody: cs?.getPropertyValue('--font-body'),
      })
      const how = await shareOrDownload(blob, `addfame-halloween-${result.ch.id}.png`)
      if (how === 'downloaded') setMsg('Imaginea s-a descărcat. Postează-o pe Instagram Story și dă tag @addfame.ro 🎃')
    } catch { setMsg('Nu am putut crea imaginea. Încearcă din nou.') }
    setSharing(false)
  }

  const q = QUIZ_QUESTIONS[i]

  return (
    <div ref={root} className="hq">
      <style>{`
        .hq { min-height: 100%; padding: 24px 16px 40px; box-sizing: border-box; display: flex; justify-content: center; font-family: var(--font-body, system-ui), system-ui, sans-serif; color: #3a1505; }
        .hq-card { width: 100%; max-width: 520px; border-radius: 24px; padding: 26px 22px; box-sizing: border-box; border: 1px solid #ffd2a3;
          background: linear-gradient(170deg, #fff6ec 0%, #ffe6cc 55%, #ffd6ad 100%); display: flex; flex-direction: column; gap: 16px; }
        .hq h1, .hq h2 { font-family: var(--font-display, system-ui), system-ui, sans-serif; margin: 0; letter-spacing: -0.03em; text-wrap: balance; }
        .hq h1 { font-size: 32px; line-height: 1.08; font-weight: 800; }
        .hq h2 { font-size: 25px; line-height: 1.15; font-weight: 800; }
        .hq p { margin: 0; color: #7a4a22; }
        .hq-tag { align-self: center; display: inline-flex; padding: 4px 10px; border-radius: 999px; background: #14123a; color: #ffd08a; font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
        .hq-center { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
        .hq-hero { width: 210px; height: 210px; object-fit: contain; animation: hqBob 3.2s ease-in-out infinite; }
        .hq-cast { display: flex; justify-content: center; }
        .hq-cast img { width: 64px; height: 64px; object-fit: contain; margin: 0 -6px; }
        .hq-btn { min-height: 52px; width: 100%; border-radius: 14px; border: 0; background: #7040f0; color: #fff; font-family: inherit; font-weight: 800; font-size: 16px; cursor: pointer; padding: 0 16px; }
        .hq-btn:disabled { background: #e8dccd; color: #8a6a4e; cursor: default; }
        .hq-btn2 { min-height: 48px; width: 100%; border-radius: 14px; border: 1.5px solid #ffc48a; background: #fff; color: #3a1505; font-family: inherit; font-weight: 800; font-size: 15px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; }
        .hq-top { display: flex; align-items: center; gap: 12px; }
        .hq-back { width: 44px; height: 44px; flex: none; border-radius: 12px; border: 1.5px solid #ffc48a; background: #fff; display: grid; place-items: center; cursor: pointer; }
        .hq-bar { flex: 1; height: 10px; border-radius: 999px; background: rgba(58,21,5,.1); overflow: hidden; }
        .hq-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ff8a1f, #7040f0); transition: width .3s; }
        .hq-step { font-weight: 800; font-size: 14px; color: #7a4a22; min-width: 34px; text-align: right; }
        .hq-opts { display: flex; flex-direction: column; gap: 10px; }
        .hq-opt { min-height: 56px; width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px; font-family: inherit; font-size: 15.5px; font-weight: 700; color: #3a1505; cursor: pointer; text-align: left; background: #fff; border: 2px solid #ffd2a3; }
        .hq-opt.on { background: #f1ecff; border-color: #7040f0; }
        .hq-opt b { width: 30px; height: 30px; flex: none; border-radius: 9px; display: grid; place-items: center; font-size: 14px; background: #fff1e2; color: #b4500a; }
        .hq-opt.on b { background: #7040f0; color: #fff; }
        .hq-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
        .hq-chip { padding: 6px 12px; border-radius: 999px; background: #fff; border: 1.5px solid #ffc48a; font-weight: 800; font-size: 13px; }
        .hq-chip.v { background: #7040f0; border-color: #7040f0; color: #fff; }
        .hq-msg { font-size: 14px; font-weight: 700; color: #6a3b12; text-align: center; }
        @keyframes hqBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @media (prefers-reduced-motion: reduce) { .hq-hero { animation: none; } }
      `}</style>

      <div className="hq-card">
        {!st && <p style={{ textAlign: 'center' }}>Se încarcă…</p>}

        {st && !st.enabled && (
          <div className="hq-center">
            <span className="hq-tag">Quiz de Halloween</span>
            <h2>Quiz-ul nu e activ acum</h2>
            <p>Revino curând, pregătim următorul joc. 🎃</p>
            <Link href="/influencer/dashboard" className="hq-btn2">Înapoi la dashboard</Link>
          </div>
        )}

        {st?.enabled && screen === 'start' && (
          <div className="hq-center">
            <span className="hq-tag">Quiz de Halloween</span>
            <div className="hq-cast" aria-hidden="true">
              {['vrajitoare', 'vampir', 'dovleac', 'zombie', 'fantoma'].map(id => <img key={id} src={`/halloween/chars/${id}.webp`} alt="" />)}
            </div>
            <h1>Ce influencer de Halloween ești?</h1>
            {played ? (<>
              <p>Ai jucat deja: tu ești <b style={{ color: '#3a1505' }}>{played.name}</b>. Poți să-ți vezi cardul sau să joci din nou, de distracție (fără puncte).</p>
              <button className="hq-btn" onClick={showSaved}>Vezi rezultatul meu</button>
              <button className="hq-btn2" onClick={start}>Joacă din nou</button>
            </>) : (<>
              <p>8 întrebări, un minut. La final afli ce personaj ești{st.approved ? <> și primești <b style={{ color: '#3a1505' }}>+{QUIZ_POINTS} de puncte</b> Creator Score</> : null}.</p>
              <button className="hq-btn" onClick={start}>Începe quiz-ul</button>
            </>)}
          </div>
        )}

        {st?.enabled && screen === 'q' && (<>
          <div className="hq-top">
            <button className="hq-back" onClick={back} aria-label="Înapoi">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="#3a1505" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="hq-bar" aria-hidden="true"><i style={{ width: `${Math.round((i + 1) / QUIZ_QUESTIONS.length * 100)}%` }} /></div>
            <span className="hq-step">{i + 1}/{QUIZ_QUESTIONS.length}</span>
          </div>
          <h2>{q.q}</h2>
          <div className="hq-opts" role="radiogroup" aria-label={q.q}>
            {q.options.map((o, k) => (
              <button key={k} role="radio" aria-checked={answers[i] === k + 1} className={`hq-opt ${answers[i] === k + 1 ? 'on' : ''}`} onClick={() => pick(k)}>
                <b>{LETTERS[k]}</b><span>{o}</span>
              </button>
            ))}
          </div>
          <button className="hq-btn" onClick={next} disabled={!answers[i] || busy}>
            {busy ? 'Se calculează…' : i === QUIZ_QUESTIONS.length - 1 ? 'Află ce influencer ești' : 'Următoarea'}
          </button>
          {msg && <div className="hq-msg">{msg}</div>}
        </>)}

        {st?.enabled && screen === 'result' && result && (
          <div className="hq-center">
            <span style={{ fontSize: 13, fontWeight: 800, color: '#b4500a', textTransform: 'uppercase', letterSpacing: '.08em' }}>Tu ești…</span>
            <h1>{result.ch.name}</h1>
            <img className="hq-hero" src={result.ch.img} alt={result.ch.name} style={{ width: 250, height: 250 }} />
            <p style={{ fontSize: 15.5 }}>{result.ch.text}</p>
            <div className="hq-chips">
              <span className="hq-chip">Scor {result.score}/32</span>
              {result.points > 0 && <span className="hq-chip v">+{result.points} puncte Creator Score</span>}
              {result.replay && <span className="hq-chip">Joc de distracție · fără puncte</span>}
            </div>
            <button className="hq-btn" onClick={share} disabled={sharing}>{sharing ? 'Pregătim cardul…' : 'Postează pe Instagram Story'}</button>
            {msg && <div className="hq-msg">{msg}</div>}
            <button className="hq-btn2" onClick={start}>Joacă din nou</button>
            <Link href="/influencer/dashboard" className="hq-btn2">Înapoi la dashboard</Link>
          </div>
        )}
      </div>
    </div>
  )
}
