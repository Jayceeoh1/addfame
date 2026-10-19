/**
 * SmartBill API v1 — integrare AddFame
 * Documentatie: https://api.smartbill.ro/swagger/index.html
 *
 * Env vars necesare (Vercel → Settings → Environment Variables):
 *   SMARTBILL_USERNAME  = ciprian@addfame.ro
 *   SMARTBILL_API_KEY   = 003|4f63...
 *   SMARTBILL_CIF       = 54992560
 *   SMARTBILL_SERIES    = ADDF
 *   SMARTBILL_VAT_PERCENT = (doar dacă AddFame e plătitor de TVA, ex. 21)
 */

const BASE_URL = 'https://ws.smartbill.ro/SBORO/api'

function authHeader() {
  const user = process.env.SMARTBILL_USERNAME!
  const token = process.env.SMARTBILL_API_KEY!
  return 'Basic ' + Buffer.from(`${user}:${token}`).toString('base64')
}

export interface SmartBillInvoiceParams {
  // Date brand (client)
  clientName: string
  clientCif?: string          // CUI firmă sau CNP persoană fizică (opțional)
  clientAddress?: string
  clientEmail: string
  clientRegCom?: string       // Nr. Registrul Comerțului (J40/…)
  clientCity?: string

  // Tranzacție
  amountRon: number           // suma în RON, fără TVA (neplatitor TVA)
  description?: string        // descrierea serviciului
  invoiceDate?: string        // YYYY-MM-DD, default azi
  mentions?: string           // mențiuni pe factură (implicit: textul pentru credite prepaid)
}

export interface SmartBillInvoiceResult {
  series: string
  number: string
  invoiceUrl?: string         // URL PDF (dacă SmartBill îl returnează)
  smartbillNumber: string     // ex: "ADDF-1"
}

/** Seria facturilor AddFame în SmartBill. */
export function smartBillSeries() {
  return (process.env.SMARTBILL_SERIES || 'ADDF').trim() || 'ADDF'
}

function smartBillCif() {
  return (process.env.SMARTBILL_CIF || '54992560').trim()
}

/**
 * TVA pe factură. Implicit: fără TVA (neplătitor).
 * Dacă AddFame devine plătitor de TVA: în Vercel se pune SMARTBILL_VAT_PERCENT (ex. 21);
 * suma plătită de brand se consideră cu TVA inclus.
 */
function productTax() {
  const pct = Number(process.env.SMARTBILL_VAT_PERCENT)
  if (!Number.isFinite(pct) || pct <= 0) return {}
  return { isTaxIncluded: true, taxName: process.env.SMARTBILL_VAT_NAME || 'Normala', taxPercentage: pct }
}

/** Ce variabile lipsesc pentru emiterea facturilor. */
export function smartBillMissingEnv(): string[] {
  return ['SMARTBILL_USERNAME', 'SMARTBILL_API_KEY'].filter(k => !process.env[k])
}

/**
 * Verifică legătura cu SmartBill: credențialele și seria de facturare.
 * Întoarce următorul număr din serie (ex. 4 → următoarea factură ADDF0004).
 */
export async function checkSmartBill(): Promise<{
  ok: boolean; series: string; nextNumber?: string; error?: string; vat?: number | null
}> {
  const series = smartBillSeries()
  const vatPct = Number(process.env.SMARTBILL_VAT_PERCENT)
  const vat = Number.isFinite(vatPct) && vatPct > 0 ? vatPct : null
  const missing = smartBillMissingEnv()
  if (missing.length) return { ok: false, series, vat, error: `Lipsesc din Vercel: ${missing.join(', ')}` }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`${BASE_URL}/series?cif=${encodeURIComponent(smartBillCif())}&type=f`, {
      headers: { Accept: 'application/json', Authorization: authHeader() },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t))
    const data: any = await res.json().catch(() => ({}))
    if (!res.ok || data.errorText) return { ok: false, series, vat, error: data.errorText || `SmartBill a răspuns ${res.status}` }
    const list: any[] = data.list || []
    const found = list.find(s => String(s.name).toUpperCase() === series.toUpperCase())
    if (!found) {
      return { ok: false, series, vat, error: `Seria ${series} nu există în SmartBill (găsite: ${list.map(s => s.name).join(', ') || 'niciuna'})` }
    }
    return { ok: true, series, vat, nextNumber: String(found.nextNumber ?? '') }
  } catch (e: any) {
    return { ok: false, series, vat, error: e?.name === 'AbortError' ? 'SmartBill nu a răspuns în 8 secunde' : (e?.message || 'Eroare SmartBill') }
  }
}

/**
 * Creează o factură fiscală în SmartBill.
 * Returnează seria și numărul facturii generate.
 */
