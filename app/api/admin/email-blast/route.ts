import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data } = await admin.from('admins').select('role').eq('user_id', user.id).single()
  if (!data) return null
  return true
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await requireAdmin()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { to, name, subject, body } = await req.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const trackId = crypto.randomUUID()
    await adminClient.from('email_tracking').insert({
      id: trackId,
      email: to,
      name,
      subject,
      sent_at: new Date().toISOString(),
      opened: false,
      opened_at: null,
    }).then(() => {})

    const trackingPixel = `${APP_URL}/api/admin/email-track/${trackId}`

    if (!RESEND_API_KEY) {
      console.log('[email-blast] No RESEND_API_KEY — skipped for:', to)
      return NextResponse.json({ ok: true, skipped: true })
    }

    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

        <!-- LOGO -->
        <tr><td align="center" style="padding-bottom:20px">
          <a href="${APP_URL}" style="text-decoration:none">
            <span style="font-size:26px;font-weight:900;color:#f97316">Add</span><span style="font-size:26px;font-weight:900;color:#111">Fame</span>
          </a>
        </td></tr>

        <!-- CARD -->
        <tr><td style="background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- HERO -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#f97316 0%,#ec4899 50%,#8b5cf6 100%);padding:40px 32px;text-align:center">
              <div style="font-size:40px;margin-bottom:12px">🌟</div>
              <h1 style="color:white;font-size:26px;font-weight:900;margin:0;line-height:1.2">Câștigă bani din pasiunea ta!</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:10px 0 0">Colaborează cu branduri românești prin AddFame</p>
            </td></tr>
          </table>

          <!-- BODY -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:36px 32px">

              <p style="color:#374151;font-size:16px;font-weight:600;margin:0 0 20px">Bună ${name}! 👋</p>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px">${body}</p>

              <!-- BENEFITS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:16px;padding:20px;margin-bottom:28px">
                <tr><td>
                  <p style="color:#111;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px">✨ De ce AddFame?</p>
                  <p style="color:#374151;font-size:14px;margin:6px 0"><span style="color:#f97316">✓</span>&nbsp;&nbsp;Plată <strong>garantată</strong> prin sistem escrow</p>
                  <p style="color:#374151;font-size:14px;margin:6px 0"><span style="color:#f97316">✓</span>&nbsp;&nbsp;Campanii <strong>potrivite nișei tale</strong></p>
                  <p style="color:#374151;font-size:14px;margin:6px 0"><span style="color:#f97316">✓</span>&nbsp;&nbsp;Înregistrare <strong>gratuită</strong> în 3 minute</p>
                  <p style="color:#374151;font-size:14px;margin:6px 0"><span style="color:#f97316">✓</span>&nbsp;&nbsp;Branduri românești care <strong>plătesc corect</strong></p>
                </td></tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:8px 0 4px">
                  <a href="${APP_URL}/api/admin/email-click/${trackId}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:white;font-size:18px;font-weight:900;text-decoration:none;padding:18px 52px;border-radius:50px;box-shadow:0 8px 24px rgba(249,115,22,0.4)">
                    🚀 &nbsp; Înscrie-te gratuit acum
                  </a>
                </td></tr>
              </table>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:14px 0 0">Durează 3 minute · Fără card · 100% gratuit</p>

            </td></tr>
          </table>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:24px 0;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0">© AddFame · <a href="${APP_URL}" style="color:#f97316;text-decoration:none;font-weight:600">addfame.ro</a></p>
          <p style="color:#9ca3af;font-size:12px;margin:6px 0 0">📞 <a href="tel:+40724796883" style="color:#9ca3af;text-decoration:none">+40 724 796 883</a></p>
          <p style="color:#d1d5db;font-size:11px;margin:8px 0 0">
            <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color:#d1d5db;text-decoration:none">Dezabonează-te</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  <img src="${trackingPixel}" width="1" height="1" style="display:none;border:0" alt="" />
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true, trackId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
