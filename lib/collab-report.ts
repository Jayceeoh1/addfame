// Raportul per colaborare: adună datele (colaborare, creator, campanie, postări, story-uri, recenzia brandului)
// și calculează cifrele. Cifrele vin din post_metrics: automat (Instagram/YouTube), completate de creator
// sau corectate de admin. Textele raportului (citat, „de ce a mers”, brief, cost) le editează adminul
// în collaboration_reports. Doar pe server (service_role).
import type { SupabaseClient } from '@supabase/supabase-js'
import { campaignName } from '@/lib/campaign-name'
import { collabPostUrls, detectPlatform, METRIC_FIELDS } from '@/lib/post-metrics'

export const REPORT_BUCKET = 'rapoarte'
export const STORY_PREFIX = 'story:'
export const REPORT_SECTIONS = ['cost', 'timeline', 'quote', 'highlights', 'brief'] as const
export type ReportSection = typeof REPORT_SECTIONS[number]

export type RowKind = 'post' | 'reel' | 'story' | 'video'
export const KIND_LABEL: Record<string, string> = { post: 'Postare', reel: 'Reel', story: 'Story', video: 'Video' }
export const PLATFORM_LABEL: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', other: 'Postare' }

export interface ReportRow {
  id: string
  url: string
  linkable: boolean
  platform: string
  kind: RowKind
  label: string
  source: string
  views: number | null; reach: number | null; likes: number | null; comments: number | null
  shares: number | null; saves: number | null; link_clicks: number | null
  thumbnail_url: string | null
  screenshot_path: string | null
  screenshot_url: string | null
  reported_at: string | null
  admin_edited_at: string | null
}

export interface ReportSettings {
  code: string | null
  status: 'draft' | 'published'
  published_at: string | null
  cost_lei: number | null
  followers: number | null
  brand_quote: string | null
  brand_quote_author: string | null
  highlights: string[]
  brief_checks: { text: string; ok: boolean }[]
  hidden: ReportSection[]
  admin_note: string | null
  updated_at: string | null
}

export interface TimelineStep { key: string; label: string; at: string }

export interface CollabReport {
  collabId: string
  status: string
  campaign: { id: string; name: string; brandName: string; brandId: string | null }
  creator: { id: string; name: string; handle: string | null; avatar: string | null; niches: string[]; followers: number | null; slug: string | null; userId: string | null }
  brandUserId: string | null
  period: { from: string | null; to: string | null }
  rows: ReportRow[]
  totals: {
    views: number; viewsPosts: number; viewsStories: number
    reach: number | null
    interactions: number; likes: number; comments: number; shares: number; saves: number
    clicks: number
    er: number | null; erBase: 'reach' | 'views' | null
    withData: number
  }
  cost: { lei: number | null; perThousand: number | null; perInteraction: number | null; source: 'raport' | 'colaborare' | 'campanie' | null }
  chips: { text: string; tone: 'good' | 'warm' | 'neutral' }[]
  timeline: TimelineStep[]
  drafts: number
  review: { rating: number | null; comment: string | null }
  quote: { text: string | null; author: string | null }
  settings: ReportSettings
}

const num = (v: any): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))
const arr = (v: any): any[] => (Array.isArray(v) ? v : [])

export function emptySettings(): ReportSettings {
  return { code: null, status: 'draft', published_at: null, cost_lei: null, followers: null, brand_quote: null, brand_quote_author: null, highlights: [], brief_checks: [], hidden: [], admin_note: null, updated_at: null }
}

export function cleanSettings(r: any): ReportSettings {
  if (!r) return emptySettings()
  return {
    code: r.code || null,
    status: r.status === 'published' ? 'published' : 'draft',
    published_at: r.published_at || null,
    cost_lei: num(r.cost_lei),
    followers: num(r.followers),
    brand_quote: r.brand_quote || null,
    brand_quote_author: r.brand_quote_author || null,
    highlights: arr(r.highlights).map(x => String(x || '').trim()).filter(Boolean).slice(0, 8),
    brief_checks: arr(r.brief_checks).map(x => ({ text: String(x?.text || '').trim(), ok: x?.ok !== false })).filter(x => x.text).slice(0, 12),
    hidden: arr(r.hidden).filter((x: any) => (REPORT_SECTIONS as readonly string[]).includes(x)),
    admin_note: r.admin_note || null,
    updated_at: r.updated_at || null,
  }
}

export function igHandle(inf: any): string | null {
  const h = String(inf?.instagram_handle || '').trim().replace(/^@/, '')
  if (h) return '@' + h
  for (const p of arr(inf?.platforms)) {
    if (p?.platform !== 'instagram') continue
    const m = String(p?.url || p?.handle || '').split('?')[0].replace(/\/+$/, '').match(/([^/@]+)$/)
    if (m) return '@' + m[1]
  }
  return null
}

