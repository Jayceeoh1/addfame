'use client'
// Numărătoarea inversă până la sfârșitul ofertei de lansare Academy Member.
import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

export default function LaunchCountdown({ endsAt, dark = false, onEnd }: { endsAt: string; dark?: boolean; onEnd?: () => void }) {
  const end = new Date(endsAt).getTime()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const left = now === null ? null : Math.max(0, end - now)
  useEffect(() => { if (left === 0) onEnd?.() }, [left === 0]) // eslint-disable-line react-hooks/exhaustive-deps
  if (left === null || left === 0) return null
  const d = Math.floor(left / 86400000)
  const h = Math.floor((left % 86400000) / 3600000)
  const m = Math.floor((left % 3600000) / 60000)
  const s = Math.floor((left % 60000) / 1000)
  const parts: [string, string][] = [[String(d), d === 1 ? 'zi' : 'zile'], [pad(h), 'ore'], [pad(m), 'min'], [pad(s), 'sec']]
  return (
    <div className={`lcd ${dark ? 'dark' : ''}`} role="timer" aria-label={`Oferta se termină în ${d} zile, ${h} ore și ${m} minute`}>
      <style>{`
        .lcd { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .lcd-l { font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; margin-right: 4px; color: #b33a00; }
        .lcd.dark .lcd-l { color: #ffd8b0; }
        .lcd-u { display: inline-flex; flex-direction: column; align-items: center; min-width: 46px; padding: 5px 6px; border-radius: 10px; background: #fff; border: 1px solid #ffd3b0; }
        .lcd.dark .lcd-u { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.22); }
        .lcd-u b { font-size: 18px; line-height: 1.1; font-weight: 800; color: #14123a; font-variant-numeric: tabular-nums; }
        .lcd.dark .lcd-u b { color: #fff; }
        .lcd-u small { font-size: 10px; font-weight: 700; color: #8a5a3a; text-transform: uppercase; letter-spacing: .03em; }
        .lcd.dark .lcd-u small { color: #e4ddff; }
        @media (max-width: 640px) { .lcd.dark { justify-content: center; } .lcd.dark .lcd-l { flex-basis: 100%; text-align: center; margin: 0 0 2px; } }
      `}</style>
      <span className="lcd-l">⏳ Oferta se termină în</span>
      {parts.map(([v, l]) => <span key={l} className="lcd-u"><b>{v}</b><small>{l}</small></span>)}
    </div>
  )
}
