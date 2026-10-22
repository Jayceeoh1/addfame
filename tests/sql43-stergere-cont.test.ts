import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { applySql } from './helpers/db'

let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await applySql(db, '43_stergere_cont.sql')
  await applySql(db, '43_stergere_cont.sql')
})

describe('SQL 43 cereri de ștergere cont', () => {
  it('creează doar tabelul nou, cu RLS și fără acces pentru anon', async () => {
    const table = (await db.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'account_deletion_requests'`,
    )).rows[0]
    expect(table.relrowsecurity).toBe(true)

    const anon = (await db.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE table_name = 'account_deletion_requests' AND grantee = 'anon'`,
    )).rows
    expect(anon).toEqual([])

    await db.exec(`INSERT INTO account_deletion_requests (confirmation_code, status, source, role)
      VALUES ('cod-test', 'blocked', 'web', 'influencer')`)
    await expect(db.exec(
      `INSERT INTO account_deletion_requests (confirmation_code, status) VALUES ('cod-rau', 'deleted')`,
    )).rejects.toThrow()
  })
})
