import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
    })
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [{ data: campaigns }, { data: influencers }] = await Promise.all([
      admin.from('campaigns')
        .select('id, title, budget_per_influencer, max_influencers, current_influencers, platforms, niches, campaign_type, offer_type, offer_value, offer_name')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(2),
      admin.from('influencers')
        .select('id, name, avatar, niches, ig_followers, tt_followers, is_verified, city, instagram_connected, tiktok_connected, ig_engagement_rate')
        .eq('approval_status', 'approved')
        .order('is_verified', { ascending: false })
        .limit(4),
    ])

    const data = { campaigns: campaigns || [], influencers: influencers || [] }
    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
    })
  } catch {
    return NextResponse.json({ campaigns: [], influencers: [] })
  }
}