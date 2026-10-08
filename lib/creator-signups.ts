// Înscrieri creatori: pagini publice prin care strângem creatori dintr-o nișă (ex. auto, București).
// Fără cont; contul AddFame e opțional, după trimitere.
// Aici: opțiunile formularului, validarea înscrierii și calculele folosite în admin. Funcții pure, testabile.
import { parseCount } from '@/lib/tiers'

export interface SignupFormConfig {
  id: string
  slug: string
  status: 'draft' | 'open' | 'closed'
  eyebrow: string | null
  title: string
  intro: string | null
  brand_name: string | null
  location: string | null
  shoot_period: string | null
  deliverable: string
  min_followers: number
  deadline: string | null
  zone_label: string
}

export const ZONES: { value: string; label: string; priority: boolean }[] = [
  { value: 'sector1', label: 'București · Sector 1', priority: true },
  { value: 'sector2', label: 'București · Sector 2', priority: true },
  { value: 'sector3', label: 'București · Sector 3', priority: true },
  { value: 'sector4', label: 'București · Sector 4', priority: true },
  { value: 'sector5', label: 'București · Sector 5', priority: true },
  { value: 'sector6', label: 'București · Sector 6', priority: true },
  { value: 'ilfov', label: 'Ilfov', priority: true },
  { value: 'other', label: 'Alt oraș', priority: false },
]
export const zoneLabel = (v: string, otherCity?: string | null) =>
  v === 'other' ? (otherCity ? `Alt oraș: ${otherCity}` : 'Alt oraș') : (ZONES.find(z => z.value === v)?.label ?? v)

export const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok', handle: '@numecont', viewsLabel: 'Vizualizări medii / video', viewsHint: 'Media ultimelor 10 video-uri' },
  { key: 'instagram', label: 'Instagram', handle: '@numecont', viewsLabel: 'Vizualizări medii / Reel', viewsHint: 'Media ultimelor 10 Reels' },
  { key: 'youtube', label: 'YouTube', handle: 'youtube.com/@canal', viewsLabel: 'Vizualizări medii / video', viewsHint: 'Shorts sau video-uri lungi' },
] as const
export type PlatformKey = typeof PLATFORMS[number]['key']

export const CONTENT_TYPES = ['Review-uri mașini', 'Tuning și motorsport', 'Lifestyle', 'Familie', 'Road trips', 'Tech și gadgeturi', 'Business', 'Umor']
export const TRAVEL = ['Da, pe cont propriu', 'Da, dacă se decontează transportul', 'Nu']
export const AUDIENCE_CITY = ['Nu știu', 'Sub 20%', '20–50%', 'Peste 50%']
export const AUDIENCE_AGE = ['18–24', '25–34', '35–44', '45+']
export const INVOICING = ['Persoană fizică (contract de cesiune)', 'PFA / II', 'SRL']
export const USAGE_RIGHTS = ['Doar pe contul meu', 'Și în reclamele brandului, 30 de zile', 'Și în reclamele brandului, 90 de zile']
export const AVAILABILITY = ['În timpul săptămânii', 'Sâmbăta', 'Duminica']
export const POSTING_TIME = ['În 2–3 zile', 'În maximum o săptămână', 'Mai mult de o săptămână']

export const GENDERS = [
  { value: 'female', label: 'Feminin' },
  { value: 'male', label: 'Masculin' },
  { value: 'unspecified', label: 'Prefer să nu spun' },
] as const
export const AUDIENCE_GENDERS = [
  { value: 'female', label: 'Mai multe femei' },
  { value: 'male', label: 'Mai mulți bărbați' },
  { value: 'balanced', label: 'Cam jumătate-jumătate' },
] as const
export const genderLabel = (v: string | null | undefined) => GENDERS.find(g => g.value === v)?.label ?? '—'
export const audienceGenderLabel = (v: string | null | undefined) => AUDIENCE_GENDERS.find(g => g.value === v)?.label ?? '—'

export const STATUS_LABEL: Record<string, string> = { new: 'Nou', shortlisted: 'Pe listă', selected: 'Selectat', rejected: 'Respins' }

