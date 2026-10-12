import { describe, it, expect } from 'vitest'
import { lastMonths, sumByMonth, changePct, heldForInfluencers } from '@/lib/admin-overview'

describe('panoul de admin — calcule', () => {
  const now = new Date(2026, 9, 12)
  it('ultimele 6 luni, cu luna curentă la final', () => {
    const m = lastMonths(6, now)
    expect(m.map(x => x.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
  })
  it('trece corect peste schimbarea anului', () => {
    expect(lastMonths(3, new Date(2026, 0, 5)).map(x => x.key)).toEqual(['2025-11', '2025-12', '2026-01'])
  })
  it('adună pe luni și ignoră ce e în afara intervalului', () => {
    const m = lastMonths(2, now)
    const rows = [
      { created_at: '2026-10-01T10:00:00Z', v: 200 }, { created_at: '2026-10-11T10:00:00Z', v: 300 },
      { created_at: '2026-09-30T10:00:00Z', v: 100 }, { created_at: '2025-10-01T10:00:00Z', v: 999 }, { created_at: null, v: 5 },
    ]
    expect(sumByMonth(rows, m, r => r.v)).toEqual([100, 500])
    expect(sumByMonth(rows, m)).toEqual([1, 2])
  })
  it('procent față de luna trecută', () => {
    expect(changePct(150, 100)).toBe(50)
    expect(changePct(50, 0)).toBeNull()
  })
  it('bani blocați: buget fix rămas + prețuri propuse neplătite', () => {
    expect(heldForInfluencers(
      [{ pay_reserved: 900, pay_released: 300, pay_refunded: 0 }, { pay_reserved: 100, pay_released: 100, pay_refunded: 50 }],
      [{ pay_reserved: 350, payment_amount: 0, pay_refunded: 0 }, { pay_reserved: 500, payment_amount: 500 }, { pay_reserved: 200, pay_refunded: 200 }],
    )).toBe(950)
  })
})
