'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Influencer: revendică un eveniment ───────────────────────────────────────
export async function claimPointEvent(eventId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Neautentificat' }

    // Găsim profilul influencerului
    const { data: inf, error: infErr } = await admin
      .from('influencers')
      .select('id, creator_score, approval_status')
      .eq('user_id', user.id)
      .single()

    if (infErr || !inf) return { error: 'Profil influencer negăsit' }
    if (inf.approval_status !== 'approved') return { error: 'Profilul tău nu este aprobat încă' }

    // Verificăm că evenimentul există, e activ și nu a expirat
    const { data: event, error: evErr } = await admin
      .from('point_events')
      .select('id, title, points, max_claims, expires_at, active')
      .eq('id', eventId)
      .single()

    if (evErr || !event) return { error: 'Evenimentul nu există' }
    if (!event.active) return { error: 'Evenimentul nu mai este activ' }
    if (new Date(event.expires_at) < new Date()) return { error: 'Evenimentul a expirat' }

    // Verificăm dacă a mai revendicat deja
    const { data: existing } = await admin
      .from('point_event_claims')
      .select('id')
      .eq('event_id', eventId)
      .eq('influencer_id', inf.id)
      .single()

    if (existing) return { error: 'Ai revendicat deja acest bonus' }

    // Verificăm limita de revendicări (dacă max_claims > 0)
    if (event.max_claims > 0) {
      const { count } = await admin
        .from('point_event_claims')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)

      if ((count ?? 0) >= event.max_claims) {
        return { error: 'Toate locurile au fost ocupate. Mai rapid data viitoare! 🏃' }
      }
    }

    // Inserăm revendicarea
    const { error: claimErr } = await admin
      .from('point_event_claims')
      .insert({ event_id: eventId, influencer_id: inf.id })

    if (claimErr) {
      // Unique constraint → deja revendicat (race condition)
      if (claimErr.code === '23505') return { error: 'Ai revendicat deja acest bonus' }
      return { error: 'Eroare la revendicare. Încearcă din nou.' }
    }

    // Acordăm punctele
    const newScore = (inf.creator_score ?? 0) + event.points
    await admin
      .from('influencers')
      .update({ creator_score: newScore })
      .eq('id', inf.id)

    // Notificare în platformă
    try {
      await admin.from('notifications').insert({
        user_id: user.id,
        title: `🎁 +${event.points} puncte Creator Score!`,
        body: `Ai revendicat bonusul "${event.title}". Scorul tău a crescut la ${newScore} puncte.`,
        link: '/influencer/creator-score',
        read: false,
      })
    } catch (_) { /* notificarea e opțională */ }

    revalidatePath('/influencer/dashboard')
    return { success: true, points: event.points, newScore }
  } catch (e: any) {
    console.error('claimPointEvent error:', e)
    return { error: e.message || 'Eroare necunoscută' }
  }
}

// ─── Admin: creează un eveniment nou ──────────────────────────────────────────
export async function createPointEvent(data: {
  title: string
  description: string
  points: number
  max_claims: number
  expires_at: string // ISO string
}) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Neautentificat' }

    // Verificăm că e admin
    const { data: adminRow } = await admin
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminRow) return { error: 'Nu ai permisiuni de admin' }

    if (!data.title || !data.points || !data.expires_at) {
      return { error: 'Completează toate câmpurile obligatorii' }
    }
    if (data.points < 1 || data.points > 10000) return { error: 'Puncte invalide (1–10000)' }
    if (new Date(data.expires_at) <= new Date()) return { error: 'Data expirării trebuie să fie în viitor' }

    const { data: event, error } = await admin
      .from('point_events')
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        points: data.points,
        max_claims: data.max_claims ?? 0,
        expires_at: data.expires_at,
        created_by: user.id,
        active: true,
      })
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath('/admin/point-events')
    return { success: true, event }
  } catch (e: any) {
    return { error: e.message || 'Eroare' }
  }
}

// ─── Admin: dezactivează un eveniment ────────────────────────────────────────
export async function deactivatePointEvent(eventId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Neautentificat' }

    const { data: adminRow } = await admin.from('admins').select('id').eq('user_id', user.id).single()
    if (!adminRow) return { error: 'Nu ai permisiuni de admin' }

    await admin.from('point_events').update({ active: false }).eq('id', eventId)

    revalidatePath('/admin/point-events')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Public: fetch evenimente active (pentru dashboard influencer) ────────────
export async function getActivePointEvents(influencerId?: string) {
  try {
    const admin = createAdminClient()

    const { data: events } = await admin
      .from('point_events')
      .select('id, title, description, points, max_claims, expires_at, created_at')
      .eq('active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!events || events.length === 0) return { events: [] }

    // Pentru fiecare eveniment: numărăm revendicările și verificăm dacă influencerul a revendicat
    const results = await Promise.all(
      events.map(async (ev) => {
        const { count } = await admin
          .from('point_event_claims')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', ev.id)

        let claimed = false
        if (influencerId) {
          const { data: c } = await admin
            .from('point_event_claims')
            .select('id')
            .eq('event_id', ev.id)
            .eq('influencer_id', influencerId)
            .single()
          claimed = !!c
        }

        return {
          ...ev,
          claims_count: count ?? 0,
          already_claimed: claimed,
          spots_left: ev.max_claims > 0 ? Math.max(0, ev.max_claims - (count ?? 0)) : null,
        }
      })
    )

    return { events: results }
  } catch (e: any) {
    return { events: [], error: e.message }
  }
}