/** Înscrierile sunt deschise: status „open” și termenul (inclusiv ziua) încă nu a trecut, în ora României. */
export function isSignupOpen(c: Pick<SignupFormConfig, 'status' | 'deadline'>, now = new Date()): boolean {
  if (c.status !== 'open') return false
  if (!c.deadline) return true
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Bucharest' }) // YYYY-MM-DD
  return today <= c.deadline
}

export const brandDisplay = (c: Pick<SignupFormConfig, 'brand_name'>) => c.brand_name?.trim() || 'un dealer auto partener'

// ── Validare ────────────────────────────────────────────────────────

export interface PlatformInput { handle?: string; followers?: string | number; avg_views?: string | number }
export interface CleanApplication {
  first_name: string; last_name: string; email: string; phone: string; birth_date: string | null
  gender: string; audience_gender: string | null
  zone: string; other_city: string | null; can_travel: string | null
  platforms: Partial<Record<PlatformKey, { handle: string; followers: number; avg_views: number }>>
  main_platform: PlatformKey; main_followers: number; main_avg_views: number; total_followers: number
  content_types: string[]; sample_links: string[]; auto_experience: string | null
  audience_city_share: string | null; audience_age: string | null
  price_video: number; price_youtube: number | null; price_stories: number | null
  invoicing: string; usage_rights: string | null; accepts_barter: boolean
  availability: string[]; posting_time: string | null; notes: string | null
  consent_share: true; wants_account: boolean
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const oneOf = (v: unknown, list: readonly string[]) => (typeof v === 'string' && list.includes(v) ? v : null)
const someOf = (v: unknown, list: readonly string[]) => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && list.includes(x)))] : [])
const money = (v: unknown): number | null => {
  const n = parseCount(v)
  return n > 0 && n <= 1_000_000 ? n : null
}

export function ageOn(birth: string, now = new Date()): number {
  const b = new Date(birth + 'T00:00:00Z')
  let age = now.getUTCFullYear() - b.getUTCFullYear()
  const m = now.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--
  return age
}

