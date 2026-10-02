/**
 * SmartBill API v1 — integrare AddFame
 * Documentatie: https://api.smartbill.ro/swagger/index.html
 *
 * Env vars necesare (Vercel → Settings → Environment Variables):
 *   SMARTBILL_USERNAME  = ciprian@addfame.ro
 *   SMARTBILL_API_KEY   = 003|4f63...
 *   SMARTBILL_CIF       = 54992560
 *   SMARTBILL_SERIES    = ADDF
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

  // Tranzacție
  amountRon: number           // suma în RON, fără TVA (neplatitor TVA)
  description?: string        // descrierea serviciului
  invoiceDate?: string        // YYYY-MM-DD, default azi
}

export interface SmartBillInvoiceResult {
  series: string
  number: string
  invoiceUrl?: string         // URL PDF (dacă SmartBill îl returnează)
  smartbillNumber: string     // ex: "ADDF-1"
}

/**
 * Creează o factură fiscală în SmartBill.
 * Returnează seria și numărul facturii generate.
 */
export async function createSmartBillInvoice(
  params: SmartBillInvoiceParams
): Promise<SmartBillInvoiceResult> {
  const cif = process.env.SMARTBILL_CIF!
  const series = process.env.SMARTBILL_SERIES || 'ADDF'
  const today = new Date().toISOString().split('T')[0]
  const invoiceDate = params.invoiceDate || today

  // Construim payload-ul pentru SmartBill API
  // Documentatie: https://api.smartbill.ro/swagger/index.html#/Invoice/post_invoice
  const payload = {
    companyVatCode: cif,
    client: {
      name: params.clientName,
      vatCode: params.clientCif || '',
      address: params.clientAddress || '',
      city: '',
      country: 'Romania',
      isTaxPayer: false,
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
      },
    ],
    sendEmail: false,
    mentions: `Credite valabile 6 luni de la data emiterii. Platforma AddFame — addfame.ro`,
    useStock: false,
  }

  const res = await fetch(`${BASE_URL}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  // Dacă factura a fost creată (are series + number) dar e eroare de email → continuăm
  const hasInvoice = data.series && data.number && data.number !== '0'
  if ((!res.ok || data.errorText) && !hasInvoice) {
    console.error('[SmartBill] EROARE FATALA:', JSON.stringify(data))
    throw new Error(data.errorText || `SmartBill error ${res.status}`)
  }
  if (data.errorText) {
    // Eroare non-fatală (ex: email encoding) — factura e creată, logăm și continuăm
    console.warn('[SmartBill] Avertisment (non-fatal):', data.errorText)
  }

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
 * Obține URL-ul PDF al unei facturi existente din SmartBill.
 */
export async function getSmartBillInvoicePdf(
  series: string,
  number: string
): Promise<string | null> {
  const cif = process.env.SMARTBILL_CIF!

  const res = await fetch(
    `${BASE_URL}/invoice/pdf?cif=${cif}&seriesname=${series}&number=${number}`,
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

  // Returnăm URL-ul direct (pentru redirect la download)
  return res.url
}
