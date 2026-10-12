import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, seed, applySql, CAMP } from './helpers/db'

// Înscrieri la evenimente (SQL 35), pe Postgres real.
let db: Awaited<ReturnType<typeof makeDb>>
const one = async (sql: string) => (await db.query<any>(sql)).rows[0]
const INF = (n: number) => `44444444-4444-4444-4444-44444444444${n}`
const apply = async (n: number) =>
  (await one(`INSERT INTO event_applications (campaign_id, influencer_id, full_name) VALUES ('${CAMP}', '${INF(n)}', 'Inf ${n}') RETURNING id`)).id as string
const decide = async (id: string, d: string) => (await one(`SELECT decide_event_application('${id}', '${d}') AS r`)).r

beforeAll(async () => {
  db = await makeDb()
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE influencers (id uuid PRIMARY KEY, user_id uuid, name text, phone text, city text, instagram_handle text);
    ALTER TABLE campaigns ADD COLUMN campaign_type text;
    CREATE TABLE campaign_applications (campaign_id uuid, influencer_id uuid, message text, status text, created_at timestamptz DEFAULT now());
  `)
})

beforeEach(async () => {
  await db.exec(`DROP TABLE IF EXISTS event_applications CASCADE`)
  await seed(db)
  await db.exec(`
    TRUNCATE influencers, campaign_applications;
    INSERT INTO influencers (id, name, city) SELECT ('44444444-4444-4444-4444-44444444444' || g)::uuid, 'Inf ' || g, 'Iași' FROM generate_series(1, 5) g;
    UPDATE campaigns SET campaign_type = 'OPEN_CALL', fee_slots = 2, status = 'ACTIVE' WHERE id = '${CAMP}';
    INSERT INTO campaign_applications (campaign_id, influencer_id, message, status) VALUES ('${CAMP}', '${INF(5)}', 'vechi', 'pending');
  `)
  await applySql(db, '35_evenimente_inscrieri.sql')
})

describe('event_applications', () => {
  it('o singură înscriere pe influencer și eveniment', async () => {
    await apply(1)
    await expect(apply(1)).rejects.toThrow()
  })

  it('aplicațiile vechi sunt mutate (nu se mai pierd)', async () => {
    const r = await one(`SELECT full_name, city, message, status FROM event_applications WHERE influencer_id = '${INF(5)}'`)
    expect(r).toMatchObject({ full_name: 'Inf 5', city: 'Iași', message: 'vechi', status: 'pending' })
  })

  it('aprobarea dă un cod de intrare; nu se aprobă peste locurile plătite', async () => {
    const a = await apply(1), b = await apply(2), c = await apply(3)
    const r1 = await decide(a, 'approved')
    expect(r1.ok).toBe(true)
    expect(r1.entry_code).toMatch(/^EV-[A-HJ-NP-Z2-9]{6}$/)
    expect((await decide(b, 'approved')).ok).toBe(true)
    const r3 = await decide(c, 'approved')
    expect(r3).toMatchObject({ ok: false, error: 'full' })
    // un loc eliberat prin respingere → al treilea poate fi aprobat
    const back = await decide(b, 'rejected')
    expect(back.ok).toBe(true)
    expect((await one(`SELECT entry_code FROM event_applications WHERE id = '${b}'`)).entry_code).toBeNull()
    expect((await decide(c, 'approved')).ok).toBe(true)
  })

  it('fără limită de locuri când campania nu are taxă/locuri', async () => {
    await db.exec(`UPDATE campaigns SET fee_slots = NULL, max_influencers = NULL WHERE id = '${CAMP}'`)
    for (const n of [1, 2, 3, 4]) expect((await decide(await apply(n), 'approved')).ok).toBe(true)
  })

  it('înscrierea anulată de influencer nu mai poate fi aprobată; decizie invalidă refuzată', async () => {
    const a = await apply(1)
    await db.exec(`UPDATE event_applications SET status = 'cancelled' WHERE id = '${a}'`)
    expect((await decide(a, 'approved')).error).toBe('cancelled')
    expect((await decide(await apply(2), 'maybe')).error).toBe('invalid_decision')
  })

  it('rulat a doua oară nu dublează nimic', async () => {
    await applySql(db, '35_evenimente_inscrieri.sql')
    expect(Number((await one(`SELECT count(*) AS n FROM event_applications`)).n)).toBe(1)
  })
})
