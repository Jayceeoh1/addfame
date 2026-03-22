import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  // Verificare secret cron
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Găsește brandurile cu credite expirate
    const { data: expiredBrands } = await admin
      .from('brands')
      .select('id, name, credits_balance, credits_expires_at')
      .lt('credits_expires_at', new Date().toISOString())
      .gt('credits_balance', 0)

    if (!expiredBrands || expiredBrands.length === 0) {
      return NextResponse.json({ success: true, expired: 0 })
    }

    let expiredCount = 0

    for (const brand of expiredBrands) {
      const expiredAmount = brand.credits_balance

      // Setează credite la 0
      await admin.from('brands').update({
        credits_balance: 0,
        credits_reserved: 0,
        credits_expires_at: null,
        credits_loaded_at: null,
      }).eq('id', brand.id)

      // Înregistrează tranzacția de expirare
      await admin.from('transactions').insert({
        brand_id: brand.id,
        type: 'EXPIRE',
        amount: -expiredAmount,
        description: `Credite expirate (6 luni fără utilizare) — ${expiredAmount.toLocaleString('ro-RO')} RON`,
        status: 'completed',
      })

      // Notifică brandul
      const { data: brandUser } = await admin
        .from('brands')
        .select('user_id')
        .eq('id', brand.id)
        .single()

      if (brandUser) {
        await admin.from('notifications').insert({
          user_id: brandUser.user_id,
          title: '⚠️ Creditele tale au expirat',
          body: `${expiredAmount.toLocaleString('ro-RO')} RON credite au expirat după 6 luni de neutilizare. Încarcă credite noi pentru a lansa campanii.`,
          link: '/brand/wallet',
          read: false,
        })
      }

      expiredCount++
    }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      message: `${expiredCount} branduri cu credite expirate procesate.`
    })

  } catch (e: any) {
    console.error('[expire-credits cron]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
