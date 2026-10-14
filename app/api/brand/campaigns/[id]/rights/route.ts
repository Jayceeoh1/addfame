import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, verifyAdminSession, unauthorized, forbidden } from '@/lib/api-auth'
import { loadCampaignRights, canSeeCampaignRights } from '@/lib/campaign-rights'
import { isUuid } from '@/lib/drafts'

// Drepturile de autor ale unei campanii, pentru brand (fără date personale ale creatorilor).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Campanie inexistentă' }, { status: 404 })
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const db = createAdminClient()
  if (!(await canSeeCampaignRights(db, user.id, id, !!(await verifyAdminSession())))) return forbidden()
  const data = await loadCampaignRights(db, id)
  if (!data) return NextResponse.json({ error: 'Campanie inexistentă' }, { status: 404 })
  return NextResponse.json(data)
}
