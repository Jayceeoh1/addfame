import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const admin = createAdminClient()

    const { data: reviews } = await admin
      .from('platform_reviews')
      .select('rating, comment, user_id')
      .eq('role', 'influencer')
      .gte('rating', 4)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!reviews?.length) return NextResponse.json({ reviews: [] })

    const userIds = reviews.map(r => r.user_id)
    const { data: influencers } = await admin
      .from('influencers')
      .select('user_id, name, avatar, niches')
      .in('user_id', userIds)
      .eq('approval_status', 'approved')

    const infMap = Object.fromEntries((influencers || []).map(i => [i.user_id, i]))

    const result = reviews
      .map(r => ({ ...r, influencer: infMap[r.user_id] || null }))
      .filter(r => r.influencer) // doar cei aprobați

    return NextResponse.json({ reviews: result })
  } catch (e: any) {
    return NextResponse.json({ reviews: [] })
  }
}
