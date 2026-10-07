import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, getSessionBrandId, verifyAdminSession, unauthorized, forbidden } from '@/lib/api-auth'
import { campaignMetrics, syncPostMetrics } from '@/lib/post-metrics'
import { limitRequest } from '@/lib/rate-limit'
import { logError } from '@/lib/log-error'

/** Brandul campaniei (sau un admin) — altfel null. */
async function authorize(campaignId: string) {
  const user = await getSessionUser()
  if (!user) return { res: unauthorized() }
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, brand_id').eq('id', campaignId).maybeSingle()
  if (!camp) return { res: NextResponse.json({ error: 'Campanie inexistentă' }, { status: 404 }) }
  if (!(await verifyAdminSession())) {
    const brandId = await getSessionBrandId(user.id)
    if (!brandId || brandId !== camp.brand_id) return { res: forbidden() }
  }
  return { admin, user }
}

// Metricile postărilor unei campanii
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'id lipsă' }, { status: 400 })
  const a = await authorize(id)
  if (a.res) return a.res
  try {
    return NextResponse.json(await campaignMetrics(a.admin!, id))
  } catch (e) {
    await logError(e, { source: 'server', url: '/api/brand/campaign-report' })
    return NextResponse.json({ rows: [], totals: null, error: 'Metricile nu sunt disponibile încă.' })
  }
}

// „Actualizează acum” — recitește metricile automate pentru campanie
export async function POST(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'id lipsă' }, { status: 400 })
  const a = await authorize(id)
  if (a.res) return a.res
  { const limited = await limitRequest(req, 'report-refresh', { maxRequests: 6, windowMs: 10 * 60 * 1000 }, a.user!.id); if (limited) return limited }
  try {
    await syncPostMetrics(a.admin!, { campaignId: id })
    return NextResponse.json(await campaignMetrics(a.admin!, id))
  } catch (e) {
    await logError(e, { source: 'server', url: '/api/brand/campaign-report' })
    return NextResponse.json({ error: 'Nu am putut actualiza metricile. Încearcă mai târziu.' }, { status: 500 })
  }
}
