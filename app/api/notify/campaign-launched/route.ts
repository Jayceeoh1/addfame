import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, getSessionBrandId, verifyAdminSession, unauthorized, forbidden } from '@/lib/api-auth'
import { announceCampaign } from '@/lib/campaign-alerts'

// Apelat de pagina brandului când o campanie devine activă.
// Trimiterea propriu-zisă e în lib/campaign-alerts (potrivire după categorie, nișă, platformă;
// o singură dată per campanie) și rulează după răspuns, ca butonul să nu aștepte emailurile.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { campaignId } = await req.json().catch(() => ({}))
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, brand_id, status').eq('id', campaignId).maybeSingle()
  if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const isAdmin = !!(await verifyAdminSession())
  if (!isAdmin) {
    const brandId = await getSessionBrandId(user.id)
    if (!brandId || brandId !== camp.brand_id) return forbidden()
  }
  if (camp.status !== 'ACTIVE') return NextResponse.json({ ok: true, skipped: 'not_active' })

  after(() => announceCampaign(admin, campaignId).then(() => undefined))
  return NextResponse.json({ ok: true, queued: true })
}
