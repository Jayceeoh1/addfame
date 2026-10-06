import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, DRAFT_BUCKET, DOWNLOAD_URL_TTL } from '@/lib/drafts'

// GET /api/deliverables/download?draftId=...  -> URL semnat scurt (5 min) cu nume de fișier pentru descărcare
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const draftId = req.nextUrl.searchParams.get('draftId') || ''
    if (!isUuid(draftId)) return NextResponse.json({ error: 'draftId invalid' }, { status: 400 })

    const admin = createAdminClient()
    const { data: d } = await admin.from('deliverable_drafts')
      .select('collaboration_id, file_path, file_name, status').eq('id', draftId).maybeSingle()
    if (!d || d.status === 'deleted' || d.status === 'uploading') {
      return NextResponse.json({ error: 'Draft indisponibil' }, { status: 404 })
    }
    const access = await getCollabAccess(admin, d.collaboration_id, user.id)
    if (!access) return forbidden()

    const { data: s, error } = await admin.storage.from(DRAFT_BUCKET)
      .createSignedUrl(d.file_path, DOWNLOAD_URL_TTL, { download: d.file_name })
    if (error || !s) return NextResponse.json({ error: 'Fișier indisponibil' }, { status: 404 })
    return NextResponse.json({ url: s.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