/** Curăță și verifică înscrierea. Întoarce lista de erori (pe câmp) sau datele curate. */
export interface ValidationResult { ok: boolean; data?: CleanApplication; errors?: Record<string, string> }
export function validateApplication(raw: any, now = new Date()): ValidationResult {
  const e: Record<string, string> = {}
  const first_name = str(raw?.first_name, 80), last_name = str(raw?.last_name, 80)
  if (!first_name) e.first_name = 'Scrie prenumele.'
  if (!last_name) e.last_name = 'Scrie numele.'
  const email = str(raw?.email, 160).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Email invalid.'
  const phone = str(raw?.phone, 30)
  if (phone.replace(/\D/g, '').length < 9) e.phone = 'Număr de telefon invalid.'

  const birth_date = /^\d{4}-\d{2}-\d{2}$/.test(str(raw?.birth_date, 10)) ? str(raw?.birth_date, 10) : null
  if (!birth_date) e.birth_date = 'Completează data nașterii.'
  else if (ageOn(birth_date, now) < 18) e.birth_date = 'Campania e doar pentru persoane peste 18 ani.'
  else if (ageOn(birth_date, now) > 100) e.birth_date = 'Data nașterii pare greșită.'

  const gender = oneOf(raw?.gender, GENDERS.map(g => g.value))
  if (!gender) e.gender = 'Alege o variantă.'

  const zone = oneOf(raw?.zone, ZONES.map(z => z.value))
  if (!zone) e.zone = 'Alege unde locuiești.'
  const other_city = zone === 'other' ? str(raw?.other_city, 80) || null : null
  if (zone === 'other' && !other_city) e.other_city = 'Scrie orașul.'
  const can_travel = zone === 'other' ? oneOf(raw?.can_travel, TRAVEL) : null


  const platforms: CleanApplication['platforms'] = {}
  for (const p of PLATFORMS) {
    const v: PlatformInput | undefined = raw?.platforms?.[p.key]
    if (!v || !(v as any).enabled) continue
    const handle = str(v.handle, 120).replace(/^https?:\/\/(www\.)?/, '')
    const followers = parseCount(v.followers)
    const avg_views = parseCount(v.avg_views)
    if (!handle) e[`${p.key}.handle`] = `Scrie contul de ${p.label}.`
    if (!followers) e[`${p.key}.followers`] = `Scrie urmăritorii de pe ${p.label} (ex. 12400 sau 12,4K).`
    platforms[p.key] = { handle, followers, avg_views }
  }
  const keys = Object.keys(platforms) as PlatformKey[]
  if (!keys.length) e.platforms = 'Bifează cel puțin o platformă.'
  let main_platform = oneOf(raw?.main_platform, keys) as PlatformKey | null
  if (!main_platform && keys.length) main_platform = keys.reduce((a, b) => (platforms[b]!.followers > platforms[a]!.followers ? b : a))

  const sample_links = (Array.isArray(raw?.sample_links) ? raw.sample_links : String(raw?.sample_links || '').split(/\s+/))
    .map((s: unknown) => str(s, 300)).filter((s: string) => /^https?:\/\/\S+\.\S+/.test(s)).slice(0, 5)
  if (!sample_links.length) e.sample_links = 'Adaugă cel puțin un link spre un video.'

  const price_video = money(raw?.price_video)
  if (!price_video) e.price_video = 'Scrie prețul pe video (în RON).'
  const invoicing = oneOf(raw?.invoicing, INVOICING)
  if (!invoicing) e.invoicing = 'Alege cum facturezi.'
  if (raw?.consent_share !== true) e.consent_share = 'Avem nevoie de acordul tău ca să te putem propune brandului.'

  if (Object.keys(e).length) return { ok: false, errors: e }
  const main = platforms[main_platform!]!
  return {
    ok: true,
    data: {
      first_name, last_name, email, phone, birth_date,
      gender: gender!, audience_gender: oneOf(raw?.audience_gender, AUDIENCE_GENDERS.map(g => g.value)),
      zone: zone!, other_city, can_travel,
      platforms, main_platform: main_platform!, main_followers: main.followers, main_avg_views: main.avg_views,
      total_followers: keys.reduce((s, k) => s + platforms[k]!.followers, 0),
      content_types: someOf(raw?.content_types, CONTENT_TYPES), sample_links,
      auto_experience: str(raw?.auto_experience, 300) || null,
      audience_city_share: oneOf(raw?.audience_city_share, AUDIENCE_CITY), audience_age: oneOf(raw?.audience_age, AUDIENCE_AGE),
      price_video: price_video!, price_youtube: money(raw?.price_youtube), price_stories: money(raw?.price_stories),
      invoicing: invoicing!, usage_rights: oneOf(raw?.usage_rights, USAGE_RIGHTS), accepts_barter: raw?.accepts_barter === true,
      availability: someOf(raw?.availability, AVAILABILITY), posting_time: oneOf(raw?.posting_time, POSTING_TIME),
      notes: str(raw?.notes, 1000) || null,
      consent_share: true, wants_account: raw?.wants_account === true,
    },
  }
}

// ── Admin ───────────────────────────────────────────────────────────

/** Cât plătește brandul pentru 1.000 de vizualizări (preț / vizualizări medii × 1000), sau null. */
export function costPer1k(price: number | null | undefined, avgViews: number | null | undefined): number | null {
  const p = Number(price) || 0, v = Number(avgViews) || 0
  return p > 0 && v > 0 ? Math.round((p / v) * 1000) : null
}

export interface ApplicationFilter {
  zone?: 'priority' | 'bucuresti' | 'all'
  platform?: PlatformKey | ''
  minFollowers?: number
  maxPrice?: number
  status?: string
  gender?: string
  audienceGender?: string
}

export function filterApplications<T extends { zone: string; main_platform: string | null; platforms: any; main_followers: number; price_video: number | null; status: string; gender?: string | null; audience_gender?: string | null }>(rows: T[], f: ApplicationFilter): T[] {
  return rows.filter(r => {
    if (f.zone === 'priority' && r.zone === 'other') return false
    if (f.zone === 'bucuresti' && !r.zone.startsWith('sector')) return false
    if (f.platform && !r.platforms?.[f.platform]) return false
    const fol = f.platform ? Number(r.platforms?.[f.platform]?.followers) || 0 : r.main_followers
    if (f.minFollowers && fol < f.minFollowers) return false
    if (f.maxPrice && (r.price_video ?? Infinity) > f.maxPrice) return false
    if (f.status && r.status !== f.status) return false
    if (f.gender && r.gender !== f.gender) return false
    if (f.audienceGender && r.audience_gender !== f.audienceGender) return false
    return true
  })
}
