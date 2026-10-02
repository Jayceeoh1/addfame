import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 min

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' }
    })
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Ia colaborările aprobate cu deliverable_url (clip real)
    const { data: collabs } = await admin
      .from('collaborations')
      .select(`
        id,
        deliverable_url,
        influencers!inner(
          id, name, avatar, ig_followers, tt_followers, slug
        ),
        campaigns!inner(
          title, brand_name, campaign_type
        )
      `)
      .eq('status', 'COMPLETED')
      .not('deliverable_url', 'is', null)
      .neq('deliverable_url', '')
      .order('deliverable_approved_at', { ascending: false })
      .limit(20)

    // Filtrăm doar URL-uri Instagram/TikTok reale
    const clips = (collabs || [])
      .filter((c: any) => {
        const url = c.deliverable_url || ''
        return url.includes('instagram.com') || url.includes('tiktok.com')
      })
      .map((c: any) => ({
        id: c.id,
        url: c.deliverable_url,
        influencer: {
          name: c.influencers?.name || 'Creator',
          avatar: c.influencers?.avatar || null,
          slug: c.influencers?.slug || null,
          ig_followers: c.influencers?.ig_followers || 0,
          tt_followers: c.influencers?.tt_followers || 0,
        },
        campaign: {
          title: c.campaigns?.title || '',
          brand_name: c.campaigns?.brand_name || '',
          type: c.campaigns?.campaign_type || 'PAID',
        },
        platform: (c.deliverable_url || '').includes('tiktok') ? 'TikTok' : 'Instagram',
      }))
      .slice(0, 12)

    const data = { clips }
    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' }
    })
  } catch {
    return NextResponse.json({ clips: [] })
  }
}
