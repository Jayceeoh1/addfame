import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { collaboration_id, reviewer_role, rating, comment } = await req.json()

    if (!collaboration_id || !reviewer_role || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the collaboration exists and user is part of it
    const { data: collab } = await admin
      .from('collaborations')
      .select('id, influencer_id, status, campaigns(brand_id)')
      .eq('id', collaboration_id)
      .single()

    if (!collab) return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
    if (collab.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Can only review completed collaborations' }, { status: 400 })
    }

    // Upsert the review
    const { error: reviewErr } = await admin
      .from('reviews')
      .upsert({
        collaboration_id,
        reviewer_id: user.id,
        reviewer_role,
        rating,
        comment: comment || null,
      }, { onConflict: 'collaboration_id,reviewer_role' })

    if (reviewErr) {
      return NextResponse.json({ error: reviewErr.message }, { status: 500 })
    }

    // Update avg_rating and review_count on the influencer
    // Get all reviews for this influencer (reviewer_role = 'brand')
    const { data: influencer } = await admin
      .from('influencers')
      .select('id, user_id')
      .eq('id', collab.influencer_id)
      .single()

    if (influencer) {
      const { data: allReviews } = await admin
        .from('reviews')
        .select('rating, collaboration_id, collaborations!inner(influencer_id)')
        .eq('reviewer_role', 'brand')
        .eq('collaborations.influencer_id', collab.influencer_id)

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
        await admin.from('influencers').update({
          avg_rating: Math.round(avg * 10) / 10,
          review_count: allReviews.length,
        }).eq('id', influencer.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
