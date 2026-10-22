import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REVIEW_BONUS = 50

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'platform-review', LIMITS.contact); if (limited) return limited }
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const { rating, comment, role } = await req.json()
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating invalid' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Prima recenzie a utilizatorului? (bonusul se acordă o singură dată, indiferent de nota dată)
    const { data: before } = await admin.from('platform_reviews').select('user_id').eq('user_id', user.id).maybeSingle()
    const isFirst = !before

    // Upsert — un singur review per user
    const { error } = await admin
      .from('platform_reviews')
      .upsert({
        user_id: user.id,
        role: role || 'influencer',
        rating,
        comment: comment?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Bonus: +50 puncte Creator Score la prima recenzie, pentru orice notă (nu răsplătim doar notele mari)
    let points = 0
    if (isFirst && (role || 'influencer') === 'influencer') {
      const { data: inf } = await admin.from('influencers').select('id, creator_score').eq('user_id', user.id).maybeSingle()
      if (inf) {
        const newScore = (inf.creator_score ?? 0) + REVIEW_BONUS
        const { error: upErr } = await admin.from('influencers').update({ creator_score: newScore }).eq('id', inf.id)
        if (!upErr) {
          points = REVIEW_BONUS
          try {
            await admin.from('notifications').insert({
              user_id: user.id, title: `🎁 +${REVIEW_BONUS} puncte Creator Score!`,
              body: `Mulțumim pentru recenzia ta despre AddFame. Scorul tău a crescut la ${newScore} puncte.`,
              link: '/influencer/dashboard', read: false,
            })
          } catch { /* notificarea e opțională */ }
        }
      }
    }

    return NextResponse.json({ ok: true, points })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ existing: null })

    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_reviews')
      .select('rating, comment')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ existing: data || null })
  } catch {
    return NextResponse.json({ existing: null })
  }
}
