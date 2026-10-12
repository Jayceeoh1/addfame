import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeTopupReference, parseTopupAmount } from '@/lib/topup'
import { parseSmartBillNumber, createSmartBillInvoice, smartBillSeries } from '@/lib/smartbill'

describe('referința de transfer', () => {
  it('are formatul ADF-AALL-XXXXX, fără caractere ușor de confundat', () => {
    const r = makeTopupReference(new Date(2026, 9, 12))
    expect(r).toMatch(/^ADF-2610-[A-HJ-NP-Z2-9]{5}$/)
  })
  it('e diferită între cereri', () => {
    const set = new Set(Array.from({ length: 500 }, () => makeTopupReference()))
    expect(set.size).toBeGreaterThan(495)
  })
})

describe('suma încărcării', () => {
  it('acceptă doar 50 – 250.000 RON', () => {
    expect(parseTopupAmount(49.99)).toBeNull()
    expect(parseTopupAmount(50)).toBe(50)
    expect(parseTopupAmount('1000.005')).toBe(1000.01)
    expect(parseTopupAmount(250001)).toBeNull()
    expect(parseTopupAmount('abc')).toBeNull()
    expect(parseTopupAmount(-500)).toBeNull()
  })
})

describe('numărul facturii SmartBill', () => {
  it('se citește din „ADDF-0003”, păstrând numărul exact', () => {
    expect(parseSmartBillNumber('ADDF-0003')).toEqual({ series: 'ADDF', number: '0003' })
    expect(parseSmartBillNumber('ADDF12')).toEqual({ series: 'ADDF', number: '12' })
    expect(parseSmartBillNumber('EMITERE')).toBeNull()
    expect(parseSmartBillNumber(null)).toBeNull()
  })
})

describe('factura trimisă la SmartBill', () => {
  const env = { ...process.env }
  let body: any
  beforeEach(() => {
    process.env.SMARTBILL_USERNAME = 'u'; process.env.SMARTBILL_API_KEY = 'k'
    delete process.env.SMARTBILL_SERIES; delete process.env.SMARTBILL_VAT_PERCENT
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      body = JSON.parse(init.body)
      return new Response(JSON.stringify({ series: 'ADDF', number: '0004' }), { status: 200 })
    }))
  })
  afterEach(() => { vi.unstubAllGlobals(); process.env = { ...env } })

  it('folosește seria ADDF și datele firmei (CUI, Reg. Com.)', async () => {
    const r = await createSmartBillInvoice({ clientName: 'Yasenka SRL', clientCif: 'RO123', clientRegCom: 'J03/1/2020', clientEmail: 'a@b.ro', amountRon: 500 })
    expect(smartBillSeries()).toBe('ADDF')
    expect(body.seriesName).toBe('ADDF')
    expect(body.client).toMatchObject({ name: 'Yasenka SRL', vatCode: 'RO123', regCom: 'J03/1/2020', isTaxPayer: true })
    expect(body.products[0].price).toBe(500)
    expect(body.products[0].taxPercentage).toBeUndefined()
    expect(r.smartbillNumber).toBe('ADDF-0004')
  })

  it('TVA doar dacă e setat în Vercel (SMARTBILL_VAT_PERCENT)', async () => {
    process.env.SMARTBILL_VAT_PERCENT = '21'
    await createSmartBillInvoice({ clientName: 'Ion', clientEmail: '', amountRon: 100 })
    expect(body.products[0]).toMatchObject({ taxPercentage: 21, isTaxIncluded: true })
    expect(body.client.isTaxPayer).toBe(false)
  })
})
