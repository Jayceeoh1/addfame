import { describe, it, expect } from 'vitest'
import { normalizePlatforms, manualFollowers, parseCount } from '@/lib/tiers'

describe('normalizePlatforms', () => {
  it('lista normală rămâne la fel', () => {
    expect(normalizePlatforms([{ platform: 'tiktok', url: 'https://tiktok.com/@a', followers: '12K' }])).toEqual([{ platform: 'tiktok', url: 'https://tiktok.com/@a', followers: '12K' }])
  })
  it('obiect cu valori text JSON (cazul din admin)', () => {
    const raw = { tiktok: '{"url":"https://tiktok.com/@andreeacristinaa93","followers":"22.500"}', instagram: '{"url":"https://instagram.com/dee.acriss.c","followers":"2883"}' }
    const r = normalizePlatforms(raw)
    expect(r).toEqual([
      { platform: 'tiktok', url: 'https://tiktok.com/@andreeacristinaa93', followers: '22.500' },
      { platform: 'instagram', url: 'https://instagram.com/dee.acriss.c', followers: '2883' },
    ])
    expect(r.map(p => parseCount(p.followers))).toEqual([22500, 2883])
  })
  it('followers salvat ca text JSON într-o listă; obiect de obiecte; obiect {platformă: url}; text JSON întreg', () => {
    expect(normalizePlatforms([{ platform: 'tiktok', followers: '{"url":"https://t.co/x","followers":"22.500"}' }])).toEqual([{ platform: 'tiktok', url: 'https://t.co/x', followers: '22.500' }])
    expect(normalizePlatforms({ instagram: { url: 'https://i.co/a', followers: 900 } })).toEqual([{ platform: 'instagram', url: 'https://i.co/a', followers: 900 }])
    expect(normalizePlatforms({ instagram: 'https://instagram.com/a', tiktok: 'www.tiktok.com/@b' })).toEqual([{ platform: 'instagram', url: 'https://instagram.com/a' }, { platform: 'tiktok', url: 'www.tiktok.com/@b' }])
    expect(normalizePlatforms('[{"platform":"youtube","followers":"5K"}]')).toEqual([{ platform: 'youtube', followers: '5K' }])
  })
  it('valori goale sau ciudate nu strică nimic', () => {
    for (const v of [null, undefined, '', 5, true, [], {}, 'text oarecare', [null, 3, '']]) expect(Array.isArray(normalizePlatforms(v as any))).toBe(true)
    expect(normalizePlatforms(null)).toEqual([])
  })
  it('manualFollowers citește corect și formatul ciudat', () => {
    const raw = { tiktok: '{"url":"u","followers":"22.500"}', instagram: '{"url":"v","followers":"2883"}' }
    expect(manualFollowers({ platforms: raw })).toBe(22500)
    expect(manualFollowers({ platforms: raw }, { excludeInstagram: true })).toBe(22500)
  })
})
