'use server'

// Briefuri individuale pe campanie. Brandul (doar campaniile lui) și adminul creează briefuri
// și le dau creatorilor; influencerul vede doar briefil colaborării lui.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { isUuid } from '@/lib/drafts'
import { campaignName } from '@/lib/campaign-name'
import { validateBrief, BRIEF_ELIGIBLE_STATUSES, type BriefInput, type CampaignBrief, type BriefCreator } from '@/lib/campaign-briefs'

type Fail = { error: string }

/** Cine are voie să lucreze cu briefurile campaniei: adminul sau brandul care deține campania. */
async function canManage(campaignId: string): Promise<{ userId: string; campaign: any } | Fail> {
  if (!isUuid(campaignId)) return { error: 'Campanie inexistentă' }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Nu ești autentificat.' }
  const admin = createAdminClient()
  const { data: campaign } = await admin.from('campaigns').select('id, brand_id, title, offer_name, product_name').eq('id', campaignId).maybeSingle()
  if (!campaign) return { error: 'Campanie inexistentă' }
  if (await verifyAdminSession()) return { userId: user.id, campaign }
  const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
  if (!brand || brand.id !== campaign.brand_id) return { error: 'Nu ai acces la această campanie.' }
  return { userId: user.id, campaign }
}

const BRIEF_COLS = 'id, campaign_id, title, body, file_url, ref_url, sort, created_at, updated_at'

