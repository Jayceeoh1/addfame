'use server'

// Academy Members: cererile de feedback pe materiale și de analiză a profilului (creator) + răspunsurile (admin).

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { isAcademyMember } from '@/lib/academy-member'
import { cleanUrl, clip, requestBlock, MATERIAL_TYPES, type AcademyRequest, type AcademyRequestKind } from '@/lib/academy-requests'

const NOT_READY = 'Cererile Academy nu sunt pornite încă (rulează SQL 65).'
const COLS = 'id, kind, url, material_type, question, status, answer, strengths, brands, improve, answered_by_name, answered_at, seen_at, created_at'

async function meCreator() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: inf } = await admin.from('influencers')
    .select('id, user_id, name, instagram_handle, is_verified, badge_expires_at, academy_free_until')
    .eq('user_id', user.id).maybeSingle()
  return inf ? { admin, inf } : null
}

// ─── Creator ──────────────────────────────────────────────────────────────────

export async function getMyAcademyRequests(): Promise<
  | { error: string }
  | { success: true; member: boolean; requests: AcademyRequest[]; block: Record<AcademyRequestKind, string | null>; profileUrl: string | null }
> {
  const ctx = await meCreator()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { admin, inf } = ctx
  const member = isAcademyMember(inf)
  const { data, error } = await admin.from('academy_requests').select(COLS)
    .eq('influencer_id', inf.id).order('created_at', { ascending: false }).limit(50)
  if (error) return { error: NOT_READY }
  const requests = (data || []) as AcademyRequest[]
  const handle = String(inf.instagram_handle || '').replace(/^@/, '').trim()
  return {
    success: true,
    member,
    requests,
    block: { feedback: requestBlock('feedback', requests), analysis: requestBlock('analysis', requests) },
    profileUrl: handle ? `https://www.instagram.com/${handle}/` : null,
  }
}

export async function submitAcademyRequest(input: { kind: AcademyRequestKind; url: string; materialType?: string; question?: string }) {
  const ctx = await meCreator()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  const { admin, inf } = ctx
  if (!isAcademyMember(inf)) return { error: 'Feedbackul și analiza de profil sunt pentru Academy Members.' }
  const kind = input?.kind
  if (kind !== 'feedback' && kind !== 'analysis') return { error: 'Cerere invalidă.' }

  const url = cleanUrl(input.url)
  if (!url) return { error: kind === 'feedback' ? 'Pune linkul materialului (Instagram, TikTok, Drive…).' : 'Pune linkul profilului tău.' }
  const question = clip(input.question, 1500)
  if (kind === 'feedback' && !question) return { error: 'Spune-ne pe scurt la ce vrei feedback.' }
  const materialType = kind === 'feedback' && MATERIAL_TYPES.includes(input.materialType as any) ? input.materialType! : null

  const { data: mine, error: e1 } = await admin.from('academy_requests').select('kind, status, created_at').eq('influencer_id', inf.id)
  if (e1) return { error: NOT_READY }
  const block = requestBlock(kind, (mine || []) as any)
  if (block) return { error: block }

  const { error } = await admin.from('academy_requests').insert({
    influencer_id: inf.id, kind, url, material_type: materialType, question,
  })
  if (error) return { error: 'Nu am putut trimite cererea. Încearcă din nou.' }

  // anunțăm adminii activi
  const { data: admins } = await admin.from('admins').select('user_id, is_active')
  const rows = (admins || []).filter((a: any) => a.user_id && a.is_active !== false).map((a: any) => ({
    user_id: a.user_id,
    title: kind === 'feedback' ? '🎬 Cerere nouă de feedback (Academy)' : '🔎 Cerere nouă de analiză de profil (Academy)',
    body: `${inf.name || 'Un creator'} așteaptă răspuns.`,
    link: '/admin/academie/cereri',
    read: false,
  }))
  if (rows.length) await admin.from('notifications').insert(rows)
  return { success: true as const }
}

export async function markAcademyRequestSeen(id: string) {
  const ctx = await meCreator()
  if (!ctx) return { error: 'Intră în contul de creator.' }
  await ctx.admin.from('academy_requests').update({ seen_at: new Date().toISOString() })
    .eq('id', id).eq('influencer_id', ctx.inf.id).eq('status', 'answered').is('seen_at', null)
  return { success: true as const }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export type AdminAcademyRequest = AcademyRequest & {
  influencer: { id: string; name: string | null; email: string | null; instagram_handle: string | null; avatar: string | null; member: boolean } | null
}

export async function adminAcademyRequests(): Promise<{ error: string } | { success: true; requests: AdminAcademyRequest[] }> {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data, error } = await admin.from('academy_requests')
    .select(`${COLS}, influencer_id`).order('created_at', { ascending: false }).limit(300)
  if (error) return { error: NOT_READY }
  const ids = [...new Set((data || []).map((r: any) => r.influencer_id))]
  const { data: infs } = ids.length
    ? await admin.from('influencers').select('id, name, email, instagram_handle, avatar, is_verified, badge_expires_at, academy_free_until').in('id', ids)
    : { data: [] as any[] }
  const byId = new Map((infs || []).map((i: any) => [i.id, i]))
  return {
    success: true,
    requests: (data || []).map((r: any) => {
      const i: any = byId.get(r.influencer_id)
      return {
        ...r,
        influencer: i ? { id: i.id, name: i.name, email: i.email, instagram_handle: i.instagram_handle, avatar: i.avatar, member: isAcademyMember(i) } : null,
      }
    }),
  }
}

export async function adminAnswerAcademyRequest(input: {
  id: string; answer?: string; strengths?: string; brands?: string; improve?: string; signedBy?: string
}) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: req } = await admin.from('academy_requests').select('id, kind, influencer_id, status').eq('id', input?.id).maybeSingle()
  if (!req) return { error: 'Cererea nu mai există.' }

  const answer = clip(input.answer, 6000)
  const strengths = clip(input.strengths, 4000)
  const brands = clip(input.brands, 4000)
  const improve = clip(input.improve, 4000)
  if (req.kind === 'feedback' && !answer) return { error: 'Scrie feedbackul.' }
  if (req.kind === 'analysis' && !(strengths && brands && improve)) return { error: 'Completează punctele forte, brandurile potrivite și ce poate îmbunătăți.' }

  const first = req.status !== 'answered'
  const { error } = await admin.from('academy_requests').update({
    status: 'answered', answer, strengths, brands, improve,
    answered_by: auth.userId,
    answered_by_name: clip(input.signedBy, 80),
    answered_at: new Date().toISOString(),
    seen_at: null,
  }).eq('id', req.id)
  if (error) return { error: 'Nu am putut salva răspunsul.' }

  const { data: inf } = await admin.from('influencers').select('user_id').eq('id', req.influencer_id).maybeSingle()
  if (inf?.user_id) {
    await admin.from('notifications').insert({
      user_id: inf.user_id,
      title: req.kind === 'feedback'
        ? (first ? '🎬 Ai primit feedback pe materialul tău' : '🎬 Feedbackul pe materialul tău a fost actualizat')
        : (first ? '🔎 Analiza profilului tău e gata' : '🔎 Analiza profilului tău a fost actualizată'),
      body: 'O găsești în Academie, la secțiunea Academy Member.',
      link: '/influencer/academie#cereri',
      read: false,
    })
  }
  return { success: true as const }
}
