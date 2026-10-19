'use server'

// Halloween „Trick or Treat”: un dovleac pe zi (25–31 oct), 5–30 puncte Creator Score, +50 dacă le deschide pe toate.
// Totul se decide pe server: ziua (ora României), punctele (aleator criptografic) și o singură deschidere pe zi (UNIQUE în SQL 42).

import { randomInt } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bucharestDay, treatDays, treatPhase, rollTreat, earnedStreakBonus, STREAK_BONUS } from '@/lib/halloween'

async function currentInfluencer() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id, user_id, creator_score, approval_status').eq('user_id', user.id).maybeSingle()
  return inf ? { admin, inf } : null
}

export async function getTreatStatus() {
  const phase = treatPhase()
  if (phase === 'hidden') return { phase }
  const ctx = await currentInfluencer()
  if (!ctx) return { phase: 'hidden' as const }
  const today = bucharestDay()
  const year = Number(today.slice(0, 4))
  const { data: rows, error } = await ctx.admin.from('halloween_treats').select('day, kind, points')
    .eq('influencer_id', ctx.inf.id).gte('day', treatDays(year)[0]).lte('day', treatDays(year)[6])
  if (error) return { phase: 'hidden' as const }
  const daily = (rows || []).filter((r: any) => r.kind === 'daily')
  const byDay = Object.fromEntries(daily.map((r: any) => [r.day, r.points]))
  const bonus = (rows || []).find((r: any) => r.kind === 'bonus')
  return {
    phase,
    today,
    approved: ctx.inf.approval_status === 'approved',
    days: treatDays(year).map(d => ({ day: d, points: byDay[d] ?? null, isToday: d === today, past: d < today })),
    openedToday: byDay[today] != null,
    total: (rows || []).reduce((s: number, r: any) => s + (r.points || 0), 0),
    bonus: bonus ? bonus.points : null,
  }
}

export async function openTreat() {
  if (treatPhase() !== 'open') return { error: 'Dovlecii se deschid între 25 și 31 octombrie.' }
  const ctx = await currentInfluencer()
  if (!ctx) return { error: 'Intră în contul de creator ca să deschizi dovleacul.' }
  if (ctx.inf.approval_status !== 'approved') return { error: 'Profilul tău trebuie să fie aprobat ca să participi.' }
  const { admin, inf } = ctx
  const today = bucharestDay()
  const year = Number(today.slice(0, 4))
  const points = rollTreat(randomInt(0, 1_000_000) / 1_000_000)

  // o singură deschidere pe zi: a doua încercare lovește UNIQUE
  const { error: insErr } = await admin.from('halloween_treats').insert({ influencer_id: inf.id, day: today, kind: 'daily', points })
  if (insErr) {
    if (insErr.code === '23505') return { error: 'Ai deschis deja dovleacul de azi. Revino mâine! 🎃' }
    return { error: 'Jocul nu e pornit încă (rulează SQL 42).' }
  }

  let gained = points
  let bonus = 0
  const { data: opened } = await admin.from('halloween_treats').select('day').eq('influencer_id', inf.id).eq('kind', 'daily')
  if (earnedStreakBonus((opened || []).map((r: any) => r.day), year)) {
    const { error: bErr } = await admin.from('halloween_treats').insert({ influencer_id: inf.id, day: today, kind: 'bonus', points: STREAK_BONUS })
    if (!bErr) { bonus = STREAK_BONUS; gained += STREAK_BONUS }
  }

  // scorul îl recitim chiar înainte de actualizare, ca să nu suprascriem alte puncte primite între timp
  const { data: fresh } = await admin.from('influencers').select('creator_score').eq('id', inf.id).maybeSingle()
  const newScore = (fresh?.creator_score ?? 0) + gained
  await admin.from('influencers').update({ creator_score: newScore }).eq('id', inf.id)

  try {
    await admin.from('notifications').insert({
      user_id: inf.user_id,
      title: bonus ? `🎃 +${gained} puncte — ai deschis toți dovlecii!` : `🎃 +${points} puncte din dovleacul de azi`,
      body: bonus ? `Ai primit ${points} puncte azi și bonusul de ${bonus} pentru toate cele 7 zile. Creator Score: ${newScore}.` : `Creator Score: ${newScore}. Revino mâine pentru încă un dovleac!`,
      link: '/influencer/dashboard', read: false,
    })
  } catch { /* opțional */ }

  return { success: true as const, points, bonus, newScore }
}
