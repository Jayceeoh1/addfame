import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'
import { parseStory, cleanCount, isUpcoming, splitEvents, formatEventDate, localInputToIso, isoToLocalInput, photoUrl, cleanUrl, slugify, tileClass, coverOf } from '@/lib/events'

const NOW = new Date('2026-10-09T10:00:00Z')
const ev = (o: any = {}) => ({ id: 'x', slug: 'x', title: 'T', status: 'published', starts_at: null, location: null, city: null, description: null, signup_url: null, cover_photo_id: null, ...o })

describe('evenimente · funcții', () => {
  it('viitor = publicat și cu dată neterminată; ciornele nu contează', () => {
    expect(isUpcoming(ev({ starts_at: '2026-10-20T15:00:00Z' }), NOW)).toBe(true)
    expect(isUpcoming(ev({ starts_at: '2026-10-01T15:00:00Z' }), NOW)).toBe(false)
    expect(isUpcoming(ev({ starts_at: '2026-10-20T15:00:00Z', status: 'draft' }), NOW)).toBe(false)
    expect(isUpcoming(ev({ starts_at: null }), NOW)).toBe(false)
  })
  it('împarte: următorul = cel mai apropiat; trecutele, cele mai recente întâi; fără ciorne', () => {
    const list = [
      ev({ id: 'a', starts_at: '2026-12-01T10:00:00Z' }), ev({ id: 'b', starts_at: '2026-10-15T10:00:00Z' }),
      ev({ id: 'c', starts_at: '2026-03-01T10:00:00Z' }), ev({ id: 'd', starts_at: '2026-06-01T10:00:00Z' }),
      ev({ id: 'e', starts_at: '2026-11-01T10:00:00Z', status: 'draft' }), ev({ id: 'f', starts_at: null }),
    ]
    const r = splitEvents(list, NOW)
    expect(r.next!.id).toBe('b')
    expect(r.upcoming.map(e => e.id)).toEqual(['b', 'a'])
    expect(r.past.map(e => e.id)).toEqual(['d', 'c', 'f'])
  })
  it('data în ora României, cu și fără oră', () => {
    expect(formatEventDate('2026-10-12T15:00:00Z')).toBe('12 octombrie 2026, 18:00')
    expect(formatEventDate('2026-12-05T10:30:00Z')).toBe('5 decembrie 2026, 12:30')
    expect(formatEventDate('2026-10-12T15:00:00Z', false)).toBe('12 octombrie 2026')
    expect(formatEventDate(null)).toBe('')
    expect(formatEventDate('nu e dată')).toBe('')
  })
  it('input datetime-local ↔ ISO, vară și iarnă', () => {
    expect(localInputToIso('2026-10-12T18:00')).toBe('2026-10-12T15:00:00.000Z')
    expect(localInputToIso('2026-12-05T12:30')).toBe('2026-12-05T10:30:00.000Z')
    expect(localInputToIso('2026-10-12')).toBe('2026-10-11T21:00:00.000Z')
    expect(localInputToIso('')).toBeNull()
    expect(localInputToIso('abc')).toBeNull()
    expect(isoToLocalInput('2026-10-12T15:00:00.000Z')).toBe('2026-10-12T18:00')
    expect(isoToLocalInput('2026-12-05T10:30:00.000Z')).toBe('2026-12-05T12:30')
    expect(isoToLocalInput(null)).toBe('')
    expect(isoToLocalInput(localInputToIso('2026-03-29T09:15')!)).toBe('2026-03-29T09:15')
  })
  it('adresa pozei, linkul, slug-ul, mozaicul, coperta', () => {
    expect(photoUrl('ab/c d.jpg', 'https://x.supabase.co/')).toBe('https://x.supabase.co/storage/v1/object/public/evenimente/ab/c%20d.jpg')
    expect(cleanUrl('addfame.ro/rezerva')).toBe('https://addfame.ro/rezerva')
    expect(cleanUrl('javascript:alert(1)')).toBeNull()
    expect(cleanUrl('  ')).toBeNull()
    expect(slugify('Seara AddFame — Toamna 2026!')).toBe('seara-addfame-toamna-2026')
    expect(slugify('Ședința țărăneștilor')).toBe('sedinta-taranestilor')
    expect(tileClass(0)).toContain('ev-wide'); expect(tileClass(1)).toBe(''); expect(tileClass(8)).toBe(tileClass(0))
    const photos = [{ id: 'p1' }, { id: 'p2' }] as any
    expect(coverOf({ cover_photo_id: 'p2' }, photos)!.id).toBe('p2')
    expect(coverOf({ cover_photo_id: null }, photos)!.id).toBe('p1')
    expect(coverOf({ cover_photo_id: null }, [])).toBeNull()
  })
})

