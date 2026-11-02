'use client'

import { BADGE_IMAGES, LEVEL_CONFIG, getCreatorLevel, type CreatorLevel } from '@/lib/creator-score'
import type { CSSProperties } from 'react'
import { TIERS, isTier, type AcademyTier } from '@/lib/academy'

// ── Badge mic pe avatar ───────────────────────────────────────────
// Folosire: <AvatarWithBadge avatarUrl={inf.avatar} score={inf.creator_score} size={48} />
export function AvatarWithBadge({
  avatarUrl,
  name,
  score = 0,
  size = 48,
  showLabel = false,
  frame = null,
}: {
  avatarUrl?: string | null
  name?: string | null
  score?: number
  size?: number
  showLabel?: boolean
  /** Nivelul din Academie: pune rama Bronze/Silver/Gold/Platinum în jurul pozei. */
  frame?: AcademyTier | string | null
}) {
  if (isTier(frame)) return <FramedAvatar avatarUrl={avatarUrl} name={name} score={score} size={size} tier={frame} />
  const level = getCreatorLevel(score)
  const config = LEVEL_CONFIG[level]
  const badgeSize = Math.round(size * 0.38)
  const initials = name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || ''}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.35, fontWeight: 700, color: 'white',
        }}>
          {initials}
        </div>
      )}

      {/* Badge în colț dreapta-jos */}
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        width: badgeSize, height: badgeSize,
        borderRadius: '50%',
        border: '2px solid white',
        overflow: 'hidden',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <img
          src={BADGE_IMAGES[level]}
          alt={level}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Label opțional sub avatar */}
      {showLabel && (
        <p style={{
          margin: '4px 0 0', textAlign: 'center',
          fontSize: 11, fontWeight: 600, color: config.color,
        }}>
          {config.label}
        </p>
      )}
    </div>
  )
}

// ── Widget dashboard — scor + progres ────────────────────────────
export function CreatorScoreWidget({ score = 0, name }: { score?: number; name?: string }) {
  const level = getCreatorLevel(score)
  const config = LEVEL_CONFIG[level]
  const nextLevel = config.next
  const progress = nextLevel
    ? Math.round(((score - config.min) / (nextLevel - config.min)) * 100)
    : 100

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 14,
      padding: '14px 16px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 10px' }}>
        Creator Score
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {/* Badge mare */}
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', padding: 2, flexShrink: 0 }}>
          <img src={BADGE_IMAGES[level]} alt={level} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: config.color }}>{config.label}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{score.toLocaleString('ro-RO')} pts</span>
          </div>
          {nextLevel ? (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>
              {(nextLevel - score).toLocaleString('ro-RO')} pts până la {Object.entries(LEVEL_CONFIG).find(([, v]) => v.min === nextLevel)?.[1]?.label}
            </p>
          ) : (
            <p style={{ fontSize: 11, color: config.color, margin: '2px 0 0' }}>Nivel maxim atins! 🏆</p>
          )}
        </div>
      </div>

      {/* Bara progres */}
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 100, height: 5, overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: config.color,
          borderRadius: 100,
          transition: 'width 0.5s ease',
        }} />
      </div>
      {nextLevel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{config.min.toLocaleString('ro-RO')}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{nextLevel.toLocaleString('ro-RO')}</span>
        </div>
      )}
    </div>
  )
}

// ── Poza de profil cu rama din Academie ──────────────────────────
// Rama (600×600) are golul pentru poză cu centrul la ~49% / 48% și diametrul ~72% din lățime.
function FramedAvatar({ avatarUrl, name, score = 0, size, tier }: { avatarUrl?: string | null; name?: string | null; score?: number; size: number; tier: AcademyTier }) {
  const level = getCreatorLevel(score)
  const F = Math.round(size / 0.72)
  const left = Math.round(F * 0.4933 - size / 2)
  const top = Math.round(F * 0.4833 - size / 2)
  const badgeSize = Math.round(size * 0.34)
  const initials = name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
  const t = TIERS[tier]
  return (
    <div style={{ position: 'relative', width: F, height: F, flex: 'none' }} title={`Creator certificat ${t.label} · Academia AddFame`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || ''} style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: 'white' }}>{initials}</div>
      )}
      <img src={t.frame} alt={`Ramă ${t.label}`} style={{ position: 'absolute', inset: 0, width: F, height: F, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: Math.round(F * 0.04), right: Math.round(F * 0.02), width: badgeSize, height: badgeSize, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
        <img src={BADGE_IMAGES[level]} alt={level} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    </div>
  )
}

/** Eticheta scurtă „Certificat Gold”, pentru liste unde poza e mică. */
export function AcademyTierChip({ tier, style }: { tier?: string | null; style?: CSSProperties }) {
  if (!isTier(tier)) return null
  const t = TIERS[tier]
  return <span title="Academia AddFame" style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 999, background: t.bg, color: t.fg, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', ...style }}>Certificat {t.label}</span>
}
