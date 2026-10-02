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

  // Găsim campaniile care expiră în exact 2 zile
  const in2Days = new Date()
  in2Days.setDate(in2Days.getDate() + 2)
  const dayStart = new Date(in2Days)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(in2Days)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, title, deadline, budget, budget_per_influencer, brand_id, brands(name, user_id, profiles(email))')
    .eq('status', 'ACTIVE')
    .gte('deadline', dayStart.toISOString())
    .lte('deadline', dayEnd.toISOString())

  if (!campaigns?.length) {
    return NextResponse.json({ ok: true, reminded: 0 })
  }

  let reminded = 0

  for (const camp of campaigns) {
    const brand = camp.brands as any
    const email = brand?.profiles?.email
    if (!email) continue

    const deadlineStr = new Date(camp.deadline).toLocaleDateString('ro-RO', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    // Email către brand
    const brandHtml = `
      <!DOCTYPE html>
      <html lang="ro">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
              <tr><td align="center" style="padding-bottom:20px">
                <span style="font-size:24px;font-weight:900;color:#f97316">Add</span><span style="font-size:24px;font-weight:900;color:#111">Fame</span>
              </td></tr>
              <tr><td style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="background:linear-gradient(135deg,#f97316,#ec4899);padding:32px;text-align:center">
                    <div style="font-size:36px;margin-bottom:8px">⏰</div>
                    <h1 style="color:white;font-size:22px;font-weight:900;margin:0">Campania ta expiră în 2 zile!</h1>
                  </td></tr>
                  <tr><td style="padding:32px">
                    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">
                      Campania <strong>"${camp.title}"</strong> expiră pe <strong>${deadlineStr}</strong>.
                    </p>
                    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">
                      Verifică aplicațiile primite și aprobă influencerii potriviți înainte de expirare.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <a href="${APP_URL}/brand/campaigns"
                          style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:white;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(249,115,22,0.35)">
                          📋 Vezi campania
                        </a>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
              </td></tr>
              <tr><td style="padding:20px 0;text-align:center">
                <p style="color:#9ca3af;font-size:12px;margin:0">© AddFame · <a href="${APP_URL}" style="color:#f97316;text-decoration:none">addfame.ro</a></p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `

    await sendEmail(email, `⏰ Campania "${camp.title}" expiră în 2 zile!`, brandHtml)

    // Trimite și la influencerii activi din campanie
    const { data: activeCollabs } = await admin
      .from('collaborations')
      .select('influencers(name, email)')
      .eq('campaign_id', camp.id)
      .eq('status', 'ACTIVE')

    for (const collab of activeCollabs || []) {
      const inf = collab.influencers as any
      if (!inf?.email) continue

      const infHtml = `
        <!DOCTYPE html>
        <html lang="ro">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
                <tr><td align="center" style="padding-bottom:20px">
                  <span style="font-size:24px;font-weight:900;color:#f97316">Add</span><span style="font-size:24px;font-weight:900;color:#111">Fame</span>
                </td></tr>
                <tr><td style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="background:linear-gradient(135deg,#8b5cf6,#06b6d4);padding:32px;text-align:center">
                      <div style="font-size:36px;margin-bottom:8px">⚡</div>
                      <h1 style="color:white;font-size:22px;font-weight:900;margin:0">Deadline se apropie!</h1>
                    </td></tr>
                    <tr><td style="padding:32px">
                      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px">
                        Bună <strong>${inf.name || 'Influencer'}</strong>,
                      </p>
                      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px">
                        Colaborarea ta pentru campania <strong>"${camp.title}"</strong> expiră pe <strong>${deadlineStr}</strong>.
                        Dacă nu ai trimis încă postul, grăbește-te! 🚀
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr><td align="center">
                          <a href="${APP_URL}/influencer/collaborations"
                            style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;box-shadow:0 6px 20px rgba(139,92,246,0.35)">
                            📤 Trimite postul acum
                          </a>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td></tr>
                <tr><td style="padding:20px 0;text-align:center">
                  <p style="color:#9ca3af;font-size:12px;margin:0">© AddFame · <a href="${APP_URL}" style="color:#f97316;text-decoration:none">addfame.ro</a></p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `

      await sendEmail(inf.email, `⚡ Mai ai 2 zile pentru campania "${camp.title}"!`, infHtml)
    }

    reminded++
  }

  return NextResponse.json({ ok: true, reminded, campaigns: campaigns.length })
}
