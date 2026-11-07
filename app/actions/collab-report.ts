'use server'
// Raportul per colaborare: adminul editează tot (cifre, texte, cost) și îl publică;
// brandul și creatorul îl văd după publicare. Totul trece prin server (service_role).
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, verifyAdminSession } from '@/lib/supabase/verify-admin'
import { getSessionUser } from '@/lib/api-auth'
import { isUuid, notify } from '@/lib/drafts'
import { cleanCount } from '@/lib/post-metrics'
import { campaignName } from '@/lib/campaign-name'
import { loadCollabReport, cleanSettings, igHandle, STORY_PREFIX, REPORT_SECTIONS, type CollabReport } from '@/lib/collab-report'

const EDIT_FIELDS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'link_clicks'] as const

export type ReportViewer = 'admin' | 'brand' | 'influencer'

/** Raportul pentru pagina /raport/[id]: adminul îl vede oricând, brandul și creatorul doar publicat. */
export async function getCollabReport(collabId: string): Promise<{ report?: CollabReport; viewer?: ReportViewer; error?: string }> {
  if (!isUuid(collabId)) return { error: 'Raport inexistent.' }
  const user = await getSessionUser()
  if (!user) return { error: 'login' }
  const admin = createAdminClient()
  const report = await loadCollabReport(admin, collabId)
  if (!report) return { error: 'Raport inexistent.' }
  if (await verifyAdminSession()) return { report, viewer: 'admin' }
  let viewer: ReportViewer | null = null
  if (report.creator.userId === user.id) viewer = 'influencer'
  else if (report.brandUserId === user.id) viewer = 'brand'
  if (!viewer) return { error: 'Nu ai acces la acest raport.' }
  if (report.settings.status !== 'published') return { error: 'Raportul nu e gata încă. Te anunțăm când îl publicăm.' }
  // nota internă nu pleacă din server
  return { report: { ...report, settings: { ...report.settings, admin_note: null } }, viewer }
}

/** Colaborările unei campanii care au raport publicat (pentru brand sau admin). */
export async function publishedReportsForCampaign(campaignId: string): Promise<{ ids: string[] }> {
  if (!isUuid(campaignId)) return { ids: [] }
  const user = await getSessionUser()
  if (!user) return { ids: [] }
  const admin = createAdminClient()
  if (!(await verifyAdminSession())) {
    const { data: camp } = await admin.from('campaigns').select('brand_id').eq('id', campaignId).maybeSingle()
    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!camp || !brand || camp.brand_id !== brand.id) return { ids: [] }
  }
  const { data: collabs } = await admin.from('collaborations').select('id').eq('campaign_id', campaignId)
  const ids = (collabs || []).map((c: any) => c.id)
  if (!ids.length) return { ids: [] }
  const { data } = await admin.from('collaboration_reports').select('collaboration_id').eq('status', 'published').in('collaboration_id', ids)
  return { ids: (data || []).map((r: any) => r.collaboration_id) }
}

// ── Admin ────────────────────────────────────────────────────────────

export async function adminListReports() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  const admin = createAdminClient()
  const { data: collabs, error } = await admin.from('collaborations')
    .select('id, status, campaign_id, influencer_id, completed_at, deliverable_submitted_at, created_at')
    .in('status', ['ACTIVE', 'COMPLETED'])
    .order('created_at', { ascending: false })
    .limit(1500)
  if (error) return { error: error.message }
  const list = collabs || []
  const campIds = [...new Set(list.map((c: any) => c.campaign_id))]
  const infIds = [...new Set(list.map((c: any) => c.influencer_id))]
  const ids = list.map((c: any) => c.id)
  const chunk = <T,>(a: T[], n = 300) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))
  const camps: any[] = [], infs: any[] = [], reps: any[] = [], pms: any[] = []
  for (const part of chunk(campIds)) { const { data } = await admin.from('campaigns').select('*').in('id', part); camps.push(...(data || [])) }
  for (const part of chunk(infIds)) { const { data } = await admin.from('influencers').select('id, name, avatar, instagram_handle, platforms').in('id', part); infs.push(...(data || [])) }
  for (const part of chunk(ids)) {
    const [{ data: r }, { data: p }] = await Promise.all([
      admin.from('collaboration_reports').select('collaboration_id, status, code, published_at, updated_at').in('collaboration_id', part),
      admin.from('post_metrics').select('collaboration_id, views, reach, likes, link_clicks').in('collaboration_id', part),
    ])
    reps.push(...(r || [])); pms.push(...(p || []))
  }
  const campMap = new Map(camps.map(c => [c.id, c])), infMap = new Map(infs.map(i => [i.id, i])), repMap = new Map(reps.map(r => [r.collaboration_id, r]))
  const statMap = new Map<string, { rows: number; filled: number; views: number }>()
  for (const p of pms) {
    const s = statMap.get(p.collaboration_id) || { rows: 0, filled: 0, views: 0 }
    s.rows++; if (p.views != null || p.reach != null || p.likes != null || p.link_clicks != null) s.filled++
    s.views += Number(p.views) || 0
    statMap.set(p.collaboration_id, s)
  }
  return {
    rows: list.map((c: any) => {
      const camp = campMap.get(c.campaign_id) || {}, inf = infMap.get(c.influencer_id) || {}, rep = repMap.get(c.id)
      return {
        id: c.id, status: c.status, completedAt: c.completed_at || null, campaignId: c.campaign_id,
        campaign: campaignName(camp, camp.title || 'Campanie'), brand: camp.brand_name || '',
        creator: inf.name || 'Creator', handle: igHandle(inf), avatar: inf.avatar || null,
        report: rep ? { status: rep.status as string, code: rep.code as string | null, publishedAt: rep.published_at as string | null } : null,
        stats: statMap.get(c.id) || { rows: 0, filled: 0, views: 0 },
      }
    }),
  }
}

