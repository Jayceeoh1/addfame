import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM
const TWILIO_TEMPLATE_SID = process.env.TWILIO_TEMPLATE_REMINDER_V2_SID || process.env.TWILIO_TEMPLATE_REMINDER_SID

function normalizePhone(phone: string): string | null {
  if (!phone) return null
  let p = phone.replace(/[\s\-()]/g, '')
  if (p.startsWith('07') && p.length === 10) p = '+4' + p
  else if (p.startsWith('7') && p.length === 9) p = '+40' + p
  else if (!p.startsWith('+')) p = '+' + p
  return p
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { collaboration_id, campaign_id } = await req.json()
    if (!collaboration_id || !campaign_id) {
      return NextResponse.json({ error: 'collaboration_id și campaign_id sunt obligatorii' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch colaborarea cu toate datele necesare
    const { data: collab, error: collabErr } = await admin
      .from('collaborations')
      .select(`
        id, package_received_at, post_deadline_days,
        deliverable_submitted_at, deliverable_approved_at, status,
        delivery_phone,
        influencers(id, name, phone, strikes, user_id),
        campaigns(id, title, brand_name)
      `)
      .eq('id', collaboration_id)
      .eq('campaign_id', campaign_id)
      .single()

    if (collabErr || !collab) {
      return NextResponse.json({ error: 'Colaborarea nu a fost găsită' }, { status: 404 })
    }

    const inf = collab.influencers as any
    const camp = collab.campaigns as any

    // Validări de eligibilitate
    if (collab.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Colaborarea nu este activă' }, { status: 400 })
    }
    if (!collab.package_received_at) {
      return NextResponse.json({ error: 'Influencerul nu a confirmat primirea coletului' }, { status: 400 })
    }
    if (collab.deliverable_submitted_at || collab.deliverable_approved_at) {
      return NextResponse.json({ error: 'Influencerul a trimis deja dovada' }, { status: 400 })
    }

    // Folosim delivery_phone ca fallback față de influencers.phone
    const rawPhone = inf?.phone || (collab as any).delivery_phone
    if (!rawPhone) {
      return NextResponse.json({ error: 'Influencerul nu are număr de telefon înregistrat' }, { status: 400 })
    }

    const phone = normalizePhone(rawPhone)
    if (!phone) {
      return NextResponse.json({ error: 'Număr de telefon invalid' }, { status: 400 })
    }

    // Calculăm deadline-ul pentru context
    const ref = new Date(collab.package_received_at)
    const days = collab.post_deadline_days || 5
    const deadline = new Date(ref.getTime() + days * 86400000)
    const hoursLeft = Math.round((deadline.getTime() - Date.now()) / 3600000)
    const label = hoursLeft <= 12 ? '12 ore' : hoursLeft <= 24 ? '1 zi' : '2 zile'

    // Trimitem WhatsApp prin Twilio
    let success = false
    let twilioSid: string | null = null
    let errorMsg: string | null = null

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !TWILIO_TEMPLATE_SID) {
      errorMsg = 'Twilio neconfigurat'
    } else {
      try {
        const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
        const body = new URLSearchParams({
          To: `whatsapp:${phone}`,
          From: TWILIO_WHATSAPP_FROM,
          ContentSid: TWILIO_TEMPLATE_SID,
          ContentVariables: JSON.stringify({ '1': inf.name, '2': label, '3': camp.title }),
        })
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          }
        )
        const data = await res.json()
        if (res.ok) {
          success = true
          twilioSid = data.sid
        } else {
          errorMsg = data.message || 'Twilio error'
        }
      } catch (e: any) {
        errorMsg = e.message
      }
    }

    // Logăm în whatsapp_logs indiferent de succes/eșec
    await admin.from('whatsapp_logs').insert({
      influencer_id: inf.id,
      influencer_name: inf.name,
      phone,
      campaign_id: camp.id,
      campaign_title: camp.title,
      collaboration_id: collab.id,
      reminder_type: 'manual',
      message_body: `Reminder manual: ${camp.title}`,
      twilio_message_sid: twilioSid,
      success,
      error_message: errorMsg,
      sent_by_admin_id: session.userId || null,
    })

    if (!success) {
      return NextResponse.json({ error: errorMsg || 'Nu s-a putut trimite mesajul' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sid: twilioSid })
  } catch (e: any) {
    console.error('[admin/whatsapp-reminder]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
