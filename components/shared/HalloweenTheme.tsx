'use client'

// Tema de Halloween (24 oct – 1 nov, ora României): un strat decorativ peste tot site-ul, fără să schimbe paginile.
// Nu blochează click-urile (pointer-events: none), nu apare în Admin și se oprește singură după 1 noiembrie.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isThemeActive } from '@/lib/halloween'

// lilieci desenați (SVG) + mini-dovleacul; fără emoji, ca să arate la fel pe toate telefoanele
const BAT = 'M32 9c-1-3-3-5-3-5l-1 4C22 4 13 4 6 10c5 0 9 3 10 8 3-3 7-3 10 0 2-2 4-3 6-3s4 1 6 3c3-3 7-3 10 0 1-5 5-8 10-8-7-6-16-6-22-2l-1-4s-2 2-3 5z'
const BATS = [
  { top: '9%', left: '3%', w: 46, d: 0 },
  { top: '16%', right: '5%', w: 36, d: 1.2 },
  { top: '62%', right: '2.5%', w: 40, d: 2.1 },
]

export default function HalloweenTheme() {
  const pathname = usePathname() || ''
  const [on, setOn] = useState(false)
  useEffect(() => { setOn(isThemeActive()) }, [])
  if (!on || pathname.startsWith('/admin')) return null
  return (
    <div className="hwt" aria-hidden="true">
      <style>{`
        .hwt { position: fixed; inset: 0; pointer-events: none; z-index: 40;
          background: radial-gradient(60% 40% at 100% 0%, rgba(255,122,26,.10), rgba(255,122,26,0) 70%),
                      radial-gradient(50% 45% at 0% 100%, rgba(124,58,237,.10), rgba(124,58,237,0) 70%); }
        .hwt svg { opacity: .5; animation: hwtFloat 6s ease-in-out infinite; }
        .hwt img.still { opacity: .8; }
        @keyframes hwtFloat { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-10px) rotate(4deg) } }
        @media (max-width: 640px) { .hwt svg { opacity: .3; } .hwt img.still { display: none; } }
        @media (prefers-reduced-motion: reduce) { .hwt svg { animation: none; } }
        @media print { .hwt { display: none; } }
      `}</style>
      {BATS.map((x, i) => (
        <svg key={i} viewBox="0 0 64 30" width={x.w} height={Math.round(x.w * 0.47)}
          style={{ position: 'absolute', top: x.top, left: (x as any).left, right: (x as any).right, animationDelay: `${x.d}s` }}>
          <path d={BAT} fill="#2a1a4a" />
        </svg>
      ))}
      <img src="/halloween/pumpkin-mini.webp" alt="" width={44} height={44} className="still" style={{ position: 'absolute', bottom: 14, left: 14 }} />
    </div>
  )
}
