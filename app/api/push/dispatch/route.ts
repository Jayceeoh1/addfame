import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchNotifications, dispatchSecret, safeEqual } from '@/lib/push'
import { logError } from '@/lib/log-error'

// Apelat de Postgres (trigger-ul din SQL 24, prin pg_net) când apar notificări noi.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  const secret = await dispatchSecret(admin)
  const given = req.headers.get('x-push-secret') || ''
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
  try {
    const stats = await dispatchNotifications(admin, ids)
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    await logError(e, { source: 'server', url: '/api/push/dispatch' })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
