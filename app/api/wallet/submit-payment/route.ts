import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomInt } from 'crypto'
import { makeTopupReference, parseTopupAmount, TOPUP_MIN, TOPUP_MAX } from '@/lib/topup'
import { REVOLUT, WISE, PAYPAL, CRYPTO } from '@/lib/payment-config'

// Metodele de plată acceptate acum (transferul bancar e mereu activ)
const ACTIVE_METHODS = new Set([
  'bank_transfer',
  ...(REVOLUT.active ? ['revolut'] : []), ...(WISE.active ? ['wise'] : []),
  ...(PAYPAL.active ? ['paypal'] : []), ...(CRYPTO.active ? ['crypto'] : []),
])

// Simple in-memory rate limiter
const rateMap = new Map<string, { count: number; reset: number }>()
const LIMIT = 5
const WINDOW = 60_000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.reset) { rateMap.set(key, { count: 1, reset: now + WINDOW }); return true }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'submit-payment', LIMITS.payment); if (limited) return limited }
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!checkRateLimit(user.id))
      return NextResponse.json({ error: 'Prea multe cereri. Încearcă din nou în câteva minute.' }, { status: 429 })

    const body = await req.json().catch(() => ({}))
    const { method } = body
    const amount = parseTopupAmount(body.amount)

    // Validare sumă în RON (minim 50 RON, maxim 250.000 RON)
    if (amount === null)
      return NextResponse.json({ error: `Sumă invalidă. Trebuie să fie între ${TOPUP_MIN} și ${TOPUP_MAX.toLocaleString('ro-RO')} RON.` }, { status: 400 })
    if (!method || !ACTIVE_METHODS.has(method))
      return NextResponse.json({ error: 'Metoda de plată nu este disponibilă.' }, { status: 400 })

    // Datele de facturare (pe factura SmartBill)
    const b = body.billing || {}
    const clean = (v: unknown, max = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
    const billing = {
      type: b.type === 'pf' ? 'pf' : 'pj',
      name: clean(b.name),
      vat: clean(b.vat, 20).toUpperCase(),
      reg_com: clean(b.reg_com, 40).toUpperCase(),
      address: clean(b.address, 300),
      city: clean(b.city, 80),
    }
    if (!billing.name) return NextResponse.json({ error: 'Completează numele pentru factură.' }, { status: 400 })
    if (billing.type === 'pj' && (!billing.vat || !billing.address))
      return NextResponse.json({ error: 'Pentru firmă sunt obligatorii CUI-ul și adresa sediului.' }, { status: 400 })

    const { data: brand } = await supabase
      .from('brands').select('id, name, email, verification_status').eq('user_id', user.id).single()
    if (!brand) return NextResponse.json({ error: 'Brand negăsit.' }, { status: 404 })

    if (brand.verification_status !== 'verified')
      return NextResponse.json({ error: 'Contul tău nu este verificat încă. Verificarea este necesară înainte de a adăuga credite.' }, { status: 403 })

    // Referința de transfer: unică pentru fiecare cerere (o verifică adminul în extrasul bancar)
    const invoiceNumber = makeTopupReference(new Date(), () => randomInt(0, 1_000_000) / 1_000_000)

    const { data: tx, error: txError } = await supabase
      .from('brand_transactions')
      .insert({
        brand_id: brand.id,
        type: 'TOPUP',
        amount,
        description: `Încărcare credite prin transfer bancar — ${amount.toLocaleString('ro-RO')} RON`,
        status: 'pending',
        payment_method: method,
        payment_reference: invoiceNumber,
        invoice_number: invoiceNumber,
        billing_details: billing,
      })
      .select('id, invoice_number, created_at')
      .single()

    if (txError) throw txError

    return NextResponse.json({
      success: true,
      transaction_id: tx.id,
      invoice_number: tx.invoice_number,
      created_at: tx.created_at,
      brand_name: brand.name,
      brand_email: brand.email,
      amount,
      method,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
