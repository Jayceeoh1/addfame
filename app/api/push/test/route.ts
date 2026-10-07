import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, unauthorized } from '@/lib/api-auth'
import { pushConfig, sendToDevices } from '@/lib/push'
import { limitRequest } from '@/lib/rate-limit'

// Trimite un push de probă pe dispozitivele utilizatorului (butonul „Trimite un test”).
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  { const limited = await limitRequest(req, 'push-test', { maxRequests: 5, windowMs: 10 * 60 * 1000 }, user.id); if (limited) return limited }
  if (!pushConfig().enabled) return NextResponse.json({ error: 'Notificările push nu sunt configurate pe server.' }, { status: 503 })

  const admin = createAdminClient()
  const stats = await sendToDevices(admin, [{
    id: `test-${Date.now()}`, user_id: user.id,
    title: 'Notificările merg 🎉', body: 'Așa vei afla pe loc de campanii noi, drafturi și mesaje.', link: '/',
  }])
  if (!stats.sent) return NextResponse.json({ error: 'Niciun dispozitiv activ. Activează din nou notificările.' }, { status: 404 })
  return NextResponse.json({ ok: true, ...stats })
}
