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

  // ── Plată reușită ─────────────────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent

    // ── Badge purchase pentru influencer ─────────────────────────────────
    if (pi.metadata.type === 'BADGE_PURCHASE') {
      const influencerId = pi.metadata.influencer_id
      if (influencerId) {
        const { data: inf } = await supabase
          .from('influencers')
          .select('id, user_id, badge_expires_at')
          .eq('id', influencerId)
          .single()

        if (inf) {
          const now = new Date()
          const currentExpiry = inf.badge_expires_at ? new Date(inf.badge_expires_at) : null
          const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now
          const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

          await supabase.from('influencers').update({
            is_verified: true,
            badge_expires_at: newExpiry,
            verified_at: now.toISOString(),
          }).eq('id', influencerId)

          await supabase.from('notifications').insert({
            user_id: inf.user_id,
            title: '⭐ Badge Verified Creator activat!',
            body: `Badge-ul tău este activ până pe ${new Date(newExpiry).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}. Profilul tău apare primul la branduri!`,
            link: '/influencer/settings?tab=verified',
            read: false,
          })

          console.log(`[webhook] ⭐ Badge activat pentru influencer ${influencerId} până pe ${newExpiry}`)
        }
      }
      return NextResponse.json({ ok: true })
    }

    // ── Top-up credite brand ──────────────────────────────────────────────
    const brandId = pi.metadata.brand_id
    const amount = parseFloat(pi.metadata.amount_ron)
    const invoiceNumber = pi.metadata.invoice_number

    if (!brandId || !amount) {
      console.error('[webhook] Missing metadata', pi.metadata)
      return NextResponse.json({ ok: true })
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('credits_balance, credits_expires_at, user_id, name')
      .eq('id', brandId)
      .single()

    if (!brand) {
      console.error('[webhook] Brand not found:', brandId)
      return NextResponse.json({ ok: true })
    }

    // Verifică dacă tranzacția există deja (webhook poate fi trimis de 2x)
    const { data: existing } = await supabase
      .from('brand_transactions')
      .select('id')
      .eq('stripe_payment_intent_id', pi.id)
      .maybeSingle()

    if (!existing) {
      // FIX: Creăm tranzacția DOAR acum, când plata e confirmată
      await supabase.from('brand_transactions').insert({
        brand_id: brandId,
        type: 'TOPUP',
        amount,
        description: `Încărcare credite via card Stripe — ${amount.toLocaleString('ro-RO')} RON`,
        status: 'completed',
        payment_method: 'stripe_card',
        invoice_number: invoiceNumber,
        stripe_payment_intent_id: pi.id,
      })
    } else {
      // Dacă există deja (creat din altă parte), doar o marcăm completed
      await supabase
        .from('brand_transactions')
        .update({ status: 'completed' })
        .eq('stripe_payment_intent_id', pi.id)
    }

    // Adaugă creditele brandului
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

  // ── Plată eșuată (card invalid, fonduri insuficiente etc.) ────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent

    // Dacă există o tranzacție pending (creat din cod vechi), o marcăm failed
    await supabase
      .from('brand_transactions')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', pi.id)
      .eq('status', 'pending')

    // Notificare brand
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

  // ── Plată anulată (brandul a dat cancel sau a închis fereastra) ───────────
  if (event.type === 'payment_intent.canceled') {
    const pi = event.data.object as Stripe.PaymentIntent

    // Dacă există o tranzacție pending (din cod vechi), o ștergem complet
    // — nu are sens să apară în admin ca o plată reală
    await supabase
      .from('brand_transactions')
      .delete()
      .eq('stripe_payment_intent_id', pi.id)
      .eq('status', 'pending')

    console.log(`[webhook] 🚫 PaymentIntent anulat și tranzacție ștearsă: ${pi.id}`)
  }

  // ── PaymentIntent expirat (neutilizat după ~24h) ──────────────────────────
  if (event.type === 'payment_intent.expired' as any) {
    const pi = event.data.object as Stripe.PaymentIntent

    await supabase
      .from('brand_transactions')
      .delete()
      .eq('stripe_payment_intent_id', pi.id)
      .eq('status', 'pending')

    console.log(`[webhook] ⏰ PaymentIntent expirat și tranzacție ștearsă: ${pi.id}`)
  }

  return NextResponse.json({ ok: true })
}