function rowKind(r: any): RowKind {
  if (['post', 'reel', 'story', 'video'].includes(r.kind)) return r.kind
  if (String(r.url || '').startsWith(STORY_PREFIX)) return 'story'
  const u = String(r.url || '')
  if (/\/(reel|reels)\//.test(u) || /tiktok\.com/.test(u) || /\/shorts\//.test(u)) return 'reel'
  if (/youtube\.com|youtu\.be/.test(u)) return 'video'
  return 'post'
}

/** Rândurile de statistici ale colaborării: linkurile trimise + story-urile adăugate. Creează rândurile lipsă. */
export async function ensureReportRows(admin: SupabaseClient, collab: any): Promise<any[]> {
  const urls = collabPostUrls(collab)
  if (urls.length) {
    await admin.from('post_metrics').upsert(
      urls.map(url => ({ collaboration_id: collab.id, campaign_id: collab.campaign_id, influencer_id: collab.influencer_id, url, platform: detectPlatform(url), source: 'pending' })),
      { onConflict: 'collaboration_id,url', ignoreDuplicates: true },
    )
  }
  const { data } = await admin.from('post_metrics').select('*').eq('collaboration_id', collab.id)
  return (data || []).filter((r: any) => urls.includes(r.url) || r.kind === 'story' || String(r.url || '').startsWith(STORY_PREFIX) || r.source === 'admin')
    .sort((a: any, b: any) => (rowKind(a) === 'story' ? 1 : 0) - (rowKind(b) === 'story' ? 1 : 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')))
}

export async function signScreenshots(admin: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const list = [...new Set(paths.filter(Boolean))]
  if (!list.length) return out
  try {
    const { data } = await admin.storage.from(REPORT_BUCKET).createSignedUrls(list, 60 * 60)
    for (const d of data || []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl)
  } catch { /* fără capturi */ }
  return out
}

export function toReportRows(raw: any[], signed: Map<string, string>): ReportRow[] {
  let story = 0
  return raw.map((r: any) => {
    const kind = rowKind(r)
    if (kind === 'story') story++
    const label = String(r.label || '').trim() || (kind === 'story' ? `Story ${story}` : `${KIND_LABEL[kind]} ${PLATFORM_LABEL[r.platform] || ''}`.trim())
    return {
      id: r.id, url: r.url, linkable: /^https?:\/\//.test(String(r.url || '')), platform: r.platform || 'instagram', kind, label,
      source: r.source || 'pending',
      views: num(r.views), reach: num(r.reach), likes: num(r.likes), comments: num(r.comments),
      shares: num(r.shares), saves: num(r.saves), link_clicks: num(r.link_clicks),
      thumbnail_url: r.thumbnail_url || null,
      screenshot_path: r.screenshot_path || null,
      screenshot_url: r.screenshot_path ? signed.get(r.screenshot_path) || null : null,
      reported_at: r.reported_at || null, admin_edited_at: r.admin_edited_at || null,
    }
  })
}

export function computeReportTotals(rows: ReportRow[]) {
  const posts = rows.filter(r => r.kind !== 'story'), stories = rows.filter(r => r.kind === 'story')
  const sum = (list: ReportRow[], f: keyof ReportRow) => list.reduce((s, r) => s + (Number(r[f]) || 0), 0)
  const likes = sum(rows, 'likes'), comments = sum(rows, 'comments'), shares = sum(rows, 'shares'), saves = sum(rows, 'saves')
  const interactions = likes + comments + shares + saves
  const postReach = posts.some(r => r.reach != null) ? sum(posts, 'reach') : null
  const reach = postReach ?? (rows.some(r => r.reach != null) ? sum(rows, 'reach') : null)
  // Rata de engagement: interacțiunile postărilor raportate la conturile atinse (altfel la vizualizări)
  const postInter = sum(posts, 'likes') + sum(posts, 'comments') + sum(posts, 'shares') + sum(posts, 'saves')
  let er: number | null = null, erBase: 'reach' | 'views' | null = null
  if (postReach && postReach > 0) { er = postInter / postReach * 100; erBase = 'reach' }
  else if (sum(posts, 'views') > 0) { er = postInter / sum(posts, 'views') * 100; erBase = 'views' }
  const fields = [...METRIC_FIELDS, 'link_clicks'] as (keyof ReportRow)[]
  return {
    views: sum(rows, 'views'), viewsPosts: sum(posts, 'views'), viewsStories: sum(stories, 'views'),
    reach, interactions, likes, comments, shares, saves,
    clicks: sum(rows, 'link_clicks'),
    er: er == null ? null : Math.round(er * 10) / 10, erBase,
    withData: rows.filter(r => fields.some(f => r[f] != null)).length,
  }
}

export async function loadCollabReport(admin: SupabaseClient, collabId: string): Promise<CollabReport | null> {
  const { data: c } = await admin.from('collaborations').select('*').eq('id', collabId).maybeSingle()
  if (!c) return null
  const [campQ, infQ, repQ, revQ, draftQ] = await Promise.all([
    admin.from('campaigns').select('*').eq('id', c.campaign_id).maybeSingle(),
    admin.from('influencers').select('*').eq('id', c.influencer_id).maybeSingle(),
    admin.from('collaboration_reports').select('*').eq('collaboration_id', collabId).maybeSingle(),
    admin.from('reviews').select('rating, comment, reviewer_role, created_at').eq('collaboration_id', collabId),
    admin.from('deliverable_drafts').select('version, status, created_at').eq('collaboration_id', collabId),
  ])
  const camp: any = campQ.data || {}
  const inf: any = infQ.data || {}
  const settings = cleanSettings(repQ.data)
  const brandId = camp.brand_id ?? c.brand_id ?? null
  let brandName = String(camp.brand_name || '').trim()
  let brandUserId: string | null = null
  if (brandId) {
    const { data: b } = await admin.from('brands').select('name, user_id').eq('id', brandId).maybeSingle()
    brandName = brandName || String(b?.name || '').trim()
    brandUserId = b?.user_id ?? null
  }

  const raw = await ensureReportRows(admin, c)
  const signed = await signScreenshots(admin, raw.map((r: any) => r.screenshot_path))
  const rows = toReportRows(raw, signed)
  const totals = computeReportTotals(rows)

  const review = arr(revQ.data).filter((r: any) => r.reviewer_role === 'brand').sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null
  const drafts = arr(draftQ.data)

  let costLei: number | null = settings.cost_lei, costSource: CollabReport['cost']['source'] = costLei != null ? 'raport' : null
  if (costLei == null && num(c.payment_amount)) { costLei = num(c.payment_amount); costSource = 'colaborare' }
  if (costLei == null && num(camp.budget_per_influencer)) { costLei = num(camp.budget_per_influencer); costSource = 'campanie' }

  const followers = settings.followers ?? num(inf.ig_followers) ?? num(inf.tt_followers)

  const timeline: TimelineStep[] = []
  const add = (key: string, label: string, at: any) => { if (at) timeline.push({ key, label, at: String(at) }) }
  const firstDraft = drafts.map((d: any) => d.created_at).filter(Boolean).sort()[0]
  add('applied', 'A aplicat', c.created_at)
  add('accepted', 'Acceptată', c.approved_at)
  add('sent', 'Colet trimis', c.package_sent_at)
  add('received', 'Colet primit', c.package_received_at)
  add('draft', drafts.length > 1 ? `Draft trimis (${drafts.length} versiuni)` : 'Draft trimis', firstDraft)
  add('posted', 'Postare trimisă', c.deliverable_submitted_at)
  add('approved', 'Postare aprobată', c.deliverable_approved_at)
  add('done', 'Finalizată', c.completed_at)
  timeline.sort((a, b) => a.at.localeCompare(b.at))

  const chips: CollabReport['chips'] = []
  if (String(c.status).toUpperCase() === 'COMPLETED') chips.push({ text: 'Colaborare finalizată', tone: 'good' })
  if (drafts.length === 1 && drafts.some((d: any) => d.status === 'approved')) chips.push({ text: 'Draft aprobat din prima', tone: 'good' })
  if (rows.length) chips.push({ text: `${rows.length} ${rows.length === 1 ? 'livrabil raportat' : 'livrabile raportate'}`, tone: 'good' })
  if (review?.rating) chips.push({ text: `Nota brandului: ${review.rating} / 5`, tone: 'warm' })

  const views = totals.views, inter = totals.interactions
  return {
    collabId: c.id,
    status: String(c.status || ''),
    campaign: { id: camp.id || c.campaign_id, name: campaignName(camp, camp.title || 'Campanie'), brandName: brandName || 'Brand', brandId },
    creator: {
      id: inf.id || c.influencer_id, name: inf.name || 'Creator', handle: igHandle(inf), avatar: inf.avatar || null,
      niches: arr(inf.niches).map(String).slice(0, 3), followers, slug: inf.slug || null, userId: inf.user_id || null,
    },
    brandUserId,
    period: { from: c.approved_at || c.created_at || null, to: c.completed_at || c.deliverable_approved_at || null },
    rows, totals,
    cost: {
      lei: costLei,
      perThousand: costLei != null && views > 0 ? Math.round(costLei / views * 1000 * 100) / 100 : null,
      perInteraction: costLei != null && inter > 0 ? Math.round(costLei / inter * 100) / 100 : null,
      source: costSource,
    },
    chips, timeline, drafts: drafts.length,
    review: { rating: num(review?.rating), comment: review?.comment || null },
    quote: {
      text: settings.brand_quote || review?.comment || null,
      author: settings.brand_quote_author || (settings.brand_quote || review?.comment ? `Echipa ${brandName || 'brandului'}` : null),
    },
    settings,
  }
}

// ── formatare (și în browser) ─────────────────────────────────────────
export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('ro-RO'))
export const fmtLei = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('ro-RO', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} lei`)
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${n.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`)
export const fmtDay = (d: string | null | undefined) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) } catch { return '' }
}
export const fmtDate = (d: string | null | undefined) => {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
}
