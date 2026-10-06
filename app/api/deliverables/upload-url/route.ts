import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import {
  getCollabAccess, safeFileName, isUuid, DRAFT_BUCKET, MAX_DRAFT_BYTES, MAX_DRAFT_VERSIONS, ALLOWED_MIME,
} from '@/lib/drafts'

// Creatorul cere un URL semnat de încărcare (fișierul merge direct din browser în Storage).
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const body = await req.json().catch(() => ({}))
    const { collabId, fileName, size, mime } = body
    const caption = typeof body.caption === 'string' ? body.caption.slice(0, 2200) : null
    const note = typeof body.note === 'string' ? body.note.slice(0, 1000) : null

    if (!isUuid(collabId)) return NextResponse.json({ error: 'collabId invalid' }, { status: 400 })
    const sz = Number(size)
    if (!Number.isFinite(sz) || sz <= 0) return NextResponse.json({ error: 'Dimensiune invalidă' }, { status: 400 })
    if (sz > MAX_DRAFT_BYTES) return NextResponse.json({ error: 'Fișierul depășește 200 MB' }, { status: 413 })
    if (!ALLOWED_MIME.includes(String(mime))) {
      return NextResponse.json({ error: 'Format neacceptat. Folosește MP4, MOV sau WebM.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const access = await getCollabAccess(admin, collabId, user.id)
    if (!access || access.role !== 'influencer') return forbidden()
    if (!['ACTIVE', 'IN_PROGRESS'].includes(access.status.toUpperCase())) {
      return NextResponse.json({ error: 'Colaborarea nu este activă.' }, { status: 409 })
    }

    const { data: existing } = await admin
      .from('deliverable_drafts').select('version, status').eq('collaboration_id', collabId)
      .order('version', { ascending: false })
    const rows = existing || []
    const version = (rows[0]?.version ?? 0) + 1
    if (version > MAX_DRAFT_VERSIONS) {
      return NextResponse.json({ error: 'Ai atins numărul maxim de versiuni.' }, { status: 409 })
    }
    if (rows[0]?.status === 'approved') {
      return NextResponse.json({ error: 'Draftul a fost deja aprobat.' }, { status: 409 })
    }

    const draftId = crypto.randomUUID()
    const name = safeFileName(String(fileName))
    const path = `${collabId}/${draftId}/${name}`

    const { data: signed, error: sErr } = await admin.storage.from(DRAFT_BUCKET).createSignedUploadUrl(path)
    if (sErr || !signed) return NextResponse.json({ error: 'Nu am putut pregăti încărcarea.' }, { status: 500 })

    const { error: iErr } = await admin.from('deliverable_drafts').insert({
      id: draftId, collaboration_id: collabId, influencer_id: access.influencerId, version,
      file_path: path, file_name: name, file_size: sz, mime: String(mime), caption, note, status: 'uploading',
    })
    if (iErr) return NextResponse.json({ error: 'Nu am putut salva draftul.' }, { status: 500 })

    return NextResponse.json({ draftId, version, path, token: signed.token, signedUrl: signed.signedUrl })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
