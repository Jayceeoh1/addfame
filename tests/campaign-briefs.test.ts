import { describe, it, expect } from 'vitest'
import { validateBrief, briefSummary } from '@/lib/campaign-briefs'

describe('briefuri individuale', () => {
  it('cere titlu și text sau fișier', () => {
    expect(validateBrief({ title: '', body: 'x' }).ok).toBe(false)
    expect(validateBrief({ title: 'Brief A' }).ok).toBe(false)
    expect(validateBrief({ title: ' Brief A ', body: ' Filmezi în bucătărie. ' })).toEqual({
      ok: true, value: { title: 'Brief A', body: 'Filmezi în bucătărie.', file_url: null, ref_url: null },
    })
    expect(validateBrief({ title: 'Brief B', file_url: 'https://drive.google.com/x' }).ok).toBe(true)
  })
  it('respinge linkurile invalide', () => {
    const r = validateBrief({ title: 'A', body: 'x', ref_url: 'javascript:alert(1)' })
    expect(r.ok).toBe(false)
    expect(validateBrief({ title: 'A', body: 'x', file_url: 'nu e link' }).ok).toBe(false)
  })
  it('numără cine are brief, cine l-a citit și cine n-are', () => {
    const c = (o: any) => ({ collabId: Math.random() + '', influencerId: 'i', name: 'X', handle: null, status: 'ACTIVE', briefId: null, ackAt: null, ...o })
    const s = briefSummary([{ id: 'A' }, { id: 'B' }], [
      c({ briefId: 'A', ackAt: '2026-11-17' }), c({ briefId: 'A' }), c({ briefId: 'B' }),
      c({}), c({ status: 'PENDING' }), c({ briefId: 'șters' }),
    ])
    expect(s.per).toEqual({ A: { assigned: 2, read: 1 }, B: { assigned: 1, read: 0 } })
    expect(s.withoutBrief).toBe(2)
  })
})
