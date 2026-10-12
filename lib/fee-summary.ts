// Calculul afișat brandului la crearea campaniei: plata influencerilor + taxa de management AddFame.
// Funcție pură (fără bază de date), folosită de FeeSummary și testată separat.

export function feeBreakdown({ slots, price, payPerInfluencer, payNegotiable = false }: {
  slots: number
  price: number | null
  payPerInfluencer?: number | null
  payNegotiable?: boolean
}) {
  const n = Math.max(1, Math.floor(Number(slots) || 1))
  const feeTotal = price === null || !Number.isFinite(price) ? null : round2(n * price)
  const pay = Number(payPerInfluencer)
  const payTotal = !payNegotiable && payPerInfluencer !== undefined && payPerInfluencer !== null && Number.isFinite(pay) && pay > 0
    ? round2(n * pay) : null
  const grandTotal = feeTotal !== null && payTotal !== null ? round2(feeTotal + payTotal) : null
  // La publicare se plătește tot: taxa + bugetul influencerilor (blocat până la aprobarea postărilor)
  const payNow = feeTotal === null ? null : round2(feeTotal + (payTotal || 0))
  return { slots: n, feeTotal, payTotal, grandTotal, payNow }
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

/**
 * Suma per influencer care trece prin AddFame (blocată la publicare, plătită la aprobarea postării).
 * Doar campaniile plătite și Managed cu sumă fixă; barter, open call și „de discutat” → 0.
 */
export function campaignPayPerSlot(c: { campaign_type?: string | null; payment_mode?: string | null; budget_per_influencer?: number | string | null } | null | undefined): number {
  if (!c || !['PAID', 'MANAGED'].includes(String(c.campaign_type || ''))) return 0
  if (c.payment_mode === 'NEGOTIABLE') return 0
  const v = Math.round(Number(c.budget_per_influencer) * 100) / 100
  return Number.isFinite(v) && v > 0 && v <= 100000 ? v : 0
}

