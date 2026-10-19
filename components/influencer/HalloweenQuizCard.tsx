'use client'

// Dashboard: intrarea în quiz-ul de Halloween. Apare doar cât timp adminul îl ține pornit.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getQuizState } from '@/app/actions/halloween-quiz'
import { characterById, QUIZ_POINTS } from '@/lib/halloween-quiz'

export default function HalloweenQuizCard() {
  const [st, setSt] = useState<any>(null)
  useEffect(() => { getQuizState().then(setSt).catch(() => {}) }, [])
  if (!st?.enabled) return null
  const played = st.result ? characterById(st.result.characterId) : null
  return (
    <Link href="/influencer/halloween-quiz" className="hqc" aria-label="Quiz de Halloween">
      <style>{`
        .hqc { position: relative; overflow: hidden; display: flex; align-items: center; gap: 18px; padding: 18px 22px; border-radius: 20px; text-decoration: none; color: #fff; min-height: 0;
          background: radial-gradient(110% 140% at 100% 0%, #ff7a1a 0%, rgba(255,122,26,0) 45%), linear-gradient(135deg, #1b0f3d 0%, #2d1260 60%, #3b1170 100%); transition: transform .15s; }
        .hqc:hover { transform: translateY(-2px); }
        .hqc-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .hqc-tag { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #ffb347; }
        .hqc-t { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; }
        .hqc-s { font-size: 14px; color: #ddd3f8; }
        .hqc-cta { flex: none; display: inline-flex; align-items: center; height: 44px; padding: 0 16px; border-radius: 12px; background: #ff8a1f; color: #2a1004; font-weight: 800; font-size: 14px; }
        .hqc-cast { flex: none; display: flex; }
        .hqc-cast img { width: 58px; height: 58px; object-fit: contain; margin-left: -12px; }
        @media (max-width: 640px) { .hqc { flex-wrap: wrap; } .hqc-cast { order: -1; } .hqc-cta { width: 100%; justify-content: center; } }
      `}</style>
      <div className="hqc-cast" aria-hidden="true">
        {(played ? [played.id] : ['vrajitoare', 'vampir', 'dovleac', 'zombie', 'fantoma']).map(id => <img key={id} src={`/halloween/chars/${id}.webp`} alt="" style={played ? { width: 76, height: 76, margin: 0 } : undefined} />)}
      </div>
      <div className="hqc-txt">
        <span className="hqc-tag">Quiz de Halloween</span>
        <span className="hqc-t">{played ? `Tu ești ${played.name}` : 'Ce influencer de Halloween ești?'}</span>
        <span className="hqc-s">{played ? 'Postează-ți cardul pe Story și provoacă-ți prietenii.' : `8 întrebări, un minut${st.approved ? ` · +${QUIZ_POINTS} puncte Creator Score` : ''}.`}</span>
      </div>
      <span className="hqc-cta">{played ? 'Vezi cardul' : 'Joacă acum'}</span>
    </Link>
  )
}
