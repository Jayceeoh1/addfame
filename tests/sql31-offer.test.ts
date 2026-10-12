import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, seed, applySql, BRAND, OTHER_BRAND, CAMP } from './helpers/db'

// „Influencerii propun prețul” (SQL 31), pe Postgres real, peste 06a + 18 + 29.
let db: Awaited<ReturnType<typeof makeDb>>
const one = async (sql: string) => (await db.query<any>(sql)).rows[0]
const INF = '44444444-4444-4444-4444-444444444444'
const balance = async () => Number((await one(`SELECT credits_balance FROM brands WHERE id='${BRAND}'`)).credits_balance)
const wallet = async () => Number((await one(`SELECT wallet_balance FROM influencers WHERE id='${INF}'`)).wallet_balance)
const collab = async (id: string) => one(`SELECT * FROM collaborations WHERE id='${id}'`)
const apply = async (price: number | null = 350) =>
  (await one(`INSERT INTO collaborations (campaign_id, influencer_id, status, offer_price)
              VALUES ('${CAMP}', '${INF}', 'PENDING', ${price === null ? 'NULL' : price}) RETURNING id`)).id as string
const select = async (id: string, brand = BRAND) =>
  (await one(`SELECT select_offer_influencer('${id}', '${brand}') AS r`)).r
const release = async (id: string) => (await one(`SELECT release_campaign_pay('${id}') AS r`)).r
const settle = async (used: number | null = null) =>
  (await one(`SELECT settle_campaign_fee('${CAMP}', ${used === null ? 'NULL' : used}, 'test') AS r`)).r
// simulează o cerere din browser (rolul authenticated)
const asBrowser = async (sql: string) => {
  await db.exec(`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', false)`)
  try { await db.exec(sql) } finally { await db.exec(`SELECT set_config('request.jwt.claims', '', false)`) }
}

beforeAll(async () => {
  db = await makeDb()
  await db.exec(`
    CREATE TABLE admins (user_id uuid, is_active boolean);
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE influencers (id uuid PRIMARY KEY, wallet_balance numeric DEFAULT 0, total_earned numeric DEFAULT 0);
    ALTER TABLE collaborations ADD COLUMN influencer_id uuid, ADD COLUMN payment_amount numeric,
      ADD COLUMN platform_fee numeric, ADD COLUMN reserved_amount numeric;
    ALTER TABLE campaigns ADD COLUMN budget_per_influencer numeric DEFAULT 0, ADD COLUMN campaign_type text,
      ADD COLUMN payment_mode text CONSTRAINT campaigns_payment_mode_check CHECK (payment_mode IN ('FIXED','NEGOTIABLE'));
  `)
  await applySql(db, '29_buget_influenceri_escrow.sql')
  await applySql(db, '31_pret_propus_influencer.sql')
})

beforeEach(async () => {
  await seed(db)
  await db.exec(`
    TRUNCATE influencers; INSERT INTO influencers (id) VALUES ('${INF}');
    UPDATE campaigns SET campaign_type='PAID', payment_mode='OFFER' WHERE id='${CAMP}';
  `)
  // publicare: 3 locuri × 200 taxă, fără buget fix → 600 lei
  const r = (await one(`SELECT charge_campaign_fee('${CAMP}', '${BRAND}', 3, 200, 0) AS r`)).r
  expect(r.ok).toBe(true)
  await db.exec(`UPDATE campaigns SET status='ACTIVE' WHERE id='${CAMP}'`)
})

describe('publicare', () => {
  it('se plătește doar taxa de management, iar payment_mode OFFER e acceptat', async () => {
    expect(await balance()).toBe(4400)
    expect((await one(`SELECT payment_mode FROM campaigns WHERE id='${CAMP}'`)).payment_mode).toBe('OFFER')
  })
})

describe('selecția unui influencer', () => {
  it('blochează prețul propus și activează colaborarea', async () => {
    const id = await apply(350)
    const r = await select(id)
    expect(r).toMatchObject({ ok: true })
    expect(Number(r.price)).toBe(350)
    expect(await balance()).toBe(4050)
    const c = await collab(id)
    expect(c.status).toBe('ACTIVE')
    expect(Number(c.pay_reserved)).toBe(350)
    expect(Number(c.reserved_amount)).toBe(350)
    const tx = await one(`SELECT type, amount FROM brand_transactions WHERE type='ESCROW_LOCK'`)
    expect(Number(tx.amount)).toBe(-350)
  })

  it('sold insuficient → nimic nu se schimbă', async () => {
    await db.exec(`UPDATE brands SET credits_balance = 100 WHERE id='${BRAND}'`)
    const id = await apply(350)
    const r = await select(id)
    expect(r).toMatchObject({ ok: false, error: 'insufficient_funds' })
    expect(Number(r.required)).toBe(350)
    expect((await collab(id)).status).toBe('PENDING')
    expect(await balance()).toBe(100)
  })

  it('locuri ocupate → nu se retrage nimic (blocat atomic)', async () => {
    for (let i = 0; i < 3; i++) expect((await select(await apply(100))).ok).toBe(true)
    const before = await balance()
    const r = await select(await apply(100))
    expect(r).toMatchObject({ ok: false, error: 'blocked' })
    expect(r.message).toContain('locuri')
    expect(await balance()).toBe(before)
  })

  it('alt brand nu poate selecta; fără preț nu se poate selecta; nu se selectează de două ori', async () => {
    const id = await apply(350)
    expect((await select(id, OTHER_BRAND)).error).toBe('not_found')
    expect((await select(await apply(null))).error).toBe('no_offer')
    expect((await select(id)).ok).toBe(true)
    expect((await select(id)).error).toBe('invalid_status')
    expect(await balance()).toBe(4050)
  })
})

