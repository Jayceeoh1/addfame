import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

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

  const admin = createAdminClient()
  const now = new Date()
  let strikesGiven = 0
  let blacklisted = 0

  // Fetch colaborări active fără dovadă trimisă
  const { data: collabs } = await admin
    .from('collaborations')
    .select(`
      id, influencer_id, post_deadline_days, package_sent_at, package_received_at, created_at,
      campaigns(id, title, brand_name, deadline),
      influencers(id, name, email, strikes, blacklisted, user_id)
    `)
    .eq('status', 'ACTIVE')
    .is('deliverable_submitted_at', null)
    .is('deliverable_approved_at', null)

  if (!collabs?.length) {
    return NextResponse.json({ ok: true, checked: 0, strikesGiven: 0 })
  }

  for (const collab of collabs) {
    const inf = collab.influencers as any
    const camp = collab.campaigns as any

    if (!inf || inf.blacklisted) continue

    // Deadline-ul începe DOAR după ce influencerul a bifat că a primit coletul
    // Dacă nu a bifat primirea, nu dăm strike
    if (!collab.package_received_at) continue

    const referenceDate = new Date(collab.package_received_at)
    const deadlineDays = collab.post_deadline_days || 5
    const deadline = new Date(referenceDate.getTime() + deadlineDays * 86400000)

    // Nu a trecut deadline-ul
    if (now < deadline) continue

    // Verifică dacă am mai dat strike pentru această colaborare
    const { data: existingStrike } = await admin
      .from('influencer_strikes')
      .select('id')
      .eq('influencer_id', inf.id)
      .eq('collaboration_id', collab.id)
      .limit(1)

    if (existingStrike?.length) continue // Strike deja dat

    // Dă strike
    const newStrikes = (inf.strikes || 0) + 1
    const shouldBlacklist = newStrikes >= 2

    await admin.from('influencer_strikes').insert({
      influencer_id: inf.id,
      collaboration_id: collab.id,
      reason: `Nu a postat în termenul limită pentru campania "${camp?.title}"`,
      given_by: null, // automat
    })

    await admin.from('influencers').update({
      strikes: newStrikes,
      ...(shouldBlacklist ? {
        blacklisted: true,
        blacklisted_at: now.toISOString(),
        blacklisted_reason: `Blacklisted automat — ${newStrikes} strike-uri acumulate`,
      } : {}),
    }).eq('id', inf.id)

    // Setează colaborarea ca expired
    await admin.from('collaborations').update({
      status: 'EXPIRED',
    }).eq('id', collab.id)

    strikesGiven++
    if (shouldBlacklist) blacklisted++

    // Email influencer
    if (inf.email) {
      await sendEmail(
        inf.email,
        shouldBlacklist
          ? '🚫 Contul tău AddFame a fost suspendat'
          : `⚠️ Strike ${newStrikes}/2 — ${camp?.title}`,
        `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
<div style="background:${shouldBlacklist ? '#dc2626' : '#f97316'};padding:24px;text-align:center">
  <div style="font-size:24px;font-weight:900;color:white">AddFame</div>
</div>
<div style="padding:24px">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:40px">${shouldBlacklist ? '🚫' : '⚠️'}</div>
    <h1 style="font-size:18px;font-weight:800;color:#111827;margin:8px 0">
      ${shouldBlacklist ? 'Cont suspendat' : `Strike ${newStrikes} din 2`}
    </h1>
  </div>
  <p style="font-size:14px;color:#374151;line-height:1.7">
    Bună, <strong>${inf.name}</strong>!<br><br>
    ${shouldBlacklist
      ? `Contul tău a fost <strong>suspendat</strong> deoarece nu ai livrat conținutul pentru campania <strong>"${camp?.title}"</strong> și ai acumulat ${newStrikes} strike-uri.<br><br>Nu mai poți aplica la campanii noi. Contactează-ne la <a href="mailto:contact@addfame.ro">contact@addfame.ro</a> pentru a discuta situația.`
      : `Ai primit un <strong>strike automat</strong> deoarece nu ai postat conținutul în termenul limită pentru campania <strong>"${camp?.title}"</strong>.<br><br>⚠️ La <strong>2 strike-uri</strong> contul tău va fi suspendat automat. Te rugăm să respecți termenele viitoare.`
    }
  </p>
  ${!shouldBlacklist ? `<div style="text-align:center;margin-top:20px">
    <a href="${APP_URL}/influencer/collaborations" style="background:#7c3aed;color:white;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block">
      Vezi colaborările →
    </a>
  </div>` : ''}
</div></div></div></body></html>`
      )
    }

    // Notificare în platformă
    if (inf.user_id) {
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: shouldBlacklist ? '🚫 Contul tău a fost suspendat' : `⚠️ Strike ${newStrikes}/2`,
        body: shouldBlacklist
          ? 'Ai acumulat 2 strike-uri. Contul tău a fost suspendat. Contactează-ne pentru detalii.'
          : `Ai primit un strike pentru campania "${camp?.title}". Mai ai ${2 - newStrikes} strike${2 - newStrikes === 1 ? '' : '-uri'} până la suspendare.`,
        link: '/influencer/collaborations',
        read: false,
      })
    }
  }

  // Email admin cu raportul zilnic dacă au fost strike-uri
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminEmail && strikesGiven > 0) {
    await sendEmail(
      adminEmail,
      `📊 Raport strike-uri zilnic — ${strikesGiven} strike-uri acordate`,
      `<p>Strike-uri acordate azi: <strong>${strikesGiven}</strong><br>
      Blacklist-uri noi: <strong>${blacklisted}</strong><br>
      <a href="${APP_URL}/admin/influencers">Vezi influencerii →</a></p>`
    )
  }

  return NextResponse.json({ ok: true, checked: collabs.length, strikesGiven, blacklisted })
}
