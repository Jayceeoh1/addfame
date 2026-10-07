// Alerte la campanii noi: când o campanie devine activă, creatorii potriviți primesc
// notificare în clopoțel (+ push, automat, prin SQL 24), email (dacă au acceptat) și Telegram (campanii plătite).
//
// Potrivirea folosește aceeași regulă ca lista de campanii (lib/eligibility): categorie + nișă,
// plus platforma campaniei și minimul de urmăritori. O campanie se anunță O SINGURĂ DATĂ
// (coloana campaigns.alerts_sent_at, revendicată atomic) — fără dubluri la aprobare + publicare.
import type { SupabaseClient } from '@supabase/supabase-js'
import { eligibility, type EligCreator } from '@/lib/eligibility'
import { creatorTierInfo } from '@/lib/tiers'
import { logError } from '@/lib/log-error'

const escapeHtml = (v: unknown) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

export interface AlertCampaign {
  id: string
  title: string
  brand_name?: string | null
  campaign_type?: string | null
  status?: string | null
  platforms?: string[] | null
  min_followers_target?: number | null
  elig_tiers?: string[] | null
  elig_niches?: string[] | null
  budget_per_influencer?: number | null
  offer_name?: string | null
  offer_description?: string | null
  description?: string | null
  max_influencers?: number | null
  deadline?: string | null
}

export interface AlertCreator extends EligCreator {
  id: string
  user_id: string | null
  name?: string | null
  email?: string | null
  email_reminders_enabled?: boolean | null
  telegram_chat_id?: number | null
  tiktok_connected?: boolean | null
  settings?: { notifications?: { campaign_opportunities?: boolean; email_notifications?: boolean } } | null
}

const up = (s: unknown) => String(s || '').trim().toUpperCase()

/** Platformele pe care creatorul are cont (din profil + conturile conectate). */
export function creatorPlatforms(c: AlertCreator): Set<string> {
  const out = new Set<string>()
  for (const p of Array.isArray(c.platforms) ? c.platforms : []) {
    const k = up((p as any)?.platform ?? p)
    if (k) out.add(k)
  }
  if (c.instagram_connected) out.add('INSTAGRAM')
  if (c.tiktok_connected) out.add('TIKTOK')
  return out
}

export type SkipReason = 'no_user' | 'opted_out' | 'not_eligible' | 'platform' | 'followers'

/** Decide dacă un creator primește alerta (pur, testabil). */
export function alertDecision(camp: AlertCampaign, c: AlertCreator): { send: boolean; email: boolean; reason?: SkipReason } {
  if (!c.user_id) return { send: false, email: false, reason: 'no_user' }
  if (c.settings?.notifications?.campaign_opportunities === false) return { send: false, email: false, reason: 'opted_out' }
  if (!eligibility(camp, c).ok) return { send: false, email: false, reason: 'not_eligible' }

  const want = (camp.platforms || []).map(up).filter(Boolean)
  if (want.length) {
    const has = creatorPlatforms(c)
    // fără nicio platformă în profil nu excludem (date incomplete), altfel trebuie să aibă una cerută
    if (has.size > 0 && !want.some(p => has.has(p))) return { send: false, email: false, reason: 'platform' }
  }

  const min = Number(camp.min_followers_target) || 0
  if (min > 0 && creatorTierInfo(c).followers < min) return { send: false, email: false, reason: 'followers' }

  const email = !!c.email
    && c.email_reminders_enabled !== false
    && c.settings?.notifications?.email_notifications !== false
  return { send: true, email }
}

export function alertTexts(camp: AlertCampaign) {
  const isBarter = up(camp.campaign_type) === 'BARTER'
  const brand = camp.brand_name || 'un brand'
  const reward = isBarter ? (camp.offer_name || 'produs gratuit') : `${Number(camp.budget_per_influencer || 0).toLocaleString('ro-RO')} RON`
  return {
    isBarter,
    title: isBarter ? `🎁 Ofertă barter nouă de la ${brand}` : `🚀 Campanie nouă de la ${brand}`,
    body: `„${camp.title}” — ${reward}. Se potrivește profilului tău, aplică acum!`,
    link: `/influencer/campaigns/${camp.id}`,
    subject: `${isBarter ? '🎁' : '🚀'} Campanie nouă pentru tine: „${camp.title}” de la ${brand}`,
  }
}

