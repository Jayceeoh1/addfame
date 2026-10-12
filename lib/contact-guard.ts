// Detectează în mesajele din chat încercările de a muta discuția sau plata în afara AddFame
// (telefon, email, WhatsApp/Telegram, „în privat”, „plată direct”).
// Aceleași reguli există și în baza de date (af_contact_reasons, SQL 30), care semnalează mesajul pentru admin
// chiar dacă cineva ocolește avertismentul din browser. Țineți cele două liste la fel (testul verifică).

export type ContactReason = 'telefon' | 'email' | 'aplicatie' | 'privat' | 'plata'

export const CONTACT_REASON_LABEL: Record<ContactReason, string> = {
  telefon: 'un număr de telefon',
  email: 'o adresă de email',
  aplicatie: 'o aplicație externă (WhatsApp, Telegram etc.)',
  privat: 'mutarea discuției în privat',
  plata: 'o plată în afara platformei',
}

// Pattern-uri scrise o singură dată și folosite identic în SQL 30 (‹ = început de cuvânt, › = sfârșit de cuvânt).
// Textul e mai întâi trecut la litere mici; diacriticele contează ca litere (de-asta nu folosim \b).
const W = 'a-z0-9ăâîșşțţ'
const S = `(?:^|[^${W}])`
const E = `(?=$|[^${W}])`
export const CONTACT_PATTERNS = {
  /** se aplică pe textul fără spații, puncte, cratime, paranteze */
  telefon: '(\\+?40|0040|0)7[0-9]{8}|0[23][0-9]{8}|\\+[0-9]{10,14}',
  email: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}|‹(gmail|yahoo|outlook|hotmail|icloud)›',
  aplicatie: '‹(whats ?app|wapp|wa\\.me|telegram|t\\.me|signal|viber|messenger|m\\.me|ig\\.me)›',
  privat: '‹(pe|în|in) (privat|dm|pm)›|‹num[ăa]r(ul)? (de telefon|t[ăa]u)›|‹nr\\.? ?(de )?(tel|telefon)›|‹sun[ăa]-?m[ăa]›|‹d[ăa]-?mi (num[ăa]rul|nr|mail|email)›|‹scrie-?mi pe (insta|instagram|facebook|fb|tiktok|mail|email)›',
  plata: '‹(pl[ăa]t[ăa]|pl[ăa]tesc|pl[ăa]te[șs]te|pl[ăa]te[șs]ti|bani|banii) (direct|cash|[îi]n m[âa]n[ăa])›|‹(f[ăa]r[ăa]|[îi]n afara) (platform|addfame)',
} as const

/** Forma finală a unui pattern (‹ = început de cuvânt, › = sfârșit) — aceeași în JS și în Postgres. */
export function expandPattern(p: string): string {
  return p.replace(/‹/g, S).replace(/›/g, E)
}

const RX = Object.fromEntries(
  Object.entries(CONTACT_PATTERNS).map(([k, v]) => [k, new RegExp(expandPattern(v))]),
) as Record<ContactReason, RegExp>

/** Motivele pentru care un mesaj pare să mute discuția în afara platformei (gol = în regulă). */
export function contactReasons(text: string | null | undefined): ContactReason[] {
  const raw = String(text || '')
  if (!raw.trim()) return []
  const lower = raw.toLowerCase()
  const compact = lower.replace(/[\s.\-()/_]/g, '')
  const out: ContactReason[] = []
  if (RX.telefon.test(compact)) out.push('telefon')
  for (const k of ['email', 'aplicatie', 'privat', 'plata'] as const) if (RX[k].test(lower)) out.push(k)
  return out
}
