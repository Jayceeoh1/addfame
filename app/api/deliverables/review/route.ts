import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, notify, postDraftMessage, summarizeComments } from '@/lib/drafts'

// Brandul aprobă draftul sau cere modificări. NU atinge plata / escrow.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const { draftId, action, note } = await req.json().catch(() => ({}))
    if (!isUuid(draftId) || !['approve', 'changes'].includes(action)) {
      return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
    }
    const text = typeof note === 'string' ? note.trim().slice(0, 1000) : ''
    if (action === 'changes' && !text) {
      return NextResponse.json({ error: 'Scrie ce trebuie modificat.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: d } = await admin.from('deliverable_drafts')
      .select('id, collaboration_id, version, status').eq('id', draftId).maybeSingle()
    if (!d) return NextResponse.json({ error: 'Draft inexistent' }, { status: 404 })
    const access = await getCollabAccess(admin, d.collaboration_id, user.id)
    if (!access || access.role !== 'brand') return forbidden()

    const next = action === 'approve' ? 'approved' : 'changes_requested'
    // tranziție atomică: doar din „pending"
    const { data: upd } = await admin.from('deliverable_drafts')
      .update({ status: next, review_note: text || null, reviewed_at: new Date().toISOString() })
      .eq('id', draftId).eq('status', 'pending').select('id')
    if (!upd?.length) return NextResponse.json({ error: 'Draftul a fost deja revizuit.' }, { status: 409 })

    await notify(admin, access.influencerUserId,
      action === 'approve' ? 'Draft aprobat' : 'Brandul cere modificări',
      action === 'approve'
        ? `Draftul tău pentru „${access.title}” a fost aprobat. Poți posta.`
        : `Brandul a cerut modificări la draftul pentru „${access.title}”.`,
      '/influencer/collaborations')
    if (action === 'approve') {
      await postDraftMessage(admin, d.collaboration_id, user.id, 'approved',
        `Draftul v${d.version} a fost aprobat. Poți posta exact varianta aprobată.`)
    } else {
      const { data: cs } = await admin.from('deliverable_draft_comments')
        .select('at_second, body').eq('draft_id', draftId).eq('author_role', 'brand').order('at_second', { ascending: true })
      await postDraftMessage(admin, d.collaboration_id, user.id, 'changes',
        `Cer modificări la draftul v${d.version}: ${text}${summarizeComments(cs || [])}`)
    }
    return NextResponse.json({ ok: true, status: next })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
