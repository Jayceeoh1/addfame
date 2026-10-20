'use client'

// Dashboard: campania pusă „în prim-plan” de admin. Apare doar cât timp campania e activă și are locuri.
// Cu „Înscrieri până la” setat, arată un timer de urgență.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFeaturedCampaign } from '@/app/actions/featured-campaign'

function useLeft(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAt])
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - now
  if (!(ms > 0)) return null
  const s = Math.floor(ms / 1000)
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, hot: ms < 86_400_000 }
}

export default function FeaturedCampaignCard() {
  const [c, setC] = useState<Awaited<ReturnType<typeof getFeaturedCampaign>>>(null)
  useEffect(() => { getFeaturedCampaign().then(setC).catch(() => {}) }, [])
  const left = useLeft(c?.endsAt)
  if (!c) return null
  const days = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86_400_000) : null
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <Link href={`/influencer/campaigns/${c.id}`} className="fcc" aria-label={`Campanie: ${c.name}`}>
      <style>{`
        .fcc { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 18px; padding: 16px 20px; border-radius: 20px; text-decoration: none; color: #1a1033; background: linear-gradient(135deg, #efeaff 0%, #fff1e6 100%); border: 1.5px solid #d9ccff; transition: transform .15s; }
        .fcc:hover { transform: translateY(-2px); }
        .fcc-img { flex: none; width: 76px; height: 76px; border-radius: 14px; object-fit: cover; background: #fff; }
        .fcc-txt { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .fcc-tag { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #5a35e6; }
        .fcc-t { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; overflow-wrap: anywhere; }
        .fcc-s { font-size: 14px; color: #4a4163; }
        .fcc-time { display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; align-self: flex-start; padding: 6px 12px; border-radius: 10px; background: #1a1033; color: #fff; font-size: 13px; font-weight: 700; }
        .fcc-time b { font-variant-numeric: tabular-nums; font-size: 15px; color: #ffb347; letter-spacing: .02em; }
        .fcc-time.hot { background: #c2261b; } .fcc-time.hot b { color: #fff; }
        .fcc-cta { flex: none; display: inline-flex; align-items: center; height: 44px; padding: 0 18px; border-radius: 12px; background: #5a35e6; color: #fff; font-weight: 800; font-size: 14px; }
        @media (max-width: 640px) { .fcc { padding: 16px; } .fcc-img { width: 64px; height: 64px; } .fcc-cta { flex: 0 0 100%; justify-content: center; } }
      `}</style>
      {c.image && <img className="fcc-img" src={c.image} alt="" />}
      <div className="fcc-txt">
        <span className="fcc-tag">Campanie nouă{c.brand ? ` · ${c.brand}` : ''}</span>
        <span className="fcc-t">{c.name}</span>
        <span className="fcc-s">
          {c.offer || 'Produse gratuite'}
          {c.left !== null ? ` · ${c.left} locuri rămase` : ''}
          {!left && days !== null && days >= 0 ? ` · ${days} zile` : ''}
        </span>
        {left && (
          <span className={`fcc-time${left.hot ? ' hot' : ''}`}>
            ⏳ Înscrierile se închid în <b>{left.d > 0 ? `${left.d}z ` : ''}{p(left.h)}:{p(left.m)}:{p(left.s)}</b>
          </span>
        )}
      </div>
      <span className="fcc-cta">{c.applied ? 'Vezi aplicarea' : 'Aplică acum'}</span>
    </Link>
  )
}
