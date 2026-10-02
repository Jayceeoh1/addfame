// Helper-e de autentificare pentru rutele API (app/api/**/route.ts).
// Folosire:
//   const user = await getSessionUser(); if (!user) return unauthorized()
//   const adminSession = await verifyAdminSession(); if (!adminSession) return forbidden()

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'

export { verifyAdminSession }

/** Utilizatorul logat din cookie-ul de sesiune, sau null. */
export async function getSessionUser() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}

/** Id-ul brandului utilizatorului logat, sau null. */
export async function getSessionBrandId(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('brands').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

export const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

export const forbidden = () =>
  NextResponse.json({ error: 'Forbidden' }, { status: 403 })

/**
 * Poate utilizatorul logat să trimită email acestui influencer?
 * Da dacă e admin, sau dacă e brand și influencerul are o colaborare la una din campaniile lui.
 */
export async function canEmailInfluencer(userId: string, influencerEmail: string): Promise<boolean> {
  if (await verifyAdminSession()) return true
  const admin = createAdminClient()
  const brandId = await getSessionBrandId(userId)
  if (!brandId) return false
  const { data: inf } = await admin
    .from('influencers').select('id').eq('email', influencerEmail).limit(1).maybeSingle()
  if (!inf) return false
  const { data: campaigns } = await admin.from('campaigns').select('id').eq('brand_id', brandId)
  const campaignIds = (campaigns || []).map((c: any) => c.id)
  if (campaignIds.length === 0) return false
  const { count } = await admin
    .from('collaborations')
    .select('id', { count: 'exact', head: true })
    .eq('influencer_id', inf.id)
    .in('campaign_id', campaignIds)
  return (count ?? 0) > 0
}

/** Escapează text de utilizator înainte de a-l pune în HTML de email. */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Secretul pentru cron-uri: acceptă atât header-ul trimis de Vercel Cron
 * (Authorization: Bearer <CRON_SECRET>) cât și x-cron-secret (cron-job.org etc.).
 * Refuză totul dacă CRON_SECRET nu e setat.
 */
export function isValidCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = req.headers.get('authorization')
  if (bearer === `Bearer ${secret}`) return true
  return req.headers.get('x-cron-secret') === secret
}
