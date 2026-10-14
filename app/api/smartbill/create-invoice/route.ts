/**
 * POST /api/smartbill/create-invoice
 * Emite factura SmartBill (seria ADDF) pentru o plată confirmată, dacă nu are deja.
 * Intern — necesită ADMIN_SECRET_KEY în header. (Facturile se emit automat la confirmare;
 * ruta rămâne pentru reîncercări manuale.)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { issueTopupInvoice } from '@/lib/topup'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!process.env.ADMIN_SECRET_KEY || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { transaction_id, force } = await req.json().catch(() => ({}))
  if (!transaction_id) return NextResponse.json({ error: 'transaction_id required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const r = await issueTopupInvoice(supabase, transaction_id, { confirmedMissing: !!force })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ success: true, already_exists: !!r.existing, smartbill_number: r.number })
}