export async function listCampaignBriefs(campaignId: string):
  Promise<{ briefs: CampaignBrief[]; creators: BriefCreator[] } | Fail> {
  try {
    const auth = await canManage(campaignId)
    if ('error' in auth) return auth
    const admin = createAdminClient()
    const [{ data: briefs, error: bErr }, { data: collabs }] = await Promise.all([
      admin.from('campaign_briefs').select(BRIEF_COLS).eq('campaign_id', campaignId).order('sort').order('created_at'),
      admin.from('collaborations')
        .select('id, status, influencer_id, brief_id, brief_ack_at, influencers(name, instagram_handle)')
        .eq('campaign_id', campaignId)
        .in('status', BRIEF_ELIGIBLE_STATUSES as unknown as string[]),
    ])
    if (bErr) return { error: /campaign_briefs/.test(bErr.message) ? 'Rulează întâi SQL 62 (briefuri individuale) în Supabase.' : bErr.message }
    const creators: BriefCreator[] = (collabs ?? []).map((c: any) => ({
      collabId: c.id,
      influencerId: c.influencer_id,
      name: c.influencers?.name || 'Creator',
      handle: c.influencers?.instagram_handle || null,
      status: c.status,
      briefId: c.brief_id || null,
      ackAt: c.brief_ack_at || null,
    })).sort((a, b) => a.name.localeCompare(b.name, 'ro'))
    return { briefs: (briefs ?? []) as CampaignBrief[], creators }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

export async function saveCampaignBrief(campaignId: string, input: BriefInput & { id?: string }):
  Promise<{ brief: CampaignBrief } | Fail> {
  try {
    const auth = await canManage(campaignId)
    if ('error' in auth) return auth
    const v = validateBrief(input)
    if ('error' in v) return { error: v.error }
    const admin = createAdminClient()
    const now = new Date().toISOString()
    if (input.id) {
      if (!isUuid(input.id)) return { error: 'Brief inexistent' }
      const { data, error } = await admin.from('campaign_briefs')
        .update({ ...v.value, updated_at: now }).eq('id', input.id).eq('campaign_id', campaignId)
        .select(BRIEF_COLS).maybeSingle()
      if (error) return { error: error.message }
      if (!data) return { error: 'Brief inexistent' }
      // cei care îl aveau trebuie să-l recitească
      const { data: affected } = await admin.from('collaborations')
        .update({ brief_ack_at: null }).eq('brief_id', input.id).neq('status', 'COMPLETED')
        .select('influencer_id, influencers(user_id)')
      await notifyCreators(admin, affected ?? [], auth.campaign, 'Briefil tău a fost actualizat',
        `Brandul a modificat briefil pentru „${campaignName(auth.campaign)}”. Citește-l din nou înainte să postezi.`)
      return { brief: data as CampaignBrief }
    }
    const { count } = await admin.from('campaign_briefs').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)
    if ((count ?? 0) >= 100) return { error: 'O campanie poate avea cel mult 100 de briefuri.' }
    const { data, error } = await admin.from('campaign_briefs')
      .insert({ ...v.value, campaign_id: campaignId, sort: count ?? 0, created_by: auth.userId })
      .select(BRIEF_COLS).single()
    if (error) return { error: /campaign_briefs/.test(error.message) ? 'Rulează întâi SQL 62 (briefuri individuale) în Supabase.' : error.message }
    return { brief: data as CampaignBrief }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

export async function deleteCampaignBrief(campaignId: string, briefId: string): Promise<{ ok: true } | Fail> {
  try {
    const auth = await canManage(campaignId)
    if ('error' in auth) return auth
    if (!isUuid(briefId)) return { error: 'Brief inexistent' }
    const admin = createAdminClient()
    // creatorii rămân fără brief (brief_id devine gol automat)
    await admin.from('collaborations').update({ brief_id: null, brief_assigned_at: null, brief_ack_at: null }).eq('brief_id', briefId)
    const { error } = await admin.from('campaign_briefs').delete().eq('id', briefId).eq('campaign_id', campaignId)
    if (error) return { error: error.message }
    return { ok: true }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Dă un brief (sau niciunul, cu briefId = null) mai multor creatori deodată. */
export async function assignCampaignBrief(campaignId: string, collabIds: string[], briefId: string | null):
  Promise<{ ok: true; count: number } | Fail> {
  try {
    const auth = await canManage(campaignId)
    if ('error' in auth) return auth
    const ids = [...new Set((collabIds || []).filter(isUuid))]
    if (!ids.length) return { error: 'Alege cel puțin un creator.' }
    if (ids.length > 500) return { error: 'Prea mulți creatori deodată.' }
    const admin = createAdminClient()
    let brief: any = null
    if (briefId) {
      if (!isUuid(briefId)) return { error: 'Brief inexistent' }
      const { data } = await admin.from('campaign_briefs').select('id, title').eq('id', briefId).eq('campaign_id', campaignId).maybeSingle()
      if (!data) return { error: 'Brief inexistent' }
      brief = data
    }
    const now = new Date().toISOString()
    // doar creatorii care chiar au alt brief decât cel ales (ca să nu retrimitem notificări degeaba)
    const { data: rows, error } = await admin.from('collaborations')
      .select('id, brief_id, influencer_id, influencers(user_id)')
      .eq('campaign_id', campaignId).in('id', ids)
    if (error) return { error: error.message }
    const changed = (rows ?? []).filter((r: any) => (r.brief_id || null) !== (briefId || null))
    if (!changed.length) return { ok: true, count: 0 }
    const { error: upErr } = await admin.from('collaborations')
      .update({ brief_id: briefId, brief_assigned_at: briefId ? now : null, brief_ack_at: null })
      .in('id', changed.map((r: any) => r.id))
    if (upErr) return { error: upErr.message }
    if (brief) {
      await notifyCreators(admin, changed, auth.campaign, '📋 Ai primit briefil tău',
        `Pentru campania „${campaignName(auth.campaign)}” ai un brief personal. Citește-l și bifează că îl respecți înainte să postezi.`)
    }
    return { ok: true, count: changed.length }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

async function notifyCreators(admin: any, rows: any[], campaign: any, title: string, body: string) {
  const users = [...new Set(rows.map(r => r.influencers?.user_id).filter(Boolean))]
  if (!users.length) return
  try {
    await admin.from('notifications').insert(users.map(user_id => ({ user_id, title, body, link: '/influencer/collaborations', read: false })))
  } catch (e) { console.error('[campaign-briefs] notify', e) }
}

// ─── Influencerul ────────────────────────────────────────────────────────────

async function myCollab(collabId: string) {
  if (!isUuid(collabId)) return null
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
  if (!inf) return null
  const { data: collab } = await admin.from('collaborations')
    .select('id, brief_id, brief_ack_at, influencer_id').eq('id', collabId).eq('influencer_id', inf.id).maybeSingle()
  return collab
}

/** Briefil personal al colaborării (null dacă nu are). */
export async function getMyBrief(collabId: string):
  Promise<{ brief: Pick<CampaignBrief, 'id' | 'title' | 'body' | 'file_url' | 'ref_url' | 'updated_at'> | null; ackAt: string | null } | Fail> {
  try {
    const collab = await myCollab(collabId)
    if (!collab) return { error: 'Colaborare inexistentă' }
    if (!collab.brief_id) return { brief: null, ackAt: null }
    const admin = createAdminClient()
    const { data: brief } = await admin.from('campaign_briefs').select('id, title, body, file_url, ref_url, updated_at').eq('id', collab.brief_id).maybeSingle()
    return { brief: brief ?? null, ackAt: collab.brief_ack_at ?? null }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

export async function acknowledgeMyBrief(collabId: string): Promise<{ ackAt: string } | Fail> {
  try {
    const collab = await myCollab(collabId)
    if (!collab) return { error: 'Colaborare inexistentă' }
    if (!collab.brief_id) return { error: 'Nu ai un brief personal la această campanie.' }
    if (collab.brief_ack_at) return { ackAt: collab.brief_ack_at }
    const now = new Date().toISOString()
    const admin = createAdminClient()
    const { error } = await admin.from('collaborations').update({ brief_ack_at: now }).eq('id', collab.id)
    if (error) return { error: error.message }
    return { ackAt: now }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Briefil personal al influencerului logat pentru o campanie (prin colaborarea lui din campanie). */
export async function getMyBriefForCampaign(campaignId: string):
  Promise<{ collabId: string | null; brief: Pick<CampaignBrief, 'id' | 'title' | 'body' | 'file_url' | 'ref_url' | 'updated_at'> | null; ackAt: string | null } | Fail> {
  try {
    if (!isUuid(campaignId)) return { error: 'Campanie inexistentă' }
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { collabId: null, brief: null, ackAt: null }
    const admin = createAdminClient()
    const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
    if (!inf) return { collabId: null, brief: null, ackAt: null }
    const { data: collab } = await admin.from('collaborations')
      .select('id, brief_id, brief_ack_at').eq('campaign_id', campaignId).eq('influencer_id', inf.id)
      .in('status', ['ACTIVE', 'COMPLETED']).maybeSingle()
    if (!collab?.brief_id) return { collabId: collab?.id ?? null, brief: null, ackAt: null }
    const { data: brief } = await admin.from('campaign_briefs').select('id, title, body, file_url, ref_url, updated_at').eq('id', collab.brief_id).maybeSingle()
    return { collabId: collab.id, brief: brief ?? null, ackAt: collab.brief_ack_at ?? null }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}
