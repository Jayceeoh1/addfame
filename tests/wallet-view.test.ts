import { describe, it, expect } from 'vitest'
import { expectedPay, walletFromCollabs, txView } from '@/lib/wallet-view'

const paid = { campaign_type: 'PAID', payment_mode: 'FIXED', budget_per_influencer: 200, fee_per_influencer: 0, title: 'Intimax', brand_name: 'INTIMAX' }

describe('wallet creator', () => {
  it('suma care urmează: întreagă la campaniile cu taxă, 85% la cele vechi', () => {
    expect(expectedPay({ campaigns: paid })).toBe(200)
    expect(expectedPay({ campaigns: { ...paid, fee_per_influencer: null } })).toBe(170)
    expect(expectedPay({ reserved_amount: 250, campaigns: paid })).toBe(250)
    expect(expectedPay({ offer_price: 300, campaigns: { ...paid, payment_mode: 'OFFER' } })).toBe(300)
    expect(expectedPay({ campaigns: { campaign_type: 'BARTER', budget_per_influencer: 0 } })).toBe(0)
  })

  it('separă banii care urmează de produsele barter', () => {
    const w = walletFromCollabs([
      { id: '1', status: 'ACTIVE', campaigns: paid },
      { id: '2', status: 'COMPLETED', campaigns: paid },
      { id: '3', status: 'COMPLETED', completed_at: '2026-11-05', campaigns: { campaign_type: 'BARTER', title: '[Barter] X', offer_name: 'Set Imuno', offer_value: 180, brand_name: 'Imuno' } },
      { id: '4', status: 'ACTIVE', campaigns: { campaign_type: 'BARTER', offer_name: 'Cremă', offer_value: 90 } },
      { id: '5', status: 'PENDING', campaigns: paid },
    ])
    expect(w.upcoming.map(u => u.id)).toEqual(['1'])
    expect(w.upcomingTotal).toBe(200)
    expect(w.barter.map(b => b.id)).toEqual(['3', '4'])
    expect(w.barterValue).toBe(180)
  })

  it('bonusurile sunt intrări, retragerile ieșiri', () => {
    expect(txView({ type: 'REFERRAL_BONUS', amount: 15 })).toEqual({ out: false, label: 'Bonus recomandare', amount: 15 })
    expect(txView({ type: 'PAYOUT', amount: 250 }).out).toBe(true)
    expect(txView({ type: 'EARN', amount: 200 }).out).toBe(false)
  })
})
