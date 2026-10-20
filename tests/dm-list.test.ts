import { describe, it, expect } from 'vitest'
import { cleanHandle, instagramUrl, pickDmList, toCsv, dmMessage } from '@/lib/dm-list'

describe('dm-list', () => {
  it('curăță handle-ul', () => {
    expect(cleanHandle('@ana.pop')).toBe('ana.pop')
    expect(cleanHandle('https://www.instagram.com/ana.pop/?hl=ro')).toBe('ana.pop')
    expect(cleanHandle('ana pop')).toBe('ana')
    expect(cleanHandle('')).toBeNull()
    expect(instagramUrl('@x_y')).toBe('https://www.instagram.com/x_y/')
  })
  it('ordonează, exclude și limitează', () => {
    const now = Date.now()
    const c = [
      { id: 'a', instagram_handle: 'a', niches: ['food'], last_active_at: new Date(now).toISOString(), instagram_followers: 8000 },
      { id: 'b', instagram_handle: 'b', niches: ['auto'], last_active_at: null, instagram_followers: 8000 },
      { id: 'c', instagram_handle: '', niches: ['food'] },
      { id: 'd', instagram_handle: 'd', niches: ['food'], last_active_at: new Date(now).toISOString(), instagram_followers: 8000 },
    ]
    const r = pickDmList(c as any, ['food'], 5, new Set(['d']), now)
    expect(r.map(x => x.id)).toEqual(['a', 'b'])
    expect(pickDmList(c as any, ['food'], 1, new Set(), now)).toHaveLength(1)
  })
  it('CSV sigur și mesaj', () => {
    const csv = toCsv([{ id: '1', name: '=HYPERLINK("x")', handle: 'a', url: 'https://www.instagram.com/a/', followers: 5000, city: 'Cluj, RO', score: 50 }], new Set(['1']))
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain('"Cluj, RO"')
    expect(csv).toContain('da')
    expect(dmMessage('Ana Pop', 'Pasta', 'https://x')).toContain('Salut, Ana!')
  })
})
