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
 * Doar campaniile plătite și Managed cu sumă fixă; barter, open call, „de discutat” și „influencerii propun prețul” → 0.
 */
export function campaignPayPerSlot(c: { campaign_type?: string | null; payment_mode?: string | null; budget_per_influencer?: number | string | null } | null | undefined): number {
  if (!c || !['PAID', 'MANAGED'].includes(String(c.campaign_type || ''))) return 0
  if (c.payment_mode === 'NEGOTIABLE' || c.payment_mode === 'OFFER') return 0  // prețul se plătește la selecție (SQL 31)
  const v = Math.round(Number(c.budget_per_influencer) * 100) / 100
  return Number.isFinite(v) && v > 0 && v <= 100000 ? v : 0
}


/**
 * Banii unei campanii cu taxă de management, pentru pagina campaniei (brand):
 * taxa plătită, cât stă blocat pentru influenceri, cât s-a plătit și cât s-a returnat.
 * Include ambele moduri: sumă fixă (bugetul campaniei, SQL 29) și preț propus (pe colaborare, SQL 31).
 */
export function campaignMoney(
  c: {
    fee_paid?: number | string | null; fee_refunded?: number | string | null
    pay_reserved?: number | string | null; pay_released?: number | string | null; pay_refunded?: number | string | null
  } | null | undefined,
  collabs: { status?: string | null; payment_amount?: number | string | null; pay_reserved?: number | string | null; pay_refunded?: number | string | null }[] = [],
) {
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const fee = round2(n(c?.fee_paid) - n(c?.fee_refunded))
  const poolLeft = Math.max(0, n(c?.pay_reserved) - n(c?.pay_released) - n(c?.pay_refunded))
  let offersHeld = 0, offersRefunded = 0, paid = 0
  for (const x of collabs) {
    const own = n(x.pay_reserved), refunded = n(x.pay_refunded), amount = n(x.payment_amount)
    if (own > 0 && amount <= 0 && refunded <= 0) offersHeld += own
    offersRefunded += refunded
    if (x.status === 'COMPLETED') paid += amount
  }
  return {
    fee,
    held: round2(poolLeft + offersHeld),
    paid: round2(paid),
    refunded: round2(n(c?.fee_refunded) + n(c?.pay_refunded) + offersRefunded),
  }
}
