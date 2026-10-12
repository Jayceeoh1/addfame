import { describe, it, expect } from 'vitest'
import { parseOfferPrice, recommendSlots, isOfferCampaign } from '../lib/offer'
import { campaignPayPerSlot } from '../lib/fee-summary'

describe('parseOfferPrice', () => {
  it('acceptă formatele uzuale', () => {
    expect(parseOfferPrice('350')).toBe(350)
    expect(parseOfferPrice('350,50')).toBe(350.5)
    expect(parseOfferPrice('1.200')).toBe(1200)
    expect(parseOfferPrice('1.200,5')).toBe(1200.5)
    expect(parseOfferPrice(' 800 lei ')).toBe(800)
    expect(parseOfferPrice(299.999)).toBeNull()   // max 2 zecimale
    expect(parseOfferPrice(299.99)).toBe(299.99)
  })
  it('refuză valori invalide', () => {
    for (const v of ['', '0', '-5', 'abc', '100001', '12.34.56', null, undefined]) expect(parseOfferPrice(v)).toBeNull()
  })
})

describe('recommendSlots — calculatorul de buget', () => {
  it('exemplul din discuție: 3.000 lei, taxă 200, ~300 per influencer → 6 locuri', () => {
    expect(recommendSlots(3000, 200, 300)).toBe(6)
  })
  it('bugetul nu ajunge nici pentru un loc → 0', () => {
    expect(recommendSlots(400, 200, 300)).toBe(0)
  })
  it('valori lipsă → 0', () => {
    expect(recommendSlots(0, 200, 300)).toBe(0)
    expect(recommendSlots(3000, 0, 0)).toBe(0)
  })
})

describe('modul OFFER', () => {
  it('nu blochează buget la publicare', () => {
    expect(isOfferCampaign({ payment_mode: 'OFFER' })).toBe(true)
    expect(campaignPayPerSlot({ campaign_type: 'PAID', payment_mode: 'OFFER', budget_per_influencer: 500 })).toBe(0)
  })
})

import { campaignMoney } from '../lib/fee-summary'

describe('campaignMoney — banii afișați pe pagina campaniei', () => {
  it('preț propus: blocat pentru cine n-a primit încă, plătit pentru cine a postat', () => {
    const m = campaignMoney({ fee_paid: 1200, fee_refunded: 0 }, [
      { status: 'ACTIVE', pay_reserved: 350 },
      { status: 'COMPLETED', pay_reserved: 300, payment_amount: 300 },
      { status: 'CANCELLED', pay_reserved: 500, pay_refunded: 500 },
      { status: 'PENDING' },
    ])
    expect(m).toEqual({ fee: 1200, held: 350, paid: 300, refunded: 500 })
  })
  it('sumă fixă: bugetul campaniei rămas e „blocat”', () => {
    const m = campaignMoney({ fee_paid: 600, pay_reserved: 900, pay_released: 300 }, [
      { status: 'COMPLETED', payment_amount: 300 },
    ])
    expect(m).toEqual({ fee: 600, held: 600, paid: 300, refunded: 0 })
  })
})
