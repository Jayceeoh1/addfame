// Încărcarea creditelor brandului (top-up): confirmarea plății, adăugarea creditelor și factura SmartBill.
// Un singur drum pentru toate cele trei locuri care confirmă plăți:
//   Admin → Plăți („Confirmă”), /api/wallet/confirm-payment și webhook-ul Stripe.
// Doar pe server (folosește cheia service role).

import type { SupabaseClient } from '@supabase/supabase-js'
import { createSmartBillInvoice } from '@/lib/smartbill'
import { emailTopupConfirmed } from '@/lib/email'

/** Prefix pus cât timp factura se emite (împiedică emiterea a două facturi pentru aceeași plată). */
export const INVOICE_PENDING = 'EMITERE'
/** Emiterea s-a întrerupt și nu știm dacă SmartBill a apucat să facă factura: trebuie verificat manual. */
export const INVOICE_CHECK = 'VERIFICA'

/** Număr real de factură (ex. ADDF-0012), nu un marcaj intern. */
export const isRealInvoiceNumber = (v: string | null | undefined) =>
  !!v && !v.startsWith(INVOICE_PENDING) && v !== INVOICE_CHECK
/** Factura e în curs sau rezultatul e nesigur — nu se reemite fără verificare în SmartBill. */
export const invoiceNeedsCheck = (v: string | null | undefined) =>
  !!v && (v.startsWith(INVOICE_PENDING) || v === INVOICE_CHECK)

export const TOPUP_MIN = 50
export const TOPUP_MAX = 250000

/** Referința pe care brandul o scrie la transfer. Unică pentru fiecare cerere (ex. ADF-2610-K7M4Q). */
export function makeTopupReference(date = new Date(), random: () => number = Math.random) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // fără 0/O, 1/I
  let code = ''
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(random() * alphabet.length) % alphabet.length]
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `ADF-${yy}${mm}-${code}`
}

export type TopupBilling = { type: 'pf' | 'pj'; name: string; vat: string; reg_com: string; address: string; city: string }

/** Datele de facturare (pe factura SmartBill), curățate. Întoarce eroarea dacă lipsește ceva obligatoriu. */
export function cleanBilling(b: any): { billing: TopupBilling; error?: string } {
  const clean = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const billing: TopupBilling = {
    type: b?.type === 'pf' ? 'pf' : 'pj',
    name: clean(b?.name, 120),
    vat: clean(b?.vat, 20).toUpperCase(),
    reg_com: clean(b?.reg_com, 40).toUpperCase(),
    address: clean(b?.address, 200),
    city: clean(b?.city, 60),
  }
  if (!billing.name) return { billing, error: 'Completează numele pentru factură.' }
  if (billing.type === 'pj' && (!billing.vat || !billing.address)) return { billing, error: 'Pentru firmă sunt obligatorii CUI-ul și adresa sediului.' }
  return { billing }
}

/** Stripe acceptă în metadata valori de max. 500 de caractere — împachetăm datele de facturare compact. */
export function billingToMetadata(b: TopupBilling): string {
  const s = JSON.stringify([b.type, b.name, b.vat, b.reg_com, b.address, b.city])
  return s.length <= 500 ? s : JSON.stringify([b.type, b.name.slice(0, 100), b.vat, b.reg_com, b.address.slice(0, 160), b.city.slice(0, 40)]).slice(0, 500)
}
export function billingFromMetadata(v: unknown): TopupBilling | null {
  try {
    const a = JSON.parse(String(v ?? ''))
    if (!Array.isArray(a)) return null
    return { type: a[0] === 'pf' ? 'pf' : 'pj', name: String(a[1] ?? ''), vat: String(a[2] ?? ''), reg_com: String(a[3] ?? ''), address: String(a[4] ?? ''), city: String(a[5] ?? '') }
  } catch { return null }
}

