// Drepturile unei campanii pentru brand: doar ce are nevoie (fără CNP, buletin, adresă, telefon, email).
// Doar pe server.
import type { SupabaseClient } from '@supabase/supabase-js'
import { rightsFor, type RightsInfo } from '@/lib/rights'
import { campaignName } from '@/lib/campaign-name'

export interface CampaignRightsItem {
  ref: string                 // nr. contract (sau scurt id)
  creator: string             // numele creatorului
  product: string | null
  rights: RightsInfo
}
export interface CampaignRights {
  campaign: { id: string; name: string; brand: string; brandCui: string | null; brandRegCom: string | null }
  items: CampaignRightsItem[]
  pending: number             // contracte trimise, încă nesemnate
}

export async function loadCampaignRights(db: SupabaseClient, campaignId: string, now = new Date()): Promise<CampaignRights | null> {
  const { data: camp } = await db.from('campaigns')
    .select('id, title, offer_name, product_name, brand_id, brand_name, brands(name, company_legal_name, cui)')
    .eq('id', campaignId).maybeSingle()
  if (!camp) return null
  const { data: rows } = await db.from('cesiune_contracts')
    .select('id, contract_number, influencer_name, product_name, status, signed_at, clauses_version, brand_name, brand_cui, brand_reg_com')
    .eq('campaign_id', campaignId).in('status', ['signed', 'sent'])
    .order('signed_at', { ascending: true, nullsFirst: false })
  const signed = (rows || []).filter((r: any) => r.status === 'signed' && r.signed_at)
  const b: any = camp.brands || {}
  const first: any = signed[0] || {}
  return {
    campaign: {
      id: camp.id,
      name: campaignName(camp as any),
      brand: first.brand_name || b.company_legal_name || camp.brand_name || b.name || 'Brandul partener',
      brandCui: first.brand_cui || b.cui || null,
      brandRegCom: first.brand_reg_com || null,
    },
    items: signed.map((r: any) => ({
      ref: r.contract_number ? `Nr. ${r.contract_number}` : `#${String(r.id).slice(0, 8)}`,
      creator: r.influencer_name,
      product: r.product_name || (camp as any).offer_name || (camp as any).product_name || null,
      rights: rightsFor(r, now),
    })),
    pending: (rows || []).filter((r: any) => r.status === 'sent').length,
  }
}

/** Brandul logat deține campania? (sau e admin) */
export async function canSeeCampaignRights(db: SupabaseClient, userId: string, campaignId: string, isAdmin: boolean) {
  if (isAdmin) return true
  const { data: brand } = await db.from('brands').select('id').eq('user_id', userId).maybeSingle()
  if (!brand) return false
  const { data } = await db.from('campaigns').select('id').eq('id', campaignId).eq('brand_id', brand.id).maybeSingle()
  return !!data
}
