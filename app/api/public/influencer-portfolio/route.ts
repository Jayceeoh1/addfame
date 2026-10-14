import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, verifyAdminSession } from '@/lib/api-auth'
import { campaignName } from '@/lib/campaign-name'
import { buildPortfolio, collabPosts, usableLogo, type BrandRef, type PortfolioCollab } from '@/lib/portfolio'

// GET /api/public/influencer-portfolio?id=<influencer uuid>
// Colaborările finalizate ale unui creator aprobat: branduri, postări, recenzii.
//  - cifrele postărilor (vizualizări, like-uri…) doar pentru branduri logate, admin și creatorul însuși;
//  - brandurile nu primesc linkurile postărilor (regula AddFame: fără contact în afara platformei).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIMIT = 60
type Mode = 'public' | 'brand' | 'owner'
const cache = new Map<string, { at: number; data: any }>()
const TTL = 60_000

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'id invalid' }, { status: 400 })
  try {
    const admin = createAdminClient()
    const { data: inf } = await admin.from('influencers').select('id, user_id, approval_status').eq('id', id).maybeSingle()
    if (!inf) return NextResponse.json({ error: 'Profil inexistent' }, { status: 404 })

    // cine se uită
    let mode: Mode = 'public'
    const user = await getSessionUser()
    if (user) {
      if (user.id === inf.user_id || await verifyAdminSession()) mode = 'owner'
      else {
        const { data: b } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
        if (b) mode = 'brand'
      }
    }
    if (inf.approval_status !== 'approved' && mode !== 'owner') return NextResponse.json({ error: 'Profil indisponibil' }, { status: 404 })

    const key = `${id}:${mode}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.data, { headers: { 'Cache-Control': 'private, no-store' } })

    const showMetrics = mode !== 'public'
    const hideLinks = mode === 'brand'

    const { count: totalCompleted } = await admin.from('collaborations')
      .select('id', { count: 'exact', head: true }).eq('influencer_id', id).eq('status', 'COMPLETED')

    const { data: rows } = await admin.from('collaborations')
      .select('id, completed_at, deliverable_approved_at, deliverable_url, thumbnail_url, campaign_id, campaigns(title, offer_name, brand_name, brand_id)')
      .eq('influencer_id', id).eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(LIMIT)
    const collabs = (rows || []) as any[]
    const ids = collabs.map(c => c.id)

    const [revRes, metRes, brandRes] = await Promise.all([
      ids.length ? admin.from('reviews').select('collaboration_id, rating, comment').eq('reviewer_role', 'brand').in('collaboration_id', ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? admin.from('post_metrics').select('collaboration_id, url, platform, thumbnail_url, views, likes, comments, shares').in('collaboration_id', ids) : Promise.resolve({ data: [] as any[] }),
      (() => {
        const brandIds = [...new Set(collabs.map(c => c.campaigns?.brand_id).filter(Boolean))]
        return brandIds.length ? admin.from('brands').select('id, name, logo').in('id', brandIds) : Promise.resolve({ data: [] as any[] })
      })(),
    ])
    const reviews = new Map((revRes.data || []).map((r: any) => [r.collaboration_id, r]))
    const metrics = new Map<string, any[]>()
    for (const m of (metRes as any).data || []) metrics.set(m.collaboration_id, [...(metrics.get(m.collaboration_id) || []), m])
    const brands = new Map(((brandRes as any).data || []).map((b: any) => [b.id, b]))

    const input: Array<PortfolioCollab & { brand: BrandRef }> = collabs.map(c => {
      const camp = c.campaigns || {}
      const b: any = camp.brand_id ? brands.get(camp.brand_id) : null
      const name = String(camp.brand_name || b?.name || 'Brand').trim()
      const rev: any = reviews.get(c.id)
      return {
        id: c.id,
        campaign: campaignName(camp, ''),
        completedAt: c.completed_at || c.deliverable_approved_at || null,
        rating: rev ? Number(rev.rating) || null : null,
        comment: rev?.comment ? String(rev.comment).trim() || null : null,
        posts: collabPosts(c.deliverable_url, c.thumbnail_url, metrics.get(c.id) || [], { showMetrics, hideLinks }),
        brand: { key: camp.brand_id || name.toLowerCase(), name, logo: usableLogo(b?.logo) },
      }
    })

    const data = { mode, ...buildPortfolio(input, { totalCompleted: totalCompleted ?? 0, showMetrics }) }
    cache.set(key, { at: Date.now(), data })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
