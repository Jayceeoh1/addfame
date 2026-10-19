// Ce vede un brand despre un influencer în lista de creatori: profilul, fără date de contact sau social media.
// (Regula AddFame: colaborările se stabilesc doar prin platformă.) Funcții pure, testate în tests/brand-safe.test.ts.
import { normalizePlatforms } from '@/lib/tiers'

const HIDDEN = '[ascuns]'

/** Scoate din bio link-urile, @handle-urile, emailurile și numerele de telefon. */
export function sanitizeBioForBrand(bio: string | null | undefined): string | null {
  if (!bio) return bio ?? null
  return bio
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, HIDDEN)                        // email
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, HIDDEN)                                     // link
    .replace(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,6}\b(?:\/\S*)?/gi, HIDDEN)             // domenii (linktr.ee/ana etc.)
    .replace(/(^|[^\w@])@[a-z0-9._]{2,30}/gi, `$1${HIDDEN}`)                             // @handle
    .replace(/(?:\+|00)?\d[\d\s.\-()]{7,}\d/g, HIDDEN)                                   // telefon
    .replace(/(?:\[ascuns\][\s,;|·•-]*){2,}/g, `${HIDDEN} `)
    .trim()
}

/** Doar platforma și numărul de urmăritori (fără link, username sau handle). */
export function safePlatforms(raw: unknown): { platform: string; followers?: string | number }[] {
  return normalizePlatforms(raw)
    .filter(p => typeof p.platform === 'string' && p.platform.trim())
    .map(p => {
      const out: { platform: string; followers?: string | number } = { platform: String(p.platform).toLowerCase().trim() }
      if (p.followers !== undefined && p.followers !== null && p.followers !== '') out.followers = p.followers as any
      return out
    })
}

/** Rândul unui influencer, curățat pentru branduri. */
export function toBrandInfluencer<T extends Record<string, any>>(row: T) {
  const { instagram_handle, tiktok_handle, youtube_handle, email, phone, ...rest } = row as any
  return { ...rest, bio: sanitizeBioForBrand(row.bio), platforms: safePlatforms(row.platforms) }
}

/** Colaborările pentru care brandul are voie să vadă conturile de social media: doar cei care au aplicat (sau au acceptat invitația). */
export const SOCIAL_VISIBLE_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED']

export type SocialLink = { platform: 'instagram' | 'tiktok' | 'youtube' | string; handle: string | null; url: string }

const cleanHandle = (h: unknown): string | null => {
  const v = String(h ?? '').trim().replace(/^@/, '')
  return /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : null
}
const safeUrl = (u: unknown): string | null => {
  const v = String(u ?? '').trim()
  if (!v) return null
  const full = /^www\./i.test(v) ? `https://${v}` : v
  return /^https?:\/\//i.test(full) ? full : null
}

/**
 * Conturile de social media ale unui creator (link + handle), pentru brandul la care a aplicat.
 * Se apelează DOAR după ce serverul a verificat aplicarea (SOCIAL_VISIBLE_STATUSES).
 */
export function socialLinksFor(row: Record<string, any>): SocialLink[] {
  const byPlatform = new Map<string, SocialLink>()
  for (const p of normalizePlatforms(row.platforms)) {
    const platform = String(p.platform || '').toLowerCase().trim()
    const url = safeUrl(p.url)
    if (!platform || !url) continue
    byPlatform.set(platform, { platform, handle: cleanHandle(p.username), url })
  }
  const fromHandle = (platform: string, handle: unknown, base: string) => {
    const h = cleanHandle(handle)
    if (h && !byPlatform.has(platform)) byPlatform.set(platform, { platform, handle: h, url: base + h })
    else if (h && byPlatform.get(platform) && !byPlatform.get(platform)!.handle) byPlatform.get(platform)!.handle = h
  }
  fromHandle('instagram', row.instagram_handle, 'https://www.instagram.com/')
  fromHandle('tiktok', row.tiktok_handle, 'https://www.tiktok.com/@')
  fromHandle('youtube', row.youtube_handle, 'https://www.youtube.com/@')
  const order = ['instagram', 'tiktok', 'youtube']
  return [...byPlatform.values()].sort((a, b) => (order.indexOf(a.platform) + 1 || 9) - (order.indexOf(b.platform) + 1 || 9))
}
