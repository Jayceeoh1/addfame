import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Simple in-memory rate limiter
const rateMap = new Map<string, { count: number; reset: number }>()
const LIMIT = 5
const WINDOW = 60_000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.reset) { rateMap.set(key, { count: 1, reset: now + WINDOW }); return true }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!checkRateLimit(user.id))
      return NextResponse.json({ error: 'Prea multe cereri. Încearcă din nou în câteva minute.' }, { status: 429 })

    const body = await req.json()
    const { amount, method, reference, billing } = body

    // Validare sumă în RON (minim 50 RON, maxim 250.000 RON)
    if (!amount || amount < 50 || amount > 250000)
      return NextResponse.json({ error: 'Sumă invalidă. Trebuie să fie între 50 RON și 250.000 RON.' }, { status: 400 })
    if (!method)
      return NextResponse.json({ error: 'Metoda de plată este obligatorie.' }, { status: 400 })

    const { data: brand } = await supabase
      .from('brands').select('id, name, email').eq('user_id', user.id).single()
    if (!brand) return NextResponse.json({ error: 'Brand negăsit.' }, { status: 404 })

    const now = new Date()
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const { count } = await supabase
      .from('brand_transactions').select('*', { count: 'exact', head: true }).eq('brand_id', brand.id)
    const invoiceNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { data: tx, error: txError } = await supabase
      .from('brand_transactions')
      .insert({
        brand_id: brand.id,
        type: 'TOPUP',
        amount,
        description: `Încărcare credite via ${method} — ${amount.toLocaleString('ro-RO')} RON`,
        status: 'pending',
        payment_method: method,
        payment_reference: reference || null,
        invoice_number: invoiceNumber,
        billing_details: billing || null,
      })
      .select('id, invoice_number, created_at')
      .single()

    if (txError) throw txError

    return NextResponse.json({
      success: true,
      transaction_id: tx.id,
      invoice_number: tx.invoice_number,
      created_at: tx.created_at,
      brand_name: brand.name,
      brand_email: brand.email,
      amount,
      method,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
