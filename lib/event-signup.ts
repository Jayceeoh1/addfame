// Înscrieri la evenimente (campanii Open Call): validarea formularului „Vreau să vin” și ce vede fiecare parte.
// Funcții pure, testate separat. (lib/events.ts e pentru galeria publică /evenimente.)

import { contactReasons, CONTACT_REASON_LABEL } from '@/lib/contact-guard'
import { sanitizeBioForBrand } from '@/lib/brand-safe'

export type EventForm = {
  full_name: string
  phone: string
  city: string
  address: string
  instagram?: string
  message?: string
}

export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  pending: 'În așteptare',
  approved: 'Aprobat',
  rejected: 'Respins',
  cancelled: 'Anulat',
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

/** Telefon: +40 7xx xxx xxx, 07xx..., sau internațional. Întoarce forma fără spații sau null. */
export function normalizePhone(v: unknown): string | null {
  const s = String(v ?? '').replace(/[\s().\-/]/g, '')
  if (!/^\+?\d{9,15}$/.test(s)) return null
  return s
}

/** Instagram: acceptă @nume, nume sau link instagram.com/nume. '' = necompletat, null = invalid. */
export function normalizeInstagram(v: unknown): string | null {
  let s = String(v ?? '').trim()
  if (!s) return ''
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : null
}

export type EventFormErrors = Partial<Record<keyof EventForm, string>>

/** Verifică formularul. Întoarce datele curățate sau erorile pe câmp. */
export function validateEventForm(input: Partial<Record<keyof EventForm, unknown>>):
  { ok: boolean; data?: Required<EventForm>; errors?: EventFormErrors } {
  const errors: EventFormErrors = {}
  const full_name = clean(input.full_name, 80)
  const city = clean(input.city, 60)
  const address = clean(input.address, 200)
  const message = String(input.message ?? '').trim().slice(0, 600)
  const phone = normalizePhone(input.phone)
  const instagram = normalizeInstagram(input.instagram)

  if (full_name.length < 3 || !/\s/.test(full_name)) errors.full_name = 'Scrie numele și prenumele.'
  if (!phone) errors.phone = 'Număr de telefon invalid (ex. 0722 123 456).'
  if (city.length < 2) errors.city = 'Scrie orașul.'
  if (address.length < 5) errors.address = 'Scrie adresa (stradă, număr, localitate).'
  if (instagram === null) errors.instagram = 'Contul de Instagram nu pare valid.'
  const reasons = contactReasons(message)
  if (reasons.length) {
    errors.message = `Mesajul nu poate conține ${reasons.map(r => CONTACT_REASON_LABEL[r]).join(', ')}. Datele de contact rămân în AddFame.`
  }

  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, data: { full_name, phone: phone!, city, address, instagram: instagram || '', message } }
}

/** Ce vede brandul despre o înscriere: fără telefon, adresă sau conturi sociale (regula platformei). */
export function toBrandEventApplication(row: Record<string, any>) {
  return {
    id: row.id as string,
    influencer_id: row.influencer_id as string,
    full_name: row.full_name as string,
    city: (row.city ?? null) as string | null,
    message: sanitizeBioForBrand(row.message),
    status: row.status as EventStatus,
    invited: !!row.invited,
    entry_code: row.status === 'approved' ? (row.entry_code ?? null) as string | null : null,
    created_at: row.created_at as string,
    decided_at: (row.decided_at ?? null) as string | null,
  }
}

/** Lista invitaților pentru intrare (CSV): nume, oraș, cod. Fără date de contact. */
export function guestListCsv(rows: { full_name: string; city?: string | null; entry_code?: string | null; status: string }[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.filter(r => r.status === 'approved')
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ro'))
    .map(r => [esc(r.full_name), esc(r.city), esc(r.entry_code)].join(','))
  return ['Nume,Oraș,Cod intrare', ...lines].join('\n')
}

/** Număr de locuri: taxa plătită (fee_slots), altfel max_influencers; null = nelimitat. */
export function eventSlotLimit(c: { fee_slots?: number | null; max_influencers?: number | null } | null | undefined): number | null {
  const a = Number(c?.fee_slots) || 0
  const b = Number(c?.max_influencers) || 0
  return a > 0 ? a : b > 0 ? b : null
}

/** Se mai poate aplica? (activ și termenul nu a trecut — termenul e valabil toată ziua respectivă) */
export function eventOpen(c: { status?: string | null; application_deadline?: string | null } | null | undefined, now = new Date()) {
  if (!c || c.status !== 'ACTIVE') return false
  if (!c.application_deadline) return true
  const end = new Date(c.application_deadline)
  end.setHours(23, 59, 59, 999)
  return end.getTime() >= now.getTime()
}
