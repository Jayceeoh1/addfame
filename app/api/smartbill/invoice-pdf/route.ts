/**
 * POST /api/smartbill/create-invoice
 *
 * Endpoint intern — apelat din:
 * 1. stripe webhook (plată card confirmată)
 * 2. confirm-payment route (transfer bancar confirmat manual de admin)
 *
 * NU e expus public — necesită ADMIN_SECRET_KEY în header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSmartBillInvoice } from '@/lib/smartbill'

export async function POST(req: NextRequest) {
  // Autentificare internă
  const adminKey = req.headers.get('x-admin-key')
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { transaction_id } = await req.json()
  if (!transaction_id) {
    return NextResponse.json({ error: 'transaction_id required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Citim tranzacția + datele brandului
  const { data: tx } = await supabase
    .from('brand_transactions')
    .select(`
      id, amount, status, smartbill_invoice_number,
      billing_details,
      brand:brands (
        id, name, email, user_id
      )
    `)
    .eq('id', transaction_id)
    .single()

  if (!tx) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  // Nu emitem factură dacă deja există
  if (tx.smartbill_invoice_number) {
    return NextResponse.json({
      success: true,
      already_exists: true,
      smartbill_number: tx.smartbill_invoice_number,
    })
  }

  const brand = tx.brand as any
  const billing = tx.billing_details as any

  try {
    const result = await createSmartBillInvoice({
      clientName: billing?.name || brand.name,
      clientCif: billing?.vat || undefined,
      clientAddress: billing?.address || undefined,
      clientEmail: brand.email,
      amountRon: tx.amount,
      description: `Credite publicitare prepaid — platformă AddFame (${tx.amount.toLocaleString('ro-RO')} RON)`,
    })

    // Salvăm numărul SmartBill pe tranzacție
    await supabase
      .from('brand_transactions')
      .update({ smartbill_invoice_number: result.smartbillNumber })
      .eq('id', transaction_id)

    console.log(`[SmartBill] ✅ Factură emisă: ${result.smartbillNumber} pentru ${brand.name} — ${tx.amount} RON`)

    return NextResponse.json({
      success: true,
      smartbill_number: result.smartbillNumber,
      series: result.series,
      number: result.number,
    })
  } catch (err: any) {
    console.error('[SmartBill] ❌ Eroare creare factură:', err.message)
    return NextResponse.json(
      { error: err.message || 'SmartBill error' },
      { status: 500 }
    )
  }
}
