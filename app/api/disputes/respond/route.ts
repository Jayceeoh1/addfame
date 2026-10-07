import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, notify } from '@/lib/drafts'
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { notifyAdmins } from '@/lib/disputes'

// Cealaltă parte răspunde la litigiu (cel care l-a deschis nu poate răspunde).
export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'dispute-respond', LIMITS.comment); if (limited) return limited }
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const { id, response } = await req.json().catch(() => ({}))
    const text = typeof response === 'string' ? response.trim() : ''
    if (!isUuid(id) || text.length < 1) return NextResponse.json({ error: 'Scrie un răspuns.' }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: 'Răspunsul e prea lung (maximum 2000 de caractere).' }, { status: 400 })

    const admin = createAdminClient()
    const { data: d } = await admin.from('disputes')
      .select('id, collaboration_id, opened_by_role, status').eq('id', id).maybeSingle()
    if (!d) return NextResponse.json({ error: 'Litigiu inexistent' }, { status: 404 })
    const access = await getCollabAccess(admin, d.collaboration_id, user.id)
    if (!access) return forbidden()
    if (access.role === d.opened_by_role) return NextResponse.json({ error: 'Doar cealaltă parte poate răspunde.' }, { status: 403 })
    if (d.status !== 'awaiting_response') return NextResponse.json({ error: 'Litigiul nu mai așteaptă un răspuns.' }, { status: 409 })

    const { data: upd } = await admin.from('disputes')
      .update({ response: text, responded_at: new Date().toISOString(), status: 'under_review' })
      .eq('id', id).eq('status', 'awaiting_response').select('id')
    if (!upd?.length) return NextResponse.json({ error: 'Litigiul nu mai așteaptă un răspuns.' }, { status: 409 })

    await notify(admin, access.role === 'brand' ? access.influencerUserId : access.brandUserId,
      'Răspuns la litigiu', `S-a răspuns la litigiul pentru „${access.title}”. Echipa AddFame îl analizează.`, '/')
    await notifyAdmins(admin, 'Litigiu gata de decizie', `„${access.title}”: ambele părți au scris.`)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Eroare server' }, { status: 500 }) }
}
