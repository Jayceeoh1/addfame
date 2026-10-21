'use server'

// Campania „în prim-plan” de pe dashboardul creatorilor + lista de invitații pe Instagram (DM) pentru admin.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { campaignName } from '@/lib/campaign-name'
import { pickDmList, dmMessage, igHandleOf, buildApplicantRow } from '@/lib/dm-list'

const SETTING = 'featured_campaign'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

/** Ce primește creatorul: prima propoziție din descrierea ofertei, scurtată. */
function offerLine(d: unknown): string {
  const t = String(d ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const first = t.split(/(?<=[.!?])\s/)[0].replace(/[.:]+$/, '')
  return first.length > 120 ? first.slice(0, 117).trimEnd() + '…' : first
}

/** Pentru creator: campania afișată pe dashboard (sau null). */
export async function getFeaturedCampaign() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: s } = await admin.from('platform_settings').select('value').eq('key', SETTING).maybeSingle()
  const id = (s?.value as any)?.campaign_id
  const endsRaw = (s?.value as any)?.ends_at
  const endsAt = typeof endsRaw === 'string' && !isNaN(new Date(endsRaw).getTime()) && new Date(endsRaw).getTime() > Date.now() ? endsRaw : null
  if (!(s?.value as any)?.enabled || !isId(id)) return null
  const { data: c } = await admin.from('campaigns')
    .select('id, title, offer_name, product_name, brand_name, status, deadline, max_influencers, current_influencers, offer_value, offer_description, offer_images, offer_image_urls, offer_image_url')
    .eq('id', id).maybeSingle()
  if (!c || c.status !== 'ACTIVE') return null
  if (c.deadline && new Date(c.deadline) < new Date()) return null
  const max = Number(c.max_influencers) || 0, cur = Number(c.current_influencers) || 0
  if (max && cur >= max) return null
  const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
  let applied = false
  if (inf) {
    const { data: col } = await admin.from('collaborations').select('id').eq('campaign_id', id).eq('influencer_id', inf.id).limit(1)
    applied = !!col?.length
  }
  const img = (Array.isArray(c.offer_images) && c.offer_images[0]) || (Array.isArray(c.offer_image_urls) && c.offer_image_urls[0]) || c.offer_image_url || null
  return { id: c.id as string, name: campaignName(c), brand: (c.brand_name as string) || '', offer: offerLine(c.offer_description), left: max ? Math.max(0, max - cur) : null, deadline: (c.deadline as string) || null, image: img as string | null, applied, endsAt }
}

export async function adminGetFeatured() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const [{ data: s }, { data: camps }] = await Promise.all([
    admin.from('platform_settings').select('value').eq('key', SETTING).maybeSingle(),
    admin.from('campaigns').select('id, title, offer_name, product_name, brand_name, campaign_type, max_influencers, current_influencers').eq('status', 'ACTIVE').order('created_at', { ascending: false }).limit(60),
  ])
  return {
    success: true as const,
    enabled: (s?.value as any)?.enabled === true,
    campaignId: ((s?.value as any)?.campaign_id as string) || '',
    endsAt: ((s?.value as any)?.ends_at as string) || '',
    campaigns: (camps || []).map((c: any) => ({ id: c.id as string, name: campaignName(c), brand: c.brand_name || '', slots: c.max_influencers || 0, taken: c.current_influencers || 0 })),
  }
}

export async function adminSetFeatured(campaignId: string, enabled: boolean, endsAt?: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (enabled && !isId(campaignId)) return { error: 'Alege o campanie.' }
  const ends = endsAt && !isNaN(new Date(endsAt).getTime()) ? new Date(endsAt).toISOString() : null
  const admin = createAdminClient()
  const { error } = await admin.from('platform_settings').upsert({
    key: SETTING, value: { enabled: !!enabled, campaign_id: isId(campaignId) ? campaignId : null, ends_at: ends }, label: 'Campanie în prim-plan',
    description: 'Campania afișată pe dashboardul creatorilor', updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) return { error: error.message }
  revalidatePath('/influencer/dashboard')
  return { success: true as const }
}

/** Lista celor mai potriviți creatori pentru DM (fără cei care au aplicat deja) + cine a fost marcat „trimis”. */
export async function adminDmList(campaignId: string, limit = 300) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, title, offer_name, product_name, niches').eq('id', campaignId).maybeSingle()
  if (!camp) return { error: 'Campania nu există.' }
  const [{ data: cols }, { data: sentRow }] = await Promise.all([
    admin.from('collaborations').select('influencer_id').eq('campaign_id', campaignId),
    admin.from('platform_settings').select('value').eq('key', `dm_sent:${campaignId}`).maybeSingle(),
  ])
  const exclude = new Set<string>((cols || []).map((c: any) => c.influencer_id))
  const all: any[] = []
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await admin.from('influencers')
      .select('id, name, instagram_handle, city, niches, creator_score, last_active_at, engagement_rate, instagram_connected, ig_followers, instagram_followers, tt_followers, platforms')
      .ilike('approval_status', 'approved').range(from, from + 999)
    if (error) return { error: error.message }
    all.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const rows = pickDmList(all, camp.niches, Math.min(Math.max(1, limit), 500), exclude)
  const name = campaignName(camp)
  return {
    success: true as const, rows, sent: ((sentRow?.value as any)?.ids as string[]) || [],
    campaignName: name, link: `${APP_URL}/influencer/campaigns/${campaignId}`,
    template: dmMessage('{nume}', name, `${APP_URL}/influencer/campaigns/${campaignId}`),
    excluded: exclude.size, pool: all.filter(c => igHandleOf(c)).length, approved: all.length,
  }
}

export async function adminMarkDmSent(campaignId: string, ids: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId) || !Array.isArray(ids) || ids.length > 600 || !ids.every(isId)) return { error: 'Date invalide.' }
  const admin = createAdminClient()
  const { error } = await admin.from('platform_settings').upsert({
    key: `dm_sent:${campaignId}`, value: { ids }, label: 'DM trimise', description: 'Creatorii contactați pe Instagram pentru campanie', updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  return error ? { error: error.message } : { success: true as const }
}

/** Aplicanții unei campanii (toate statusurile), fără email/telefon: pentru export CSV către brand. */
export async function adminApplicants(campaignId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const admin = createAdminClient()
  const { data, error } = await admin.from('collaborations')
    .select('status, created_at, influencers(id, name, instagram_handle, city, niches, engagement_rate, instagram_connected, ig_followers, instagram_followers, tt_followers, platforms)')
    .eq('campaign_id', campaignId).order('created_at', { ascending: true }).limit(2000)
  if (error) return { error: error.message }
  const rows = (data || []).filter((c: any) => c.influencers).map((c: any) => buildApplicantRow(c, Array.isArray(c.influencers) ? c.influencers[0] : c.influencers))
  return { success: true as const, rows }
}
