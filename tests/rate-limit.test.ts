import { describe, it, expect, beforeAll } from 'vitest'
import { makeDb, applySql } from './helpers/db'

let db: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => { db = await makeDb(); await applySql(db, '21_rate_limit.sql') })

const hit = async (key: string, max = 3, win = 60, block: number | null = null) =>
  (await db.query<any>(`SELECT rate_limit_hit($1, $2, $3, $4) AS r`, [key, max, win, block])).rows[0].r

describe('rate_limit_hit', () => {
  it('permite până la limită, apoi blochează', async () => {
    for (let i = 1; i <= 3; i++) expect((await hit('a')).ok).toBe(true)
    const r = await hit('a')
    expect(r.ok).toBe(false)
    expect(r.retry_after).toBeGreaterThan(0)
  })
  it('rămâne blocat la cereri următoare', async () => expect((await hit('a')).ok).toBe(false))
  it('cheile sunt independente', async () => expect((await hit('b')).ok).toBe(true))
  it('raportează cererile rămase', async () => expect((await hit('c', 5)).remaining).toBe(4))
  it('fereastra expirată resetează contorul și blocarea', async () => {
    await db.exec(`UPDATE rate_limits SET window_start = now() - interval '2 minutes' WHERE key = 'a'`)
    expect((await hit('a')).ok).toBe(true)
  })
  it('doar service_role poate apela funcția', async () => {
    await db.exec('SET ROLE authenticated')
    await expect(hit('x')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })
  it('cereri simultane sunt numărate corect', async () => {
    await Promise.all(Array.from({ length: 6 }, () => hit('par', 4)))
    const row = (await db.query<any>(`SELECT count FROM rate_limits WHERE key='par'`)).rows[0]
    expect(row.count).toBe(6)
  })
})
