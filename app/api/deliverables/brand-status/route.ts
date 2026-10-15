import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'

// GET /api/deliverables/brand-status -> { statuses: { [collabId]: 'pending' | 'changes_requested' | 'approved' } }
// Starea ultimului draft video pe fiecare colaborare a brandului logat (pentru lista „Colaborări”).
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const admin = createAdminClient()
    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!brand) return forbidden()

    const { data: camps } = await admin.from('campaigns').select('id').eq('brand_id', brand.id)
    const campIds = (camps || []).map(c => c.id)
    if (!campIds.length) return NextResponse.json({ statuses: {} })

    const collabIds: string[] = []
    for (let i = 0; i < campIds.length; i += 100) {
      const { data } = await admin.from('collaborations').select('id')
        .in('campaign_id', campIds.slice(i, i + 100)).in('status', ['ACTIVE', 'COMPLETED'])
      collabIds.push(...(data || []).map(c => c.id))
    }

    const latest: Record<string, { v: number; s: string }> = {}
    for (let i = 0; i < collabIds.length; i += 100) {
      const { data } = await admin.from('deliverable_drafts').select('collaboration_id, version, status')
        .in('collaboration_id', collabIds.slice(i, i + 100))
        .in('status', ['pending', 'changes_requested', 'approved'])
      for (const d of data || []) {
        const cur = latest[d.collaboration_id]
        if (!cur || d.version > cur.v) latest[d.collaboration_id] = { v: d.version, s: d.status }
      }
    }
    return NextResponse.json(
      { statuses: Object.fromEntries(Object.entries(latest).map(([k, v]) => [k, v.s])) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ statuses: {} })
  }
}
