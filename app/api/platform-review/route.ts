import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const { rating, comment, role } = await req.json()
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating invalid' }, { status: 400 })
    }

    const admin = createAdminClient()

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

    return NextResponse.json({ ok: true })
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
