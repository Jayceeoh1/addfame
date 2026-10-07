import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const showResolved = req.nextUrl.searchParams.get('resolved') === '1'
  const { data, error } = await createAdminClient()
    .from('app_errors')
    .select('id, source, message, stack, url, user_id, context, count, first_seen, last_seen, resolved')
    .eq('resolved', showResolved)
    .order('last_seen', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ errors: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, resolved } = await req.json().catch(() => ({}))
  if (!id || typeof resolved !== 'boolean') return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
  const { error } = await createAdminClient().from('app_errors')
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
