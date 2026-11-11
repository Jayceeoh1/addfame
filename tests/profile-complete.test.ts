import { describe, it, expect } from 'vitest'
import { profileMissing, profilePercent, validPhone, hasSocial } from '@/lib/profile-complete'

const full = {
  name: 'Ioana', avatar: 'a.jpg', bio: 'Salut', niches: ['beauty'],
  platforms: [{ platform: 'tiktok', url: 'https://tiktok.com/@ioana' }],
  phone: '0712 345 678', address_line: 'Str. Lalelelor 5', city: 'Iași', county: 'Iași',
}

describe('profil complet', () => {
  it('profil complet: nimic lipsă, 100%', () => {
    const m = profileMissing(full, 'ioana@x.ro')
    expect(m).toEqual([])
    expect(profilePercent(m)).toBe(100)
  })
  it('doar telefonul lipsă blochează (aprox. 90%)', () => {
    const m = profileMissing({ ...full, phone: '' }, 'ioana@x.ro')
    expect(m.map(x => x.key)).toEqual(['phone'])
    expect(profilePercent(m)).toBe(88)
  })
  it('Instagram SAU TikTok e de ajuns; fără niciunul lipsește', () => {
    expect(hasSocial({ platforms: [{ platform: 'instagram', url: 'insta' }] })).toBe(true)
    expect(hasSocial({ instagram_connected: true })).toBe(true)
    expect(hasSocial({ platforms: { tiktok: '@x' } })).toBe(true)
    expect(hasSocial({ platforms: [{ platform: 'youtube', url: 'y' }] })).toBe(false)
    expect(hasSocial({ platforms: [{ platform: 'instagram', url: '' }] })).toBe(false)
  })
  it('adresa trebuie să aibă stradă, oraș și județ', () => {
    expect(profileMissing({ ...full, county: '' }, 'e@x.ro').map(x => x.key)).toEqual(['address'])
  })
  it('telefon valid', () => {
    expect(validPhone('+40 712 345 678')).toBe(true)
    expect(validPhone('0712')).toBe(false)
  })
})
