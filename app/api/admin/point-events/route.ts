import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  try {
    if (!(await verifyAdminSession())) return NextResponse.json({ events: [], error: 'Unauthorized' }, { status: 401 })
    const admin = createAdminClient()

    const { data: events, error } = await admin
      .from('point_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ events: [], error: error.message }, { status: 500 })

    // Adăugăm numărul de revendicări pentru fiecare eveniment
    const withCounts = await Promise.all(
      (events ?? []).map(async (ev) => {
        const { count } = await admin
          .from('point_event_claims')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)
        return { ...ev, claims_count: count ?? 0 }
      })
    )

    return NextResponse.json({ events: withCounts })
  } catch (e: any) {
    return NextResponse.json({ events: [], error: e.message }, { status: 500 })
  }
}
