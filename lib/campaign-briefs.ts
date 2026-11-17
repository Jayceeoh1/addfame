// Briefuri individuale pe campanie: validare și sumar. Funcții pure, testate separat.

export type CampaignBrief = {
  id: string
  campaign_id: string
  title: string
  body: string
  file_url: string | null
  ref_url: string | null
  sort: number
  created_at?: string
  updated_at?: string
}

export type BriefInput = { title?: unknown; body?: unknown; file_url?: unknown; ref_url?: unknown }

export type BriefCreator = {
  collabId: string
  influencerId: string
  name: string
  handle: string | null
  status: string
  briefId: string | null
  ackAt: string | null
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function cleanUrl(v: unknown): string | null | { error: string } {
  const s = clean(v)
  if (!s) return null
  if (s.length > 2000) return { error: 'Linkul e prea lung.' }
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'Linkul trebuie să înceapă cu https://' }
  } catch { return { error: `Link invalid: ${s}` } }
  return s
}

/** Verifică și curăță ce scrie brandul/adminul în formularul de brief. */
export function validateBrief(input: BriefInput):
  { ok: true; value: { title: string; body: string; file_url: string | null; ref_url: string | null } } | { ok: false; error: string } {
  const title = clean(input.title)
  const body = clean(input.body)
  if (!title) return { ok: false, error: 'Scrie un titlu pentru brief (ex. „Brief A” sau numele creatorului).' }
  if (title.length > 120) return { ok: false, error: 'Titlul e prea lung (maxim 120 de caractere).' }
  if (body.length > 20000) return { ok: false, error: 'Textul briefului e prea lung (maxim 20.000 de caractere).' }
  const file_url = cleanUrl(input.file_url)
  if (file_url && typeof file_url === 'object') return { ok: false, error: file_url.error }
  const ref_url = cleanUrl(input.ref_url)
  if (ref_url && typeof ref_url === 'object') return { ok: false, error: ref_url.error }
  if (!body && !file_url) return { ok: false, error: 'Scrie textul briefului sau pune un link către fișier.' }
  return { ok: true, value: { title, body, file_url: file_url as string | null, ref_url: ref_url as string | null } }
}

/** Colaborările cărora li se poate da un brief: selectați, în lucru sau finalizați. */
export const BRIEF_ELIGIBLE_STATUSES = ['ACTIVE', 'COMPLETED', 'INVITED', 'PENDING'] as const

/** Câți creatori are fiecare brief, câți au citit și câți n-au încă brief. */
export function briefSummary(briefs: Pick<CampaignBrief, 'id'>[], creators: BriefCreator[]) {
  const per: Record<string, { assigned: number; read: number }> = {}
  for (const b of briefs) per[b.id] = { assigned: 0, read: 0 }
  let withoutBrief = 0
  for (const c of creators) {
    if (!['ACTIVE', 'COMPLETED'].includes(c.status)) continue
    if (!c.briefId || !per[c.briefId]) { withoutBrief++; continue }
    per[c.briefId].assigned++
    if (c.ackAt) per[c.briefId].read++
  }
  return { per, withoutBrief }
}
