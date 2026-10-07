import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { collabPostUrls, detectPlatform, normalizePostUrl, cleanCount, METRIC_FIELDS, type MetricField } from '@/lib/post-metrics'
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { logDbError } from '@/lib/log-error'

// Creatorul își completează statisticile postărilor (TikTok, story-uri, vizualizări Instagram…).
// Câmpurile citite automat (Instagram: like-uri/comentarii; YouTube: vizualizări/like-uri/comentarii) nu pot fi suprascrise.
const AUTO_FIELDS: Record<string, MetricField[]> = {
  instagram: ['likes', 'comments'],
  youtube: ['views', 'likes', 'comments'],
}

async function ownCollab(collabId: string) {
  const user = await getSessionUser()
  if (!user) return { res: unauthorized() }
  const admin = createAdminClient()
  const { data: collab } = await admin.from('collaborations')
    .select('id, campaign_id, influencer_id, status, deliverable_url, deliverable_urls, influencers(user_id)')
    .eq('id', collabId).maybeSingle()
  if (!collab || (collab as any).influencers?.user_id !== user.id) return { res: forbidden() }
  return { admin, user, collab: collab as any }
}

async function ensureRows(admin: ReturnType<typeof createAdminClient>, collab: any) {
  const urls = collabPostUrls(collab)
  if (urls.length) {
    await admin.from('post_metrics').upsert(
      urls.map(url => ({ collaboration_id: collab.id, campaign_id: collab.campaign_id, influencer_id: collab.influencer_id, url, platform: detectPlatform(url), source: 'pending' })),
      { onConflict: 'collaboration_id,url', ignoreDuplicates: true },
    )
  }
  const { data } = await admin.from('post_metrics').select('*').eq('collaboration_id', collab.id)
  return (data || []).filter((r: any) => urls.includes(r.url))
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('collaboration_id') || ''
  const a = await ownCollab(id)
  if (a.res) return a.res
  const rows = await ensureRows(a.admin!, a.collab)
  return NextResponse.json({ rows: rows.map((r: any) => ({ ...r, locked: AUTO_FIELDS[r.source] || [] })) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await ownCollab(String(body?.collaboration_id || ''))
  if (a.res) return a.res
  { const limited = await limitRequest(req, 'post-metrics', LIMITS.comment, a.user!.id); if (limited) return limited }
  if (!['ACTIVE', 'COMPLETED'].includes(a.collab.status)) return NextResponse.json({ error: 'Colaborarea nu e activă.' }, { status: 400 })

  const url = normalizePostUrl(String(body?.url || ''))
  const rows = await ensureRows(a.admin!, a.collab)
  const row = rows.find((r: any) => r.url === url)
  if (!url || !row) return NextResponse.json({ error: 'Linkul nu face parte din postările trimise pentru această colaborare.' }, { status: 400 })

  const locked = AUTO_FIELDS[row.source] || []
  const patch: Record<string, any> = {}
  for (const f of METRIC_FIELDS) {
    if (locked.includes(f) || !(f in (body || {}))) continue
    const v = cleanCount(body[f])
    if (body[f] !== '' && body[f] !== null && v === null) return NextResponse.json({ error: `Valoare invalidă la „${f}”.` }, { status: 400 })
    patch[f] = v
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Completează cel puțin o valoare.' }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await a.admin!.from('post_metrics').update({
    ...patch, reported_at: now, updated_at: now,
    ...(row.source === 'pending' || row.source === 'creator' ? { source: 'creator' } : {}),
  }).eq('id', row.id).select('*').single()
  if (error) {
    await logDbError('post_metrics report', error, { collab: a.collab.id })
    return NextResponse.json({ error: 'Nu am putut salva. Încearcă din nou.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, row: { ...data, locked } })
}
