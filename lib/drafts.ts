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
    const { error } = await admin.from('notifications').insert({ user_id: userId, title, body, link, read: false })
    if (error) console.error('[drafts] notify a eșuat', error.code, error.message)
  } catch (e) { console.error('[drafts] notify excepție', e) }
}

export type DraftEvent = 'uploaded' | 'changes' | 'approved'
const fmtSec = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`

/** Postează în inbox-ul colaborării un mesaj de sistem despre draft (apare la ambele părți, în timp real). */
export async function postDraftMessage(
  admin: SupabaseClient, collabId: string, actorUserId: string, event: DraftEvent, text: string,
  actorRole: 'brand' | 'influencer' = 'brand',
): Promise<boolean> {
  const content = `::draft:${event}::\n${text}`
  // supabase-js NU aruncă excepții: returnează { error }. Verificăm explicit.
  // Încercăm întâi 'system'; dacă baza de date refuză valoarea, reîncercăm cu rolul real al autorului
  // (inbox-ul recunoaște mesajul după conținut, nu după rol).
  for (const role of ['system', actorRole]) {
    try {
      const { error } = await admin.from('messages').insert({
        collaboration_id: collabId, sender_id: actorUserId, sender_role: role, content,
      })
      if (!error) return true
      console.error('[drafts] postDraftMessage a eșuat', { role, code: error.code, message: error.message })
    } catch (e) {
      console.error('[drafts] postDraftMessage excepție', e)
    }
  }
  return false
}

/** Rezumat scurt al comentariilor pe secunde (primele 5). */
export function summarizeComments(cs: { at_second: number | null; body: string }[]): string {
  const rows = cs.filter(c => c.at_second !== null).slice(0, 5).map(c => `${fmtSec(c.at_second!)} – ${c.body.slice(0, 120)}`)
  return rows.length ? '\n' + rows.join('\n') : ''
}

// ── Termene pentru revizuiri (SQL 22) ──────────────────────────────────────
/** Ore pentru a trimite versiunea nouă: prima cerere de modificări 48h, a doua 24h. */
export const REVISION_HOURS = [48, 24] as const
export const MAX_REVISION_ROUNDS = REVISION_HOURS.length
/** Brandul e reamintit după 48h fără răspuns la un draft; după 5 zile problema ajunge la admin. */
export const REVIEW_REMIND_HOURS = 48
export const REVIEW_ESCALATE_HOURS = 120
/** Cu câte ore înainte de termen primește creatorul memento. */
export const REVISION_REMIND_BEFORE_HOURS = 12

const HOUR = 3600 * 1000

/** Se mai poate cere o rundă de modificări? `previousRounds` = câte cereri au existat deja. */
export function canRequestChanges(previousRounds: number): boolean {
  return previousRounds < MAX_REVISION_ROUNDS
}

/** Termenul pentru runda `round` (1-based), calculat din momentul cererii. */
export function revisionDeadline(round: number, from: Date = new Date()): Date {
  const hours = REVISION_HOURS[Math.min(Math.max(round, 1), MAX_REVISION_ROUNDS) - 1]
  return new Date(from.getTime() + hours * HOUR)
}

export interface DeadlineDraft {
  id: string; collaboration_id: string; version: number
  status: 'pending' | 'changes_requested' | 'approved' | 'deleted' | 'uploading'
  created_at: string
  revision_due_at: string | null
  reminder_sent_at: string | null
  review_reminder_sent_at: string | null
  overdue_notified_at: string | null
}

export type DeadlineAction =
  | { kind: 'revision_reminder'; draft: DeadlineDraft }
  | { kind: 'revision_overdue'; draft: DeadlineDraft }
  | { kind: 'review_reminder'; draft: DeadlineDraft }
  | { kind: 'review_overdue'; draft: DeadlineDraft }

/**
 * Ce trebuie făcut acum, pentru draftul CEL MAI NOU al fiecărei colaborări
 * (o versiune veche rămasă la „modificări cerute" nu mai contează după ce a venit una nouă).
 * Funcție pură: ușor de testat; ruta cron doar execută acțiunile.
 */
export function planDeadlineActions(drafts: DeadlineDraft[], now: Date = new Date()): DeadlineAction[] {
  const latest = new Map<string, DeadlineDraft>()
  for (const d of drafts) {
    if (d.status === 'deleted' || d.status === 'uploading') continue
    const cur = latest.get(d.collaboration_id)
    if (!cur || d.version > cur.version) latest.set(d.collaboration_id, d)
  }
  const out: DeadlineAction[] = []
  const t = now.getTime()
  for (const d of latest.values()) {
    if (d.status === 'changes_requested' && d.revision_due_at) {
      const due = new Date(d.revision_due_at).getTime()
      if (due <= t) { if (!d.overdue_notified_at) out.push({ kind: 'revision_overdue', draft: d }) }
      else if (due - t <= REVISION_REMIND_BEFORE_HOURS * HOUR && !d.reminder_sent_at) out.push({ kind: 'revision_reminder', draft: d })
    } else if (d.status === 'pending') {
      const age = t - new Date(d.created_at).getTime()
      if (age >= REVIEW_ESCALATE_HOURS * HOUR) { if (!d.overdue_notified_at) out.push({ kind: 'review_overdue', draft: d }) }
      else if (age >= REVIEW_REMIND_HOURS * HOUR && !d.review_reminder_sent_at) out.push({ kind: 'review_reminder', draft: d })
    }
  }
  return out
}
