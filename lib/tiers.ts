// Categoriile de influenceri (Nano … Mega), calculate AUTOMAT din numărul de urmăritori
// al contului de Instagram conectat (ig_followers, adus din API-ul oficial Meta).
// Instagram conectat → nivel VERIFICAT (număr din API), cu excepția cazului în care altă rețea introdusă manual
// are mai mulți urmăritori (atunci nivelul e „estimat"). Fără Instagram, dar cu număr scris manual → ESTIMAT
// (marcat distinct, pentru că numărul nu poate fi verificat).
//
// Pragurile se schimbă DOAR aici.

export type TierKey = 'nano' | 'micro' | 'mid' | 'macro' | 'mega'

export interface Tier {
  key: TierKey
  label: string
  min: number            // inclusiv
  max: number            // exclusiv (Infinity pentru ultimul)
  range: string          // text pentru legendă
  desc: string
  bg: string             // fundal chip
  fg: string             // text chip
  dot: string            // culoare punct / bară
}

export const TIERS: Tier[] = [
  { key: 'nano',  label: 'Nano',  min: 1_000,     max: 10_000,    range: '1.000 – 10.000',       desc: 'Comunitate mică și apropiată, engagement mare. Potrivit pentru barter.', bg: '#dcf5ec', fg: '#14532d', dot: '#1f9d6b' },
  { key: 'micro', label: 'Micro', min: 10_000,    max: 50_000,    range: '10.000 – 50.000',      desc: 'Nișă clară și încredere. Cel mai bun raport preț/rezultat.',             bg: '#efeaff', fg: '#4423c4', dot: '#5a35e6' },
  { key: 'mid',   label: 'Mid',   min: 50_000,    max: 250_000,   range: '50.000 – 250.000',     desc: 'Acoperire serioasă la cost mediu.',                                      bg: '#e8f0ff', fg: '#1d4ed8', dot: '#2f6fe0' },
  { key: 'macro', label: 'Macro', min: 250_000,   max: 1_000_000, range: '250.000 – 1.000.000',  desc: 'Notorietate largă, campanii de brand.',                                  bg: '#fff1c2', fg: '#854d0e', dot: '#e0a100' },
  { key: 'mega',  label: 'Mega',  min: 1_000_000, max: Infinity,  range: 'peste 1.000.000',      desc: 'Celebrități, campanii de imagine.',                                      bg: '#fff1e6', fg: '#9a4206', dot: '#d97a1c' },
]

export const UNVERIFIED_STYLE = { bg: '#f1f0f8', fg: '#6a6690' }

/** Nivelul pentru un număr de urmăritori. Sub 1.000 sau număr invalid → null. */
export function getTier(followers: number | null | undefined): Tier | null {
  const n = Number(followers)
  if (!Number.isFinite(n) || n < TIERS[0].min) return null
  return TIERS.find(t => n >= t.min && n < t.max) ?? null
}

/** „12K" → 12000, „1,2M" → 1200000, „12.500" → 12500. Orice altceva → 0. */
export function parseCount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0
  const s = String(raw ?? '').replace(/\u00a0/g, ' ').trim().toUpperCase()
  if (!s) return 0
  // „12,4K”, „12.4 k”, „1,2M”, „15 mii”, „1,5 mil” (+ eventual „urmăritori” după)
  const m = s.match(/^(\d[\d.,\s]*?)\s*(MILIOANE|MILION|MIL|MII|K|M)(?![A-Z])/)
  if (m) {
    const n = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'))
    const mult = m[2] === 'K' || m[2] === 'MII' ? 1_000 : 1_000_000
    return Number.isFinite(n) && n > 0 ? Math.round(n * mult) : 0
  }
  // „12.400”, „12 400 urmăritori” → doar numărul de la început
  const lead = s.match(/^\d[\d.,\s]*/)
  const d = parseInt((lead ? lead[0] : s).replace(/\D/g, ''), 10)
  return Number.isFinite(d) && d > 0 ? d : 0
}

