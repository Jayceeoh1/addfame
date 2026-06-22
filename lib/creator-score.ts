// Badge-uri Creator Score — servite din /public/badges/
export const BADGE_IMAGES = {
  starter: '/badges/starter.png',
  rising:  '/badges/rising.png',
  pro:     '/badges/pro.png',
  elite:   '/badges/elite.png',
}

export type CreatorLevel = 'starter' | 'rising' | 'pro' | 'elite'

export function getCreatorLevel(score: number): CreatorLevel {
  if (score >= 2500) return 'elite'
  if (score >= 900) return 'pro'
  if (score >= 300) return 'rising'
  return 'starter'
}

export const LEVEL_CONFIG: Record<CreatorLevel, { label: string; color: string; next: number | null; min: number }> = {
  starter: { label: 'Starter', color: '#9ca3af', min: 0,    next: 300  },
  rising:  { label: 'Rising',  color: '#378add', min: 300,  next: 900  },
  pro:     { label: 'Pro',     color: '#7c3aed', min: 900,  next: 2500 },
  elite:   { label: 'Elite',   color: '#b45309', min: 2500, next: null },
}
