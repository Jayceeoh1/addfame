import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronRequest } from '@/lib/api-auth'
import { syncPostMetrics } from '@/lib/post-metrics'
import { logError } from '@/lib/log-error'

// Zilnic, după sync-social: creează rândurile pentru postările noi și actualizează metricile automate.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const stats = await syncPostMetrics(createAdminClient())
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    await logError(e, { source: 'cron', url: '/api/cron/post-metrics' })
    return NextResponse.json({ ok: false, error: 'Eroare cron' }, { status: 500 })
  }
}
