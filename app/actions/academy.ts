'use server'

// Academia AddFame: lecțiile pentru creatori, quiz-ul (scor calculat pe server, puncte o singură dată),
// certificatul la final și editorul din Admin.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { passNeeded, type AcademyLesson, type AcademyQuestion } from '@/lib/academy'

const NOT_READY = 'Academia nu e pornită încă (rulează SQL 44).'

async function me() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers')
    .select('id, user_id, name, approval_status, creator_score, academy_certified_at')
    .eq('user_id', user.id).maybeSingle()
  return inf ? { admin, inf } : null
}

function cleanQuestions(raw: any): AcademyQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw.map((q: any) => ({
    q: String(q?.q || '').trim(),
    options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o || '').trim()).filter(Boolean).slice(0, 4) : [],
    correct: Number(q?.correct),
    explain: q?.explain ? String(q.explain).trim() : undefined,
  })).filter(q => q.q && q.options.length >= 2 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length)
}

// ─── Creator ──────────────────────────────────────────────────────────────────

export async function getAcademy() {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { admin, inf } = ctx
  const { data: lessons, error } = await admin.from('academy_lessons')
    .select('id, position, title, summary, badge_name, minutes, points, questions, pass_min')
    .eq('published', true).order('position')
  if (error) return { error: NOT_READY }
  const { data: prog } = await admin.from('academy_progress')
    .select('lesson_id, best_score, total, attempts, passed_at, points').eq('influencer_id', inf.id)
  const byLesson = new Map((prog || []).map((p: any) => [p.lesson_id, p]))
  const list = (lessons || []).map((l: any) => {
    const p: any = byLesson.get(l.id)
    const total = Array.isArray(l.questions) ? l.questions.length : 0
    return {
      id: l.id, position: l.position, title: l.title, summary: l.summary, badge_name: l.badge_name,
      minutes: l.minutes, points: l.points, total, needed: passNeeded(l.pass_min, total),
      passed: !!p?.passed_at, bestScore: p?.best_score ?? null, attempts: p?.attempts ?? 0,
    }
  })
  return {
    success: true as const,
    approved: inf.approval_status === 'approved',
    certifiedAt: inf.academy_certified_at as string | null,
    name: inf.name as string | null,
    lessons: list,
  }
}

export async function getLesson(id: string) {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { admin, inf } = ctx
  const { data: l, error } = await admin.from('academy_lessons').select('*').eq('id', id).eq('published', true).maybeSingle()
  if (error) return { error: NOT_READY }
  if (!l) return { error: 'Lecția nu există sau nu e publicată.' }
  const { data: p } = await admin.from('academy_progress')
    .select('best_score, total, attempts, passed_at, points').eq('influencer_id', inf.id).eq('lesson_id', id).maybeSingle()
  const qs = cleanQuestions(l.questions)
  return {
    success: true as const,
    approved: inf.approval_status === 'approved',
    lesson: {
      id: l.id, position: l.position, title: l.title, summary: l.summary, badge_name: l.badge_name,
      minutes: l.minutes, points: l.points, body: l.body, video_url: l.video_url,
      needed: passNeeded(l.pass_min, qs.length),
      // fără răspunsurile corecte: le vede doar după ce trimite testul
      questions: qs.map(q => ({ q: q.q, options: q.options })),
    },
    progress: p ? { bestScore: p.best_score, total: p.total, attempts: p.attempts, passed: !!p.passed_at, points: p.points } : null,
  }
}

export async function submitLesson(id: string, answers: number[]) {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { admin, inf } = ctx
  const { data: l, error } = await admin.from('academy_lessons').select('id, title, points, questions, pass_min, badge_name').eq('id', id).eq('published', true).maybeSingle()
  if (error) return { error: NOT_READY }
  if (!l) return { error: 'Lecția nu există sau nu e publicată.' }
  const qs = cleanQuestions(l.questions)
  if (!Array.isArray(answers) || answers.length !== qs.length || answers.some(a => !Number.isInteger(a) || a < 0))
    return { error: 'Răspunde la toate întrebările.' }

  const review = qs.map((q, i) => ({ ok: answers[i] === q.correct, correct: q.correct, explain: q.explain || null }))
  const score = review.filter(r => r.ok).length
  const needed = passNeeded(l.pass_min, qs.length)
  const passed = score >= needed
  const now = new Date().toISOString()

  const { data: prev } = await admin.from('academy_progress')
    .select('id, best_score, attempts, passed_at').eq('influencer_id', inf.id).eq('lesson_id', id).maybeSingle()
  if (prev) {
    await admin.from('academy_progress').update({
      best_score: Math.max(prev.best_score || 0, score), last_score: score, total: qs.length,
      attempts: (prev.attempts || 0) + 1, updated_at: now,
    }).eq('id', prev.id)
  } else {
    const { error: insErr } = await admin.from('academy_progress').insert({
      influencer_id: inf.id, lesson_id: id, best_score: score, last_score: score, total: qs.length, attempts: 1,
    })
    if (insErr && insErr.code !== '23505') return { error: 'Nu am putut salva rezultatul. Încearcă din nou.' }
  }

  // Puncte: o singură dată, la prima trecere (doar profil aprobat). Condiția pe passed_at oprește dublarea.
  let points = 0
  let firstPass = false
  if (passed) {
    const award = inf.approval_status === 'approved' ? (l.points || 0) : 0
    const { data: marked } = await admin.from('academy_progress')
      .update({ passed_at: now, points: award, updated_at: now })
      .eq('influencer_id', inf.id).eq('lesson_id', id).is('passed_at', null)
      .select('id')
    firstPass = !!marked?.length
    if (firstPass && award > 0) {
      points = award
      const { data: fresh } = await admin.from('influencers').select('creator_score').eq('id', inf.id).maybeSingle()
      await admin.from('influencers').update({ creator_score: (fresh?.creator_score ?? 0) + award }).eq('id', inf.id)
    }
  }

  // Certificat: toate lecțiile publicate sunt trecute
  let certified = !!inf.academy_certified_at
  let justCertified = false
  if (passed && !certified) {
    const { data: pub } = await admin.from('academy_lessons').select('id').eq('published', true)
    const { data: done } = await admin.from('academy_progress').select('lesson_id').eq('influencer_id', inf.id).not('passed_at', 'is', null)
    const doneSet = new Set((done || []).map((d: any) => d.lesson_id))
    if ((pub || []).length > 0 && (pub || []).every((p: any) => doneSet.has(p.id))) {
      const { data: c } = await admin.from('influencers').update({ academy_certified_at: now }).eq('id', inf.id).is('academy_certified_at', null).select('id')
      certified = true
      justCertified = !!c?.length
    }
  }

  if (firstPass) {
    try {
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: justCertified ? '🎓 Ești creator certificat AddFame!' : `🎓 Ai trecut lecția „${l.title}”${points ? ` · +${points} puncte` : ''}`,
        body: justCertified
          ? 'Ai terminat Academia. Badge-ul „Creator certificat” apare acum pe profilul tău și îl văd brandurile.'
          : `Scor ${score}/${qs.length}.${points ? ` Ai primit +${points} puncte Creator Score.` : ''}`,
        link: '/influencer/academie', read: false,
      })
    } catch { /* opțional */ }
  }

  revalidatePath('/influencer/academie')
  return { success: true as const, score, total: qs.length, needed, passed, firstPass, points, certified, justCertified, review }
}

