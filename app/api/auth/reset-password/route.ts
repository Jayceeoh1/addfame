import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendPasswordResetEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email lipsă' }, { status: 400 })

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generăm link-ul de resetare prin Supabase Admin (nu trimite el email)
    const redirectTo = `${APP_URL}/auth/reset-password`
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: { redirectTo }
    })

    if (error || !data?.properties?.action_link) {
      // Dacă contul nu există, răspundem tot cu success (securitate)
      return NextResponse.json({ success: true })
    }

    // Trimitem noi emailul frumos prin Resend
    await sendPasswordResetEmail(email.trim().toLowerCase(), data.properties.action_link)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[reset-password]', e.message)
    // Răspundem tot cu success pentru a nu expune dacă emailul există
    return NextResponse.json({ success: true })
  }
}
