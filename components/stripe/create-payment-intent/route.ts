import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount } = await req.json()

    if (!amount || amount < 50 || amount > 250000)
      return NextResponse.json({ error: 'Sumă invalidă. Minim 50 RON, maxim 250.000 RON.' }, { status: 400 })

    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, email, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!brand) return NextResponse.json({ error: 'Brand negăsit.' }, { status: 404 })

    // Creează sau refolosește Stripe Customer
    let customerId = brand.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: brand.email,
        name: brand.name,
        metadata: { brand_id: brand.id, user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('brands').update({ stripe_customer_id: customerId }).eq('id', brand.id)
    }

    // Generează număr factură
    const now = new Date()
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const { count } = await supabase
      .from('brand_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
    const invoiceNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`

    // Creează PaymentIntent în RON (Stripe folosește bani — RON * 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // RON → bani
      currency: 'ron',
      customer: customerId,
      setup_future_usage: 'off_session', // salvează cardul pentru plăți viitoare
      metadata: {
        brand_id: brand.id,
        user_id: user.id,
        invoice_number: invoiceNumber,
        amount_ron: amount.toString(),
      },
      description: `AddFame credite — ${amount.toLocaleString('ro-RO')} RON`,
    })

    // Creează tranzacția pending în DB
    await supabase.from('brand_transactions').insert({
      brand_id: brand.id,
      type: 'TOPUP',
      amount,
      description: `Încărcare credite via card Stripe — ${amount.toLocaleString('ro-RO')} RON`,
      status: 'pending',
      payment_method: 'stripe_card',
      invoice_number: invoiceNumber,
      stripe_payment_intent_id: paymentIntent.id,
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      invoice_number: invoiceNumber,
      payment_intent_id: paymentIntent.id,
    })
  } catch (err: any) {
    console.error('[create-payment-intent]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}