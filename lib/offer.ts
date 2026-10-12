// Campanii „Influencerii propun prețul” (payment_mode = 'OFFER') — funcții pure, fără bază de date.

export const OFFER_MIN = 1
export const OFFER_MAX = 100000

export function isOfferCampaign(c: { payment_mode?: string | null } | null | undefined): boolean {
  return c?.payment_mode === 'OFFER'
}

/** Prețul propus de influencer: număr între 1 și 100.000 RON, rotunjit la bani; altfel null. Acceptă „350”, „350,50”, „1.200”. */
export function parseOfferPrice(v: unknown): number | null {
  if (v === null || v === undefined) return null
  let s = String(v).trim().replace(/\s|ron|lei/gi, '')
  if (!s) return null
  // „1.200” / „1.200,50” → mii cu punct; „350,5” → zecimale cu virgulă
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const n = Math.round(Number(s) * 100) / 100
  return Number.isFinite(n) && n >= OFFER_MIN && n <= OFFER_MAX ? n : null
}

/**
 * Calculatorul de buget din wizard (cifrele nu se salvează și nu le văd influencerii):
 * câte locuri încap într-un buget total, știind taxa per loc și prețul estimat al unui influencer.
 */
export function recommendSlots(totalBudget: number, feePerSlot: number, estimatePerInfluencer: number): number {
  const total = Number(totalBudget), fee = Number(feePerSlot), est = Number(estimatePerInfluencer)
  if (!(total > 0) || !(fee >= 0) || !(est >= 0) || fee + est <= 0) return 0
  return Math.max(0, Math.floor((total + 1e-9) / (fee + est)))
}
