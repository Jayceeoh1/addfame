// Cererile Academy Members: feedback pe materiale și analiza profilului. Reguli comune pentru server și interfață.

export type AcademyRequestKind = 'feedback' | 'analysis'

/** Câte cereri de feedback poate avea un membru în așteptare în același timp. */
export const FEEDBACK_OPEN_MAX = 3
/** O analiză de profil la atâtea zile (și doar una în așteptare). */
export const ANALYSIS_EVERY_DAYS = 30

export const MATERIAL_TYPES = ['Reel', 'Story', 'TikTok', 'Material de campanie', 'Altul'] as const

export type AcademyRequest = {
  id: string
  kind: AcademyRequestKind
  url: string | null
  material_type: string | null
  question: string | null
  status: 'open' | 'answered'
  answer: string | null
  strengths: string | null
  brands: string | null
  improve: string | null
  answered_by_name: string | null
  answered_at: string | null
  seen_at: string | null
  created_at: string
}

/** Acceptă doar linkuri http(s) normale; întoarce linkul curățat sau null. */
export function cleanUrl(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s || s.length > 500) return null
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch { return null }
}

export function clip(raw: unknown, max: number): string | null {
  const s = String(raw ?? '').trim()
  return s ? s.slice(0, max) : null
}

/** De ce nu poate trimite acum o cerere nouă (sau null dacă poate). */
export function requestBlock(
  kind: AcademyRequestKind,
  mine: Pick<AcademyRequest, 'kind' | 'status' | 'created_at'>[],
  now = Date.now(),
): string | null {
  const same = mine.filter(r => r.kind === kind)
  if (kind === 'feedback') {
    const open = same.filter(r => r.status === 'open').length
    return open >= FEEDBACK_OPEN_MAX
      ? `Ai deja ${open} materiale în așteptare. Trimiți altul după ce primești feedback.`
      : null
  }
  if (same.some(r => r.status === 'open')) return 'Analiza ta e în lucru. Te anunțăm când e gata.'
  const last = same.map(r => new Date(r.created_at).getTime()).sort((a, b) => b - a)[0]
  if (last) {
    const next = last + ANALYSIS_EVERY_DAYS * 86400000
    if (next > now) {
      const d = new Date(next).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })
      return `Poți cere următoarea analiză de pe ${d}.`
    }
  }
  return null
}
