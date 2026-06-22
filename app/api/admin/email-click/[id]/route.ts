import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Marchează ca deschis + clicked
    await admin.from('email_tracking').update({
      opened: true,
      opened_at: new Date().toISOString(),
      clicked: true,
      clicked_at: new Date().toISOString(),
    }).eq('id', params.id)

  } catch (e) {
    // Fail silently
  }

  // Redirect la pagina de înregistrare
  return NextResponse.redirect(`${APP_URL}/auth/register?ref=email&inv=${params.id}`)
}
