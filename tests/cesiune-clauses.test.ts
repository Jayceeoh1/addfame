import { describe, it, expect } from 'vitest'
import { art7Clauses, brandIdentity, cesiuneLabel, CESIUNE_CLAUSES_VERSION } from '@/lib/cesiune-clauses'

describe('contract cesiune v2 — drepturi definitive, ads 6 luni', () => {
  const c = { brand_name: 'ECHILIBRU INTERNATIONAL S.R.L.', brand_cui: 'RO44778609', brand_reg_com: 'J2021014477406' }
  it('numește brandul cu CUI și Reg. Com.', () => {
    expect(brandIdentity(c)).toBe('ECHILIBRU INTERNATIONAL S.R.L. (CUI RO44778609, Reg. Com. J2021014477406)')
  })
  it('cesiune pe toată durata de protecție, ads 6 luni, brand + parteneri, acord expres, imagine', () => {
    const a = art7Clauses(c, 2)
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
    expect(CESIUNE_CLAUSES_VERSION).toBe(3)
    expect(cesiuneLabel(3)).toBe('Cesiune definitivă · ads 6 luni')
    expect(cesiuneLabel(1)).toBe('Cesiune 6 luni')
    expect(cesiuneLabel(2)).toBe('Cesiune definitivă · ads 6 luni')
  })
})

import { normalizePhone } from '@/lib/whatsapp'
describe('telefon pentru WhatsApp', () => {
  it('normalizează numerele românești', () => {
    expect(normalizePhone('0722 123 456')).toBe('+40722123456')
    expect(normalizePhone('722123456')).toBe('+40722123456')
    expect(normalizePhone('0040722123456')).toBe('+40722123456')
    expect(normalizePhone('+40 (722) 123-456')).toBe('+40722123456')
    expect(normalizePhone('abc')).toBeNull()
  })
})

describe('contract cesiune v3 — creatorul își păstrează postarea', () => {
  it('v3 are alineatul (6); v2 semnat rămâne cu 5 alineate', () => {
    const v3 = art7Clauses({ brand_name: 'X SRL' })
    expect(v3).toHaveLength(6)
    expect(v3[5]).toContain('își poate păstra postarea')
    expect(v3[5]).toContain('portofoliul')
    expect(art7Clauses({ brand_name: 'X SRL' }, 2)).toHaveLength(5)
  })
})
