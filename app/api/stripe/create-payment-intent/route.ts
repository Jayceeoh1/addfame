// Plata cu cardul (Stripe) pentru încărcarea creditelor.
// Tranzacția se creează DOAR în webhook, după ce Stripe confirmă plata (vezi /api/stripe/webhook).
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { randomInt } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTopupAmount, cleanBilling, billingToMetadata, makeTopupReference, TOPUP_MIN, TOPUP_MAX } from '@/lib/topup'

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'payment-intent', LIMITS.payment); if (limited) return limited }
  try {
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Plata cu cardul nu este activă încă.' }, { status: 503 })
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

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
    const { data: brand } = await admin.from('brands')
      .select('id, name, email, stripe_customer_id, verification_status').eq('user_id', user.id).maybeSingle()
    if (!brand) return NextResponse.json({ error: 'Brand negăsit.' }, { status: 404 })
    if (brand.verification_status !== 'verified')
      return NextResponse.json({ error: 'Contul tău nu este verificat încă. Verificarea este necesară înainte de a adăuga credite.' }, { status: 403 })

    // Clientul Stripe al brandului (o singură dată)
    let customerId = brand.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: brand.email || undefined, name: billing.name || brand.name || undefined,
        metadata: { brand_id: brand.id },
      })
      customerId = customer.id
      await admin.from('brands').update({ stripe_customer_id: customerId }).eq('id', brand.id)
    }

    const reference = makeTopupReference(new Date(), () => randomInt(0, 1_000_000) / 1_000_000)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'ron',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      description: `AddFame — încărcare credite ${amount.toLocaleString('ro-RO')} RON (${reference})`,
      statement_descriptor_suffix: 'CREDITE',
      metadata: {
        type: 'TOPUP',
        brand_id: brand.id,
        user_id: user.id,
        invoice_number: reference,
        amount_ron: amount.toFixed(2),
        billing: billingToMetadata(billing),
      },
    })

    return NextResponse.json({ client_secret: paymentIntent.client_secret, invoice_number: reference })
  } catch (err: any) {
    console.error('[create-payment-intent]', err?.message)
    return NextResponse.json({ error: 'Nu am putut pregăti plata. Încearcă din nou.' }, { status: 500 })
  }
}