export async function createSmartBillInvoice(
  params: SmartBillInvoiceParams
): Promise<SmartBillInvoiceResult> {
  const cif = smartBillCif()
  const series = smartBillSeries()
  const today = new Date().toISOString().split('T')[0]
  const invoiceDate = params.invoiceDate || today

  // Construim payload-ul pentru SmartBill API
  // Documentatie: https://api.smartbill.ro/swagger/index.html#/Invoice/post_invoice
  const payload = {
    companyVatCode: cif,
    client: {
      name: params.clientName,
      vatCode: (params.clientCif || '').trim(),
      regCom: (params.clientRegCom || '').trim(),
      address: params.clientAddress || '',
      city: params.clientCity || '',
      country: 'Romania',
      // clientul e plătitor de TVA dacă CUI-ul are prefixul RO
      isTaxPayer: /^RO\s*\d/i.test((params.clientCif || '').trim()),
      email: params.clientEmail,
      saveToDb: false,
    },
    issueDate: invoiceDate,
    seriesName: series,
    isDraft: false,
    currency: 'RON',
    language: 'RO',
    precision: 2,
    products: [
      {
        name: params.description || 'Credite publicitare prepaid — platforma AddFame',
        measuringUnitName: 'buc',
        currency: 'RON',
        quantity: 1,
        price: params.amountRon,
        isService: true,
        saveToDb: false,
        ...productTax(),
      },
    ],
    sendEmail: false,
    mentions: params.mentions ?? `Credite valabile 6 luni de la data emiterii. Platforma AddFame — addfame.ro`,
    useStock: false,
  }

  // `definite` = SmartBill a refuzat clar (nu există factură). Altfel rezultatul e nesigur.
  const fail = (msg: string, definite: boolean) => Object.assign(new Error(msg), { definite })

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader(),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
  } catch (e: any) {
    // rețea / timeout: cererea poate fi ajuns la SmartBill
    throw fail(e?.name === 'AbortError' ? 'SmartBill nu a răspuns în 25 de secunde' : (e?.message || 'Eroare de rețea SmartBill'), false)
  } finally {
    clearTimeout(timer)
  }

  const raw = await res.text().catch(() => '')
  let data: any
  try { data = JSON.parse(raw) } catch {
    // 4xx = cerere refuzată; 5xx / răspuns ilizibil = nu știm sigur
    throw fail(`SmartBill a răspuns ${res.status}`, res.status >= 400 && res.status < 500)
  }

  // Dacă factura a fost creată (are series + number) dar e eroare de email → continuăm
  const hasInvoice = data.series && data.number && data.number !== '0'
  if ((!res.ok || data.errorText) && !hasInvoice) {
    console.error('[SmartBill] EROARE FATALA:', JSON.stringify(data))
    throw fail(data.errorText || `SmartBill error ${res.status}`, !!data.errorText || (res.status >= 400 && res.status < 500))
  }
  if (data.errorText) {
    // Eroare non-fatală (ex: email encoding) — factura e creată, logăm și continuăm
    console.warn('[SmartBill] Avertisment (non-fatal):', data.errorText)
  }
  if (!hasInvoice) throw fail('SmartBill nu a întors numărul facturii', false)

  // SmartBill returnează: { series, number, ... }
  const invoiceSeries: string = data.series || series
  const invoiceNumber: string = String(data.number)

  return {
    series: invoiceSeries,
    number: invoiceNumber,
    smartbillNumber: `${invoiceSeries}-${invoiceNumber}`,
    invoiceUrl: data.url || undefined,
  }
}

/**
 * Descarcă PDF-ul unei facturi din SmartBill (conținutul fișierului).
 */
export async function getSmartBillInvoicePdf(
  series: string,
  number: string
): Promise<ArrayBuffer | null> {
  const cif = smartBillCif()
  const res = await fetch(
    `${BASE_URL}/invoice/pdf?cif=${encodeURIComponent(cif)}&seriesname=${encodeURIComponent(series)}&number=${encodeURIComponent(number)}`,
    {
      headers: {
        'Accept': 'application/octet-stream',
        'Authorization': authHeader(),
      },
    }
  )
  if (!res.ok) {
    console.error('[SmartBill] PDF fetch failed', res.status)
    return null
  }
  return res.arrayBuffer()
}

/** „ADDF-0012” → { series: 'ADDF', number: '0012' } (numărul rămâne exact cum l-a dat SmartBill) */
export function parseSmartBillNumber(v: string | null | undefined): { series: string; number: string } | null {
  const m = String(v || '').trim().match(/^([A-Za-z]+)[-\s]?(\d+)$/)
  return m ? { series: m[1].toUpperCase(), number: m[2] } : null
}
