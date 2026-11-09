'use server'

// Academia AddFame: lecțiile pentru creatori, quiz-ul (scor calculat pe server, puncte o singură dată),
// certificatul la final și editorul din Admin.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { passNeeded, cleanSteps, tierFor, TIERS, isTier, type AcademyLesson, type AcademyQuestion, type AcademyTier } from '@/lib/academy'
import { logScore } from '@/lib/score-log'

const NOT_READY = 'Academia nu e pornită încă (rulează SQL 44).'

async function me() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers')
    .select('id, user_id, name, avatar, instagram_handle, approval_status, creator_score, academy_certified_at, academy_tier, academy_cert_code')
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
    .select('id, position, title, summary, badge_name, minutes, points, questions, steps, pass_min')
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
      minutes: l.minutes, points: l.points, total, needed: passNeeded(l.pass_min, total), steps: Array.isArray(l.steps) ? l.steps.length : 0,
      passed: !!p?.passed_at, bestScore: p?.best_score ?? null, attempts: p?.attempts ?? 0,
    }
  })
  const passedRows = (prog || []).filter((p: any) => p.passed_at)
  const fullProg = inf.academy_certified_at && passedRows.length
    ? (await admin.from('academy_progress').select('first_score, first_total, best_score, total').eq('influencer_id', inf.id).not('passed_at', 'is', null)).data || []
    : []
  const certScore = fullProg.length ? {
    correct: fullProg.reduce((n: number, r: any) => n + (Number(r.first_score ?? r.best_score) || 0), 0),
    total: fullProg.reduce((n: number, r: any) => n + (Number(r.first_total ?? r.total) || 0), 0),
  } : null
  return {
    success: true as const,
    approved: inf.approval_status === 'approved',
    certifiedAt: inf.academy_certified_at as string | null,
    tier: (isTier(inf.academy_tier) ? inf.academy_tier : null) as AcademyTier | null,
    certCode: (inf.academy_cert_code as string | null) ?? null,
    certScore,
    name: inf.name as string | null,
    avatar: (inf.avatar as string | null) ?? null,
    score: (inf.creator_score as number) ?? 0,
    handle: inf.instagram_handle ? '@' + String(inf.instagram_handle).replace(/^@/, '') : (inf.name || ''),
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
  const { data: nx } = await admin.from('academy_lessons').select('id, title, position').eq('published', true).gt('position', l.position).order('position').limit(1)
  return {
    success: true as const,
    approved: inf.approval_status === 'approved',
    next: nx?.[0] ? { id: nx[0].id as string, title: nx[0].title as string, position: nx[0].position as number } : null,
    me: { name: inf.name as string | null, avatar: (inf.avatar as string | null) ?? null, score: (inf.creator_score as number) ?? 0, handle: inf.instagram_handle ? '@' + String(inf.instagram_handle).replace(/^@/, '') : (inf.name || '') },
    lesson: {
      id: l.id, position: l.position, title: l.title, summary: l.summary, badge_name: l.badge_name,
      minutes: l.minutes, points: l.points, body: l.body, video_url: l.video_url, steps: cleanSteps(l.steps),
      needed: passNeeded(l.pass_min, qs.length),
      // fără răspunsurile corecte: le vede doar după ce trimite testul
      questions: qs.map(q => ({ q: q.q, options: q.options })),
    },
    progress: p ? { bestScore: p.best_score, total: p.total, attempts: p.attempts, passed: !!p.passed_at, points: p.points } : null,
    certifiedAt: inf.academy_certified_at as string | null,
  }
}

