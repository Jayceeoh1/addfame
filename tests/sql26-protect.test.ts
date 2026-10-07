// SQL 26, pasul 1: triggerul de protecție are aceeași logică, doar ordinea verificărilor e alta.
import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'

const full = fs.readFileSync(path.resolve(__dirname, '../supabase/security/26_curata_acte_identitate.sql'), 'utf8')
const PAS1 = full.slice(full.indexOf('CREATE OR REPLACE FUNCTION public.protect_sensitive_columns'), full.indexOf('-- ═══ PASUL 2'))
const PAS2 = full.slice(full.indexOf('UPDATE public.influencers'), full.indexOf('-- ═══ PASUL 3'))

let db: PGlite
const ME = '11111111-1111-1111-1111-111111111111'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
    CREATE TABLE admins (user_id uuid, is_active boolean);
    CREATE TABLE influencers (id serial PRIMARY KEY, user_id uuid, bio text, total_earned numeric DEFAULT 0, approval_status text DEFAULT 'approved',
                              verification_doc_url text, verification_selfie_url text);
    INSERT INTO influencers (user_id, bio, verification_doc_url, verification_selfie_url)
      SELECT '${ME}', 'bio', 'data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB' FROM generate_series(1, 30);
  `)
  await db.exec(PAS1)
  await db.exec(`CREATE TRIGGER trg_protect_influencers BEFORE UPDATE ON influencers FOR EACH ROW
                 EXECUTE FUNCTION public.protect_sensitive_columns('total_earned', 'approval_status')`)
})

const asUser = async (sql: string) => {
  await db.exec(`SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', false), set_config('request.jwt.claim.sub', '${ME}', false)`)
  await db.exec(sql)
  await db.exec(`SELECT set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false)`)
}

describe('SQL 26 · triggerul de protecție', () => {
  it('utilizatorul nu-și poate mări câștigurile, dar își poate edita bio și dezactiva contul', async () => {
    await asUser(`UPDATE influencers SET total_earned = 9999, bio = 'nou' WHERE id = 1`)
    await asUser(`UPDATE influencers SET approval_status = 'deactivated' WHERE id = 2`)
    await asUser(`UPDATE influencers SET approval_status = 'approved' WHERE id = 3`)
    const r = (await db.query<any>('SELECT id, total_earned, bio, approval_status FROM influencers WHERE id <= 3 ORDER BY id')).rows
    expect(Number(r[0].total_earned)).toBe(0); expect(r[0].bio).toBe('nou')
    expect(r[1].approval_status).toBe('deactivated')
  })
  it('adminul și serverul pot modifica orice', async () => {
    await db.exec(`UPDATE influencers SET total_earned = 50 WHERE id = 4`)
    await db.exec(`INSERT INTO admins VALUES ('${ME}', true)`)
    await asUser(`UPDATE influencers SET total_earned = 70 WHERE id = 5`)
    await db.exec(`DELETE FROM admins`)
    const r = (await db.query<any>('SELECT id, total_earned FROM influencers WHERE id IN (4,5) ORDER BY id')).rows
    expect(r.map(x => Number(x.total_earned))).toEqual([50, 70])
  })
  it('pasul 2 șterge actele câte 25, până la 0', async () => {
    const counts: number[] = []
    for (let i = 0; i < 3; i++) { const res = await db.exec(PAS2); counts.push(res[0].affectedRows ?? 0) }
    expect(counts).toEqual([25, 5, 0])
    expect((await db.query<any>('SELECT count(*)::int AS n FROM influencers WHERE verification_doc_url IS NOT NULL')).rows[0].n).toBe(0)
  })
})
