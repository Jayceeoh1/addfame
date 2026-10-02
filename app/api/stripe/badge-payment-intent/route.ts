import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const BADGE_PRICE_RON = 50

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

    // Verifică că e influencer
    const { data: influencer } = await supabase
      .from('influencers')
      .select('id, name, email, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!influencer) return NextResponse.json({ error: 'Influencer negăsit.' }, { status: 404 })

    // Creează sau refolosește Stripe Customer
    let customerId = influencer.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: influencer.email || user.email,
        name: influencer.name,
        metadata: { influencer_id: influencer.id, user_id: user.id, type: 'influencer' },
      })
      customerId = customer.id
      await supabase.from('influencers').update({ stripe_customer_id: customerId }).eq('id', influencer.id)
    }

    // Creează PaymentIntent pentru badge (50 RON)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: BADGE_PRICE_RON * 100, // bani
      currency: 'ron',
      customer: customerId,
      metadata: {
        influencer_id: influencer.id,
        user_id: user.id,
        type: 'BADGE_PURCHASE',
        amount_ron: String(BADGE_PRICE_RON),
      },
      description: `AddFame Verified Creator Badge — ${BADGE_PRICE_RON} RON/lună`,
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    })
  } catch (err: any) {
    console.error('[badge-payment-intent]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
