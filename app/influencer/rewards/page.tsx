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
    { key: 'starter', emoji: '🌱', pts: '0–299', desc: 'Punct de plecare pentru toți creatorii noi.' },
    { key: 'rising',  emoji: '⭐', pts: '300–899', desc: 'Ai finalizat primele colaborări cu succes.' },
    { key: 'pro',     emoji: '🔥', pts: '900–2.499', desc: '~15 colaborări excelente, consecvente.' },
    { key: 'elite',   emoji: '💎', pts: '2.500+', desc: '30+ colaborări impecabile. Top creator AddFame.' },
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
    { icon: TrendingDown, color: '#b91c1c', label: 'Colaborare abandonată', pts: '-200 + ⚠️ strike', desc: 'Ai anulat o colaborare activă' },
    { icon: TrendingDown, color: '#991b1b', label: 'Colaborare expirată', pts: '-300', desc: 'Deadline trecut fără dovadă trimisă' },
    { icon: AlertTriangle, color: '#7f1d1d', label: 'Nu răspunzi la inbox 7 zile', pts: '-100 + ⚠️ strike', desc: 'Ignorarea mesajelor de la branduri' },
    { icon: AlertTriangle, color: '#7f1d1d', label: 'Cont semnalat de admin', pts: '-150', desc: 'Comportament necorespunzător' },
  ]

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Back */}
      <Link href="/influencer/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#7c3aed', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft style={{ width: 16, height: 16 }} /> Înapoi la dashboard
      </Link>

      {/* Hero header */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d1b69)', borderRadius: 20, padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 160, height: 160, background: '#4c1d95', borderRadius: '0 0 0 100%', opacity: 0.5 }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Zap style={{ width: 20, height: 20, color: '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Creator Score System</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1.2, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            Cu cât postezi mai repede,<br />cu atât câștigi mai mult.
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            Sistemul de puncte îți recompensează viteza, calitatea și consecvența. Urci în nivel → apari mai sus la branduri → mai multe colaborări.
          </p>
        </div>
      </div>

      {/* Scorul tău */}
      {!loading && profile && (
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f0f0f0', padding: '20px 20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>Scorul tău actual</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <AvatarWithBadge avatarUrl={profile.avatar} name={profile.name} score={score} size={56} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#111827', margin: '0 0 2px' }}>{profile.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: config.color, letterSpacing: '-0.5px' }}>{score.toLocaleString('ro-RO')} pts</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: config.color }}>{config.label}</span>
              </div>
            </div>
            <img src={BADGE_IMAGES[level]} alt={level} style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </div>

          {/* Progress bar */}
          <div style={{ background: '#f3f4f6', borderRadius: 100, height: 8, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: config.color, borderRadius: 100, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
            <span>{config.min.toLocaleString('ro-RO')} pts</span>
            {nextLevel
              ? <span style={{ color: config.color, fontWeight: 700 }}>{(nextLevel - score).toLocaleString('ro-RO')} pts până la nivelul următor</span>
              : <span style={{ color: '#b45309', fontWeight: 700 }}>Nivel maxim! 🏆</span>
            }
            {nextLevel && <span>{nextLevel.toLocaleString('ro-RO')} pts</span>}
          </div>
        </div>
      )}

      {/* Niveluri */}
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f0f0f0', padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>Nivelurile Creator Score</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {levels.map(({ key, emoji, pts, desc }) => {
            const cfg = LEVEL_CONFIG[key]
            const isCurrent = key === level
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: isCurrent ? `${cfg.color}12` : '#fafafa',
                border: `1.5px solid ${isCurrent ? cfg.color : '#f0f0f0'}`,
              }}>
                <img src={BADGE_IMAGES[key]} alt={key} style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: cfg.color }}>{cfg.label}</span>
                    {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, background: cfg.color, color: 'white', padding: '1px 8px', borderRadius: 100 }}>Nivelul tău</span>}
                  </div>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{pts} puncte · {desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cum câștigi puncte */}
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #f0f0f0', padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 14px' }}>
          ✅ Cum câștigi puncte
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gains.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f9fafb' }}>
              <g.icon style={{ width: 18, height: 18, color: g.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{g.label}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{g.desc}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#10b981', background: '#ecfdf5', padding: '3px 10px', borderRadius: 100, flexShrink: 0 }}>{g.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Penalizări */}
      <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #fecaca', padding: '20px', marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ef4444', margin: '0 0 14px' }}>
          ⚠️ Penalizări
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {penalties.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#fff5f5' }}>
              <p.icon style={{ width: 18, height: 18, color: p.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{p.label}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{p.desc}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#ef4444', background: '#fef2f2', padding: '3px 10px', borderRadius: 100, flexShrink: 0 }}>{p.pts}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '12px 14px', background: '#fef3c7', borderRadius: 10, border: '1px solid #fde68a' }}>
          <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 4px', fontWeight: 800 }}>
            ⚠️ Scorul contează — neseriozitatea are consecințe reale.
          </p>
          <p style={{ fontSize: 12, color: '#92400e', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
            Un scor ridicat îți aduce mai multe colaborări și vizibilitate în fața brandurilor. Penalizările îți scad scorul și pot duce la <strong>suspendarea contului</strong> și <strong>excluderea din campaniile viitoare</strong>.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: '0 0 6px' }}>Gata să urci în clasament?</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px' }}>Postează rapid, postează bine — punctele vin singure.</p>
        <Link href="/influencer/collaborations" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'white', color: '#7c3aed', fontWeight: 900,
          fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
        }}>
          <Zap style={{ width: 15, height: 15 }} /> Vezi colaborările mele
        </Link>
      </div>

    </div>
  )
}
