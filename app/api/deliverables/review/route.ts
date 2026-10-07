import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, notify, postDraftMessage, summarizeComments, canRequestChanges, revisionDeadline, MAX_REVISION_ROUNDS } from '@/lib/drafts'

// Brandul aprobă draftul sau cere modificări. NU atinge plata / escrow.
export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'review', LIMITS.comment); if (limited) return limited }
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

    // Maximum 2 runde de modificări; fiecare are termen pentru creator (48h, apoi 24h)
    let round = 0
    let dueAt: Date | null = null
    if (action === 'changes') {
      const { count: prev } = await admin.from('deliverable_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('collaboration_id', d.collaboration_id).eq('status', 'changes_requested')
      if (!canRequestChanges(prev ?? 0)) {
        return NextResponse.json({
          error: `Ai folosit deja cele ${MAX_REVISION_ROUNDS} runde de modificări. Poți aproba draftul sau, dacă ceva nu e în regulă, poți deschide un litigiu.`,
          limitReached: true,
        }, { status: 409 })
      }
      round = (prev ?? 0) + 1
      dueAt = revisionDeadline(round)
    }

    // tranziție atomică: doar din „pending"
    const baseUpd = { status: next, review_note: text || null, reviewed_at: new Date().toISOString() }
    const runUpd = (extra: Record<string, unknown>) => admin.from('deliverable_drafts')
      .update({ ...baseUpd, ...extra }).eq('id', draftId).eq('status', 'pending').select('id')
    let { data: upd, error: updErr } = await runUpd(dueAt ? { revision_round: round, revision_due_at: dueAt.toISOString() } : {})
    if (updErr && dueAt) ({ data: upd } = await runUpd({}))   // SQL 22 încă nerulat: cererea merge fără termen
    if (!upd?.length) return NextResponse.json({ error: 'Draftul a fost deja revizuit.' }, { status: 409 })

    await notify(admin, access.influencerUserId,
      action === 'approve' ? 'Draft aprobat' : 'Brandul cere modificări',
      action === 'approve'
        ? `Draftul tău pentru „${access.title}” a fost aprobat. Poți posta.`
        : `Brandul a cerut modificări la draftul pentru „${access.title}”. Ai ${round === 1 ? '48' : '24'} de ore să trimiți versiunea nouă.`,
      '/influencer/collaborations')
    if (action === 'approve') {
      await postDraftMessage(admin, d.collaboration_id, user.id, 'approved',
        `Draftul v${d.version} a fost aprobat. Poți posta exact varianta aprobată.`)
    } else {
      const { data: cs } = await admin.from('deliverable_draft_comments')
        .select('at_second, body').eq('draft_id', draftId).eq('author_role', 'brand').order('at_second', { ascending: true })
      await postDraftMessage(admin, d.collaboration_id, user.id, 'changes',
        `Cer modificări la draftul v${d.version}: ${text}${summarizeComments(cs || [])}\n\nTermen pentru versiunea nouă: ${dueAt!.toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} (runda ${round} din ${MAX_REVISION_ROUNDS}).`)
    }
    return NextResponse.json({ ok: true, status: next })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
