'use server'

// Facturi la finalul campaniei: adminul introduce suma, sistemul o emite în SmartBill (seria ADDF).
// Fiecare emitere are o cheie unică: dublu-click sau reîncercare nu poate crea două facturi.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { createSmartBillInvoice, smartBillMissingEnv } from '@/lib/smartbill'
import { cleanInvoiceInput } from '@/lib/campaign-invoice'

export async function getCampaignInvoicePanel(campaignId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, title, offer_name, product_name, brand_id').eq('id', campaignId).maybeSingle()
  if (!camp) return { error: 'Campania nu există.' }
  const [{ data: brand }, { data: invoices }] = await Promise.all([
    admin.from('brands').select('name, company_legal_name, cui, company_address, email').eq('id', camp.brand_id).maybeSingle(),
    admin.from('campaign_invoices').select('id, amount, description, status, smartbill_number, error, created_at').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
  ])
  return {
    success: true as const,
    campaignTitle: camp.title || camp.offer_name || camp.product_name || 'Campanie',
    brand: {
      name: brand?.company_legal_name || brand?.name || '',
      vat: brand?.cui || '', address: brand?.company_address || '', email: brand?.email || '',
    },
    invoices: invoices || [],
    smartbillMissing: smartBillMissingEnv(),
  }
}

export async function issueCampaignInvoice(campaignId: string, raw: unknown) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  const parsed = cleanInvoiceInput(raw)
  if ('error' in parsed) return { error: parsed.error }
  const { amount, description, client, request_key } = parsed.value
  if (smartBillMissingEnv().length) return { error: 'SmartBill nu e configurat în Vercel (SMARTBILL_USERNAME / SMARTBILL_API_KEY).' }

  const admin = createAdminClient()
  const { data: camp } = await admin.from('campaigns').select('id, title, offer_name, product_name, brand_id').eq('id', campaignId).maybeSingle()
  if (!camp) return { error: 'Campania nu există.' }

  // Rezervăm emiterea: cheia unică oprește a doua cerere identică.
  const { data: row, error: insErr } = await admin.from('campaign_invoices').insert({
    campaign_id: camp.id, campaign_title: camp.title || camp.offer_name || camp.product_name || null,
    brand_id: camp.brand_id, amount, description, client, status: 'pending',
    request_key, created_by: auth.userId,
  }).select('id').single()
  if (insErr || !row) {
    if (insErr?.code === '23505') return { error: 'Factura asta s-a trimis deja. Reîncarcă lista ca să o vezi.' }
    return { error: 'Nu am putut începe emiterea. Rulează SQL 41 în Supabase.' }
  }

  try {
    const r = await createSmartBillInvoice({
      clientName: client.name, clientCif: client.vat || undefined, clientRegCom: client.reg_com || undefined,
      clientAddress: client.address || undefined, clientCity: client.city || undefined, clientEmail: client.email,
      amountRon: amount, description,
      mentions: `Campania „${camp.title || camp.offer_name || camp.product_name || ''}” — platforma AddFame, addfame.ro`,
    })
    await admin.from('campaign_invoices').update({ status: 'issued', smartbill_number: r.smartbillNumber }).eq('id', row.id)
    return { success: true as const, number: r.smartbillNumber }
  } catch (e: any) {
    // Refuz clar → nu există factură. Fără răspuns clar → poate exista: „de verificat”.
    const definite = e?.definite === true
    await admin.from('campaign_invoices').update({ status: definite ? 'failed' : 'check', error: String(e?.message || '').slice(0, 300) }).eq('id', row.id)
    return {
      error: definite ? (e?.message || 'Eroare SmartBill')
        : 'SmartBill nu a răspuns clar. Verifică în SmartBill dacă factura s-a emis înainte să încerci din nou.',
    }
  }
}
