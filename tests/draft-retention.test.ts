import { describe, it, expect } from 'vitest'
import { planRetention, retentionStart } from '@/lib/draft-retention'
import { inTwoDayWindow, inLastDayWindow, expiryLabel, registrationExpiry } from '@/lib/registration-reminders'

const NOW = new Date('2026-10-20T10:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 864e5).toISOString()
const draft = (id: string, collab: string, o: any = {}) => ({ id, collaboration_id: collab, status: 'approved', file_path: `p/${id}.mp4`, created_at: daysAgo(20), ...o })

describe('ștergerea materialelor video', () => {
  it('avertizează la 7 zile, șterge la 10, nimic înainte', () => {
    const collabs = [
      { id: 'c5', status: 'COMPLETED', completed_at: daysAgo(5) },
      { id: 'c8', status: 'COMPLETED', completed_at: daysAgo(8) },
      { id: 'c11', status: 'COMPLETED', completed_at: daysAgo(11) },
    ]
    const drafts = [draft('a', 'c5'), draft('b', 'c8'), draft('c', 'c11'), draft('d', 'c11', { status: 'changes_requested' })]
    const p = planRetention(collabs, drafts, new Set(), NOW)
    expect(p.warn.map(w => w.collabId)).toEqual(['c8'])
    expect(p.warn[0].deleteOn.toISOString()).toBe(new Date(Date.parse(daysAgo(8)) + 10 * 864e5).toISOString())
    expect(p.remove.map(d => d.id).sort()).toEqual(['c', 'd'])
  })
  it('avertismentul pleacă o singură dată', () => {
    const p = planRetention([{ id: 'c8', status: 'COMPLETED', completed_at: daysAgo(8) }], [draft('b', 'c8', { cleanup_warned_at: daysAgo(1) })], new Set(), NOW)
    expect(p.warn).toEqual([])
  })
  it('colaborările active și cele cu litigiu deschis nu se ating', () => {
    const p = planRetention(
      [{ id: 'act', status: 'ACTIVE' }, { id: 'disp', status: 'COMPLETED', completed_at: daysAgo(30) }],
      [draft('x', 'act'), draft('y', 'disp')], new Set(['disp']), NOW)
    expect(p.remove).toEqual([]); expect(p.warn).toEqual([])
  })
  it('anulate/respinse: de la ultima activitate pe draft', () => {
    const c = { id: 'r', status: 'REJECTED' }
    expect(retentionStart(c, [draft('z', 'r', { created_at: daysAgo(15), reviewed_at: daysAgo(12) })])?.toISOString()).toBe(daysAgo(12))
    expect(planRetention([c], [draft('z', 'r', { created_at: daysAgo(15), reviewed_at: daysAgo(12) })], new Set(), NOW).remove).toHaveLength(1)
  })
  it('finalizată fără dată de finalizare: folosește aprobarea postului', () => {
    expect(retentionStart({ id: 'x', status: 'COMPLETED', deliverable_approved_at: daysAgo(3) }, [])?.toISOString()).toBe(daysAgo(3))
  })
  it('încărcările abandonate (peste o zi) se curăță, cele recente nu', () => {
    const p = planRetention([], [draft('u1', 'c', { status: 'uploading', created_at: daysAgo(2) }), draft('u2', 'c', { status: 'uploading', created_at: daysAgo(0.1) })], new Set(), NOW)
    expect(p.stale.map(d => d.id)).toEqual(['u1'])
  })
})

describe('mementouri de înscriere', () => {
  const camp = (hoursLeft: number) => ({ id: 'c', registration_deadline_days: 2, registration_opened_at: new Date(NOW.getTime() + hoursLeft * 36e5 - 2 * 864e5).toISOString() })
  it('ferestre de 24h, fără suprapuneri (o rulare zilnică nu ratează nimic)', () => {
    expect(inTwoDayWindow(camp(47), NOW)).toBe(true)
    expect(inTwoDayWindow(camp(25), NOW)).toBe(true)
    expect(inTwoDayWindow(camp(24), NOW)).toBe(false)
    expect(inLastDayWindow(camp(24), NOW)).toBe(true)
    expect(inLastDayWindow(camp(1), NOW)).toBe(true)
    expect(inLastDayWindow(camp(-1), NOW)).toBe(false)
    expect(inTwoDayWindow(camp(49), NOW)).toBe(false)
  })
  it('termenul implicit e de 2 zile; fără dată nu e nimic de trimis', () => {
    expect(registrationExpiry({ id: 'x', registration_opened_at: NOW.toISOString() })?.getTime()).toBe(NOW.getTime() + 2 * 864e5)
    expect(inLastDayWindow({ id: 'x', registration_opened_at: null }, NOW)).toBe(false)
  })
  it('textul termenului, în ora României', () => {
    expect(expiryLabel(new Date('2026-10-20T15:00:00Z'), NOW)).toBe('azi la 18:00')
    expect(expiryLabel(new Date('2026-10-21T06:30:00Z'), NOW)).toBe('mâine la 09:30')
    expect(expiryLabel(new Date('2026-10-25T15:00:00Z'), NOW)).toBe('pe 25 octombrie, 17:00') // ora de iarnă (25 oct.)
  })
})
