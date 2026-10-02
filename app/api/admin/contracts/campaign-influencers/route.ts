import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const adminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getAdminUser() {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: adminRow } = await adminClient().from('admins').select('id').eq('user_id', user.id).single()
  return adminRow ? user : null
}

// Influencerii ACTIVI pe o campanie + daca au deja contract de cesiune pe acea campanie.
export async function GET(req: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    if (!campaignId) return NextResponse.json({ influencers: [] })

    const sb = adminClient()

    // Colaborari active pe campanie, cu datele influencerului
    const { data: collabs, error } = await sb
      .from('collaborations')
      .select('influencer_id, status, influencers(id, name, email)')
      .eq('campaign_id', campaignId)
      .eq('status', 'ACTIVE')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Contracte de cesiune deja create pe aceasta campanie (ne-arhivate)
    const { data: existing } = await sb
      .from('cesiune_contracts')
      .select('influencer_id')
      .eq('campaign_id', campaignId)
      .neq('status', 'archived')

    const withContract = new Set((existing || []).map((r: any) => r.influencer_id).filter(Boolean))

    const influencers = (collabs || []).map((c: any) => {
      const inf = Array.isArray(c.influencers) ? c.influencers[0] : c.influencers
      return {
        influencer_id: c.influencer_id,
        name: inf?.name || 'Influencer',
        email: inf?.email || '',
        has_contract: withContract.has(c.influencer_id),
      }
    })

    return NextResponse.json({ influencers })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
