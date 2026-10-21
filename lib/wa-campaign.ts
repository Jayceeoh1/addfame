// Anunțuri de campanie pe WhatsApp (Twilio): cine poate primi și textul variabilelor din șablon. Funcții pure.
import { normalizePhone } from '@/lib/whatsapp'

export type WaCandidate = { id: string; name?: string | null; phone?: string | null; settings?: any }

/** A spus „da” la anunțuri pe WhatsApp (din dashboard sau din Setări → Notificări). */
export function waOptedIn(c: Pick<WaCandidate, 'settings'>): boolean {
  return c?.settings?.notifications?.whatsapp_campaigns === true
}

/** Doar mobil românesc valid (+407xxxxxxxx). */
export function waPhone(phone: unknown): string | null {
  const p = normalizePhone(String(phone ?? ''))
  return p && /^\+407\d{8}$/.test(p) ? p : null
}

export function firstName(name: unknown): string {
  const n = String(name ?? '').replace(/[@#]\S+/g, '').trim().split(/\s+/)[0] || ''
  return n.length > 1 ? n.charAt(0).toUpperCase() + n.slice(1) : 'salut'
}

/** Cei care pot primi anunțul pentru o campanie: au acceptat, au mobil valid, n-au aplicat, n-au primit deja. */
export function waAudience(cands: WaCandidate[], applied: Set<string>, alreadySent: Set<string>, everyone = false) {
  const out: { id: string; phone: string; first: string }[] = []
  const phones = new Set<string>()
  // „everyone”: și cei care n-au răspuns, dar nu cei care au refuzat explicit; cei cu acord rămân primii.
  const ordered = everyone ? [...cands.filter(waOptedIn), ...cands.filter(c => !waOptedIn(c))] : cands
  for (const c of ordered) {
    if (everyone ? c?.settings?.notifications?.whatsapp_campaigns === false : !waOptedIn(c)) continue
    if (applied.has(c.id) || alreadySent.has(c.id)) continue
    const phone = waPhone(c.phone)
    if (!phone || phones.has(phone)) continue
    phones.add(phone)
    out.push({ id: c.id, phone, first: firstName(c.name) })
  }
  return out
}

/** Variabilele șablonului Twilio: {{1}} prenume, {{2}} numele campaniei, {{3}} id-ul campaniei (în linkul butonului). */
export function waVars(first: string, campaignName: string, campaignId: string): Record<string, string> {
  return { '1': first, '2': campaignName.slice(0, 120), '3': campaignId }
}

// ─── Reminder „se închid înscrierile” + limita anti-spam ────────────────────────
/** Pauza minimă între două mesaje de campanie către același om (anunț sau reminder, orice campanie). */
export const WA_MIN_GAP_HOURS = 48

/** Reminder: doar cei care au primit anunțul, n-au aplicat, n-au primit deja reminder, au încă acordul. */
export function waReminderAudience(cands: WaCandidate[], applied: Set<string>, announced: Set<string>, reminded: Set<string>, recent: Set<string> = new Set(), everyone = false) {
  return waAudience(cands.filter(c => announced.has(c.id) && !reminded.has(c.id)), applied, recent, everyone)
}

/** „5 ore”, „1 oră”, „2 zile”, „40 de minute” — pentru variabila din șablonul de reminder. */
export function timeLeftLabel(ms: number): string | null {
  if (!(ms > 0)) return null
  const h = Math.floor(ms / 3_600_000)
  if (h >= 48) { const d = Math.floor(h / 24); return `${d} ${d === 1 ? 'zi' : d < 20 ? 'zile' : 'de zile'}` }
  if (h >= 1) return `${h} ${h === 1 ? 'oră' : h < 20 ? 'ore' : 'de ore'}`
  const m = Math.max(1, Math.floor(ms / 60_000))
  return `${m} ${m === 1 ? 'minut' : m < 20 ? 'minute' : 'de minute'}`
}

export function waReminderVars(first: string, campaignName: string, left: string, campaignId: string): Record<string, string> {
  return { '1': first, '2': campaignName.slice(0, 120), '3': left, '4': campaignId }
}
