'use server'

// Statistici Academie: înregistrăm pașii creatorilor (o dată pe zi, pe pas) și le arătăm adminului ca pâlnie.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { isAcademyMember } from '@/lib/academy-member'
import { ACADEMY_EVENTS, FUNNEL_STEPS, furthestStep, type AcademyEvent } from '@/lib/academy-funnel'

export async function logAcademyEvent(event: AcademyEvent) {
  try {
    if (!ACADEMY_EVENTS.includes(event)) return
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const admin = createAdminClient()
    const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
    if (!inf) return
    await admin.from('academy_events').upsert({ influencer_id: inf.id, event }, { onConflict: 'influencer_id,event,day', ignoreDuplicates: true })
  } catch { /* statisticile nu au voie să strice pagina */ }
}

export type FunnelPerson = {
  id: string; name: string | null; email: string | null; phone: string | null; instagram: string | null
  step: string; last: string; member: boolean
}

export async function adminAcademyFunnel(days: number) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const d = [7, 30, 90, 3650].includes(days) ? days : 30
  const since = new Date(Date.now() - d * 86400000)
  const sinceDay = since.toISOString().slice(0, 10)

  const { data: ev, error } = await admin.from('academy_events').select('influencer_id, event, created_at')
    .gte('day', sinceDay).order('created_at', { ascending: false }).limit(50000)
  if (error) return { error: 'Statisticile nu sunt pornite încă (rulează SQL 66).' }
  const { data: invs } = await admin.from('academy_invoices').select('influencer_id, created_at').order('created_at').limit(20000)

  // prima plată a fiecărui creator, dacă e în perioadă
  const firstPay = new Map<string, string>()
  for (const i of invs || []) if (!firstPay.has(i.influencer_id)) firstPay.set(i.influencer_id, i.created_at)
  const paidIn = new Set([...firstPay].filter(([, at]) => new Date(at) >= since).map(([id]) => id))

  const by = new Map<AcademyEvent, Set<string>>(ACADEMY_EVENTS.map(e => [e, new Set<string>()]))
  const perInf = new Map<string, { ev: Set<string>; last: string }>()
  for (const e of ev || []) {
    by.get(e.event as AcademyEvent)?.add(e.influencer_id)
    const p = perInf.get(e.influencer_id) || { ev: new Set<string>(), last: e.created_at }
    p.ev.add(e.event); if (e.created_at > p.last) p.last = e.created_at
    perInf.set(e.influencer_id, p)
  }

  const steps = FUNNEL_STEPS.map(s => ({ ...s, count: s.key === 'paid' ? paidIn.size : by.get(s.key as AcademyEvent)!.size }))

  // „interesați”: au ajuns cel puțin la ofertă / lecție cu lacăt, dar nu sunt membri acum
  const ids = [...perInf.keys()].filter(id => {
    const p = perInf.get(id)!.ev
    return p.has('offer_view') || p.has('locked_click') || p.has('consent_checked') || p.has('checkout_open')
  })
  const people: FunnelPerson[] = []
  for (let k = 0; k < ids.length; k += 500) {
    const { data: infs } = await admin.from('influencers')
      .select('id, name, email, phone, instagram_handle, is_verified, badge_expires_at, academy_free_until').in('id', ids.slice(k, k + 500))
    for (const i of infs || []) {
      const member = isAcademyMember(i)
      if (member) continue
      const p = perInf.get(i.id)!
      people.push({ id: i.id, name: i.name, email: i.email, phone: i.phone, instagram: i.instagram_handle, step: furthestStep(p.ev, firstPay.has(i.id)), last: p.last, member })
    }
  }
  const rank = (s: string) => ['Au deschis plata', 'Au bifat acordul', 'A încercat o lecție cu lacăt', 'Au văzut oferta'].indexOf(s)
  people.sort((a, b) => (rank(a.step) - rank(b.step)) || b.last.localeCompare(a.last))

  return {
    success: true as const,
    days: d,
    steps,
    lockedClicks: by.get('locked_click')!.size,
    closedCheckout: [...by.get('checkout_close')!].filter(id => !paidIn.has(id)).length,
    people,
  }
}
