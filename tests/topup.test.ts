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

import { cleanBilling, billingToMetadata, billingFromMetadata } from '@/lib/topup'

describe('datele de facturare la plata cu cardul', () => {
  it('se validează ca la transfer', () => {
    expect(cleanBilling({ type: 'pj', name: 'Firma SRL', vat: '' }).error).toMatch(/CUI/)
    expect(cleanBilling({ type: 'pf', name: '' }).error).toMatch(/numele/)
    expect(cleanBilling({ type: 'pj', name: ' Yasenka  SRL ', vat: 'ro123', address: 'Str. X 1' }).billing).toMatchObject({ name: 'Yasenka SRL', vat: 'RO123' })
  })
  it('încap în metadata Stripe (max. 500 caractere) și se recitesc identic', () => {
    const b = cleanBilling({ type: 'pj', name: 'Ăîșț SRL', vat: 'RO1', reg_com: 'J1', address: 'Str. Lungă '.repeat(30), city: 'Pitești' }).billing
    const m = billingToMetadata(b)
    expect(m.length).toBeLessThanOrEqual(500)
    expect(billingFromMetadata(m)).toMatchObject({ type: 'pj', name: 'Ăîșț SRL', vat: 'RO1', city: 'Pitești' })
    expect(billingFromMetadata('nu e json')).toBeNull()
  })
})

describe('erorile SmartBill: sigur refuzată vs. rezultat nesigur', () => {
  const env = { ...process.env }
  beforeEach(() => { process.env.SMARTBILL_USERNAME = 'u'; process.env.SMARTBILL_API_KEY = 'k' })
  afterEach(() => { vi.unstubAllGlobals(); process.env = { ...env } })
  const call = () => createSmartBillInvoice({ clientName: 'X', clientEmail: '', amountRon: 50 }).then(() => null, (e: any) => e)

  it('refuz cu mesaj de la SmartBill → sigur (se poate reîncerca)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ errorText: 'CIF invalid' }), { status: 400 })))
    const e = await call()
    expect(e.message).toBe('CIF invalid'); expect(e.definite).toBe(true)
  })
  it('rețea căzută / răspuns ilizibil / 5xx → nesigur (poate exista factura)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect((await call()).definite).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })))
    expect((await call()).definite).toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    expect((await call()).definite).toBe(false)
  })
})

// ── issueTopupInvoice cu o bază de date simulată ──────────────────────────
import { issueTopupInvoice, INVOICE_CHECK, isRealInvoiceNumber, invoiceNeedsCheck } from '@/lib/topup'

function fakeDb(tx: Record<string, any>) {
  const rows: Record<string, any[]> = { brand_transactions: [tx], brands: [{ id: 'b1', name: 'Brand', email: 'b@x.ro' }] }
  return {
    rows,
    from(table: string) {
      const filters: Array<(r: any) => boolean> = []
      let patch: any = null
      const q: any = {
        select: () => q,
        update: (p: any) => { patch = p; return q },
        eq: (k: string, v: any) => { filters.push(r => r[k] === v); return q },
        is: (k: string, v: any) => { filters.push(r => (r[k] ?? null) === v); return q },
        run() {
          const hit = rows[table].filter(r => filters.every(f => f(r)))
          if (patch) hit.forEach(r => Object.assign(r, patch))
          return hit
        },
        maybeSingle: async () => ({ data: q.run()[0] ?? null }),
        then: (res: any, rej: any) => Promise.resolve({ data: q.run() }).then(res, rej),
      }
      return q
    },
  } as any
}

describe('emiterea facturii nu face dubluri', () => {
  const env = { ...process.env }
  let calls = 0
  beforeEach(() => {
    calls = 0
    process.env.SMARTBILL_USERNAME = 'u'; process.env.SMARTBILL_API_KEY = 'k'
    vi.stubGlobal('fetch', vi.fn(async () => { calls++; await new Promise(r => setTimeout(r, 5)); return new Response(JSON.stringify({ series: 'ADDF', number: String(calls).padStart(4, '0') }), { status: 200 }) }))
  })
  afterEach(() => { vi.unstubAllGlobals(); process.env = { ...env } })
  const tx = (inv: string | null = null) => ({ id: 't1', brand_id: 'b1', amount: 100, status: 'completed', type: 'TOPUP', billing_details: {}, smartbill_invoice_number: inv })

  it('două apăsări simultane → o singură factură', async () => {
    const db = fakeDb(tx())
    const [a, b] = await Promise.all([issueTopupInvoice(db, 't1'), issueTopupInvoice(db, 't1')])
    expect(calls).toBe(1)
    expect([a.ok, b.ok].filter(Boolean).length).toBe(1)
    expect(db.rows.brand_transactions[0].smartbill_invoice_number).toBe('ADDF-0001')
  })
  it('dacă are deja factură, o întoarce pe aceea', async () => {
    const r = await issueTopupInvoice(fakeDb(tx('ADDF-0007')), 't1')
    expect(r).toMatchObject({ ok: true, number: 'ADDF-0007', existing: true }); expect(calls).toBe(0)
  })
  it('emitere întreruptă → nu se refacturează fără confirmarea adminului', async () => {
    const db = fakeDb(tx(INVOICE_CHECK))
    expect((await issueTopupInvoice(db, 't1')).ok).toBe(false)
    expect(calls).toBe(0)
    const r = await issueTopupInvoice(db, 't1', { confirmedMissing: true })
    expect(r).toMatchObject({ ok: true, number: 'ADDF-0001' })
  })
  it('SmartBill fără răspuns clar → plata devine „de verificat”, nu „fără factură”', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    const db = fakeDb(tx())
    expect((await issueTopupInvoice(db, 't1')).ok).toBe(false)
    expect(db.rows.brand_transactions[0].smartbill_invoice_number).toBe(INVOICE_CHECK)
  })
  it('marcajele interne nu sunt numere de factură', () => {
    expect(isRealInvoiceNumber('ADDF-0001')).toBe(true)
    expect(isRealInvoiceNumber('EMITERE:abc')).toBe(false)
    expect(invoiceNeedsCheck('EMITERE:abc')).toBe(true)
    expect(invoiceNeedsCheck(null)).toBe(false)
  })
})
