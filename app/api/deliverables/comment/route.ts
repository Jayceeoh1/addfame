import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid } from '@/lib/drafts'

// Comentariu (opțional legat de o secundă) de la brand sau creator.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const { draftId, atSecond, body } = await req.json().catch(() => ({}))
    const text = typeof body === 'string' ? body.trim() : ''
    if (!isUuid(draftId) || text.length < 1 || text.length > 1000) {
      return NextResponse.json({ error: 'Comentariu invalid' }, { status: 400 })
    }
    const at = atSecond === null || atSecond === undefined ? null : Math.max(0, Math.round(Number(atSecond)))
    if (at !== null && !Number.isFinite(at)) return NextResponse.json({ error: 'Secundă invalidă' }, { status: 400 })

    const admin = createAdminClient()
    const { data: d } = await admin.from('deliverable_drafts')
      .select('collaboration_id, status').eq('id', draftId).maybeSingle()
    if (!d || d.status === 'deleted' || d.status === 'uploading') {
      return NextResponse.json({ error: 'Draft indisponibil' }, { status: 404 })
    }
    const access = await getCollabAccess(admin, d.collaboration_id, user.id)
    if (!access) return forbidden()

    const { data: c, error } = await admin.from('deliverable_draft_comments').insert({
      draft_id: draftId, author_role: access.role, author_user_id: user.id, at_second: at, body: text,
    }).select('id, draft_id, author_role, at_second, body, created_at').single()
    if (error) return NextResponse.json({ error: 'Nu am putut salva.' }, { status: 500 })
    return NextResponse.json({ ok: true, comment: c })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
