import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeEmail, isEmail, suppressEmail } from '@/lib/email-suppression'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Dezabonare: funcționează pentru oricine (și pentru cei fără cont), din link sau „one-click” (Gmail/Yahoo).
async function unsubscribe(raw: string | null) {
  const email = normalizeEmail(raw)
  if (!isEmail(email)) return false
  return suppressEmail(admin, email, 'unsubscribe')
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const html = (t: string, m: string, ok: boolean) => new NextResponse(unsubPage(t, m, ok), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  if (!email) return html('Lipsă email', 'Link-ul de dezabonare este invalid.', false)
  try {
    if (!(await unsubscribe(email))) return html('Email invalid', 'Adresa de email din link nu este validă.', false)
    return html('Dezabonat cu succes ✓', `Adresa ${normalizeEmail(email)} nu va mai primi emailuri de marketing de la AddFame.\n\nEmailurile legate de contul tău (confirmări, plăți, resetare parolă) continuă.`, true)
  } catch {
    return html('Eroare', 'A apărut o eroare. Scrie-ne la ciprian@addfame.ro și te scoatem manual.', false)
  }
}

/** One-click (List-Unsubscribe-Post) și formularul din /unsubscribe. */
export async function POST(req: NextRequest) {
  let email = req.nextUrl.searchParams.get('email')
  if (!email) {
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) email = (await req.json().catch(() => ({})))?.email ?? null
    else email = String((await req.formData().catch(() => null))?.get('email') ?? '') || null
  }
  try {
    const ok = await unsubscribe(email)
    return NextResponse.json(ok ? { ok: true } : { error: 'Email invalid' }, { status: ok ? 200 : 400 })
  } catch {
    return NextResponse.json({ error: 'Eroare' }, { status: 500 })
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
