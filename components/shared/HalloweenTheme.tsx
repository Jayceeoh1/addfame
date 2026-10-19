'use client'

// Tema de Halloween (24 oct – 1 nov, ora României): un strat decorativ peste tot site-ul, fără să schimbe paginile.
// Nu blochează click-urile (pointer-events: none), nu apare în Admin și se oprește singură după 1 noiembrie.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isThemeActive } from '@/lib/halloween'

const DECOR = [
  { e: '🦇', top: '9%', left: '3%', size: 26, d: 0 },
  { e: '🦇', top: '16%', right: '5%', size: 20, d: 1.2 },
  { e: '🦇', top: '62%', right: '2.5%', size: 22, d: 2.1 },
  { e: '🎃', bottom: '3%', left: '2%', size: 30, d: .6 },
  { e: '🕸️', top: '0', right: '0', size: 44, d: 0, still: true },
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
        .hwt span { position: absolute; opacity: .55; animation: hwtFloat 6s ease-in-out infinite; filter: drop-shadow(0 2px 4px rgba(0,0,0,.15)); }
        .hwt span.still { animation: none; opacity: .35; }
        @keyframes hwtFloat { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-10px) rotate(4deg) } }
        @media (max-width: 640px) { .hwt span:not(.still) { opacity: .35; } }
        @media (prefers-reduced-motion: reduce) { .hwt span { animation: none; } }
        @media print { .hwt { display: none; } }
      `}</style>
      {DECOR.map((x, i) => (
        <span key={i} className={x.still ? 'still' : ''}
          style={{ top: x.top, left: (x as any).left, right: (x as any).right, bottom: (x as any).bottom, fontSize: x.size, animationDelay: `${x.d}s` }}>{x.e}</span>
      ))}
    </div>
  )
}
