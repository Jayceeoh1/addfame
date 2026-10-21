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
export function waAudience(cands: WaCandidate[], applied: Set<string>, alreadySent: Set<string>) {
  const out: { id: string; phone: string; first: string }[] = []
  const phones = new Set<string>()
  for (const c of cands) {
    if (!waOptedIn(c) || applied.has(c.id) || alreadySent.has(c.id)) continue
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