/** Verificare pe loc: răspunsul corect și explicația pentru o întrebare (scorul se calculează tot la trimitere). */
export async function checkAnswer(id: string, index: number, choice: number) {
  const ctx = await me()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { data: l, error } = await ctx.admin.from('academy_lessons').select('questions').eq('id', id).eq('published', true).maybeSingle()
  if (error || !l) return { error: 'Lecția nu există.' }
  const q = cleanQuestions(l.questions)[index]
  if (!q) return { error: 'Întrebarea nu există.' }
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return { error: 'Răspuns invalid.' }
  // Prima încercare se reține la primul răspuns dat fiecărei întrebări, ca nivelul să nu poată fi „reparat” reluând testul.
  try {
    const { data: p } = await ctx.admin.from('academy_progress').select('id, first_answers, first_score').eq('influencer_id', ctx.inf.id).eq('lesson_id', id).maybeSingle()
    if (!p) {
      await ctx.admin.from('academy_progress').insert({ influencer_id: ctx.inf.id, lesson_id: id, attempts: 0, first_answers: { [index]: choice } })
    } else if (p.first_score == null) {
      const fa = (p.first_answers && typeof p.first_answers === 'object') ? p.first_answers as Record<string, number> : {}
      if (fa[String(index)] === undefined) await ctx.admin.from('academy_progress').update({ first_answers: { ...fa, [index]: choice } }).eq('id', p.id)
    }
  } catch { /* verificarea merge oricum */ }
  return { success: true as const, ok: choice === q.correct, correct: q.correct, explain: q.explain || null }
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
    .select('id, best_score, attempts, passed_at, first_score, first_answers').eq('influencer_id', inf.id).eq('lesson_id', id).maybeSingle()
  // scorul primei încercări: primul răspuns dat la fiecare întrebare (din verificarea pe loc), altfel cel trimis acum
  const fa = (prev?.first_answers && typeof prev.first_answers === 'object') ? prev.first_answers as Record<string, number> : {}
  const firstScore = qs.reduce((n, q, k) => n + ((fa[String(k)] ?? answers[k]) === q.correct ? 1 : 0), 0)
  if (prev) {
    await admin.from('academy_progress').update({
      best_score: Math.max(prev.best_score || 0, score), last_score: score, total: qs.length,
      attempts: (prev.attempts || 0) + 1, updated_at: now,
      // nivelul se calculează din prima încercare: o păstrăm neschimbată
      ...(prev.first_score == null ? { first_score: firstScore, first_total: qs.length } : {}),
    }).eq('id', prev.id)
  } else {
    const { error: insErr } = await admin.from('academy_progress').insert({
      influencer_id: inf.id, lesson_id: id, best_score: score, last_score: score, total: qs.length, attempts: 1,
      first_score: firstScore, first_total: qs.length,
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
      await logScore(admin, { influencerId: inf.id, points: award, kind: 'academy_lesson', label: 'Lecție Academie' })
    }
  }

  // Certificat: toate lecțiile publicate sunt trecute
  let certified = !!inf.academy_certified_at
  let justCertified = false
  let tier: AcademyTier | null = isTier(inf.academy_tier) ? inf.academy_tier : null
  let firstCorrect = 0, firstTotal = 0, bonus = 0
  let certCode: string | null = (inf.academy_cert_code as string | null) ?? null
  if (passed && !certified) {
    const { data: pub } = await admin.from('academy_lessons').select('id').eq('published', true)
    const { data: done } = await admin.from('academy_progress').select('lesson_id, passed_at, first_score, first_total, best_score, total').eq('influencer_id', inf.id)
    const byL = new Map((done || []).map((d: any) => [d.lesson_id, d]))
    const all = (pub || []).length > 0 && (pub || []).every((p: any) => byL.get(p.id)?.passed_at)
    if (all) {
      for (const p of pub || []) {
        const d: any = byL.get(p.id)
        firstCorrect += Number(d.first_score ?? d.best_score) || 0
        firstTotal += Number(d.first_total ?? d.total) || 0
      }
      const t = tierFor(firstCorrect, firstTotal)
      const { data: code } = await admin.rpc('academy_next_cert_code')
      const { data: c } = await admin.from('influencers').update({ academy_certified_at: now, academy_tier: t, ...(code ? { academy_cert_code: String(code) } : {}) }).eq('id', inf.id).is('academy_certified_at', null).select('id')
      if (c?.length) certCode = code ? String(code) : null
      certified = true
      justCertified = !!c?.length
      if (justCertified) {
        tier = t
        bonus = inf.approval_status === 'approved' ? TIERS[t].bonus : 0
        if (bonus > 0) {
          const { data: fresh } = await admin.from('influencers').select('creator_score').eq('id', inf.id).maybeSingle()
          await admin.from('influencers').update({ creator_score: (fresh?.creator_score ?? 0) + bonus }).eq('id', inf.id)
          await logScore(admin, { influencerId: inf.id, points: bonus, kind: 'academy_certificate', label: 'Bonus certificare Academie' })
        }
      }
    }
  }

  if (firstPass) {
    try {
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: justCertified && tier ? `🎓 Ești creator certificat ${TIERS[tier].label}!` : `🎓 Ai trecut lecția „${l.title}”${points ? ` · +${points} puncte` : ''}`,
        body: justCertified && tier
          ? `Ai terminat Academia cu ${firstCorrect} din ${firstTotal} din prima. Rama ${TIERS[tier].label} apare acum pe poza ta de profil și o văd brandurile.${bonus ? ` Bonus: +${bonus} puncte.` : ''}`
          : `Scor ${score}/${qs.length}.${points ? ` Ai primit +${points} puncte Creator Score.` : ''}`,
        link: '/influencer/academie', read: false,
      })
    } catch { /* opțional */ }
  }

  revalidatePath('/influencer/academie')
  return { success: true as const, score, total: qs.length, needed, passed, firstPass, points, certified, justCertified, tier, bonus, firstCorrect, firstTotal, certCode, certifiedAt: justCertified ? now : (inf.academy_certified_at as string | null), review }
}

