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

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM
const TWILIO_TEMPLATE_SID = process.env.TWILIO_TEMPLATE_REMINDER_V2_SID || process.env.TWILIO_TEMPLATE_REMINDER_SID

function normalizePhone(phone: string): string | null {
  if (!phone) return null
  let p = phone.replace(/[\s\-()]/g, '')
  if (p.startsWith('07') && p.length === 10) p = '+4' + p
  else if (p.startsWith('7') && p.length === 9) p = '+40' + p
  else if (!p.startsWith('+')) p = '+' + p
  return p
}

async function sendWhatsApp(
  phone: string,
  name: string,
  label: string,
  campaignTitle: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const to = normalizePhone(phone)
  if (!to || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !TWILIO_TEMPLATE_SID) {
    return { success: false, error: 'Missing Twilio config' }
  }
  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: TWILIO_WHATSAPP_FROM,
      ContentSid: TWILIO_TEMPLATE_SID,
      ContentVariables: JSON.stringify({ '1': name, '2': label, '3': campaignTitle }),
    })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (res.ok) {
      return { success: true, sid: data.sid }
    } else {
      return { success: false, error: data.message || 'Twilio error' }
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

const THRESHOLDS = [
  { hours: 48, flag: 'reminder_48h_sent', label: '2 zile', emailSubjectLabel: '2 zile', tolerance: 12 },
  { hours: 24, flag: 'reminder_24h_sent', label: '1 zi', emailSubjectLabel: '24 de ore', tolerance: 12 },
  { hours: 12, flag: 'reminder_12h_sent', label: '12 ore', emailSubjectLabel: '12 ore', tolerance: 12 },
]

function buildEmailHtml(name: string, campTitle: string, brandName: string, deadlineStr: string, deadlineTime: string, urgencyText: string, headline: string, subline: string) {
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">

  <div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:28px;text-align:center">
    <div style="font-size:24px;font-weight:900;color:white">AddFame</div>
  </div>

  <div style="padding:28px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px">🚨</div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:8px 0">${headline}</h1>
      <p style="font-size:13px;color:#6b7280;margin:0">${subline}</p>
    </div>

    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <p style="font-size:12px;font-weight:700;color:#dc2626;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em">Deadline postare</p>
      <p style="font-size:18px;font-weight:900;color:#111827;margin:0">${deadlineStr}, ora ${deadlineTime}</p>
    </div>

    <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:14px;margin-bottom:20px">
      <p style="font-size:11px;font-weight:700;color:#7c3aed;margin:0 0 4px;text-transform:uppercase">Campanie</p>
      <p style="font-size:15px;font-weight:800;color:#111827;margin:0 0 2px">${campTitle}</p>
      <p style="font-size:12px;color:#6b7280;margin:0">de la ${brandName}</p>
    </div>

    <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:20px">
      Bună, <strong>${name}</strong>! 👋<br><br>
      Trebuie să postezi conținutul și să trimiți dovada pe AddFame până pe <strong>${deadlineStr}</strong>.<br><br>
      ${urgencyText}
    </p>

    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/influencer/collaborations"
        style="background:linear-gradient(135deg,#dc2626,#f97316);color:white;text-decoration:none;font-size:15px;font-weight:900;padding:14px 32px;border-radius:12px;display:inline-block">
        📤 Trimite dovada acum →
      </a>
    </div>

    <div style="background:#f3f4f6;border-radius:10px;padding:12px;text-align:center">
      <p style="font-size:12px;color:#6b7280;margin:0">
        Dacă ai nevoie de timp suplimentar, contactează-ne la
        <a href="mailto:contact@addfame.ro" style="color:#7c3aed;font-weight:700">contact@addfame.ro</a>
      </p>
    </div>
  </div>
</div>
</div>
</body></html>`
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  let sent = 0

  const { data: collabs } = await admin
    .from('collaborations')
    .select(`
      id, post_deadline_days, package_sent_at, package_received_at, created_at,
      reminder_48h_sent, reminder_24h_sent, reminder_12h_sent,
      campaigns(id, title, brand_name),
      influencers(id, name, email, phone, user_id, strikes)
    `)
    .eq('status', 'ACTIVE')
    .is('deliverable_submitted_at', null)
    .is('deliverable_approved_at', null)

  if (!collabs?.length) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 })
  }

  for (const collab of collabs) {
    const inf = collab.influencers as any
    const camp = collab.campaigns as any
    if (!inf || !camp) continue
    if (!collab.package_received_at) continue

    const referenceDate = new Date(collab.package_received_at)
    const deadlineDays = collab.post_deadline_days || 5
    const deadline = new Date(referenceDate.getTime() + deadlineDays * 86400000)
    const hoursLeft = (deadline.getTime() - now.getTime()) / 3600000

    for (const t of THRESHOLDS) {
      const alreadySent = (collab as any)[t.flag]
      if (alreadySent) continue
      if (hoursLeft > t.hours + t.tolerance || hoursLeft < t.hours - t.tolerance) continue

      const deadlineStr = deadline.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
      const deadlineTime = deadline.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })

      const hasStrike = (inf.strikes || 0) > 0
      const urgencyText = hasStrike
        ? `⚠️ Ai deja ${inf.strikes} strike! Dacă ratezi și acest deadline vei fi suspendat automat.`
        : `La ratarea deadline-ului vei primi un <strong>strike automat</strong>. Ai deja ${inf.strikes || 0}/2 strike-uri.`

      const headline = t.hours === 48 ? 'Mai ai doar 2 zile!' : t.hours === 24 ? 'Mai ai doar 24 de ore!' : 'Ultimele 12 ore!'
      const subline = t.hours === 12 ? 'Postează acum — timpul aproape s-a scurs' : 'Grăbește-te — deadline-ul se apropie rapid'

      // ── Email ──────────────────────────────────────────────────────────
      if (inf.email) {
        await sendEmail(
          inf.email,
          `🚨 URGENT: Mai ai ${t.emailSubjectLabel} să postezi pentru "${camp.title}"`,
          buildEmailHtml(inf.name, camp.title, camp.brand_name, deadlineStr, deadlineTime, urgencyText, headline, subline)
        )
      }

      // ── WhatsApp ── cu logging ─────────────────────────────────────────
      if (inf.phone) {
        const waResult = await sendWhatsApp(inf.phone, inf.name, t.label, camp.title)

        // Logăm rezultatul în whatsapp_logs
        await admin.from('whatsapp_logs').insert({
          influencer_id: inf.id,
          influencer_name: inf.name,
          phone: normalizePhone(inf.phone),
          campaign_id: camp.id,
          campaign_title: camp.title,
          collaboration_id: collab.id,
          reminder_type: t.label, // '2 zile', '1 zi', '12 ore'
          message_body: `Reminder ${t.label}: ${camp.title}`,
          twilio_message_sid: waResult.sid || null,
          success: waResult.success,
          error_message: waResult.error || null,
          sent_by_admin_id: null, // null = cron automat
        })
      }

      // ── Notificare în platformă ────────────────────────────────────────
      if (inf.user_id) {
        await admin.from('notifications').insert({
          user_id: inf.user_id,
          title: `🚨 ${headline}`,
          body: `Deadline-ul pentru "${camp.title}" este ${deadlineStr}. Trimite dovada acum!`,
          link: '/influencer/collaborations',
          read: false,
        })
      }

      await admin.from('collaborations').update({ [t.flag]: true }).eq('id', collab.id)

      sent++
      break
    }
  }

  return NextResponse.json({ ok: true, checked: collabs.length, sent })
}
