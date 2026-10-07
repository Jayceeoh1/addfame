// Litigii brand ↔ creator (SQL 23). Logica comună rutelor API și cron-ului.
// NU mișcă bani: decizia se înregistrează, iar plata o gestionează adminul separat.
import type { SupabaseClient } from '@supabase/supabase-js'
import { notify } from '@/lib/drafts'

export const RESPOND_HOURS = 72

export const REASONS = {
  no_post: 'Postarea nu a fost publicată',
  post_not_matching: 'Postarea nu respectă briefului',
  no_response: 'Cealaltă parte nu răspunde',
  revision_overdue: 'Termenul de revizuire a fost depășit',
  review_overdue: 'Draftul nu a fost evaluat la timp',
  other: 'Altceva',
} as const
export type DisputeReason = keyof typeof REASONS

/** Motivele pe care le poate alege un utilizator (celelalte le deschide sistemul). */
export const USER_REASONS: DisputeReason[] = ['no_post', 'post_not_matching', 'no_response', 'other']

export const RESOLUTIONS = {
  in_favor_brand: 'În favoarea brandului',
  in_favor_creator: 'În favoarea creatorului',
  split: 'Împărțit',
  dismissed: 'Respins (fără măsuri)',
} as const
export type Resolution = keyof typeof RESOLUTIONS

/** Se poate deschide un litigiu doar pentru colaborări în desfășurare sau abia încheiate. */
export const DISPUTABLE_STATUSES = ['ACTIVE', 'COMPLETED']
export const canOpenDispute = (collabStatus: string) => DISPUTABLE_STATUSES.includes(String(collabStatus || '').toUpperCase())

export async function notifyAdmins(admin: SupabaseClient, title: string, body: string) {
  try {
    const { data } = await admin.from('admins').select('user_id').eq('is_active', true)
    for (const a of data || []) await notify(admin, (a as any).user_id, title, body, '/admin/disputes')
  } catch (e) { console.error('[disputes] notifyAdmins', e) }
}

export interface OpenArgs {
  collabId: string
  role: 'brand' | 'influencer' | 'system'
  userId: string | null
  reason: DisputeReason
  description: string
  title: string
  otherPartyUserId: string | null
}

/** Creează litigiul și anunță cealaltă parte + adminii. Întoarce { id } sau { error, code }. */
export async function openDispute(admin: SupabaseClient, a: OpenArgs): Promise<{ id: string } | { error: string; code?: string }> {
  const respondBy = new Date(Date.now() + RESPOND_HOURS * 3600 * 1000).toISOString()
  const { data, error } = await admin.from('disputes').insert({
    collaboration_id: a.collabId, opened_by_role: a.role, opened_by_user_id: a.userId,
    reason: a.reason, description: a.description, status: 'awaiting_response', respond_by: respondBy,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return { error: 'Există deja un litigiu activ pentru această colaborare.', code: 'duplicate' }
    console.error('[disputes] insert', error.message)
    return { error: 'Nu am putut deschide litigiul.', code: error.code }
  }
  const who = a.role === 'brand' ? 'Brandul' : a.role === 'influencer' ? 'Creatorul' : 'Sistemul'
  await notify(admin, a.otherPartyUserId, 'Litigiu deschis',
    `${who} a deschis un litigiu pentru „${a.title}”. Ai ${RESPOND_HOURS} de ore să răspunzi.`, '/')
  await notifyAdmins(admin, 'Litigiu nou', `„${a.title}”: ${REASONS[a.reason]}`)
  return { id: data.id }
}