/** Pentru profilul public: e creator certificat și cu ce nivel? */
export async function getAcademyCertified(influencerId: string): Promise<{ at: string; tier: AcademyTier } | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('influencers').select('academy_certified_at, academy_tier').eq('id', influencerId).maybeSingle()
    if (error || !data?.academy_certified_at) return null
    return { at: data.academy_certified_at as string, tier: isTier(data.academy_tier) ? data.academy_tier : 'bronze' }
  } catch { return null }
}

/** Nivelurile pentru o listă de creatori (lista de aplicanți a brandului). */
export async function getAcademyTiers(influencerIds: string[]): Promise<Record<string, AcademyTier>> {
  const ids = Array.from(new Set((influencerIds || []).filter(x => typeof x === 'string'))).slice(0, 500)
  if (!ids.length) return {}
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('influencers').select('id, academy_tier').in('id', ids).not('academy_certified_at', 'is', null)
    if (error) return {}
    const out: Record<string, AcademyTier> = {}
    for (const r of data || []) out[r.id as string] = isTier(r.academy_tier) ? r.academy_tier : 'bronze'
    return out
  } catch { return {} }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminAcademy() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: lessons, error } = await admin.from('academy_lessons').select('*').order('position').order('created_at')
  if (error) return { error: NOT_READY }
  const { data: prog } = await admin.from('academy_progress').select('lesson_id, influencer_id, passed_at, attempts')
  const { data: certRows } = await admin.from('influencers').select('academy_tier').not('academy_certified_at', 'is', null)
  const certified = (certRows || []).length
  const byTier = { bronze: 0, silver: 0, gold: 0, platinum: 0 } as Record<AcademyTier, number>
  for (const r of certRows || []) byTier[isTier(r.academy_tier) ? r.academy_tier : 'bronze']++
  const rows = prog || []
  const started = new Set(rows.map((r: any) => r.influencer_id)).size
  const per = (id: string) => ({
    tried: rows.filter((r: any) => r.lesson_id === id).length,
    passed: rows.filter((r: any) => r.lesson_id === id && r.passed_at).length,
  })
  return {
    success: true as const,
    started, certified, byTier,
    lessons: (lessons || []).map((l: any) => ({ ...l, questions: cleanQuestions(l.questions), steps: cleanSteps(l.steps), stats: per(l.id) })) as (AcademyLesson & { stats: { tried: number; passed: number } })[],
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
    steps: cleanSteps(input.steps),
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

/** Pagina publică de verificare: certificatul după cod (fără date private). */
export async function getCertificateByCode(code: string) {
  const c = String(code || '').trim().toUpperCase()
  if (!/^AF-\d{4}-\d{3,8}$/.test(c)) return null
  try {
    const admin = createAdminClient()
    const { data: inf, error } = await admin.from('influencers')
      .select('id, name, slug, avatar, creator_score, academy_certified_at, academy_tier, academy_cert_code')
      .eq('academy_cert_code', c).not('academy_certified_at', 'is', null).maybeSingle()
    if (error || !inf) return null
    const { data: rows } = await admin.from('academy_progress').select('first_score, first_total, best_score, total').eq('influencer_id', inf.id).not('passed_at', 'is', null)
    const correct = (rows || []).reduce((n: number, r: any) => n + (Number(r.first_score ?? r.best_score) || 0), 0)
    const total = (rows || []).reduce((n: number, r: any) => n + (Number(r.first_total ?? r.total) || 0), 0)
    return {
      code: inf.academy_cert_code as string, name: (inf.name as string) || 'Creator AddFame', slug: (inf.slug as string | null) ?? inf.id,
      avatar: (inf.avatar as string | null) ?? null, score: (inf.creator_score as number) ?? 0,
      tier: (isTier(inf.academy_tier) ? inf.academy_tier : 'bronze') as AcademyTier, at: inf.academy_certified_at as string, correct, total,
    }
  } catch { return null }
}

/** Admin: cine a început / a terminat Academia, cu scorurile și nivelul. */
export async function adminAcademyPeople() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: prog, error } = await admin.from('academy_progress')
    .select('influencer_id, lesson_id, attempts, first_score, first_total, best_score, total, passed_at, points, created_at, updated_at')
    .order('updated_at', { ascending: false }).limit(2000)
  if (error) return { error: NOT_READY }
  const ids = Array.from(new Set((prog || []).map((p: any) => p.influencer_id)))
  const infs: Record<string, any> = {}
  for (let k = 0; k < ids.length; k += 200) {
    let { data, error: e }: { data: any[] | null; error: any } = await admin.from('influencers')
      .select('id, name, email, phone, slug, instagram_handle, academy_certified_at, academy_tier, academy_cert_code').in('id', ids.slice(k, k + 200))
    if (e) ({ data } = await admin.from('influencers').select('id, name, email, phone, slug, instagram_handle, academy_certified_at, academy_tier').in('id', ids.slice(k, k + 200)) as any)
    for (const r of data || []) infs[r.id] = r
  }
  const { data: lessons } = await admin.from('academy_lessons').select('id, title, position')
  const lt = new Map((lessons || []).map((l: any) => [l.id, l]))
  const people = ids.map(id => {
    const i = infs[id] || {}
    const rows = (prog || []).filter((p: any) => p.influencer_id === id)
    const first = rows.reduce((n: number, r: any) => n + (Number(r.first_score ?? 0) || 0), 0)
    const firstTotal = rows.reduce((n: number, r: any) => n + (Number(r.first_total ?? 0) || 0), 0)
    const best = rows.reduce((n: number, r: any) => n + (Number(r.best_score ?? 0) || 0), 0)
    const total = rows.reduce((n: number, r: any) => n + (Number(r.total ?? 0) || 0), 0)
    const last = rows.map((r: any) => r.updated_at).sort().pop() || null
    return {
      id, name: i.name || '—', email: i.email || null, phone: i.phone || null, slug: i.slug || id,
      instagram: i.instagram_handle ? String(i.instagram_handle).replace(/^@/, '') : null,
      certifiedAt: i.academy_certified_at || null, tier: isTier(i.academy_tier) ? i.academy_tier : null, code: i.academy_cert_code || null,
      attempts: rows.reduce((n: number, r: any) => n + (r.attempts || 0), 0),
      passed: rows.filter((r: any) => r.passed_at).length, lessons: rows.length,
      first, firstTotal, best, total, points: rows.reduce((n: number, r: any) => n + (r.points || 0), 0),
      lessonTitles: rows.map((r: any) => (lt.get(r.lesson_id) as any)?.title).filter(Boolean),
      last,
    }
  }).sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')))
  return { success: true as const, people }
}

/** Admin: resetează Academia pentru un creator (scade punctele primite, șterge certificatul și progresul). */
export async function adminResetAcademy(influencerId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers').select('id, creator_score, academy_tier').eq('id', influencerId).maybeSingle()
  if (!inf) return { error: 'Creator negăsit.' }
  const { data: rows } = await admin.from('academy_progress').select('points').eq('influencer_id', influencerId)
  const lessonPts = (rows || []).reduce((n: number, r: any) => n + (r.points || 0), 0)
  const bonus = isTier(inf.academy_tier) ? TIERS[inf.academy_tier].bonus : 0
  const minus = lessonPts + bonus
  const base = { creator_score: Math.max(0, (inf.creator_score || 0) - minus), academy_certified_at: null, academy_tier: null }
  let { error } = await admin.from('influencers').update({ ...base, academy_cert_code: null }).eq('id', influencerId)
  if (error) ({ error } = await admin.from('influencers').update(base).eq('id', influencerId))
  if (error) return { error: error.message }
  await admin.from('academy_progress').delete().eq('influencer_id', influencerId)
  revalidatePath('/influencer/academie')
  return { success: true as const, minus }
}
