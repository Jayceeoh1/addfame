import { describe, it, expect } from 'vitest'
import { rightsFor, addMonths, redactContract } from '@/lib/rights'

describe('drepturile clipurilor', () => {
  it('adaugă luni corect, inclusiv la sfârșit de lună', () => {
    expect(addMonths(new Date('2026-08-31T10:00:00Z'), 6).toISOString().slice(0, 10)).toBe('2027-02-28')
    expect(addMonths(new Date('2026-10-14T10:00:00Z'), 6).toISOString().slice(0, 10)).toBe('2027-04-14')
  })
  it('v2: ads 6 luni, apoi organic fără limită', () => {
    const c = { signed_at: '2026-10-14T10:00:00Z', clauses_version: 2 }
    const during = rightsFor(c, new Date('2027-01-01T00:00:00Z'))
    expect(during.state).toBe('ads')
    expect(during.organicUntil).toBeNull()
    expect(during.daysLeftAds).toBeGreaterThan(100)
    expect(rightsFor(c, new Date('2027-05-01T00:00:00Z')).state).toBe('organic')
  })
  it('v1: totul expiră după 6 luni', () => {
    const c = { signed_at: '2026-01-10T10:00:00Z', clauses_version: 1 }
    expect(rightsFor(c, new Date('2026-03-01T00:00:00Z')).state).toBe('ads')
    expect(rightsFor(c, new Date('2026-08-01T00:00:00Z')).state).toBe('expired')
  })
  it('ascunde datele personale', () => {
    const r = redactContract({ influencer_name: 'Ana', influencer_cnp: '2900101123456', influencer_phone: '0722', influencer_address: 'Str', signer_ip: '1.1.1.1' })
    expect(r).toMatchObject({ influencer_name: 'Ana', influencer_cnp: null, influencer_phone: null, influencer_address: null, signer_ip: null })
  })
})
