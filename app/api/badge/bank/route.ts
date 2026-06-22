import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BADGE_PRICE = 19

export async function POST(req: NextRequest) {
  try {
    const { billingName, billingAddress } = await req.json()
    if (!billingName?.trim()) return NextResponse.json({ error: 'Numele este obligatoriu.' }, { status: 400 })

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
      .select('id, name, email, is_verified')
      .eq('user_id', user.id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })
    if (inf.is_verified) return NextResponse.json({ error: 'Already a Verified Creator' }, { status: 400 })

    const now = new Date()
    const prefix = `BADGE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'BADGE_PENDING')

    const invoiceNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'BADGE_PENDING',
      amount: -BADGE_PRICE,
      description: `Verified Creator badge — transfer bancar (${invoiceNumber})`,
      status: 'pending',
      billing_details: { name: billingName, address: billingAddress || '' },
    })

    return NextResponse.json({
      success: true,
      invoiceNumber,
      amount: BADGE_PRICE,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}