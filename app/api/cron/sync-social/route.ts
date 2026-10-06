import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncInstagram, refreshTokenIfNeeded } from '@/lib/instagram'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  // Acceptă atât x-cron-secret (cron-job.org) cât și Authorization Bearer (Vercel)
  const cronSecret = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  
  const validSecret = cronSecret === process.env.CRON_SECRET
  const validBearer = authHeader === `Bearer ${process.env.CRON_SECRET}`
  
  if (!validSecret && !validBearer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Cron] Starting social sync...')
  let igSynced = 0, igErrors = 0

  const { data: rows } = await admin
    .from('instagram_private')
    .select('influencer_id, access_token, token_expires')

  for (const r of rows || []) {
    try {
      const token = await refreshTokenIfNeeded(admin, r.influencer_id, r.access_token, r.token_expires)
      if (!token) {
        // expirat — creatorul trebuie să se reconecteze
        await admin.from('influencers').update({ instagram_connected: false }).eq('id', r.influencer_id)
        igErrors++; continue
      }
      const res = await syncInstagram(admin, r.influencer_id, token)
      if (res.ok) igSynced++
      else {
        igErrors++
        if (res.reason === 'token' || res.reason === 'not_professional')
          await admin.from('influencers').update({ instagram_connected: false }).eq('id', r.influencer_id)
      }
      await new Promise(r => setTimeout(r, 250))
    } catch (e: any) {
      console.error(`[Cron] IG error for ${r.influencer_id}:`, e.message)
      igErrors++
    }
  }

  console.log(`[Cron] Done. IG: ${igSynced} synced, ${igErrors} errors`)
  return NextResponse.json({ ok: true, ig: { synced: igSynced, errors: igErrors } })
}
