import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized, forbidden } from '@/lib/api-auth'
import { getCollabAccess, isUuid } from '@/lib/drafts'
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { openDispute, canOpenDispute, USER_REASONS, REASONS, type DisputeReason } from '@/lib/disputes'

// GET /api/disputes?collabId=…  → litigiul colaborării (cel activ sau ultimul)
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const collabId = req.nextUrl.searchParams.get('collabId') || ''
    if (!isUuid(collabId)) return NextResponse.json({ error: 'collabId invalid' }, { status: 400 })
    const admin = createAdminClient()
    const access = await getCollabAccess(admin, collabId, user.id)
    if (!access) return forbidden()
    const { data, error } = await admin.from('disputes')
      .select('id, opened_by_role, reason, description, status, respond_by, response, responded_at, resolution, resolution_note, resolved_at, created_at')
      .eq('collaboration_id', collabId).order('created_at', { ascending: false }).limit(1)
    if (error) return NextResponse.json({ dispute: null, role: access.role, canOpen: false })   // SQL 23 nerulat
    return NextResponse.json({ dispute: data?.[0] ?? null, role: access.role, canOpen: canOpenDispute(access.status) })
  } catch { return NextResponse.json({ error: 'Eroare server' }, { status: 500 }) }
}

// POST { collabId, reason, description } → deschide litigiu
export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'dispute', { maxRequests: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 }); if (limited) return limited }
  try {
    const user = await getSessionUser()
    if (!user) return unauthorized()
    const { collabId, reason, description } = await req.json().catch(() => ({}))
    const text = typeof description === 'string' ? description.trim() : ''
    if (!isUuid(collabId) || !USER_REASONS.includes(reason)) return NextResponse.json({ error: 'Cerere invalidă' }, { status: 400 })
    if (text.length < 10) return NextResponse.json({ error: 'Descrie problema în cel puțin 10 caractere.' }, { status: 400 })
    if (text.length > 2000) return NextResponse.json({ error: 'Descrierea e prea lungă (maximum 2000 de caractere).' }, { status: 400 })

    const admin = createAdminClient()
    const access = await getCollabAccess(admin, collabId, user.id)
    if (!access) return forbidden()
    if (!canOpenDispute(access.status)) return NextResponse.json({ error: 'Pentru această colaborare nu se mai poate deschide un litigiu.' }, { status: 409 })

    const res = await openDispute(admin, {
      collabId, role: access.role, userId: user.id, reason: reason as DisputeReason, description: text, title: access.title,
      otherPartyUserId: access.role === 'brand' ? access.influencerUserId : access.brandUserId,
    })
    if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.code === 'duplicate' ? 409 : 500 })
    return NextResponse.json({ ok: true, id: res.id, reason: REASONS[reason as DisputeReason] })
  } catch { return NextResponse.json({ error: 'Eroare server' }, { status: 500 }) }
}
