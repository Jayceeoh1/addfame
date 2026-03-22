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

    const [inflRes, campRes, collabRes, brandsRes] = await Promise.all([
      admin.from('influencers').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      admin.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      admin.from('collaborations').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      admin.from('brands').select('*', { count: 'exact', head: true }),
    ])

    // Log errors dacă există
    if (inflRes.error) console.error('[stats] influencers error:', inflRes.error.message)
    if (campRes.error) console.error('[stats] campaigns error:', campRes.error.message)
    if (collabRes.error) console.error('[stats] collaborations error:', collabRes.error.message)
    if (brandsRes.error) console.error('[stats] brands error:', brandsRes.error.message)

    const data = {
      influencers: inflRes.count ?? 0,
      campaigns: campRes.count ?? 0,
      collabs: collabRes.count ?? 0,
      brands: brandsRes.count ?? 0,
    }

    cache = { data, ts: Date.now() }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' }
    })
  } catch (e: any) {
    console.error('[stats] unexpected error:', e.message)
    return NextResponse.json({ influencers: 0, campaigns: 0, collabs: 0, brands: 0 })
  }
}