'use server'

// Evenimente (campanii Open Call): influencerul apasă „Vreau să vin” și își completează datele,
// brandul (sau AddFame) aprobă / respinge. Toate scrierile trec pe aici (verificări + notificări).

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { validateEventForm, toBrandEventApplication, eventSlotLimit, eventOpen, type EventFormErrors } from '@/lib/event-signup'
import { emailEventApplicationsToBrand, emailEventDecision } from '@/lib/email'
import { isUuid } from '@/lib/drafts'

const EVENT_FIELDS = 'id, title, description, banner_url, event_date, event_location, min_followers, application_deadline, registration_link, manual_registrations, platforms, status, brand_id, campaign_type, fee_slots, max_influencers'

async function currentInfluencer() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await createAdminClient().from('influencers')
    .select('id, user_id, name, email, phone, city, instagram_handle, approval_status').eq('user_id', user.id).maybeSingle()
  return data
}

/** Câți vin / s-au înscris (fără cei respinși sau anulați) + înscrierile vechi prin link + cele adăugate manual. */
async function interestCounts(ids: string[]) {
  const admin = createAdminClient()
  const out = new Map<string, number>()
  if (!ids.length) return out
  const [{ data: apps }, { data: regs }] = await Promise.all([
    admin.from('event_applications').select('campaign_id').in('campaign_id', ids).in('status', ['pending', 'approved']),
    admin.from('event_registrations').select('campaign_id').in('campaign_id', ids),
  ])
  for (const r of [...(apps ?? []), ...(regs ?? [])]) out.set(r.campaign_id, (out.get(r.campaign_id) || 0) + 1)
  return out
}

// ─── Influencer ──────────────────────────────────────────────────────────────

