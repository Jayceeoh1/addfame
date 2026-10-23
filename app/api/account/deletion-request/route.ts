import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/api-auth'
import { limitRequest } from '@/lib/rate-limit'
import { maskEmail } from '@/lib/account-deletion'
import {
  getOwnDeletionStatus,
  submitAuthenticatedDeletion,
  submitUnauthenticatedDeletion,
} from '@/lib/account-deletion-server'

export const dynamic = 'force-dynamic'

function json(http: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status: http })
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return json(200, { ok: true, authenticated: false })
  const status = await getOwnDeletionStatus(user)
  return json(status.http, {
    ...status.body,
    authenticated: true,
    email: user.email || '',
    emailMasked: maskEmail(user.email),
  })
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  const limited = await limitRequest(
    req,
    'account-deletion',
    { maxRequests: 8, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
    user?.id,
  )
  if (limited) return limited

  let body: { email?: string; source?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const source = body.source === 'app' ? 'app' : 'web'

  if (!user) {
    const out = await submitUnauthenticatedDeletion(String(body.email || ''), source)
    return json(out.http, { ...out.body, authenticated: false })
  }

  const out = await submitAuthenticatedDeletion(user, source)
  return json(out.http, { ...out.body, authenticated: true, emailMasked: maskEmail(user.email) })
}
