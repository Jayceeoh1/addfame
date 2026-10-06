import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { wipeInstagram } from '@/lib/instagram'

// Creatorul își deconectează singur Instagram-ul (șterge token + date).
export async function POST() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
  if (!inf) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await wipeInstagram(admin, { id: inf.id })
  return NextResponse.json({ ok: true })
}
