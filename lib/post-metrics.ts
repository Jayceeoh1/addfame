// Metricile postărilor din campanii (vizualizări, like-uri, comentarii…), pentru raportul brandului.
//
// Surse, în ordinea încrederii:
//  - Instagram: like-uri + comentarii din contul conectat al creatorului (tabela instagram_media,
//    actualizată zilnic de /api/cron/sync-social). Vizualizările/reach-ul cer permisiuni Meta suplimentare.
//  - YouTube: vizualizări, like-uri, comentarii din YouTube Data API (cheie YOUTUBE_API_KEY, gratuită).
//  - TikTok / Facebook / story-uri: completate de creator (cu sursa marcată „raportat de creator”).
//    API-ul TikTok cere aprobarea aplicației; până atunci nu există o sursă automată sigură.
import type { SupabaseClient } from '@supabase/supabase-js'

export type PostPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'other'
export const METRIC_FIELDS = ['views', 'likes', 'comments', 'shares', 'saves', 'reach'] as const
export type MetricField = typeof METRIC_FIELDS[number]

export interface PostMetricRow {
  id?: string
  collaboration_id: string
  campaign_id: string
  influencer_id: string
  url: string
  platform: PostPlatform
  source: 'instagram' | 'youtube' | 'creator' | 'pending' | 'admin'
  views?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  reach?: number | null
  thumbnail_url?: string | null
  fetched_at?: string | null
  reported_at?: string | null
  last_error?: string | null
}

function parseUrl(raw: string): URL | null {
  const s = String(raw || '').trim()
  if (!s) return null
  try { return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`) } catch { return null }
}

export function detectPlatform(raw: string): PostPlatform {
  const h = parseUrl(raw)?.hostname.toLowerCase().replace(/^www\.|^m\./, '') || ''
  if (h === 'instagram.com' || h.endsWith('.instagram.com') || h === 'instagr.am') return 'instagram'
  if (h === 'tiktok.com' || h.endsWith('.tiktok.com')) return 'tiktok'
  if (h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be') return 'youtube'
  if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.watch') return 'facebook'
  return 'other'
}

/** Forma canonică a linkului: fără parametri de urmărire, fără „/” final (YouTube păstrează ?v=). */
export function normalizePostUrl(raw: string): string | null {
  const u = parseUrl(raw)
  if (!u || !/^https?:$/.test(u.protocol)) return null
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '')
  const path = u.pathname.replace(/\/+$/, '')
  const query = detectPlatform(raw) === 'youtube' && u.searchParams.get('v') ? `?v=${u.searchParams.get('v')}` : ''
  return `https://${host}${path}${query}`.slice(0, 500)
}

export function instagramShortcode(raw: string): string | null {
  const m = parseUrl(raw)?.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/)
  return m ? m[1] : null
}

export function youtubeVideoId(raw: string): string | null {
  const u = parseUrl(raw)
  if (!u) return null
  if (u.hostname.replace(/^www\./, '') === 'youtu.be') return /^[A-Za-z0-9_-]{11}$/.test(u.pathname.slice(1, 12)) ? u.pathname.slice(1, 12) : null
  const v = u.searchParams.get('v')
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v
  const m = u.pathname.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

/** Linkurile de postare ale unei colaborări (lista nouă + câmpul vechi), normalizate și fără dubluri. */
export function collabPostUrls(c: { deliverable_url?: string | null; deliverable_urls?: string[] | null }): string[] {
  const raw = [...(Array.isArray(c.deliverable_urls) ? c.deliverable_urls : []), c.deliverable_url || '']
  const out: string[] = []
  for (const r of raw) { const n = normalizePostUrl(r); if (n && !out.includes(n)) out.push(n) }
  return out.slice(0, 10)
}

/** Număr curat (întreg ≥ 0) sau null. Acceptă „12.400”, „12,4K”, „1.2M”. */
export function cleanCount(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), 1e11) : null
  const s = String(v).trim().toLowerCase().replace(/\s/g, '')
  const k = s.match(/^(\d+(?:[.,]\d+)?)([km])$/)          // 12,4k · 1.2m
  if (k) return Math.min(Math.round(Number(k[1].replace(',', '.')) * (k[2] === 'k' ? 1e3 : 1e6)), 1e11)
  if (/^\d+$/.test(s)) return Math.min(Number(s), 1e11)
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Math.min(Number(s.replace(/[.,]/g, '')), 1e11)  // 12.400
  return null
}

