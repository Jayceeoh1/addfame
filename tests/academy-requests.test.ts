import { describe, it, expect } from 'vitest'
import { requestBlock, cleanUrl, FEEDBACK_OPEN_MAX } from '@/lib/academy-requests'

const now = new Date('2026-11-23T12:00:00Z').getTime()
const r = (kind: 'feedback' | 'analysis', status: 'open' | 'answered', daysAgo: number) =>
  ({ kind, status, created_at: new Date(now - daysAgo * 86400000).toISOString() })

describe('cereri Academy', () => {
  it('feedback: blocat doar la prea multe în așteptare', () => {
    expect(requestBlock('feedback', [], now)).toBeNull()
    const open = Array.from({ length: FEEDBACK_OPEN_MAX }, () => r('feedback', 'open', 1))
    expect(requestBlock('feedback', open, now)).toMatch(/în așteptare/)
    expect(requestBlock('feedback', [...open.slice(1), r('feedback', 'answered', 1)], now)).toBeNull()
  })
  it('analiză: una în lucru, apoi o dată la 30 de zile', () => {
    expect(requestBlock('analysis', [], now)).toBeNull()
    expect(requestBlock('analysis', [r('analysis', 'open', 40)], now)).toMatch(/în lucru/)
    expect(requestBlock('analysis', [r('analysis', 'answered', 10)], now)).toMatch(/de pe/)
    expect(requestBlock('analysis', [r('analysis', 'answered', 31)], now)).toBeNull()
    expect(requestBlock('analysis', [r('feedback', 'open', 1)], now)).toBeNull()
  })
  it('linkuri', () => {
    expect(cleanUrl('instagram.com/reel/abc')).toBe('https://instagram.com/reel/abc')
    expect(cleanUrl('javascript:alert(1)')).toBeNull()
    expect(cleanUrl('')).toBeNull()
    expect(cleanUrl('nimic')).toBeNull()
  })
})
