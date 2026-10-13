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

import { bulkEmailPaused } from '@/lib/email-suppression'
import { sendEmailBatch } from '@/lib/campaign-alerts'
import { vi } from 'vitest'

describe('pauza emailurilor în masă', () => {
  const env = { ...process.env }
  afterEach(() => { process.env = { ...env }; vi.unstubAllGlobals() })
  it('e pornită implicit; se oprește doar cu BULK_EMAIL_PAUSED=false', () => {
    delete process.env.BULK_EMAIL_PAUSED
    expect(bulkEmailPaused()).toBe(true)
    process.env.BULK_EMAIL_PAUSED = 'false'
    expect(bulkEmailPaused()).toBe(false)
  })
  it('alertele de campanie nu pleacă pe email cât e pauză', async () => {
    delete process.env.BULK_EMAIL_PAUSED
    process.env.RESEND_API_KEY = 're_test'
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    expect(await sendEmailBatch([{ to: 'a@b.ro', subject: 's', html: 'h' }])).toBe(0)
    expect(f).not.toHaveBeenCalled()
  })
})
