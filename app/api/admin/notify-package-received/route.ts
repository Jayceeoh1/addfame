import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { influencer_email, influencer_name, campaign_title, deadline_days } = await req.json()

    if (!influencer_email || !RESEND_API_KEY) return NextResponse.json({ ok: true })

    const days = deadline_days || 5

    const html = `<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">

  <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:26px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:white">AddFame</div>
  </div>

  <div style="padding:28px">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px;margin-bottom:8px">📦</div>
      <h1 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 4px">Coletul tău a fost confirmat!</h1>
      <p style="font-size:13px;color:#6b7280;margin:0">Countdown-ul de postare a pornit acum</p>
    </div>

    <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <p style="font-size:12px;font-weight:700;color:#b45309;margin:0 0 4px;text-transform:uppercase">Campanie</p>
      <p style="font-size:16px;font-weight:900;color:#111827;margin:0">${campaign_title || 'Campanie activă'}</p>
    </div>

    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <p style="font-size:12px;font-weight:700;color:#dc2626;margin:0 0 4px;text-transform:uppercase">Ai la dispoziție</p>
      <p style="font-size:32px;font-weight:900;color:#dc2626;margin:0">${days} zile</p>
      <p style="font-size:12px;color:#ef4444;margin:4px 0 0">să postezi și să trimiți dovada</p>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:20px">
      Bună, <strong>${influencer_name}</strong>! 👋<br><br>
      Am confirmat că ai primit coletul. De acum, ai <strong>${days} zile</strong> să postezi conținutul și să trimiți dovada pe AddFame.<br><br>
      Dacă nu trimiți dovada în timp, vei primi un <strong>strike automat</strong>.
    </p>

    <div style="background:#f9fafb;border-radius:10px;padding:14px;margin-bottom:20px">
      <p style="font-size:12px;font-weight:700;color:#374151;margin:0 0 10px">Ce trebuie să faci:</p>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:20px;height:20px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#b45309;flex-shrink:0">1</div>
        <p style="font-size:13px;color:#374151;margin:0">Postează conținutul pe platformele agreate</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:20px;height:20px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#b45309;flex-shrink:0">2</div>
        <p style="font-size:13px;color:#374151;margin:0">Adaugă un screenshot din postare</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:20px;height:20px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#b45309;flex-shrink:0">3</div>
        <p style="font-size:13px;color:#374151;margin:0">Trimite link-ul postului în AddFame</p>
      </div>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/influencer/collaborations"
        style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;text-decoration:none;font-size:15px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
        📤 Mergi la colaborări →
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Ai întrebări? <a href="mailto:contact@addfame.ro" style="color:#f59e0b;font-weight:700">contact@addfame.ro</a>
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
        subject: `📦 Coletul tău a fost confirmat! Ai ${days} zile să postezi`,
        html,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[notify-package-received]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
