import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid, notify, postDraftMessage, DRAFT_BUCKET, MAX_DRAFT_BYTES } from '@/lib/drafts'

// După încărcare: verifică fișierul din Storage, trece draftul în „pending" și anunță brandul.
export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'complete', LIMITS.upload); if (limited) return limited }
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const { draftId, durationSec } = await req.json().catch(() => ({}))
    if (!isUuid(draftId)) return NextResponse.json({ error: 'draftId invalid' }, { status: 400 })

    const admin = createAdminClient()
    const { data: d } = await admin.from('deliverable_drafts').select('*').eq('id', draftId).maybeSingle()
    if (!d) return NextResponse.json({ error: 'Draft inexistent' }, { status: 404 })
    const access = await getCollabAccess(admin, d.collaboration_id, user.id)
    if (!access || access.role !== 'influencer') return forbidden()
    if (d.status !== 'uploading') return NextResponse.json({ error: 'Draft deja trimis' }, { status: 409 })

    // fișierul trebuie să existe cu dimensiunea declarată (nu depășește limita)
    const dir = d.file_path.slice(0, d.file_path.lastIndexOf('/'))
    const { data: files } = await admin.storage.from(DRAFT_BUCKET).list(dir, { limit: 5 })
    const f = (files || []).find(x => x.name === d.file_name)
    const real = Number((f as any)?.metadata?.size ?? 0)
    if (!f || !real) return NextResponse.json({ error: 'Fișierul nu a fost încărcat.' }, { status: 400 })
    if (real > MAX_DRAFT_BYTES) {
      await admin.storage.from(DRAFT_BUCKET).remove([d.file_path])
      await admin.from('deliverable_drafts').delete().eq('id', draftId)
      return NextResponse.json({ error: 'Fișierul depășește 200 MB' }, { status: 413 })
    }

    const dur = Number.isFinite(Number(durationSec)) ? Math.max(0, Math.round(Number(durationSec))) : null
    // draftul anterior încă în așteptare e înlocuit de cel nou
    const { data: old } = await admin.from('deliverable_drafts')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('collaboration_id', d.collaboration_id).eq('status', 'pending').neq('id', draftId)
      .select('file_path')
    if (old?.length) await admin.storage.from(DRAFT_BUCKET).remove(old.map(o => o.file_path))
    const { error } = await admin.from('deliverable_drafts')
      .update({ status: 'pending', file_size: real, duration_sec: dur }).eq('id', draftId)
    if (error) return NextResponse.json({ error: 'Nu am putut salva.' }, { status: 500 })

    await notify(admin, access.brandUserId,
      `Draft nou de revizuit (v${d.version})`,
      `${access.influencerName} a trimis un draft video pentru „${access.title}”.`,
      '/brand/collaborations')
    await postDraftMessage(admin, d.collaboration_id, user.id, 'uploaded',
      `Am trimis draftul video v${d.version} pentru „${access.title}”. Îl poți revizui acum.`, 'influencer')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}
