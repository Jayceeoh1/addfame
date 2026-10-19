import { describe, it, expect } from 'vitest'
import { planScares } from '@/lib/halloween-scares'

describe('planScares', () => {
  it('alege 3 întrebări diferite, nici prima nici ultima, la distanță, cu sperieturi diferite', () => {
    for (let n = 0; n < 200; n++) {
      const plan = planScares(8)
      const qs = Object.keys(plan).map(Number).sort((a, b) => a - b)
      expect(qs).toHaveLength(3)
      expect(qs[0]).toBeGreaterThanOrEqual(1)
      expect(qs[2]).toBeLessThanOrEqual(6)
      expect(qs[1] - qs[0]).toBeGreaterThanOrEqual(2)
      expect(qs[2] - qs[1]).toBeGreaterThanOrEqual(2)
      expect(new Set(Object.values(plan)).size).toBe(3)
    }
  })
  it('merge și cu un generator fix', () => {
    const plan = planScares(8, () => 0)
    expect(Object.keys(plan).length).toBeGreaterThan(0)
  })
})
