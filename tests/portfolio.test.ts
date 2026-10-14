import { describe, it, expect } from 'vitest'
import { buildPortfolio, collabPosts, compactRo, usableLogo, platformOf } from '@/lib/portfolio'

const post = (o: any = {}) => ({ url: 'https://www.instagram.com/reel/A/', platform: 'instagram' as const, thumbnail: null, views: 1000, likes: 50, comments: 2, shares: 1, ...o })
const col = (id: string, brand: string, o: any = {}) => ({ id, campaign: 'Camp', completedAt: '2026-09-01', rating: null, comment: null, posts: [post()], brand: { key: brand, name: brand, logo: null }, ...o })

describe('portofoliul creatorului', () => {
  it('grupează pe brand, cel mai recent primul, cu media pe brand și distribuția', () => {
    const { brands, summary } = buildPortfolio([
      col('1', 'United', { completedAt: '2026-09-23', rating: 5 }),
      col('2', 'United', { completedAt: '2026-08-01', rating: 4 }),
      col('3', 'Rockstar', { completedAt: '2026-05-03', rating: 3 }),
      col('4', 'Fashion', { completedAt: '2026-09-03' }),
    ], { totalCompleted: 203, showMetrics: true })
    expect(brands.map(b => b.name)).toEqual(['United', 'Fashion', 'Rockstar'])
    expect(brands[0].collabs.map(c => c.id)).toEqual(['1', '2'])
    expect(brands[0].rating).toBe(4.5)
    expect(brands[1].rating).toBeNull()
    expect(summary).toMatchObject({ completed: 203, brands: 3, rating: 4, ratingCount: 3, views: 4000, likes: 200 })
    expect(summary.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 })
  })
  it('vizitatorii publici nu primesc cifre, brandurile nu primesc linkuri', () => {
    const m = [{ url: 'https://www.tiktok.com/@ana/video/1', views: 41600, likes: 1110 }]
    expect(collabPosts(null, null, m, { showMetrics: false, hideLinks: false })[0]).toMatchObject({ url: m[0].url, views: null, likes: null, platform: 'tiktok' })
    expect(collabPosts(null, null, m, { showMetrics: true, hideLinks: true })[0]).toMatchObject({ url: null, views: 41600, likes: 1110 })
    expect(collabPosts('https://instagram.com/p/X', 'th.jpg', [], { showMetrics: true, hideLinks: false })).toEqual([
      { url: 'https://instagram.com/p/X', platform: 'instagram', thumbnail: 'th.jpg', views: null, likes: null, comments: null, shares: null },
    ])
    expect(buildPortfolio([col('1', 'X')], { showMetrics: false }).summary.views).toBeNull()
  })
  it('formate și logo', () => {
    expect(compactRo(41600)).toBe('41,6 K'); expect(compactRo(1110)).toBe('1,1 K'); expect(compactRo(336)).toBe('336'); expect(compactRo(1250000)).toBe('1,3 M'); expect(compactRo(null)).toBe('–')
    expect(usableLogo('https://x/logo.png')).toBe('https://x/logo.png')
    expect(usableLogo('data:image/png;base64,' + 'A'.repeat(100000))).toBeNull()
    expect(platformOf('https://youtu.be/x')).toBe('youtube')
  })
})
