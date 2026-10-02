import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const BADGE_MONTHLY_PRICE = 50

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, email, is_verified, badge_expires_at, stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

    const isActive = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
    if (isActive) return NextResponse.json({ error: 'Abonamentul tău este deja activ.' }, { status: 400 })

    // Creează sau refolosește Stripe Customer
    let customerId = inf.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: inf.name,
        metadata: { influencer_id: inf.id, user_id: user.id },
      })
      customerId = customer.id
      await admin.from('influencers').update({ stripe_customer_id: customerId }).eq('id', inf.id)
    }

    // Creează PaymentIntent — 50 RON = 5000 bani
    const paymentIntent = await stripe.paymentIntents.create({
      amount: BADGE_MONTHLY_PRICE * 100,
      currency: 'ron',
      customer: customerId,
      setup_future_usage: 'off_session',
      metadata: {
        type: 'BADGE_PURCHASE',
        influencer_id: inf.id,
        user_id: user.id,
        amount_ron: BADGE_MONTHLY_PRICE.toString(),
      },
      description: `Verified Creator — abonament lunar AddFame`,
    })

    return NextResponse.json({ client_secret: paymentIntent.client_secret })
  } catch (e: any) {
    console.error('[badge-stripe]', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
