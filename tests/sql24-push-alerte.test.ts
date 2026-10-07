// SQL 24 rulat pe un Postgres real (în memorie): trigger-ul de push, alertele, recenziile publice.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'

const SQL = fs.readFileSync(path.resolve(__dirname, '../supabase/security/24_push_alerte_recenzii_metrici.sql'), 'utf8')
const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const INF = '33333333-3333-3333-3333-333333333333'
const CAMP = '44444444-4444-4444-4444-444444444444'
const COL = '55555555-5555-5555-5555-555555555555'

let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, title text, body text, link text, read boolean DEFAULT false, created_at timestamptz DEFAULT now());
    CREATE TABLE campaigns (id uuid PRIMARY KEY, title text, brand_name text, status text, created_at timestamptz DEFAULT now());
    CREATE TABLE influencers (id uuid PRIMARY KEY, approval_status text, avg_rating numeric, review_count int);
    CREATE TABLE collaborations (id uuid PRIMARY KEY, influencer_id uuid, campaign_id uuid, status text);
    CREATE TABLE reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), collaboration_id uuid, reviewer_role text, rating int, comment text, created_at timestamptz DEFAULT now());
    -- pg_net simulat: înregistrează apelurile
    CREATE SCHEMA net;
    CREATE TABLE net.calls (url text, body jsonb, headers jsonb);
    CREATE FUNCTION net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) RETURNS bigint
      LANGUAGE sql AS $$ INSERT INTO net.calls VALUES (url, body, headers); SELECT 1::bigint $$;
    INSERT INTO campaigns VALUES ('${CAMP}', 'Alopecia', 'Brand X', 'ACTIVE', now() - interval '3 days');
    INSERT INTO campaigns VALUES ('66666666-6666-6666-6666-666666666666', 'Nouă', 'Brand Y', 'PENDING_REVIEW', now());
    INSERT INTO influencers VALUES ('${INF}', 'approved', NULL, NULL);
    INSERT INTO collaborations VALUES ('${COL}', '${INF}', '${CAMP}', 'COMPLETED');
    INSERT INTO reviews (collaboration_id, reviewer_role, rating, comment) VALUES ('${COL}', 'brand', 5, 'Super'), ('${COL}', 'brand', 4, '  '), ('${COL}', 'influencer', 1, 'nu contează');
  `)
  await db.exec(SQL)
})
beforeEach(async () => { await db.exec('TRUNCATE notifications, net.calls, push_subscriptions') })

const sub = (user: string, ep: string) => db.query(`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, 'k', 'a')`, [user, ep])

describe('SQL 24 · push', () => {
  it('fără abonamente nu face niciun apel', async () => {
    await db.query(`INSERT INTO notifications (user_id, title) VALUES ($1, 'x')`, [U1])
    expect((await db.query('SELECT * FROM net.calls')).rows).toHaveLength(0)
  })

  it('un singur apel per inserare, doar cu notificările celor abonați, semnat cu secretul', async () => {
    await sub(U1, 'https://push.example/1')
    await db.query(`INSERT INTO notifications (user_id, title) VALUES ($1,'a'), ($2,'b'), ($1,'c')`, [U1, U2])
    const calls = (await db.query<any>('SELECT * FROM net.calls')).rows
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://addfame.ro/api/push/dispatch')
    expect(calls[0].body.ids).toHaveLength(2)
    const secret = (await db.query<any>(`SELECT value FROM app_private_settings WHERE key = 'push_dispatch_secret'`)).rows[0].value
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
    expect(calls[0].headers['x-push-secret']).toBe(secret)
  })

  it('loturi de câte 200 la inserări mari', async () => {
    await sub(U1, 'https://push.example/1')
    await db.query(`INSERT INTO notifications (user_id, title) SELECT $1, 'n' || g FROM generate_series(1, 450) g`, [U1])
    const calls = (await db.query<any>('SELECT jsonb_array_length(body->\'ids\') AS n FROM net.calls')).rows
    expect(calls.map(c => c.n)).toEqual([200, 200, 50])
  })

  it('o eroare la push nu blochează notificarea', async () => {
    await sub(U1, 'https://push.example/1')
    await db.exec(`CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) RETURNS bigint LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'rețea căzută'; END $$`)
    await db.query(`INSERT INTO notifications (user_id, title) VALUES ($1, 'tot se salvează')`, [U1])
    expect((await db.query('SELECT * FROM notifications')).rows).toHaveLength(1)
    await db.exec(`CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.calls VALUES (url, body, headers); SELECT 1::bigint $$`)
  })

  it('clienții nu pot citi secretul sau abonamentele', async () => {
    await db.exec('SET ROLE authenticated')
    await expect(db.query('SELECT * FROM app_private_settings')).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM push_subscriptions')).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM post_metrics')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })

  it('poate fi rulat din nou fără erori și păstrează secretul', async () => {
    const before = (await db.query<any>(`SELECT value FROM app_private_settings WHERE key = 'push_dispatch_secret'`)).rows[0].value
    await db.exec(SQL)
    const after = (await db.query<any>(`SELECT value FROM app_private_settings WHERE key = 'push_dispatch_secret'`)).rows[0].value
    expect(after).toBe(before)
  })
})

describe('SQL 24 · alerte și recenzii', () => {
  it('campaniile deja publicate sunt marcate ca anunțate, cele în aprobare nu', async () => {
    const rows = (await db.query<any>('SELECT title, alerts_sent_at FROM campaigns ORDER BY title')).rows
    expect(rows.find(r => r.title === 'Alopecia').alerts_sent_at).not.toBeNull()
    expect(rows.find(r => r.title === 'Nouă').alerts_sent_at).toBeNull()
  })

  it('nota medie se recalculează doar din recenziile brandurilor', async () => {
    const r = (await db.query<any>(`SELECT avg_rating, review_count FROM influencers WHERE id = $1`, [INF])).rows[0]
    expect(Number(r.avg_rating)).toBe(4.5)
    expect(r.review_count).toBe(2)
  })

  it('recenziile publice: vizibile pentru vizitatori, cu brandul, comentariile goale devin null', async () => {
    await db.exec('SET ROLE anon')
    const rows = (await db.query<any>(`SELECT * FROM influencer_public_reviews($1, 10)`, [INF])).rows
    await db.exec('RESET ROLE')
    expect(rows).toHaveLength(2)
    expect(rows.every(r => r.brand_name === 'Brand X' && r.campaign_title === 'Alopecia')).toBe(true)
    expect(rows.map(r => r.comment).sort()).toEqual(['Super', null])
  })

  it('creatorii neaprobați nu au recenzii publice', async () => {
    await db.exec(`UPDATE influencers SET approval_status = 'pending' WHERE id = '${INF}'`)
    expect((await db.query(`SELECT * FROM influencer_public_reviews($1, 10)`, [INF])).rows).toHaveLength(0)
    await db.exec(`UPDATE influencers SET approval_status = 'approved' WHERE id = '${INF}'`)
  })

  it('metricile: un singur rând per postare', async () => {
    const ins = `INSERT INTO post_metrics (collaboration_id, campaign_id, influencer_id, url, platform) VALUES ('${COL}', '${CAMP}', '${INF}', 'https://instagram.com/p/abc', 'instagram')`
    await db.exec(ins)
    await expect(db.exec(ins)).rejects.toThrow(/duplicate key/)
  })
})
