// Plata cu cardul (Stripe) pentru încărcarea creditelor.
// Tranzacția se creează DOAR în webhook, după ce Stripe confirmă plata (vezi /api/stripe/webhook).
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { randomInt } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTopupAmount, cleanBilling, billingToMetadata, makeTopupReference, TOPUP_MIN, TOPUP_MAX } from '@/lib/topup'

/** Mesaj sigur pentru erorile Stripe (fără chei sau date sensibile). */
function stripeErrorMessage(err: any): string {
  const type = String(err?.type || '')
  const code = String(err?.code || '')
  if (type === 'StripeAuthenticationError') return 'Cheia Stripe din Vercel nu este validă (STRIPE_SECRET_KEY).'
  if (type === 'StripePermissionError') return 'Cheia Stripe nu are permisiunile necesare (PaymentIntents / Customers: Write).'
  if (code) return `Stripe: ${code}`
  return 'Nu am putut pregăti plata. Încearcă din nou.'
}

/** Clientul Stripe al brandului. Dacă ID-ul salvat nu mai există (ex. creat cu cheia de test), facem altul. */
async function ensureCustomer(stripe: Stripe, admin: ReturnType<typeof createAdminClient>, brand: any, billingName: string) {
  const saved = brand.stripe_customer_id as string | null
  if (saved) {
    try {
      const c = await stripe.customers.retrieve(saved)
      if (!(c as any).deleted) return saved
    } catch (e: any) {
      if (e?.code !== 'resource_missing') throw e
    }
  }
  try {
    const customer = await stripe.customers.create({
      email: brand.email || undefined,
      name: billingName || brand.name || undefined,
      metadata: { brand_id: brand.id },
    })
    await admin.from('brands').update({ stripe_customer_id: customer.id }).eq('id', brand.id)
    return customer.id
  } catch (e: any) {
    // Plata merge și fără client Stripe — nu blocăm brandul pentru asta.
    console.warn('[create-payment-intent] client Stripe necreat:', e?.type, e?.code, e?.message)
    return null
  }
}

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'payment-intent', LIMITS.payment); if (limited) return limited }
  try {
    const key = (process.env.STRIPE_SECRET_KEY || '').trim()
    if (!key) return NextResponse.json({ error: 'Plata cu cardul nu este activă încă.' }, { status: 503 })
    const stripe = new Stripe(key)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const amount = parseTopupAmount(body.amount)
    if (amount === null)
      return NextResponse.json({ error: `Sumă invalidă. Între ${TOPUP_MIN} și ${TOPUP_MAX.toLocaleString('ro-RO')} RON.` }, { status: 400 })
    const { billing, error: billingError } = cleanBilling(body.billing)
    if (billingError) return NextResponse.json({ error: billingError }, { status: 400 })

    const admin = createAdminClient()
    let { data: brand, error: brandErr } = await admin.from('brands')
      .select('id, name, email, stripe_customer_id, verification_status').eq('user_id', user.id).maybeSingle()
    if (brandErr) {
      // coloana stripe_customer_id poate lipsi în baza de date
      const r = await admin.from('brands').select('id, name, email, verification_status').eq('user_id', user.id).maybeSingle()
      brand = r.data as any
    }
    if (!brand) return NextResponse.json({ error: 'Brand negăsit.' }, { status: 404 })
    if (brand.verification_status !== 'verified')
      return NextResponse.json({ error: 'Contul tău nu este verificat încă. Verificarea este necesară înainte de a adăuga credite.' }, { status: 403 })

    const customerId = await ensureCustomer(stripe, admin, brand, billing.name)

    const reference = makeTopupReference(new Date(), () => randomInt(0, 1_000_000) / 1_000_000)
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: 'ron',
      ...(customerId ? { customer: customerId } : {}),
      payment_method_types: ['card'],
      description: `AddFame - incarcare credite ${amount.toFixed(2)} RON (${reference})`,
      metadata: {
        type: 'TOPUP',
        brand_id: brand.id,
        user_id: user.id,
        invoice_number: reference,
        amount_ron: amount.toFixed(2),
        billing: billingToMetadata(billing),
      },
    }
    const paymentIntent = await stripe.paymentIntents.create(params)

    return NextResponse.json({ client_secret: paymentIntent.client_secret, invoice_number: reference })
  } catch (err: any) {
    console.error('[create-payment-intent]', err?.type, err?.code, err?.message)
    return NextResponse.json({ error: stripeErrorMessage(err) }, { status: 500 })
  }
}
