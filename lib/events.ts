// Evenimente AddFame (pagina publică /evenimente): tipuri și funcții pure, fără acces la baza de date.

export type SiteEvent = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  starts_at: string | null
  location: string | null
  city: string | null
  description: string | null
  signup_url: string | null
  cover_photo_id: string | null
  summary?: string | null
  story?: string | null
  creators_count?: number | null
  brands_count?: number | null
}

export type SiteEventPhoto = {
  id: string
  event_id: string
  path: string
  caption: string | null
  position: number
  created_at?: string
}

export const EVENT_BUCKET = 'evenimente'

/** Eveniment viitor = publicat și cu dată care încă nu a trecut. */
export function isUpcoming(e: Pick<SiteEvent, 'status' | 'starts_at'>, now: Date = new Date()): boolean {
  return e.status === 'published' && !!e.starts_at && new Date(e.starts_at).getTime() >= now.getTime()
}

/** Împarte evenimentele publicate: următorul (cel mai apropiat) și cele trecute (cele mai recente primele). */
export function splitEvents<T extends Pick<SiteEvent, 'status' | 'starts_at'>>(events: T[], now: Date = new Date()) {
  const published = events.filter(e => e.status === 'published')
  const time = (e: T) => (e.starts_at ? new Date(e.starts_at).getTime() : 0)
  const upcoming = published.filter(e => isUpcoming(e, now)).sort((a, b) => time(a) - time(b))
  const past = published.filter(e => !isUpcoming(e, now)).sort((a, b) => time(b) - time(a))
  return { next: upcoming[0] || null, upcoming, past }
}

/** „12 octombrie 2026, 18:00” în ora României; fără oră dacă e exact miezul nopții. */
export function formatEventDate(iso: string | null, withTime = true): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }).format(d)
  if (!withTime) return date
  const time = new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Bucharest' }).format(d)
  return time === '00:00' ? date : `${date}, ${time}`
}

/** Valoarea unui <input type="datetime-local"> (ora României) → ISO UTC. */
export function localInputToIso(v: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec((v || '').trim())
  if (!m) return null
  const [, y, mo, da, h = '00', mi = '00'] = m
  // aflăm decalajul României la acea dată (EET/EEST) fără biblioteci
  const guess = Date.UTC(+y, +mo - 1, +da, +h, +mi)
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bucharest', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))
    const g = (k: string) => Number(parts.find(p => p.type === k)?.value)
    const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'))
    return asUtc - t
  }
  let t = guess - offsetAt(guess)
  t = guess - offsetAt(t)
  const out = new Date(t)
  return Number.isNaN(out.getTime()) ? null : out.toISOString()
}

/** ISO UTC → valoare pentru <input type="datetime-local"> în ora României. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d)
  const g = (k: string) => parts.find(p => p.type === k)?.value || ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`
}

/** Adresă publică a unei poze din bucket-ul „evenimente”. */
export function photoUrl(path: string, base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): string {
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${EVENT_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Adaugă https:// dacă lipsește și acceptă doar http(s). */
export function cleanUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null
  let s = v.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch { return null }
}

/** Slug din titlu: „Seara AddFame 2026” → „seara-addfame-2026”. */
export function slugify(title: string): string {
  return title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

/** Clasele de mărime ale mozaicului, în ciclu de 8: două plăci late și înalte, restul normale. */
export function tileClass(i: number): string {
  return ['ev-wide ev-tall', '', '', 'ev-wide', 'ev-tall', '', '', 'ev-wide'][i % 8]
}

/** Poza de copertă: cea aleasă, altfel prima din eveniment. */
export function coverOf(event: Pick<SiteEvent, 'cover_photo_id'>, photos: SiteEventPhoto[]): SiteEventPhoto | null {
  return photos.find(p => p.id === event.cover_photo_id) || photos[0] || null
}

// ─── Povestea evenimentului ──────────────────────────────────────────────────
// Adminul scrie textul simplu:  paragrafe separate prin rând gol · „## Subtitlu” · „> Citat — Nume, rol” ·
// „[foto 1]”, „[foto 2 3]” = pozele cu numerele din galeria evenimentului (cum apar în Admin).
export type StoryBlock =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'quote'; text: string; by: string | null }
  | { t: 'photos'; nums: number[] }

export function parseStory(raw: string | null | undefined): StoryBlock[] {
  const chunks = String(raw || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(c => c.trim()).filter(Boolean)
  const out: StoryBlock[] = []
  for (const c of chunks) {
    const photos = /^\[\s*fot[oi]\s+([\d\s,]+)\]$/i.exec(c)
    if (photos) {
      const nums = photos[1].split(/[\s,]+/).map(Number).filter(n => Number.isInteger(n) && n >= 1).slice(0, 8)
      if (nums.length) out.push({ t: 'photos', nums })
      continue
    }
    if (c.startsWith('## ')) { out.push({ t: 'h', text: c.slice(3).trim() }); continue }
    if (c.startsWith('>')) {
      const body = c.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ').trim()
      const i = body.lastIndexOf(' — ')
      const text = (i > 0 ? body.slice(0, i) : body).replace(/^[„"“]\s*/, '').replace(/\s*[”"“]$/, '').trim()
      const by = i > 0 ? body.slice(i + 3).trim() || null : null
      if (text) out.push({ t: 'quote', text, by })
      continue
    }
    out.push({ t: 'p', text: c })
  }
  return out
}

/** Întreg pozitiv sau null (pentru cifrele evenimentului). */
export function cleanCount(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null
}
