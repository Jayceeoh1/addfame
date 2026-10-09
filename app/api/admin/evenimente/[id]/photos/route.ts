import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'
import { EVENT_BUCKET } from '@/lib/events'

type Ctx = { params: Promise<{ id: string }> }
const MAX_BYTES = 8 * 1024 * 1024
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// GET → pozele evenimentului. POST (multipart, câmpul „file”) → încarcă O poză (browserul o micșorează înainte).
// PATCH {photoId, caption? | cover? | move: 'up'|'down'} → legendă, copertă, ordine. DELETE ?photoId= → șterge poza.
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Id invalid.' }, { status: 400 })
  const { data, error } = await createAdminClient().from('site_event_photos').select('*').eq('event_id', id).order('position').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ photos: data || [] })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Id invalid.' }, { status: 400 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Alege o poză.' }, { status: 400 })
  const ext = EXT[file.type]
  if (!ext) return NextResponse.json({ error: 'Doar poze JPG, PNG sau WebP.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Poza are peste 8 MB.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ev } = await admin.from('site_events').select('id').eq('id', id).maybeSingle()
  if (!ev) return NextResponse.json({ error: 'Evenimentul nu există.' }, { status: 404 })

  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: upErr } = await admin.storage.from(EVENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: 'Nu am putut încărca poza: ' + upErr.message }, { status: 500 })

  const { data: last } = await admin.from('site_event_photos').select('position').eq('event_id', id).order('position', { ascending: false }).limit(1)
  const position = (last?.[0]?.position ?? -1) + 1
  const { data: photo, error } = await admin.from('site_event_photos').insert({ event_id: id, path, position }).select('*').single()
  if (error) { await admin.storage.from(EVENT_BUCKET).remove([path]); return NextResponse.json({ error: error.message }, { status: 500 }) }
  return NextResponse.json({ photo })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const b = await req.json().catch(() => ({}))
  if (!isUuid(id) || !isUuid(b.photoId)) return NextResponse.json({ error: 'Id invalid.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: photo } = await admin.from('site_event_photos').select('*').eq('id', b.photoId).eq('event_id', id).maybeSingle()
  if (!photo) return NextResponse.json({ error: 'Poza nu există.' }, { status: 404 })

  if (typeof b.caption === 'string') {
    const caption = b.caption.trim().slice(0, 160) || null
    const { error } = await admin.from('site_event_photos').update({ caption }).eq('id', photo.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (b.cover === true) {
    const { error } = await admin.from('site_events').update({ cover_photo_id: photo.id, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (b.move === 'up' || b.move === 'down') {
    // renumerotăm ordinea curentă 0..n și mutăm poza cu un loc
    const { data: all } = await admin.from('site_event_photos').select('id').eq('event_id', id).order('position').order('created_at')
    const ids = (all || []).map(p => p.id)
    const i = ids.indexOf(photo.id)
    const j = b.move === 'up' ? i - 1 : i + 1
    if (i >= 0 && j >= 0 && j < ids.length) {
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      for (let k = 0; k < ids.length; k++) await admin.from('site_event_photos').update({ position: k }).eq('id', ids[k])
    }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const photoId = req.nextUrl.searchParams.get('photoId')
  if (!isUuid(id) || !isUuid(photoId)) return NextResponse.json({ error: 'Id invalid.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: photo } = await admin.from('site_event_photos').select('path').eq('id', photoId).eq('event_id', id).maybeSingle()
  if (!photo) return NextResponse.json({ error: 'Poza nu există.' }, { status: 404 })
  await admin.storage.from(EVENT_BUCKET).remove([photo.path])
  await admin.from('site_events').update({ cover_photo_id: null }).eq('id', id).eq('cover_photo_id', photoId)
  const { error } = await admin.from('site_event_photos').delete().eq('id', photoId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
