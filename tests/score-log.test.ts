import { describe, it, expect } from 'vitest'
import { summarizeScoreLog, logScore } from '@/lib/score-log'

const rows = [
  { points: 100, label: 'Colaborare finalizată', campaign_id: 'a', campaign_title: 'Intimax', created_at: '2026-11-05T10:00:00Z' },
  { points: 75, label: 'Dovadă în 24h', campaign_id: 'a', campaign_title: 'Intimax', created_at: '2026-11-05T10:00:00Z' },
  { points: -60, label: 'Dovadă respinsă', campaign_id: 'b', campaign_title: 'Vioi.ro', created_at: '2026-11-02T10:00:00Z' },
  { points: 50, label: 'Recenzie', created_at: '2026-10-03T10:00:00Z' },
]

describe('istoric puncte', () => {
  it('adună câștigurile, pierderile și diferența față de scor', () => {
    const s = summarizeScoreLog(rows, 200)
    expect(s.earned).toBe(225)
    expect(s.lost).toBe(-60)
    expect(s.other).toBe(35)
  })
  it('grupează pe campanii și separă ce e în afara lor', () => {
    const s = summarizeScoreLog(rows, 165)
    expect(s.campaigns.map(c => [c.title, c.net])).toEqual([['Intimax', 175], ['Vioi.ro', -60]])
    expect(s.outsideNet).toBe(50)
    expect(s.other).toBe(0)
  })
  it('logScore nu aruncă erori și ignoră punctele 0', async () => {
    const inserted: any[] = []
    const admin = { from: () => ({ insert: async (r: any) => { inserted.push(...r) } }) }
    await logScore(admin, [{ influencerId: 'x', points: 0, kind: 'k', label: 'l' }, { influencerId: 'x', points: 5, kind: 'k', label: 'l' }])
    expect(inserted).toHaveLength(1)
    await logScore({ from: () => { throw new Error('boom') } }, { influencerId: 'x', points: 5, kind: 'k', label: 'l' })
  })
})
