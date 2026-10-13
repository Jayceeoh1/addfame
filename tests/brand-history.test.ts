import { describe, it, expect } from 'vitest'
import { summarizeBrandHistory, hasWorkedWith } from '@/lib/brand-history'

const now = new Date('2026-10-13T10:00:00Z')
const row = (o: any) => ({ influencer_id: 'A', campaign_id: 'c' + Math.random(), created_at: '2026-06-01T00:00:00Z', campaign: { title: '[Barter] X — Produs gratuit (Instagram)', offer_name: 'Ser', deadline: '2026-12-01' }, ...o })

describe('istoricul cu brandul', () => {
  it('numără finalizate, în curs, nefinalizate și doar aplicări', () => {
    const h = summarizeBrandHistory([
      row({ status: 'COMPLETED', completed_at: '2026-09-10T00:00:00Z', rating: 5, campaign: { offer_name: 'Set ceaiuri', title: '[Barter] V — Produs gratuit (Instagram)' } }),
      row({ status: 'COMPLETED', completed_at: '2026-07-01T00:00:00Z', rating: 4 }),
      row({ status: 'ACTIVE' }),
      row({ status: 'ACTIVE', campaign: { title: 'Vechi', deadline: '2026-09-01' } }),  // termen trecut, fără postare
      row({ status: 'CANCELLED' }),
      row({ status: 'REJECTED' }),
      row({ status: 'PENDING' }),
    ], now).A
    expect(h).toMatchObject({ completed: 2, ongoing: 1, unfinished: 2, appliedOnly: 2, avgRating: 4.5 })
    expect(h.last?.name).toBe('Set ceaiuri')
    expect(hasWorkedWith(h)).toBe(true)
  })
  it('postarea trimisă după termen nu e „nefinalizată”', () => {
    const h = summarizeBrandHistory([row({ status: 'ACTIVE', deliverable_submitted_at: '2026-09-02', campaign: { deadline: '2026-09-01' } })], now).A
    expect(h.unfinished).toBe(0)
    expect(h.ongoing).toBe(1)
  })
  it('doar aplicări → nu a lucrat cu brandul', () => {
    const h = summarizeBrandHistory([row({ status: 'REJECTED' })], now).A
    expect(hasWorkedWith(h)).toBe(false)
    expect(h.last).toBeNull()
    expect(hasWorkedWith(undefined)).toBe(false)
  })
})
