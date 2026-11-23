// Evenimentele Stripe pentru abonamentul Academy Member: activare, reînnoire (+ factură SmartBill), anulare.
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSmartBillInvoice, smartBillMissingEnv } from '@/lib/smartbill'
import { memberUntil, ACADEMY_BADGE_LABEL } from '@/lib/academy-member'

const subId = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id) || null

async function findInfluencer(sb: SupabaseClient, influencerId: string | null | undefined, subscriptionId: string | null) {
  const cols = 'id, user_id, name, email, address_line, city, county, badge_expires_at, verified_at'
  if (influencerId) {
    const { data } = await sb.from('influencers').select(cols).eq('id', influencerId).maybeSingle()
    if (data) return data
  }
  if (subscriptionId) {
    const { data } = await sb.from('influencers').select(cols).eq('academy_sub_id', subscriptionId).maybeSingle()
    if (data) return data
  }
  return null
}

/** checkout.session.completed — leagă abonamentul de creator. */
export async function academyCheckoutCompleted(sb: SupabaseClient, s: Stripe.Checkout.Session) {
  if (s.metadata?.type !== 'ACADEMY' || s.mode !== 'subscription') return false
  const sid = subId(s.subscription as any)
  if (!s.metadata.influencer_id || !sid) return true
  await sb.from('influencers').update({ academy_sub_id: sid, academy_sub_status: 'active', academy_cancel_at_period_end: false })
    .eq('id', s.metadata.influencer_id)
  return true
}

