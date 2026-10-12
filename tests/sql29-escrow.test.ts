import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, seed, applySql, BRAND, CAMP } from './helpers/db'

// Bugetul influencerilor blocat la publicare și plătit la aprobarea postării (SQL 29), pe Postgres real.
let db: Awaited<ReturnType<typeof makeDb>>
const one = async (sql: string) => (await db.query<any>(sql)).rows[0]
const INF = '44444444-4444-4444-4444-444444444444'
const charge = async (slots = 3, fee = 200, pay = 300) =>
  (await one(`SELECT charge_campaign_fee('${CAMP}', '${BRAND}', ${slots}, ${fee}, ${pay}) AS r`)).r
const balance = async () => Number((await one(`SELECT credits_balance FROM brands WHERE id='${BRAND}'`)).credits_balance)
const wallet = async () => Number((await one(`SELECT wallet_balance FROM influencers WHERE id='${INF}'`)).wallet_balance)
const camp = async () => one(`SELECT * FROM campaigns WHERE id='${CAMP}'`)
const addCollab = async (status = 'ACTIVE') =>
  (await one(`INSERT INTO collaborations (campaign_id, influencer_id, status) VALUES ('${CAMP}', '${INF}', '${status}') RETURNING id`)).id
const release = async (id: string) => (await one(`SELECT release_campaign_pay('${id}') AS r`)).r
const settle = async (used: number | null = null) =>
  (await one(`SELECT settle_campaign_fee('${CAMP}', ${used === null ? 'NULL' : used}, 'test') AS r`)).r

beforeAll(async () => {
  db = await makeDb()
  await db.exec(`
    CREATE TABLE admins (user_id uuid, is_active boolean);
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE influencers (id uuid PRIMARY KEY, wallet_balance numeric DEFAULT 0, total_earned numeric DEFAULT 0);
    ALTER TABLE collaborations ADD COLUMN influencer_id uuid, ADD COLUMN payment_amount numeric, ADD COLUMN platform_fee numeric;
    ALTER TABLE campaigns ADD COLUMN budget_per_influencer numeric DEFAULT 0, ADD COLUMN campaign_type text;
  `)
  await applySql(db, '29_buget_influenceri_escrow.sql')
})
beforeEach(async () => {
  await seed(db)
  await db.exec(`TRUNCATE influencers; INSERT INTO influencers (id) VALUES ('${INF}');`)
})

describe('publicare: taxă de management + buget influenceri', () => {
  it('exemplul din discuție: 3 locuri × (200 taxă + 300 influencer) = 1.500 RON', async () => {
    const r = await charge()
    expect(r.ok).toBe(true)
    expect(Number(r.total)).toBe(600)       // doar taxa = venit AddFame
    expect(Number(r.pay_total)).toBe(900)
    expect(Number(r.charged)).toBe(1500)
    expect(await balance()).toBe(3500)
    const c = await camp()
    expect(Number(c.pay_per_slot)).toBe(300)
    expect(Number(c.pay_reserved)).toBe(900)
    expect(Number(c.fee_paid)).toBe(600)
    const tx = (await db.query<any>(`SELECT type, amount FROM brand_transactions ORDER BY type`)).rows
    expect(tx.map(t => [t.type, Number(t.amount)])).toEqual([['CAMPAIGN_FEE', -600], ['ESCROW_LOCK', -900]])
  })

  it('sold insuficient pentru taxă + buget → nu se retrage nimic', async () => {
    await seed(db, { balance: 1000 })
    const r = await charge()
    expect(r).toMatchObject({ ok: false, error: 'insufficient_funds' })
    expect(Number(r.required)).toBe(1500)
    expect(await balance()).toBe(1000)
  })

  it('fără sumă (barter / de discutat) → doar taxa, ca înainte', async () => {
    const r = await (async () => (await one(`SELECT charge_campaign_fee('${CAMP}', '${BRAND}', 5, 350) AS r`)).r)()
    expect(r.ok).toBe(true)
    expect(await balance()).toBe(3250)
    expect(Number((await camp()).pay_reserved)).toBe(0)
  })

  it('respinge sume negative', async () => {
    expect((await charge(3, 200, -1)).error).toBe('invalid_pay')
  })
})

describe('plata influencerului la aprobare', () => {
  beforeEach(async () => { await charge(); await db.exec(`UPDATE campaigns SET status='ACTIVE' WHERE id='${CAMP}'`) })

  it('postare aprobată → influencerul primește suma întreagă, o singură dată', async () => {
    const id = await addCollab('ACTIVE')
    await db.exec(`UPDATE collaborations SET status='COMPLETED' WHERE id='${id}'`)
    const r = await release(id)
    expect(r).toMatchObject({ ok: true })
    expect(Number(r.amount)).toBe(300)
    expect(await wallet()).toBe(300)
    expect(Number((await camp()).pay_released)).toBe(300)
    // a doua apăsare nu plătește din nou
    const again = await release(id)
    expect(again.already_paid).toBe(true)
    expect(await wallet()).toBe(300)
  })

  it('colaborare neaprobată → nu plătește', async () => {
    const id = await addCollab('ACTIVE')
    expect((await release(id)).error).toBe('not_completed')
    expect(await wallet()).toBe(0)
  })

  it('nu se poate plăti mai mult decât bugetul blocat', async () => {
    const ids = [] as string[]
    for (let i = 0; i < 4; i++) ids.push(await addCollab('COMPLETED'))
    const results = [] as any[]
    for (const id of ids) results.push(await release(id))
    expect(results.filter(r => r.ok).length).toBe(3)
    expect(results[3].error).toBe('insufficient_escrow')
    expect(await wallet()).toBe(900)
  })
})

describe('închiderea campaniei', () => {
  beforeEach(async () => { await charge() })

  it('2 influenceri selectați, 1 a postat → se returnează taxa pentru 1 loc și bugetul pentru 2', async () => {
    await db.exec(`UPDATE campaigns SET fee_slots_used = 2 WHERE id='${CAMP}'`)
    const paid = await addCollab('COMPLETED')
    await release(paid)
    const before = await balance()
    const r = await settle()
    expect(Number(r.refunded)).toBe(200)       // 1 loc neocupat × 200
    expect(Number(r.pay_refunded)).toBe(600)   // 900 blocați − 300 plătiți
    expect(await balance()).toBe(before + 800)
    // după decontare nu mai rămân bani de plătit
    const late = await addCollab('COMPLETED')
    expect((await release(late)).error).toBe('insufficient_escrow')
    // decontarea se face o singură dată
    expect((await settle()).already_settled).toBe(true)
  })

  it('respinsă la aprobare → totul înapoi', async () => {
    const r = await settle(0)
    expect(Number(r.refunded)).toBe(600)
    expect(Number(r.pay_refunded)).toBe(900)
    expect(await balance()).toBe(5000)
  })
})