/** Suma validă pentru o încărcare: număr, între minim și maxim, rotunjit la bani. */
export function parseTopupAmount(v: unknown): number | null {
  const n = Math.round(Number(v) * 100) / 100
  if (!Number.isFinite(n) || n < TOPUP_MIN || n > TOPUP_MAX) return null
  return n
}

// ok=false → error: 'already_completed' | 'rejected' | 'not_found' | mesaj
type ConfirmResult = { ok: boolean; error?: string; brandId?: string; amount?: number; newBalance?: number }
type InvoiceResult = { ok: boolean; error?: string; number?: string; existing?: boolean }
type FinalizeResult = ConfirmResult & { invoice?: string | null; invoiceError?: string | null }

/** Marchează plata încasată și adaugă creditele — atomic, o singură dată (SQL 34). */
export async function confirmTopup(sb: SupabaseClient, txId: string): Promise<ConfirmResult> {
  const { data, error } = await sb.rpc('confirm_topup', { p_tx_id: txId })
  if (!error) {
    const r = data as any
    if (!r?.ok) return { ok: false, error: r?.error || 'not_found' }
    return { ok: true, brandId: r.brand_id, amount: Number(r.amount), newBalance: Number(r.new_balance) }
  }
  // SQL 34 încă nerulat → varianta veche (marcare atomică, apoi adunare)
  if (error.code !== 'PGRST202' && !/confirm_topup/.test(error.message || '')) return { ok: false, error: error.message }
  console.warn('[topup] confirm_topup lipsește — rulează SQL 34. Folosesc varianta veche.')
  const { data: tx } = await sb.from('brand_transactions').select('brand_id, amount, status, type').eq('id', txId).maybeSingle()
  if (!tx || tx.type !== 'TOPUP') return { ok: false, error: 'not_found' }
  if (tx.status === 'completed') return { ok: false, error: 'already_completed' }
  if (tx.status === 'failed') return { ok: false, error: 'rejected' }
  const { data: claimed } = await sb.from('brand_transactions').update({ status: 'completed' })
    .eq('id', txId).or('status.is.null,status.not.in.(completed,failed)').select('id')
  if (!claimed?.length) return { ok: false, error: 'already_completed' }
  const { data: brand } = await sb.from('brands').select('credits_balance').eq('id', tx.brand_id).single()
  const newBalance = Number(brand?.credits_balance || 0) + Number(tx.amount)
  await sb.from('brands').update({
    credits_balance: newBalance,
    credits_expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    credits_loaded_at: new Date().toISOString(),
  }).eq('id', tx.brand_id)
  return { ok: true, brandId: tx.brand_id, amount: Number(tx.amount), newBalance }
}

/**
 * Emite factura SmartBill (seria ADDF) pentru o încărcare confirmată.
 * Sigur de apelat de mai multe ori: dacă factura există deja, o întoarce pe aceea.
 *
 * `confirmedMissing` = adminul a verificat în SmartBill că factura NU există, deși o emitere
 * anterioară a rămas neterminată. Fără asta, o plată marcată „de verificat” nu se refacturează
 * (altfel apar facturi duble).
 */
