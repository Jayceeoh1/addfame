import { describe, it, expect } from 'vitest'
import { eligibility, cleanTiers, cleanNiches, hasTargeting } from '@/lib/eligibility'
import { creatorTierInfo, parseCount, getTier } from '@/lib/tiers'

const ig = (n: number, x: any = {}) => ({ instagram_connected: true, ig_followers: n, ...x })

describe('parseCount', () => {
  it.each([['12K', 12000], ['1,2M', 1200000], ['12.500', 12500], ['12 500', 12500], ['', 0], [null, 0]])('%s → %s', (i, o) => expect(parseCount(i as any)).toBe(o))
})

describe('tiers', () => {
  it.each([[999, null], [1000, 'nano'], [10000, 'micro'], [50000, 'mid'], [250000, 'macro'], [1000000, 'mega']])('%s followeri → %s', (n, k) => expect(getTier(n)?.key ?? null).toBe(k))
  it('Instagram verificat e „verified”', () => expect(creatorTierInfo(ig(24000)).source).toBe('verified'))
  it('ia maximul dintre Instagram și alte platforme manuale', () =>
    expect(creatorTierInfo(ig(24000, { platforms: [{ platform: 'tiktok', followers: '200K' }] })).tier?.key).toBe('mid'))
  it('numărul manual de Instagram nu depășește pe cel verificat', () =>
    expect(creatorTierInfo(ig(500, { platforms: [{ platform: 'instagram', followers: '90K' }] })).tier).toBeNull())
  it('fără Instagram conectat → estimat din numere manuale', () =>
    expect(creatorTierInfo({ tt_followers: 60000 })).toMatchObject({ source: 'estimated' }))
  it('fără date → fără nivel', () => expect(creatorTierInfo({}).tier).toBeNull())
})

describe('eligibility', () => {
  it('fără țintire → toți', () => expect(eligibility({ elig_tiers: [], elig_niches: [] }, {}).ok).toBe(true))
  it('categorie potrivită', () => expect(eligibility({ elig_tiers: ['micro'] }, ig(20000)).ok).toBe(true))
  it('categorie nepotrivită', () => expect(eligibility({ elig_tiers: ['micro'] }, ig(2000))).toEqual({ ok: false, reason: 'tier' }))
  it('fără date nu e eligibil când se cere categorie', () => expect(eligibility({ elig_tiers: ['nano'] }, {}).reason).toBe('tier'))
  it('nivel estimat contează', () => expect(eligibility({ elig_tiers: ['mid'] }, { platforms: [{ platform: 'tiktok', followers: '200K' }] }).ok).toBe(true))
  it('nișă fără diacritice și majuscule', () => {
    expect(eligibility({ elig_niches: ['Călătorii'] }, { niches: ['calatorii'] }).ok).toBe(true)
    expect(eligibility({ elig_niches: ['Beauty'] }, { niches: ['Food'] }).reason).toBe('niche')
  })
  it('ambele condiții trebuie îndeplinite', () => expect(eligibility({ elig_tiers: ['micro'], elig_niches: ['Beauty'] }, ig(20000, { niches: ['Food'] })).ok).toBe(false))
  it('cleanTiers/cleanNiches elimină valorile invalide', () => {
    expect(cleanTiers(['nano', 'x', 'nano', 5])).toEqual(['nano'])
    expect(cleanTiers('nano')).toEqual([])
    expect(cleanNiches([' Beauty ', '', 'Beauty'])).toEqual(['Beauty'])
    expect(cleanNiches(Array.from({ length: 50 }, (_, i) => 'n' + i))).toHaveLength(30)
  })
  it('hasTargeting', () => { expect(hasTargeting(null)).toBe(false); expect(hasTargeting({ elig_niches: ['a'] })).toBe(true) })
})
