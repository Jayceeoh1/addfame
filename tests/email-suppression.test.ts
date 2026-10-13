import { describe, it, expect, afterEach } from 'vitest'
import { normalizeEmail, isEmail, unsubscribeHeaders, coldOutreachEnabled, bulkDailyLimit } from '@/lib/email-suppression'

describe('reguli emailuri în masă', () => {
  const env = { ...process.env }
  afterEach(() => { process.env = { ...env } })
  it('normalizează adresa', () => {
    expect(normalizeEmail('  Ana@Gmail.COM ')).toBe('ana@gmail.com')
    expect(isEmail('ana@gmail.com')).toBe(true)
    expect(isEmail('ana@')).toBe(false)
  })
  it('antetele de dezabonare one-click', () => {
    const h = unsubscribeHeaders('Ana@x.ro')
    expect(h['List-Unsubscribe']).toContain('/api/unsubscribe?email=ana%40x.ro')
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
  it('outreach la persoane fără cont e oprit implicit', () => {
    delete process.env.OUTREACH_EMAIL_ENABLED
    expect(coldOutreachEnabled()).toBe(false)
    process.env.OUTREACH_EMAIL_ENABLED = 'true'
    expect(coldOutreachEnabled()).toBe(true)
  })
  it('limita zilnică implicită 300', () => {
    delete process.env.BULK_EMAIL_DAILY_LIMIT
    expect(bulkDailyLimit()).toBe(300)
  })
})
