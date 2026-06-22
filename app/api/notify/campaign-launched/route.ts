import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function POST(req: NextRequest) {
  try {
    const { campaignId } = await req.json()
    if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch campania
    const { data: camp, error: campErr } = await admin
      .from('campaigns')
      .select('id, title, brand_name, description, platforms, niches, campaign_type, budget_per_influencer, offer_name, offer_value, offer_description, max_influencers, deadline')
      .eq('id', campaignId)
      .single()

    if (campErr || !camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Fetch toți influencerii aprobați cu opt-in email
    let query = admin
      .from('influencers')
      .select('id, user_id, name, email, platforms, niches')
      .eq('approval_status', 'approved')
      .neq('email_reminders_enabled', false)

    // Filtrare după platformă dacă campania specifică platforme
    if (camp.platforms?.length) {
      query = query.overlaps('platforms', camp.platforms)
    }

    const { data: influencers } = await query

    if (!influencers?.length) return NextResponse.json({ ok: true, sent: 0 })

    const isBarter = camp.campaign_type === 'barter'
    const rewardText = isBarter
      ? `Primești gratuit: <strong>${camp.offer_name || 'produs'}</strong>${camp.offer_description ? `<br><span style="color:#6b7280;font-size:13px">${camp.offer_description}</span>` : ''}`
      : `Câștiguri: <strong>${camp.budget_per_influencer || 0} RON</strong>`

    const deadlineStr = camp.deadline
      ? new Date(camp.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
      : null

    let sent = 0

    // Trimitem în batch-uri de 50 ca să nu depășim rate limit Resend
    const BATCH = 50
    for (let i = 0; i < influencers.length; i += BATCH) {
      const batch = influencers.slice(i, i + BATCH)

      await Promise.all(batch.map(async (inf) => {
        if (!inf.email) return

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
          <div style="font-size:48px">🚀</div>
          <h1 style="font-size:20px;font-weight:800;color:#111827;margin:8px 0 4px">Campanie nouă disponibilă!</h1>
          <p style="font-size:14px;color:#6b7280;margin:0">O oportunitate nouă te așteaptă pe AddFame</p>
        </div>

        <div style="background:linear-gradient(135deg,#faf5ff,#fdf2f8);border:1.5px solid #e9d5ff;border-radius:12px;padding:20px;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">
            ${isBarter ? '🎁 Campanie barter' : '💰 Campanie plătită'}
          </div>
          <div style="font-size:19px;font-weight:900;color:#111827;margin-bottom:4px">${camp.title}</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:16px">de la <strong>${camp.brand_name}</strong></div>

          <div style="background:white;border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:4px">RECOMPENSĂ</div>
            <div style="font-size:14px;color:#111827">${rewardText}</div>
          </div>

          ${camp.max_influencers ? `
          <div style="background:white;border-radius:8px;padding:12px;margin-bottom:12px">
            <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:4px">LOCURI DISPONIBILE</div>
            <div style="font-size:14px;font-weight:700;color:#7c3aed">${camp.max_influencers} locuri</div>
          </div>` : ''}

          ${deadlineStr ? `
          <div style="background:#fef3c7;border-radius:8px;padding:10px 12px">
            <div style="font-size:12px;color:#d97706;font-weight:700">⏰ Deadline postare: ${deadlineStr}</div>
          </div>` : ''}
        </div>

        ${camp.description ? `
        <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px">
          ${camp.description.length > 200 ? camp.description.substring(0, 200) + '...' : camp.description}
        </p>` : ''}

        <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px">
          Bună, <strong>${inf.name || 'influencer'}</strong>! 👋<br><br>
          O campanie nouă a fost lansată pe AddFame și se potrivește profilului tău.<br>
          <strong>Locurile se ocupă rapid</strong> — aplică acum ca să nu ratezi oportunitatea!
        </p>

        <div style="text-align:center;margin:28px 0">
          <a href="${APP_URL}/influencer/campaigns/${camp.id}"
            style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;text-decoration:none;font-size:15px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
            Vezi campania și aplică →
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

        await sendEmail(inf.email, `🚀 Campanie nouă: "${camp.title}" de la ${camp.brand_name}`, html)

        // Notificare în platformă
        if (inf.user_id) {
          await admin.from('notifications').insert({
            user_id: inf.user_id,
            title: '🚀 Campanie nouă disponibilă!',
            body: `"${camp.title}" de la ${camp.brand_name} — ${isBarter ? camp.offer_name || 'produs gratuit' : `${camp.budget_per_influencer} RON`}. Aplică acum!`,
            link: `/influencer/campaigns/${camp.id}`,
            read: false,
          })
        }

        sent++
      }))

      // Pauză între batch-uri ca să respectăm rate limit-ul Resend
      if (i + BATCH < influencers.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    return NextResponse.json({ ok: true, sent, total: influencers.length })
  } catch (e: any) {
    console.error('[notify/campaign-launched]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
