import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { makeDb, applySql } from './helpers/db'
import { canOpenDispute, USER_REASONS, REASONS } from '@/lib/disputes'

let db: Awaited<ReturnType<typeof makeDb>>
const C = '44444444-4444-4444-4444-444444444444'
beforeAll(async () => { db = await makeDb(); await applySql(db, '22_revizuiri_draft.sql').catch(() => {}); await applySql(db, '23_litigii.sql') })
beforeEach(async () => { await db.exec(`TRUNCATE disputes; DELETE FROM collaborations; INSERT INTO collaborations (id, status) VALUES ('${C}','ACTIVE')`) })

const open = (reason = 'no_post', desc = 'Postarea nu a apărut deloc', status = 'awaiting_response') =>
  db.query(`INSERT INTO disputes (collaboration_id, opened_by_role, reason, description, status) VALUES ('${C}','brand','${reason}','${desc}','${status}')`)

describe('SQL litigii', () => {
  it('un singur litigiu activ pe colaborare', async () => {
    await open()
    await expect(open()).rejects.toThrow(/duplicate key/)
  })
  it('după rezolvare se poate deschide altul', async () => {
    await open('no_post', 'Postarea nu a apărut deloc', 'resolved')
    await open()
  })
  it('descrierea trebuie să aibă minimum 10 caractere', async () => { await expect(open('no_post', 'scurt')).rejects.toThrow(/check/) })
  it('motiv invalid e respins', async () => { await expect(open('altceva')).rejects.toThrow(/check/) })
  it('clienții nu au acces la tabel', async () => {
    await db.exec('SET ROLE authenticated')
    await expect(db.query('SELECT * FROM disputes')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE')
  })
})

describe('reguli litigii', () => {
  it('se deschide doar pentru colaborări active sau finalizate', () => {
    expect(canOpenDispute('ACTIVE')).toBe(true); expect(canOpenDispute('completed')).toBe(true)
    expect(canOpenDispute('PENDING')).toBe(false); expect(canOpenDispute('REJECTED')).toBe(false)
  })
  it('utilizatorii nu pot alege motivele automate', () => {
    expect(USER_REASONS).not.toContain('revision_overdue'); expect(USER_REASONS.every(r => r in REASONS)).toBe(true)
  })
})
