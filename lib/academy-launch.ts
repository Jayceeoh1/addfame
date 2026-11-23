// Oferta de lansare AddFame Academy: primii 50 de membri plătesc 125 lei prima lună (apoi 200 lei/lună).
// Locurile le numără Stripe: un cupon „o singură dată”, cu reducere fixă și maximum 50 de folosiri.
// Doar pe server. Oprire: ACADEMY_LAUNCH_OFF=1.
import Stripe from 'stripe'
import { ACADEMY_PRICE_RON, ACADEMY_LAUNCH_PRICE_RON, ACADEMY_LAUNCH_SPOTS, ACADEMY_LAUNCH_ENDS_AT } from '@/lib/academy-member'

const COUPON_ID = 'ACADEMY_LAUNCH_125'
let cache: { at: number; left: number } | null = null

export type LaunchOffer = { couponId: string; left: number; total: number; firstMonth: number; endsAt: string }

function stripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' }) }

/** Oferta, dacă mai sunt locuri (null dacă s-au terminat, e oprită sau Stripe nu răspunde). */
export async function getLaunchOffer(opts: { fresh?: boolean } = {}): Promise<LaunchOffer | null> {
  if (process.env.ACADEMY_LAUNCH_OFF === '1') return null
  if (Date.now() > new Date(ACADEMY_LAUNCH_ENDS_AT).getTime()) return null
  if (!opts.fresh && cache && Date.now() - cache.at < 60_000) {
    return cache.left > 0 ? { couponId: COUPON_ID, left: cache.left, total: ACADEMY_LAUNCH_SPOTS, firstMonth: ACADEMY_LAUNCH_PRICE_RON, endsAt: ACADEMY_LAUNCH_ENDS_AT } : null
  }
  try {
    const s = stripe()
    let c: Stripe.Coupon
    try {
      c = await s.coupons.retrieve(COUPON_ID)
    } catch (e: any) {
      if (e?.statusCode !== 404 && e?.code !== 'resource_missing') throw e
      c = await s.coupons.create({
        id: COUPON_ID,
        name: `Ofertă de lansare: prima lună ${ACADEMY_LAUNCH_PRICE_RON} lei`,
        amount_off: (ACADEMY_PRICE_RON - ACADEMY_LAUNCH_PRICE_RON) * 100,
        currency: 'ron',
        duration: 'once',
        max_redemptions: ACADEMY_LAUNCH_SPOTS,
      })
    }
    const left = c.valid ? Math.max(0, (c.max_redemptions ?? ACADEMY_LAUNCH_SPOTS) - (c.times_redeemed || 0)) : 0
    cache = { at: Date.now(), left }
    return left > 0 ? { couponId: COUPON_ID, left, total: c.max_redemptions ?? ACADEMY_LAUNCH_SPOTS, firstMonth: ACADEMY_LAUNCH_PRICE_RON, endsAt: ACADEMY_LAUNCH_ENDS_AT } : null
  } catch (e: any) {
    console.error('[academy-launch]', e?.message)
    return null
  }
}
