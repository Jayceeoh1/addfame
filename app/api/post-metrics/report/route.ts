import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { normalizePostUrl, cleanCount, type MetricField } from '@/lib/post-metrics'
import { ensureReportRows, signScreenshots, toReportRows, STORY_PREFIX } from '@/lib/collab-report'
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { logDbError } from '@/lib/log-error'

// Creatorul își completează statisticile pentru raport: postările trimise (din link) și story-urile,
// cu captură de ecran din Insights. Câmpurile citite automat (Instagram: like-uri/comentarii;
// YouTube: vizualizări/like-uri/comentarii) și cele corectate de admin nu pot fi suprascrise.
// După publicarea raportului, cifrele se blochează.
const AUTO_FIELDS: Record<string, MetricField[]> = {
  instagram: ['likes', 'comments'],
  youtube: ['views', 'likes', 'comments'],
}
const EDITABLE = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'link_clicks'] as const
const MAX_STORIES = 20

async function ownCollab(collabId: string) {
  const user = await getSessionUser()
  if (!user) return { res: unauthorized() }
  const admin = createAdminClient()
  const { data: collab } = await admin.from('collaborations')
    .select('id, campaign_id, influencer_id, status, deliverable_url, deliverable_urls, influencers(user_id)')
    .eq('id', collabId).maybeSingle()
  if (!collab || (collab as any).influencers?.user_id !== user.id) return { res: forbidden() }
  const { data: rep } = await admin.from('collaboration_reports').select('status').eq('collaboration_id', collabId).maybeSingle()
  return { admin, user, collab: collab as any, published: rep?.status === 'published' }
}

function lockedFor(r: any, published: boolean): string[] {
  if (published || r?.source === 'admin') return [...EDITABLE]
  return AUTO_FIELDS[r?.source] || []
}

async function payload(admin: ReturnType<typeof createAdminClient>, collab: any, published: boolean) {
  const raw = await ensureReportRows(admin, collab)
  const signed = await signScreenshots(admin, raw.map((r: any) => r.screenshot_path))
  const rows = toReportRows(raw, signed)
  const byId = new Map(raw.map((r: any) => [r.id, r]))
  return {
    published,
    report_url: published ? `/raport/${collab.id}` : null,
    rows: rows.map(r => ({ ...r, locked: lockedFor(byId.get(r.id), published), verified: byId.get(r.id)?.source === 'admin' })),
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('collaboration_id') || ''
  const a = await ownCollab(id)
  if (a.res) return a.res
  return NextResponse.json(await payload(a.admin!, a.collab, a.published!))
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await ownCollab(String(body?.collaboration_id || ''))
  if (a.res) return a.res
  { const limited = await limitRequest(req, 'post-metrics', LIMITS.comment, a.user!.id); if (limited) return limited }
  if (!['ACTIVE', 'COMPLETED'].includes(a.collab.status)) return NextResponse.json({ error: 'Colaborarea nu e activă.' }, { status: 400 })
  if (a.published) return NextResponse.json({ error: 'Raportul a fost publicat, cifrele nu se mai pot schimba. Scrie-ne dacă trebuie corectat ceva.' }, { status: 400 })
  const admin = a.admin!
  const now = new Date().toISOString()

  // ── adaugă un story (story-urile nu au link permanent)
  if (body?.action === 'add_story') {
    const rows = await ensureReportRows(admin, a.collab)
    const stories = rows.filter((r: any) => r.kind === 'story' || String(r.url).startsWith(STORY_PREFIX))
    if (stories.length >= MAX_STORIES) return NextResponse.json({ error: `Poți adăuga cel mult ${MAX_STORIES} story-uri.` }, { status: 400 })
    const { error } = await admin.from('post_metrics').insert({
      collaboration_id: a.collab.id, campaign_id: a.collab.campaign_id, influencer_id: a.collab.influencer_id,
      url: `${STORY_PREFIX}${crypto.randomUUID()}`, platform: 'instagram', kind: 'story',
      label: String(body?.label || '').trim().slice(0, 80) || null, source: 'creator', reported_at: now, updated_at: now,
    })
    if (error) { await logDbError('post_metrics add story', error, { collab: a.collab.id }); return NextResponse.json({ error: 'Nu am putut adăuga story-ul.' }, { status: 500 }) }
    return NextResponse.json({ ok: true, ...(await payload(admin, a.collab, false)) })
  }

  const rows = await ensureReportRows(admin, a.collab)
  const url = body?.url ? normalizePostUrl(String(body.url)) : null
  const row = rows.find((r: any) => (body?.row_id && r.id === body.row_id) || (url && r.url === url))
  if (!row) return NextResponse.json({ error: 'Postarea nu face parte din această colaborare.' }, { status: 400 })

  // ── șterge un story adăugat de creator
  if (body?.action === 'delete_story') {
    const isStory = row.kind === 'story' || String(row.url).startsWith(STORY_PREFIX)
    if (!isStory || row.source === 'admin') return NextResponse.json({ error: 'Doar story-urile adăugate de tine se pot șterge.' }, { status: 400 })
    const { error } = await admin.from('post_metrics').delete().eq('id', row.id)
    if (error) return NextResponse.json({ error: 'Nu am putut șterge.' }, { status: 500 })
    if (row.screenshot_path) await admin.storage.from('rapoarte').remove([row.screenshot_path]).catch(() => null)
    return NextResponse.json({ ok: true, ...(await payload(admin, a.collab, false)) })
  }

  // ── salvează cifrele
  const locked = lockedFor(row, false)
  const patch: Record<string, any> = {}
  for (const f of EDITABLE) {
    if (locked.includes(f) || !(f in (body || {}))) continue
    const v = cleanCount(body[f])
    if (body[f] !== '' && body[f] !== null && v === null) return NextResponse.json({ error: `Valoare invalidă la „${f}”.` }, { status: 400 })
    patch[f] = v
  }
  if ('label' in (body || {}) && row.source !== 'admin') patch.label = String(body.label || '').trim().slice(0, 80) || null
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Completează cel puțin o valoare.' }, { status: 400 })

  const { error } = await admin.from('post_metrics').update({
    ...patch, reported_at: now, updated_at: now,
    ...(row.source === 'pending' || row.source === 'creator' ? { source: 'creator' } : {}),
  }).eq('id', row.id)
  if (error) {
    await logDbError('post_metrics report', error, { collab: a.collab.id })
    return NextResponse.json({ error: 'Nu am putut salva. Încearcă din nou.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...(await payload(admin, a.collab, false)) })
}
