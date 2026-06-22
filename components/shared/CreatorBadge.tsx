'use client'

import { BADGE_IMAGES, LEVEL_CONFIG, getCreatorLevel, type CreatorLevel } from '@/lib/creator-score'

// ── Badge mic pe avatar ───────────────────────────────────────────
// Folosire: <AvatarWithBadge avatarUrl={inf.avatar} score={inf.creator_score} size={48} />
export function AvatarWithBadge({
  avatarUrl,
  name,
  score = 0,
  size = 48,
  showLabel = false,
}: {
  avatarUrl?: string | null
  name?: string | null
  score?: number
  size?: number
  showLabel?: boolean
}) {
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
