import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailProfileReminder } from '@/lib/email'

const BATCH_SIZE = 50 // procesăm max 50 influenceri per rulare
const MIN_HOURS_BETWEEN_REMINDERS = 24 // nu trimitem mai des de 1x/24h

export async function GET(req: NextRequest) {
  // Verificare secret cron
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_REMINDERS * 60 * 60 * 1000).toISOString()

  // Găsim influenceri aprobați cu profil incomplet
  // care nu au primit reminder în ultimele 24h
  const { data: influencers, error } = await admin
    .from('influencers')
    .select('id, user_id, name, bio, niches, avatar, city, platforms, slug, identity_verified, last_reminder_sent_at')
    .eq('approval_status', 'approved')
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cutoff}`)
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!influencers || influencers.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No influencers need reminders' })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const inf of influencers) {
    try {
      // Calculează ce lipsește
      const missing: string[] = []
      if (!inf.bio) missing.push('Bio — spune-le brandurilor cine ești')
      if (!inf.niches || inf.niches.length === 0) missing.push('Nișe de conținut — Fashion, Food, Tech etc.')
      if (!inf.platforms || inf.platforms.length === 0) missing.push('Platforme sociale — Instagram, TikTok, YouTube')
      if (!inf.avatar) missing.push('Poză de profil')
      if (!inf.slug) missing.push('Link profil public (slug)')
      if (!inf.city) missing.push('Orașul/Comuna — necesar pentru oferte barter locale')
      if (!inf.identity_verified) missing.push('Verificare identitate — necesară pentru a aplica la campanii')

      // Dacă profilul e complet, skip
      if (missing.length === 0) {
        skipped++
        // Marcăm ca "complet" ca să nu îl mai verificăm mereu
        await admin.from('influencers')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', inf.id)
        continue
      }

      // Obținem emailul din auth.users
      const { data: authUser } = await admin.auth.admin.getUserById(inf.user_id)
      const email = authUser?.user?.email
      if (!email) {
        skipped++
        continue
      }

      // Trimitem emailul
      const result = await emailProfileReminder(
        email,
        inf.name || 'Creator',
        missing,
        undefined // fără mesaj custom pentru cron
      )

      if (result?.ok) {
        sent++
        // Actualizăm timestamp-ul ultimului reminder
        await admin.from('influencers')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', inf.id)
      } else {
        errors.push(`Failed for ${inf.id}`)
      }

      // Pauză mică între emailuri ca să nu depășim rate limit Resend
      await new Promise(r => setTimeout(r, 200))

    } catch (e: any) {
      errors.push(`Error for ${inf.id}: ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    message: `Reminders sent: ${sent}, skipped (complete profiles): ${skipped}`,
  })
}