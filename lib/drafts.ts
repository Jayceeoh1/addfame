// Drafturi video: helper-e comune pentru rutele /api/deliverables/*
// Accesul se face DOAR prin server (service_role). Fiecare rută verifică
// că utilizatorul e creatorul sau brandul colaborării.
import type { SupabaseClient } from '@supabase/supabase-js'

export const DRAFT_BUCKET = 'livrabile'
export const MAX_DRAFT_BYTES = 200 * 1024 * 1024
export const MAX_DRAFT_VERSIONS = 10
export const ALLOWED_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
export const VIEW_URL_TTL = 60 * 60 // 1h
export const DOWNLOAD_URL_TTL = 5 * 60 // 5 min

export type DraftRole = 'brand' | 'influencer'

export interface CollabAccess {
  role: DraftRole
  collabId: string
  status: string
  title: string
  influencerId: string
  influencerName: string
  influencerUserId: string | null
  brandUserId: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

/** Rolul utilizatorului în colaborare, sau null dacă nu e participant. */
export async function getCollabAccess(
  admin: SupabaseClient, collabId: string, userId: string
): Promise<CollabAccess | null> {
  if (!isUuid(collabId)) return null
  const { data: c } = await admin
    .from('collaborations')
    .select('id, status, influencer_id, brand_id, campaigns(title, brand_id), influencers(name, user_id)')
    .eq('id', collabId)
    .maybeSingle()
  if (!c) return null
  const camp = c.campaigns as any
  const inf = c.influencers as any
  const brandId = camp?.brand_id ?? (c as any).brand_id
  let brandUserId: string | null = null
  if (brandId) {
    const { data: b } = await admin.from('brands').select('user_id').eq('id', brandId).maybeSingle()
    brandUserId = b?.user_id ?? null
  }
  const influencerUserId: string | null = inf?.user_id ?? null
  let role: DraftRole | null = null
  if (influencerUserId && influencerUserId === userId) role = 'influencer'
  else if (brandUserId && brandUserId === userId) role = 'brand'
  if (!role) return null
  return {
    role, collabId: c.id, status: String(c.status || ''), title: camp?.title || 'Campanie',
    influencerId: (c as any).influencer_id, influencerName: inf?.name || 'Creator',
    influencerUserId, brandUserId,
  }
}

export function safeFileName(name: string): string {
  const base = (name || 'video').split(/[\\/]/).pop() || 'video'
  const clean = base.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_').slice(-120)
  return clean || 'video.mp4'
}

export async function notify(
  admin: SupabaseClient, userId: string | null, title: string, body: string, link: string
) {
  if (!userId) return
  try {
    await admin.from('notifications').insert({ user_id: userId, title, body, link, read: false })
  } catch { /* notificarea nu trebuie să blocheze fluxul */ }
}
