import { NextRequest, NextResponse } from 'next/server'

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  if (!phone) {
    return NextResponse.json({ error: 'Adaugă ?phone=07xxxxxxxx în URL' }, { status: 400 })
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !TWILIO_TEMPLATE_SID) {
    return NextResponse.json({
      error: 'Lipsesc variabile de mediu Twilio',
      check: {
        TWILIO_ACCOUNT_SID: !!TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
        TWILIO_WHATSAPP_FROM: !!TWILIO_WHATSAPP_FROM,
        TWILIO_TEMPLATE_REMINDER_SID: !!TWILIO_TEMPLATE_SID,
      }
    }, { status: 500 })
  }

  const to = normalizePhone(phone)

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')
    const body = new URLSearchParams({
      To: `whatsapp:${to}`,
      From: TWILIO_WHATSAPP_FROM,
      ContentSid: TWILIO_TEMPLATE_SID,
      ContentVariables: JSON.stringify({ '1': 'Test Nume', '2': '12 ore', '3': 'Campanie Test' }),
    })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    return NextResponse.json({ sentTo: to, twilioStatus: res.status, twilioResponse: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
