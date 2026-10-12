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
