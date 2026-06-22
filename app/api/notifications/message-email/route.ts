import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export async function POST(req: NextRequest) {
  try {
    const { influencer_email, influencer_name, brand_name, campaign_title, message_preview } = await req.json()

    if (!influencer_email || !RESEND_API_KEY) return NextResponse.json({ ok: true })

    const html = `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">

  <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:22px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:white">AddFame</div>
  </div>

  <div style="padding:28px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:40px;margin-bottom:8px">💬</div>
      <h1 style="font-size:19px;font-weight:800;color:#111827;margin:0 0 4px">Mesaj nou de la ${brand_name}</h1>
      <p style="font-size:13px;color:#6b7280;margin:0">Ai primit un mesaj legat de campania ta</p>
    </div>

    ${campaign_title ? `<div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:center">
      <p style="font-size:11px;color:#7c3aed;font-weight:700;margin:0 0 3px;text-transform:uppercase">Campanie</p>
      <p style="font-size:14px;font-weight:700;color:#111827;margin:0">${campaign_title}</p>
    </div>` : ''}

    ${message_preview ? `<div style="background:#f9fafb;border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px">
      <p style="font-size:13px;color:#374151;margin:0;line-height:1.6;font-style:italic">"${message_preview}${message_preview.length >= 150 ? '...' : ''}"</p>
    </div>` : ''}

    <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:20px">
      Bună, <strong>${influencer_name || 'influencer'}</strong>! 👋<br><br>
      <strong>${brand_name}</strong> ți-a trimis un mesaj în platforma AddFame. Intră în inbox pentru a vedea mesajul complet și a răspunde.
    </p>

    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/influencer/inbox"
        style="background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;text-decoration:none;font-size:15px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
        💬 Deschide inbox-ul →
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Ai întrebări? <a href="mailto:contact@addfame.ro" style="color:#7c3aed;font-weight:700">contact@addfame.ro</a>
    </p>
  </div>

  <div style="padding:12px 26px;border-top:1px solid #f3f4f6;text-align:center">
    <p style="font-size:11px;color:#9ca3af;margin:0">© 2026 AddFame · addfame.ro</p>
  </div>
</div>
</div>
</body></html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: influencer_email,
        subject: `💬 Mesaj nou de la ${brand_name} pe AddFame`,
        html,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[message-email]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
