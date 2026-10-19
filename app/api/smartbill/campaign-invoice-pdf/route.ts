/**
 * GET /api/smartbill/campaign-invoice-pdf?id=…
 * PDF-ul facturii emise la finalul unei campanii. Doar admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { getSmartBillInvoicePdf, parseSmartBillNumber } from '@/lib/smartbill'

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id lipsă' }, { status: 400 })
  const admin = createAdminClient()
  const { data: inv } = await admin.from('campaign_invoices').select('smartbill_number').eq('id', id).maybeSingle()
  const n = parseSmartBillNumber(inv?.smartbill_number)
  if (!n) return NextResponse.json({ error: 'Factura nu a fost emisă' }, { status: 404 })
  const pdf = await getSmartBillInvoicePdf(n.series, n.number)
  if (!pdf) return NextResponse.json({ error: 'SmartBill nu a trimis factura. Încearcă din nou.' }, { status: 502 })
  return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Factura-${n.series}${n.number}.pdf"`, 'Cache-Control': 'private, no-store' } })
}
