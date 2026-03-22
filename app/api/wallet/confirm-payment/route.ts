// Admin-only route: confirmă manual o plată după verificare
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { transaction_id } = await req.json()
  if (!transaction_id)
    return NextResponse.json({ error: 'transaction_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tx } = await supabase
    .from('brand_transactions')
    .select('brand_id, amount, status')
    .eq('id', transaction_id)
    .single()

  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  if (tx.status === 'completed') return NextResponse.json({ message: 'Already completed' })

  // Marchează tranzacția completată
  await supabase.from('brand_transactions')
    .update({ status: 'completed' })
    .eq('id', transaction_id)

  // Adaugă creditele în contul brandului
  const { data: brand } = await supabase
    .from('brands')
    .select('credits_balance, credits_expires_at')
    .eq('id', tx.brand_id)
    .single()

  const currentBalance = brand?.credits_balance ?? 0
  const newBalance = currentBalance + tx.amount

  // Calculează noua dată de expirare:
  // - Dacă nu are credite sau au expirat → 6 luni de acum
  // - Dacă are deja credite → prelungim cu 6 luni de la data actuală (cea mai recentă)
  const newExpiresAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('brands').update({
    credits_balance: newBalance,
    credits_expires_at: newExpiresAt,
    credits_loaded_at: new Date().toISOString(),
  }).eq('id', tx.brand_id)

  // Notifică brandul
  const { data: brandFull } = await supabase
    .from('brands').select('user_id, name').eq('id', tx.brand_id).single()

  if (brandFull) {
    await supabase.from('notifications').insert({
      user_id: brandFull.user_id,
      title: '✅ Credite adăugate în cont!',
      body: `${tx.amount.toLocaleString('ro-RO')} RON credite au fost adăugate în contul tău AddFame. Valabile 6 luni.`,
      link: '/brand/wallet',
      read: false,
    })
  }

  return NextResponse.json({
    success: true,
    new_balance: newBalance,
    expires_at: newExpiresAt,
  })
}