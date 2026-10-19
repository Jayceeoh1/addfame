'use client'

// Dashboard influencer: „Trick or Treat” — un dovleac pe zi, 25–31 octombrie. Nu apare în afara perioadei.
import { useEffect, useState } from 'react'
import { getTreatStatus, openTreat } from '@/app/actions/halloween'
import { STREAK_BONUS } from '@/lib/halloween'

const dayLabel = (iso: string) => String(Number(iso.slice(8, 10)))

export default function HalloweenTreat() {
  const [s, setS] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState<{ points: number; bonus: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { getTreatStatus().then(setS).catch(() => {}) }, [])
  if (!s || s.phase === 'hidden') return null

  async function open() {
    if (busy) return
    setBusy(true); setErr(null); setShake(true)
    const [r] = await Promise.all([openTreat(), new Promise(res => setTimeout(res, 900))])
    setShake(false); setBusy(false)
    if ((r as any).error) { setErr((r as any).error); return }
    const ok = r as any
    setReveal({ points: ok.points, bonus: ok.bonus })
    getTreatStatus().then(setS).catch(() => {})
  }

  const opened = (s.days || []).filter((d: any) => d.points != null).length

  return (
    <section className="hw" aria-label="Trick or Treat de Halloween">
      <style>{`
        .hw { position: relative; overflow: hidden; border-radius: 20px; padding: 22px; color: #fff;
          background: radial-gradient(120% 140% at 100% 0%, #ff7a1a 0%, rgba(255,122,26,0) 45%), linear-gradient(135deg, #1b0f3d 0%, #2d1260 55%, #3b1170 100%);
          display: grid; grid-template-columns: auto minmax(0,1fr); gap: 20px; align-items: center; }
        .hw-moon { position: absolute; right: -40px; top: -40px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, #ffe9c2, #ffb347 60%, rgba(255,179,71,0) 72%); opacity: .35; pointer-events: none; }
        .hw-pump { position: relative; width: 108px; height: 108px; border-radius: 28px; border: 0; cursor: pointer; font-size: 64px; line-height: 1;
          background: rgba(255,255,255,.08); box-shadow: inset 0 0 0 1.5px rgba(255,160,70,.45), 0 10px 30px rgba(255,122,26,.25);
          display: grid; place-items: center; transition: transform .15s; font-family: inherit; color: inherit; }
        .hw-pump:hover:not(:disabled) { transform: translateY(-2px) scale(1.03); }
        .hw-pump:disabled { cursor: default; }
        .hw-pump.shake { animation: hwShake .3s ease-in-out infinite; }
        @keyframes hwShake { 0%,100% { transform: rotate(0) } 25% { transform: rotate(-9deg) } 75% { transform: rotate(9deg) } }
        .hw-pts { position: absolute; inset: 0; display: grid; place-items: center; font-size: 26px; font-weight: 900; color: #ffd08a; text-shadow: 0 2px 10px rgba(0,0,0,.4); animation: hwPop .5s ease-out; }
        @keyframes hwPop { from { transform: scale(.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .hw h2 { margin: 0 0 4px; font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
        .hw p { margin: 0; color: #d9cff7; font-size: 14px; }
        .hw-days { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
        .hw-day { width: 42px; padding: 6px 0 5px; border-radius: 12px; text-align: center; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-size: 11px; color: #cfc4f2; }
        .hw-day b { display: block; font-size: 17px; line-height: 1.2; }
        .hw-day.done { background: rgba(255,122,26,.18); border-color: rgba(255,160,70,.55); color: #ffd9ad; }
        .hw-day.today { box-shadow: 0 0 0 2px #ffb347; }
        .hw-day.miss { opacity: .45; }
        .hw-meta { margin-top: 10px; font-size: 13px; color: #d9cff7; }
        .hw-meta b { color: #ffd08a; }
        .hw-err { margin-top: 10px; font-size: 13px; font-weight: 700; color: #ffb4a8; }
        @media (max-width: 520px) { .hw { grid-template-columns: 1fr; justify-items: start; } }
        @media (prefers-reduced-motion: reduce) { .hw-pump.shake, .hw-pts { animation: none; } }
      `}</style>
      <span className="hw-moon" />
      <button className={`hw-pump ${shake ? 'shake' : ''}`} onClick={open}
        disabled={busy || s.phase !== 'open' || s.openedToday || !s.approved}
        aria-label={s.openedToday ? 'Dovleacul de azi e deschis' : 'Deschide dovleacul de azi'}>
        <span aria-hidden="true">{s.openedToday && !reveal ? '🍬' : '🎃'}</span>
        {reveal && <span className="hw-pts">+{reveal.points + reveal.bonus}</span>}
      </button>
      <div style={{ position: 'relative', minWidth: 0 }}>
        {s.phase === 'teaser' && (<>
          <h2>Trick or Treat începe mâine 🦇</h2>
          <p>Între 25 și 31 octombrie deschizi câte un dovleac pe zi și primești 5–30 de puncte Creator Score. Deschide-i pe toți 7 și primești încă {STREAK_BONUS} bonus.</p>
        </>)}
        {s.phase === 'open' && (<>
          <h2>{reveal ? (reveal.bonus ? `Ai deschis toți dovlecii! +${reveal.points} și +${reveal.bonus} bonus 🎉` : `+${reveal.points} puncte! Revino mâine 🍬`) : s.openedToday ? 'Ai deschis dovleacul de azi 🍬' : 'Trick or Treat! Deschide dovleacul de azi 🎃'}</h2>
          <p>{s.approved ? `Câte un dovleac pe zi, până pe 31 octombrie: 5–30 de puncte Creator Score. Toate 7 zilele = +${STREAK_BONUS} bonus.` : 'Profilul tău trebuie să fie aprobat ca să participi.'}</p>
        </>)}
        {s.phase === 'over' && (<>
          <h2>Mulțumim că ai jucat Trick or Treat 👻</h2>
          <p>Punctele au intrat în Creator Score. Ne vedem la următorul joc!</p>
        </>)}
        {s.phase !== 'teaser' && (
          <div className="hw-days" aria-label={`${opened} din 7 dovleci deschiși`}>
            {s.days.map((d: any) => (
              <span key={d.day} className={`hw-day ${d.points != null ? 'done' : ''} ${d.isToday ? 'today' : ''} ${d.points == null && d.past ? 'miss' : ''}`}>
                <b>{d.points != null ? '🎃' : d.past ? '·' : '?'}</b>{dayLabel(d.day)} oct
              </span>
            ))}
          </div>
        )}
        {s.phase !== 'teaser' && <div className="hw-meta">Ai strâns <b>{s.total} puncte</b> · {opened}/7 dovleci{s.bonus ? ` · bonus +${s.bonus} ✓` : ''}</div>}
        {err && <div className="hw-err">{err}</div>}
      </div>
    </section>
  )
}
