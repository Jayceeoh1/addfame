// Wallet-ul creatorului: cât urmează să primească din colaborări, ce a primit în produse (barter)
// și cum se afișează fiecare tranzacție. Funcții pure, folosite în pagina Wallet și testate separat.
import { campaignPayPerSlot } from '@/lib/fee-summary'

const OLD_COMMISSION = 0.15 // campaniile vechi (fără taxă de management) opresc 15% la plată

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const round2 = (v: number) => Math.round(v * 100) / 100

export function isBarterCampaign(c: any): boolean {
  return String(c?.campaign_type || '').toUpperCase() === 'BARTER'
}

/** Suma pe care creatorul o primește în wallet când i se aprobă postarea (0 = fără bani, ex. barter). */
export function expectedPay(collab: any): number {
  const camp = collab?.campaigns || {}
  if (isBarterCampaign(camp)) return 0
  if (n(collab?.reserved_amount) > 0) return round2(n(collab.reserved_amount))
  if (n(collab?.pay_reserved) > 0) return round2(n(collab.pay_reserved))
  if (['OFFER', 'NEGOTIABLE'].includes(String(camp.payment_mode || '')) && n(collab?.offer_price) > 0) return round2(n(collab.offer_price))
  const feeModel = camp.fee_per_influencer !== null && camp.fee_per_influencer !== undefined
  if (feeModel) return campaignPayPerSlot(camp)
  const budget = n(camp.budget_per_influencer)
  return budget > 0 ? round2(budget * (1 - OLD_COMMISSION)) : 0
}

export type UpcomingItem = { id: string; title: string; brand: string; amount: number; since: string | null }
export type BarterItem = { id: string; product: string; brand: string; value: number; image: string | null; done: boolean; at: string | null }

/** Banii care urmează (colaborări active plătite) și produsele primite / pe drum (barter). */
export function walletFromCollabs(collabs: any[]): { upcoming: UpcomingItem[]; upcomingTotal: number; barter: BarterItem[]; barterValue: number } {
  const upcoming: UpcomingItem[] = []
  const barter: BarterItem[] = []
  for (const c of collabs || []) {
    const camp = c?.campaigns || {}
    const title = String(camp.title || 'Campanie').replace(/^\[Barter\]\s*/i, '')
    const brand = String(camp.brand_name || '')
    if (isBarterCampaign(camp)) {
      if (!['ACTIVE', 'COMPLETED'].includes(c.status)) continue
      barter.push({
        id: c.id, product: String(camp.offer_name || camp.product_name || title), brand,
        value: round2(n(camp.offer_value)), image: camp.offer_image_url || (Array.isArray(camp.offer_images) ? camp.offer_images[0] : null) || null,
        done: c.status === 'COMPLETED', at: c.completed_at || c.approved_at || c.created_at || null,
      })
      continue
    }
    if (c.status !== 'ACTIVE') continue
    const amount = expectedPay(c)
    if (amount > 0) upcoming.push({ id: c.id, title, brand, amount, since: c.approved_at || c.created_at || null })
  }
  barter.sort((a, b) => Number(b.done) - Number(a.done) || String(b.at || '').localeCompare(String(a.at || '')))
  return {
    upcoming,
    upcomingTotal: round2(upcoming.reduce((s, x) => s + x.amount, 0)),
    barter,
    barterValue: round2(barter.filter(b => b.done).reduce((s, b) => s + b.value, 0)),
  }
}

const OUT_TYPES = new Set(['PAYOUT', 'WITHDRAWAL', 'PENALTY', 'FEE'])
const TX_LABEL: Record<string, string> = {
  EARN: 'Plată campanie', REFERRAL_BONUS: 'Bonus recomandare', BONUS: 'Bonus', REFUND: 'Rambursare',
  PAYOUT: 'Retragere', WITHDRAWAL: 'Retragere', PENALTY: 'Penalizare', FEE: 'Taxă', BADGE_PENDING: 'Badge',
}

/** Cum se afișează o tranzacție: intrare (+) sau ieșire (−) și eticheta ei. */
export function txView(tx: { type?: string | null; amount?: number | string | null }) {
  const type = String(tx?.type || '').toUpperCase()
  const out = OUT_TYPES.has(type) || n(tx?.amount) < 0
  return { out, label: TX_LABEL[type] || (out ? 'Ieșire' : 'Intrare'), amount: Math.abs(n(tx?.amount)) }
}
