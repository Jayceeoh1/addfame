'use server'

// Starea abonamentului Academy Member pentru creatorul logat.
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { isAcademyMember, isPaidAcademyMember, ACADEMY_PRICE_RON } from '@/lib/academy-member'
import { getLaunchOffer } from '@/lib/academy-launch'
import Stripe from 'stripe'
import { syncAcademyFromStripe } from '@/lib/academy-billing'

const COMMUNITY_KEY = 'academy_community'

/** Linkul grupului privat (WhatsApp) — îl primesc doar membrii activi. */
async function communityUrl(admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const { data } = await admin.from('platform_settings').select('value').eq('key', COMMUNITY_KEY).maybeSingle()
  const url = (data?.value as any)?.url
  return typeof url === 'string' && url ? url : null
}

export async function getMyMembership(): Promise<
  | { error: string }
  | { success: true; active: boolean; paid: boolean; launch: { left: number; total: number; firstMonth: number } | null; community: string | null; invoices: { id: string; at: string; amount: number; ready: boolean }[]; until: string | null; canceling: boolean; hasSubscription: boolean; price: number }
> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: 'Intră în contul de creator.' }
  const admin = createAdminClient()
  const { data: inf, error } = await admin.from('influencers')
    .select('id, is_verified, badge_expires_at, academy_free_until, academy_sub_id, academy_sub_status, academy_cancel_at_period_end, stripe_customer_id, academy_terms_accepted_at')
    .eq('user_id', user.id).maybeSingle()
  if (error) return { error: /academy_sub/.test(error.message) ? 'Rulează întâi SQL 64 (Academy Member).' : error.message }
  if (!inf) return { error: 'Contul de creator nu există.' }
  // a plătit, dar webhook-ul n-a ajuns încă (sau n-a mers)? verificăm direct în Stripe
  if (!isAcademyMember(inf) && inf.stripe_customer_id && (inf.academy_sub_id
      || (inf.academy_terms_accepted_at && Date.now() - new Date(inf.academy_terms_accepted_at).getTime() < 14 * 86400000))) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
      if (await syncAcademyFromStripe(admin, stripe, inf)) {
        const { data: fresh } = await admin.from('influencers')
          .select('is_verified, badge_expires_at, academy_free_until, academy_sub_id, academy_sub_status, academy_cancel_at_period_end').eq('id', inf.id).maybeSingle()
        if (fresh) Object.assign(inf, fresh)
      }
    } catch (e: any) { console.error('[academy] sync Stripe', e?.message) }
  }
  const active = isAcademyMember(inf)
  const community = active ? await communityUrl(admin) : null
  const { data: invs } = await admin.from('academy_invoices').select('id, amount, smartbill_number, created_at')
    .eq('influencer_id', inf.id).order('created_at', { ascending: false }).limit(36)
  const offer = !active && !(invs || []).length ? await getLaunchOffer() : null
  return {
    success: true,
    active,
    paid: isPaidAcademyMember(inf),
    launch: offer ? { left: offer.left, total: offer.total, firstMonth: offer.firstMonth } : null,
    community,
    invoices: (invs || []).map((x: any) => ({ id: x.id, at: x.created_at, amount: Number(x.amount || 0), ready: !!x.smartbill_number })),
    until: (isPaidAcademyMember(inf) ? inf.badge_expires_at : inf.academy_free_until || inf.badge_expires_at) ?? null,
    canceling: !!inf.academy_cancel_at_period_end,
    hasSubscription: !!inf.academy_sub_id && inf.academy_sub_status !== 'canceled',
    price: ACADEMY_PRICE_RON,
  }
}

// ─── Admin: cine e Academy Member și ce a plătit ───────────────────────────────


export type AdminAcademyMember = {
  id: string; name: string | null; email: string | null; phone: string | null; instagram: string | null; slug: string | null
  active: boolean; until: string | null; since: string | null
  status: 'activ' | 'se_opreste' | 'plata_esuata' | 'anulat' | 'manual' | 'expirat'
  hasSubscription: boolean
  payments: number; totalPaid: number; lastPaymentAt: string | null
  invoices: { id: string; at: string; amount: number; number: string | null; error: string | null }[]
}

