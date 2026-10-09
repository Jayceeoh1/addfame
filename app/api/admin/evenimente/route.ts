import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'
import { EVENT_BUCKET, cleanUrl, slugify } from '@/lib/events'

const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

// GET → evenimentele cu numărul de poze. POST → creează / modifică un eveniment. DELETE ?id= → șterge evenimentul și pozele lui.
export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('site_events').select('*').order('starts_at', { ascending: false, nullsFirst: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const counts: Record<string, number> = {}
  const { data: photos } = await admin.from('site_event_photos').select('event_id')
  for (const p of photos || []) counts[p.event_id] = (counts[p.event_id] || 0) + 1
  return NextResponse.json({ events: (data || []).map(e => ({ ...e, photos: counts[e.id] || 0 })) })
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const title = txt(b.title, 160)
  if (!title) return NextResponse.json({ error: 'Scrie numele evenimentului.' }, { status: 400 })
  const slug = (String(b.slug || '').trim().toLowerCase() || slugify(title))
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return NextResponse.json({ error: 'Adresa poate avea doar litere mici, cifre și cratime, 3–60 de caractere.' }, { status: 400 })
  if (!['draft', 'published'].includes(b.status)) return NextResponse.json({ error: 'Status invalid.' }, { status: 400 })
  let startsAt: string | null = null
  if (b.starts_at) {
    const d = new Date(b.starts_at)
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'Data nu e validă.' }, { status: 400 })
    startsAt = d.toISOString()
  }
  if (b.signup_url && !cleanUrl(b.signup_url)) return NextResponse.json({ error: 'Linkul de rezervare nu e valid.' }, { status: 400 })
  const row = {
    slug, title, status: b.status, starts_at: startsAt,
    location: txt(b.location, 200), city: txt(b.city, 80), description: txt(b.description, 1500),
    signup_url: cleanUrl(b.signup_url), updated_at: new Date().toISOString(),
  }
  const admin = createAdminClient()
  const res = isUuid(b.id)
    ? await admin.from('site_events').update(row).eq('id', b.id).select('*').single()
    : await admin.from('site_events').insert(row).select('*').single()
  if (res.error) {
    const msg = res.error.code === '23505' ? 'Există deja un eveniment cu adresa asta.' : res.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ event: res.data })
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!isUuid(id)) return NextResponse.json({ error: 'Id invalid.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: photos } = await admin.from('site_event_photos').select('path').eq('event_id', id)
  const paths = (photos || []).map(p => p.path)
  if (paths.length) await admin.storage.from(EVENT_BUCKET).remove(paths)
  const { error } = await admin.from('site_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
