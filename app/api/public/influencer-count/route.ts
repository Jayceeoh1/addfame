import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, getSessionBrandId, unauthorized, forbidden } from '@/lib/api-auth'
import { TIERS, creatorTierInfo } from '@/lib/tiers'
import { eligibility, cleanTiers, cleanNiches } from '@/lib/eligibility'

// Contor pentru pasul „Target influenceri" din wizard: câți creatori aprobați ar putea vedea campania.
// Răspunde DOAR cu numere (total, eligibili, pe categorii) — niciun nume, nicio dată personală.
// Parametri: tiers=nano,micro  niches=Beauty,Food  min_followers=500
// (Ruta veche returna un eșantion de creatori cu nume și urmăritori, fără autentificare: a fost înlocuită.)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const brandId = await getSessionBrandId(user.id)
    if (!brandId) return forbidden()

    const sp = req.nextUrl.searchParams
    const tiers = cleanTiers((sp.get('tiers') || '').split(',').filter(Boolean))
    const niches = cleanNiches((sp.get('niches') || '').split(',').filter(Boolean))
    const minFollowers = Math.max(0, parseInt(sp.get('min_followers') || '0', 10) || 0)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('influencers')
      .select('niches, platforms, instagram_connected, ig_followers, tt_followers, instagram_followers')
      .eq('approval_status', 'approved')
      .limit(5000)
    if (error) return NextResponse.json({ error: 'Eroare la numărare' }, { status: 500 })

    const rows = data || []
    const byTier: Record<string, number> = Object.fromEntries(TIERS.map(t => [t.key, 0]))
    let noTier = 0
    let eligible = 0

    for (const r of rows as any[]) {
      const info = creatorTierInfo(r)
      if (info.tier) byTier[info.tier.key]++
      else noTier++

      // Pragul minim: aceeași regulă ca la lista de campanii (Instagram + TikTok)
      const reach = (Number(r.ig_followers) || 0) + (Number(r.tt_followers) || 0)
      if (minFollowers > 0 && reach < minFollowers) continue
      if (eligibility({ elig_tiers: tiers, elig_niches: niches }, r).ok) eligible++
    }

    return NextResponse.json({ total: rows.length, count: eligible, byTier, noTier })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
