import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized } from '@/lib/api-auth'

// Campaniile care au fost active pe platformă și s-au încheiat — vitrină pentru creatori.
// Doar câmpuri publice de prezentare (fără buget, fără date despre aplicanți).
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('campaigns')
      .select('id, title, brand_name, campaign_type, offer_value, offer_image_url, offer_images, platforms, max_influencers, current_influencers, status, created_at, deadline')
      .in('status', ['COMPLETED', 'EXPIRED', 'CLOSED'])
      .not('campaign_type', 'in', '(MANAGED,OPEN_CALL)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: 'Eroare la încărcare' }, { status: 500 })
    return NextResponse.json({ campaigns: data || [] })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
