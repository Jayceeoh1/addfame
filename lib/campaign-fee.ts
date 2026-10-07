// Taxa per influencer — logică internă de server.
// ATENȚIE: fără 'use server' — funcțiile de aici NU sunt endpoint-uri publice.
// Se apelează doar din acțiuni de server care au verificat deja utilizatorul.

import { logDbError } from '@/lib/log-error'
import { createAdminClient } from '@/lib/supabase/admin'

export const DEFAULT_INFLUENCER_FEE = 350
export const MAX_FEE_SLOTS = 500

/** Prețul curent per influencer (RON), setat din Admin → Setări. */
export async function getInfluencerFeePrice(): Promise<number> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'influencer_fee')
      .maybeSingle()
    const price = Number((data?.value as any)?.price)
    return Number.isFinite(price) && price >= 0 ? price : DEFAULT_INFLUENCER_FEE
  } catch {
    return DEFAULT_INFLUENCER_FEE
  }
}

/** O campanie e pe modelul nou (taxă per influencer, fără escrow) dacă are taxa setată. */
export function isFeeModelCampaign(c: { fee_per_influencer?: number | null } | null | undefined): boolean {
  return c?.fee_per_influencer !== null && c?.fee_per_influencer !== undefined
}

export type ChargeResult = {
  ok: boolean
  total?: number
  balance?: number
  price?: number
  slots?: number
  error?: string
  insufficientFunds?: boolean
  available?: number
  required?: number
}

/**
 * Încasează slots × preț din creditele brandului și trimite campania spre aprobare.
 * Atomic în baza de date (charge_campaign_fee): fie se întâmplă tot, fie nimic.
 */
export async function chargeCampaignFee(campaignId: string, brandId: string, slots: number): Promise<ChargeResult> {
  const n = Math.floor(Number(slots))
  if (!Number.isFinite(n) || n < 1 || n > MAX_FEE_SLOTS) {
    return { ok: false, error: `Numărul de influenceri trebuie să fie între 1 și ${MAX_FEE_SLOTS}.` }
  }
  const price = await getInfluencerFeePrice()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('charge_campaign_fee', {
    p_campaign_id: campaignId,
    p_brand_id: brandId,
    p_slots: n,
    p_fee: price,
  })
  if (error) await logDbError('charge_campaign_fee', error, { campaignId, slots: n })
  if (error) return { ok: false, error: 'Eroare la procesarea plății: ' + error.message, price, slots: n }

  const r = data as any
  if (!r?.ok) {
    if (r?.error === 'insufficient_funds') {
      return {
        ok: false,
        insufficientFunds: true,
        available: Number(r.available) || 0,
        required: Number(r.required) || n * price,
        price, slots: n,
        error: `Sold insuficient. Ai ${(Number(r.available) || 0).toFixed(2)} RON disponibili, iar campania necesită ${(Number(r.required) || n * price).toFixed(2)} RON (${n} × ${price} RON). Campania a rămas salvată ca draft.`,
      }
    }
    if (r?.error === 'invalid_status') return { ok: false, error: 'Campania a fost deja trimisă spre aprobare.', price, slots: n }
    if (r?.error === 'not_found') return { ok: false, error: 'Campania nu a fost găsită.', price, slots: n }
    return { ok: false, error: 'Nu s-a putut publica campania.', price, slots: n }
  }

  // Venit platformă (pentru raportul de venituri) — nu blochează publicarea
  try {
    await admin.from('platform_revenue').insert({
      amount: Number(r.total) || 0,
      type: 'campaign_fee',
      description: `Taxă campanie (${n} influenceri × ${price} RON)`,
    })
  } catch (_) { }

  return { ok: true, total: Number(r.total) || 0, balance: Number(r.balance) || 0, price, slots: n }
}

/**
 * Decontare finală a taxei (o singură dată per publicare — garantat în baza de date).
 * Brandul rămâne plătit pentru locurile folosite, restul se returnează în credite.
 *   used = null → locurile selectate vreodată (contor care nu scade)
 *   used = 0    → retur integral (respingere înainte de aprobare)
 */
export async function settleCampaignFee(campaignId: string, used: number | null, reason: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('settle_campaign_fee', {
    p_campaign_id: campaignId,
    p_used: used === null ? null : Math.max(0, Math.floor(used)),
    p_reason: reason,
  })
  if (error) {
    console.error('[settleCampaignFee]', campaignId, error.message)
    return 0
  }
  const refunded = Number((data as any)?.refunded) || 0
  if (refunded > 0) {
    try {
      await admin.from('platform_revenue').insert({
        amount: -refunded, type: 'campaign_fee_refund', description: reason,
      })
    } catch (_) { }
  }
  return refunded
}

async function notifyBrandRefund(brandId: string, title: string, body: string) {
  const admin = createAdminClient()
  const { data: brand } = await admin.from('brands').select('user_id').eq('id', brandId).maybeSingle()
  if (brand?.user_id) {
    await admin.from('notifications').insert({ user_id: brand.user_id, title, body, link: '/brand/wallet', read: false })
  }
}

/** Respingere înainte de aprobare: returnează integral taxa. */
export async function refundRejectedCampaign(campaignId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: camp } = await admin
    .from('campaigns').select('id, title, brand_id, fee_per_influencer').eq('id', campaignId).maybeSingle()
  if (!camp || !isFeeModelCampaign(camp)) return 0
  const refunded = await settleCampaignFee(campaignId, 0, `Retur integral taxă — campania "${camp.title}" nu a fost aprobată`)
  if (refunded > 0) {
    await notifyBrandRefund(camp.brand_id, '💰 Taxa campaniei a fost returnată',
      `Campania "${camp.title}" nu a fost aprobată. ${refunded.toFixed(2)} RON au fost returnați în wallet. O poți modifica și trimite din nou.`)
  }
  return refunded
}

/**
 * La închiderea campaniei (expirare, închidere de admin, ștergere de admin):
 * returnează taxa pentru locurile nefolosite. Se face o singură dată.
 * Open Call: înscrierile nu trec prin colaborări, deci locurile plătite nu se returnează.
 */
export async function refundUnusedSlots(campaignId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: camp } = await admin
    .from('campaigns')
    .select('id, title, brand_id, campaign_type, fee_per_influencer, fee_slots, fee_slots_used')
    .eq('id', campaignId)
    .maybeSingle()
  if (!camp || !isFeeModelCampaign(camp) || !camp.fee_slots) return 0

  const isOpenCall = camp.campaign_type === 'OPEN_CALL'
  const used = isOpenCall ? camp.fee_slots : Math.min(camp.fee_slots_used || 0, camp.fee_slots)
  const refunded = await settleCampaignFee(
    campaignId, isOpenCall ? camp.fee_slots : null,
    `Retur taxă — ${camp.fee_slots - used} din ${camp.fee_slots} locuri nefolosite în campania "${camp.title}"`,
  )

  if (refunded > 0) {
    await notifyBrandRefund(camp.brand_id, '💰 Taxă returnată pentru locurile nefolosite',
      `Campania "${camp.title}" s-a încheiat cu ${used} din ${camp.fee_slots} influenceri. ${refunded.toFixed(2)} RON au fost returnați în wallet.`)
  }
  return refunded
}

/** Câți influenceri sunt deja selectați (ACTIVE sau COMPLETED) — numărătoare reală, nu contorul din campanie. */
export async function countSelectedInfluencers(campaignId: string): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('collaborations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['ACTIVE', 'COMPLETED'])
  return count ?? 0
}
