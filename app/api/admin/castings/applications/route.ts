import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'

// GET ?casting=<id>            → înscrierile castingului
// GET ?insight=<applicationId> → link temporar (10 min) spre captura cu statistici
// PATCH { id, status?, admin_note? }
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const insight = req.nextUrl.searchParams.get('insight')
  if (insight) {
    if (!isUuid(insight)) return NextResponse.json({ error: 'id invalid' }, { status: 400 })
    const { data: a } = await admin.from('casting_applications').select('insights_path').eq('id', insight).maybeSingle()
    if (!a?.insights_path) return NextResponse.json({ error: 'Fără captură' }, { status: 404 })
    const { data: s, error } = await admin.storage.from('castinguri').createSignedUrl(a.insights_path, 600)
    if (error || !s) return NextResponse.json({ error: 'Nu am putut deschide captura.' }, { status: 500 })
    return NextResponse.json({ url: s.signedUrl })
  }
  const casting = req.nextUrl.searchParams.get('casting') || ''
  if (!isUuid(casting)) return NextResponse.json({ error: 'casting invalid' }, { status: 400 })
  const [{ data: c }, { data, error }] = await Promise.all([
    admin.from('castings').select('*').eq('id', casting).maybeSingle(),
    admin.from('casting_applications').select('*').eq('casting_id', casting).order('created_at', { ascending: false }).limit(2000),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ casting: c, applications: data || [] })
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (!isUuid(b.id)) return NextResponse.json({ error: 'id invalid' }, { status: 400 })
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (b.status !== undefined) {
    if (!['new', 'shortlisted', 'selected', 'rejected'].includes(b.status)) return NextResponse.json({ error: 'Status invalid' }, { status: 400 })
    patch.status = b.status
  }
  if (b.admin_note !== undefined) patch.admin_note = typeof b.admin_note === 'string' ? b.admin_note.trim().slice(0, 1000) || null : null
  const { data, error } = await createAdminClient().from('casting_applications').update(patch).eq('id', b.id).select('id, status, admin_note').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}
