import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <contact@addfame.ro>'

export async function POST(req: NextRequest) {
  try {
    // Verifică că e admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: adminRow } = await serviceClient
      .from('admins')
      .select('is_active')
      .eq('user_id', user.id)
      .single()
    if (!adminRow?.is_active) return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })

    const { to, subject, body } = await req.json()
    if (!to || !subject || !body) return NextResponse.json({ error: 'Lipsesc câmpuri' }, { status: 400 })

    if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY lipsă din env' }, { status: 500 })

    // Convertește newline-urile în <br> pentru HTML
    const htmlBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Arial,sans-serif">
        <div style="max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;border:1.5px solid #f0f0f0">
          <div style="background:linear-gradient(135deg,#f97316,#ec4899);padding:24px 32px">
            <span style="color:white;font-weight:900;font-size:20px">Add<span style="opacity:0.85">Fame</span></span>
          </div>
          <div style="padding:32px;font-size:15px;line-height:1.7;color:#444">
            ${htmlBody}
          </div>
          <div style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0">
            © AddFame · <a href="https://addfame.ro" style="color:#f97316">addfame.ro</a>
          </div>
        </div>
      </body></html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
