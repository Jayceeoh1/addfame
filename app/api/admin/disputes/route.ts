import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify, isUuid } from '@/lib/drafts'
import { RESOLUTIONS, type Resolution } from '@/lib/disputes'

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const showResolved = req.nextUrl.searchParams.get('resolved') === '1'
  const admin = createAdminClient()
  const q = admin.from('disputes')
    .select('id, collaboration_id, opened_by_role, reason, description, status, respond_by, response, responded_at, resolution, resolution_note, resolved_at, created_at, collaborations(id, status, payment_amount, campaigns(title, brand_name), influencers(name))')
    .order('created_at', { ascending: false }).limit(200)
  const { data, error } = showResolved ? await q.eq('status', 'resolved') : await q.neq('status', 'resolved')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ disputes: data || [] })
}

// POST { id, resolution, note } → adminul decide. Nu mută bani: plata se gestionează din Admin → Plăți.
export async function POST(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, resolution, note } = await req.json().catch(() => ({}))
  const text = typeof note === 'string' ? note.trim().slice(0, 2000) : ''
  if (!isUuid(id) || !(resolution in RESOLUTIONS)) return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
  if (text.length < 5) return NextResponse.json({ error: 'Scrie motivarea deciziei (cel puțin 5 caractere).' }, { status: 400 })

  const admin = createAdminClient()
  const { data: upd, error } = await admin.from('disputes')
    .update({ status: 'resolved', resolution, resolution_note: text, resolved_by: session.userId, resolved_at: new Date().toISOString() })
    .eq('id', id).neq('status', 'resolved').select('id, collaboration_id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!upd?.length) return NextResponse.json({ error: 'Litigiul e deja rezolvat.' }, { status: 409 })

  // Anunță ambele părți
  const { data: c } = await admin.from('collaborations')
    .select('brand_id, campaigns(title, brand_id), influencers(user_id)').eq('id', upd[0].collaboration_id).maybeSingle()
  const camp = (c as any)?.campaigns
  const brandId = camp?.brand_id ?? (c as any)?.brand_id
  const { data: b } = brandId ? await admin.from('brands').select('user_id').eq('id', brandId).maybeSingle() : { data: null }
  const msg = `Decizie pentru „${camp?.title || 'campanie'}”: ${RESOLUTIONS[resolution as Resolution]}. ${text}`
  await notify(admin, (c as any)?.influencers?.user_id ?? null, 'Litigiu rezolvat', msg, '/influencer/collaborations')
  await notify(admin, b?.user_id ?? null, 'Litigiu rezolvat', msg, '/brand/collaborations')
  return NextResponse.json({ ok: true })
}
