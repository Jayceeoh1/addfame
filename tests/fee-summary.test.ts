import { describe, it, expect } from 'vitest'
import { feeBreakdown } from '../lib/fee-summary'

describe('feeBreakdown — costul afișat brandului', () => {
  it('campanie plătită: plată influenceri + taxă management = total', () => {
    const b = feeBreakdown({ slots: 15, price: 350, payPerInfluencer: 333 })
    expect(b).toEqual({ slots: 15, feeTotal: 5250, payTotal: 4995, grandTotal: 10245 })
  })
  it('barter: doar taxa, fără total cu plată', () => {
    const b = feeBreakdown({ slots: 3, price: 350 })
    expect(b.feeTotal).toBe(1050)
    expect(b.payTotal).toBeNull()
    expect(b.grandTotal).toBeNull()
  })
  it('plata de discutat: fără sumă pentru influenceri', () => {
    const b = feeBreakdown({ slots: 2, price: 200, payPerInfluencer: 500, payNegotiable: true })
    expect(b.payTotal).toBeNull()
    expect(b.feeTotal).toBe(400)
  })
  it('prețul încă se încarcă → fără totaluri', () => {
    const b = feeBreakdown({ slots: 5, price: null, payPerInfluencer: 100 })
    expect(b.feeTotal).toBeNull()
    expect(b.payTotal).toBe(500)
    expect(b.grandTotal).toBeNull()
  })
  it('locuri invalide → minim 1', () => {
    expect(feeBreakdown({ slots: 0, price: 350 }).feeTotal).toBe(350)
  })
  it('prețul modificat din admin se reflectă direct', () => {
    expect(feeBreakdown({ slots: 4, price: 199.5 }).feeTotal).toBe(798)
  })
})
