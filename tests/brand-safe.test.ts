import { describe, it, expect } from 'vitest'
import { sanitizeBioForBrand, safePlatforms, toBrandInfluencer } from '../lib/brand-safe'

describe('sanitizeBioForBrand', () => {
  it('ascunde handle, link, email și telefon', () => {
    const s = sanitizeBioForBrand('Mamă de 2 👶 | IG @ana.pop | colaborări: ana@gmail.com | linktr.ee/ana | 0721 234 567 | https://tiktok.com/@ana')!
    expect(s).not.toMatch(/@ana|gmail|linktr|0721|tiktok\.com/)
    expect(s).toContain('Mamă de 2')
  })
  it('lasă textul normal neatins', () => {
    expect(sanitizeBioForBrand('Creator de conținut lifestyle din Cluj, 5 ani experiență.')).toBe('Creator de conținut lifestyle din Cluj, 5 ani experiență.')
    expect(sanitizeBioForBrand(null)).toBeNull()
  })
})

describe('safePlatforms', () => {
  it('păstrează doar platforma și urmăritorii, din orice formă de date', () => {
    expect(safePlatforms([{ platform: 'Instagram', url: 'https://instagram.com/ana', username: 'ana', followers: '12K' }]))
      .toEqual([{ platform: 'instagram', followers: '12K' }])
    const fromMap = safePlatforms({ tiktok: JSON.stringify({ url: 'https://tiktok.com/@ana', followers: 5000 }) })
    expect(fromMap).toEqual([{ platform: 'tiktok', followers: 5000 }])
    expect(JSON.stringify(fromMap)).not.toContain('tiktok.com')
  })
})

describe('toBrandInfluencer', () => {
  it('scoate câmpurile de contact', () => {
    const r: any = toBrandInfluencer({ id: '1', name: 'Ana', instagram_handle: 'ana', email: 'a@b.ro', bio: 'IG @ana', platforms: [] })
    expect(r.instagram_handle).toBeUndefined()
    expect(r.email).toBeUndefined()
    expect(r.bio).not.toContain('@ana')
    expect(r.name).toBe('Ana')
  })
})
