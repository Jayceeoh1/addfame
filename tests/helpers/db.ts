// Bază Postgres reală (în memorie) pentru testarea funcțiilor SQL de bani.
// Schema e minimă: doar coloanele folosite de funcțiile testate.
import { PGlite } from '@electric-sql/pglite'
import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../..')

export async function makeDb() {
  const db = new PGlite()
  await db.exec(`
    DO $$ BEGIN
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE brands (id uuid PRIMARY KEY, credits_balance numeric DEFAULT 0, credits_reserved numeric DEFAULT 0);
    CREATE TABLE platform_settings (key text PRIMARY KEY, value jsonb, label text, description text, updated_at timestamptz);
    CREATE TABLE campaigns (
      id uuid PRIMARY KEY, brand_id uuid, title text, status text DEFAULT 'DRAFT',
      max_influencers int, current_influencers int DEFAULT 0, budget numeric DEFAULT 0, escrow_amount numeric DEFAULT 0
    );
    CREATE TABLE collaborations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid, status text);
    CREATE TABLE brand_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), brand_id uuid, type text, amount numeric, description text, status text,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT brand_transactions_type_check CHECK (type IN ('TOPUP','SPEND','REFUND','RESERVE'))
    );
  `)
  // Schema veche (fără CAMPAIGN_FEE) + fișierele reale de migrare, în ordinea în care rulează în producție
  for (const f of ['supabase/security/06a_influencer_fee.sql', 'supabase/security/18_repara_tip_tranzactii.sql']) {
    await db.exec(fs.readFileSync(path.join(root, f), 'utf8').replace(/^BEGIN;|^COMMIT;/gm, ''))
  }
  return db
}

export const BRAND = '11111111-1111-1111-1111-111111111111'
export const OTHER_BRAND = '22222222-2222-2222-2222-222222222222'
export const CAMP = '33333333-3333-3333-3333-333333333333'

export async function seed(db: PGlite, { balance = 5000, status = 'DRAFT' } = {}) {
  await db.exec(`
    TRUNCATE brands, campaigns, collaborations, brand_transactions;
    INSERT INTO brands (id, credits_balance) VALUES ('${BRAND}', ${balance}), ('${OTHER_BRAND}', 1000);
    INSERT INTO campaigns (id, brand_id, title, status) VALUES ('${CAMP}', '${BRAND}', 'Alopecia', '${status}');
  `)
}

/** Aplică un fișier SQL din supabase/security peste baza de test. */
export async function applySql(db: PGlite, file: string) {
  await db.exec(fs.readFileSync(path.join(root, 'supabase/security', file), 'utf8'))
}
