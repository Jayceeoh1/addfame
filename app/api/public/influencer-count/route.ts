import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const minFollowers = parseInt(searchParams.get('min_followers') || '0', 10)

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await admin
      .from('influencers')
      .select('id, name, ig_followers, tt_followers, instagram_followers')
      .eq('approval_status', 'approved')
      .limit(10)

    if (error) return NextResponse.json({ error: error.message })

    return NextResponse.json({ sample: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
