'use server'

// Starea abonamentului Academy Member pentru creatorul logat.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAcademyMember, ACADEMY_PRICE_RON } from '@/lib/academy-member'

export async function getMyMembership(): Promise<
  | { error: string }
  | { success: true; active: boolean; until: string | null; canceling: boolean; hasSubscription: boolean; price: number }
> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Intră în contul de creator.' }
  const admin = createAdminClient()
  const { data: inf, error } = await admin.from('influencers')
    .select('is_verified, badge_expires_at, academy_sub_id, academy_sub_status, academy_cancel_at_period_end')
    .eq('user_id', user.id).maybeSingle()
  if (error) return { error: /academy_sub/.test(error.message) ? 'Rulează întâi SQL 64 (Academy Member).' : error.message }
  if (!inf) return { error: 'Contul de creator nu există.' }
  const active = isAcademyMember(inf)
  return {
    success: true,
    active,
    until: inf.badge_expires_at ?? null,
    canceling: !!inf.academy_cancel_at_period_end,
    hasSubscription: !!inf.academy_sub_id && inf.academy_sub_status !== 'canceled',
    price: ACADEMY_PRICE_RON,
  }
}
