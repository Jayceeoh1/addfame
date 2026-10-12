import { describe, it, expect, beforeAll } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { applySql } from './helpers/db'
import { contactReasons } from '../lib/contact-guard'

// Aceleași reguli în browser (avertisment) și în baza de date (semnalare pentru admin).
const SAMPLES: [string, string[]][] = [
  ['Bună! Ne vedem sâmbătă la 12:00 la locație.', []],
  ['Suma e 300 lei, postarea până pe 20 octombrie', []],
  ['Sună-mă la 0721 234 567', ['telefon', 'privat']],
  ['numărul meu: +40 (721) 234-567', ['telefon']],
  ['0040.721.234.567', ['telefon']],
  ['scrie-mi pe ana.pop@gmail.com', ['email']],
  ['trimite pe Gmail te rog', ['email']],
  ['Hai pe WhatsApp, e mai simplu', ['aplicatie']],
  ['Ai telegram?', ['aplicatie']],
  ['vorbim în privat', ['privat']],
  ['Dă-mi numărul tău', ['privat']],
  ['îți dau numărul tău de telefon', ['privat']],
  ['scrie-mi pe insta', ['privat']],
  ['Îți plătesc direct, fără platformă', ['plata']],
  ['banii cash la eveniment', ['plata']],
  ['Postează pe Instagram un reel și 3 stories', []],
  ['Am semnalat problema', []],
  ['Pe privat', ['privat']],
  ['DĂ-MI NUMĂRUL', ['privat']],
  ['', []],
]

let db: PGlite
const sqlReasons = async (t: string) =>
  (await db.query<any>('SELECT af_contact_reasons($1) AS r', [t])).rows[0].r as string[]

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    DO $$ BEGIN CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), collaboration_id uuid, sender_id uuid,
      sender_role text, content text, created_at timestamptz DEFAULT now());
  `)
  await applySql(db as any, '30_chat_contact_interzis.sql')
})

describe('detectarea contactelor în afara platformei', () => {
  it.each(SAMPLES)('browser: %s', (text, expected) => {
    expect(contactReasons(text)).toEqual(expected)
  })
  it.each(SAMPLES)('baza de date: %s', async (text, expected) => {
    expect(await sqlReasons(text)).toEqual(expected)
  })
})

describe('semnalarea mesajelor', () => {
  it('mesajul cu telefon se trimite, dar apare la admin', async () => {
    await db.exec(`INSERT INTO messages (sender_role, content) VALUES ('brand', 'sună-mă 0721234567')`)
    expect((await db.query<any>('SELECT count(*)::int AS n FROM messages')).rows[0].n).toBe(1)
    const f = (await db.query<any>('SELECT sender_role, reasons, reviewed FROM message_flags')).rows
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ sender_role: 'brand', reviewed: false })
    expect(f[0].reasons).toEqual(['telefon', 'privat'])
  })
  it('mesajele normale și cele de sistem nu se semnalează', async () => {
    await db.exec(`DELETE FROM message_flags;
      INSERT INTO messages (sender_role, content) VALUES ('influencer', 'Mulțumesc, ajung la 12'), ('system', 'whatsapp 0721234567')`)
    expect((await db.query<any>('SELECT count(*)::int AS n FROM message_flags')).rows[0].n).toBe(0)
  })
})
