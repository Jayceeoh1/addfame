// Drepturile de utilizare a clipurilor, calculate din contractele de cesiune semnate.
//   v1 (cesiune 6 luni): toate drepturile expiră după 6 luni.
//   v2 (cesiune definitivă): folosire organică fără limită; reclame plătite (ads) 6 luni.

export const ADS_MONTHS = 6
export const ADS_REMINDER_DAYS = 30

export type RightsState = 'ads' | 'organic' | 'expired'

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime())
  const day = r.getUTCDate()
  r.setUTCDate(1)
  r.setUTCMonth(r.getUTCMonth() + months)
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate()
  r.setUTCDate(Math.min(day, last))
  return r
}

export interface RightsInfo {
  version: number
  signedAt: string
  adsUntil: string          // până când pot rula reclame plătite
  organicUntil: string | null // null = fără limită
  state: RightsState
  daysLeftAds: number       // zile rămase pentru ads (0 dacă au expirat)
}

export function rightsFor(c: { signed_at: string; clauses_version?: number | null }, now = new Date()): RightsInfo {
  const version = (c.clauses_version ?? 1) >= 2 ? 2 : 1
  const signed = new Date(c.signed_at)
  const adsUntil = addMonths(signed, ADS_MONTHS)
  const organicUntil = version === 2 ? null : adsUntil
  const daysLeftAds = Math.max(0, Math.ceil((adsUntil.getTime() - now.getTime()) / 86400000))
  const state: RightsState = now < adsUntil ? 'ads' : version === 2 ? 'organic' : 'expired'
  return { version, signedAt: signed.toISOString(), adsUntil: adsUntil.toISOString(), organicUntil: organicUntil?.toISOString() ?? null, state, daysLeftAds }
}

export const RIGHTS_LABEL: Record<RightsState, string> = {
  ads: 'Reclame plătite permise',
  organic: 'Doar folosire organică',
  expired: 'Drepturi expirate',
}

/** Datele creatorului ascunse în PDF-ul contractului trimis în afara AddFame. */
export function redactContract<T extends Record<string, any>>(c: T): T {
  return {
    ...c,
    influencer_cnp: null, influencer_ci_serie: null, influencer_ci_numar: null,
    influencer_address: null, influencer_phone: null, influencer_email: null, signer_ip: null,
  }
}
