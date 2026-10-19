'use client'

// Quiz „Ce influencer de Halloween ești?” — 8 întrebări, rezultat cu personaj, +25 puncte o dată, card de Story cu logo AddFame.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getQuizState, submitQuiz, getStoryAvatar } from '@/app/actions/halloween-quiz'
import { QUIZ_QUESTIONS, QUIZ_POINTS, characterById, scoreQuiz, type QuizCharacter } from '@/lib/halloween-quiz'
import { makeStoryImage, shareOrDownload } from '@/lib/halloween-story'
import { planScares, createAudio, sfx, buzz, type ScareKind } from '@/lib/halloween-scares'
import HalloweenScare from '@/components/influencer/HalloweenScare'

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
  // modul Fricos: sperieturi scurte, doar dacă alege creatorul
  const [scaryMode, setScaryMode] = useState(false)
  const [sound, setSound] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [scare, setScare] = useState<ScareKind | 'finale' | null>(null)
  const [boom, setBoom] = useState(false)
  const plan = useRef<Record<number, ScareKind>>({})
  const fired = useRef<Set<number>>(new Set())
  const audio = useRef<AudioContext | null>(null)
  const scary = scaryMode && !reduced

  useEffect(() => { getQuizState().then(setSt).catch(() => setSt({ enabled: false })) }, [])
  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { /* rămâne modul prietenos */ }
    try { setScaryMode(localStorage.getItem('hq_scary') === '1'); setSound(localStorage.getItem('hq_sound') !== '0') } catch { /* fără memorie e ok */ }
  }, [])
  function chooseMode(on: boolean) { setScaryMode(on); try { localStorage.setItem('hq_scary', on ? '1' : '0') } catch { /* ok */ } }
  function toggleSound() { const v = !sound; setSound(v); try { localStorage.setItem('hq_sound', v ? '1' : '0') } catch { /* ok */ } }
  const closeScare = useCallback(() => setScare(null), [])
  function fire(kind: ScareKind | 'finale') {
    setScare(kind)
    if (sound) sfx(audio.current, kind === 'finale' ? 'cackle' : kind)
    buzz(kind === 'finale' ? [60, 40, 60] : [120, 50, 220])
  }

  const played = st?.result ? characterById(st.result.characterId) : null

  function start() {
    setAnswers([]); setI(0); setResult(null); setMsg(null); setBoom(false); setScare(null)
    fired.current = new Set()
    plan.current = scary ? planScares(QUIZ_QUESTIONS.length) : {}
    if (scary && sound && !audio.current) audio.current = createAudio() // pornește sunetul din atingerea creatorului
    else if (audio.current?.state === 'suspended') audio.current.resume().catch(() => {})
    setScreen('q')
  }
  // spre rezultat: în modul Fricos, întâi o clipă de întuneric, apoi personajul „explodează” pe ecran
  function goResult() { if (scary) { setBoom(true); fire('finale') } setScreen('result') }
  function showSaved() {
    if (!played) return
    setResult({ ch: played, score: st.result.score, points: 0, replay: false }); setMsg(null); setBoom(false); setScreen('result')
  }
  function pick(k: number) {
    const a = answers.slice(); a[i] = k + 1; setAnswers(a)
    const kind = plan.current[i]
    if (scary && kind && !fired.current.has(i)) { fired.current.add(i); setTimeout(() => fire(kind), 450) }
  }
  function back() { if (i === 0) setScreen('start'); else setI(i - 1) }

  async function next() {
    if (!answers[i]) return
    if (i < QUIZ_QUESTIONS.length - 1) { setI(i + 1); return }
    // a mai jucat: rezultatul nou se arată, fără puncte și fără să-l salvăm
    if (st?.result) {
      const r = scoreQuiz(answers)
      if (r) { setResult({ ch: r.character, score: r.score, points: 0, replay: true }); goResult() }
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
    goResult()
  }

  async function share() {
    if (!result || sharing) return
    setSharing(true); setMsg(null)
    try {
      const cs = root.current ? getComputedStyle(root.current) : null
      const avatar = await getStoryAvatar().catch(() => null)
      const blob = await makeStoryImage({
        character: result.ch, handle: st?.handle || '', avatar,
        fontDisplay: cs?.getPropertyValue('--font-display'), fontBody: cs?.getPropertyValue('--font-body'),
      })
      const how = await shareOrDownload(blob, `addfame-halloween-${result.ch.id}.png`)
      if (how === 'downloaded') setMsg('Imaginea s-a descărcat. Postează-o pe Instagram Story și dă tag @addfame.ro 🎃')
    } catch { setMsg('Nu am putut crea imaginea. Încearcă din nou.') }
    setSharing(false)
  }

  const q = QUIZ_QUESTIONS[i]

  const modePicker = (
    <div className="hq-mode">
      <span className="hq-mode-l">Alege modul</span>
      <div className="hq-mode-r">
        <button className="hq-mode-b" aria-pressed={!scaryMode} onClick={() => chooseMode(false)}>Prietenos 🎃</button>
        <button className="hq-mode-b" aria-pressed={scaryMode && !reduced} onClick={() => chooseMode(true)} disabled={reduced}>Fricos 👻</button>
      </div>
      {reduced && <span className="hq-mode-n">Telefonul tău are „reduce motion” activat, așa că rămâi în modul Prietenos.</span>}
      {scary && (<>
        <span className="hq-mode-n">Câteva sperieturi scurte, cu sunet, fără lumini intermitente. Poți închide oricare cu o atingere.</span>
        <button className="hq-snd" onClick={toggleSound}>{sound ? 'Sunet pornit · oprește' : 'Sunet oprit · pornește'}</button>
      </>)}
    </div>
  )

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
        .hq-mode { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .hq-mode-l { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #b4500a; }
        .hq-mode-r { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .hq-mode-b { min-height: 48px; border-radius: 12px; border: 2px solid #ffd2a3; background: #fff; color: #3a1505; font-family: inherit; font-weight: 800; font-size: 14.5px; cursor: pointer; }
        .hq-mode-b[aria-pressed="true"] { border-color: #7040f0; background: #f1ecff; }
        .hq-mode-n { font-size: 12.5px; color: #7a4a22; }
        .hq-snd { background: none; border: 0; padding: 0; font-family: inherit; font-weight: 800; font-size: 13px; color: #7040f0; cursor: pointer; text-decoration: underline; }
        .hq-snd-i { width: 44px; height: 44px; flex: none; border-radius: 12px; border: 1.5px solid #ffc48a; background: #fff; cursor: pointer; font-size: 18px; }
        .hq-boom { animation: hqBoom .9s 1.2s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes hqBoom { from { opacity: 0; transform: scale(1.35); filter: blur(8px) } to { opacity: 1; transform: scale(1); filter: blur(0) } }
        @keyframes hqBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @media (prefers-reduced-motion: reduce) { .hq-hero, .hq-boom { animation: none; } }
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
              {modePicker}
              <button className="hq-btn" onClick={showSaved}>Vezi rezultatul meu</button>
              <button className="hq-btn2" onClick={start}>Joacă din nou</button>
            </>) : (<>
              <p>8 întrebări, un minut. La final afli ce personaj ești{st.approved ? <> și primești <b style={{ color: '#3a1505' }}>+{QUIZ_POINTS} de puncte</b> Creator Score</> : null}.</p>
              {modePicker}
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
            {scary && <button className="hq-snd-i" onClick={toggleSound} aria-label={sound ? 'Oprește sunetul' : 'Pornește sunetul'}>{sound ? '🔊' : '🔇'}</button>}
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
          <div className={`hq-center ${boom ? 'hq-boom' : ''}`}>
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
      {scare && <HalloweenScare kind={scare} onDone={closeScare} />}
    </div>
  )
}
