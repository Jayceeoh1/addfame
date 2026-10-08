import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'
import { validateApplication, isCastingOpen, costPer1k, filterApplications, ageOn, zoneLabel } from '@/lib/castings'

const NOW = new Date('2026-10-08T10:00:00Z')
const good = (o: any = {}) => ({
  first_name: ' Maria ', last_name: 'Popescu', email: 'Maria@Email.com ', phone: '+40 712 345 678', birth_date: '1998-04-02',
  zone: 'sector3', has_license: true, driving_years: '3–5 ani',
  platforms: { tiktok: { enabled: true, handle: '@maria', followers: '61K', avg_views: '38K' }, instagram: { enabled: true, handle: '@maria.p', followers: '12,4K', avg_views: '' }, youtube: { enabled: false } },
  main_platform: 'tiktok', sample_links: ['https://www.tiktok.com/@maria/video/1', 'nu e link'],
  price_video: '1.200', invoicing: 'PFA / II', consent_share: true, content_types: ['Lifestyle', 'Altceva'],
  ...o,
})

describe('înscriere · validare', () => {
  it('curăță și calculează cifrele', () => {
    const r = validateApplication(good(), NOW)
    expect(r.ok).toBe(true)
    expect(r.data).toMatchObject({
      first_name: 'Maria', email: 'maria@email.com', main_platform: 'tiktok', main_followers: 61000, main_avg_views: 38000,
      total_followers: 73400, price_video: 1200, content_types: ['Lifestyle'], sample_links: ['https://www.tiktok.com/@maria/video/1'],
    })
    expect(r.data!.platforms.youtube).toBeUndefined()
  })
  it('refuză minorii, lipsa acordului, lipsa platformelor', () => {
    const r = validateApplication(good({ birth_date: '2010-01-01', consent_share: false, platforms: {} }), NOW)
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errors!)).toEqual(expect.arrayContaining(['birth_date', 'consent_share', 'platforms']))
  })
  it('alt oraș cere numele orașului; platforma bifată cere cont și urmăritori', () => {
    const r = validateApplication(good({ zone: 'other', platforms: { tiktok: { enabled: true, handle: '', followers: 'abc' } } }), NOW)
    expect(Object.keys(r.errors!)).toEqual(expect.arrayContaining(['other_city', 'tiktok.handle', 'tiktok.followers']))
  })
  it('platforma principală implicit: cea cu cei mai mulți urmăritori', () => {
    const r = validateApplication(good({ main_platform: 'youtube' }), NOW)
    expect(r.data!.main_platform).toBe('tiktok')
  })
  it('vârsta se calculează corect în jurul zilei de naștere', () => {
    expect(ageOn('2008-10-08', NOW)).toBe(18)
    expect(ageOn('2008-10-09', NOW)).toBe(17)
  })
})

describe('casting · deschis/închis', () => {
  it('termenul include ultima zi (ora României)', () => {
    expect(isCastingOpen({ status: 'open', deadline: '2026-10-08' }, new Date('2026-10-08T20:30:00Z'))).toBe(true)  // 23:30 la București
    expect(isCastingOpen({ status: 'open', deadline: '2026-10-08' }, new Date('2026-10-08T21:30:00Z'))).toBe(false) // 00:30 a doua zi
    expect(isCastingOpen({ status: 'draft', deadline: null }, NOW)).toBe(false)
    expect(isCastingOpen({ status: 'open', deadline: null }, NOW)).toBe(true)
  })
})

describe('admin · calcule și filtre', () => {
  it('cost per 1.000 vizualizări', () => {
    expect(costPer1k(1200, 38000)).toBe(32)
    expect(costPer1k(350, 4100)).toBe(85)
    expect(costPer1k(800, 0)).toBeNull()
  })
  it('filtre: zonă, platformă, urmăritori, preț, permis', () => {
    const rows = [
      { id: 'a', zone: 'sector1', main_platform: 'tiktok', platforms: { tiktok: { followers: 60000 } }, main_followers: 60000, price_video: 1200, has_license: true, status: 'new' },
      { id: 'b', zone: 'ilfov', main_platform: 'instagram', platforms: { instagram: { followers: 8000 } }, main_followers: 8000, price_video: 350, has_license: true, status: 'new' },
      { id: 'c', zone: 'other', main_platform: 'tiktok', platforms: { tiktok: { followers: 90000 } }, main_followers: 90000, price_video: 900, has_license: true, status: 'new' },
      { id: 'd', zone: 'sector4', main_platform: 'tiktok', platforms: { tiktok: { followers: 20000 } }, main_followers: 20000, price_video: 500, has_license: false, status: 'selected' },
    ]
    const ids = (f: any) => filterApplications(rows, f).map(r => r.id)
    expect(ids({ zone: 'priority' })).toEqual(['a', 'b', 'd'])
    expect(ids({ zone: 'bucuresti' })).toEqual(['a', 'd'])
    expect(ids({ zone: 'all', platform: 'tiktok', minFollowers: 50000 })).toEqual(['a', 'c'])
    expect(ids({ maxPrice: 600, licenseOnly: true })).toEqual(['b'])
    expect(ids({ status: 'selected' })).toEqual(['d'])
  })
  it('eticheta zonei', () => {
    expect(zoneLabel('sector2')).toBe('București · Sector 2')
    expect(zoneLabel('other', 'Ploiești')).toBe('Alt oraș: Ploiești')
  })
})

describe('SQL 27', () => {
  it('rulează (și a doua oară), un email per casting, acordul e obligatoriu, clienții nu au acces', async () => {
    const db = new PGlite()
    await db.exec(`DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)
    const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/security/27_castinguri.sql'), 'utf8')
    await db.exec(sql); await db.exec(sql)
    const c = (await db.query<any>(`SELECT id, status, min_followers FROM castings WHERE slug = 'auto-bucuresti'`)).rows
    expect(c).toHaveLength(1); expect(c[0].status).toBe('draft')
    const ins = (email: string, consent = true) => db.query(
      `INSERT INTO casting_applications (casting_id, first_name, last_name, email, phone, zone, consent_share) VALUES ($1,'A','B',$2,'0712345678','sector1',$3)`, [c[0].id, email, consent])
    await ins('a@x.ro')
    await expect(ins('A@X.ro')).rejects.toThrow(/duplicate key/)
    await expect(ins('b@x.ro', false)).rejects.toThrow(/check/)
    await expect(db.exec(`INSERT INTO castings (slug, title) VALUES ('Ab C', 't')`)).rejects.toThrow(/check/)
    await db.exec('SET ROLE anon')
    await expect(db.query('SELECT * FROM casting_applications')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })
})
