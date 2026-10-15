// Anunță creatorul când brandul răspunde la draftul video: WhatsApp (Twilio), Telegram, email.
// Notificarea din platformă (clopoțel + push) o pune deja ruta de review.
// Doar pe server. Nu aruncă erori: alertele nu au voie să blocheze aprobarea.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppTemplate, whatsappConfigured } from '@/lib/whatsapp'
import { notifyDraftDecision } from '@/lib/telegram'
import { emailDraftDecision } from '@/lib/email'
import { campaignName } from '@/lib/campaign-name'

// Șabloane WhatsApp aprobate în Twilio (Content Template, HX…), setate în Vercel
const WA_APPROVED = process.env.TWILIO_TEMPLATE_DRAFT_APPROVED_SID
const WA_CHANGES = process.env.TWILIO_TEMPLATE_DRAFT_CHANGES_SID

export async function alertDraftDecision(
  admin: SupabaseClient, collabId: string, approved: boolean, opts: { note?: string | null; due?: Date | null } = {},
): Promise<{ whatsapp: boolean; telegram: boolean; email: boolean; note?: string }> {
  const out = { whatsapp: false, telegram: false, email: false } as { whatsapp: boolean; telegram: boolean; email: boolean; note?: string }
  try {
    const { data: c } = await admin.from('collaborations')
      .select('id, influencer_id, campaign_id, delivery_phone, campaigns(title, offer_name, brand_name)')
      .eq('id', collabId).maybeSingle()
    if (!c) return out
    const { data: inf } = await admin.from('influencers')
      .select('id, name, email, phone, telegram_chat_id').eq('id', (c as any).influencer_id).maybeSingle()
    if (!inf) return out
    const camp: any = (c as any).campaigns || {}
    const title = campaignName(camp, camp.title || 'campania ta')
    const label = camp.brand_name ? `${title} · ${camp.brand_name}` : title
    const first = String(inf.name || '').trim().split(/\s+/)[0] || 'acolo'
    const due = opts.due ? opts.due.toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : null

    // WhatsApp: telefonul din profil, altfel cel de livrare din colaborare
    const tpl = approved ? WA_APPROVED : WA_CHANGES
    const phone = inf.phone || (c as any).delivery_phone || null
    if (!whatsappConfigured(tpl)) out.note = 'whatsapp neconfigurat'
    else if (!phone) out.note = 'fără telefon'
    else {
      const vars: Record<string, string> = approved
        ? { '1': first, '2': label.slice(0, 120) }
        : { '1': first, '2': label.slice(0, 120), '3': (opts.note || 'vezi comentariile pe video').replace(/\s+/g, ' ').slice(0, 300) }
      const r = await sendWhatsAppTemplate(phone, tpl!, vars)
      out.whatsapp = r.ok
      try {
        await admin.from('whatsapp_logs').insert({
          influencer_id: inf.id, influencer_name: inf.name, phone: r.to || phone,
          campaign_id: (c as any).campaign_id ?? null, campaign_title: title,
          reminder_type: approved ? 'draft_aprobat' : 'draft_modificari',
          message_body: approved ? `Draft aprobat: ${label}` : `Modificări la draft: ${label}`,
          twilio_message_sid: r.sid ?? null, success: r.ok, error_message: r.ok ? null : r.error,
        })
      } catch { /* jurnalul e opțional */ }
    }

    if (inf.telegram_chat_id) {
      await notifyDraftDecision(Number(inf.telegram_chat_id), approved, label, opts.note)
      out.telegram = true
    }
    if (inf.email) {
      const r: any = await emailDraftDecision(inf.email, inf.name || '', { approved, campaign: label, note: opts.note, due })
      out.email = !!r?.ok
    }
  } catch (e) {
    console.error('[draft-alerts]', e)
  }
  return out
}
