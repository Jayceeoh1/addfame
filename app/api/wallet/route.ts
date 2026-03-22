import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BADGE_PRICE = 19

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, wallet_balance, is_verified')
      .eq('user_id', user.id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
    if (inf.is_verified) return NextResponse.json({ error: 'Already a Verified Creator' }, { status: 400 })
    if ((inf.wallet_balance || 0) < BADGE_PRICE) {
      return NextResponse.json({
        error: `Sold insuficient. Ai €${(inf.wallet_balance || 0).toFixed(2)}, necesar €${BADGE_PRICE}.`,
        insufficientFunds: true,
      }, { status: 400 })
    }

    await admin.from('influencers').update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      wallet_balance: (inf.wallet_balance || 0) - BADGE_PRICE,
    }).eq('id', inf.id)

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'SPEND',
      amount: -BADGE_PRICE,
      description: 'Verified Creator badge — plată din wallet',
      status: 'completed',
    })

    try {
      await admin.from('platform_revenue').insert({
        amount: BADGE_PRICE,
        type: 'badge_fee',
        description: `Verified Creator badge (wallet): ${inf.name}`,
      })
    } catch (_) { }

    await admin.from('notifications').insert({
      user_id: user.id,
      title: '⭐ Ești acum Verified Creator!',
      body: 'Profilul tău apare primul în lista de influenceri pentru branduri.',
      link: '/influencer/settings',
      read: false,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
