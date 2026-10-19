'use client'

// Sperieturile din quiz. Scurte (sub 3 secunde), fără lumini intermitente; o atingere le închide.
import { useEffect } from 'react'
import type { ScareKind } from '@/lib/halloween-scares'

const DURATION: Record<ScareKind | 'finale', number> = { ghost: 1700, zombie: 1900, algo: 3000, finale: 1900 }

export default function HalloweenScare({ kind, onDone }: { kind: ScareKind | 'finale'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, DURATION[kind]); return () => clearTimeout(t) }, [kind, onDone])
  return (
    <div className={`hs hs-${kind}`} onClick={onDone} role="status" aria-label="Sperietură scurtă. Se închide singură.">
      <style>{`
        .hs { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center; overflow: hidden; background: #05030d; cursor: pointer; animation: hsIn .25s ease-out both; }
        .hs-ghost, .hs-zombie { animation: hsIn .25s ease-out both, hsOut .35s ease-in both; }
        .hs-ghost { animation-delay: 0s, 1.35s; }
        .hs-zombie { animation-delay: 0s, 1.55s; }
        .hs-algo { animation: hsIn .3s ease-out both, hsOut .4s ease-in 2.6s both; }
        .hs-finale { animation: hsIn .2s ease-out both, hsOut .7s ease-in 1.2s both; }
        .hs img { position: absolute; object-fit: contain; pointer-events: none; }
        .hs-ghost img { width: min(92vw, 520px); height: min(92vw, 520px); animation: hsGhost .5s .35s cubic-bezier(.2,1.6,.4,1) both, hsShake .12s 0.85s 4 linear; filter: drop-shadow(0 0 40px rgba(190,170,255,.7)); }
        .hs-word { position: absolute; bottom: 12%; left: 0; right: 0; padding: 0 20px; box-sizing: border-box; text-align: center; text-wrap: balance; font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; color: #fff; font-size: clamp(44px, 14vw, 84px); letter-spacing: -0.02em; text-shadow: 0 0 30px #b79bff; }
        .hs-ghost .hs-word { animation: hsPop .3s .45s both; }
        .hs-zombie img { width: min(100vw, 560px); height: min(100vw, 560px); bottom: -4%; animation: hsRise .35s .15s cubic-bezier(.2,1.5,.4,1) both, hsShake .1s .6s 5 linear; }
        .hs-zombie .hs-word { top: 9%; bottom: auto; font-size: clamp(28px, 8vw, 52px); text-shadow: 0 0 24px #5fe36a; animation: hsPop .3s .5s both; }
        .hs-ban { position: absolute; top: 18px; left: 50%; width: min(92vw, 420px); transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: rgba(250,250,255,.96); color: #14123a; font-family: inherit; font-weight: 800; font-size: 16px; box-shadow: 0 12px 40px rgba(0,0,0,.5); box-sizing: border-box; }
        .hs-ban small { display: block; font-weight: 600; font-size: 12px; color: #6a6690; }
        .hs-ban .ic { width: 38px; height: 38px; flex: none; border-radius: 10px; background: linear-gradient(135deg,#7040f0,#ff8a1f); display: grid; place-items: center; font-size: 20px; }
        .hs-b1 { animation: hsBan .45s .2s cubic-bezier(.2,1.2,.4,1) both; }
        .hs-b2 { top: 92px; animation: hsBan .45s .95s cubic-bezier(.2,1.2,.4,1) both; }
        .hs-eyes { position: absolute; top: 52%; left: 50%; transform: translate(-50%,-50%); display: flex; gap: 46px; animation: hsEyes .5s 1.65s ease-out both; }
        .hs-eyes i { display: block; width: 58px; height: 34px; border-radius: 50%; background: radial-gradient(circle, #fff7b0 0 22%, #ffb300 38%, #ff5a00 70%, transparent 72%); box-shadow: 0 0 36px 10px rgba(255,140,0,.65); transform: rotate(-14deg); }
        .hs-eyes i:last-child { transform: rotate(14deg); }
        .hs-algo .hs-word { bottom: 14%; font-size: clamp(26px, 8vw, 44px); text-shadow: 0 0 20px #ff8a1f; animation: hsPop .3s 2s both; }
        .hs-finale .hs-word { position: static; font-size: clamp(24px, 7vw, 40px); animation: hsFade 1.4s both; }
        @keyframes hsIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hsOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes hsFade { 0% { opacity: 0 } 30% { opacity: 1 } 100% { opacity: 1 } }
        @keyframes hsGhost { from { transform: scale(.15); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes hsRise { from { transform: translateY(110%) } to { transform: translateY(0) } }
        @keyframes hsShake { 0%,100% { translate: 0 0 } 25% { translate: -6px 3px } 75% { translate: 6px -3px } }
        @keyframes hsPop { from { transform: scale(.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes hsBan { from { transform: translate(-50%,-140%); opacity: 0 } to { transform: translate(-50%,0); opacity: 1 } }
        @keyframes hsEyes { from { opacity: 0; transform: translate(-50%,-50%) scale(.6) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
      `}</style>

      {kind === 'ghost' && (<>
        <img src="/halloween/chars/fantoma.webp" alt="" />
        <div className="hs-word">BU! 👻</div>
      </>)}

      {kind === 'zombie' && (<>
        <div className="hs-word">Nu-ți dau drumul! 🧟</div>
        <img src="/halloween/chars/zombie.webp" alt="" />
      </>)}

      {kind === 'algo' && (<>
        <div className="hs-ban hs-b1"><span className="ic">🔔</span><span>Algoritmul te urmărește 👀<small>acum</small></span></div>
        <div className="hs-ban hs-b2"><span className="ic">📉</span><span>-1.000 followeri 😱<small>acum</small></span></div>
        <div className="hs-eyes" aria-hidden="true"><i /><i /></div>
        <div className="hs-word">Glumeam. Poate. 😈</div>
      </>)}

      {kind === 'finale' && <div className="hs-word">Se numără sufletele… 🎃</div>}
    </div>
  )
}
