import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized } from '@/lib/api-auth'

// GET /api/deliverables/mine -> { [collabId]: statusul ultimului draft } pentru colaborările active ale creatorului logat.
// Folosit ca nota „Trimite dovada postului” să apară abia după ce brandul aprobă draftul.
export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
  if (!inf) return NextResponse.json({ statuses: {} })
  const { data: collabs } = await admin.from('collaborations').select('id').eq('influencer_id', inf.id).eq('status', 'ACTIVE')
  const ids = (collabs || []).map(c => c.id)
  if (!ids.length) return NextResponse.json({ statuses: {} })
  const { data: drafts } = await admin.from('deliverable_drafts')
    .select('collaboration_id, version, status').in('collaboration_id', ids)
    .in('status', ['pending', 'approved', 'changes_requested'])
  const latest: Record<string, { version: number; status: string }> = {}
  for (const d of drafts || []) {
    const cur = latest[d.collaboration_id]
    if (!cur || d.version > cur.version) latest[d.collaboration_id] = { version: d.version, status: d.status }
  }
  return NextResponse.json({ statuses: Object.fromEntries(Object.entries(latest).map(([k, v]) => [k, v.status])) }, { headers: { 'Cache-Control': 'no-store' } })
}
