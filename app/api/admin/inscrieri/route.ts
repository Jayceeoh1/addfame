import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'

// GET → paginile de înscriere, cu numărul de înscriși. POST → creează / modifică o pagină.
export async function GET() {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data, error } = await admin.from('signup_forms').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const counts: Record<string, number> = {}
  const { data: apps } = await admin.from('signup_entries').select('form_id')
  for (const a of apps || []) counts[a.form_id] = (counts[a.form_id] || 0) + 1
  return NextResponse.json({ forms: (data || []).map(c => ({ ...c, applications: counts[c.id] || 0 })) })
}

const txt = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const slug = String(b.slug || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return NextResponse.json({ error: 'Adresa (slug) poate avea doar litere mici, cifre și cratime, 3–60 de caractere.' }, { status: 400 })
  const title = txt(b.title, 160)
  if (!title) return NextResponse.json({ error: 'Scrie titlul paginii.' }, { status: 400 })
  if (!['draft', 'open', 'closed'].includes(b.status)) return NextResponse.json({ error: 'Status invalid.' }, { status: 400 })
  const deadline = typeof b.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.deadline) ? b.deadline : null
  const row = {
    slug, title, status: b.status, deadline,
    eyebrow: txt(b.eyebrow, 80), intro: txt(b.intro, 600), brand_name: txt(b.brand_name, 120),
    location: txt(b.location, 200), shoot_period: txt(b.shoot_period, 120),
    deliverable: txt(b.deliverable, 120) || '1 video (TikTok / Reel / Short)',
    min_followers: Math.max(0, Math.min(10_000_000, Math.round(Number(b.min_followers) || 0))),
    zone_label: txt(b.zone_label, 80) || 'București și Ilfov',
    updated_at: new Date().toISOString(),
  }
  const admin = createAdminClient()
  const res = isUuid(b.id)
    ? await admin.from('signup_forms').update(row).eq('id', b.id).select('*').single()
    : await admin.from('signup_forms').insert(row).select('*').single()
  if (res.error) {
    const msg = res.error.code === '23505' ? 'Există deja o pagină cu adresa asta.' : res.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ form: res.data })
}
