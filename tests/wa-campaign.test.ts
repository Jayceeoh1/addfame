import { describe, it, expect } from 'vitest'
import { waAudience, waPhone, firstName, waVars, waOptedIn } from '@/lib/wa-campaign'

describe('wa-campaign', () => {
  it('telefon', () => {
    expect(waPhone('0722 123 456')).toBe('+40722123456')
    expect(waPhone('+40 722-123-456')).toBe('+40722123456')
    expect(waPhone('0212345678')).toBeNull()
    expect(waPhone('')).toBeNull()
  })
  it('prenume', () => {
    expect(firstName('ana maria pop')).toBe('Ana')
    expect(firstName('@trendmix.hub')).toBe('salut')
  })
  it('public: doar cu acord, fără aplicați/trimiși/dubluri', () => {
    const yes = { notifications: { whatsapp_campaigns: true } }
    const c = [
      { id: 'a', name: 'Ana', phone: '0722123456', settings: yes },
      { id: 'b', name: 'Bia', phone: '0722123456', settings: yes },
      { id: 'c', name: 'Cri', phone: '0733000000', settings: {} },
      { id: 'd', name: 'Dan', phone: '0744000000', settings: yes },
      { id: 'e', name: 'Eli', phone: '0755000000', settings: yes },
    ]
    const r = waAudience(c, new Set(['d']), new Set(['e']))
    expect(r.map(x => x.id)).toEqual(['a'])
    expect(waOptedIn(c[2])).toBe(false)
    expect(waVars('Ana', 'Pasta', 'id1')).toEqual({ '1': 'Ana', '2': 'Pasta', '3': 'id1' })
  })
})

import { waReminderAudience, timeLeftLabel } from '@/lib/wa-campaign'
describe('reminder', () => {
  it('doar cei anunțați, neaplicați, nereaminiți, fără mesaj recent', () => {
    const yes = { notifications: { whatsapp_campaigns: true } }
    const c = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, name: id, phone: `072200000${i}`, settings: yes }))
    const r = waReminderAudience(c, new Set(['b']), new Set(['a', 'b', 'c', 'd']), new Set(['c']), new Set(['d']))
    expect(r.map(x => x.id)).toEqual(['a'])
  })
  it('timp rămas', () => {
    expect(timeLeftLabel(5 * 3_600_000 + 100)).toBe('5 ore')
    expect(timeLeftLabel(3_600_000)).toBe('1 oră')
    expect(timeLeftLabel(3 * 86_400_000)).toBe('3 zile')
    expect(timeLeftLabel(40 * 60_000)).toBe('40 de minute')
    expect(timeLeftLabel(-1)).toBeNull()
  })
})