export async function adminGetReport(collabId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(collabId)) return { error: 'Id invalid.' }
  const report = await loadCollabReport(createAdminClient(), collabId)
  if (!report) return { error: 'Colaborarea nu există.' }
  return { report }
}

async function ensureReportRow(admin: ReturnType<typeof createAdminClient>, collabId: string) {
  const { data } = await admin.from('collaboration_reports').select('collaboration_id, code').eq('collaboration_id', collabId).maybeSingle()
  if (data) return data
  let code: string | null = null
  try { const { data: c } = await admin.rpc('collab_report_next_code'); code = (c as any) || null } catch { /* fără cod */ }
  const { data: ins, error } = await admin.from('collaboration_reports').insert({ collaboration_id: collabId, code }).select('collaboration_id, code').single()
  if (error) throw new Error(error.message)
  return ins
}

export async function adminSaveReport(collabId: string, patch: Record<string, any>) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(collabId)) return { error: 'Id invalid.' }
  const admin = createAdminClient()
  const s = cleanSettings({ ...patch, status: 'draft' })
  const up: Record<string, any> = { updated_at: new Date().toISOString(), updated_by: auth.userId }
  if ('cost_lei' in patch) {
    const v = patch.cost_lei === '' || patch.cost_lei == null ? null : Number(String(patch.cost_lei).replace(',', '.'))
    if (v != null && (!Number.isFinite(v) || v < 0)) return { error: 'Cost invalid.' }
    up.cost_lei = v
  }
  if ('followers' in patch) {
    const v = patch.followers === '' || patch.followers == null ? null : cleanCount(patch.followers)
    if (patch.followers !== '' && patch.followers != null && v == null) return { error: 'Număr de urmăritori invalid.' }
    up.followers = v
  }
  if ('brand_quote' in patch) up.brand_quote = String(patch.brand_quote || '').trim().slice(0, 600) || null
  if ('brand_quote_author' in patch) up.brand_quote_author = String(patch.brand_quote_author || '').trim().slice(0, 120) || null
  if ('highlights' in patch) up.highlights = s.highlights.map(h => h.slice(0, 220))
  if ('brief_checks' in patch) up.brief_checks = s.brief_checks.map(b => ({ text: b.text.slice(0, 220), ok: b.ok }))
  if ('hidden' in patch) up.hidden = s.hidden.filter(h => (REPORT_SECTIONS as readonly string[]).includes(h))
  if ('admin_note' in patch) up.admin_note = String(patch.admin_note || '').trim().slice(0, 2000) || null
  try { await ensureReportRow(admin, collabId) } catch (e: any) { return { error: 'Nu am putut crea raportul: ' + e.message } }
  const { error } = await admin.from('collaboration_reports').update(up).eq('collaboration_id', collabId)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function adminPublishReport(collabId: string, publish: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(collabId)) return { error: 'Id invalid.' }
  const admin = createAdminClient()
  let row: any
  try { row = await ensureReportRow(admin, collabId) } catch (e: any) { return { error: 'Nu am putut crea raportul: ' + e.message } }
  const { data: prev } = await admin.from('collaboration_reports').select('status, published_at').eq('collaboration_id', collabId).maybeSingle()
  const now = new Date().toISOString()
  const { error } = await admin.from('collaboration_reports').update({
    status: publish ? 'published' : 'draft',
    published_at: publish ? (prev?.published_at || now) : prev?.published_at ?? null,
    updated_at: now,
  }).eq('collaboration_id', collabId)
  if (error) return { error: error.message }
  // anunțăm doar la prima publicare
  if (publish && !prev?.published_at) {
    const rep = await loadCollabReport(admin, collabId)
    if (rep) {
      const link = `/raport/${collabId}`
      await notify(admin, rep.brandUserId, 'Raportul colaborării e gata', `Raportul pentru ${rep.creator.name} · ${rep.campaign.name} e disponibil.`, link)
      await notify(admin, rep.creator.userId, 'Raportul tău e gata', `Vezi rezultatele tale din ${rep.campaign.name} și descarcă imaginea pentru Story.`, link)
    }
  }
  return { ok: true, code: row?.code || null }
}

