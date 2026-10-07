import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronRequest } from '@/lib/api-auth'
import { sendEmailBatch } from '@/lib/campaign-alerts'
import { inLastDayWindow, registrationExpiry, expiryLabel, reminderEmailHtml } from '@/lib/registration-reminders'
import { logError } from '@/lib/log-error'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

// Zilnic (sau orar): creatorii INVITAȚI care n-au răspuns primesc un memento în ultima zi a înscrierilor.
// O singură dată per invitație (collaborations.reg_reminder_sent_at, SQL 25).
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const now = new Date()
  try {
    const { data: campaigns } = await admin.from('campaigns')
      .select('id, title, brand_name, registration_opened_at, registration_deadline_days')
      .eq('status', 'ACTIVE').eq('registrations_open', true).not('registration_opened_at', 'is', null)
    const due = (campaigns || []).filter(c => inLastDayWindow(c, now))
    let sent = 0

    for (const camp of due) {
      // revendicare: doar invitațiile fără memento trimis
      const { data: claimed, error } = await admin.from('collaborations')
        .update({ reg_reminder_sent_at: now.toISOString() })
        .eq('campaign_id', camp.id).eq('status', 'INVITED').is('reg_reminder_sent_at', null)
        .select('id, influencer_id')
      if (error) {
        if (error.code === '42703') return NextResponse.json({ ok: false, error: 'Rulează SQL 25 (reg_reminder_sent_at lipsește).' }, { status: 500 })
        throw new Error('claim: ' + error.message)
      }
      if (!claimed?.length) continue

      const { data: infs } = await admin.from('influencers')
        .select('id, user_id, name, email, email_reminders_enabled, settings').in('id', claimed.map(c => c.influencer_id))
      const when = expiryLabel(registrationExpiry(camp)!, now)

      const rows = (infs || []).filter(i => i.user_id).map(i => ({
        user_id: i.user_id, read: false, link: '/influencer/collaborations',
        title: '⏰ Invitația ta expiră curând',
        body: `Invitația la „${camp.title}” se închide ${when}. Acceptă sau refuză acum.`,
      }))
      if (rows.length) await admin.from('notifications').insert(rows)

      await sendEmailBatch((infs || [])
        .filter(i => i.email && i.email_reminders_enabled !== false && (i.settings as any)?.notifications?.email_notifications !== false)
        .map(i => ({
          to: i.email, subject: `⏰ Invitația la „${camp.title}” se închide ${when}`,
          html: reminderEmailHtml({
            name: i.name, heading: 'Invitația ta expiră curând',
            text: `Ai fost invitat(ă) la campania de mai jos și încă n-ai răspuns. După închiderea înscrierilor, invitația nu mai poate fi acceptată.`,
            campaignTitle: camp.title, brandName: camp.brand_name, when,
            ctaUrl: `${APP_URL}/influencer/collaborations`, cta: 'Răspunde la invitație',
          }),
        })))
      sent += rows.length
    }
    return NextResponse.json({ ok: true, checked: campaigns?.length || 0, due: due.length, sent })
  } catch (e) {
    await logError(e, { source: 'cron', url: '/api/cron/registration-reminder' })
    return NextResponse.json({ ok: false, error: 'Eroare cron' }, { status: 500 })
  }
}
