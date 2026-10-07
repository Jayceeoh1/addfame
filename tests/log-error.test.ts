import { describe, it, expect } from 'vitest'
import { scrub, fingerprint } from '@/lib/log-error'

describe('scrub', () => {
  it('ascunde tokenuri, chei și emailuri', () => {
    const t = scrub('Bearer abc.def123 sk_live_ABC123xyz robert@bcchauto.ro')
    expect(t).not.toMatch(/abc\.def123|ABC123xyz|robert@/)
    expect(t).toContain('[email]')
  })
  it('ascunde JWT-uri', () => expect(scrub('x eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij')).toContain('[jwt redactat]'))
})

describe('fingerprint', () => {
  const stack = 'Error: x\n    at foo (/app/a.ts:10:5)'
  it('aceeași eroare cu id-uri/numere diferite → aceeași amprentă', () => {
    expect(fingerprint('server', 'Campania 123 nu există', stack)).toBe(fingerprint('server', 'Campania 999 nu există', stack))
    expect(fingerprint('server', 'id 11111111-1111-1111-1111-111111111111', stack)).toBe(fingerprint('server', 'id 22222222-2222-2222-2222-222222222222', stack))
  })
  it('surse sau mesaje diferite → amprente diferite', () => {
    expect(fingerprint('server', 'a', stack)).not.toBe(fingerprint('client', 'a', stack))
    expect(fingerprint('server', 'a', stack)).not.toBe(fingerprint('server', 'b', stack))
  })
})
