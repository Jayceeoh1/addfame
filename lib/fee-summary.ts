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
  return { slots: n, feeTotal, payTotal, grandTotal }
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}
