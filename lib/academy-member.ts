// Academy Member: abonamentul lunar AddFame Academy și accesul la lecții. Funcții pure, testate separat.

export const ACADEMY_PRICE_RON = 200
/** Oferta de lansare: primii ACADEMY_LAUNCH_SPOTS membri plătesc ACADEMY_LAUNCH_PRICE_RON în prima lună. */
export const ACADEMY_LAUNCH_PRICE_RON = 125
export const ACADEMY_LAUNCH_SPOTS = 50
/** Oferta de lansare ține până la sfârșitul zilei de 1 decembrie 2026 (ora României) sau până se ocupă locurile. */
export const ACADEMY_LAUNCH_ENDS_AT = '2026-12-01T23:59:59+02:00'
export const ACADEMY_BADGE_LABEL = 'Academy Member'

type MemberFields = { is_verified?: boolean | null; badge_expires_at?: string | null; academy_free_until?: string | null }

/** Abonament PLĂTIT activ (is_verified + badge_expires_at în viitor) — doar el primește bifa verde pe profil. */
export function isPaidAcademyMember(inf: MemberFields | null | undefined, now = new Date()): boolean {
  return !!inf?.is_verified && !!inf.badge_expires_at && new Date(inf.badge_expires_at) > now
}

/** Membru = abonament plătit activ SAU acces gratuit dat din admin (academy_free_until în viitor): vede lecțiile pentru membri. */
export function isAcademyMember(inf: MemberFields | null | undefined, now = new Date()): boolean {
  return isPaidAcademyMember(inf, now) || (!!inf?.academy_free_until && new Date(inf.academy_free_until) > now)
}

export type LessonLock = null | 'soon' | 'members'

/**
 * De ce e închisă o lecție (null = deschisă):
 *  - „soon”: are dată de lansare în viitor sau încă nu are test (lecție anunțată, „În curând”)
 *  - „members”: e doar pentru Academy Members, iar creatorul nu e membru
 */
export function lessonLock(
  l: { members_only?: boolean | null; release_at?: string | null; total?: number },
  member: boolean,
  now = new Date(),
): LessonLock {
  if ((l.release_at && new Date(l.release_at) > now) || (l.total ?? 1) === 0) return 'soon'
  if (l.members_only && !member) return 'members'
  return null
}

/** „luni, 7 decembrie” — data de lansare afișată pe lecțiile cu lacăt. */
export function releaseLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' })
}

/** Sfârșitul accesului după o plată: sfârșitul perioadei Stripe + 1 zi de toleranță pentru reînnoire. */
export function memberUntil(periodEndSec: number): string {
  return new Date((periodEndSec + 24 * 3600) * 1000).toISOString()
}
