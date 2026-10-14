import { describe, it, expect } from 'vitest'
import { draftUploadState, EXTRA_DRAFT_DAYS } from '@/lib/drafts'
import { retentionStart, planRetention } from '@/lib/draft-retention'

const NOW = new Date('2026-10-14T18:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 864e5).toISOString()

describe('clip suplimentar după finalizare', () => {
  it('colaborare activă: ca înainte (blocat doar după aprobare)', () => {
    const a = { status: 'ACTIVE', completedAt: null }
    expect(draftUploadState(a, null, NOW)).toMatchObject({ allowed: true, extra: false })
    expect(draftUploadState(a, { status: 'changes_requested' }, NOW).allowed).toBe(true)
    expect(draftUploadState(a, { status: 'approved' }, NOW).allowed).toBe(false)
  })
  it(`finalizată de mai puțin de ${EXTRA_DRAFT_DAYS} zile: se poate trimite, inclusiv după un draft aprobat`, () => {
    const c = { status: 'COMPLETED', completedAt: daysAgo(2) }
    expect(draftUploadState(c, null, NOW)).toMatchObject({ allowed: true, extra: true })
    expect(draftUploadState(c, { status: 'approved' }, NOW).allowed).toBe(true)
    expect(draftUploadState(c, { status: 'changes_requested' }, NOW).allowed).toBe(true)
    expect(draftUploadState(c, { status: 'pending' }, NOW).allowed).toBe(false)
    expect(draftUploadState(c, null, NOW).until).toBe(new Date(Date.parse(daysAgo(2)) + EXTRA_DRAFT_DAYS * 864e5).toISOString())
  })
  it('după termen, anulată sau fără dată: nimic', () => {
    expect(draftUploadState({ status: 'COMPLETED', completedAt: daysAgo(11) }, null, NOW).allowed).toBe(false)
    expect(draftUploadState({ status: 'COMPLETED', completedAt: null }, null, NOW).allowed).toBe(false)
    expect(draftUploadState({ status: 'CANCELLED', completedAt: daysAgo(1) }, null, NOW).allowed).toBe(false)
  })
  it('clipul suplimentar nu se șterge la 10 zile de la finalizare, ci de la ultima activitate pe el', () => {
    const c = { id: 'c', status: 'COMPLETED', completed_at: daysAgo(12) }
    const d = { id: 'x', collaboration_id: 'c', status: 'pending', file_path: 'p/x.mp4', created_at: daysAgo(3) }
    expect(retentionStart(c, [d])?.toISOString()).toBe(daysAgo(3))
    expect(planRetention([c], [d], new Set(), NOW).remove).toEqual([])
  })
})
