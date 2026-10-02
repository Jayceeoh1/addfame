// Logică internă pentru brand referrals.
// ATENȚIE: fișierul NU are 'use server' intenționat — funcțiile de aici NU sunt
// expuse ca endpoint-uri publice. Se apelează doar din alte acțiuni de server
// (registerBrand în app/actions/auth.ts, approveDeliverable în collaborations.ts).

import { createClient } from '@supabase/supabase-js'

export const BRAND_REFERRAL_BONUS1 = 50   // RON — după verificarea manuală a brandului
export const BRAND_REFERRAL_BONUS2 = 100  // RON — la prima colaborare finalizată a brandului

export function brandReferralAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * La înregistrarea unui brand venit prin link de referral.
 * Creează rândul cu status 'pending' — bonus1 se plătește manual de admin.
 */
export async function handleBrandReferralRegistration(brandId: string, referralCode: string) {
  const admin = brandReferralAdminClient()

  const { data: influencer } = await admin
    .from('influencers')
    .select('id, total_brand_referrals')
    .eq('brand_referral_code', referralCode.toUpperCase())
    .maybeSingle()

  if (!influencer) return // cod invalid

  const { error: insertError } = await admin
    .from('brand_referrals')
    .insert({
      influencer_id: influencer.id,
      brand_id: brandId,
      referral_code: referralCode.toUpperCase(),
      status: 'pending',
    })

  if (insertError) {
    // brand_id UNIQUE — brandul a mai fost referit
    console.error('Brand referral insert error:', insertError.message)
    return
  }

  await admin
    .from('influencers')
    .update({ total_brand_referrals: (influencer.total_brand_referrals ?? 0) + 1 })
    .eq('id', influencer.id)
}

/**
 * Când o colaborare a brandului e finalizată.
 * Plătește bonus2 (100 RON) o singură dată, doar dacă brandul are cel puțin
 * o colaborare finalizată. Sigur la apeluri concurente: statusul se schimbă
 * atomic înainte de plată, iar la eșecul plății se revine.
 */
export async function handleBrandReferralFirstCampaign(brandId: string) {
  if (!brandId) return
  const admin = brandReferralAdminClient()

  const { data: referral } = await admin
    .from('brand_referrals')
    .select('id, influencer_id, status')
    .eq('brand_id', brandId)
    .in('status', ['pending', 'bonus1_paid'])
    .maybeSingle()

  if (!referral) return // nu e referit sau bonus2 deja plătit

  const { count } = await admin
    .from('collaborations')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('status', 'COMPLETED')

  if ((count ?? 0) < 1) return // nicio colaborare finalizată încă

  // Tranziție atomică: doar un singur apel poate trece de aici
  const { data: claimed } = await admin
    .from('brand_referrals')
    .update({ status: 'bonus2_paid', bonus2_paid_at: new Date().toISOString() })
    .eq('id', referral.id)
    .eq('status', referral.status)
    .select('id')

  if (!claimed || claimed.length === 0) return // alt apel a plătit deja

  const { error: payError } = await admin.rpc('pay_brand_referral_bonus', {
    p_influencer_id: referral.influencer_id,
    p_amount: BRAND_REFERRAL_BONUS2,
    p_description: `🏆 Bonus referral brand — prima campanie finalizată (+${BRAND_REFERRAL_BONUS2} RON)`,
  })

  if (payError) {
    console.error('Brand referral bonus2 payment failed:', payError.message)
    await admin
      .from('brand_referrals')
      .update({ status: referral.status, bonus2_paid_at: null })
      .eq('id', referral.id)
  }
}