export async function adminAcademyMembers(): Promise<{ error: string } | { success: true; members: AdminAcademyMember[] }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: infs, error } = await admin.from('influencers')
    .select('id, name, email, phone, instagram_handle, slug, is_verified, badge_expires_at, academy_free_until, verified_at, academy_sub_id, academy_sub_status, academy_cancel_at_period_end')
    .or('academy_sub_id.not.is.null,badge_expires_at.not.is.null,academy_free_until.not.is.null')
    .limit(2000)
  if (error) return { error: /academy_sub/.test(error.message) ? 'Rulează întâi SQL 64 (Academy Member).' : error.message }
  const { data: invs } = await admin.from('academy_invoices').select('id, influencer_id, amount, smartbill_number, error, created_at').order('created_at', { ascending: false }).limit(5000)
  const byInf = new Map<string, any[]>()
  for (const i of invs || []) { const a = byInf.get(i.influencer_id) || []; a.push(i); byInf.set(i.influencer_id, a) }

  const members: AdminAcademyMember[] = (infs || []).map((i: any) => {
    const active = isAcademyMember(i)
    const hasSub = !!i.academy_sub_id && i.academy_sub_status !== 'canceled'
    const status: AdminAcademyMember['status'] =
      i.academy_sub_status === 'past_due' || i.academy_sub_status === 'unpaid' ? 'plata_esuata'
      : hasSub && i.academy_cancel_at_period_end ? 'se_opreste'
      : hasSub && isPaidAcademyMember(i) ? 'activ'
      : active ? 'manual'
      : i.academy_sub_id ? 'anulat' : 'expirat'
    const inv = byInf.get(i.id) || []
    return {
      id: i.id, name: i.name, email: i.email, phone: i.phone, instagram: i.instagram_handle, slug: i.slug,
      active, until: isPaidAcademyMember(i) ? i.badge_expires_at : (i.academy_free_until || i.badge_expires_at), since: i.verified_at, status, hasSubscription: hasSub,
      payments: inv.length, totalPaid: inv.reduce((s, x) => s + Number(x.amount || 0), 0), lastPaymentAt: inv[0]?.created_at || null,
      invoices: inv.slice(0, 24).map(x => ({ id: x.id, at: x.created_at, amount: Number(x.amount || 0), number: x.smartbill_number, error: x.error })),
    }
  })
  const rank = { plata_esuata: 0, activ: 1, se_opreste: 2, manual: 3, anulat: 4, expirat: 5 }
  members.sort((a, b) => rank[a.status] - rank[b.status] || String(a.name || '').localeCompare(String(b.name || ''), 'ro'))
  return { success: true, members }
}

/** Acces gratuit (fără plată): prelungește bifa cu N luni. Nu creează abonament în Stripe. */
export async function adminGrantAcademy(influencerId: string, months: number) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const m = Math.min(12, Math.max(1, Math.round(Number(months) || 1)))
  const admin = createAdminClient()
  const { data: i } = await admin.from('influencers').select('id, user_id, academy_free_until').eq('id', influencerId).maybeSingle()
  if (!i) return { error: 'Creatorul nu există.' }
  const from = i.academy_free_until && new Date(i.academy_free_until) > new Date() ? new Date(i.academy_free_until) : new Date()
  from.setMonth(from.getMonth() + m)
  // acces gratuit = lecții, feedback, grup; fără bifa verde (aceea e doar pentru abonamentele plătite)
  const { error } = await admin.from('influencers').update({ academy_free_until: from.toISOString() }).eq('id', i.id)
  if (error) return { error: error.message }
  if (i.user_id) await admin.from('notifications').insert({
    user_id: i.user_id, title: '🎓 Ai primit acces gratuit la AddFame Academy',
    body: `Accesul la cursurile pentru membri e activ până pe ${from.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    link: '/influencer/academie', read: false,
  })
  return { success: true as const, until: from.toISOString() }
}

/** Oprește imediat accesul dat manual. Abonamentele plătite se anulează doar de creator (sau din Stripe). */
export async function adminRevokeAcademy(influencerId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: i } = await admin.from('influencers').select('id').eq('id', influencerId).maybeSingle()
  if (!i) return { error: 'Creatorul nu există.' }
  // oprește doar accesul gratuit; un abonament plătit se anulează din Stripe sau de către creator
  const { error } = await admin.from('influencers').update({ academy_free_until: null }).eq('id', i.id)
  if (error) return { error: error.message }
  return { success: true as const }
}

export async function adminFindInfluencerByEmail(email: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const e = String(email || '').trim().toLowerCase()
  if (!e.includes('@')) return { error: 'Scrie emailul creatorului.' }
  const admin = createAdminClient()
  const { data } = await admin.from('influencers').select('id, name').ilike('email', e).limit(2)
  if (!data?.length) return { error: 'Nu există creator cu emailul ăsta.' }
  if (data.length > 1) return { error: 'Mai mulți creatori au emailul ăsta. Verifică în Admin → Influenceri.' }
  return { success: true as const, id: data[0].id as string, name: data[0].name as string | null }
}

export async function adminGetAcademyCommunity() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  return { success: true as const, url: await communityUrl(createAdminClient()) }
}

export async function adminSetAcademyCommunity(raw: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const url = String(raw || '').trim()
  if (url && !/^https:\/\/(chat\.whatsapp\.com|t\.me|discord\.gg)\/[A-Za-z0-9_+\-]+\/?$/.test(url))
    return { error: 'Pune linkul de invitație (ex.: https://chat.whatsapp.com/…).' }
  const { error } = await createAdminClient().from('platform_settings')
    .upsert({ key: COMMUNITY_KEY, value: { url: url || null }, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return { error: error.message }
  return { success: true as const, url: url || null }
}
