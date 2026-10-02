import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, type } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Câmpuri lipsă' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const topicLabels: Record<string, string> = {
      general: 'Întrebare generală',
      brand: 'Sunt brand',
      influencer: 'Sunt influencer',
      payment: 'Problemă plată',
      bug: 'Raportez un bug',
      partnership: 'Parteneriat',
    }

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:linear-gradient(135deg,#f97316,#ec4899);padding:20px;border-radius:12px;margin-bottom:24px">
          <h1 style="color:white;margin:0;font-size:20px">📩 Mesaj nou Contact — AddFame</h1>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Tip</td><td style="padding:8px 0;font-weight:700">${topicLabels[type] || type}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Nume</td><td style="padding:8px 0;font-weight:700">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Email</td><td style="padding:8px 0"><a href="mailto:${email}" style="color:#f97316">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:13px">Subiect</td><td style="padding:8px 0;font-weight:700">${subject}</td></tr>
        </table>
        <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-top:16px">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#374151">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f0f0f0">
          <p style="font-size:12px;color:#9ca3af;margin:0">Răspunde direct la acest email pentru a contacta utilizatorul.</p>
        </div>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: 'contact@addfame.ro',
        reply_to: email,
        subject: `[Contact] ${topicLabels[type] || type}: ${subject}`,
        html,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[contact]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