export type TierSource = 'verified' | 'estimated'

type TierInput = {
  instagram_connected?: boolean | null
  ig_followers?: number | null
  instagram_followers?: number | string | null
  tt_followers?: number | string | null
  platforms?: { platform?: string; followers?: string | number }[] | null
}

/**
 * Cel mai mare număr de urmăritori introdus manual, pe o singură platformă
 * (platforms JSON + câmpurile manuale). `excludeInstagram`: ignoră Instagram (folosit când Instagram e conectat și verificat).
 */
export function manualFollowers(c: TierInput | null | undefined, opts?: { excludeInstagram?: boolean }): number {
  if (!c) return 0
  const nums = [opts?.excludeInstagram ? 0 : parseCount(c.instagram_followers), parseCount(c.tt_followers)]
  if (Array.isArray(c.platforms)) {
    for (const p of c.platforms) {
      if (opts?.excludeInstagram && String(p?.platform || '').toLowerCase() === 'instagram') continue
      nums.push(parseCount(p?.followers))
    }
  }
  return Math.max(0, ...nums)
}

/**
 * Nivelul unui creator + sursa:
 *  - „verified": numărul vine din Instagram conectat (API Meta) și e cel mai mare;
 *  - „estimated": numărul scris manual de creator (nu se poate verifica) — fie fără Instagram conectat,
 *    fie pe altă rețea (ex. TikTok) cu mai mulți urmăritori decât Instagram-ul verificat;
 *  - null: nu avem date.
 * Se ia cel mai mare număr: un creator cu 24K pe Instagram și 200K pe TikTok e Mid, nu Micro.
 */
export function creatorTierInfo(c: TierInput | null | undefined): { tier: Tier | null; source: TierSource | null; followers: number } {
  if (!c) return { tier: null, source: null, followers: 0 }
  if (c.instagram_connected) {
    const ig = Number(c.ig_followers) || 0
    const other = manualFollowers(c, { excludeInstagram: true })
    if (other > ig) return { tier: getTier(other), source: 'estimated', followers: other }
    return { tier: getTier(ig), source: 'verified', followers: ig }
  }
  const f = manualFollowers(c)
  return f > 0 ? { tier: getTier(f), source: 'estimated', followers: f } : { tier: null, source: null, followers: 0 }
}

/** Nivelul (verificat sau estimat) — pentru filtre și contoare. */
export function creatorTier(c: TierInput | null | undefined): Tier | null {
  return creatorTierInfo(c).tier
}

export function tierByKey(key: string): Tier | undefined {
  return TIERS.find(t => t.key === key)
}

/** Progresul spre nivelul următor (pentru cardul „Nivelul tău"). */
export function tierProgress(followers: number | null | undefined) {
  const n = Math.max(0, Number(followers) || 0)
  const tier = getTier(n)
  if (!tier) {
    const first = TIERS[0]
    return { tier: null as Tier | null, next: first, remaining: Math.max(0, first.min - n), percent: Math.min(100, Math.round((n / first.min) * 100)) }
  }
  const i = TIERS.indexOf(tier)
  const next = TIERS[i + 1] ?? null
  if (!next) return { tier, next: null as Tier | null, remaining: 0, percent: 100 }
  const percent = Math.max(0, Math.min(100, Math.round(((n - tier.min) / (tier.max - tier.min)) * 100)))
  return { tier, next, remaining: Math.max(0, next.min - n), percent }
}

/** 18420 → „18,4K"; 1250000 → „1,3M". */
export function formatCount(n: number | null | undefined): string {
  const v = Number(n) || 0
  const fmt = (x: number) => (Math.round(x * 10) / 10).toString().replace('.', ',')
  if (v >= 1_000_000) return `${fmt(v / 1_000_000)}M`
  if (v >= 1_000) return `${fmt(v / 1_000)}K`
  return String(v)
}
