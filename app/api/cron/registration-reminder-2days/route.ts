import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronRequest } from '@/lib/api-auth'
import { alertDecision, loadCreators, sendEmailBatch, type AlertCampaign } from '@/lib/campaign-alerts'
import { inTwoDayWindow, registrationExpiry, expiryLabel, reminderEmailHtml } from '@/lib/registration-reminders'
import { logError } from '@/lib/log-error'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

// Zilnic: cu ~2 zile înainte de închiderea înscrierilor, creatorii potriviți (aceeași țintire ca alertele)
// care n-au aplicat încă primesc un memento. O singură dată per campanie (campaigns.reg_reminder_2d_sent_at, SQL 25).
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const now = new Date()
  try {
    const { data: campaigns } = await admin.from('campaigns')
      .select('id, title, brand_name, campaign_type, platforms, min_followers_target, budget_per_influencer, offer_name, registration_opened_at, registration_deadline_days')
      .eq('status', 'ACTIVE').eq('registrations_open', true).not('registration_opened_at', 'is', null)
    const due = (campaigns || []).filter(c => inTwoDayWindow(c, now))
    if (!due.length) return NextResponse.json({ ok: true, checked: campaigns?.length || 0, due: 0, sent: 0 })

    const creators = await loadCreators(admin)
    let sent = 0
    for (const c of due) {
      const { data: claimed, error } = await admin.from('campaigns')
        .update({ reg_reminder_2d_sent_at: now.toISOString() })
        .eq('id', c.id).is('reg_reminder_2d_sent_at', null).select('id')
      if (error) {
        if (error.code === '42703') return NextResponse.json({ ok: false, error: 'Rulează SQL 25 (reg_reminder_2d_sent_at lipsește).' }, { status: 500 })
        throw new Error('claim: ' + error.message)
      }
      if (!claimed?.length) continue

      const { data: target } = await admin.from('campaigns').select('elig_tiers, elig_niches').eq('id', c.id).maybeSingle()
      const camp: AlertCampaign = { ...(c as any), ...(target || {}) }
      const { data: applied } = await admin.from('collaborations').select('influencer_id').eq('campaign_id', c.id)
      const skip = new Set((applied || []).map(a => a.influencer_id))
      const picked = creators.filter(cr => !skip.has(cr.id)).map(cr => ({ cr, d: alertDecision(camp, cr) })).filter(x => x.d.send)
      const when = expiryLabel(registrationExpiry(c)!, now)

      const rows = picked.map(({ cr }) => ({
        user_id: cr.user_id, read: false, link: `/influencer/campaigns/${c.id}`,
        title: '⏳ Mai sunt 2 zile să aplici',
        body: `Înscrierile la „${c.title}” de la ${c.brand_name || 'brand'} se închid ${when}.`,
      }))
      for (let i = 0; i < rows.length; i += 500) await admin.from('notifications').insert(rows.slice(i, i + 500))

      await sendEmailBatch(picked.filter(x => x.d.email).map(({ cr }) => ({
        to: String(cr.email), subject: `⏳ Mai sunt 2 zile să aplici la „${c.title}”`,
        html: reminderEmailHtml({
          name: cr.name, heading: 'Mai sunt 2 zile să aplici',
          text: 'Campania de mai jos se potrivește profilului tău, iar înscrierile se închid în curând.',
          campaignTitle: c.title, brandName: c.brand_name, when,
          ctaUrl: `${APP_URL}/influencer/campaigns/${c.id}`, cta: 'Vezi campania și aplică',
        }),
      })))
      sent += rows.length
    }
    return NextResponse.json({ ok: true, checked: campaigns?.length || 0, due: due.length, sent })
  } catch (e) {
    await logError(e, { source: 'cron', url: '/api/cron/registration-reminder-2days' })
    return NextResponse.json({ ok: false, error: 'Eroare cron' }, { status: 500 })
  }
}