/** invoice.paid — prelungește bifa până la sfârșitul lunii plătite și emite factura. */
export async function academyInvoicePaid(sb: SupabaseClient, inv: Stripe.Invoice) {
  const x: any = inv
  // forma facturii diferă între versiunile API Stripe: căutăm abonamentul în toate locurile posibile
  const sid = subId(x.subscription) || subId(x.parent?.subscription_details?.subscription)
    || subId(x.lines?.data?.[0]?.subscription) || subId(x.lines?.data?.[0]?.parent?.subscription_item_details?.subscription)
  const meta = x.subscription_details?.metadata || x.parent?.subscription_details?.metadata || x.lines?.data?.[0]?.metadata || {}
  if (!sid) return false
  if (meta.type && meta.type !== 'ACADEMY') return false
  const inf = await findInfluencer(sb, meta.influencer_id, sid)
  if (!inf) return meta.type === 'ACADEMY' // e al nostru, dar creatorul nu s-a găsit
  const periodEnd = inv.lines?.data?.[0]?.period?.end
  if (!periodEnd) return true
  const until = memberUntil(periodEnd)
  const first = !inf.badge_expires_at || new Date(inf.badge_expires_at) < new Date()
  const now = new Date().toISOString()
  await sb.from('influencers').update({
    is_verified: true,
    badge_expires_at: !inf.badge_expires_at || new Date(inf.badge_expires_at) < new Date(until) ? until : inf.badge_expires_at,
    verified_at: inf.verified_at || now,
    academy_sub_id: sid,
    academy_sub_status: 'active',
  }).eq('id', inf.id)

  await sb.from('notifications').insert({
    user_id: inf.user_id,
    title: first ? `🎓 Bine ai venit în AddFame Academy!` : `🎓 Abonamentul Academy a fost reînnoit`,
    body: first
      ? `Ești ${ACADEMY_BADGE_LABEL}. Ai acces la cursurile pentru membri, iar bifa apare pe profilul tău.`
      : `Accesul și bifa ${ACADEMY_BADGE_LABEL} sunt active până pe ${new Date(until).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    link: '/influencer/academie',
    read: false,
  })

  // Factura SmartBill: o singură dată pe plată (rândul unic din academy_invoices e „lacătul”)
  const amount = (inv.amount_paid || 0) / 100
  if (amount <= 0) return true
  const { data: claim, error: claimErr } = await sb.from('academy_invoices')
    .insert({ influencer_id: inf.id, stripe_invoice_id: inv.id, amount, period_end: new Date(periodEnd * 1000).toISOString() })
    .select('id').maybeSingle()
  if (claimErr || !claim) return true // deja procesată (Stripe retrimite evenimentul) sau tabelul lipsește
  if (smartBillMissingEnv().length) {
    await sb.from('academy_invoices').update({ error: 'SmartBill neconfigurat' }).eq('id', claim.id)
    return true
  }
  try {
    const r = await createSmartBillInvoice({
      clientName: (inf.name || 'Creator AddFame').trim(),
      clientEmail: inf.email || inv.customer_email || '',
      clientAddress: [inf.address_line, inf.county].filter(Boolean).join(', ') || undefined,
      clientCity: inf.city || undefined,
      amountRon: amount,
      description: `Abonament AddFame Academy — ${ACADEMY_BADGE_LABEL} (o lună)`,
      mentions: 'Abonament lunar AddFame Academy, plătit cu cardul. Platforma AddFame — addfame.ro',
    })
    await sb.from('academy_invoices').update({ smartbill_number: r.smartbillNumber, error: null }).eq('id', claim.id)
  } catch (e: any) {
    await sb.from('academy_invoices').update({ error: (e?.definite ? 'Refuzată: ' : 'De verificat în SmartBill: ') + String(e?.message || 'eroare').slice(0, 300) }).eq('id', claim.id)
    console.error('[academy] factură SmartBill', e?.message)
  }
  return true
}

/** customer.subscription.updated / deleted — starea abonamentului (bifa expiră singură la badge_expires_at). */
export async function academySubscriptionChanged(sb: SupabaseClient, sub: Stripe.Subscription, deleted: boolean) {
  if (sub.metadata?.type && sub.metadata.type !== 'ACADEMY') return false
  const inf = await findInfluencer(sb, sub.metadata?.influencer_id, sub.id)
  if (!inf) return sub.metadata?.type === 'ACADEMY'
  await sb.from('influencers').update({
    academy_sub_id: sub.id,
    academy_sub_status: deleted ? 'canceled' : sub.status,
    academy_cancel_at_period_end: deleted ? false : !!sub.cancel_at_period_end,
  }).eq('id', inf.id)
  if (deleted) {
    await sb.from('notifications').insert({
      user_id: inf.user_id,
      title: 'Abonamentul Academy s-a încheiat',
      body: `Te poți abona din nou oricând din Academie. Lecțiile gratuite și certificatul rămân ale tale.`,
      link: '/influencer/academie',
      read: false,
    })
  }
  return true
}

/**
 * Sincronizare directă cu Stripe (nu depinde de webhook): caută abonamentul Academy al creatorului,
 * îi salvează starea și, dacă ultima factură e plătită, activează bifa (factura SmartBill rămâne o singură dată).
 */
export async function syncAcademyFromStripe(
  sb: SupabaseClient, stripe: Stripe,
  inf: { id: string; stripe_customer_id?: string | null; academy_sub_id?: string | null },
) {
  let sub: Stripe.Subscription | null = null
  if (inf.academy_sub_id) {
    sub = await stripe.subscriptions.retrieve(inf.academy_sub_id, { expand: ['latest_invoice'] }).catch(() => null)
  }
  if (!sub && inf.stripe_customer_id) {
    const list = await stripe.subscriptions.list({ customer: inf.stripe_customer_id, status: 'all', limit: 10, expand: ['data.latest_invoice'] })
    sub = list.data
      .filter(x => x.metadata?.type === 'ACADEMY' && (!x.metadata.influencer_id || x.metadata.influencer_id === inf.id))
      .sort((a, b) => b.created - a.created)[0] || null
  }
  if (!sub) return false
  await academySubscriptionChanged(sb, sub, sub.status === 'canceled')
  const inv = sub.latest_invoice
  if (inv && typeof inv === 'object' && inv.status === 'paid' && ['active', 'trialing', 'past_due'].includes(sub.status)) {
    await academyInvoicePaid(sb, inv)
  }
  return true
}
