'use server'

// WhatsApp: acordul creatorului + anunțul de campanie și reminder-ul „se închid înscrierile”, trimise din admin (șabloane Twilio).
// Anti-spam: anunțul se trimite o singură dată per om per campanie, reminder-ul o singură dată și doar celor care au primit
// anunțul și n-au aplicat; în plus, anunțurile au o pauză de 48 de ore între ele (orice campanie), reminder-ul de 24 de ore.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { campaignName } from '@/lib/campaign-name'
import { sendWhatsAppTemplate, whatsappConfigured } from '@/lib/whatsapp'
import { waAudience, waOptedIn, waPhone, waVars, waReminderAudience, waReminderVars, timeLeftLabel, WA_MIN_GAP_HOURS } from '@/lib/wa-campaign'

const TEMPLATE = process.env.TWILIO_TEMPLATE_CAMPAIGN_SID || ''
const REMINDER_TEMPLATE = process.env.TWILIO_TEMPLATE_CAMPAIGN_REMINDER_SID || ''
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)
type Kind = 'announce' | 'reminder'

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

type Admin = ReturnType<typeof createAdminClient>

async function idsFrom(admin: Admin, key: string): Promise<string[]> {
  const { data } = await admin.from('platform_settings').select('value').eq('key', key).maybeSingle()
  return ((data?.value as any)?.ids as string[]) || []
}

/** Cine a primit un mesaj de campanie (orice campanie) în ultimele `hours` ore (48 la anunț, 24 la reminder). */
async function recentlyMessaged(admin: Admin, hours = WA_MIN_GAP_HOURS): Promise<Set<string>> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString()
  const { data } = await admin.from('whatsapp_logs').select('influencer_id')
    .in('reminder_type', ['campaign_announce', 'campaign_reminder']).eq('success', true).gte('created_at', since).limit(5000)
  return new Set((data || []).map((r: any) => r.influencer_id))
}

/** Când se închid înscrierile: timerul de pe card (dacă e pentru campania asta), altfel deadline-ul campaniei. */
async function closesAt(admin: Admin, campaignId: string, deadline: string | null): Promise<string | null> {
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'featured_campaign').maybeSingle()
  const v: any = data?.value
  if (v?.campaign_id === campaignId && v?.ends_at && new Date(v.ends_at).getTime() > Date.now()) return v.ends_at
  return deadline && new Date(deadline).getTime() > Date.now() ? deadline : null
}

async function loadAll(admin: Admin, campaignId: string) {
  const [{ data: cols }, announced, reminded, recent, recent24] = await Promise.all([
    admin.from('collaborations').select('influencer_id').eq('campaign_id', campaignId),
    idsFrom(admin, `wa_sent:${campaignId}`),
    idsFrom(admin, `wa_reminded:${campaignId}`),
    recentlyMessaged(admin),
    recentlyMessaged(admin, 24),
  ])
  const applied = new Set<string>((cols || []).map((c: any) => c.influencer_id))
  const all: any[] = []
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await admin.from('influencers').select('id, name, phone, settings, last_active_at')
      .ilike('approval_status', 'approved')
      .order('last_active_at', { ascending: false, nullsFirst: false }).range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const announcedSet = new Set(announced), remindedSet = new Set(reminded)
  return {
    all, announced, reminded, optedIn: all.filter(waOptedIn).length,
    announceAudience: waAudience(all, applied, new Set([...announcedSet, ...recent])),
    announceAudienceAll: waAudience(all, applied, new Set([...announcedSet, ...recent]), true),
    reminderAudience: waReminderAudience(all, applied, announcedSet, remindedSet, recent24),
    reminderAudienceAll: waReminderAudience(all, applied, announcedSet, remindedSet, recent24, true),
    skippedRecent: all.filter(c => recent.has(c.id) && !announcedSet.has(c.id) && !applied.has(c.id)).length,
  }
}

