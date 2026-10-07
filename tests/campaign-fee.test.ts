import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, seed, BRAND, OTHER_BRAND, CAMP } from './helpers/db'

let db: Awaited<ReturnType<typeof makeDb>>
const one = async (sql: string) => (await db.query<any>(sql)).rows[0]
const charge = async (brand = BRAND, slots = 5, fee = 350) =>
  (await one(`SELECT charge_campaign_fee('${CAMP}', '${brand}', ${slots}, ${fee}) AS r`)).r
const settle = async (used: number | null, reason = 'test') =>
  (await one(`SELECT settle_campaign_fee('${CAMP}', ${used === null ? 'NULL' : used}, '${reason}') AS r`)).r
const balance = async () => Number((await one(`SELECT credits_balance FROM brands WHERE id='${BRAND}'`)).credits_balance)
const addCollab = (status: string) => db.exec(`INSERT INTO collaborations (campaign_id, status) VALUES ('${CAMP}', '${status}')`)

beforeAll(async () => { db = await makeDb() })
beforeEach(async () => { await seed(db) })

describe('charge_campaign_fee (publicare)', () => {
  it('retrage taxa, trimite campania spre aprobare și înregistrează tranzacția', async () => {
    const r = await charge()
    expect(r.ok).toBe(true)
    expect(Number(r.total)).toBe(1750)
    expect(await balance()).toBe(3250)
    const c = await one(`SELECT status, fee_paid, fee_slots, max_influencers FROM campaigns WHERE id='${CAMP}'`)
    expect(c.status).toBe('PENDING_REVIEW')
    expect(Number(c.fee_paid)).toBe(1750)
    expect(c.fee_slots).toBe(5)
    const tx = await one(`SELECT type, amount, status FROM brand_transactions WHERE brand_id='${BRAND}'`)
    expect(tx).toMatchObject({ type: 'CAMPAIGN_FEE', status: 'completed' })
    expect(Number(tx.amount)).toBe(-1750)
  })

  it('refuză dacă soldul disponibil nu ajunge și nu retrage nimic', async () => {
    await seed(db, { balance: 1000 })
    const r = await charge()
    expect(r).toMatchObject({ ok: false, error: 'insufficient_funds' })
    expect(await balance()).toBe(1000)
    expect((await one(`SELECT count(*)::int AS n FROM brand_transactions`)).n).toBe(0)
    expect((await one(`SELECT status FROM campaigns WHERE id='${CAMP}'`)).status).toBe('DRAFT')
  })

  it('creditele rezervate nu pot fi cheltuite', async () => {
    await db.exec(`UPDATE brands SET credits_reserved = 4000 WHERE id='${BRAND}'`)
    expect((await charge()).error).toBe('insufficient_funds')
  })

  it('nu se poate plăti de două ori aceeași campanie', async () => {
    expect((await charge()).ok).toBe(true)
    expect(await charge()).toMatchObject({ ok: false, error: 'invalid_status' })
    expect(await balance()).toBe(3250)
  })

  it('un alt brand nu poate publica campania', async () => {
    expect(await charge(OTHER_BRAND)).toMatchObject({ ok: false, error: 'not_found' })
  })

  it('respinge numărul de locuri și taxa invalide', async () => {
    expect((await charge(BRAND, 0)).error).toBe('invalid_slots')
    expect((await charge(BRAND, 1001)).error).toBe('invalid_slots')
    expect((await charge(BRAND, 5, -1)).error).toBe('invalid_fee')
  })

  it('o campanie respinsă se poate republica', async () => {
    await db.exec(`UPDATE campaigns SET status='REJECTED' WHERE id='${CAMP}'`)
    expect((await charge()).ok).toBe(true)
  })
})

describe('settle_campaign_fee (decontare)', () => {
  beforeEach(async () => { await charge() })

  it('returnează taxa locurilor nefolosite', async () => {
    const r = await settle(2)
    expect(Number(r.refunded)).toBe(1050) // 3 locuri × 350
    expect(await balance()).toBe(3250 + 1050)
  })

  it('respingere fără selecții → retur integral', async () => {
    const r = await settle(0)
    expect(Number(r.refunded)).toBe(1750)
    expect(await balance()).toBe(5000)
  })

  it('se face o singură dată', async () => {
    await settle(0)
    const again = await settle(0)
    expect(again).toMatchObject({ refunded: 0, already_settled: true })
    expect(await balance()).toBe(5000)
  })

  it('nu returnează niciodată locurile deja selectate, chiar dacă i se cere', async () => {
    await db.exec(`UPDATE campaigns SET status='ACTIVE' WHERE id='${CAMP}'`)
    await addCollab('ACTIVE'); await addCollab('ACTIVE')
    const r = await settle(0)
    expect(Number(r.refunded)).toBe(1050) // 2 locuri folosite rămân plătite
  })

  it('înregistrează returul ca tranzacție REFUND', async () => {
    await settle(0, 'Campanie respinsă')
    const tx = await one(`SELECT type, amount, description FROM brand_transactions WHERE type='REFUND'`)
    expect(Number(tx.amount)).toBe(1750)
    expect(tx.description).toBe('Campanie respinsă')
  })
})

describe('enforce_fee_slots (limita de locuri plătite)', () => {
  beforeEach(async () => {
    await charge(BRAND, 2)
    await db.exec(`UPDATE campaigns SET status='ACTIVE' WHERE id='${CAMP}'`)
  })

  it('permite activarea până la numărul de locuri plătite', async () => {
    await addCollab('ACTIVE'); await addCollab('ACTIVE')
    expect((await one(`SELECT fee_slots_used FROM campaigns WHERE id='${CAMP}'`)).fee_slots_used).toBe(2)
  })

  it('blochează al treilea influencer', async () => {
    await addCollab('ACTIVE'); await addCollab('ACTIVE')
    await expect(addCollab('ACTIVE')).rejects.toThrow(/nu mai are locuri/)
  })

  it('aplicările în așteptare nu ocupă locuri', async () => {
    await addCollab('PENDING'); await addCollab('PENDING'); await addCollab('PENDING')
    await addCollab('ACTIVE')
  })

  it('nu activează influenceri într-o campanie neaprobată', async () => {
    await db.exec(`UPDATE campaigns SET status='PENDING_REVIEW' WHERE id='${CAMP}'`)
    await expect(addCollab('ACTIVE')).rejects.toThrow(/nu este activă/)
  })

  it('doar service_role poate apela funcțiile de bani', async () => {
    await db.exec(`SET ROLE authenticated`)
    await expect(db.query(`SELECT charge_campaign_fee('${CAMP}','${BRAND}',1,1)`)).rejects.toThrow(/permission denied/)
    await db.exec(`RESET ROLE`)
  })
})
