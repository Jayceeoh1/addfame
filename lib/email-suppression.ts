// Dezabonări și reguli pentru emailurile în masă (marketing / outreach).
// Doar pe server.
import type { SupabaseClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export const normalizeEmail = (e: unknown) => String(e ?? '').trim().toLowerCase()
/** pentru ilike: „_” și „%” din adresă se caută literal */
const likeExact = (e: string) => e.replace(/[\\%_]/g, m => '\\' + m)
export const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/** Max. emailuri de marketing pe zi (reputația domeniului). Se poate schimba din Vercel: BULK_EMAIL_DAILY_LIMIT. */
export function bulkDailyLimit() {
  const n = Number(process.env.BULK_EMAIL_DAILY_LIMIT)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 300
}

/**
 * Outreach la persoane NEÎNSCRISE (lead-uri, invitații). Oprit implicit: a pus addfame.ro pe Spamhaus.
 * Se pornește doar explicit, din Vercel: OUTREACH_EMAIL_ENABLED=true (ideal de pe alt domeniu decât addfame.ro).
 */
export const coldOutreachEnabled = () => process.env.OUTREACH_EMAIL_ENABLED === 'true'

export const unsubscribeUrl = (email: string) => `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(normalizeEmail(email))}`

/** Antete standard de dezabonare (Gmail / Yahoo le cer la trimiterile în masă). */
export function unsubscribeHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(email)}>, <mailto:ciprian@addfame.ro?subject=Dezabonare>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

export async function isSuppressed(sb: SupabaseClient, email: string): Promise<boolean> {
  const { data, error } = await sb.from('email_suppressions').select('email').eq('email', normalizeEmail(email)).maybeSingle()
  if (error) { console.warn('[email] email_suppressions lipsește — rulează SQL 36'); return false }
  return !!data
}

export async function suppressEmail(sb: SupabaseClient, email: string, source = 'unsubscribe') {
  const e = normalizeEmail(email)
  if (!isEmail(e)) return false
  await sb.from('email_suppressions').upsert({ email: e, source }, { onConflict: 'email', ignoreDuplicates: true })
  // și din remindere, dacă e influencer înscris
  await sb.from('influencers').update({ email_reminders_enabled: false }).ilike('email', likeExact(e))
  return true
}

/** Persoana are cont pe platformă (influencer sau brand)? */
export async function isRegisteredEmail(sb: SupabaseClient, email: string): Promise<boolean> {
  const e = normalizeEmail(email)
  const [inf, br] = await Promise.all([
    sb.from('influencers').select('id').ilike('email', likeExact(e)).limit(1),
    sb.from('brands').select('id').ilike('email', likeExact(e)).limit(1),
  ])
  return !!(inf.data?.length || br.data?.length)
}

/** Câte emailuri de marketing au plecat azi (din email_tracking). */
export async function bulkSentToday(sb: SupabaseClient): Promise<number> {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0)
  const { count } = await sb.from('email_tracking').select('id', { count: 'exact', head: true }).gte('sent_at', start.toISOString())
  return count ?? 0
}