export interface MetricTotals {
  posts: number; withData: number
  views: number; likes: number; comments: number; shares: number; saves: number; reach: number
  engagement: number
  /** interacțiuni / vizualizări, în % (doar pe postările care au vizualizări) */
  engagementRate: number | null
}

export function computeTotals(rows: Partial<PostMetricRow>[]): MetricTotals {
  const t: MetricTotals = { posts: rows.length, withData: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, engagement: 0, engagementRate: null }
  let erViews = 0, erEng = 0
  for (const r of rows) {
    const has = METRIC_FIELDS.some(f => r[f] != null)
    if (has) t.withData++
    for (const f of METRIC_FIELDS) t[f] += Number(r[f]) || 0
    const eng = (Number(r.likes) || 0) + (Number(r.comments) || 0) + (Number(r.shares) || 0) + (Number(r.saves) || 0)
    t.engagement += eng
    if ((Number(r.views) || 0) > 0) { erViews += Number(r.views); erEng += eng }
  }
  t.engagementRate = erViews > 0 ? Math.round((erEng / erViews) * 1000) / 10 : null
  return t
}

export const SOURCE_LABEL: Record<string, string> = {
  instagram: 'automat · Instagram',
  youtube: 'automat · YouTube',
  creator: 'raportat de creator',
  admin: 'verificat de AddFame',
  pending: 'în așteptare',
}

// ── Sincronizare ─────────────────────────────────────────────────────

