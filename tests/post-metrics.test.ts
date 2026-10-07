import { describe, it, expect } from 'vitest'
import { detectPlatform, normalizePostUrl, instagramShortcode, youtubeVideoId, collabPostUrls, cleanCount, computeTotals } from '@/lib/post-metrics'
import { toCsv, csvCell, csvFilename } from '@/lib/csv'

describe('linkuri de postare', () => {
  it('platforma', () => {
    expect(detectPlatform('https://www.instagram.com/reel/Cx1/')).toBe('instagram')
    expect(detectPlatform('vm.tiktok.com/ZM123')).toBe('tiktok')
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectPlatform('https://fb.watch/abc')).toBe('facebook')
    expect(detectPlatform('https://exemplu.ro')).toBe('other')
  })
  it('normalizare: fără www, parametri de urmărire, „/” final', () => {
    expect(normalizePostUrl('https://www.instagram.com/p/ABC123/?igsh=xyz')).toBe('https://instagram.com/p/ABC123')
    expect(normalizePostUrl('instagram.com/p/ABC123')).toBe('https://instagram.com/p/ABC123')
    expect(normalizePostUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ')
    expect(normalizePostUrl('javascript:alert(1)')).toBeNull()
    expect(normalizePostUrl('')).toBeNull()
  })
  it('coduri Instagram și YouTube', () => {
    expect(instagramShortcode('https://instagram.com/reel/Cx_1-abc/')).toBe('Cx_1-abc')
    expect(instagramShortcode('https://instagram.com/stories/ana/123')).toBeNull()
    expect(youtubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=1')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoId('https://youtube.com/watch?v=scurt')).toBeNull()
  })
  it('linkurile unei colaborări, fără dubluri', () => {
    expect(collabPostUrls({ deliverable_url: 'https://instagram.com/p/A/', deliverable_urls: ['https://www.instagram.com/p/A', 'https://tiktok.com/@a/video/1'] }))
      .toEqual(['https://instagram.com/p/A', 'https://tiktok.com/@a/video/1'])
  })
})

describe('cifre', () => {
  it('acceptă formatele scrise de oameni', () => {
    expect(cleanCount('12400')).toBe(12400)
    expect(cleanCount('12.400')).toBe(12400)
    expect(cleanCount('12,4K')).toBe(12400)
    expect(cleanCount('1.2m')).toBe(1200000)
    expect(cleanCount(' 3 500 ')).toBe(3500)
    expect(cleanCount(-5)).toBeNull()
    expect(cleanCount('abc')).toBeNull()
    expect(cleanCount('')).toBeNull()
    expect(cleanCount('1.5')).toBeNull()
  })
  it('totaluri și engagement pe vizualizări', () => {
    const t = computeTotals([
      { views: 1000, likes: 80, comments: 20 },
      { likes: 50 },                       // fără vizualizări: intră în interacțiuni, nu în rată
      {},
    ])
    expect(t).toMatchObject({ posts: 3, withData: 2, views: 1000, likes: 130, engagement: 150, engagementRate: 10 })
    expect(computeTotals([]).engagementRate).toBeNull()
  })
})

describe('CSV', () => {
  it('Excel românesc: „;”, BOM, ghilimele', () => {
    const csv = toCsv(['Nume', 'Notă'], [['Ana; Maria', 'a spus "super"'], [null, 5]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('"Ana; Maria";"a spus ""super"""')
    expect(csv).toContain('\r\n;5')
  })
  it('blochează formulele (CSV injection), lasă numerele negative', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('-12')).toBe('-12')
  })
  it('nume de fișier sigur', () => {
    expect(csvFilename('aplicanți', 'Șampon „Alopecia” 2026!')).toBe('aplicanti-Sampon-Alopecia-2026.csv')
  })
})
