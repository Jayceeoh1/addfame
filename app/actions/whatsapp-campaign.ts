'use server'

// WhatsApp: acordul creatorului pentru anunțuri de campanii + trimiterea anunțului din admin (șablon Twilio).
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { campaignName } from '@/lib/campaign-name'
import { sendWhatsAppTemplate, whatsappConfigured } from '@/lib/whatsapp'
import { waAudience, waOptedIn, waPhone, waVars } from '@/lib/wa-campaign'

const TEMPLATE = process.env.TWILIO_TEMPLATE_CAMPAIGN_SID || ''
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

async function me() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id, phone, settings, approval_status').eq('user_id', user.id).maybeSingle()
  return inf ? { admin, inf } : null
}

/** Pentru cardul din dashboard: arătăm întrebarea doar celor aprobați care n-au răspuns încă. */
export async function getWaOptIn() {
  const ctx = await me()
  if (!ctx || ctx.inf.approval_status !== 'approved') return { show: false as const }
  const s: any = ctx.inf.settings || {}
  const answered = typeof s?.notifications?.whatsapp_campaigns === 'boolean' || !!s?.wa_prompt_dismissed_at
  return { show: !answered, phone: waPhone(ctx.inf.phone) || String(ctx.inf.phone || ''), optedIn: waOptedIn(ctx.inf) }
}

/** Creatorul acceptă (cu numărul confirmat) sau refuză anunțurile pe WhatsApp. */
export async function setWaOptIn(yes: boolean, phone?: string) {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const s: any = ctx.inf.settings || {}
  const update: Record<string, any> = {}
  if (yes) {
    const p = waPhone(phone)
    if (!p) return { error: 'Scrie un număr de mobil valid (07xx xxx xxx).' }
    update.phone = p
    update.settings = { ...s, notifications: { ...(s.notifications || {}), whatsapp_campaigns: true }, wa_opt_in_at: new Date().toISOString() }
  } else {
    update.settings = { ...s, notifications: { ...(s.notifications || {}), whatsapp_campaigns: false }, wa_prompt_dismissed_at: new Date().toISOString() }
  }
  const { error } = await ctx.admin.from('influencers').update(update).eq('id', ctx.inf.id)
  return error ? { error: 'Nu s-a putut salva. Încearcă din nou.' } : { success: true as const }
}

async function loadAudience(admin: ReturnType<typeof createAdminClient>, campaignId: string) {
  const [{ data: cols }, { data: sentRow }] = await Promise.all([
    admin.from('collaborations').select('influencer_id').eq('campaign_id', campaignId),
    admin.from('platform_settings').select('value').eq('key', `wa_sent:${campaignId}`).maybeSingle(),
  ])
  const applied = new Set<string>((cols || []).map((c: any) => c.influencer_id))
  const sentIds: string[] = ((sentRow?.value as any)?.ids as string[]) || []
  const all: any[] = []
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await admin.from('influencers').select('id, name, phone, settings, last_active_at')
      .ilike('approval_status', 'approved').filter('settings->notifications->>whatsapp_campaigns', 'eq', 'true')
      .order('last_active_at', { ascending: false, nullsFirst: false }).range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return { audience: waAudience(all, applied, new Set(sentIds)), optedIn: all.length, sentIds }
}

export async function adminWaStatus(campaignId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  try {
    const { audience, optedIn, sentIds } = await loadAudience(createAdminClient(), campaignId)
    return { success: true as const, configured: whatsappConfigured(TEMPLATE), optedIn, remaining: audience.length, sent: sentIds.length }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Trimite anunțul următorilor `limit` creatori (max 25 pe apăsare, ca să nu depășim timpul serverului). */
export async function adminWaSend(campaignId: string, limit = 25) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  if (!whatsappConfigured(TEMPLATE)) return { error: 'Lipsește TWILIO_TEMPLATE_CAMPAIGN_SID în Vercel (șablonul aprobat de Meta).' }
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, title, offer_name, product_name, status').eq('id', campaignId).maybeSingle()
  if (!camp || camp.status !== 'ACTIVE') return { error: 'Campania nu e activă.' }
  const name = campaignName(camp)
  let ctx
  try { ctx = await loadAudience(admin, campaignId) } catch (e: any) { return { error: e?.message || 'Eroare' } }
  const batch = ctx.audience.slice(0, Math.min(Math.max(1, limit), 25))
  const sent = new Set(ctx.sentIds)
  let ok = 0, failed = 0
  const logs: any[] = []
  for (let i = 0; i < batch.length; i += 5) {
    const part = batch.slice(i, i + 5)
    const res = await Promise.all(part.map(r => sendWhatsAppTemplate(r.phone, TEMPLATE, waVars(r.first, name, campaignId))))
    res.forEach((x, j) => {
      const r = part[j]
      sent.add(r.id)   // și eșecurile: nu reîncercăm automat același număr
      x.ok ? ok++ : failed++
      logs.push({ influencer_id: r.id, influencer_name: r.first, phone: r.phone, campaign_id: campaignId, campaign_title: name,
        reminder_type: 'campaign_announce', message_body: `Anunț campanie: ${name}`, twilio_message_sid: x.sid || null,
        success: x.ok, error_message: x.ok ? null : (x.error || null), sent_by_admin_id: (auth as any).userId || null })
    })
  }
  await admin.from('platform_settings').upsert({ key: `wa_sent:${campaignId}`, value: { ids: [...sent] }, label: 'Anunț WhatsApp trimis',
    description: 'Creatorii care au primit anunțul pe WhatsApp pentru campanie', updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (logs.length) { try { await admin.from('whatsapp_logs').insert(logs) } catch { /* jurnal opțional */ } }
  return { success: true as const, ok, failed, remaining: Math.max(0, ctx.audience.length - batch.length) }
}
