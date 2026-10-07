import { describe, it, expect, beforeAll } from 'vitest'
import { makeDb, applySql } from './helpers/db'

let db: Awaited<ReturnType<typeof makeDb>>
beforeAll(async () => { db = await makeDb(); await applySql(db, '20_erori_aplicatie.sql') })

const log = (fp: string, msg = 'boom') =>
  db.query(`SELECT log_app_error($1, 'server', $2, 'stack', '/x', NULL, '{"a":1}'::jsonb)`, [fp, msg])
const row = async (fp: string) => (await db.query<any>(`SELECT * FROM app_errors WHERE fingerprint=$1`, [fp])).rows[0]

describe('log_app_error', () => {
  it('prima apariție creează un rând', async () => {
    await log('fp1')
    expect(await row('fp1')).toMatchObject({ count: 1, resolved: false, message: 'boom' })
  })
  it('repetarea crește contorul, nu duplică rândul', async () => {
    await log('fp1'); await log('fp1')
    expect((await row('fp1')).count).toBe(3)
    expect((await db.query<any>(`SELECT count(*)::int n FROM app_errors WHERE fingerprint='fp1'`)).rows[0].n).toBe(1)
  })
  it('o eroare rezolvată care reapare se redeschide', async () => {
    await db.exec(`UPDATE app_errors SET resolved=true, resolved_at=now() WHERE fingerprint='fp1'`)
    await log('fp1')
    expect(await row('fp1')).toMatchObject({ resolved: false, resolved_at: null })
  })
  it('taie mesajele foarte lungi', async () => {
    await log('fp2', 'x'.repeat(5000))
    expect((await row('fp2')).message.length).toBe(1000)
  })
  it('utilizatorii obișnuiți nu pot apela funcția', async () => {
    await db.exec('SET ROLE authenticated')
    await expect(log('fp3')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })
})
