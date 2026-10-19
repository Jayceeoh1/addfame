'use client'

// Dashboard influencer: „Trick or Treat” — un dovleac pe zi, 25–31 octombrie. Nu apare în afara perioadei.
// Design: varianta B (card luminos, dovleac 3D), cu animații: strălucire, confetti, „+N puncte”, ziua devine dovleac, bara spre bonus.
import { useEffect, useMemo, useState } from 'react'
import { getTreatStatus, openTreat } from '@/app/actions/halloween'
import { STREAK_BONUS, TREAT_DAYS } from '@/lib/halloween'

const IMG = { lit: '/halloween/pumpkin-lit.webp', unlit: '/halloween/pumpkin-unlit.webp', mini: '/halloween/pumpkin-mini.webp' }
const CONFETTI_COLORS = ['#ff8a1f', '#7040f0', '#ffd08a', '#22c8f0', '#ff5d8f', '#9be15d']

export default function HalloweenTreat({ preview }: { preview?: any } = {}) {
  const [s, setS] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<{ points: number; bonus: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (preview) { setS(preview.status); if (preview.reveal) setReveal(preview.reveal); return } getTreatStatus().then(setS).catch(() => {}) }, [preview])

  // bucățile de confetti: poziții fixe, calculate o singură dată
  const confetti = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const ang = (i / 22) * Math.PI * 2 + (i % 3) * 0.2
    const dist = 90 + (i * 37) % 70
    return { dx: Math.round(Math.cos(ang) * dist), dy: Math.round(Math.sin(ang) * dist - 30), c: CONFETTI_COLORS[i % CONFETTI_COLORS.length], r: (i * 47) % 360, d: (i % 5) * 0.03 }
  }), [])

  if (!s || s.phase === 'hidden') return null

  async function open() {
    if (busy) return
    setBusy(true); setErr(null)
    const [r] = await Promise.all([openTreat(), new Promise(res => setTimeout(res, 700))])
    setBusy(false)
    if ((r as any).error) { setErr((r as any).error); return }
    const ok = r as any
    setReveal({ points: ok.points, bonus: ok.bonus })
    getTreatStatus().then(setS).catch(() => {})
  }

  const days: any[] = s.days || []
  const opened = days.filter(d => d.points != null).length
  const canOpen = s.phase === 'open' && s.approved && !s.openedToday && !busy
  const gained = reveal ? reveal.points + reveal.bonus : 0

  const heading =
    s.phase === 'teaser' ? 'Trick or Treat începe mâine 🦇'
    : s.phase === 'over' ? 'Mulțumim că ai jucat Trick or Treat!'
    : reveal ? (reveal.bonus ? 'Ai deschis toți dovlecii!' : 'Ai deschis dovleacul de azi!')
    : s.openedToday ? 'Ai deschis dovleacul de azi'
    : 'Un dovleac nou te așteaptă'

  return (
    <section className="hwb" aria-label="Trick or Treat de Halloween">
      <style>{`
        .hwb { position: relative; overflow: hidden; border-radius: 20px; padding: 24px 26px; border: 1px solid #ffd2a3;
          background: linear-gradient(120deg, #fff6ec 0%, #ffe6cc 60%, #ffd6ad 100%); color: #3a1505;
          display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: center; }
        .hwb-tag { align-self: flex-start; display: inline-flex; padding: 4px 10px; border-radius: 999px; background: #14123a; color: #ffd08a; font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
        .hwb-txt { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
        .hwb h2 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #3a1505; text-wrap: balance; }
        .hwb p { margin: 0; color: #7a4a22; font-size: 14.5px; max-width: 520px; }
        .hwb-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .hwb-btn { height: 46px; padding: 0 20px; border-radius: 12px; border: 0; background: #7040f0; color: #fff; font-weight: 800; font-size: 15px; font-family: inherit; cursor: pointer; transition: background .15s, transform .15s; }
        .hwb-btn:hover:not(:disabled) { background: #5f30e0; transform: translateY(-1px); }
        .hwb-btn:disabled { opacity: .6; cursor: default; }
        .hwb-pill { height: 46px; padding: 0 16px; border-radius: 12px; background: #fff; border: 1.5px solid #ffc48a; color: #b4500a; font-weight: 800; display: inline-flex; align-items: center; }
        .hwb-meta { font-size: 13px; color: #7a4a22; }
        .hwb-meta b { color: #3a1505; }
        .hwb-days { display: flex; flex-wrap: wrap; gap: 8px; }
        .hwb-day { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 800; background: #fff; color: #b07a4a; border: 1.5px dashed #f0b67a; }
        .hwb-day.done { background: #ffe2c2; border: 1.5px solid #ffb877; }
        .hwb-day.done img { width: 36px; height: 36px; object-fit: contain; }
        .hwb-day.today { box-shadow: 0 0 0 3px #7040f0; }
        .hwb-day.miss { opacity: .45; }
        .hwb-day.pop img { animation: hwbIn .6s cubic-bezier(.2,1.6,.4,1); }
        .hwb-bar { height: 8px; border-radius: 999px; background: rgba(58,21,5,.1); overflow: hidden; max-width: 420px; }
        .hwb-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ff8a1f, #7040f0); transition: width .8s ease; }
        .hwb-err { font-size: 13px; font-weight: 700; color: #b42318; }
        .hwb-art { position: relative; width: 240px; height: 240px; display: grid; place-items: center; }
        .hwb-art img.big { position: relative; width: 224px; height: 224px; object-fit: contain; animation: hwbBob 3.2s ease-in-out infinite; }
        .hwb-art.shake img.big { animation: hwbShake .25s ease-in-out infinite; }
        .hwb-glow { position: absolute; inset: 18px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,190,80,.6), rgba(255,190,80,0)); animation: hwbGlow 2.4s ease-in-out infinite; }
        .hwb-shadow { position: absolute; left: 34px; right: 34px; bottom: 10px; height: 24px; border-radius: 50%; background: radial-gradient(closest-side, rgba(150,60,0,.28), rgba(150,60,0,0)); }
        .hwb-plus { position: absolute; top: 0; right: -4px; padding: 6px 12px; border-radius: 999px; background: #7040f0; color: #fff; font-weight: 800; font-size: 22px; box-shadow: 0 8px 20px rgba(112,64,240,.35); animation: hwbPlus .7s cubic-bezier(.2,1.6,.4,1); white-space: nowrap; }
        .hwb-cf { position: absolute; left: 50%; top: 50%; width: 9px; height: 14px; border-radius: 2px; opacity: 0; animation: hwbCf 1.1s ease-out forwards; }
        @keyframes hwbBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes hwbShake { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-8deg) } 75% { transform: rotate(8deg) } }
        @keyframes hwbGlow { 0%,100% { opacity: .7; transform: scale(.96) } 50% { opacity: 1; transform: scale(1.04) } }
        @keyframes hwbPlus { from { transform: scale(.3) translateY(20px); opacity: 0 } to { transform: scale(1) translateY(0); opacity: 1 } }
        @keyframes hwbIn { from { transform: scale(0) rotate(-30deg) } to { transform: scale(1) rotate(0) } }
        @keyframes hwbCf { 0% { opacity: 1; transform: translate(-50%, -50%) rotate(0) } 100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 40px)) rotate(var(--r)) } }
        @media (max-width: 640px) {
          .hwb { grid-template-columns: 1fr; padding: 20px 18px; gap: 8px; }
          .hwb-art { order: -1; width: 170px; height: 170px; justify-self: center; }
          .hwb-art img.big { width: 160px; height: 160px; }
          .hwb h2 { font-size: 22px; }
          .hwb-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
          .hwb-day { width: 100%; height: auto; aspect-ratio: 1; max-width: 42px; font-size: 12px; }
          .hwb-day.done img { width: 82%; height: 82%; }
        }
        @media (prefers-reduced-motion: reduce) { .hwb *, .hwb *::before { animation: none !important; transition: none !important; } .hwb-cf { display: none; } }
      `}</style>

      <div className="hwb-txt">
        <span className="hwb-tag">Trick or Treat · 25–31 oct</span>
        <h2>{heading}</h2>
        <p>
          {s.phase === 'teaser' && <>Între 25 și 31 octombrie deschizi câte un dovleac pe zi și primești 5–30 de puncte Creator Score. Deschide-i pe toți 7 și primești încă {STREAK_BONUS}.</>}
          {s.phase === 'open' && (s.approved
            ? <>În fiecare zi te așteaptă un dovleac cu 5–30 de puncte Creator Score. Deschide-i pe toți 7 și primești încă {STREAK_BONUS}.</>
            : <>Profilul tău trebuie să fie aprobat ca să participi.</>)}
          {s.phase === 'over' && <>Punctele au intrat în Creator Score. Ne vedem la următorul joc!</>}
        </p>

        {s.phase === 'open' && (
          <div className="hwb-row">
            {s.openedToday
              ? <span className="hwb-pill">{reveal ? `+${gained} puncte` : `+${days.find(d => d.isToday)?.points ?? 0} puncte azi`} · revino mâine</span>
              : <button className="hwb-btn" onClick={open} disabled={!canOpen}>{busy ? 'Se deschide…' : 'Deschide dovleacul de azi'}</button>}
            <span className="hwb-meta"><b>{s.total} puncte</b> strânse · {opened}/{TREAT_DAYS} dovleci</span>
          </div>
        )}
        {s.phase === 'over' && <span className="hwb-meta"><b>{s.total} puncte</b> strânse · {opened}/{TREAT_DAYS} dovleci{s.bonus ? ` · bonus +${s.bonus} ✓` : ''}</span>}

        {s.phase !== 'teaser' && (<>
          <div className="hwb-days" aria-label={`${opened} din ${TREAT_DAYS} dovleci deschiși`}>
            {days.map(d => {
              const done = d.points != null
              return (
                <span key={d.day} title={done ? `${Number(d.day.slice(8))} oct: +${d.points}` : `${Number(d.day.slice(8))} oct`}
                  className={`hwb-day ${done ? 'done' : ''} ${d.isToday ? 'today' : ''} ${!done && d.past ? 'miss' : ''} ${done && d.isToday && reveal ? 'pop' : ''}`}>
                  {done ? <img src={IMG.mini} alt={`+${d.points}`} /> : Number(d.day.slice(8))}
                </span>
              )
            })}
          </div>
          <div className="hwb-bar" aria-hidden="true"><i style={{ width: `${Math.round(opened / TREAT_DAYS * 100)}%` }} /></div>
          <span className="hwb-meta">{s.bonus ? `Bonusul de ${s.bonus} puncte e al tău! 🎉` : `Încă ${TREAT_DAYS - opened} ${TREAT_DAYS - opened === 1 ? 'dovleac' : 'dovleci'} până la bonusul de ${STREAK_BONUS} de puncte`}</span>
        </>)}
        {err && <span className="hwb-err">{err}</span>}
      </div>

      <div className={`hwb-art ${busy ? 'shake' : ''}`}>
        <span className="hwb-shadow" aria-hidden="true" />
        {(s.phase !== 'open' || !s.openedToday || reveal) && <span className="hwb-glow" aria-hidden="true" />}
        <img className="big" src={s.phase === 'open' && s.openedToday && !reveal ? IMG.unlit : IMG.lit} alt="Dovleac de Halloween" />
        {reveal && <>
          {confetti.map((c, i) => (
            <span key={i} className="hwb-cf" aria-hidden="true"
              style={{ background: c.c, animationDelay: `${c.d}s`, ['--dx' as any]: `${c.dx}px`, ['--dy' as any]: `${c.dy}px`, ['--r' as any]: `${c.r}deg` }} />
          ))}
          <span className="hwb-plus" role="status">+{gained} puncte</span>
        </>}
      </div>
    </section>
  )
}
