// Admin → Mesaje semnalate: mesajele din chat care par să mute discuția în afara AddFame (SQL 30).
// GET: lista (deschise / verificate) cu numele expeditorului și campania.
// POST: { id, action: 'review' | 'reopen' } sau { userId, action: 'ban' | 'unban' } (excludere cont).
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const reviewed = req.nextUrl.searchParams.get('reviewed') === '1'
  const sb = createAdminClient()
  const { data: flags, error } = await sb.from('message_flags')
    .select('id, message_id, collaboration_id, sender_id, sender_role, content, reasons, reviewed, reviewed_at, created_at')
    .eq('reviewed', reviewed)
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = flags || []
  const senderIds = [...new Set(rows.map(r => r.sender_id).filter(Boolean))] as string[]
  const collabIds = [...new Set(rows.map(r => r.collaboration_id).filter(Boolean))] as string[]

  const [infs, brands, collabs, counts] = await Promise.all([
    senderIds.length ? sb.from('influencers').select('id, user_id, name, email').in('user_id', senderIds) : { data: [] as any[] },
    senderIds.length ? sb.from('brands').select('id, user_id, name, email').in('user_id', senderIds) : { data: [] as any[] },
    collabIds.length ? sb.from('collaborations').select('id, campaigns(title), influencers(name), brands(name)').in('id', collabIds) : { data: [] as any[] },
    senderIds.length ? sb.from('message_flags').select('sender_id').in('sender_id', senderIds) : { data: [] as any[] },
  ])

  const who = new Map<string, { name: string; email: string | null; kind: 'influencer' | 'brand'; profileId: string }>()
  for (const i of (infs as any).data || []) who.set(i.user_id, { name: i.name || 'Influencer', email: i.email, kind: 'influencer', profileId: i.id })
  for (const b of (brands as any).data || []) who.set(b.user_id, { name: b.name || 'Brand', email: b.email, kind: 'brand', profileId: b.id })
  const collabMap = new Map<string, any>(((collabs as any).data || []).map((c: any) => [c.id, c]))
  const total = new Map<string, number>()
  for (const f of (counts as any).data || []) total.set(f.sender_id, (total.get(f.sender_id) || 0) + 1)

  // Starea de excludere (ban) a expeditorilor
  const banned = new Set<string>()
  await Promise.all(senderIds.slice(0, 100).map(async id => {
    try {
      const { data } = await sb.auth.admin.getUserById(id)
      const until = (data?.user as any)?.banned_until
      if (until && new Date(until).getTime() > Date.now()) banned.add(id)
    } catch { /* utilizator șters */ }
  }))

  return NextResponse.json({
    flags: rows.map(r => {
      const c = collabMap.get(r.collaboration_id)
      return {
        ...r,
        sender: who.get(r.sender_id) || null,
        sender_flags: total.get(r.sender_id) || 1,
        sender_banned: banned.has(r.sender_id),
        campaign: c?.campaigns?.title || null,
        partner: r.sender_role === 'brand' ? c?.influencers?.name || null : c?.brands?.name || null,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const session = await verifyAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const sb = createAdminClient()

  if (body.action === 'review' || body.action === 'reopen') {
    if (!isUuid(body.id)) return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
    const reviewed = body.action === 'review'
    const { error } = await sb.from('message_flags')
      .update({ reviewed, reviewed_at: reviewed ? new Date().toISOString() : null }).eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'ban' || body.action === 'unban') {
    if (!isUuid(body.userId)) return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
    // Un admin nu poate fi exclus de aici
    const { data: adm } = await sb.from('admins').select('user_id').eq('user_id', body.userId).maybeSingle()
    if (adm) return NextResponse.json({ error: 'Contul este de admin.' }, { status: 400 })
    const ban = body.action === 'ban'
    const { error } = await sb.auth.admin.updateUserById(body.userId, { ban_duration: ban ? '876000h' : 'none' } as any)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Brandurile au și status în profil (folosit în Admin → Branduri)
    await sb.from('brands').update({ status: ban ? 'suspended' : 'active' }).eq('user_id', body.userId)
    if (ban) {
      await sb.from('message_flags').update({ reviewed: true, reviewed_at: new Date().toISOString() })
        .eq('sender_id', body.userId).eq('reviewed', false)
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acțiune necunoscută' }, { status: 400 })
}