export async function issueTopupInvoice(
  sb: SupabaseClient, txId: string, { confirmedMissing = false }: { confirmedMissing?: boolean } = {},
): Promise<InvoiceResult> {
  const { data: tx } = await sb.from('brand_transactions')
    .select('id, brand_id, amount, status, type, billing_details, smartbill_invoice_number')
    .eq('id', txId).maybeSingle()
  if (!tx || tx.type !== 'TOPUP') return { ok: false, error: 'Plata nu există.' }
  if (tx.status !== 'completed') return { ok: false, error: 'Factura se emite doar după confirmarea plății.' }
  const current: string | null = tx.smartbill_invoice_number ?? null
  if (isRealInvoiceNumber(current)) return { ok: true, number: current!, existing: true }
  if (invoiceNeedsCheck(current) && !confirmedMissing) {
    return { ok: false, error: 'O emitere anterioară nu s-a terminat. Verifică în SmartBill dacă factura există înainte să o emiți din nou.' }
  }

  // Rezervăm emiterea cu un marcaj unic: două apeluri simultane nu pot câștiga amândouă.
  const token = `${INVOICE_PENDING}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  let claim = sb.from('brand_transactions').update({ smartbill_invoice_number: token }).eq('id', txId)
  claim = current === null ? claim.is('smartbill_invoice_number', null) : claim.eq('smartbill_invoice_number', current)
  const { data: claimed } = await claim.select('id')
  if (!claimed?.length) return { ok: false, error: 'Factura a fost deja emisă sau se emite acum.' }

  const { data: brand } = await sb.from('brands').select('*').eq('id', tx.brand_id).maybeSingle()
  const billing = (tx.billing_details || {}) as Record<string, string>
  const amount = Number(tx.amount)
  try {
    const r = await createSmartBillInvoice({
      clientName: (billing.name || brand?.name || 'Client AddFame').trim(),
      clientCif: billing.vat || undefined,
      clientRegCom: billing.reg_com || undefined,
      clientAddress: billing.address || undefined,
      clientCity: billing.city || brand?.city || undefined,
      clientEmail: billing.email || brand?.email || '',
      amountRon: amount,
      description: `Credite publicitare prepaid — platforma AddFame (${amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON)`,
    })
    await sb.from('brand_transactions').update({ smartbill_invoice_number: r.smartbillNumber }).eq('id', txId).eq('smartbill_invoice_number', token)
    console.log(`[SmartBill] Factura emisă: ${r.smartbillNumber} — ${amount} RON`)
    return { ok: true, number: r.smartbillNumber }
  } catch (e: any) {
    // Refuz clar de la SmartBill → nu există factură, se poate reîncerca.
    // Fără răspuns clar (timeout, rețea) → poate exista: marcăm „de verificat”.
    const definite = e?.definite === true
    await sb.from('brand_transactions').update({ smartbill_invoice_number: definite ? null : INVOICE_CHECK })
      .eq('id', txId).eq('smartbill_invoice_number', token)
    console.error('[SmartBill] Eroare factură:', definite ? 'refuzată' : 'rezultat nesigur', e?.message)
    return {
      ok: false,
      error: definite ? (e?.message || 'Eroare SmartBill')
        : 'SmartBill nu a răspuns clar. Verifică în SmartBill dacă factura s-a emis înainte să încerci din nou.',
    }
  }
}

/**
 * Confirmă plata, adaugă creditele, anunță brandul (notificare + email) și emite factura.
 * Totul se face înainte de a răspunde (pe Vercel, ce rulează după răspuns se poate opri).
 */
export async function finalizeTopup(sb: SupabaseClient, txId: string): Promise<FinalizeResult> {
  const c = await confirmTopup(sb, txId)
  if (!c.ok || !c.brandId) return c
  const amount = Number(c.amount), newBalance = Number(c.newBalance)

  const invoice = await issueTopupInvoice(sb, txId)
  const invoiceNo = invoice.ok ? invoice.number ?? null : null

  const { data: brand } = await sb.from('brands').select('user_id, name, email').eq('id', c.brandId).maybeSingle()
  const ron = amount.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (brand?.user_id) {
    try {
      await sb.from('notifications').insert({
        user_id: brand.user_id,
        title: '✅ Credite adăugate în cont',
        body: `${ron} RON au fost adăugați în wallet. Valabili 6 luni.${invoiceNo ? ` Factura ${invoiceNo} e în Wallet → Istoric.` : ''}`,
        link: '/brand/wallet',
        read: false,
      })
    } catch { /* notificarea nu blochează plata */ }
  }
  if (brand?.email) {
    try { await emailTopupConfirmed(brand.email, brand.name || 'Brand', amount, newBalance) } catch { /* idem */ }
  }

  return { ...c, invoice: invoiceNo, invoiceError: invoice.ok ? null : invoice.error ?? null }
}
