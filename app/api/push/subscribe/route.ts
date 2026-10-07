import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized } from '@/lib/api-auth'
import { cleanSubscription } from '@/lib/push'
import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { logDbError } from '@/lib/log-error'

// Salvează abonamentul push al dispozitivului curent pentru utilizatorul logat.
// Același dispozitiv (endpoint) trece la contul nou dacă cineva se loghează cu alt cont.
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  { const limited = await limitRequest(req, 'push-subscribe', LIMITS.api, user.id); if (limited) return limited }

  const body = await req.json().catch(() => null)
  const sub = cleanSubscription(body?.subscription)
  if (!sub) return NextResponse.json({ error: 'Abonament invalid' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert({
    user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300), failure_count: 0,
  }, { onConflict: 'endpoint' })
  if (error) {
    await logDbError('push subscribe', error, { userId: user.id })
    return NextResponse.json({ error: 'Nu am putut activa notificările. Încearcă din nou.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Dezactivează push-ul pe dispozitivul curent.
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const body = await req.json().catch(() => null)
  const endpoint = String(body?.endpoint || '')
  if (!endpoint) return NextResponse.json({ error: 'Lipsește dispozitivul' }, { status: 400 })
  const admin = createAdminClient()
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
