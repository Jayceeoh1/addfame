// Admin-only route: confirmă manual o plată după verificare
// (același drum ca butonul „Confirmă” din Admin → Plăți: credite atomic + factură SmartBill ADDF)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { finalizeTopup } from '@/lib/topup'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!process.env.ADMIN_SECRET_KEY || adminKey !== process.env.ADMIN_SECRET_KEY)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { transaction_id } = await req.json().catch(() => ({}))
  if (!transaction_id)
    return NextResponse.json({ error: 'transaction_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const r = await finalizeTopup(supabase, transaction_id)
  if (!r.ok) {
    if (r.error === 'already_completed') return NextResponse.json({ message: 'Already completed' })
    if (r.error === 'not_found') return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    return NextResponse.json({ error: r.error || 'Eroare' }, { status: 400 })
  }
  return NextResponse.json({
    success: true,
    new_balance: r.newBalance,
    invoice: r.invoice,
    invoice_error: r.invoiceError,
  })
}
