'use client'

// Dashboard: campania pusă „în prim-plan” de admin. Apare doar cât timp campania e activă și are locuri.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getFeaturedCampaign } from '@/app/actions/featured-campaign'

export default function FeaturedCampaignCard() {
  const [c, setC] = useState<Awaited<ReturnType<typeof getFeaturedCampaign>>>(null)
  useEffect(() => { getFeaturedCampaign().then(setC).catch(() => {}) }, [])
  if (!c) return null
  const days = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86_400_000) : null
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
          {days !== null && days >= 0 ? ` · ${days} zile` : ''}
        </span>
      </div>
      <span className="fcc-cta">{c.applied ? 'Vezi aplicarea' : 'Aplică acum'}</span>
    </Link>
  )
}