describe('povestea evenimentului', () => {
  it('parsează paragrafe, subtitluri, citate și poze', () => {
    const b = parseStory('Primul paragraf.\nContinuă pe rând nou.\n\n## Ce am făcut\n\nAl doilea.\n\n[foto 1 2]\n\n> „Cea mai bună seară.” — Maria P., creator\n\n[Foto 3, 4]\n\nFinal.')
    expect(b).toEqual([
      { t: 'p', text: 'Primul paragraf.\nContinuă pe rând nou.' },
      { t: 'h', text: 'Ce am făcut' },
      { t: 'p', text: 'Al doilea.' },
      { t: 'photos', nums: [1, 2] },
      { t: 'quote', text: 'Cea mai bună seară.', by: 'Maria P., creator' },
      { t: 'photos', nums: [3, 4] },
      { t: 'p', text: 'Final.' },
    ])
  })
  it('citat fără autor, poze invalide, text gol, Windows newlines', () => {
    expect(parseStory('> Doar un citat')).toEqual([{ t: 'quote', text: 'Doar un citat', by: null }])
    expect(parseStory('[foto 0]')).toEqual([])
    expect(parseStory('[foto abc]')).toEqual([{ t: 'p', text: '[foto abc]' }])
    expect(parseStory('')).toEqual([]); expect(parseStory(null)).toEqual([])
    expect(parseStory('A.\r\n\r\nB.')).toEqual([{ t: 'p', text: 'A.' }, { t: 'p', text: 'B.' }])
    expect(parseStory('[foto 1 2 3 4 5 6 7 8 9 10]')).toEqual([{ t: 'photos', nums: [1, 2, 3, 4, 5, 6, 7, 8] }])
  })
  it('cifrele evenimentului', () => {
    expect(cleanCount('45')).toBe(45); expect(cleanCount('')).toBeNull(); expect(cleanCount(-3)).toBeNull(); expect(cleanCount('abc')).toBeNull(); expect(cleanCount(12.6)).toBe(13)
  })
})

describe('SQL 28 · evenimente', () => {
  it('creează tabelele, închide accesul public, rulează de două ori, șterge pozele odată cu evenimentul', async () => {
    const db = new PGlite()
    await db.exec(`DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)
    const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/security/28_evenimente_galerie.sql'), 'utf8')
    await db.exec(sql); await db.exec(sql)
    await db.exec(`INSERT INTO site_events (id, slug, title, story, creators_count) VALUES ('11111111-1111-1111-1111-111111111111', 'seara-1', 'Seara 1', 'Text', 40)`)
    await expect(db.exec(`INSERT INTO site_events (slug, title, brands_count) VALUES ('seara-9', 't', -1)`)).rejects.toThrow(/check/)
    await db.exec(`INSERT INTO site_event_photos (event_id, path) VALUES ('11111111-1111-1111-1111-111111111111', 'a/b.jpg')`)
    await expect(db.exec(`INSERT INTO site_events (slug, title) VALUES ('Ab C', 't')`)).rejects.toThrow(/check/)
    await expect(db.exec(`INSERT INTO site_events (slug, title, status) VALUES ('seara-2', 't', 'public')`)).rejects.toThrow(/check/)
    await expect(db.exec(`INSERT INTO site_events (slug, title) VALUES ('seara-1', 't')`)).rejects.toThrow(/unique|duplicate/)
    await db.exec('SET ROLE anon')
    await expect(db.exec('SELECT * FROM site_events')).rejects.toThrow(/permission/)
    await expect(db.exec('SELECT * FROM site_event_photos')).rejects.toThrow(/permission/)
    await db.exec('RESET ROLE')
    await db.exec(`DELETE FROM site_events WHERE slug = 'seara-1'`)
    const r = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM site_event_photos')
    expect(r.rows[0].n).toBe(0)
  })
})
