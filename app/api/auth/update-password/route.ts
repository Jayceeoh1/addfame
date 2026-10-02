import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Parola trebuie să aibă minim 8 caractere.' }, { status: 400 })
    }

    // Clientul SSR citește cookie-ul de sesiune setat de /auth/callback
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[update-password] No session:', userError?.message)
      return NextResponse.json(
        { error: 'Sesiune expirată. Solicită un nou link de resetare.' },
        { status: 401 }
      )
    }

    // Folosim Admin API (service_role) care schimbă parola direct în DB
    // updateUser() cu anon key nu funcționează în recovery flow
    const admin = createAdminClient()
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
    })

    if (updateError) {
      console.error('[update-password] Admin update failed:', updateError.message)
      return NextResponse.json({ error: 'Nu s-a putut schimba parola. Încearcă din nou.' }, { status: 500 })
    }

    // Invalidăm sesiunea de recovery după schimbare
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[update-password] Exception:', e.message)
    return NextResponse.json({ error: 'Eroare server. Încearcă din nou.' }, { status: 500 })
  }
}