/** Adminul corectează cifrele unui rând (sursa devine „verificat de AddFame”). */
export async function adminSaveMetric(rowId: string, values: Record<string, any>) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(rowId)) return { error: 'Id invalid.' }
  const patch: Record<string, any> = {}
  for (const f of EDIT_FIELDS) {
    if (!(f in values)) continue
    const raw = values[f]
    const v = cleanCount(raw)
    if (raw !== '' && raw != null && v == null) return { error: `Valoare invalidă la „${f}”.` }
    patch[f] = v
  }
  if ('label' in values) patch.label = String(values.label || '').trim().slice(0, 80) || null
  if ('kind' in values && ['post', 'reel', 'story', 'video'].includes(values.kind)) patch.kind = values.kind
  const now = new Date().toISOString()
  const { error } = await createAdminClient().from('post_metrics').update({ ...patch, source: 'admin', admin_edited_at: now, updated_at: now }).eq('id', rowId)
  if (error) return { error: error.message }
  return { ok: true }
}

/** Adminul adaugă un story (fără link) sau o postare (cu link) la colaborare. */
export async function adminAddRow(collabId: string, opts: { kind: 'story' | 'post' | 'reel' | 'video'; url?: string; label?: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(collabId)) return { error: 'Id invalid.' }
  const admin = createAdminClient()
  const { data: c } = await admin.from('collaborations').select('id, campaign_id, influencer_id').eq('id', collabId).maybeSingle()
  if (!c) return { error: 'Colaborarea nu există.' }
  const { normalizePostUrl, detectPlatform } = await import('@/lib/post-metrics')
  let url: string, platform = 'instagram'
  if (opts.kind === 'story') url = `${STORY_PREFIX}${crypto.randomUUID()}`
  else {
    const n = normalizePostUrl(String(opts.url || ''))
    if (!n) return { error: 'Link invalid.' }
    url = n; platform = detectPlatform(n)
  }
  const now = new Date().toISOString()
  const { error } = await admin.from('post_metrics').insert({
    collaboration_id: c.id, campaign_id: c.campaign_id, influencer_id: c.influencer_id,
    url, platform, kind: opts.kind, label: String(opts.label || '').trim().slice(0, 80) || null,
    source: 'admin', admin_edited_at: now, updated_at: now,
  })
  if (error) return { error: error.code === '23505' ? 'Linkul există deja în raport.' : error.message }
  return { ok: true }
}

export async function adminDeleteRow(rowId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(rowId)) return { error: 'Id invalid.' }
  const admin = createAdminClient()
  const { data: r } = await admin.from('post_metrics').select('screenshot_path').eq('id', rowId).maybeSingle()
  const { error } = await admin.from('post_metrics').delete().eq('id', rowId)
  if (error) return { error: error.message }
  if (r?.screenshot_path) { try { await admin.storage.from('rapoarte').remove([r.screenshot_path]) } catch { /* rămâne în bucket */ } }
  return { ok: true }
}

// ── Raportul total pe campanie ─────────────────────────────────────────

export type CampaignReportData = {
  campaign: { id: string; name: string; brandName: string }
  viewer: ReportViewer
  reports: CollabReport[]
  drafts: number            // rapoarte nepublicate (doar pentru admin)
}

/** Toate rapoartele unei campanii. Brandul vede doar rapoartele publicate; adminul alege dacă include ciornele. */
export async function getCampaignReport(campaignId: string, includeDrafts = false): Promise<{ data?: CampaignReportData; error?: string }> {
  if (!isUuid(campaignId)) return { error: 'Campanie inexistentă.' }
  const user = await getSessionUser()
  if (!user) return { error: 'login' }
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('*').eq('id', campaignId).maybeSingle()
  if (!camp) return { error: 'Campanie inexistentă.' }
  const isAdmin = !!(await verifyAdminSession())
  if (!isAdmin) {
    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!brand || brand.id !== camp.brand_id) return { error: 'Nu ai acces la acest raport.' }
  }
  const { data: collabs } = await admin.from('collaborations').select('id').eq('campaign_id', campaignId).in('status', ['ACTIVE', 'COMPLETED']).limit(80)
  const ids = (collabs || []).map((c: any) => c.id)
  const { data: reps } = ids.length ? await admin.from('collaboration_reports').select('collaboration_id, status').in('collaboration_id', ids) : { data: [] as any[] }
  const published = new Set((reps || []).filter((r: any) => r.status === 'published').map((r: any) => r.collaboration_id))
  const want = isAdmin && includeDrafts ? ids : ids.filter(id => published.has(id))
  const reports: CollabReport[] = []
  for (let i = 0; i < want.length; i += 6) {
    const part = await Promise.all(want.slice(i, i + 6).map(id => loadCollabReport(admin, id)))
    for (const r of part) if (r) reports.push(isAdmin ? r : { ...r, settings: { ...r.settings, admin_note: null } })
  }
  reports.sort((a, b) => b.totals.views - a.totals.views)
  return {
    data: {
      campaign: { id: camp.id, name: campaignName(camp, camp.title || 'Campanie'), brandName: reports[0]?.campaign.brandName || camp.brand_name || 'Brand' },
      viewer: isAdmin ? 'admin' : 'brand',
      reports,
      drafts: isAdmin ? ids.filter(id => !published.has(id)).length : 0,
    },
  }
}
