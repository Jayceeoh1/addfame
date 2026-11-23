'use client'

// Dashboard: banner mare către AddFame Academy (Academy Member). Pentru cine nu e membru arată oferta de lansare
// și locurile rămase (numărate de Stripe); pentru membri, o scurtătură spre Academie.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyMembership } from '@/app/actions/academy-member'
import { ACADEMY_BADGE_LABEL } from '@/lib/academy-member'
import { TIERS, TIER_ORDER } from '@/lib/academy'

export default function AcademyBannerCard() {
  const [st, setSt] = useState<any>(null)
  useEffect(() => { getMyMembership().then(setSt).catch(() => {}) }, [])
  if (!st?.success) return null
  const member = !!st.active
  const launch = !member ? st.launch : null
  const taken = launch ? launch.total - launch.left : 0

  return (
    <Link href="/influencer/academie#academy-member" className="acb" aria-label="AddFame Academy · Academy Member">
      <style>{`
        .acb { position: relative; overflow: hidden; display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; padding: 20px 24px; border-radius: 20px; text-decoration: none; color: #fff;
          background: radial-gradient(110% 140% at 100% 0%, #a58bff 0%, rgba(165,139,255,0) 50%), linear-gradient(135deg, #2a1673 0%, #5b2fd0 100%); transition: transform .15s; }
        .acb:hover { transform: translateY(-2px); }
        .acb-cast { flex: none; display: flex; }
        .acb-cast img { width: 64px; height: 64px; object-fit: contain; margin-left: -14px; }
        .acb-cast img:first-child { margin-left: 0; }
        .acb-txt { flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .acb-tag { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #d9d2ff; }
        .acb-t { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
        .acb-s { font-size: 14px; color: #e4ddff; line-height: 1.45; }
        .acb-spots { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; max-width: 360px; }
        .acb-spots b { font-size: 13px; color: #ffd8b0; font-variant-numeric: tabular-nums; }
        .acb-bar { height: 7px; border-radius: 99px; background: rgba(255,255,255,.2); overflow: hidden; }
        .acb-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg,#ff9a3d,#ff4f8b); min-width: 4px; }
        .acb-cta { flex: none; display: inline-flex; align-items: center; height: 44px; padding: 0 18px; border-radius: 12px; background: #fff; color: #2a1673; font-weight: 800; font-size: 14px; }
        @media (max-width: 640px) { .acb { padding: 18px; } .acb-cast { order: -1; flex: 0 0 100%; justify-content: center; } .acb-cast img { width: 72px; height: 72px; } .acb-txt { flex: 0 0 100%; text-align: center; align-items: center; } .acb-spots { width: 100%; } .acb-cta { flex: 0 0 100%; justify-content: center; } }
      `}</style>
      <div className="acb-cast" aria-hidden="true">
        {TIER_ORDER.map((k: string) => <img key={k} src={TIERS[k as keyof typeof TIERS].frame} alt="" />)}
      </div>
      <div className="acb-txt">
        <span className="acb-tag">AddFame Academy · {ACADEMY_BADGE_LABEL}</span>
        {member ? (<>
          <span className="acb-t">Ești {ACADEMY_BADGE_LABEL} 🎓</span>
          <span className="acb-s">Cursuri noi în fiecare luni, feedback pe materiale, analiza profilului și comunitatea privată.</span>
        </>) : launch ? (<>
          <span className="acb-t">Devino {ACADEMY_BADGE_LABEL}: {launch.firstMonth} lei prima lună</span>
          <span className="acb-s">Ofertă de lansare pentru primii {launch.total} membri, apoi {st.price} lei / lună. Cursuri noi în fiecare luni, feedback, analiza profilului și bifa pe profil.</span>
          <span className="acb-spots">
            <b>🔥 {launch.left === 1 ? 'A mai rămas un singur loc' : `Mai sunt ${launch.left} locuri din ${launch.total}`}</b>
            <span className="acb-bar"><i style={{ width: `${Math.round((taken / launch.total) * 100)}%` }} /></span>
          </span>
        </>) : (<>
          <span className="acb-t">Devino {ACADEMY_BADGE_LABEL}</span>
          <span className="acb-s">Cursuri noi în fiecare luni, feedback pe materiale, analiza profilului și bifa {ACADEMY_BADGE_LABEL} pe profil · {st.price} lei / lună.</span>
        </>)}
      </div>
      <span className="acb-cta">{member ? 'Mergi la Academie' : launch ? 'Prinde locul' : 'Află mai multe'}</span>
    </Link>
  )
}
