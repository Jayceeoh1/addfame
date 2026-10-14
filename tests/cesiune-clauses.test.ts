import { describe, it, expect } from 'vitest'
import { brandRightsClauses, brandIdentity, CESIUNE_CLAUSES_VERSION } from '@/lib/cesiune-clauses'

describe('contract cesiune — drepturi pentru brand și parteneri', () => {
  it('numește brandul cu CUI și Reg. Com.', () => {
    const c = { brand_name: 'ECHILIBRU INTERNATIONAL S.R.L.', brand_cui: 'RO44778609', brand_reg_com: 'J2021014477406' }
    expect(brandIdentity(c)).toBe('ECHILIBRU INTERNATIONAL S.R.L. (CUI RO44778609, Reg. Com. J2021014477406)')
    const [a, b] = brandRightsClauses(c)
    expect(a).toContain('6 (șase) luni')
    expect(a).toContain('ECHILIBRU INTERNATIONAL S.R.L.')
    expect(a).toContain('partenerii acestuia')
    expect(b).toContain('acordul expres')
  })
  it('fără brand completat → formulare generală', () => {
    expect(brandRightsClauses({})[0]).toContain('brandul partener al campaniei')
  })
  it('versiunea curentă e 2', () => expect(CESIUNE_CLAUSES_VERSION).toBe(2))
})
