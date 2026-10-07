import { describe, it, expect } from 'vitest'
import { canRequestChanges, revisionDeadline, planDeadlineActions, type DeadlineDraft } from '@/lib/drafts'

const NOW = new Date('2026-10-10T12:00:00Z')
const h = (n: number) => new Date(NOW.getTime() + n * 3600_000).toISOString()
const d = (o: Partial<DeadlineDraft>): DeadlineDraft => ({
  id: 'd1', collaboration_id: 'c1', version: 1, status: 'pending', created_at: h(-1),
  revision_due_at: null, reminder_sent_at: null, review_reminder_sent_at: null, overdue_notified_at: null, ...o,
})

describe('runde și termene', () => {
  it('maxim 2 runde de modificări', () => {
    expect(canRequestChanges(0)).toBe(true)
    expect(canRequestChanges(1)).toBe(true)
    expect(canRequestChanges(2)).toBe(false)
  })
  it('48h pentru prima cerere, 24h pentru a doua', () => {
    expect(revisionDeadline(1, NOW).getTime() - NOW.getTime()).toBe(48 * 3600_000)
    expect(revisionDeadline(2, NOW).getTime() - NOW.getTime()).toBe(24 * 3600_000)
  })
})

describe('planDeadlineActions', () => {
  const kinds = (ds: DeadlineDraft[]) => planDeadlineActions(ds, NOW).map(a => a.kind)

  it('nimic de făcut înainte de termene', () => {
    expect(kinds([d({ status: 'changes_requested', revision_due_at: h(30) })])).toEqual([])
    expect(kinds([d({ status: 'pending', created_at: h(-10) })])).toEqual([])
  })
  it('memento creator când mai sunt ≤12h', () =>
    expect(kinds([d({ status: 'changes_requested', revision_due_at: h(10) })])).toEqual(['revision_reminder']))
  it('memento nu se repetă', () =>
    expect(kinds([d({ status: 'changes_requested', revision_due_at: h(10), reminder_sent_at: h(-1) })])).toEqual([]))
  it('termen depășit → semnalare, o singură dată', () => {
    expect(kinds([d({ status: 'changes_requested', revision_due_at: h(-1) })])).toEqual(['revision_overdue'])
    expect(kinds([d({ status: 'changes_requested', revision_due_at: h(-1), overdue_notified_at: h(0) })])).toEqual([])
  })
  it('o versiune nouă anulează termenul versiunii vechi', () =>
    expect(kinds([
      d({ id: 'old', version: 1, status: 'changes_requested', revision_due_at: h(-5) }),
      d({ id: 'new', version: 2, status: 'pending', created_at: h(-2) }),
    ])).toEqual([]))
  it('brand: memento la 48h, escaladare la 120h', () => {
    expect(kinds([d({ created_at: h(-49) })])).toEqual(['review_reminder'])
    expect(kinds([d({ created_at: h(-49), review_reminder_sent_at: h(-1) })])).toEqual([])
    expect(kinds([d({ created_at: h(-121), review_reminder_sent_at: h(-60) })])).toEqual(['review_overdue'])
    expect(kinds([d({ created_at: h(-121), overdue_notified_at: h(-1) })])).toEqual([])
  })
  it('drafturile aprobate sau șterse sunt ignorate', () =>
    expect(kinds([d({ status: 'approved', created_at: h(-500) }), d({ id: 'x', collaboration_id: 'c2', status: 'deleted', created_at: h(-500) })])).toEqual([]))
  it('colaborări diferite se evaluează separat', () =>
    expect(kinds([
      d({ id: 'a', collaboration_id: 'c1', created_at: h(-50) }),
      d({ id: 'b', collaboration_id: 'c2', status: 'changes_requested', revision_due_at: h(-2) }),
    ]).sort()).toEqual(['review_reminder', 'revision_overdue']))
})
