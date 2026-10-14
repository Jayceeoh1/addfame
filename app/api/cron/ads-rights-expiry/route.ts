// Zilnic: brandul e anunțat cu ~30 de zile înainte să expire perioada de reclame plătite (6 luni)
// pentru clipurile din campaniile lui. O singură dată per contract (cesiune_contracts.ads_reminder_sent_at, SQL 38).
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rightsFor, ADS_MONTHS, ADS_REMINDER_DAYS } from '@/lib/rights'
import { campaignName } from '@/lib/campaign-name'
import { emailAdsRightsExpiring } from '@/lib/email'

export const maxDuration = 60

function authorized(req: NextRequest) {
  const s = process.env.CRON_SECRET
  if (!s) return false
  return req.headers.get('x-cron-secret') === s
    || req.nextUrl.searchParams.get('secret') === s
    || req.headers.get('authorization') === `Bearer ${s}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const now = new Date()
  // semnate acum între (6 luni + o marjă) și (6 luni − 30 de zile) — restul le filtrăm exact mai jos
  const from = new Date(now); from.setUTCMonth(from.getUTCMonth() - ADS_MONTHS - 1)
  const to = new Date(now); to.setUTCMonth(to.getUTCMonth() - ADS_MONTHS); to.setUTCDate(to.getUTCDate() + ADS_REMINDER_DAYS + 1)

  const { data: rows, error } = await db.from('cesiune_contracts')
    .select('id, campaign_id, influencer_name, signed_at, clauses_version')
    .eq('status', 'signed').is('ads_reminder_sent_at', null).not('campaign_id', 'is', null)
    .gte('signed_at', from.toISOString()).lte('signed_at', to.toISOString())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const due = (rows || []).filter((r: any) => {
    const ri = rightsFor(r, now)
    return ri.state === 'ads' && ri.daysLeftAds <= ADS_REMINDER_DAYS
  })
  if (!due.length) return NextResponse.json({ ok: true, reminded: 0 })

  // revendicăm întâi (fără dubluri dacă rulează de două ori)
  const { data: claimed } = await db.from('cesiune_contracts').update({ ads_reminder_sent_at: now.toISOString() })
    .in('id', due.map((r: any) => r.id)).is('ads_reminder_sent_at', null).select('id')
  const claimedIds = new Set((claimed || []).map((r: any) => r.id))
  const byCampaign = new Map<string, any[]>()
  for (const r of due) if (claimedIds.has(r.id)) byCampaign.set(r.campaign_id, [...(byCampaign.get(r.campaign_id) || []), r])

  let notified = 0
  for (const [campaignId, items] of byCampaign) {
    try {
      const { data: camp } = await db.from('campaigns').select('id, title, offer_name, product_name, brand_id').eq('id', campaignId).maybeSingle()
      if (!camp?.brand_id) continue
      const { data: brand } = await db.from('brands').select('user_id, name, email').eq('id', camp.brand_id).maybeSingle()
      if (!brand) continue
      const name = campaignName(camp as any)
      const list = items.map((r: any) => ({
        creator: r.influencer_name,
        adsUntil: new Date(rightsFor(r, now).adsUntil).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }),
      }))
      if (brand.user_id) await db.from('notifications').insert({
        user_id: brand.user_id,
        title: '⏳ Reclamele expiră curând',
        body: `Pentru „${name}”, perioada de reclame plătite se încheie în curând la ${list.length === 1 ? `clipul lui ${list[0].creator} (${list[0].adsUntil})` : `${list.length} clipuri`}. După aceea, doar folosire organică.`,
        link: `/brand/campaigns/${camp.id}`,
        read: false,
      })
      if (brand.email) await emailAdsRightsExpiring(brand.email, brand.name || 'Brand', { campaign: name, campaignId: camp.id, items: list })
      notified++
    } catch (e: any) { console.error('[ads-rights-expiry]', e?.message) }
  }
  return NextResponse.json({ ok: true, reminded: claimedIds.size, brands: notified })
}