/** Pentru profilul public: e creator certificat? */
export async function getAcademyCertified(influencerId: string) {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('influencers').select('academy_certified_at').eq('id', influencerId).maybeSingle()
    if (error) return null
    return (data?.academy_certified_at as string | null) ?? null
  } catch { return null }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminAcademy() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: lessons, error } = await admin.from('academy_lessons').select('*').order('position').order('created_at')
  if (error) return { error: NOT_READY }
  const { data: prog } = await admin.from('academy_progress').select('lesson_id, influencer_id, passed_at, attempts')
  const { count: certified } = await admin.from('influencers').select('id', { count: 'exact', head: true }).not('academy_certified_at', 'is', null)
  const rows = prog || []
  const started = new Set(rows.map((r: any) => r.influencer_id)).size
  const per = (id: string) => ({
    tried: rows.filter((r: any) => r.lesson_id === id).length,
    passed: rows.filter((r: any) => r.lesson_id === id && r.passed_at).length,
  })
  return {
    success: true as const,
    started, certified: certified ?? 0,
    lessons: (lessons || []).map((l: any) => ({ ...l, questions: cleanQuestions(l.questions), stats: per(l.id) })) as (AcademyLesson & { stats: { tried: number; passed: number } })[],
  }
}

export async function adminSaveLesson(input: Partial<AcademyLesson> & { title: string }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const title = String(input.title || '').trim()
  if (!title) return { error: 'Scrie un titlu.' }
  const questions = cleanQuestions(input.questions)
  if (input.published && questions.length === 0) return { error: 'O lecție publicată are nevoie de cel puțin o întrebare.' }
  const row = {
    title,
    summary: input.summary ? String(input.summary).trim() : null,
    badge_name: input.badge_name ? String(input.badge_name).trim() : null,
    minutes: Math.min(180, Math.max(1, Math.round(Number(input.minutes) || 5))),
    points: Math.min(1000, Math.max(0, Math.round(Number(input.points) || 0))),
    body: input.body ? String(input.body) : null,
    video_url: input.video_url ? String(input.video_url).trim() : null,
    questions,
    pass_min: Math.max(0, Math.min(questions.length, Math.round(Number(input.pass_min) || 0))),
    published: !!input.published,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { error } = await admin.from('academy_lessons').update(row).eq('id', input.id)
    if (error) return { error: error.message }
    revalidatePath('/influencer/academie')
    return { success: true as const, id: input.id }
  }
  const { data: last } = await admin.from('academy_lessons').select('position').order('position', { ascending: false }).limit(1)
  const position = ((last?.[0]?.position as number) || 0) + 1
  const { data, error } = await admin.from('academy_lessons').insert({ ...row, position }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/influencer/academie')
  return { success: true as const, id: data.id as string }
}

export async function adminDeleteLesson(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { count } = await admin.from('academy_progress').select('id', { count: 'exact', head: true }).eq('lesson_id', id)
  if ((count ?? 0) > 0) return { error: `${count} creatori au dat deja testul. Treci lecția pe ciornă în loc s-o ștergi.` }
  const { error } = await admin.from('academy_lessons').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/influencer/academie')
  return { success: true as const }
}

export async function adminMoveLesson(id: string, dir: -1 | 1) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data } = await admin.from('academy_lessons').select('id, position').order('position').order('created_at')
  const list = (data || []).map((l: any) => l.id as string)
  const i = list.indexOf(id), j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return { success: true as const }
  ;[list[i], list[j]] = [list[j], list[i]]
  for (let k = 0; k < list.length; k++) await admin.from('academy_lessons').update({ position: k + 1 }).eq('id', list[k])
  revalidatePath('/influencer/academie')
  return { success: true as const }
}
