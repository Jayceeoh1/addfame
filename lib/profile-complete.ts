// Profilul creatorului trebuie să fie complet ca să poată aplica la campanii.
// Folosit și în pagină (ce îi lipsește, cât la sută e gata), și pe server (blocarea aplicării).

export type MissingItem = { key: string; label: string; href: string }

const PROFILE = '/influencer/profile'
const SETTINGS = '/influencer/settings'

const s = (v: unknown) => String(v ?? '').trim()

/** Telefon românesc sau internațional: minimum 10 cifre (ex. 0712345678, +40712345678). */
export function validPhone(v: unknown): boolean {
  const digits = s(v).replace(/[^\d]/g, '')
  return digits.length >= 10 && digits.length <= 15
}

/** Are cel puțin un cont de Instagram sau TikTok (unul din ele e de ajuns). */
export function hasSocial(inf: any): boolean {
  if (inf?.instagram_connected || s(inf?.instagram_handle)) return true
  const p = inf?.platforms
  const list: any[] = Array.isArray(p) ? p : p && typeof p === 'object' ? Object.entries(p).map(([platform, url]) => ({ platform, url })) : []
  return list.some(x => {
    const name = s(x?.platform || x?.key || x?.id).toLowerCase()
    const val = s(x?.url || x?.handle || x?.username)
    return (name === 'instagram' || name === 'tiktok') && val.length > 0
  })
}

/** Ce lipsește din profil, în ordinea în care e firesc să le completeze. */
export function profileMissing(inf: any, email?: string | null): MissingItem[] {
  const m: MissingItem[] = []
  if (!s(inf?.name)) m.push({ key: 'name', label: 'Nume complet', href: PROFILE })
  if (!s(inf?.avatar)) m.push({ key: 'avatar', label: 'Poză de profil', href: PROFILE })
  if (!s(inf?.bio)) m.push({ key: 'bio', label: 'Bio', href: PROFILE })
  if (!(Array.isArray(inf?.niches) && inf.niches.length)) m.push({ key: 'niches', label: 'Nișe de conținut', href: PROFILE })
  if (!hasSocial(inf)) m.push({ key: 'social', label: 'Cont de Instagram sau TikTok (cel puțin unul)', href: PROFILE })
  if (!s(email || inf?.email)) m.push({ key: 'email', label: 'Adresă de e-mail', href: SETTINGS })
  if (!validPhone(inf?.phone)) m.push({ key: 'phone', label: 'Număr de telefon', href: SETTINGS })
  if (!s(inf?.address_line) || !s(inf?.city) || !s(inf?.county)) m.push({ key: 'address', label: 'Adresă completă (stradă și număr, oraș, județ)', href: SETTINGS })
  return m
}

export const PROFILE_CHECKS = 8

export function profilePercent(missing: MissingItem[]): number {
  return Math.round(((PROFILE_CHECKS - missing.length) / PROFILE_CHECKS) * 100)
}

/** Coloanele de citit din influencers pentru verificare. */
export const PROFILE_COLUMNS = 'name, avatar, bio, niches, platforms, instagram_connected, instagram_handle, email, phone, address_line, city, county, postal_code'
