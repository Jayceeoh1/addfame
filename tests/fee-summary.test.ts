import { describe, it, expect } from 'vitest'
import { feeBreakdown } from '../lib/fee-summary'

describe('feeBreakdown — costul afișat brandului', () => {
  it('campanie plătită: plată influenceri + taxă management = total', () => {
    const b = feeBreakdown({ slots: 15, price: 350, payPerInfluencer: 333 })
    expect(b).toEqual({ slots: 15, feeTotal: 5250, payTotal: 4995, grandTotal: 10245, payNow: 10245 })
  })
  it('barter: doar taxa, fără total cu plată', () => {
    const b = feeBreakdown({ slots: 3, price: 350 })
    expect(b.feeTotal).toBe(1050)
    expect(b.payTotal).toBeNull()
    expect(b.grandTotal).toBeNull()
    expect(b.payNow).toBe(1050)
  })
  it('exemplul brandului: 300 lei influencer + 200 lei taxă = 500 lei / influencer', () => {
    const b = feeBreakdown({ slots: 4, price: 200, payPerInfluencer: 300 })
    expect(b.payNow).toBe(2000)
    expect(b.feeTotal).toBe(800)
    expect(b.payTotal).toBe(1200)
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

import { campaignPayPerSlot } from '../lib/fee-summary'

describe('campaignPayPerSlot — ce sumă trece prin AddFame', () => {
  it('plătită cu sumă fixă → suma per influencer', () => {
    expect(campaignPayPerSlot({ campaign_type: 'PAID', payment_mode: 'FIXED', budget_per_influencer: 300 })).toBe(300)
    expect(campaignPayPerSlot({ campaign_type: 'MANAGED', payment_mode: 'FIXED', budget_per_influencer: '333' })).toBe(333)
  })
  it('de discutat, barter, open call → 0', () => {
    expect(campaignPayPerSlot({ campaign_type: 'PAID', payment_mode: 'NEGOTIABLE', budget_per_influencer: 300 })).toBe(0)
    expect(campaignPayPerSlot({ campaign_type: 'BARTER', budget_per_influencer: 300 })).toBe(0)
    expect(campaignPayPerSlot({ campaign_type: 'OPEN_CALL', budget_per_influencer: 300 })).toBe(0)
    expect(campaignPayPerSlot(null)).toBe(0)
  })
  it('sume invalide → 0', () => {
    expect(campaignPayPerSlot({ campaign_type: 'PAID', budget_per_influencer: -5 })).toBe(0)
    expect(campaignPayPerSlot({ campaign_type: 'PAID', budget_per_influencer: 'abc' })).toBe(0)
  })
})
