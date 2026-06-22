import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sb = createAdminClient()

    const [annRes, infRes] = await Promise.all([
      sb.from('announcements')
        .select(`*, announcement_reads(id, starred, dismissed, clicked_cta, user_id, read_at)`)
        .order('created_at', { ascending: false }),
      sb.from('influencers')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved'),
    ])

    return NextResponse.json({
      announcements: annRes.data ?? [],
      totalInfluencers: infRes.count ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { announcement_id } = await req.json()
    const sb = createAdminClient()

    const { data, error } = await sb
      .from('announcement_reads')
      .select('*, user_id, read_at, starred, dismissed, clicked_cta')
      .eq('announcement_id', announcement_id)
      .order('read_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (data?.length) {
      const userIds = data.map((r: any) => r.user_id)
      const { data: infs } = await sb
        .from('influencers')
        .select('user_id, name, avatar')
        .in('user_id', userIds)
      const infMap = Object.fromEntries((infs ?? []).map((i: any) => [i.user_id, i]))
      data.forEach((r: any) => { r.influencers = infMap[r.user_id] || null })
    }

    return NextResponse.json({ reads: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