export function campaignEmailHtml(camp: AlertCampaign, name: string | null | undefined): string {
  const t = alertTexts(camp)
  const deadline = camp.deadline ? new Date(camp.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const desc = camp.offer_description || camp.description || ''
  const reward = t.isBarter
    ? `Primești gratuit: <strong>${escapeHtml(camp.offer_name || 'produs')}</strong>`
    : `Câștiguri: <strong>${escapeHtml(Number(camp.budget_per_influencer || 0).toLocaleString('ro-RO'))} RON</strong>`
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5fb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
 <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e5f3">
  <div style="background:linear-gradient(135deg,#7040f0,#e2458f);padding:26px 24px;text-align:center">
   <div style="font-size:26px;font-weight:900;color:#fff">AddFame</div>
  </div>
  <div style="padding:26px 24px">
   <p style="font-size:15px;color:#1f1d3a;margin:0 0 14px">Bună, <strong>${escapeHtml(name || 'creatorule')}</strong>!</p>
   <p style="font-size:14px;color:#4a4770;line-height:1.6;margin:0 0 18px">A apărut o campanie care se potrivește profilului tău. Locurile sunt limitate.</p>
   <div style="background:#f7f5ff;border:1.5px solid #e4dcff;border-radius:12px;padding:18px;margin-bottom:20px">
    <div style="font-size:11px;font-weight:800;color:#7040f0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${t.isBarter ? 'Campanie barter' : 'Campanie plătită'}</div>
    <div style="font-size:18px;font-weight:900;color:#111827">${escapeHtml(camp.title)}</div>
    <div style="font-size:13px;color:#6b7280;margin:2px 0 12px">de la <strong>${escapeHtml(camp.brand_name || '')}</strong></div>
    <div style="font-size:14px;color:#111827;margin-bottom:6px">${reward}</div>
    ${camp.max_influencers ? `<div style="font-size:13px;color:#4a4770">Locuri: <strong>${Number(camp.max_influencers)}</strong></div>` : ''}
    ${deadline ? `<div style="font-size:13px;color:#b45309;margin-top:6px">Termen postare: ${escapeHtml(deadline)}</div>` : ''}
   </div>
   ${desc ? `<p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">${escapeHtml(desc.length > 220 ? desc.slice(0, 220) + '…' : desc)}</p>` : ''}
   <div style="text-align:center;margin:24px 0">
    <a href="${APP_URL}${t.link}" style="background:#7040f0;color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:13px 28px;border-radius:12px;display:inline-block">Vezi campania și aplică</a>
   </div>
   <p style="font-size:12px;color:#9ca3af;text-align:center;margin:20px 0 0">Primești acest email pentru că ai activat alertele de campanii.
   <a href="${APP_URL}/unsubscribe" style="color:#9ca3af">Dezabonează-te</a> sau schimbă preferințele din Setări → Notificări.</p>
  </div>
 </div>
</div></body></html>`
}

const CAMPAIGN_COLS = 'id, title, brand_name, campaign_type, status, platforms, min_followers_target, budget_per_influencer, offer_name, offer_description, description, max_influencers, deadline'
const CREATOR_COLS = 'id, user_id, name, email, platforms, niches, instagram_connected, ig_followers, instagram_followers, tt_followers, tiktok_connected, email_reminders_enabled, telegram_chat_id, settings'

/** Câmpurile de țintire (SQL 17) — citite separat, ca alerta să meargă și dacă SQL 17 nu a rulat. */
async function loadTargeting(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from('campaigns').select('elig_tiers, elig_niches').eq('id', id).maybeSingle()
  return error ? {} : (data || {})
}

async function loadCreators(admin: SupabaseClient): Promise<AlertCreator[]> {
  const out: AlertCreator[] = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await admin.from('influencers').select(CREATOR_COLS)
      .eq('approval_status', 'approved').order('id').range(from, from + 999)
    if (error) throw new Error('influencers: ' + error.message)
    out.push(...((data || []) as AlertCreator[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function sendEmailBatch(items: { to: string; subject: string; html: string }[]) {
  const key = process.env.RESEND_API_KEY
  if (!key || !items.length) return 0
  let sent = 0
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100)
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk.map(e => ({ from: FROM_EMAIL, to: e.to, subject: e.subject, html: e.html }))),
    })
    if (res.ok) sent += chunk.length
    else await logError(new Error(`Resend batch ${res.status}: ${(await res.text()).slice(0, 200)}`), { source: 'server', context: { where: 'campaign-alerts' } })
    if (i + 100 < items.length) await new Promise(r => setTimeout(r, 600)) // limita Resend: ~2 cereri/secundă
  }
  return sent
}

export interface AnnounceResult { ok: boolean; skipped?: string; notified?: number; emailed?: number; telegram?: number; considered?: number }

/**
 * Anunță creatorii potriviți despre o campanie activă. Sigur de apelat de mai multe ori:
 * doar primul apel trimite (revendicare atomică pe alerts_sent_at).
 */
export async function announceCampaign(admin: SupabaseClient, campaignId: string, opts: { email?: boolean } = {}): Promise<AnnounceResult> {
  try {
    // 1) Revendicare: doar o campanie ACTIVĂ și neanunțată
    let camp: AlertCampaign | null = null
    const claim = await admin.from('campaigns')
      .update({ alerts_sent_at: new Date().toISOString() })
      .eq('id', campaignId).eq('status', 'ACTIVE').is('alerts_sent_at', null)
      .select(CAMPAIGN_COLS)
    if (claim.error) {
      if (claim.error.code !== '42703') throw new Error('claim: ' + claim.error.message)
      // SQL 24 nu a rulat încă: continuăm fără protecția la dubluri
      const r = await admin.from('campaigns').select(CAMPAIGN_COLS).eq('id', campaignId).eq('status', 'ACTIVE').maybeSingle()
      camp = (r.data as any) || null
    } else {
      camp = ((claim.data || [])[0] as any) || null
    }
    if (!camp) return { ok: true, skipped: 'already_sent_or_not_active' }
    Object.assign(camp, await loadTargeting(admin, campaignId))

    // 2) Destinatari
    const creators = await loadCreators(admin)
    const picked = creators.map(c => ({ c, d: alertDecision(camp!, c) })).filter(x => x.d.send)
    const t = alertTexts(camp)

    // 3) Clopoțel (+ push automat din trigger)
    const rows = picked.map(({ c }) => ({ user_id: c.user_id, title: t.title, body: t.body, link: t.link, read: false }))
    let notified = 0
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await admin.from('notifications').insert(rows.slice(i, i + 500))
      if (error) await logError(new Error('alert notifications: ' + error.message), { source: 'server' })
      else notified += Math.min(500, rows.length - i)
    }

    // 4) Email
    let emailed = 0
    if (opts.email !== false) {
      emailed = await sendEmailBatch(picked.filter(x => x.d.email).map(({ c }) => ({
        to: String(c.email), subject: t.subject, html: campaignEmailHtml(camp!, c.name),
      })))
    }

    // 5) Telegram (doar campanii plătite, ca înainte)
    let telegram = 0
    if (!t.isBarter && Number(camp.budget_per_influencer) > 0) {
      const { notifyNewCampaign } = await import('@/lib/telegram')
      for (const { c } of picked) {
        if (!c.telegram_chat_id) continue
        await notifyNewCampaign(c.telegram_chat_id, escapeHtml(camp.title), Number(camp.budget_per_influencer) || 0).catch(() => {})
        telegram++
      }
    }

    return { ok: true, considered: creators.length, notified, emailed, telegram }
  } catch (e) {
    await logError(e, { source: 'server', context: { where: 'announceCampaign', campaignId } })
    return { ok: false, skipped: 'error' }
  }
}
