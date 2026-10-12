/**
 * GET /api/smartbill/invoice-pdf?transaction_id=…
 * Descarcă PDF-ul facturii SmartBill (seria ADDF) pentru o încărcare de credite.
 * Acces: brandul care a făcut plata sau un admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSmartBillInvoicePdf, parseSmartBillNumber } from '@/lib/smartbill'

export async function GET(req: NextRequest) {
  const txId = req.nextUrl.searchParams.get('transaction_id')
  if (!txId) return NextResponse.json({ error: 'transaction_id lipsă' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

  const admin = createAdminClient()
  const { data: tx } = await admin.from('brand_transactions')
    .select('id, brand_id, smartbill_invoice_number').eq('id', txId).maybeSingle()
  if (!tx) return NextResponse.json({ error: 'Plata nu există' }, { status: 404 })

  const [{ data: brand }, { data: adminRow }] = await Promise.all([
    admin.from('brands').select('id').eq('id', tx.brand_id).eq('user_id', user.id).maybeSingle(),
    admin.from('admins').select('is_active').eq('user_id', user.id).maybeSingle(),
  ])
  const isAdmin = !!adminRow && adminRow.is_active !== false
  if (!brand && !isAdmin) return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })

  const inv = parseSmartBillNumber(tx.smartbill_invoice_number)
  if (!inv) return NextResponse.json({ error: 'Factura nu a fost încă emisă' }, { status: 404 })

  const pdf = await getSmartBillInvoicePdf(inv.series, inv.number)
  if (!pdf) return NextResponse.json({ error: 'SmartBill nu a trimis factura. Încearcă din nou.' }, { status: 502 })

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Factura-${inv.series}${inv.number}.pdf"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
