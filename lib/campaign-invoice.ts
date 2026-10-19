// Factura de la finalul unei campanii: curățarea datelor introduse de admin. Funcții pure, testate în tests/campaign-invoice.test.ts.

export const INVOICE_AMOUNT_MIN = 1
export const INVOICE_AMOUNT_MAX = 1_000_000

export type InvoiceClient = { name: string; vat: string; reg_com: string; address: string; city: string; email: string }
export type InvoiceInput = { amount: number; description: string; client: InvoiceClient; request_key: string }

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/** „1.250,50” / „1250.5” / 1250.5 → 1250.5; altceva → null. */
export function parseInvoiceAmount(v: unknown): number | null {
  let s = String(v ?? '').trim().replace(/\s/g, '').replace(/lei|ron/gi, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')   // format românesc
  const n = Math.round(Number(s) * 100) / 100
  return Number.isFinite(n) && n >= INVOICE_AMOUNT_MIN && n <= INVOICE_AMOUNT_MAX ? n : null
}

export function cleanInvoiceInput(raw: any): { ok: true; value: InvoiceInput } | { ok: false; error: string } {
  const amount = parseInvoiceAmount(raw?.amount)
  if (amount === null) return { ok: false, error: `Suma trebuie să fie între ${INVOICE_AMOUNT_MIN} și ${INVOICE_AMOUNT_MAX.toLocaleString('ro-RO')} RON.` }
  const description = clean(raw?.description, 300)
  if (description.length < 5) return { ok: false, error: 'Scrie descrierea de pe factură (min. 5 caractere).' }
  const c = raw?.client || {}
  const client: InvoiceClient = {
    name: clean(c.name, 120), vat: clean(c.vat, 20).toUpperCase(), reg_com: clean(c.reg_com, 40).toUpperCase(),
    address: clean(c.address, 200), city: clean(c.city, 60), email: clean(c.email, 120),
  }
  if (!client.name) return { ok: false, error: 'Lipsește numele clientului.' }
  if (client.vat && !/^(RO)?\s?\d{2,10}$/i.test(client.vat)) return { ok: false, error: 'CUI invalid (ex. RO12345678 sau 12345678).' }
  if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) return { ok: false, error: 'Email invalid.' }
  const request_key = clean(raw?.request_key, 64)
  if (!request_key) return { ok: false, error: 'Cerere invalidă. Reîncarcă pagina.' }
  return { ok: true, value: { amount, description, client, request_key } }
}
