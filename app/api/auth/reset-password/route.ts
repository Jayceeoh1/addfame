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

    // Generăm link-ul prin Admin API
    // redirectTo este IGNORAT când folosim token_hash — îl construim manual
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
    })

    if (error || !data?.properties?.hashed_token) {
      // Dacă contul nu există sau altă eroare, răspundem cu success (securitate)
      console.warn('[reset-password] generateLink error:', error?.message)
      return NextResponse.json({ success: true })
    }

    // Construim linkul cu token_hash care merge la /auth/callback
    // /auth/callback procesează serverside și redirectează la /auth/reset-password
    // AVANTAJ: Yahoo/Outlook fac prefetch dar callback-ul returnează 302 fără a consuma sesiunea
    const token_hash = data.properties.hashed_token
    const callbackUrl = `${APP_URL}/auth/callback?token_hash=${token_hash}&type=recovery&next=/auth/reset-password`

    await sendPasswordResetEmail(email.trim().toLowerCase(), callbackUrl)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[reset-password]', e.message)
    return NextResponse.json({ success: true })
  }
}
