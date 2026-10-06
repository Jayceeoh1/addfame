// Categoriile de influenceri (Nano … Mega), calculate AUTOMAT din numărul de urmăritori
// al contului de Instagram conectat (ig_followers, adus din API-ul oficial Meta).
// Fără Instagram conectat → fără nivel („Neverificat"): numărul scris manual nu poate fi verificat,
// deci nu intră în nivel (altfel creatorii și-ar putea alege singuri o categorie mai mare).
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

/** Nivelul unui creator: doar din Instagram conectat și verificat prin API. */
export function creatorTier(c: { instagram_connected?: boolean | null; ig_followers?: number | null } | null | undefined): Tier | null {
  if (!c || !c.instagram_connected) return null
  return getTier(c.ig_followers)
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
