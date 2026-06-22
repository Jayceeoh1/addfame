import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Parola trebuie să aibă minim 8 caractere.' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificăm că există sesiune validă (setată de /auth/callback)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Sesiune expirată. Solicită un nou link de resetare.' }, { status: 401 })
    }

    // Actualizăm parola folosind sesiunea din cookie (server-side)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('[update-password]', error.message)
      return NextResponse.json({ error: error.message }, { status: 422 })
    }

    // Sign out după schimbarea parolei
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[update-password]', e.message)
    return NextResponse.json({ error: 'Eroare server. Încearcă din nou.' }, { status: 500 })
  }
}
