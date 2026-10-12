// Lista de influenceri pentru branduri.
// Acces: doar brandurile cu cel puțin o campanie activă (sau acces dat manual din Admin → Branduri).
// Datele trec prin server și ies curățate: fără handle-uri, link-uri, email sau telefon (lib/brand-safe).
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toBrandInfluencer } from '@/lib/brand-safe'

export const dynamic = 'force-dynamic'

const COLS = 'id, user_id, name, slug, bio, avatar, niches, platforms, approval_status, is_verified, verified_at, total_earned, created_at, price_story, price_reel, price_post, price_youtube, price_min, city, instagram_connected, ig_followers, ig_engagement_rate, tiktok_connected, tt_followers, avg_rating, review_count'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

  const admin = createAdminClient()
  const { data: brand } = await admin.from('brands').select('id, influencers_access').eq('user_id', user.id).maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Doar brandurile au acces la lista de influenceri.' }, { status: 403 })

  let granted = brand.influencers_access === true
  if (!granted) {
    const { count } = await admin.from('campaigns').select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id).eq('status', 'ACTIVE')
    granted = (count || 0) > 0
  }
  if (!granted) return NextResponse.json({ access: false, reason: 'no_active_campaign' })

  const { data, error } = await admin.from('influencers').select(COLS)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ access: true, influencers: (data || []).map(toBrandInfluencer) })
}
