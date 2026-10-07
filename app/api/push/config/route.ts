import { NextResponse } from 'next/server'
import { pushConfig } from '@/lib/push'

// Cheia publică VAPID (nu e secretă) — citită la rulare, ca să nu depindă de momentul build-ului.
export async function GET() {
  const { publicKey, enabled } = pushConfig()
  return NextResponse.json({ enabled, publicKey: enabled ? publicKey : null }, { headers: { 'Cache-Control': 'no-store' } })
}
