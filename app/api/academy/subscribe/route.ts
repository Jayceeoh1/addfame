// Pornește abonamentul Academy Member: Stripe Checkout (card), 200 lei / lună, reînnoire automată.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACADEMY_PRICE_RON, ACADEMY_BADGE_LABEL, isAcademyMember } from '@/lib/academy-member'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Intră în contul de creator.' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    if (body?.accept !== true) {
      return NextResponse.json({ error: 'Bifează acordul pentru acces imediat la cursuri și termenii abonamentului.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: inf, error } = await admin.from('influencers')
      .select('id, name, email, stripe_customer_id, is_verified, badge_expires_at, academy_sub_id, academy_sub_status')
      .eq('user_id', user.id).maybeSingle()
    if (error) return NextResponse.json({ error: /academy_sub/.test(error.message) ? 'Rulează întâi SQL 64 (Academy Member).' : error.message }, { status: 500 })
    if (!inf) return NextResponse.json({ error: 'Contul de creator nu există.' }, { status: 404 })
    if (inf.academy_sub_id && ['active', 'trialing', 'past_due'].includes(String(inf.academy_sub_status)) && isAcademyMember(inf)) {
      return NextResponse.json({ error: 'Ai deja abonamentul Academy Member activ.' }, { status: 400 })
    }

    let customerId = inf.stripe_customer_id as string | null
    if (!customerId) {
      const c = await stripe.customers.create({
        email: inf.email || user.email || undefined,
        name: inf.name || undefined,
        metadata: { influencer_id: inf.id, user_id: user.id, type: 'influencer' },
      })
      customerId = c.id
      await admin.from('influencers').update({ stripe_customer_id: customerId }).eq('id', inf.id)
    }

    // Acordul pentru acces imediat la conținut digital (fără drept de retragere după începerea accesului)
    await admin.from('influencers').update({ academy_terms_accepted_at: new Date().toISOString() }).eq('id', inf.id)

    const meta = { type: 'ACADEMY', influencer_id: inf.id, user_id: user.id }
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      locale: 'ro',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'ron',
          unit_amount: ACADEMY_PRICE_RON * 100,
          recurring: { interval: 'month' },
          product_data: { name: `AddFame Academy — ${ACADEMY_BADGE_LABEL}`, description: 'Abonament lunar: cursuri noi în fiecare luni, feedback și bifa Academy Member.' },
        },
      }],
      metadata: meta,
      subscription_data: { metadata: meta },
      success_url: `${APP_URL}/influencer/academie?abonament=ok`,
      cancel_url: `${APP_URL}/influencer/academie?abonament=renuntat`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[academy/subscribe]', e?.message)
    return NextResponse.json({ error: 'Nu am putut porni plata. Încearcă din nou.' }, { status: 500 })
  }
}
