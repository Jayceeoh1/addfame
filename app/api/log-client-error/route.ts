import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/log-error'
import { rateLimit } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/api-auth'

// Erori din browser (pagina a crăpat). Public, dar limitat și cu dimensiuni plafonate.
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimit(`client-error:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) return NextResponse.json({ ok: true })   // tăcut: nu dăm informații

    const raw = await req.text()
    if (raw.length > 8000) return NextResponse.json({ ok: true })
    const b = JSON.parse(raw || '{}')
    const err = new Error(String(b.message || 'Eroare client').slice(0, 500))
    err.stack = typeof b.stack === 'string' ? b.stack.slice(0, 4000) : undefined
    const user = await getSessionUser()
    await logError(err, { source: 'client', url: typeof b.url === 'string' ? b.url : null, userId: user?.id, context: { ua: String(req.headers.get('user-agent') || '').slice(0, 160), digest: b.digest } })
  } catch { /* ignorăm */ }
  return NextResponse.json({ ok: true })
}
