import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Campanii cu înscrieri deschise care expiră în 47.5–48.5 ore (fereastra de 2 zile)
  const now = new Date()
  const in47h30 = new Date(now.getTime() + 47.5 * 3600000).toISOString()
  const in48h30 = new Date(now.getTime() + 48.5 * 3600000).toISOString()

  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, title, brand_name, registration_opened_at, registration_deadline_days, platforms, niches, campaign_type, budget_per_influencer, offer_name, offer_value')
    .eq('status', 'ACTIVE')
    .eq('registrations_open', true)
    .not('registration_opened_at', 'is', null)

  if (!campaigns?.length) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 })
  }

  // Filtrează campaniile care expiră în ~48h
  const expiringSoon = campaigns.filter(c => {
    const days = c.registration_deadline_days || 2
    const expiry = new Date(new Date(c.registration_opened_at).getTime() + days * 86400000)
    return expiry.toISOString() >= in47h30 && expiry.toISOString() <= in48h30
  })

  if (!expiringSoon.length) {
    return NextResponse.json({ ok: true, checked: campaigns.length, sent: 0 })
  }

  let sent = 0

  for (const camp of expiringSoon) {
    const days = camp.registration_deadline_days || 2
    const expiry = new Date(new Date(camp.registration_opened_at).getTime() + days * 86400000)
    const expiryStr = expiry.toLocaleString('ro-RO', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    })

    // Toți influencerii aprobați care nu au aplicat deja
    const { data: alreadyApplied } = await admin
      .from('collaborations')
      .select('influencer_id')
      .eq('campaign_id', camp.id)

    const appliedIds = (alreadyApplied || []).map(c => c.influencer_id)

    let query = admin
      .from('influencers')
      .select('id, user_id, name, email, platforms, niches')
      .eq('approval_status', 'approved')
      .neq('email_reminders_enabled', false)

    if (appliedIds.length > 0) {
      query = query.not('id', 'in', `(${appliedIds.join(',')})`)
    }

    // Filtrare după platformă dacă campania are platforme specifice
    if (camp.platforms?.length) {
      query = query.overlaps('platforms', camp.platforms)
    }

    const { data: influencers } = await query

    if (!influencers?.length) continue

    for (const inf of influencers) {
      if (!inf.email) continue

      const isBarter = camp.campaign_type === 'barter'
      const rewardText = isBarter
        ? `Primești gratuit: <strong>${camp.offer_name || 'produs'}</strong>`
        : `Câștiguri: <strong>${camp.budget_per_influencer || 0} RON</strong>`

      const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px">
    <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">

      <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px 28px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-0.5px">AddFame</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px">platforma ta de influencer marketing</div>
      </div>

      <div style="padding:28px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px">⏳</div>
          <h1 style="font-size:20px;font-weight:800;color:#111827;margin:8px 0 4px">Mai sunt 2 zile!</h1>
          <p style="font-size:14px;color:#6b7280;margin:0">Înscrierile la această campanie se închid în curând</p>
        </div>

        <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:20px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
            ${isBarter ? '🎁 Campanie barter' : '💰 Campanie plătită'}
          </div>
          <div style="font-size:17px;font-weight:800;color:#111827;margin-bottom:4px">${camp.title}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:12px">de la <strong>${camp.brand_name}</strong></div>
          <div style="font-size:13px;color:#374151">${rewardText}</div>
          <div style="margin-top:12px">
            <div style="background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;display:inline-block">
              ⏰ Înscrieri până: ${expiryStr}
            </div>
          </div>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px">
          Bună, <strong>${inf.name || 'influencer'}</strong>! 👋<br><br>
          Mai ai doar <strong>2 zile</strong> să aplici la campania <strong>${camp.title}</strong>.<br>
          Nu rata această oportunitate — locurile se ocupă rapid!
        </p>

        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/influencer/campaigns/${camp.id}"
            style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;text-decoration:none;font-size:15px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
            Aplică acum →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px">
          Dacă nu mai dorești să primești emailuri de la AddFame,
          <a href="${APP_URL}/unsubscribe" style="color:#9ca3af">dezabonează-te</a>.
        </p>
      </div>
    </div>

    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:20px">
      © 2026 AddFame · addfame.ro
    </p>
  </div>
</body>
</html>`

      await sendEmail(inf.email, `⏳ Mai sunt 2 zile să aplici la "${camp.title}"`, html)

      // Notificare în platformă
      if (inf.user_id) {
        await admin.from('notifications').insert({
          user_id: inf.user_id,
          title: '⏳ Mai sunt 2 zile!',
          body: `Înscrierile la campania "${camp.title}" de la ${camp.brand_name} se închid în 2 zile. Aplică acum!`,
          link: `/influencer/campaigns/${camp.id}`,
          read: false,
        })
      }

      sent++
    }
  }

  return NextResponse.json({ ok: true, checked: campaigns.length, expiringSoon: expiringSoon.length, sent })
}
