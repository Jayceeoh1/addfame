// „Trimite la semnat” — un click din Admin → Contracte → Cesiune.
// Creatorul primește: notificare în platformă (+ push), email și, dacă și-a legat contul, mesaj pe Telegram.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { emailContractToSign } from '@/lib/email'
import { notifyContractToSign } from '@/lib/telegram'
import { sendWhatsAppTemplate, whatsappConfigured } from '@/lib/whatsapp'

// Șablon WhatsApp aprobat pentru contracte (Twilio Content Template). Variabile: 1 = prenume, 2 = campanie/brand, 3 = token contract
const WA_CONTRACT_TEMPLATE = process.env.TWILIO_TEMPLATE_CONTRACT_SID

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

const adminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getAdminUser() {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: adminRow } = await adminClient().from('admins').select('id').eq('user_id', user.id).single()
  return adminRow ? user : null
}

const likeExact = (e: string) => e.replace(/[\\%_]/g, m => '\\' + m)

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getAdminUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const db = adminClient()

    const { data: c } = await db.from('cesiune_contracts').select('*').eq('id', id).maybeSingle()
    if (!c || c.status === 'archived') return NextResponse.json({ error: 'Contract negăsit.' }, { status: 404 })
    if (c.status === 'signed') return NextResponse.json({ error: 'Contractul e deja semnat.' }, { status: 409 })

    // Creatorul: după legătura cu profilul sau, altfel, după email
    let inf: { id: string; user_id: string | null; name: string | null; email: string | null; phone: string | null; telegram_chat_id: number | null } | null = null
    if (c.influencer_id) {
      const { data } = await db.from('influencers').select('id, user_id, name, email, phone, telegram_chat_id').eq('id', c.influencer_id).maybeSingle()
      inf = data as any
    }
    const email = String(c.influencer_email || inf?.email || '').trim()
    if (!inf && email) {
      const { data } = await db.from('influencers').select('id, user_id, name, email, phone, telegram_chat_id').ilike('email', likeExact(email)).limit(1)
      inf = (data?.[0] as any) ?? null
    }

    const url = `${APP_URL}/contract-cesiune/${c.token}`
    const title = [c.campaign_title, c.brand_name].filter(Boolean).join(' · ') || 'Contract de cesiune a drepturilor de autor'
    const sent = { app: false, email: false, telegram: false, whatsapp: false }
    let whatsappNote: string | null = null

    if (inf?.user_id) {
      const { error } = await db.from('notifications').insert({
        user_id: inf.user_id,
        title: '✍️ Ai un contract de semnat',
        body: `${title}. Îl citești și îl semnezi online, în aproximativ un minut.`,
        link: `/contract-cesiune/${c.token}`,
        read: false,
      })
      sent.app = !error
    }
    if (email) {
      const r = await emailContractToSign(email, c.influencer_name || inf?.name || '', {
        url, brand: c.brand_name, campaign: c.campaign_title, product: c.product_name,
      })
      sent.email = !!r?.ok && !(r as any).skipped
    }
    if (inf?.telegram_chat_id) {
      await notifyContractToSign(Number(inf.telegram_chat_id), title, url)
      sent.telegram = true
    }

    // WhatsApp (Twilio) — doar cu șablon aprobat pentru contracte
    const phone = inf?.phone || c.influencer_phone
    if (!whatsappConfigured(WA_CONTRACT_TEMPLATE)) whatsappNote = 'neconfigurat'
    else if (!phone) whatsappNote = 'fără telefon'
    else {
      const first = String(c.influencer_name || inf?.name || '').trim().split(/\s+/)[0] || 'acolo'
      const r = await sendWhatsAppTemplate(phone, WA_CONTRACT_TEMPLATE!, { '1': first, '2': title.slice(0, 120), '3': c.token })
      sent.whatsapp = r.ok
      if (!r.ok) whatsappNote = r.error || 'eroare'
      try {
        await db.from('whatsapp_logs').insert({
          influencer_id: inf?.id ?? null, influencer_name: c.influencer_name || inf?.name || null, phone: r.to || phone,
          campaign_id: c.campaign_id ?? null, campaign_title: c.campaign_title ?? null,
          reminder_type: 'contract', message_body: `Contract de semnat: ${title}`,
          twilio_message_sid: r.sid ?? null, success: r.ok, error_message: r.ok ? null : r.error,
        })
      } catch { /* jurnalul nu blochează trimiterea */ }
    }

    if (!sent.app && !sent.email && !sent.telegram && !sent.whatsapp)
      return NextResponse.json({ error: 'Nu am putut trimite: creatorul nu are cont legat și emailul a eșuat. Copiază linkul și trimite-l manual.' }, { status: 502 })

    await db.from('cesiune_contracts').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id).neq('status', 'signed')
    return NextResponse.json({ ok: true, sent, whatsappNote })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Eroare' }, { status: 500 })
  }
}
