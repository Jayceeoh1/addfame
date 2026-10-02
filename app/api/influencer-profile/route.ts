import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const FIELDS = 'id, slug, name, avatar, cover_image, bio, country, niches, platforms, engagement_rate, avg_views, is_verified, badge_expires_at, approval_status, avg_rating, review_count, price_story, price_reel, price_post, price_youtube, price_min, creator_score, portfolio_urls, recent_posts_urls, ig_followers, tt_followers, instagram_followers'

// GET — fetch influencer profile by slug OR id, bypassing RLS (service role)
export async function GET(req: NextRequest) {
  try {
    const idOrSlug = req.nextUrl.searchParams.get('id')
    if (!idOrSlug) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

    let query = admin().from('influencers').select(FIELDS).limit(1)
    query = isUUID ? query.eq('id', idOrSlug) : query.eq('slug', idOrSlug)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ influencer: data[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
