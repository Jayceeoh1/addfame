// Sincronizare Instagram (Instagram API with Instagram Login).
// Folosit de callback (la conectare) și de cron (zilnic). Doar pe server.
// Funcționează pentru influenceri ȘI pentru branduri.
import type { SupabaseClient } from '@supabase/supabase-js'

const GRAPH = 'https://graph.instagram.com/v21.0'
const PROFESSIONAL = ['BUSINESS', 'MEDIA_CREATOR', 'CREATOR']
const REFRESH_WHEN_DAYS_LEFT = 12 // tokenul trăiește 60 de zile; reînnoim cu mult înainte

export type IgKind = 'influencer' | 'brand'

export type IgResult = {
  ok: boolean
  reason?: 'not_professional' | 'token' | 'api'
  message?: string
  followers?: number; engagement?: number; media?: number
}

const CFG = {
  influencer: { table: 'influencers', priv: 'instagram_private', fk: 'influencer_id' },
  brand: { table: 'brands', priv: 'brand_instagram_private', fk: 'brand_id' },
} as const

/** Reînnoiește tokenul dacă mai are puține zile (doar după 24h de la emitere). */
export async function refreshTokenIfNeeded(
  admin: SupabaseClient, kind: IgKind, id: string, token: string, expires: string | null,
): Promise<string | null> {
  if (!expires) return token
  const left = (new Date(expires).getTime() - Date.now()) / 86400000
  if (left > REFRESH_WHEN_DAYS_LEFT) return token
  if (left <= 0) return null // expirat: userul trebuie să se reconecteze
  const r = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
  )
  const d = await r.json().catch(() => ({}))
  if (!d.access_token) return token // încercăm din nou mâine, tokenul încă e valid
  const c = CFG[kind]
  await admin.from(c.priv).update({
    access_token: d.access_token,
    token_expires: new Date(Date.now() + (d.expires_in || 5184000) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq(c.fk, id)
  return d.access_token
}

/** Trage profilul (+ ultimele postări) și le scrie în baza de date. */
export async function syncInstagram(
  admin: SupabaseClient, kind: IgKind, id: string, token: string,
): Promise<IgResult> {
  const c = CFG[kind]
  const pr = await fetch(`${GRAPH}/me?fields=user_id,username,account_type,media_count,followers_count,follows_count,biography,profile_picture_url&access_token=${encodeURIComponent(token)}`)
  const profile = await pr.json().catch(() => ({}))
  if (!pr.ok || profile.error) {
    const code = profile?.error?.code
    return { ok: false, reason: code === 190 ? 'token' : 'api', message: profile?.error?.message }
  }
  if (!PROFESSIONAL.includes(String(profile.account_type || '').toUpperCase())) {
    return { ok: false, reason: 'not_professional' }
  }

  const mr = await fetch(`${GRAPH}/me/media?fields=id,caption,media_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}`)
  const md = await mr.json().catch(() => ({}))
  const media: any[] = Array.isArray(md.data) ? md.data : []

  // engagement = media (like+comentarii) pe ultimele 12 postări / urmăritori
  const recent = media.slice(0, 12).filter(m => m.like_count != null || m.comments_count != null)
  let engagement = 0
  if (recent.length && profile.followers_count > 0) {
    const tot = recent.reduce((s, m) => s + (m.like_count || 0) + (m.comments_count || 0), 0)
    engagement = Math.round((tot / recent.length / profile.followers_count) * 10000) / 100
  }

  const now = new Date().toISOString()
  const { error: upErr } = await admin.from(c.table).update({
    instagram_connected: true,
    instagram_handle: profile.username || null,
    ig_account_type: profile.account_type || null,
    ig_followers: profile.followers_count ?? 0,
    ig_following: profile.follows_count ?? 0,
    ig_posts_count: profile.media_count ?? 0,
    ig_bio: profile.biography || null,
    ig_avatar: profile.profile_picture_url || null,
    ig_engagement_rate: engagement,
    ig_last_sync: now,
  }).eq('id', id)
  if (upErr) return { ok: false, reason: 'api', message: 'db: ' + upErr.message }

  // postările se păstrează doar pentru creatori
  if (kind === 'influencer' && media.length) {
    await admin.from('instagram_media').upsert(
      media.map(m => ({
        influencer_id: id,
        media_id: String(m.id),
        media_type: m.media_type || null,
        permalink: m.permalink || null,
        thumbnail_url: m.thumbnail_url || m.media_url || null,
        caption: m.caption ? String(m.caption).slice(0, 500) : null,
        like_count: m.like_count ?? null,
        comments_count: m.comments_count ?? null,
        posted_at: m.timestamp || null,
        synced_at: now,
      })),
      { onConflict: 'influencer_id,media_id' },
    )
  }
  return { ok: true, followers: profile.followers_count ?? 0, engagement, media: media.length }
}

const CLEAR = {
  instagram_connected: false, instagram_handle: null, instagram_user_id: null,
  ig_followers: null, ig_following: null, ig_posts_count: null, ig_bio: null, ig_avatar: null,
  ig_engagement_rate: null, ig_account_type: null, ig_last_sync: null,
}

/** Șterge tot ce știm despre contul Instagram: după id (un cont) sau după id-ul Instagram (toate). */
export async function wipeInstagram(
  admin: SupabaseClient,
  match: { kind: IgKind; id: string } | { instagram_user_id: string },
) {
  const kinds: IgKind[] = 'kind' in match ? [match.kind] : ['influencer', 'brand']
  let n = 0
  for (const kind of kinds) {
    const c = CFG[kind]
    let q = admin.from(c.table).select('id')
    q = 'kind' in match ? q.eq('id', match.id) : q.eq('instagram_user_id', match.instagram_user_id)
    const { data: rows } = await q
    const ids = (rows || []).map((r: any) => r.id)
    if (!ids.length) continue
    await admin.from(c.priv).delete().in(c.fk, ids)
    if (kind === 'influencer') {
      await admin.from('instagram_media').delete().in('influencer_id', ids)
      await admin.from(c.table).update({ ...CLEAR, instagram_access_token: null, instagram_token_expires: null }).in('id', ids)
    } else {
      await admin.from(c.table).update(CLEAR).in('id', ids)
    }
    n += ids.length
  }
  return n
}
