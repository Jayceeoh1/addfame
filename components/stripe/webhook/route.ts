import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] Invalid signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const brandId = pi.metadata.brand_id
    const amount = parseFloat(pi.metadata.amount_ron)
    const invoiceNumber = pi.metadata.invoice_number

    if (!brandId || !amount) {
      console.error('[webhook] Missing metadata', pi.metadata)
      return NextResponse.json({ ok: true })
    }

    // Marchează tranzacția completată
    await supabase
      .from('brand_transactions')
      .update({ status: 'completed' })
      .eq('stripe_payment_intent_id', pi.id)

    // Adaugă creditele brandului
    const { data: brand } = await supabase
      .from('brands')
      .select('credits_balance, credits_expires_at, user_id, name')
      .eq('id', brandId)
      .single()

    if (brand) {
      const newBalance = (brand.credits_balance || 0) + amount
      const newExpiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()

      await supabase.from('brands').update({
        credits_balance: newBalance,
        credits_expires_at: newExpiresAt,
        credits_loaded_at: new Date().toISOString(),
      }).eq('id', brandId)

      // Notificare în platformă
      await supabase.from('notifications').insert({
        user_id: brand.user_id,
        title: '✅ Plată confirmată! Credite adăugate.',
        body: `${amount.toLocaleString('ro-RO')} RON credite au fost adăugate în contul tău AddFame. Valabile 6 luni. Factură: ${invoiceNumber}`,
        link: '/brand/wallet',
        read: false,
      })

      console.log(`[webhook] ✅ ${amount} RON credite adăugate pentru brand ${brandId}`)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent

    await supabase
      .from('brand_transactions')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)

    const brandId = pi.metadata.brand_id
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('user_id')
        .eq('id', brandId)
        .single()

      if (brand) {
        await supabase.from('notifications').insert({
          user_id: brand.user_id,
          title: '❌ Plată eșuată',
          body: `Plata cu cardul a eșuat. Verifică datele cardului și încearcă din nou.`,
          link: '/brand/wallet',
          read: false,
        })
      }
    }

    console.log(`[webhook] ❌ Plată eșuată pentru PaymentIntent ${pi.id}`)
  }

  return NextResponse.json({ ok: true })
}