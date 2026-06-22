import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET — fetch collaborations for a campaign (admin use)
export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaignId = req.nextUrl.searchParams.get('campaign_id')
    if (!campaignId) return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 })

    const admin = await getAdminClient()
    const { data, error } = await admin
      .from('collaborations')
      .select('*, delivery_name, delivery_phone, delivery_address, delivery_city, delivery_county, delivery_postal_code, package_sent_at, package_received_at, post_deadline_days, checked_in_at, influencers(id, name, avatar, email, avg_rating, ig_followers, tt_followers, instagram_followers, slug)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — fetch influencer details by IDs
export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await getAdminClient()
    const { data, error } = await admin
      .from('influencers')
      .select('id, name, avatar, bio, niches, platforms, avg_rating, review_count, country, ig_followers, tt_followers, instagram_followers, slug, price_story, price_reel, price_post, price_youtube, price_min, portfolio_urls, recent_posts_urls')
      .in('id', ids)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Adaugam stats colaborari pentru fiecare influencer
    const { data: collabs } = await admin
      .from('collaborations')
      .select('influencer_id, status, payment_amount')
      .in('influencer_id', ids)

    const result = (data || []).map((inf: any) => {
      const rows = (collabs || []).filter((c: any) => c.influencer_id === inf.id)
      const completed = rows.filter((c: any) => c.status === 'COMPLETED').length
      const accepted = rows.filter((c: any) => c.status !== 'PENDING' && c.status !== 'INVITED').length
      const total = rows.length
      const earned = rows.filter((c: any) => c.status === 'COMPLETED').reduce((s: number, c: any) => s + (c.payment_amount || 0), 0)
      return {
        ...inf,
        _stats: { completed, total, successRate: accepted > 0 ? Math.round(completed / accepted * 100) : 0, earned },
      }
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
