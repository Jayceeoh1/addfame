import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — stats colaborari pentru un influencer (id sau slug), bypass RLS
export async function GET(req: NextRequest) {
  try {
    const idOrSlug = req.nextUrl.searchParams.get('id')
    if (!idOrSlug) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const sb = admin()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

    let influencerId = idOrSlug
    if (!isUUID) {
      const { data: infs } = await sb.from('influencers').select('id').eq('slug', idOrSlug).limit(1)
      if (!infs || infs.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      influencerId = infs[0].id
    }

    const { data: collabs } = await sb
      .from('collaborations')
      .select('status, payment_amount')
      .eq('influencer_id', influencerId)

    const rows = collabs || []
    const completed = rows.filter(c => c.status === 'COMPLETED').length
    const accepted = rows.filter(c => c.status !== 'PENDING' && c.status !== 'INVITED').length
    const total = rows.length
    const earned = rows.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.payment_amount || 0), 0)

    return NextResponse.json({
      stats: {
        completed,
        total,
        successRate: accepted > 0 ? Math.round(completed / accepted * 100) : 0,
        earned,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
