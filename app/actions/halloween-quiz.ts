'use server'

// Quiz de Halloween: starea (pornit? a jucat?), trimiterea răspunsurilor (+25 puncte o singură dată) și comutatorul din Admin.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { scoreQuiz, QUIZ_POINTS, QUIZ_CHARACTERS } from '@/lib/halloween-quiz'

const SETTING = 'halloween_quiz'

async function quizEnabled(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from('platform_settings').select('value').eq('key', SETTING).maybeSingle()
  return (data?.value as any)?.enabled === true
}

async function me() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id, user_id, name, instagram_handle, approval_status, avatar').eq('user_id', user.id).maybeSingle()
  return inf ? { admin, inf } : null
}

export async function getQuizState() {
  const ctx = await me()
  if (!ctx) return { enabled: false as const }
  if (!(await quizEnabled(ctx.admin))) return { enabled: false as const }
  const { data: r } = await ctx.admin.from('halloween_quiz_results').select('score, character, points, created_at').eq('influencer_id', ctx.inf.id).maybeSingle()
  const handle = ctx.inf.instagram_handle ? '@' + String(ctx.inf.instagram_handle).replace(/^@/, '') : (ctx.inf.name || '')
  return {
    enabled: true as const,
    approved: ctx.inf.approval_status === 'approved',
    handle,
    result: r ? { score: r.score, characterId: r.character, points: r.points } : null,
  }
}

export async function submitQuiz(answers: number[]) {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator ca să joci.' }
  const { admin, inf } = ctx
  if (!(await quizEnabled(admin))) return { error: 'Quiz-ul nu mai e activ.' }
  const res = scoreQuiz(answers)
  if (!res) return { error: 'Răspunde la toate cele 8 întrebări.' }

  const points = inf.approval_status === 'approved' ? QUIZ_POINTS : 0
  const { error: insErr } = await admin.from('halloween_quiz_results').insert({
    influencer_id: inf.id, answers, score: res.score, character: res.character.id, points,
  })
  if (insErr) {
    // a mai jucat: întoarcem rezultatul salvat, fără puncte noi
    if (insErr.code === '23505') {
      const { data: r } = await admin.from('halloween_quiz_results').select('score, character').eq('influencer_id', inf.id).maybeSingle()
      return { success: true as const, alreadyPlayed: true, score: r?.score ?? res.score, characterId: r?.character ?? res.character.id, points: 0 }
    }
    return { error: 'Quiz-ul nu e pornit încă (rulează SQL 43).' }
  }

  if (points > 0) {
    const { data: fresh } = await admin.from('influencers').select('creator_score').eq('id', inf.id).maybeSingle()
    await admin.from('influencers').update({ creator_score: (fresh?.creator_score ?? 0) + points }).eq('id', inf.id)
    try {
      await admin.from('notifications').insert({
        user_id: inf.user_id, title: `🎃 +${points} puncte — ești ${res.character.name}!`,
        body: 'Ai terminat quiz-ul de Halloween. Postează-ți cardul pe Story și provoacă-ți prietenii!',
        link: '/influencer/halloween-quiz', read: false,
      })
    } catch { /* opțional */ }
  }
  return { success: true as const, alreadyPlayed: false, score: res.score, characterId: res.character.id, points }
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export async function adminGetQuiz() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const enabled = await quizEnabled(admin)
  const { data, error } = await admin.from('halloween_quiz_results').select('character, points')
  if (error) return { success: true as const, enabled, ready: false, total: 0, points: 0, byCharacter: [] as any[] }
  const rows = data || []
  return {
    success: true as const, enabled, ready: true,
    total: rows.length,
    points: rows.reduce((s: number, r: any) => s + (r.points || 0), 0),
    byCharacter: QUIZ_CHARACTERS.map(c => ({ id: c.id, name: c.name, count: rows.filter((r: any) => r.character === c.id).length })),
  }
}

export async function adminSetQuizEnabled(enabled: boolean) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { error } = await admin.from('platform_settings').upsert({
    key: SETTING, value: { enabled: !!enabled }, label: 'Quiz Halloween',
    description: 'Quiz-ul „Ce influencer de Halloween ești?” în dashboardul influencerilor (+25 puncte o dată)',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) return { error: error.message }
  revalidatePath('/influencer/dashboard')
  return { success: true as const, enabled: !!enabled }
}



/** Poza de profil a creatorului ca data-URI, pentru cardul de Story (evită problemele CORS la desenarea în canvas).
 *  Acceptă doar poze din Supabase Storage, max 3 MB. Întoarce null dacă nu există / nu se poate citi. */
export async function getStoryAvatar(): Promise<string | null> {
  const ctx = await me()
  const url = ctx?.inf?.avatar ? String(ctx.inf.avatar) : ''
  if (!url) return null
  if (/^data:image\/(jpeg|png|webp);base64,/.test(url)) return url.length < 4_000_000 ? url : null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) return null
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const type = (r.headers.get('content-type') || '').split(';')[0]
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > 3 * 1024 * 1024) return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch { return null }
}
