import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, verifyAdminSession, unauthorized, forbidden } from '@/lib/api-auth'
import { isUuid } from '@/lib/drafts'
import { REPORT_BUCKET } from '@/lib/collab-report'
import { limitRequest, LIMITS } from '@/lib/rate-limit'

// Captura de ecran cu statisticile (Insights) unei postări sau a unui story.
// POST (multipart: row_id, file) → încarcă / înlocuiește. DELETE ?row_id= → șterge.
// Are voie creatorul colaborării (cât timp raportul nu e publicat) sau un admin.
const MAX_BYTES = 8 * 1024 * 1024
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }

async function access(rowId: string) {
  const user = await getSessionUser()
  if (!user) return { res: unauthorized() }
  if (!isUuid(rowId)) return { res: NextResponse.json({ error: 'Id invalid.' }, { status: 400 }) }
  const admin = createAdminClient()
  const { data: row } = await admin.from('post_metrics').select('id, collaboration_id, screenshot_path').eq('id', rowId).maybeSingle()
  if (!row) return { res: NextResponse.json({ error: 'Rândul nu există.' }, { status: 404 }) }
  if (await verifyAdminSession()) return { admin, user, row }
  const { data: c } = await admin.from('collaborations').select('id, status, influencers(user_id)').eq('id', row.collaboration_id).maybeSingle()
  if (!c || (c as any).influencers?.user_id !== user.id) return { res: forbidden() }
  const { data: rep } = await admin.from('collaboration_reports').select('status').eq('collaboration_id', row.collaboration_id).maybeSingle()
  if (rep?.status === 'published') return { res: NextResponse.json({ error: 'Raportul a fost publicat. Scrie-ne dacă trebuie corectat ceva.' }, { status: 400 }) }
  return { admin, user, row }
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  const a = await access(String(form?.get('row_id') || ''))
  if (a.res) return a.res
  { const limited = await limitRequest(req, 'report-shot', LIMITS.upload, a.user!.id); if (limited) return limited }
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Alege o captură de ecran.' }, { status: 400 })
  const ext = EXT[file.type]
  if (!ext) return NextResponse.json({ error: 'Doar imagini JPG, PNG, WebP sau HEIC.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Imaginea are peste 8 MB.' }, { status: 400 })

  const path = `${a.row!.collaboration_id}/${a.row!.id}-${Date.now()}.${ext}`
  const { error: upErr } = await a.admin!.storage.from(REPORT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: 'Nu am putut încărca imaginea: ' + upErr.message }, { status: 500 })
  const { error } = await a.admin!.from('post_metrics').update({ screenshot_path: path, updated_at: new Date().toISOString() }).eq('id', a.row!.id)
  if (error) { await a.admin!.storage.from(REPORT_BUCKET).remove([path]); return NextResponse.json({ error: error.message }, { status: 500 }) }
  if (a.row!.screenshot_path) await a.admin!.storage.from(REPORT_BUCKET).remove([a.row!.screenshot_path]).catch(() => null)
  const { data: signed } = await a.admin!.storage.from(REPORT_BUCKET).createSignedUrl(path, 60 * 60)
  return NextResponse.json({ ok: true, screenshot_path: path, screenshot_url: signed?.signedUrl || null })
}

export async function DELETE(req: NextRequest) {
  const a = await access(req.nextUrl.searchParams.get('row_id') || '')
  if (a.res) return a.res
  if (a.row!.screenshot_path) await a.admin!.storage.from(REPORT_BUCKET).remove([a.row!.screenshot_path]).catch(() => null)
  const { error } = await a.admin!.from('post_metrics').update({ screenshot_path: null, updated_at: new Date().toISOString() }).eq('id', a.row!.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
