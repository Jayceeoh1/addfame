import { it, expect } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { applySql } from './helpers/db'

it('SQL 32 rulează și creează indexurile pe coloanele existente', async () => {
  const db = new PGlite()
  await db.exec(`
    CREATE TABLE influencers (id uuid, user_id uuid, approval_status text, created_at timestamptz);
    CREATE TABLE brands (id uuid, user_id uuid);
    CREATE TABLE collaborations (id uuid, influencer_id uuid, campaign_id uuid, status text, created_at timestamptz);
    CREATE TABLE campaigns (id uuid, brand_id uuid, status text, created_at timestamptz);
    CREATE TABLE messages (id uuid, collaboration_id uuid, created_at timestamptz);
    CREATE TABLE notifications (id uuid, user_id uuid, created_at timestamptz);
    CREATE PUBLICATION supabase_realtime FOR TABLE influencers, notifications;
  `)
  await applySql(db as any, '32_performanta_realtime_indexuri.sql')
  await applySql(db as any, '32_performanta_realtime_indexuri.sql') // a doua oară, fără erori
  const pub = (await db.query<any>(`SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY 1`)).rows.map(r => r.tablename)
  expect(pub).toEqual(['collaborations', 'messages', 'notifications'])
  const idx = (await db.query<any>(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`)).rows.map(r => r.indexname)
  expect(idx).toContain('influencers_user_id_idx')
  expect(idx).toContain('messages_collab_idx')
  expect(idx).not.toContain('transactions_user_idx') // tabelul nu există → sărit
})
