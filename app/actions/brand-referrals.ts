'use server'

// Acțiuni publice (apelabile din browser) pentru brand referrals.
// Fiecare verifică cine o apelează. Logica internă (înregistrare brand,
// bonus prima campanie) e în lib/brand-referrals-internal.ts și NU e expusă.

import { createClient as createServerClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import {
  BRAND_REFERRAL_BONUS1,
  brandReferralAdminClient,
} from '@/lib/brand-referrals-internal'

/**
 * Admin: aprobă manual bonus1 (50 RON) după verificarea brandului
 * (CUI valid, email firmă, telefon, website real).
 * Sigur la dublu-click: bonus1 se marchează atomic înainte de plată.
 */
export async function approveBrandReferralBonus1(referralId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth

  const admin = brandReferralAdminClient()

  const { data: referral, error } = await admin
    .from('brand_referrals')
    .select('id, influencer_id, status, bonus1_paid_at')
    .eq('id', referralId)
    .maybeSingle()

  if (error || !referral) return { error: 'Referral negăsit' }
  if (referral.bonus1_paid_at) return { error: 'Bonus1 deja plătit' }

  // Marcare atomică — doar un singur apel trece
  const { data: claimed } = await admin
    .from('brand_referrals')
    .update({ bonus1_paid_at: new Date().toISOString() })
    .eq('id', referralId)
    .is('bonus1_paid_at', null)
    .select('id')

  if (!claimed || claimed.length === 0) return { error: 'Bonus1 deja plătit' }

  const { error: payError } = await admin.rpc('pay_brand_referral_bonus', {
    p_influencer_id: referral.influencer_id,
    p_amount: BRAND_REFERRAL_BONUS1,
    p_description: `🎯 Bonus referral brand verificat — înregistrare aprobată (+${BRAND_REFERRAL_BONUS1} RON)`,
  })

  if (payError) {
    await admin.from('brand_referrals').update({ bonus1_paid_at: null }).eq('id', referralId)
    return { error: 'Plata a eșuat: ' + payError.message }
  }

  // Statusul avansează doar din 'pending' (dacă bonus2 a fost deja plătit, rămâne bonus2_paid)
  await admin
    .from('brand_referrals')
    .update({ status: 'bonus1_paid' })
    .eq('id', referralId)
    .eq('status', 'pending')

  return { success: true }
}

/**
 * Statistici brand referral pentru un influencer — doar influencerul însuși sau un admin.
 */
export async function getBrandReferralStats(influencerId: string) {
  const empty = { referrals: [], total: 0, bonus1Count: 0, bonus2Count: 0, earned: 0 }

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ...empty, error: 'Neautentificat' }

  const admin = brandReferralAdminClient()
  const { data: own } = await admin
    .from('influencers').select('id').eq('id', influencerId).eq('user_id', user.id).maybeSingle()
  if (!own) {
    const auth = await requireAdmin()
    if ('error' in auth) return { ...empty, error: 'Acces interzis' }
  }

  const { data: referrals } = await admin
    .from('brand_referrals')
    .select(`
      id, status, created_at, bonus1_paid_at, bonus2_paid_at,
      brands (id, name, email, approval_status)
    `)
    .eq('influencer_id', influencerId)
    .order('created_at', { ascending: false })

  const list = referrals ?? []
  const bonus1Count = list.filter(r => !!r.bonus1_paid_at).length
  const bonus2Count = list.filter(r => !!r.bonus2_paid_at).length
  const earned = bonus1Count * 50 + bonus2Count * 100

  return { referrals: list, total: list.length, bonus1Count, bonus2Count, earned }
}

/**
 * Admin: toate referral-urile de branduri.
 */
export async function getAllBrandReferrals() {
  const auth = await requireAdmin()
  if ('error' in auth) return { referrals: [], error: auth.error }

  const admin = brandReferralAdminClient()
  const { data, error } = await admin
    .from('brand_referrals')
    .select(`
      id, status, created_at, bonus1_paid_at, bonus2_paid_at, referral_code,
      influencers (id, name, email, wallet_balance),
      brands (id, name, email, approval_status)
    `)
    .order('created_at', { ascending: false })

  if (error) return { referrals: [], error: error.message }
  return { referrals: data ?? [] }
}
