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

  // Gasim campaniile cu inscrieri deschise care expira in 4.5-5.5 ore
  const now = new Date()
  const in4h30 = new Date(now.getTime() + 4.5 * 3600000).toISOString()
  const in5h30 = new Date(now.getTime() + 5.5 * 3600000).toISOString()

  // Campaigns cu registration_opened_at si registration_deadline_days
  // Vrem cele unde: registration_opened_at + deadline_days * 24h e intre in4h30 si in5h30
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, title, brand_name, registration_opened_at, registration_deadline_days')
    .eq('status', 'ACTIVE')
    .eq('registrations_open', true)
    .not('registration_opened_at', 'is', null)

  if (!campaigns?.length) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 })
  }

  // Filtreaza cele care expira in ~5 ore
  const expiringSoon = campaigns.filter(c => {
    const days = c.registration_deadline_days || 2
    const expiry = new Date(new Date(c.registration_opened_at).getTime() + days * 86400000)
    return expiry.toISOString() >= in4h30 && expiry.toISOString() <= in5h30
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

    // Gasim influencerii cu invitatie INVITED la aceasta campanie
    const { data: collabs } = await admin
      .from('collaborations')
      .select('id, influencer_id')
      .eq('campaign_id', camp.id)
      .eq('status', 'INVITED')

    if (!collabs?.length) continue

    for (const collab of collabs) {
      // Gasim emailul influencerului
      const { data: inf } = await admin
        .from('influencers')
        .select('name, email')
        .eq('id', collab.influencer_id)
        .single()

      if (!inf?.email) continue

      const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px">

    <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#f97316,#ec4899);padding:32px 28px;text-align:center">
        <div style="font-size:28px;font-weight:900;color:white;letter-spacing:-0.5px">AddFame</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px">platforma ta de influencer marketing</div>
      </div>

      <!-- Body -->
      <div style="padding:28px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px">⏰</div>
          <h1 style="font-size:20px;font-weight:800;color:#111827;margin:8px 0 4px">Mai ai doar 5 ore!</h1>
          <p style="font-size:14px;color:#6b7280;margin:0">Invitația ta la campania de mai jos expiră în curând</p>
        </div>

        <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:20px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">🎁 Campanie barter</div>
          <div style="font-size:17px;font-weight:800;color:#111827;margin-bottom:4px">${camp.title}</div>
          <div style="font-size:13px;color:#6b7280">de la ${camp.brand_name}</div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
            <div style="background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;display:inline-block">
              Expiră: ${expiryStr}
            </div>
          </div>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px">
          Bună, <strong>${inf.name || 'influencer'}</strong>!<br><br>
          Ai primit o invitație la campania <strong>${camp.title}</strong> și mai ai doar <strong>~5 ore</strong> să răspunzi.<br>
          Nu rata această oportunitate — acceptă sau refuză acum!
        </p>

        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/influencer/collaborations"
            style="background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;font-size:15px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
            Vezi invitația →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px">
          Dacă nu mai dorești să primești emailuri de la AddFame, <a href="${APP_URL}/unsubscribe" style="color:#9ca3af">dezabonează-te</a>.
        </p>
      </div>
    </div>

    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:20px">
      © 2026 AddFame · addfame.ro
    </p>
  </div>
</body>
</html>`

      await sendEmail(inf.email, `⏰ Mai ai 5 ore să accepți invitația la "${camp.title}"`, html)

      // Notificare si in platforma
      const { data: infUser } = await admin
        .from('influencers')
        .select('user_id')
        .eq('id', collab.influencer_id)
        .single()

      if (infUser?.user_id) {
        await admin.from('notifications').insert({
          user_id: infUser.user_id,
          title: '⏰ Mai ai 5 ore!',
          body: `Invitația ta la campania "${camp.title}" expiră în curând. Răspunde acum!`,
          link: '/influencer/collaborations',
          read: false,
        })
      }

      sent++
    }
  }

  return NextResponse.json({ ok: true, checked: campaigns.length, expiringSoon: expiringSoon.length, sent })
}
