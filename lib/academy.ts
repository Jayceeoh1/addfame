// Academia AddFame: tipuri comune, importul întrebărilor din text și afișarea simplă a conținutului unei lecții.

export type AcademyQuestion = { q: string; options: string[]; correct: number; explain?: string }

/** Pașii interactivi ai unei lecții, înainte de test. */
export type AcademyStep =
  | { type: 'concept'; title: string; what?: string; why?: string; bad?: string; good?: string; checklist?: string[] }
  | { type: 'choose'; prompt: string; a: string; b: string; better: 'a' | 'b'; explain?: string }
  | { type: 'exercise'; prompt: string; brief?: string; example?: string; why?: string }

export type AcademyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

/** Nivelurile de certificat: rama de pe poza de profil + bonusul de puncte. */
export const TIERS: Record<AcademyTier, { label: string; frame: string; bonus: number; bg: string; fg: string }> = {
  bronze:   { label: 'Bronze',   frame: '/academie/rama-bronze.webp',   bonus: 0,   bg: '#f6e4d6', fg: '#7a431b' },
  silver:   { label: 'Silver',   frame: '/academie/rama-silver.webp',   bonus: 25,  bg: '#eceff3', fg: '#46505e' },
  gold:     { label: 'Gold',     frame: '/academie/rama-gold.webp',     bonus: 50,  bg: '#fff1c2', fg: '#7a5200' },
  platinum: { label: 'Platinum', frame: '/academie/rama-platinum.webp', bonus: 100, bg: '#e9e4ff', fg: '#3b2a9e' },
}
export const TIER_ORDER: AcademyTier[] = ['bronze', 'silver', 'gold', 'platinum']
export function isTier(t: any): t is AcademyTier { return typeof t === 'string' && t in TIERS }

/** Nivelul după răspunsurile corecte de la prima încercare (20 din 20 = Platinum, 19 = Gold, 18 = Silver). */
export function tierFor(correct: number, total: number): AcademyTier {
  if (!total) return 'bronze'
  const p = correct / total
  if (p >= 1) return 'platinum'
  if (p >= 0.95) return 'gold'
  if (p >= 0.9) return 'silver'
  return 'bronze'
}

export function cleanSteps(raw: any): AcademyStep[] {
  if (!Array.isArray(raw)) return []
  const str = (v: any) => (v == null ? '' : String(v)).trim()
  const out: AcademyStep[] = []
  for (const s of raw) {
    if (s?.type === 'concept' && str(s.title)) out.push({ type: 'concept', title: str(s.title), what: str(s.what), why: str(s.why), bad: str(s.bad), good: str(s.good), checklist: Array.isArray(s.checklist) ? s.checklist.map(str).filter(Boolean) : [] })
    else if (s?.type === 'choose' && str(s.prompt) && str(s.a) && str(s.b)) out.push({ type: 'choose', prompt: str(s.prompt), a: str(s.a), b: str(s.b), better: s.better === 'a' ? 'a' : 'b', explain: str(s.explain) })
    else if (s?.type === 'exercise' && str(s.prompt)) out.push({ type: 'exercise', prompt: str(s.prompt), brief: str(s.brief), example: str(s.example), why: str(s.why) })
  }
  return out
}

export type AcademyLesson = {
  id: string
  position: number
  title: string
  summary: string | null
  badge_name: string | null
  minutes: number
  points: number
  body: string | null
  video_url: string | null
  questions: AcademyQuestion[]
  steps: AcademyStep[]
  pass_min: number
  published: boolean
}

/** Câte răspunsuri corecte trebuie (pass_min 0 = 80% rotunjit în sus). */
export function passNeeded(passMin: number, total: number) {
  if (passMin > 0) return Math.min(passMin, total)
  return Math.ceil(total * 0.8)
}

/**
 * Importă întrebările dintr-un text lipit, în formatul:
 *   1. Întrebarea?
 *   A. Varianta
 *   B. Varianta
 *   ✅ Răspuns corect: B — explicație opțională
 */
export function parseQuestionsText(text: string): { questions: AcademyQuestion[]; errors: string[] } {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean)
  const questions: AcademyQuestion[] = []
  const errors: string[] = []
  let cur: { q: string; options: string[]; correct: number; explain?: string } | null = null
  const push = () => {
    if (!cur) return
    if (cur.options.length < 2) errors.push(`„${cur.q.slice(0, 60)}”: are mai puțin de 2 variante`)
    else if (cur.correct < 0 || cur.correct >= cur.options.length) errors.push(`„${cur.q.slice(0, 60)}”: lipsește răspunsul corect`)
    else questions.push(cur)
    cur = null
  }
  for (const line of lines) {
    const qm = line.match(/^(\d+)[.)]\s+(.+)$/)
    const om = line.match(/^([A-Da-d])[.)]\s+(.+)$/)
    const am = line.match(/^(?:✅\s*)?răspuns(?:ul)?\s+corect\s*:?\s*([A-Da-d])\b\s*(?:[—–-]\s*(.+))?$/i)
    if (am && cur) {
      cur.correct = am[1].toUpperCase().charCodeAt(0) - 65
      if (am[2]) cur.explain = am[2].trim()
    } else if (qm) {
      push()
      cur = { q: qm[2].trim(), options: [], correct: -1 }
    } else if (om && cur) {
      cur.options.push(om[2].trim())
    } else if (cur && cur.options.length === 0) {
      cur.q += ' ' + line
    }
  }
  push()
  return { questions, errors }
}

/** Linkul de video → adresa de încorporare (doar YouTube și Vimeo). */
export function videoEmbed(url: string | null | undefined): string | null {
  const u = String(url || '').trim()
  if (!u) return null
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i)
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (m) return `https://player.vimeo.com/video/${m[1]}`
  return null
}

/** Conținutul lecției: rând gol = paragraf nou, **bold**, „> ” = casetă de atenție, „- ” = listă. */
export type BodyBlock = { kind: 'p' | 'note' | 'list'; parts: { text: string; bold: boolean }[][] }

function inline(s: string) {
  const out: { text: string; bold: boolean }[] = []
  s.split(/(\*\*[^*]+\*\*)/g).forEach(chunk => {
    if (!chunk) return
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) out.push({ text: chunk.slice(2, -2), bold: true })
    else out.push({ text: chunk, bold: false })
  })
  return out
}

export function parseBody(body: string | null | undefined): BodyBlock[] {
  const blocks: BodyBlock[] = []
  String(body || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(raw => {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return
    if (lines.every(l => /^[-•]\s+/.test(l))) blocks.push({ kind: 'list', parts: lines.map(l => inline(l.replace(/^[-•]\s+/, ''))) })
    else if (lines[0].startsWith('>')) blocks.push({ kind: 'note', parts: [inline(lines.map(l => l.replace(/^>\s?/, '')).join(' '))] })
    else blocks.push({ kind: 'p', parts: [inline(lines.join(' '))] })
  })
  return blocks
}
