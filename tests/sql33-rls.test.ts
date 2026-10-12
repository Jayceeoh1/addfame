import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { applySql } from './helpers/db'

it('SQL 33 împachetează auth.uid() în SELECT fără să schimbe accesul', async () => {
  const db = new PGlite()
  await db.exec(`
    DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE notes (id int, user_id uuid);
    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_select ON notes FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY own_insert ON notes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    CREATE POLICY already ON notes FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
    GRANT SELECT, INSERT ON notes TO authenticated;
    INSERT INTO notes VALUES (1, '11111111-1111-1111-1111-111111111111'), (2, '22222222-2222-2222-2222-222222222222');
  `)
  await applySql(db as any, '33_rls_performanta.sql')
  await applySql(db as any, '33_rls_performanta.sql') // a doua oară, fără erori
  const pol = (await db.query<any>(`SELECT policyname, qual, with_check FROM pg_policies WHERE tablename='notes' ORDER BY 1`)).rows
  for (const p of pol) {
    for (const e of [p.qual, p.with_check].filter(Boolean)) expect(e).toMatch(/SELECT auth\.uid\(\)/)
  }
  // accesul rămâne același: utilizatorul 1 vede doar rândul lui
  await db.exec(`SET test.uid = '11111111-1111-1111-1111-111111111111'; SET ROLE authenticated;`)
  const rows = (await db.query<any>('SELECT id FROM notes')).rows
  await db.exec('RESET ROLE')
  expect(rows.map(r => r.id)).toEqual([1])
})
