import { describe, it, expect } from 'vitest'
import { art7Clauses, brandIdentity, cesiuneLabel, CESIUNE_CLAUSES_VERSION } from '@/lib/cesiune-clauses'

describe('contract cesiune v2 — drepturi definitive, ads 6 luni', () => {
  const c = { brand_name: 'ECHILIBRU INTERNATIONAL S.R.L.', brand_cui: 'RO44778609', brand_reg_com: 'J2021014477406' }
  it('numește brandul cu CUI și Reg. Com.', () => {
    expect(brandIdentity(c)).toBe('ECHILIBRU INTERNATIONAL S.R.L. (CUI RO44778609, Reg. Com. J2021014477406)')
  })
  it('cesiune pe toată durata de protecție, ads 6 luni, brand + parteneri, acord expres, imagine', () => {
    const a = art7Clauses(c)
    expect(a).toHaveLength(5)
    expect(a[0]).toContain('întreaga durată de protecție')
    expect(a[1]).toContain('6 (șase) luni')
    expect(a[1]).toContain('organic')
    expect(a[2]).toContain('ECHILIBRU INTERNATIONAL S.R.L.')
    expect(a[2]).toContain('partenerii acestuia')
    expect(a[3]).toContain('acordul expres')
    expect(a[4]).toContain('imaginea, numele și vocea')
  })
  it('fără brand completat → formulare generală', () => {
    expect(art7Clauses({})[2]).toContain('brandul partener al campaniei')
  })
  it('etichete pe versiuni', () => {
    expect(CESIUNE_CLAUSES_VERSION).toBe(2)
    expect(cesiuneLabel(1)).toBe('Cesiune 6 luni')
    expect(cesiuneLabel(2)).toBe('Cesiune definitivă · ads 6 luni')
  })
})
