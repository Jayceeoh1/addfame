import { describe, it, expect } from 'vitest'
import { isAcademyMember, lessonLock, releaseLabel, memberUntil } from '@/lib/academy-member'

const NOW = new Date('2026-11-23T12:00:00Z')

describe('Academy Member', () => {
  it('membru doar cu bifa activă și neexpirată', () => {
    expect(isAcademyMember({ is_verified: true, badge_expires_at: '2026-12-01T00:00:00Z' }, NOW)).toBe(true)
    expect(isAcademyMember({ is_verified: true, badge_expires_at: '2026-11-01T00:00:00Z' }, NOW)).toBe(false)
    expect(isAcademyMember({ is_verified: false, badge_expires_at: '2026-12-01T00:00:00Z' }, NOW)).toBe(false)
    expect(isAcademyMember(null, NOW)).toBe(false)
  })
  it('lacătul lecțiilor', () => {
    expect(lessonLock({ members_only: false, total: 5 }, false, NOW)).toBe(null)
    expect(lessonLock({ members_only: true, total: 5 }, false, NOW)).toBe('members')
    expect(lessonLock({ members_only: true, total: 5 }, true, NOW)).toBe(null)
    // „În curând” bate tot: data în viitor sau fără test
    expect(lessonLock({ members_only: true, release_at: '2026-12-07T08:00:00Z', total: 5 }, true, NOW)).toBe('soon')
    expect(lessonLock({ members_only: false, total: 0 }, true, NOW)).toBe('soon')
    expect(lessonLock({ members_only: true, release_at: '2026-11-20T08:00:00Z', total: 5 }, false, NOW)).toBe('members')
  })
  it('data de lansare și sfârșitul accesului', () => {
    expect(releaseLabel('2026-12-07T08:00:00Z')).toMatch(/7 decembrie/)
    expect(releaseLabel(null)).toBe(null)
    expect(memberUntil(Date.parse('2026-12-23T12:00:00Z') / 1000)).toBe('2026-12-24T12:00:00.000Z')
  })
})

import { isPaidAcademyMember } from '@/lib/academy-member'
describe('acces gratuit vs plătit', () => {
  const later = new Date(Date.now() + 86400000).toISOString()
  it('gratuit: vede lecțiile, fără bifă', () => {
    expect(isAcademyMember({ academy_free_until: later })).toBe(true)
    expect(isPaidAcademyMember({ academy_free_until: later })).toBe(false)
  })
  it('plătit: bifă + lecții', () => {
    expect(isPaidAcademyMember({ is_verified: true, badge_expires_at: later })).toBe(true)
    expect(isAcademyMember({ is_verified: true, badge_expires_at: later })).toBe(true)
  })
})
