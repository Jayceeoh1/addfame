import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export async function POST(req: NextRequest) {
  try {
    const { to, name, campaignTitle, brandName, reason } = await req.json()
    if (!to || !name) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    if (!RESEND_API_KEY) return NextResponse.json({ ok: true, skipped: true })

    const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#f97316,#ec4899);padding:28px;text-align:center">
        <div style="font-size:26px;font-weight:900;color:white">AddFame</div>
      </div>

      <!-- Body -->
      <div style="padding:28px">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:40px;margin-bottom:8px">😔</div>
          <h1 style="font-size:18px;font-weight:800;color:#111827;margin:0 0 6px">Aplicația ta nu a fost acceptată</h1>
          <p style="font-size:13px;color:#6b7280;margin:0">pentru campania <strong>${campaignTitle}</strong></p>
        </div>

        <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:16px">
          Bună, <strong>${name}</strong>!<br><br>
          Brandul <strong>${brandName}</strong> a analizat aplicația ta și din păcate nu a putut să te accepte în această campanie.
        </p>

        ${reason ? `
        <div style="background:#fff5f5;border:1.5px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:20px">
          <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:.06em">Motivul</p>
          <p style="margin:0;font-size:14px;color:#b91c1c;line-height:1.6">${reason}</p>
        </div>
        ` : ''}

        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#15803d;line-height:1.6">
            🌟 <strong>Nu te descuraja!</strong> Există multe alte campanii pe AddFame care se potrivesc profilului tău.<br>
            Completează-ți profilul cât mai bine pentru a crește șansele la viitoarele campanii.
          </p>
        </div>

        <div style="text-align:center">
          <a href="${APP_URL}/influencer/campaigns"
            style="background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;font-size:14px;font-weight:800;padding:12px 28px;border-radius:12px;display:inline-block">
            Explorează alte campanii →
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px">
          © 2026 AddFame · addfame.ro
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject: `Aplicația ta la "${campaignTitle}" nu a fost acceptată`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
