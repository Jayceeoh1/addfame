import { describe, it, expect } from 'vitest'
import { toReportRows, computeReportTotals, cleanSettings, igHandle } from '@/lib/collab-report'

const raw = [
  { id: 'a', url: 'https://instagram.com/reel/ABC123', platform: 'instagram', source: 'instagram', views: 18400, reach: 14900, likes: 1120, comments: 86, shares: 41, saves: 203, created_at: '2026-11-11' },
  { id: 'b', url: 'story:1', platform: 'instagram', kind: 'story', source: 'creator', views: 2310, reach: 2000, link_clicks: 38, screenshot_path: 'c/b.png', created_at: '2026-11-09' },
  { id: 'c', url: 'story:2', platform: 'instagram', kind: 'story', label: 'Cod reducere', source: 'admin', views: 1870, link_clicks: 12, created_at: '2026-11-10' },
]

describe('raport colaborare', () => {
  it('etichetează rândurile și semnează capturile', () => {
    const rows = toReportRows(raw, new Map([['c/b.png', 'https://x/signed']]))
    expect(rows.map(r => r.kind)).toEqual(['reel', 'story', 'story'])
    expect(rows[0].linkable).toBe(true)
    expect(rows[1].linkable).toBe(false)
    expect(rows[1].label).toBe('Story 1')
    expect(rows[2].label).toBe('Cod reducere')
    expect(rows[1].screenshot_url).toBe('https://x/signed')
  })

  it('calculează totalurile și engagement-ul din conturile atinse ale postărilor', () => {
    const t = computeReportTotals(toReportRows(raw, new Map()))
    expect(t.views).toBe(18400 + 2310 + 1870)
    expect(t.viewsStories).toBe(4180)
    expect(t.reach).toBe(14900)
    expect(t.interactions).toBe(1120 + 86 + 41 + 203)
    expect(t.clicks).toBe(50)
    expect(t.erBase).toBe('reach')
    expect(t.er).toBe(9.7)
    expect(t.withData).toBe(3)
  })

  it('folosește vizualizările când lipsesc conturile atinse', () => {
    const t = computeReportTotals(toReportRows([{ id: 'x', url: 'https://tiktok.com/@a/video/1', platform: 'tiktok', source: 'creator', views: 1000, likes: 50 }], new Map()))
    expect(t.erBase).toBe('views')
    expect(t.er).toBe(5)
  })

  it('curăță setările raportului', () => {
    const s = cleanSettings({ status: 'published', cost_lei: '200', highlights: ['  a ', '', null], brief_checks: [{ text: 'x', ok: false }, { text: '' }], hidden: ['cost', 'nimic'] })
    expect(s.status).toBe('published')
    expect(s.cost_lei).toBe(200)
    expect(s.highlights).toEqual(['a'])
    expect(s.brief_checks).toEqual([{ text: 'x', ok: false }])
    expect(s.hidden).toEqual(['cost'])
  })

  it('găsește handle-ul de Instagram', () => {
    expect(igHandle({ instagram_handle: '@ioana' })).toBe('@ioana')
    expect(igHandle({ platforms: [{ platform: 'instagram', url: 'https://www.instagram.com/ioana.marin/?hl=ro' }] })).toBe('@ioana.marin')
    expect(igHandle({})).toBeNull()
  })
})

import { deliverablesLabel, interactionParts, computeReportTotals as crt } from '@/lib/collab-report'
describe('raport: reposturi, livrabile, defalcare', () => {
  const row = (o: any) => ({ id: 'x', url: 'u', linkable: true, platform: 'instagram', kind: 'reel', label: '', source: 'admin', views: null, reach: null, likes: null, comments: null, shares: null, saves: null, link_clicks: null, reposts: null, thumbnail_url: null, screenshot_path: null, screenshot_url: null, reported_at: null, admin_edited_at: null, ...o })
  it('reposturile intră în interacțiuni, iar defalcarea adună exact totalul', () => {
    const t = crt([row({ views: 1000, likes: 100, comments: 10, reposts: 57, shares: 1 }), row({ kind: 'post', views: 500, likes: 50, comments: 5 })] as any)
    expect(t.interactions).toBe(223)
    expect(interactionParts(t).reduce((s, [, n]) => s + n, 0)).toBe(t.interactions)
    expect(interactionParts(t).map(p => p[0])).toEqual(['like', 'comentarii', 'reposturi', 'distribuiri'])
    expect(t.er).toBe(14.9)
  })
  it('livrabilele pe tipuri', () => {
    expect(deliverablesLabel([{ kind: 'reel' }, { kind: 'reel' }, { kind: 'post' }] as any)).toBe('2 reels · 1 postare')
    expect(deliverablesLabel([{ kind: 'post' }] as any)).toBe('1 postare')
    expect(deliverablesLabel([])).toBe('')
  })
})
