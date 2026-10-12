import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, seed, applySql, BRAND } from './helpers/db'

// Confirmarea atomică a încărcărilor (SQL 34), pe Postgres real.
let db: Awaited<ReturnType<typeof makeDb>>
const one = async (sql: string) => (await db.query<any>(sql)).rows[0]
const balance = async () => Number((await one(`SELECT credits_balance FROM brands WHERE id='${BRAND}'`)).credits_balance)
const topup = async (amount = 500, status = 'pending', type = 'TOPUP') =>
  (await one(`INSERT INTO brand_transactions (brand_id, type, amount, status) VALUES ('${BRAND}', '${type}', ${amount}, '${status}') RETURNING id`)).id as string
const confirm = async (id: string) => (await one(`SELECT confirm_topup('${id}') AS r`)).r

beforeAll(async () => {
  db = await makeDb()
  await db.exec(`ALTER TABLE brands ADD COLUMN credits_expires_at timestamptz, ADD COLUMN credits_loaded_at timestamptz;
                 ALTER TABLE brand_transactions ADD COLUMN invoice_number text;`)
  await applySql(db, '34_confirmare_topup_atomica.sql')
})
beforeEach(async () => { await seed(db) })

describe('confirm_topup', () => {
  it('adaugă suma o singură dată și setează valabilitatea', async () => {
    const id = await topup(500)
    const r = await confirm(id)
    expect(r.ok).toBe(true)
    expect(Number(r.new_balance)).toBe(5500)
    expect(await balance()).toBe(5500)
    const b = await one(`SELECT credits_expires_at > now() + interval '170 days' AS ok FROM brands WHERE id='${BRAND}'`)
    expect(b.ok).toBe(true)
    expect((await one(`SELECT status FROM brand_transactions WHERE id='${id}'`)).status).toBe('completed')
    // a doua confirmare nu mai adaugă nimic
    expect((await confirm(id)).error).toBe('already_completed')
    expect(await balance()).toBe(5500)
  })

  it('plată respinsă sau alt tip de tranzacție → nimic', async () => {
    expect((await confirm(await topup(500, 'failed'))).error).toBe('rejected')
    expect((await confirm(await topup(-200, 'pending', 'SPEND'))).error).toBe('not_found')
    expect(await balance()).toBe(5000)
  })

  it('nu pierde o cheltuială făcută în paralel (adunare în baza de date, nu în aplicație)', async () => {
    const id = await topup(300)
    await db.exec(`UPDATE brands SET credits_balance = credits_balance - 1000 WHERE id='${BRAND}'`)
    await confirm(id)
    expect(await balance()).toBe(4300)
  })
})
