import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { first_name, last_name, email, phone, instagram, tiktok, category } = body

    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from('event_signups').insert({
      first_name,
      last_name,
      email,
      phone,
      instagram: instagram || null,
      tiktok: tiktok || null,
      category: category || null,
    })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Eroare server.' }, { status: 500 })
  }
}
