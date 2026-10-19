import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { toBrandInfluencer, socialLinksFor, SOCIAL_VISIBLE_STATUSES } from '@/lib/brand-safe'

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
    // Conține adrese, telefoane, emailuri → doar admin
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

// POST — detaliile creatorilor pentru pagina unui brand.
// Acces: adminul sau brandul care are colaborare/aplicare cu acei creatori. Oricine altcineva primește 403.
// Brandul primește profilul curățat (fără handle, link, email, telefon). Conturile de social media (_social)
// apar DOAR pentru creatorii care au aplicat la campania dată (PENDING / ACTIVE / COMPLETED), nu pentru cei invitați sau refuzați.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 500) : []
    const campaignId: string | null = typeof body?.campaignId === 'string' ? body.campaignId : null
    if (ids.length === 0) return NextResponse.json([], { status: 200 })

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await getAdminClient()
    const isAdmin = !!(await verifyAdminSession())

    let brandId: string | null = null
    if (!isAdmin) {
      const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
      if (!brand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      brandId = brand.id
      if (campaignId) {
        const { data: camp } = await admin.from('campaigns').select('id').eq('id', campaignId).eq('brand_id', brandId).maybeSingle()
        if (!camp) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // colaborările brandului cu acești creatori (pe campania dată, dacă e trimisă)
    let collabQ = admin.from('collaborations').select('influencer_id, status, campaign_id').in('influencer_id', ids)
    if (brandId) collabQ = collabQ.eq('brand_id', brandId)
    const { data: myCollabs } = await collabQ
    const mine = (myCollabs || []) as { influencer_id: string; status: string; campaign_id: string }[]

    const allowedIds = isAdmin ? ids : [...new Set(mine.map(c => c.influencer_id))]
    if (allowedIds.length === 0) return NextResponse.json([], { status: 200 })

    // cine are voie să-și vadă social media: a aplicat la CAMPANIA ceruta
    const socialOk = new Set(
      mine.filter(c => !!campaignId && c.campaign_id === campaignId && SOCIAL_VISIBLE_STATUSES.includes(c.status)).map(c => c.influencer_id)
    )

    const { data, error } = await admin
      .from('influencers')
      .select('id, name, avatar, bio, niches, platforms, avg_rating, review_count, country, city, instagram_connected, ig_followers, tt_followers, instagram_followers, instagram_handle, tiktok_handle, youtube_handle, slug, price_story, price_reel, price_post, price_youtube, price_min, portfolio_urls, recent_posts_urls')
      .in('id', allowedIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // statistici colaborări (doar ale acestui brand; adminul le vede pe toate)
    const statQ = admin.from('collaborations').select('influencer_id, status, payment_amount').in('influencer_id', allowedIds)
    const { data: collabs } = brandId ? await statQ.eq('brand_id', brandId) : await statQ

    const result = (data || []).map((inf: any) => {
      const rows = (collabs || []).filter((c: any) => c.influencer_id === inf.id)
      const completed = rows.filter((c: any) => c.status === 'COMPLETED').length
      const accepted = rows.filter((c: any) => c.status !== 'PENDING' && c.status !== 'INVITED').length
      const total = rows.length
      const earned = rows.filter((c: any) => c.status === 'COMPLETED').reduce((s: number, c: any) => s + (c.payment_amount || 0), 0)
      const social = isAdmin || socialOk.has(inf.id) ? socialLinksFor(inf) : undefined
      const base = isAdmin ? inf : toBrandInfluencer(inf)
      return {
        ...base,
        ...(social ? { _social: social } : {}),
        _stats: { completed, total, successRate: accepted > 0 ? Math.round(completed / accepted * 100) : 0, earned },
      }
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
