import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')

  if (!email) {
    return new NextResponse(unsubPage('Lipsă email', 'Link-ul de dezabonare este invalid.', false), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  try {
    // Găsim userul după email
    const { data: users } = await admin.auth.admin.listUsers()
    const user = users?.users?.find((u: any) => u.email === email)

    if (!user) {
      return new NextResponse(unsubPage('Email negăsit', 'Nu am găsit un cont asociat acestui email.', false), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Marcăm influencerul ca unsubscribed din remindere
    await admin.from('influencers')
      .update({ 
        email_reminders_enabled: false,
        last_reminder_sent_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 an în viitor
      })
      .eq('user_id', user.id)

    return new NextResponse(unsubPage('Dezabonat cu succes ✓', `Emailul ${email} a fost scos din lista de remindere AddFame. Nu vei mai primi emailuri automate de la noi.\n\nDacă te-ai dezabonat din greșeală, poți reactiva notificările din Settings → Notificări.`, true), {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (e: any) {
    return new NextResponse(unsubPage('Eroare', 'A apărut o eroare. Te rugăm să ne contactezi la contact@addfame.ro.', false), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

function unsubPage(title: string, message: string, success: boolean) {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — AddFame</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
  .card { background: white; border-radius: 20px; padding: 40px; max-width: 440px; width: 100%; text-align: center; border: 1.5px solid #f0f0f0; }
  .icon { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 28px; background: ${success ? '#dcfce7' : '#fef2f2'}; }
  h1 { font-size: 20px; font-weight: 900; color: #1f2937; margin-bottom: 10px; }
  p { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 24px; white-space: pre-line; }
  a { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 700; }
  .logo { font-size: 18px; font-weight: 900; color: #7c3aed; margin-bottom: 24px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">AddFame</div>
    <div class="icon">${success ? '✓' : '⚠'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://addfame.ro">Mergi la AddFame</a>
  </div>
</body>
</html>`
}
