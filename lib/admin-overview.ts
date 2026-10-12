// Calcule pure pentru panoul de admin (fără bază de date) — testate separat.

/** Ultimele `n` luni, de la cea mai veche la luna curentă: [{ key: '2026-10', label: 'oct.' }] */
export function lastMonths(n: number, now = new Date()) {
  const out: { key: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('ro-RO', { month: 'short' }).replace('.', ''),
    })
  }
  return out
}

/** Adună valorile pe luni (după created_at). `value` lipsă = numără rândurile. */
export function sumByMonth<T extends { created_at?: string | null }>(
  rows: T[] | null | undefined,
  months: { key: string }[],
  value?: (r: T) => number,
) {
  const map = new Map(months.map(m => [m.key, 0]))
  for (const r of rows ?? []) {
    const k = String(r.created_at ?? '').slice(0, 7)
    if (!map.has(k)) continue
    const v = value ? Number(value(r)) : 1
    map.set(k, (map.get(k) || 0) + (Number.isFinite(v) ? v : 0))
  }
  return months.map(m => Math.round((map.get(m.key) || 0) * 100) / 100)
}

/** Diferența procentuală față de luna trecută (null dacă nu se poate calcula). */
export function changePct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Bani blocați pentru influenceri: bugetul fix rămas + prețurile propuse încă neplătite / nereturnate. */
export function heldForInfluencers(
  campaigns: { pay_reserved?: unknown; pay_released?: unknown; pay_refunded?: unknown }[] | null | undefined,
  collabs: { pay_reserved?: unknown; pay_refunded?: unknown; payment_amount?: unknown }[] | null | undefined,
) {
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  let held = 0
  for (const c of campaigns ?? []) held += Math.max(0, n(c.pay_reserved) - n(c.pay_released) - n(c.pay_refunded))
  for (const x of collabs ?? []) {
    if (n(x.pay_reserved) > 0 && n(x.payment_amount) <= 0 && n(x.pay_refunded) <= 0) held += n(x.pay_reserved)
  }
  return Math.round(held * 100) / 100
}
