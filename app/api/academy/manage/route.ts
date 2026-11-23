// Anulează sau reactivează abonamentul Academy Member. Anularea oprește doar reînnoirea:
// accesul și bifa rămân până la sfârșitul lunii plătite.
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Intră în contul de creator.' }, { status: 401 })
    const { action } = await req.json().catch(() => ({}))
    if (action !== 'cancel' && action !== 'resume') return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })

    const admin = createAdminClient()
    const { data: inf } = await admin.from('influencers').select('id, academy_sub_id, academy_sub_status').eq('user_id', user.id).maybeSingle()
    if (!inf?.academy_sub_id || inf.academy_sub_status === 'canceled') {
      return NextResponse.json({ error: 'Nu ai un abonament Academy activ.' }, { status: 400 })
    }
    const sub = await stripe.subscriptions.update(inf.academy_sub_id, { cancel_at_period_end: action === 'cancel' })
    await admin.from('influencers').update({ academy_cancel_at_period_end: sub.cancel_at_period_end, academy_sub_status: sub.status }).eq('id', inf.id)
    return NextResponse.json({ ok: true, canceling: sub.cancel_at_period_end })
  } catch (e: any) {
    console.error('[academy/manage]', e?.message)
    return NextResponse.json({ error: 'Nu am putut actualiza abonamentul. Încearcă din nou.' }, { status: 500 })
  }
}
