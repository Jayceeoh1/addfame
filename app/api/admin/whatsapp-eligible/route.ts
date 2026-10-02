import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaign_id')
    if (!campaignId) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch cu admin client — bypass RLS complet
    const { data, error } = await admin
      .from('collaborations')
      .select(`
        id,
        package_received_at,
        post_deadline_days,
        reminder_48h_sent,
        reminder_24h_sent,
        reminder_12h_sent,
        delivery_phone,
        influencers(id, name, phone, strikes)
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'ACTIVE')
      .not('package_received_at', 'is', null)
      .is('deliverable_submitted_at', null)
      .is('deliverable_approved_at', null)

    if (error) {
      console.error('[whatsapp-eligible]', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Folosim delivery_phone ca fallback față de influencers.phone
    const eligible = (data || []).map((c: any) => ({
      ...c,
      resolved_phone: c.influencers?.phone || c.delivery_phone || null,
    })).filter((c: any) => c.resolved_phone)

    return NextResponse.json({ eligible })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
