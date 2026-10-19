import { limitRequest, LIMITS } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailTypoError } from '@/lib/email-typos'
import { NextResponse } from 'next/server'
import { isUpcoming } from '@/lib/events'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// Înscriere la un eveniment AddFame. Cu event_id → legată de evenimentul din „Galerie evenimente”.
export async function POST(req: Request) {
  { const limited = await limitRequest(req, 'signup', LIMITS.signup); if (limited) return limited }
  try {
    const body = await req.json().catch(() => ({}))
    const first_name = clip(body.first_name, 80), last_name = clip(body.last_name, 80)
    const email = clip(body.email, 160).toLowerCase(), phone = clip(body.phone, 40)
    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă.' }, { status: 400 })
    }
    { const typo = emailTypoError(email); if (typo) return NextResponse.json({ error: typo }, { status: 400 }) }
    const admin = createAdminClient()

    let event_id: string | null = null
    if (body.event_id) {
      if (!UUID.test(String(body.event_id))) return NextResponse.json({ error: 'Eveniment invalid.' }, { status: 400 })
      const { data: ev } = await admin.from('site_events').select('id, status, starts_at').eq('id', body.event_id).maybeSingle()
      if (!ev || !isUpcoming(ev as any)) return NextResponse.json({ error: 'Înscrierile la acest eveniment s-au închis.' }, { status: 400 })
      event_id = ev.id
      // aceeași persoană o singură dată la același eveniment
      const { data: dup } = await admin.from('event_signups').select('id').eq('event_id', event_id).ilike('email', email).limit(1)
      if (dup?.length) return NextResponse.json({ success: true, already: true })
    }

    const row: Record<string, unknown> = {
      first_name, last_name, email, phone,
      instagram: clip(body.instagram, 80).replace(/^@+/, '') || null,
      tiktok: clip(body.tiktok, 80).replace(/^@+/, '') || null,
      category: clip(body.category, 60) || null,
    }
    let { error } = await admin.from('event_signups').insert(event_id ? { ...row, event_id } : row)
    // SQL 40 încă nerulat: salvăm înscrierea oricum (fără legătura cu evenimentul)
    if (error && event_id && /event_id/.test(error.message)) ({ error } = await admin.from('event_signups').insert(row))
    if (error) {
      console.error('[eveniment-signup]', error.message)
      return NextResponse.json({ error: 'Eroare la salvare.' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[eveniment-signup]', err)
    return NextResponse.json({ error: 'Eroare server.' }, { status: 500 })
  }
}
