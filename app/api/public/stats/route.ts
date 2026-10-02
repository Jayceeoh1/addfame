import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 60 * 1000 // 1 minut în loc de 5

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

    const [inflRes, campRes, collabRes, brandsRes] = await Promise.all([
      admin.from('influencers').select('id').eq('approval_status', 'approved'),
      admin.from('campaigns').select('id').eq('status', 'ACTIVE'),
      admin.from('collaborations').select('id').eq('status', 'ACTIVE'),
      admin.from('brands').select('id'),
    ])

    // Completed stats - separat cu fallback individual
    const [completedCampRes, completedCollabRes] = await Promise.all([
      admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      admin.from('collaborations').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    ]).catch(() => [{ count: 0 }, { count: 0 }])

    const data = {
      influencers: inflRes.data?.length ?? 0,
      campaigns: campRes.data?.length ?? 0,
      collabs: collabRes.data?.length ?? 0,
      brands: brandsRes.data?.length ?? 0,
      completedCampaigns: completedCampRes?.count ?? 0,
      completedCollabs: completedCollabRes?.count ?? 0,
    }

    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
    })
  } catch (e: any) {
    console.error('[stats] unexpected error:', e.message)
    return NextResponse.json({ influencers: 0, campaigns: 0, collabs: 0, brands: 0, completedCampaigns: 0, completedCollabs: 0 })
  }
}