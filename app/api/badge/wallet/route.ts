import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BADGE_MONTHLY_PRICE = 10

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
      .select('id, name, wallet_balance, is_verified, badge_expires_at, verified_at')
      .eq('user_id', user.id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

    const isActive = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
    if (isActive) return NextResponse.json({ error: 'Abonamentul tău este deja activ.' }, { status: 400 })

    if ((inf.wallet_balance || 0) < BADGE_MONTHLY_PRICE) {
      return NextResponse.json({
        error: `Sold insuficient. Ai ${(inf.wallet_balance || 0).toFixed(2)} RON, necesar ${BADGE_MONTHLY_PRICE} RON.`,
        insufficientFunds: true,
      }, { status: 400 })
    }

    const now = new Date()
    const currentExpiry = inf.badge_expires_at ? new Date(inf.badge_expires_at) : now
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + 1)

    await admin.from('influencers').update({
      is_verified: true,
      verified_at: inf.verified_at || now.toISOString(),
      badge_expires_at: newExpiry.toISOString(),
      wallet_balance: (inf.wallet_balance || 0) - BADGE_MONTHLY_PRICE,
    }).eq('id', inf.id)

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'SPEND',
      amount: -BADGE_MONTHLY_PRICE,
      description: `Verified Creator — abonament lunar (expiră ${newExpiry.toLocaleDateString('ro-RO')})`,
      status: 'completed',
    })

    try {
      await admin.from('platform_revenue').insert({
        amount: BADGE_MONTHLY_PRICE,
        type: 'badge_subscription',
        description: `Verified Creator abonament: ${inf.name}`,
      })
    } catch (_) { }

    await admin.from('notifications').insert({
      user_id: user.id,
      title: '⭐ Verified Creator activ!',
      body: `Profilul tău apare primul la branduri până pe ${newExpiry.toLocaleDateString('ro-RO')}.`,
      link: '/influencer/settings',
      read: false,
    })

    return NextResponse.json({ success: true, expiresAt: newExpiry.toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}