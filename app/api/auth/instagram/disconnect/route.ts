import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { wipeInstagram } from '@/lib/instagram'

// Creatorul / brandul își deconectează singur Instagram-ul (șterge token + date).
// Body: { kind?: 'brand' | 'influencer' }
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const body = await req.json().catch(() => ({}))
  const kind = body?.kind === 'brand' ? 'brand' : 'influencer'
  const admin = createAdminClient()
  const { data: row } = await admin.from(kind === 'brand' ? 'brands' : 'influencers')
    .select('id').eq('user_id', user.id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await wipeInstagram(admin, { kind, id: row.id })
  return NextResponse.json({ ok: true })
}
