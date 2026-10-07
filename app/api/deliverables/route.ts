import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, DRAFT_BUCKET, VIEW_URL_TTL } from '@/lib/drafts'

// GET /api/deliverables?collabId=...  -> drafturi + comentarii + URL de redare (1h)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const collabId = req.nextUrl.searchParams.get('collabId') || ''
    if (!isUuid(collabId)) return NextResponse.json({ error: 'collabId invalid' }, { status: 400 })

    const admin = createAdminClient()
    const access = await getCollabAccess(admin, collabId, user.id)
    if (!access) return forbidden()

    const base = 'id, version, file_name, file_size, mime, duration_sec, caption, note, status, review_note, reviewed_at, created_at, file_path'
    const run = (cols: string) => admin
      .from('deliverable_drafts')
      .select(cols)
      .eq('collaboration_id', collabId)
      .in('status', ['pending', 'approved', 'changes_requested'])
      .order('version', { ascending: false })
    // Coloanele de termen există după SQL 22; până atunci revenim la varianta veche, ca să nu dispară drafturile.
    let res: any = await run(base + ', revision_round, revision_due_at')
    if (res.error) res = await run(base)
    const drafts = res.data as any[] | null
    const list = drafts || []
    const ids = list.map(d => d.id)
    const { data: comments } = ids.length
      ? await admin.from('deliverable_draft_comments')
          .select('id, draft_id, author_role, at_second, body, created_at')
          .in('draft_id', ids).order('at_second', { ascending: true, nullsFirst: true })
      : { data: [] as any[] }

    const out = await Promise.all(list.map(async ({ file_path, ...d }) => {
      const { data: s } = await admin.storage.from(DRAFT_BUCKET).createSignedUrl(file_path, VIEW_URL_TTL)
      return { ...d, viewUrl: s?.signedUrl ?? null, comments: (comments || []).filter(c => c.draft_id === d.id) }
    }))
    return NextResponse.json({ role: access.role, drafts: out })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
