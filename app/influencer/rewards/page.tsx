'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCreatorLevel, LEVEL_CONFIG, BADGE_IMAGES } from '@/lib/creator-score'
import { AvatarWithBadge } from '@/components/shared/CreatorBadge'
import Link from 'next/link'
import { ArrowLeft, Zap, TrendingUp, TrendingDown, Clock, CheckCircle, Star, Shield, Users, AlertTriangle } from 'lucide-react'

export default function RewardsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('influencers')
        .select('name, avatar, creator_score')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setProfile(data)
          setLoading(false)
        })
    })
  }, [])

  const score = profile?.creator_score ?? 0
  const level = getCreatorLevel(score)
  const config = LEVEL_CONFIG[level]
  const nextLevel = config.next
  const progress = nextLevel
    ? Math.round(((score - config.min) / (nextLevel - config.min)) * 100)
    : 100

  const levels = [
    { key: 'starter', pts: '0–299', desc: 'Punct de plecare pentru toți creatorii noi.' },
    { key: 'rising',  pts: '300–899', desc: 'Ai finalizat primele colaborări cu succes.' },
    { key: 'pro',     pts: '900–2.499', desc: '~15 colaborări excelente, consecvente.' },
    { key: 'elite',   pts: '2.500+', desc: '30+ colaborări impecabile. Top creator AddFame.' },
  ] as const

  const gains = [
    { icon: CheckCircle, color: '#10b981', label: 'Colaborare finalizată', pts: '+100', desc: 'La fiecare colaborare aprobată de brand' },
    { icon: Clock, color: '#7c3aed', label: 'Dovadă trimisă în 24h', pts: '+75', desc: 'Bonus viteză — trimite repede!' },
    { icon: Clock, color: '#8b5cf6', label: 'Dovadă trimisă în 48h', pts: '+40', desc: 'Bonus viteză — tot contează' },
    { icon: Star, color: '#f59e0b', label: 'Aprobată din prima', pts: '+50', desc: 'Fără respingeri anterioare' },
    { icon: TrendingUp, color: '#10b981', label: 'ER > 15% pe post', pts: '+60', desc: 'Performanță excelentă de engagement' },
    { icon: TrendingUp, color: '#34d399', label: 'ER > 10% pe post', pts: '+30', desc: 'Performanță bună de engagement' },
    { icon: Shield, color: '#3b82f6', label: 'Identitate verificată', pts: '+50', desc: 'O singură dată, permanent' },
    { icon: Users, color: '#8b5cf6', label: 'Referral activ finalizat', pts: '+25', desc: 'Când prietenul tău completează o colaborare' },
  ]

  const penalties = [
    { icon: AlertTriangle, color: '#ef4444', label: 'Dovadă respinsă', pts: '-60', desc: 'Brandul a cerut modificări' },
    { icon: AlertTriangle, color: '#dc2626', label: 'A doua respingere consecutivă', pts: '-120', desc: 'Conținut repetat respins' },
    { icon: TrendingDown, color: '#b91c1c', label: 'Colaborare abandonată', pts: '-200 + strike', desc: 'Ai anulat o colaborare activă' },
    { icon: TrendingDown, color: '#991b1b', label: 'Colaborare expirată', pts: '-300', desc: 'Deadline trecut fără dovadă trimisă' },
    { icon: AlertTriangle, color: '#7f1d1d', label: 'Nu răspunzi la inbox 7 zile', pts: '-100 + strike', desc: 'Ignorarea mesajelor de la branduri' },
    { icon: AlertTriangle, color: '#7f1d1d', label: 'Cont semnalat de admin', pts: '-150', desc: 'Comportament necorespunzător' },
  ]

  return (
    <div className="iu">
      <style>{`
        .ir-hero { position: relative; overflow: hidden; background: #14123a; color: #fff; border-radius: 20px; padding: 26px; display: flex; flex-direction: column; gap: 18px; }
        .ir-glow { position: absolute; right: -70px; top: -90px; width: 260px; height: 260px; border-radius: 50%; background: linear-gradient(135deg, #9030f0, #7040f0); opacity: .45; filter: blur(40px); pointer-events: none; }
        .ir-hero > *:not(.ir-glow) { position: relative; }
        .ir-lbl { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.6); }
        .ir-score { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 44px; letter-spacing: -0.03em; line-height: 1.05; }
        .ir-score small { font-size: 18px; margin-left: 6px; color: rgba(255,255,255,.6); }
        .ir-track { height: 8px; border-radius: 99px; background: rgba(255,255,255,.14); overflow: hidden; }
        .ir-track > i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #7040f0, #c79bff); transition: width 1s ease; }
        .ir-ladder { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
        .ir-step { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 16px 10px; border-radius: 16px; border: 1.5px solid #e5e3f3; background: #fff; }
        .ir-step.cur { background: #f7f4ff; border-color: #7040f0; }
        .ir-step.done { background: #fafafe; }
        .ir-step img { width: 48px; height: 48px; object-fit: contain; }
        .ir-step.todo img { filter: grayscale(1); opacity: .5; }
        .ir-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #eeecf7; }
        .ir-row:first-child { border-top: 0; }
        .ir-row p { margin: 0; }
        .ir-cols { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px; align-items: start; }
        .ir-cta { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: linear-gradient(135deg, #7040f0, #9030f0); color: #fff; border-radius: 20px; padding: 22px 24px; }
        .ir-cta .iu-btn { background: #fff; color: #5b2fd0; border-color: #fff; }
        .ir-cta .iu-btn:hover { background: #f6f1ff; }
        @media (max-width: 900px) { .ir-cols { grid-template-columns: minmax(0,1fr); } }
        @media (max-width: 640px) {
          .ir-ladder { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .ir-hero { padding: 20px; } .ir-score { font-size: 36px; }
          .ir-cta { padding: 18px; } .ir-cta .iu-btn { width: 100%; height: 48px; }
        }
      `}</style>

      {/* Header */}
      <div className="iu-head">
        <div>
          <div className="iu-label" style={{ marginBottom: 6 }}>Creator Score</div>
          <h1>Recompense</h1>
          <p className="iu-muted iu-sm" style={{ margin: '6px 0 0', maxWidth: 560 }}>
            Cu cât postezi mai repede, cu atât câștigi mai mult. Urci în nivel, apari mai sus la branduri și primești mai multe colaborări.
          </p>
        </div>
        <Link href="/influencer/dashboard" className="iu-btn"><ArrowLeft className="w-4 h-4" /> Înapoi la dashboard</Link>
      </div>

      {/* Scorul tău */}
      {loading ? (
        <div className="iu-card iu-card-pad iu-muted iu-sm" style={{ textAlign: 'center', padding: 40 }}>Se încarcă scorul...</div>
      ) : profile && (
        <div className="ir-hero">
          <div className="ir-glow" />
          <div className="ir-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap className="w-4 h-4" /> Scorul tău actual</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AvatarWithBadge avatarUrl={profile.avatar} name={profile.name} score={score} size={60} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
              <div className="ir-score">{score.toLocaleString('ro-RO')}<small>pts · {config.label}</small></div>
            </div>
            <img src={BADGE_IMAGES[level]} alt={level} style={{ width: 56, height: 56, objectFit: 'contain', flex: 'none' }} />
          </div>

          <div>
            <div className="ir-track"><i style={{ width: `${progress}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.65)', marginTop: 8 }}>
              <span>{config.min.toLocaleString('ro-RO')} pts</span>
              {nextLevel
                ? <span style={{ color: '#fff', fontWeight: 700 }}>{(nextLevel - score).toLocaleString('ro-RO')} pts până la nivelul următor</span>
                : <span style={{ color: '#ffd666', fontWeight: 700 }}>Nivel maxim!</span>}
              {nextLevel && <span>{nextLevel.toLocaleString('ro-RO')} pts</span>}
            </div>
          </div>
        </div>
      )}

      {/* Niveluri */}
      <div className="iu-card iu-card-pad">
        <div className="iu-label" style={{ marginBottom: 14 }}>Nivelurile Creator Score</div>
        <div className="ir-ladder">
          {levels.map(({ key, pts, desc }, idx) => {
            const cfg = LEVEL_CONFIG[key]
            const isCurrent = key === level
            const curIdx = levels.findIndex(l => l.key === level)
            const state = isCurrent ? 'cur' : idx < curIdx ? 'done' : 'todo'
            return (
              <div key={key} className={`ir-step ${state}`}>
                <img src={BADGE_IMAGES[key]} alt={key} />
                <span className="iu-d" style={{ fontWeight: 800, fontSize: 16, color: isCurrent ? '#5b2fd0' : '#14123a' }}>{cfg.label}</span>
                <span className="iu-chip" style={isCurrent ? { background: '#7040f0', color: '#fff' } : idx < curIdx ? { background: '#dcf5ec', color: '#14532d' } : { background: '#f0eff7', color: '#4a4770' }}>
                  {isCurrent ? 'Nivelul tău' : idx < curIdx ? 'Atins' : `${pts} pts`}
                </span>
                <p className="iu-xs iu-muted" style={{ margin: 0 }}>{isCurrent || idx < curIdx ? `${pts} pts · ` : ''}{desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="ir-cols">
        {/* Cum câștigi puncte */}
        <div className="iu-card iu-card-pad">
          <h2 style={{ marginBottom: 6 }}>Cum câștigi puncte</h2>
          <div>
            {gains.map((g, i) => (
              <div key={i} className="ir-row">
                <div className="iu-ico" style={{ background: '#dcf5ec', color: '#14532d', width: 36, height: 36, borderRadius: 10 }}><g.icon className="w-4 h-4" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</p>
                  <p className="iu-xs iu-muted">{g.desc}</p>
                </div>
                <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d', flex: 'none' }}>{g.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Penalizări */}
        <div className="iu-card iu-card-pad">
          <h2 style={{ marginBottom: 6, color: '#b42318' }}>Penalizări</h2>
          <div>
            {penalties.map((p, i) => (
              <div key={i} className="ir-row">
                <div className="iu-ico" style={{ background: '#fde8e6', color: '#b42318', width: 36, height: 36, borderRadius: 10 }}><p.icon className="w-4 h-4" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</p>
                  <p className="iu-xs iu-muted">{p.desc}</p>
                </div>
                <span className="iu-chip" style={{ background: '#fde8e6', color: '#b42318', flex: 'none' }}>{p.pts}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#fff1c2', borderRadius: 12, color: '#854d0e' }}>
            <p style={{ fontSize: 13, margin: '0 0 4px', fontWeight: 800 }}>Scorul contează — neseriozitatea are consecințe reale.</p>
            <p className="iu-xs" style={{ margin: 0, lineHeight: 1.6 }}>
              Un scor ridicat îți aduce mai multe colaborări și vizibilitate în fața brandurilor. Penalizările îți scad scorul și pot duce la <strong>suspendarea contului</strong> și <strong>excluderea din campaniile viitoare</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="ir-cta">
        <div>
          <p className="iu-d" style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800 }}>Gata să urci în clasament?</p>
          <p style={{ margin: 0, fontSize: 14, opacity: .8 }}>Postează rapid, postează bine — punctele vin singure.</p>
        </div>
        <Link href="/influencer/collaborations" className="iu-btn big"><Zap className="w-4 h-4" /> Vezi colaborările mele</Link>
      </div>
    </div>
  )
}