describe('protecții', () => {
  it('nimeni nu poate deveni ACTIVE fără prețul blocat (invitație acceptată, acceptare automată)', async () => {
    const id = await apply(300)
    await expect(db.exec(`UPDATE collaborations SET status='ACTIVE' WHERE id='${id}'`)).rejects.toThrow(/Cereri/)
    await expect(db.exec(`INSERT INTO collaborations (campaign_id, influencer_id, status) VALUES ('${CAMP}', '${INF}', 'ACTIVE')`)).rejects.toThrow(/Cereri/)
  })

  it('din browser nu se pot modifica prețul sau banii blocați', async () => {
    const id = await apply(300)
    await asBrowser(`UPDATE collaborations SET offer_price = 1, pay_reserved = 99999 WHERE id='${id}'`)
    const c = await collab(id)
    expect(Number(c.offer_price)).toBe(300)
    expect(Number(c.pay_reserved)).toBe(0)
    // și nici activarea „cu bani falși” nu trece
    await expect(asBrowser(`UPDATE collaborations SET status='ACTIVE', pay_reserved = 500 WHERE id='${id}'`)).rejects.toThrow(/Cereri/)
  })

  it('campaniile cu sumă fixă nu sunt afectate', async () => {
    await db.exec(`UPDATE campaigns SET payment_mode='FIXED' WHERE id='${CAMP}'`)
    const id = await apply(null)
    await db.exec(`UPDATE collaborations SET status='ACTIVE' WHERE id='${id}'`)
    expect((await collab(id)).status).toBe('ACTIVE')
  })
})

describe('plata și returul', () => {
  it('postare aprobată → influencerul primește exact prețul lui, o singură dată', async () => {
    const id = await apply(350)
    await select(id)
    await db.exec(`UPDATE collaborations SET status='COMPLETED' WHERE id='${id}'`)
    const r = await release(id)
    expect(Number(r.amount)).toBe(350)
    expect(await wallet()).toBe(350)
    expect((await release(id)).already_paid).toBe(true)
    expect(await wallet()).toBe(350)
  })

  it('anulare → prețul se întoarce brandului; după retur nu mai poate fi plătit', async () => {
    const id = await apply(350)
    await select(id)
    const r = (await one(`SELECT refund_collab_pay('${id}', 'anulat') AS r`)).r
    expect(Number(r.refunded)).toBe(350)
    expect(await balance()).toBe(4400)
    expect(Number((await one(`SELECT refund_collab_pay('${id}', 'anulat') AS r`)).r.refunded)).toBe(0)
    await db.exec(`UPDATE collaborations SET status='COMPLETED' WHERE id='${id}'`)
    expect((await release(id)).error).toBe('insufficient_escrow')
    expect(await wallet()).toBe(0)
  })

  it('închiderea campaniei: plătit cine a postat, restul înapoi + taxa locurilor neocupate', async () => {
    const a = await apply(300)
    const b = await apply(500)
    await select(a); await select(b)                 // 800 blocați, 2 din 3 locuri
    await db.exec(`UPDATE collaborations SET status='COMPLETED' WHERE id='${a}'`)
    await release(a)                                  // a primește 300
    const before = await balance()
    const r = await settle()
    expect(Number(r.refunded)).toBe(200)              // 1 loc neocupat × 200
    expect(Number(r.pay_refunded)).toBe(500)          // b nu a postat
    expect(await balance()).toBe(before + 700)
    expect(await wallet()).toBe(300)
  })
})

describe('compatibilitate cu suma fixă (SQL 29) după SQL 31', () => {
  it('bugetul fix al campaniei se plătește și se returnează ca înainte', async () => {
    await seed(db)
    await db.exec(`UPDATE campaigns SET campaign_type='PAID', payment_mode='FIXED' WHERE id='${CAMP}'`)
    expect((await one(`SELECT charge_campaign_fee('${CAMP}', '${BRAND}', 2, 200, 300) AS r`)).r.ok).toBe(true)
    expect(await balance()).toBe(4000)
    await db.exec(`UPDATE campaigns SET status='ACTIVE' WHERE id='${CAMP}'`)
    const id = (await one(`INSERT INTO collaborations (campaign_id, influencer_id, status) VALUES ('${CAMP}', '${INF}', 'COMPLETED') RETURNING id`)).id
    expect(Number((await release(id)).amount)).toBe(300)
    const r = await settle(1)
    expect(Number(r.refunded)).toBe(200)
    expect(Number(r.pay_refunded)).toBe(300)
    expect(await balance()).toBe(4500)
  })
})

describe('modul de plată blocat după publicare', () => {
  it('din browser nu se poate trece din OFFER în FIXED după publicare', async () => {
    await asBrowser(`UPDATE campaigns SET payment_mode='FIXED', budget_per_influencer=0 WHERE id='${CAMP}'`)
    expect((await one(`SELECT payment_mode FROM campaigns WHERE id='${CAMP}'`)).payment_mode).toBe('OFFER')
  })
})
