import { describe, it, expect } from 'vitest'
import { bucharestDay, isTreatDay, isThemeActive, treatPhase, rollTreat, earnedStreakBonus, treatDays } from '../lib/halloween'

// ora României = UTC+3 în octombrie (EEST), UTC+2 după 25 oct 2026 (EET)
const at = (iso: string) => new Date(iso)

describe('calendarul Halloween (ora României)', () => {
  it('ziua se schimbă la miezul nopții în România, nu în UTC', () => {
    expect(bucharestDay(at('2026-10-24T21:30:00Z'))).toBe('2026-10-25')   // 00:30 în București
    expect(isTreatDay(at('2026-10-24T20:30:00Z'))).toBe(false)            // 23:30 pe 24
    expect(isTreatDay(at('2026-10-24T21:30:00Z'))).toBe(true)
  })
  it('jocul ține 25–31 oct, tema 24 oct – 1 nov', () => {
    expect(treatPhase(at('2026-10-24T10:00:00Z'))).toBe('teaser')
    expect(treatPhase(at('2026-10-28T10:00:00Z'))).toBe('open')
    expect(treatPhase(at('2026-10-31T21:00:00Z'))).toBe('open')           // 23:00 pe 31, după schimbarea orei (UTC+2)
    expect(treatPhase(at('2026-11-01T10:00:00Z'))).toBe('over')
    expect(treatPhase(at('2026-11-02T10:00:00Z'))).toBe('hidden')
    expect(treatPhase(at('2026-10-20T10:00:00Z'))).toBe('hidden')
    expect(isThemeActive(at('2026-10-23T10:00:00Z'))).toBe(false)
    expect(isThemeActive(at('2026-10-24T10:00:00Z'))).toBe(true)
    expect(isThemeActive(at('2026-11-01T20:00:00Z'))).toBe(true)
    expect(isThemeActive(at('2026-11-01T23:30:00Z'))).toBe(false)
  })
})

describe('punctele', () => {
  it('sunt mereu între 5 și 30, din 5 în 5', () => {
    for (let i = 0; i <= 1000; i++) {
      const p = rollTreat(i / 1000)
      expect([5, 10, 15, 20, 25, 30]).toContain(p)
    }
    expect(rollTreat(0)).toBe(5)
    expect(rollTreat(0.9999)).toBe(30)
  })
  it('bonusul doar cu toate cele 7 zile', () => {
    const all = treatDays(2026)
    expect(all).toHaveLength(7)
    expect(earnedStreakBonus(all, 2026)).toBe(true)
    expect(earnedStreakBonus(all.slice(0, 6), 2026)).toBe(false)
    expect(earnedStreakBonus([...all.slice(1), '2026-10-24'], 2026)).toBe(false)
  })
})