export async function adminWaStatus(campaignId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const admin = createAdminClient()
  try {
    const { data: camp } = await admin.from('campaigns').select('deadline').eq('id', campaignId).maybeSingle()
    const [x, closes] = await Promise.all([loadAll(admin, campaignId), closesAt(admin, campaignId, (camp?.deadline as string) || null)])
    return {
      success: true as const,
      configured: whatsappConfigured(TEMPLATE), reminderConfigured: whatsappConfigured(REMINDER_TEMPLATE),
      optedIn: x.optedIn, remaining: x.announceAudience.length, remainingAll: x.announceAudienceAll.length, reminderRemainingAll: x.reminderAudienceAll.length, sent: x.announced.length,
      reminderRemaining: x.reminderAudience.length, reminded: x.reminded.length, skippedRecent: x.skippedRecent,
      closesAt: closes, timeLeft: closes ? timeLeftLabel(new Date(closes).getTime() - Date.now()) : null,
    }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Trimite anunțul sau reminder-ul următorilor `limit` creatori (max 25 pe apel; adminul apelează în bucle). */
export async function adminWaSend(campaignId: string, limit = 25, kind: Kind = 'announce', everyone = false) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const tpl = kind === 'reminder' ? REMINDER_TEMPLATE : TEMPLATE
  if (!whatsappConfigured(tpl)) return { error: kind === 'reminder'
    ? 'Lipsește TWILIO_TEMPLATE_CAMPAIGN_REMINDER_SID în Vercel (șablonul de reminder aprobat de Meta).'
    : 'Lipsește TWILIO_TEMPLATE_CAMPAIGN_SID în Vercel (șablonul aprobat de Meta).' }
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, title, offer_name, product_name, status, deadline').eq('id', campaignId).maybeSingle()
  if (!camp || camp.status !== 'ACTIVE') return { error: 'Campania nu e activă.' }
  const name = campaignName(camp)
  let left: string | null = null
  if (kind === 'reminder') {
    const closes = await closesAt(admin, campaignId, (camp.deadline as string) || null)
    left = closes ? timeLeftLabel(new Date(closes).getTime() - Date.now()) : null
    if (!left) return { error: 'Nu știu când se închid înscrierile: pune timerul pe card pentru campania asta.' }
  }
  let x
  try { x = await loadAll(admin, campaignId) } catch (e: any) { return { error: e?.message || 'Eroare' } }
  const pool = kind === 'reminder' ? (everyone ? x.reminderAudienceAll : x.reminderAudience) : (everyone ? x.announceAudienceAll : x.announceAudience)
  const batch = pool.slice(0, Math.min(Math.max(1, limit), 25))
  const done = new Set(kind === 'reminder' ? x.reminded : x.announced)
  let ok = 0, failed = 0
  const logs: any[] = []
  for (let i = 0; i < batch.length; i += 5) {
    const part = batch.slice(i, i + 5)
    const res = await Promise.all(part.map(r => sendWhatsAppTemplate(r.phone, tpl,
      kind === 'reminder' ? waReminderVars(r.first, name, left!, campaignId) : waVars(r.first, name, campaignId))))
    res.forEach((m, j) => {
      const r = part[j]
      done.add(r.id)   // și eșecurile: nu reîncercăm automat același număr
      m.ok ? ok++ : failed++
      logs.push({ influencer_id: r.id, influencer_name: r.first, phone: r.phone, campaign_id: campaignId, campaign_title: name,
        reminder_type: kind === 'reminder' ? 'campaign_reminder' : 'campaign_announce',
        message_body: kind === 'reminder' ? `Reminder: mai sunt ${left} — ${name}` : `Anunț campanie: ${name}`,
        twilio_message_sid: m.sid || null, success: m.ok, error_message: m.ok ? null : (m.error || null),
        sent_by_admin_id: (auth as any).userId || null })
    })
  }
  const key = kind === 'reminder' ? `wa_reminded:${campaignId}` : `wa_sent:${campaignId}`
  await admin.from('platform_settings').upsert({ key, value: { ids: [...done] },
    label: kind === 'reminder' ? 'Reminder WhatsApp trimis' : 'Anunț WhatsApp trimis',
    description: 'Creatorii contactați pe WhatsApp pentru campanie', updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (logs.length) { try { await admin.from('whatsapp_logs').insert(logs) } catch { /* jurnal opțional */ } }
  return { success: true as const, ok, failed, remaining: Math.max(0, pool.length - batch.length) }
}