async function fetchYoutubeStats(ids: string[]): Promise<Map<string, { views: number; likes: number | null; comments: number | null; thumb: string | null }>> {
  const key = process.env.YOUTUBE_API_KEY
  const out = new Map<string, { views: number; likes: number | null; comments: number | null; thumb: string | null }>()
  if (!key || !ids.length) return out
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${chunk.join(',')}&key=${encodeURIComponent(key)}`)
    if (!res.ok) throw new Error(`YouTube API ${res.status}`)
    const j: any = await res.json()
    for (const it of j.items || []) {
      const st = it.statistics || {}
      out.set(it.id, {
        views: Number(st.viewCount) || 0,
        likes: st.likeCount != null ? Number(st.likeCount) : null,     // pot fi ascunse de creator
        comments: st.commentCount != null ? Number(st.commentCount) : null,
        thumb: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || null,
      })
    }
  }
  return out
}

/**
 * Creează rândurile lipsă pentru postările trimise și actualizează metricile automate.
 * `campaignId` limitează la o campanie (butonul „Actualizează” din raport); fără el, toate postările din ultimele 90 de zile.
 */
export async function syncPostMetrics(admin: SupabaseClient, opts: { campaignId?: string } = {}) {
  const stats = { collabs: 0, created: 0, instagram: 0, youtube: 0, errors: 0 }

  let q = admin.from('collaborations')
    .select('id, campaign_id, influencer_id, deliverable_url, deliverable_urls, deliverable_submitted_at, status')
    .in('status', ['ACTIVE', 'COMPLETED'])
    .not('deliverable_url', 'is', null)
  if (opts.campaignId) q = q.eq('campaign_id', opts.campaignId)
  else q = q.gte('deliverable_submitted_at', new Date(Date.now() - 90 * 864e5).toISOString())
  const { data: collabs, error } = await q.limit(2000)
  if (error) throw new Error('collaborations: ' + error.message)
  stats.collabs = collabs?.length || 0
  if (!collabs?.length) return stats

  // 1) rânduri pentru fiecare link (cele existente rămân neatinse)
  const fresh: PostMetricRow[] = []
  for (const c of collabs as any[]) {
    for (const url of collabPostUrls(c)) {
      fresh.push({ collaboration_id: c.id, campaign_id: c.campaign_id, influencer_id: c.influencer_id, url, platform: detectPlatform(url), source: 'pending' })
    }
  }
  for (let i = 0; i < fresh.length; i += 500) {
    const { data: ins, error: e } = await admin.from('post_metrics')
      .upsert(fresh.slice(i, i + 500), { onConflict: 'collaboration_id,url', ignoreDuplicates: true }).select('id')
    if (e) throw new Error('post_metrics upsert: ' + e.message)
    stats.created += ins?.length || 0
  }

  const collabIds = (collabs as any[]).map(c => c.id)
  const rows: PostMetricRow[] = []
  for (let i = 0; i < collabIds.length; i += 300) {
    const { data, error: e } = await admin.from('post_metrics').select('*').in('collaboration_id', collabIds.slice(i, i + 300))
    if (e) throw new Error('post_metrics: ' + e.message)
    rows.push(...((data || []) as PostMetricRow[]))
  }
  const now = new Date().toISOString()

  // 2) Instagram — din postările sincronizate ale creatorului
  const igRows = rows.filter(r => r.platform === 'instagram' && instagramShortcode(r.url))
  if (igRows.length) {
    const infIds = [...new Set(igRows.map(r => r.influencer_id))]
    const { data: media } = await admin.from('instagram_media')
      .select('influencer_id, permalink, like_count, comments_count, thumbnail_url').in('influencer_id', infIds)
    const byCode = new Map<string, any>()
    for (const m of media || []) { const code = instagramShortcode(m.permalink || ''); if (code) byCode.set(`${m.influencer_id}:${code}`, m) }
    for (const r of igRows) {
      const m = byCode.get(`${r.influencer_id}:${instagramShortcode(r.url)}`)
      if (!m) continue
      const { error: e } = await admin.from('post_metrics').update({
        likes: m.like_count ?? r.likes ?? null, comments: m.comments_count ?? r.comments ?? null,
        thumbnail_url: m.thumbnail_url || r.thumbnail_url || null,
        source: 'instagram', fetched_at: now, updated_at: now, last_error: null,
      }).eq('id', r.id!)
      if (e) stats.errors++; else stats.instagram++
    }
  }

  // 3) YouTube — API public
  const ytRows = rows.filter(r => r.platform === 'youtube' && youtubeVideoId(r.url))
  if (ytRows.length && process.env.YOUTUBE_API_KEY) {
    try {
      const yt = await fetchYoutubeStats([...new Set(ytRows.map(r => youtubeVideoId(r.url)!))])
      for (const r of ytRows) {
        const s = yt.get(youtubeVideoId(r.url)!)
        if (!s) continue
        const { error: e } = await admin.from('post_metrics').update({
          views: s.views, likes: s.likes ?? r.likes ?? null, comments: s.comments ?? r.comments ?? null,
          thumbnail_url: s.thumb || r.thumbnail_url || null,
          source: 'youtube', fetched_at: now, updated_at: now, last_error: null,
        }).eq('id', r.id!)
        if (e) stats.errors++; else stats.youtube++
      }
    } catch (e: any) {
      stats.errors++
      await admin.from('post_metrics').update({ last_error: String(e?.message || e).slice(0, 200) }).in('id', ytRows.map(r => r.id!))
    }
  }
  return stats
}

/** Metricile unei campanii: rândurile automate/raportate + intrările manuale ale echipei (campaign_posts). */
export async function campaignMetrics(admin: SupabaseClient, campaignId: string) {
  const [{ data: pm }, { data: cp }, { data: collabs }] = await Promise.all([
    admin.from('post_metrics').select('*').eq('campaign_id', campaignId),
    admin.from('campaign_posts').select('collaboration_id, influencer_id, post_url, post_type, views, reach, likes, comments, shares, saves').eq('campaign_id', campaignId),
    admin.from('collaborations').select('id, influencer_id, influencers(name, slug, avatar)').eq('campaign_id', campaignId),
  ])
  const names = new Map<string, any>()
  for (const c of (collabs || []) as any[]) names.set(c.id, c.influencers || {})

  const rows: (PostMetricRow & { influencer_name?: string; influencer_slug?: string })[] = []
  const seen = new Set<string>()
  // Intrările echipei AddFame au prioritate (au și reach-ul din statisticile primite de la creator)
  for (const p of (cp || []) as any[]) {
    const url = normalizePostUrl(p.post_url || '') || ''
    const key = `${p.collaboration_id}|${url}`
    if (url) seen.add(key)
    rows.push({
      collaboration_id: p.collaboration_id, campaign_id: campaignId, influencer_id: p.influencer_id,
      url, platform: url ? detectPlatform(url) : (String(p.post_type || '').startsWith('youtube') ? 'youtube' : p.post_type === 'tiktok' ? 'tiktok' : 'instagram'),
      source: 'admin', views: p.views, likes: p.likes, comments: p.comments, shares: p.shares, saves: p.saves, reach: p.reach,
      influencer_name: names.get(p.collaboration_id)?.name, influencer_slug: names.get(p.collaboration_id)?.slug,
    })
  }
  for (const r of (pm || []) as PostMetricRow[]) {
    if (seen.has(`${r.collaboration_id}|${r.url}`)) continue
    rows.push({ ...r, influencer_name: names.get(r.collaboration_id)?.name, influencer_slug: names.get(r.collaboration_id)?.slug })
  }
  return { rows, totals: computeTotals(rows) }
}