/** Lista evenimentelor active, cu statusul înscrierii mele. */
export async function getEventsForInfluencer() {
  try {
    const inf = await currentInfluencer()
    if (!inf) return { error: 'Neautentificat' }
    const admin = createAdminClient()
    const { data: camps } = await admin.from('campaigns').select(EVENT_FIELDS)
      .eq('campaign_type', 'OPEN_CALL').eq('status', 'ACTIVE').order('event_date', { ascending: true, nullsFirst: false })
    const list = camps ?? []
    const ids = list.map(c => c.id)
    const brandIds = [...new Set(list.map(c => c.brand_id).filter(Boolean))]
    const [counts, { data: mine }, { data: brands }] = await Promise.all([
      interestCounts(ids),
      ids.length ? admin.from('event_applications').select('campaign_id, status').eq('influencer_id', inf.id).in('campaign_id', ids) : Promise.resolve({ data: [] as any[] }),
      brandIds.length ? admin.from('brands_public').select('id, name, logo, verification_status').in('id', brandIds) : Promise.resolve({ data: [] as any[] }),
    ])
    const myMap = new Map((mine ?? []).map(a => [a.campaign_id, a.status]))
    const bMap = new Map((brands ?? []).map(b => [b.id, b]))
    return {
      success: true as const,
      events: list.map(c => ({
        id: c.id, title: c.title, description: c.description, banner_url: c.banner_url,
        event_date: c.event_date, event_location: c.event_location, min_followers: c.min_followers,
        application_deadline: c.application_deadline, platforms: c.platforms || [],
        brand: bMap.get(c.brand_id) ?? null,
        interested: (counts.get(c.id) || 0) + (c.manual_registrations || 0),
        my_status: (myMap.get(c.id) as string | undefined) ?? null,
        open: eventOpen(c),
      })),
    }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Pagina unui eveniment: detalii, înscrierea mea, dacă sunt invitat și datele pentru formular. */
export async function getEventForInfluencer(campaignId: string) {
  try {
    if (!isUuid(campaignId)) return { error: 'Eveniment inexistent' }
    const inf = await currentInfluencer()
    if (!inf) return { error: 'Neautentificat' }
    const admin = createAdminClient()
    const { data: c } = await admin.from('campaigns').select(EVENT_FIELDS).eq('id', campaignId).maybeSingle()
    if (!c || c.campaign_type !== 'OPEN_CALL' || !['ACTIVE', 'COMPLETED', 'PAUSED'].includes(c.status)) return { error: 'Eveniment inexistent' }
    const [{ data: brand }, { data: mine }, { data: invite }, { data: last }, counts] = await Promise.all([
      c.brand_id ? admin.from('brands_public').select('id, name, logo, verification_status, website, instagram_connected, instagram_handle, ig_followers').eq('id', c.brand_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from('event_applications').select('id, full_name, phone, city, address, instagram, message, status, entry_code, created_at, decided_at').eq('campaign_id', campaignId).eq('influencer_id', inf.id).maybeSingle(),
      admin.from('collaborations').select('id').eq('campaign_id', campaignId).eq('influencer_id', inf.id).eq('status', 'INVITED').maybeSingle(),
      // ultimele date folosite (ca să nu le scrie din nou la fiecare eveniment)
      admin.from('event_applications').select('full_name, phone, city, address, instagram').eq('influencer_id', inf.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      interestCounts([campaignId]),
    ])
    const limit = eventSlotLimit(c)
    return {
      success: true as const,
      event: {
        id: c.id, title: c.title, description: c.description, banner_url: c.banner_url, event_date: c.event_date,
        event_location: c.event_location, min_followers: c.min_followers, application_deadline: c.application_deadline,
        platforms: c.platforms || [], registration_link: c.registration_link, status: c.status,
        interested: (counts.get(c.id) || 0) + (c.manual_registrations || 0), slots: limit, open: eventOpen(c),
      },
      brand,
      application: mine ?? null,
      invited: !!invite,
      prefill: {
        full_name: last?.full_name || inf.name || '',
        phone: last?.phone || inf.phone || '',
        city: last?.city || inf.city || '',
        address: last?.address || '',
        instagram: last?.instagram || inf.instagram_handle || '',
      },
    }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** „Vreau să vin” — trimite (sau retrimite, după anulare) înscrierea. */
export async function applyToEvent(campaignId: string, form: Record<string, unknown>):
  Promise<{ success: true } | { error: string; fieldErrors?: EventFormErrors }> {
  try {
    if (!isUuid(campaignId)) return { error: 'Eveniment inexistent' }
    const inf = await currentInfluencer()
    if (!inf) return { error: 'Trebuie să fii logat ca influencer.' }
    if (inf.approval_status && inf.approval_status !== 'approved') return { error: 'Profilul tău trebuie aprobat înainte să te înscrii la evenimente.' }

    const v = validateEventForm(form as any)
    if (!v.ok || !v.data) return { error: 'Verifică datele completate.', fieldErrors: v.errors }

    const admin = createAdminClient()
    const { data: c } = await admin.from('campaigns').select('id, title, status, campaign_type, application_deadline, brand_id').eq('id', campaignId).maybeSingle()
    if (!c || c.campaign_type !== 'OPEN_CALL') return { error: 'Eveniment inexistent' }
    if (!eventOpen(c)) return { error: 'Înscrierile la acest eveniment s-au închis.' }

    const { data: existing } = await admin.from('event_applications').select('id, status').eq('campaign_id', campaignId).eq('influencer_id', inf.id).maybeSingle()
    if (existing && existing.status !== 'cancelled') {
      if (existing.status === 'rejected') return { error: 'Organizatorul a răspuns deja la înscrierea ta.' }
      // în așteptare / aprobat → actualizăm doar datele
      await admin.from('event_applications').update({ ...v.data!, updated_at: new Date().toISOString() }).eq('id', existing.id)
      return { success: true }
    }

    const { data: invite } = await admin.from('collaborations').select('id').eq('campaign_id', campaignId).eq('influencer_id', inf.id).eq('status', 'INVITED').maybeSingle()
    const row = { ...v.data!, status: 'pending', invited: !!invite, entry_code: null, decided_at: null, decided_by: null, updated_at: new Date().toISOString() }
    const { error } = existing
      ? await admin.from('event_applications').update(row).eq('id', existing.id)
      : await admin.from('event_applications').insert({ ...row, campaign_id: campaignId, influencer_id: inf.id })
    if (error) {
      if (error.code === '23505') return { success: true }  // dublu-click
      return { error: 'Nu am putut trimite înscrierea. Încearcă din nou.' }
    }

    // Anunțăm brandul: notificare la fiecare înscriere, email doar la praguri (să nu-l inundăm)
    try {
      const { data: brand } = await admin.from('brands').select('user_id, name, email').eq('id', c.brand_id).maybeSingle()
      const { count } = await admin.from('event_applications').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('status', 'pending')
      const pending = count ?? 1
      if (brand?.user_id) {
        await admin.from('notifications').insert({
          user_id: brand.user_id, title: '🎟️ Înscriere nouă la eveniment',
          body: `${v.data!.full_name} vrea să vină la „${c.title}”. ${pending} ${pending === 1 ? 'înscriere așteaptă' : 'înscrieri așteaptă'} răspunsul tău.`,
          link: `/brand/campaigns/${campaignId}?view=participanti`, read: false,
        })
      }
      if (brand?.email && [1, 5, 10, 20, 50, 100, 200].includes(pending)) {
        await emailEventApplicationsToBrand(brand.email, brand.name || 'Brand', c.title, pending, campaignId)
      }
    } catch { /* anunțul nu blochează înscrierea */ }

    return { success: true }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Influencerul se retrage (eliberează locul dacă era aprobat). */
export async function cancelEventApplication(campaignId: string) {
  try {
    if (!isUuid(campaignId)) return { error: 'Eveniment inexistent' }
    const inf = await currentInfluencer()
    if (!inf) return { error: 'Neautentificat' }
    const { data, error } = await createAdminClient().from('event_applications')
      .update({ status: 'cancelled', entry_code: null, updated_at: new Date().toISOString() })
      .eq('campaign_id', campaignId).eq('influencer_id', inf.id).in('status', ['pending', 'approved']).select('id')
    if (error) return { error: error.message }
    if (!data?.length) return { error: 'Nu ai o înscriere activă la acest eveniment.' }
    return { success: true }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

// ─── Brand / AddFame ─────────────────────────────────────────────────────────

/** Brandul care deține evenimentul, sau un admin AddFame. */
async function eventManager(campaignId: string) {
  if (!isUuid(campaignId)) return null
  const admin = createAdminClient()
  const { data: c } = await admin.from('campaigns').select(EVENT_FIELDS).eq('id', campaignId).maybeSingle()
  if (!c || c.campaign_type !== 'OPEN_CALL') return null
  const adminSession = await verifyAdminSession()
  if (adminSession) return { role: 'admin' as const, userId: adminSession.userId, campaign: c }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
  if (!brand || brand.id !== c.brand_id) return null
  return { role: 'brand' as const, userId: user.id, campaign: c }
}

/** Lista celor interesați. Brandul nu vede telefon, adresă sau conturi sociale; AddFame vede tot. */
export async function getEventApplications(campaignId: string) {
  try {
    const m = await eventManager(campaignId)
    if (!m) return { error: 'Nu ai acces la acest eveniment.' }
    const admin = createAdminClient()
    const { data: rows } = await admin.from('event_applications').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true })
    const infIds = [...new Set((rows ?? []).map(r => r.influencer_id))]
    const { data: infs } = infIds.length
      ? await admin.from('influencers').select('id, name, email, avatar, ig_followers, tt_followers, niches, slug, creator_score').in('id', infIds)
      : { data: [] as any[] }
    const iMap = new Map((infs ?? []).map(i => [i.id, i]))
    const apps = (rows ?? []).map(r => {
      const i = iMap.get(r.influencer_id) || {}
      const profile = {
        avatar: i.avatar ?? null, ig_followers: i.ig_followers ?? null, tt_followers: i.tt_followers ?? null,
        niches: Array.isArray(i.niches) ? i.niches.slice(0, 4) : [], creator_score: i.creator_score ?? null, slug: i.slug ?? null,
      }
      return m.role === 'admin'
        ? { ...r, profile: { ...profile, name: i.name ?? null, email: i.email ?? null } }
        : { ...toBrandEventApplication(r), profile }
    })
    const approved = apps.filter(a => a.status === 'approved').length
    return {
      success: true as const,
      role: m.role,
      event: { id: m.campaign.id, title: m.campaign.title, event_date: m.campaign.event_date, event_location: m.campaign.event_location, status: m.campaign.status },
      slots: eventSlotLimit(m.campaign),
      approved,
      apps,
    }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}

/** Aprobă sau respinge. Locurile sunt verificate atomic în baza de date (SQL 35). */
export async function decideEventApplication(applicationId: string, decision: 'approved' | 'rejected') {
  try {
    if (!isUuid(applicationId) || !['approved', 'rejected'].includes(decision)) return { error: 'Cerere invalidă' }
    const admin = createAdminClient()
    const { data: app } = await admin.from('event_applications').select('id, campaign_id, influencer_id, full_name').eq('id', applicationId).maybeSingle()
    if (!app) return { error: 'Înscrierea nu există.' }
    const m = await eventManager(app.campaign_id)
    if (!m) return { error: 'Nu ai acces la acest eveniment.' }

    const { data, error } = await admin.rpc('decide_event_application', { p_app: applicationId, p_decision: decision, p_actor: m.userId })
    if (error) return { error: error.message }
    const r = data as any
    if (!r?.ok) {
      const msg: Record<string, string> = {
        full: `Toate cele ${r?.limit} locuri sunt ocupate. Respinge pe cineva sau adaugă locuri ca să mai aprobi.`,
        cancelled: 'Influencerul și-a anulat înscrierea.',
        not_found: 'Înscrierea nu există.',
      }
      return { error: msg[r?.error] || 'Nu s-a putut salva decizia.' }
    }
    if (r.unchanged) return { success: true, status: r.status, entry_code: r.entry_code, approved: r.approved }

    // Anunțăm influencerul (notificare + email)
    try {
      const { data: inf } = await admin.from('influencers').select('user_id, name, email').eq('id', app.influencer_id).maybeSingle()
      const c = m.campaign
      if (inf?.user_id) {
        await admin.from('notifications').insert({
          user_id: inf.user_id,
          title: decision === 'approved' ? '🎉 Ești pe lista de invitați!' : 'Răspuns la înscrierea ta',
          body: decision === 'approved'
            ? `Ai fost aprobat la „${c.title}”. Codul tău de intrare: ${r.entry_code}.`
            : `Organizatorul nu te-a putut include la „${c.title}” de data aceasta.`,
          link: `/influencer/castinguri/${c.id}`, read: false,
        })
      }
      if (inf?.email) {
        await emailEventDecision(inf.email, app.full_name || inf.name || '', {
          title: c.title, approved: decision === 'approved', code: r.entry_code, date: c.event_date, location: c.event_location, campaignId: c.id,
        })
      }
    } catch { /* anunțul nu blochează decizia */ }

    return { success: true, status: r.status as string, entry_code: (r.entry_code ?? null) as string | null, approved: r.approved as number }
  } catch (e: any) { return { error: e?.message || 'Eroare' } }
}
