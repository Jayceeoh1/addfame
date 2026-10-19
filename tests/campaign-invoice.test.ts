import { describe, it, expect } from 'vitest'
import { parseInvoiceAmount, cleanInvoiceInput } from '../lib/campaign-invoice'

describe('parseInvoiceAmount', () => {
  it('înțelege formatul românesc și cel simplu', () => {
    expect(parseInvoiceAmount('1.250,50')).toBe(1250.5)
    expect(parseInvoiceAmount('1250.5')).toBe(1250.5)
    expect(parseInvoiceAmount('2400 lei')).toBe(2400)
    expect(parseInvoiceAmount(300)).toBe(300)
  })
  it('refuză sume invalide', () => {
    for (const v of ['', 'abc', '0', '-5', '0,5', '99999999', null]) expect(parseInvoiceAmount(v as any)).toBeNull()
  })
})

describe('cleanInvoiceInput', () => {
  const ok = { amount: '2.400,00', description: 'Servicii de promovare — campania X', request_key: 'k1', client: { name: ' Firma  SRL ', vat: 'ro12345678', email: 'a@b.ro' } }
  it('curăță și validează', () => {
    const r: any = cleanInvoiceInput(ok)
    expect(r.ok).toBe(true)
    expect(r.value.amount).toBe(2400)
    expect(r.value.client.name).toBe('Firma SRL')
    expect(r.value.client.vat).toBe('RO12345678')
  })
  it('cere nume, descriere, cheie și valori valide', () => {
    expect((cleanInvoiceInput({ ...ok, client: { name: '' } }) as any).ok).toBe(false)
    expect((cleanInvoiceInput({ ...ok, description: 'x' }) as any).ok).toBe(false)
    expect((cleanInvoiceInput({ ...ok, request_key: '' }) as any).ok).toBe(false)
    expect((cleanInvoiceInput({ ...ok, client: { name: 'A', vat: 'xx' } }) as any).ok).toBe(false)
    expect((cleanInvoiceInput({ ...ok, client: { name: 'A', email: 'nu-e-email' } }) as any).ok).toBe(false)
    expect((cleanInvoiceInput({ ...ok, amount: '0' }) as any).ok).toBe(false)
  })
})
