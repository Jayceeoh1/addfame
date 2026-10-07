// Cine poate vedea și aplica la o campanie, după țintirea setată de brand (categorii + nișe).
// Regula e UNA singură, folosită și în lista creatorului, și pe server la aplicare, și în contorul din wizard.
//
//  - elig_tiers gol  → fără restricție de categorie;
//  - elig_tiers plin → creatorul trebuie să aibă un nivel (verificat sau estimat) din listă;
//    fără date de urmăritori ("Fără nivel") → nu e eligibil, altfel brandul ar primi aplicanți neverificabili;
//  - elig_niches gol → fără restricție de nișă;
//  - elig_niches plin → creatorul trebuie să aibă cel puțin o nișă în comun.
//
// Minimul de urmăritori (min_followers_target) și locația rămân verificate acolo unde erau deja (lista de campanii).
import { creatorTierInfo, TIERS } from '@/lib/tiers'

export interface EligCampaign {
  elig_tiers?: string[] | null
  elig_niches?: string[] | null
}

export interface EligCreator {
  niches?: string[] | null
  instagram_connected?: boolean | null
  ig_followers?: number | null
  instagram_followers?: number | string | null
  tt_followers?: number | string | null
  platforms?: { platform?: string; followers?: string | number }[] | null
}

export type EligReason = 'tier' | 'niche'

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export const VALID_TIER_KEYS: string[] = TIERS.map(t => t.key)

/** Curăță o listă de categorii venită de la client: doar chei cunoscute, fără dubluri. */
export function cleanTiers(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map(x => String(x)).filter(x => VALID_TIER_KEYS.includes(x)))]
}

/** Curăță o listă de nișe: șiruri nevide, fără dubluri, cel mult 30. */
export function cleanNiches(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map(x => String(x).trim()).filter(Boolean))].slice(0, 30)
}

export function hasTargeting(c: EligCampaign | null | undefined): boolean {
  return !!c && ((c.elig_tiers?.length ?? 0) > 0 || (c.elig_niches?.length ?? 0) > 0)
}

export function eligibility(c: EligCampaign | null | undefined, creator: EligCreator | null | undefined): { ok: boolean; reason: EligReason | null } {
  if (!hasTargeting(c)) return { ok: true, reason: null }

  const tiers = c!.elig_tiers ?? []
  if (tiers.length > 0) {
    const t = creatorTierInfo(creator).tier
    if (!t || !tiers.includes(t.key)) return { ok: false, reason: 'tier' }
  }

  const niches = c!.elig_niches ?? []
  if (niches.length > 0) {
    const mine = new Set((creator?.niches ?? []).map(norm))
    if (!niches.some(n => mine.has(norm(n)))) return { ok: false, reason: 'niche' }
  }

  return { ok: true, reason: null }
}

export const ELIG_MESSAGE: Record<EligReason, string> = {
  tier: 'Această campanie e deschisă doar creatorilor din anumite categorii (după numărul de urmăritori).',
  niche: 'Această campanie e deschisă doar creatorilor din anumite nișe.',
}
