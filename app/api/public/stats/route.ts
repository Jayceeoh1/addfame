import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cifrele de pe prima pagină. Doar numărători (fără să citim rânduri), iar o eroare NU se mai salvează în cache
// (înainte, când baza de date răspundea greu, pagina arăta „0” încă 5 minute după ce își revenea).
let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const count = (q: any) => q.then((r: any) => (r.error ? Promise.reject(r.error) : r.count ?? 0))
    const [influencers, campaigns, collabs, brands, completedCampaigns, completedCollabs] = await Promise.all([
      count(admin.from('influencers').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved')),
      count(admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')),
      count(admin.from('collaborations').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')),
      count(admin.from('brands').select('id', { count: 'exact', head: true })),
      count(admin.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED')),
      count(admin.from('collaborations').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED')),
    ])
    const data = { influencers, campaigns, collabs, brands, completedCampaigns, completedCollabs }
    cache = { data, ts: Date.now() }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
  } catch (e: any) {
    console.error('[stats] eroare:', e?.message || e)
    // ultimele cifre bune, dacă există; altfel 503 fără cache, ca pagina să reîncerce
    if (cache) return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ error: 'indisponibil' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
