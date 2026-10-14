// WhatsApp prin Twilio (WhatsApp Business). Mesajele inițiate de noi trebuie să folosească
// un șablon aprobat de Meta (Content Template în Twilio), identificat prin ContentSid (HX…).
// Doar pe server.

const SID = process.env.TWILIO_ACCOUNT_SID
const TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM = process.env.TWILIO_WHATSAPP_FROM

/** 0722 123 456 / 722123456 / +40… → +40722123456 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  let p = String(phone).replace(/[\s\-().]/g, '')
  if (p.startsWith('0040')) p = '+' + p.slice(2)
  if (p.startsWith('07') && p.length === 10) p = '+4' + p
  else if (p.startsWith('7') && p.length === 9) p = '+40' + p
  else if (!p.startsWith('+')) p = '+' + p
  return /^\+\d{9,15}$/.test(p) ? p : null
}

export const whatsappConfigured = (templateSid?: string | null) => !!(SID && TOKEN && FROM && templateSid)

export async function sendWhatsAppTemplate(phone: string, templateSid: string, vars: Record<string, string>):
  Promise<{ ok: boolean; sid?: string; error?: string; to?: string }> {
  const to = normalizePhone(phone)
  if (!to) return { ok: false, error: 'Număr de telefon invalid' }
  if (!whatsappConfigured(templateSid)) return { ok: false, error: 'WhatsApp (Twilio) neconfigurat', to }
  try {
    const auth = Buffer.from(`${SID}:${TOKEN}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `whatsapp:${to}`, From: FROM!, ContentSid: templateSid, ContentVariables: JSON.stringify(vars) }),
    })
    const data: any = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, sid: data.sid, to } : { ok: false, error: data.message || `Twilio ${res.status}`, to }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Eroare Twilio', to }
  }
}
