import { describe, it, expect } from 'vitest'
import { validateEventForm, normalizePhone, normalizeInstagram, toBrandEventApplication, guestListCsv, eventSlotLimit, eventOpen } from '@/lib/event-signup'

const good = { full_name: 'Maria Popescu', phone: '0722 123 456', city: 'București', address: 'Str. Lalelelor 5, Sector 2', instagram: '@Maria.Pop', message: 'Abia aștept!' }

describe('formularul „Vreau să vin”', () => {
  it('acceptă date corecte și le curăță', () => {
    const r = validateEventForm(good)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ phone: '0722123456', instagram: 'maria.pop', full_name: 'Maria Popescu' })
  })
  it('cere nume complet, telefon valid, oraș și adresă', () => {
    const r = validateEventForm({ full_name: 'Maria', phone: '123', city: '', address: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors!).sort()).toEqual(['address', 'city', 'full_name', 'phone'])
  })
  it('mesajul către brand nu poate conține date de contact', () => {
    const r = validateEventForm({ ...good, message: 'scrie-mi pe whatsapp 0722123456' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors!.message).toMatch(/nu poate conține/)
  })
  it('telefon și Instagram în formate diverse', () => {
    expect(normalizePhone('+40 (722) 123-456')).toBe('+40722123456')
    expect(normalizePhone('abc')).toBeNull()
    expect(normalizeInstagram('https://www.instagram.com/Ana_B/?hl=ro')).toBe('ana_b')
    expect(normalizeInstagram('')).toBe('')
    expect(normalizeInstagram('nume cu spatii')).toBeNull()
  })
})

describe('ce vede brandul', () => {
  it('fără telefon, adresă, Instagram; codul doar la aprobați', () => {
    const b = toBrandEventApplication({ id: '1', influencer_id: 'i', full_name: 'Ana B', phone: '0722', address: 'x', instagram: 'ana', city: 'Cluj', status: 'pending', entry_code: 'EV-AAAAAA', message: 'vin sigur' })
    expect(b).not.toHaveProperty('phone')
    expect(b).not.toHaveProperty('address')
    expect(b).not.toHaveProperty('instagram')
    expect(b.entry_code).toBeNull()
    expect(toBrandEventApplication({ full_name: 'x', status: 'approved', entry_code: 'EV-B' }).entry_code).toBe('EV-B')
  })
  it('lista de invitați: doar aprobații, alfabetic', () => {
    const csv = guestListCsv([
      { full_name: 'Zoe Z', city: 'Iași', entry_code: 'EV-2', status: 'approved' },
      { full_name: 'Ana A', city: 'Cluj', entry_code: 'EV-1', status: 'approved' },
      { full_name: 'Bob B', status: 'pending' },
    ])
    expect(csv.split('\n')).toEqual(['Nume,Oraș,Cod intrare', '"Ana A","Cluj","EV-1"', '"Zoe Z","Iași","EV-2"'])
  })
})

describe('locuri și termen', () => {
  it('locurile vin din taxa plătită, altfel din max_influencers', () => {
    expect(eventSlotLimit({ fee_slots: 10, max_influencers: 50 })).toBe(10)
    expect(eventSlotLimit({ fee_slots: 0, max_influencers: 20 })).toBe(20)
    expect(eventSlotLimit({})).toBeNull()
  })
  it('se poate aplica până la sfârșitul zilei termenului', () => {
    const c = { status: 'ACTIVE', application_deadline: '2026-10-20T00:00:00' }
    expect(eventOpen(c, new Date('2026-10-20T22:00:00'))).toBe(true)
    expect(eventOpen(c, new Date('2026-10-21T08:00:00'))).toBe(false)
    expect(eventOpen({ status: 'COMPLETED' })).toBe(false)
  })
})
