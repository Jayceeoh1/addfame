// SQL 25 pe Postgres real: corectarea urmăritorilor salvați greșit („12,4K” → 124).
import { describe, it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'
import { parseCount } from '@/lib/tiers'

const SQL = fs.readFileSync(path.resolve(__dirname, '../supabase/security/25_urmaritori_stergere_mementouri.sql'), 'utf8')

async function db(followersType: 'integer' | 'text') {
  const d = new PGlite()
  await d.exec(`
    CREATE TABLE influencers (id serial PRIMARY KEY, name text, slug text, platforms jsonb, instagram_followers ${followersType}, tt_followers ${followersType});
    CREATE TABLE deliverable_drafts (id serial PRIMARY KEY);
    CREATE TABLE collaborations (id serial PRIMARY KEY);
    CREATE TABLE campaigns (id serial PRIMARY KEY);
    INSERT INTO influencers (name, platforms, instagram_followers, tt_followers) VALUES
      ('Ana',   '[{"platform":"instagram","followers":"12,4K"},{"platform":"tiktok","followers":"1.2M"}]', '124', '12'),
      ('Bogdan','[{"platform":"instagram","followers":"15 mii"}]', '15', NULL),
      ('Corect','[{"platform":"instagram","followers":"8.500"}]', '8500', NULL),
      ('Manual','[]', '124', NULL),
      ('Gol',   NULL, NULL, NULL);
  `)
  return d
}

describe('SQL 25 · urmăritori', () => {
  for (const type of ['integer', 'text'] as const) {
    it(`repară valorile din linkurile profilului (coloană ${type})`, async () => {
      const d = await db(type)
      const res = await d.exec(SQL)
      const rows = (await d.query<any>('SELECT name, instagram_followers::text AS ig, tt_followers::text AS tt FROM influencers ORDER BY id')).rows
      expect(rows.map(r => [r.name, r.ig, r.tt])).toEqual([
        ['Ana', '12400', '1200000'],
        ['Bogdan', '15000', null],
        ['Corect', '8500', null],
        ['Manual', '124', null],     // nu se poate recupera automat
        ['Gol', null, null],
      ])
      // ultima interogare listează exact creatorii de verificat manual
      expect(res[res.length - 1].rows.map((r: any) => r.name)).toEqual(['Manual'])
    })
  }

  it('aceeași regulă în SQL și în aplicație', async () => {
    const d = await db('integer')
    await d.exec(SQL)
    for (const v of ['12K', '12,4K', '12.4 k', '1,2M', '15 mii', '1,5 mil', '12.500', '12 500', '12400 urmăritori', '', 'abc', '0']) {
      const sql = Number((await d.query<any>('SELECT public.af_parse_count($1) AS n', [v])).rows[0].n)
      expect([v, sql]).toEqual([v, parseCount(v)])
    }
  })

  it('poate fi rulat din nou', async () => {
    const d = await db('integer')
    await d.exec(SQL)
    await d.exec(SQL)
    expect((await d.query<any>(`SELECT instagram_followers FROM influencers WHERE name = 'Ana'`)).rows[0].instagram_followers).toBe(12400)
  })
})
