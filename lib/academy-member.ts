// Academy Member: abonamentul lunar AddFame Academy și accesul la lecții. Funcții pure, testate separat.

export const ACADEMY_PRICE_RON = 200
export const ACADEMY_BADGE_LABEL = 'Academy Member'

/** Membru = bifa plătită activă (is_verified + badge_expires_at în viitor). */
export function isAcademyMember(inf: { is_verified?: boolean | null; badge_expires_at?: string | null } | null | undefined, now = new Date()): boolean {
  return !!inf?.is_verified && !!inf.badge_expires_at && new Date(inf.badge_expires_at) > now
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
