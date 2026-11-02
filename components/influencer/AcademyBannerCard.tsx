'use client'

// Dashboard: banner mare către Academia AddFame. Înainte de certificat invită la curs, după el arată nivelul obținut.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAcademy } from '@/app/actions/academy'
import { TIERS, TIER_ORDER } from '@/lib/academy'

export default function AcademyBannerCard() {
  const [st, setSt] = useState<any>(null)
  useEffect(() => { getAcademy().then(setSt).catch(() => {}) }, [])
  if (!st?.success || !st.lessons?.length) return null
  const tier = st.certifiedAt && st.tier ? TIERS[st.tier as keyof typeof TIERS] : null
  const started = st.lessons.some((l: any) => l.attempts > 0)
  return (
    <Link href="/influencer/academie" className="acb" aria-label="Academia AddFame">
      <style>{`
        .acb { position: relative; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; padding: 20px 24px; border-radius: 20px; text-decoration: none; color: #fff;
          background: radial-gradient(110% 140% at 100% 0%, #a58bff 0%, rgba(165,139,255,0) 50%), linear-gradient(135deg, #2a1673 0%, #5b2fd0 100%); transition: transform .15s; }
        .acb:hover { transform: translateY(-2px); }
        .acb-cast { flex: none; display: flex; }
        .acb-cast img { width: 64px; height: 64px; object-fit: contain; margin-left: -14px; }
        .acb-cast img:first-child { margin-left: 0; }
        .acb-txt { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .acb-tag { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #d9d2ff; }
        .acb-t { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
        .acb-s { font-size: 14px; color: #e4ddff; }
        .acb-cta { flex: none; display: inline-flex; align-items: center; height: 44px; padding: 0 18px; border-radius: 12px; background: #fff; color: #2a1673; font-weight: 800; font-size: 14px; }
        @media (max-width: 640px) { .acb { padding: 18px; } .acb-cast { order: -1; flex: 0 0 100%; justify-content: center; } .acb-cast img { width: 72px; height: 72px; } .acb-txt { flex: 0 0 100%; text-align: center; align-items: center; } .acb-cta { flex: 0 0 100%; justify-content: center; } }
      `}</style>
      <div className="acb-cast" aria-hidden="true">
        {(tier ? [st.tier] : TIER_ORDER).map((k: string) => <img key={k} src={TIERS[k as keyof typeof TIERS].frame} alt="" style={tier ? { width: 84, height: 84 } : undefined} />)}
      </div>
      <div className="acb-txt">
        <span className="acb-tag">Academia AddFame</span>
        <span className="acb-t">{tier ? `Ești creator certificat ${tier.label}` : 'Devino creator certificat AddFame'}</span>
        <span className="acb-s">{tier ? 'Descarcă certificatul și postează-l pe Story.' : `Ramă pe poza de profil, certificat și +${st.lessons.reduce((s: number, l: any) => s + (l.points || 0), 0)} puncte Creator Score.`}</span>
      </div>
      <span className="acb-cta">{tier ? 'Vezi certificatul' : started ? 'Continuă' : 'Începe acum'}</span>
    </Link>
  )
}
