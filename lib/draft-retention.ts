// Păstrarea materialelor video (drafturi) după terminarea colaborării.
//
//  - la 7 zile după finalizare: avertisment brandului și creatorului („se șterge pe <data>, descarcă-l acum”);
//  - la 10 zile: fișierele se șterg din Storage, drafturile trec în „deleted” (comentariile text rămân);
//  - colaborările anulate / respinse: aceleași termene, socotite de la ultima activitate pe draft;
//  - cât timp există un litigiu deschis pe colaborare, NU se șterge nimic (materialul e probă);
//  - încărcările abandonate („uploading” mai vechi de o zi) se curăță oricând.
// Funcțiile de aici sunt pure (testabile); ruta cron doar execută planul.

export const RETENTION_DAYS = 10
export const WARN_BEFORE_DAYS = 3
export const STALE_UPLOAD_HOURS = 24
const DAY = 864e5

export interface RetentionCollab {
  id: string
  status: string
  completed_at?: string | null
  deliverable_approved_at?: string | null
}

export interface RetentionDraft {
  id: string
  collaboration_id: string
  status: string
  file_path: string
  created_at: string
  reviewed_at?: string | null
  cleanup_warned_at?: string | null
}

export interface RetentionPlan {
  /** colaborări de avertizat (o dată), cu data ștergerii */
  warn: { collabId: string; deleteOn: Date; draftIds: string[] }[]
  /** drafturi de șters acum */
  remove: RetentionDraft[]
  /** încărcări abandonate */
  stale: RetentionDraft[]
}

const ENDED = ['COMPLETED', 'CANCELLED', 'REJECTED']

/** Momentul de la care curg cele 10 zile, sau null dacă colaborarea nu s-a terminat. */
export function retentionStart(c: RetentionCollab, drafts: RetentionDraft[]): Date | null {
  const status = String(c.status || '').toUpperCase()
  if (!ENDED.includes(status)) return null
  if (status === 'COMPLETED') {
    const ref = c.completed_at || c.deliverable_approved_at
    if (ref) return new Date(ref)
  }
  // anulată/respinsă (sau finalizată fără dată): ultima activitate pe drafturi
  const last = Math.max(0, ...drafts.map(d => Math.max(Date.parse(d.created_at) || 0, Date.parse(d.reviewed_at || '') || 0)))
  return last > 0 ? new Date(last) : null
}

export function planRetention(
  collabs: RetentionCollab[], drafts: RetentionDraft[], openDisputeCollabIds: Set<string>, now: Date = new Date(),
): RetentionPlan {
  const plan: RetentionPlan = { warn: [], remove: [], stale: [] }
  const t = now.getTime()
  const byCollab = new Map<string, RetentionDraft[]>()
  for (const d of drafts) {
    if (d.status === 'deleted') continue
    if (d.status === 'uploading') {
      if (t - Date.parse(d.created_at) >= STALE_UPLOAD_HOURS * 36e5) plan.stale.push(d)
      continue
    }
    byCollab.set(d.collaboration_id, [...(byCollab.get(d.collaboration_id) || []), d])
  }
  for (const c of collabs) {
    const list = byCollab.get(c.id)
    if (!list?.length || openDisputeCollabIds.has(c.id)) continue
    const start = retentionStart(c, list)
    if (!start) continue
    const deleteOn = new Date(start.getTime() + RETENTION_DAYS * DAY)
    if (t >= deleteOn.getTime()) plan.remove.push(...list)
    else if (t >= deleteOn.getTime() - WARN_BEFORE_DAYS * DAY && list.some(d => !d.cleanup_warned_at)) {
      plan.warn.push({ collabId: c.id, deleteOn, draftIds: list.map(d => d.id) })
    }
  }
  return plan
}

export const fmtDeleteDate = (d: Date) =>
  d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' })
