/**
 * GET /api/smartbill/academy-invoice-pdf?id=…
 * PDF-ul facturii pentru abonamentul AddFame Academy. Acces: adminul sau creatorul căruia îi e emisă.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { getSmartBillInvoicePdf, parseSmartBillNumber } from '@/lib/smartbill'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id lipsă' }, { status: 400 })
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

  const admin = createAdminClient()
  const { data: inv } = await admin.from('academy_invoices').select('smartbill_number, influencer_id').eq('id', id).maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Factura nu există' }, { status: 404 })

  const isAdmin = !!(await verifyAdminSession())
  if (!isAdmin) {
    const { data: me } = await admin.from('influencers').select('id').eq('id', inv.influencer_id).eq('user_id', user.id).maybeSingle()
    if (!me) return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
  }

  const n = parseSmartBillNumber(inv.smartbill_number)
  if (!n) return NextResponse.json({ error: 'Factura e în curs de emitere. Încearcă puțin mai târziu.' }, { status: 404 })
  const pdf = await getSmartBillInvoicePdf(n.series, n.number)
  if (!pdf) return NextResponse.json({ error: 'SmartBill nu a trimis factura. Încearcă din nou.' }, { status: 502 })
  return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Factura-${n.series}${n.number}.pdf"`, 'Cache-Control': 'private, no-store' } })
}
