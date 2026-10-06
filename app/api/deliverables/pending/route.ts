import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { isUuid } from '@/lib/drafts'

// GET /api/deliverables/pending?campaignId=...  -> colaborările campaniei cu draft în așteptare (doar brandul campaniei)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const campaignId = req.nextUrl.searchParams.get('campaignId') || ''
    if (!isUuid(campaignId)) return NextResponse.json({ error: 'campaignId invalid' }, { status: 400 })

    const admin = createAdminClient()
    const { data: camp } = await admin.from('campaigns').select('brand_id').eq('id', campaignId).maybeSingle()
    if (!camp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: brand } = await admin.from('brands').select('user_id').eq('id', camp.brand_id).maybeSingle()
    if (!brand || brand.user_id !== user.id) return forbidden()

    const { data: collabs } = await admin.from('collaborations').select('id').eq('campaign_id', campaignId)
    const ids = (collabs || []).map(c => c.id)
    if (!ids.length) return NextResponse.json({ collabIds: [] })
    const { data: drafts } = await admin.from('deliverable_drafts')
      .select('collaboration_id').in('collaboration_id', ids).eq('status', 'pending')
    return NextResponse.json({ collabIds: Array.from(new Set((drafts || []).map(d => d.collaboration_id))) })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
