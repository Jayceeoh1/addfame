'use server'

// „A mai lucrat cu tine”: pentru aplicanții unei campanii, ce au mai făcut cu ACELAȘI brand.
// Brandul vede doar propriile campanii — niciodată colaborările cu alte branduri.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'
import { summarizeBrandHistory, type HistoryRow, type InfluencerHistory } from '@/lib/brand-history'

export async function getBrandCollabHistory(campaignId: string):
  Promise<{ success: true; history: Record<string, InfluencerHistory> } | { error: string }> {
  try {
    if (!isUuid(campaignId)) return { error: 'Campanie inexistentă' }
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Neautentificat' }
    const admin = createAdminClient()
    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!brand) return { error: 'Brand negăsit' }
    const { data: camp } = await admin.from('campaigns').select('id').eq('id', campaignId).eq('brand_id', brand.id).maybeSingle()
    if (!camp) return { error: 'Nu ai acces la această campanie.' }

    // aplicanții campaniei curente
    const { data: here } = await admin.from('collaborations').select('influencer_id').eq('campaign_id', campaignId)
    const infIds = [...new Set((here ?? []).map(r => r.influencer_id).filter(Boolean))]
    if (!infIds.length) return { success: true, history: {} }

    // celelalte campanii ale brandului
    const { data: camps } = await admin.from('campaigns').select('id, title, offer_name, product_name, deadline').eq('brand_id', brand.id).neq('id', campaignId)
    const campMap = new Map((camps ?? []).map(c => [c.id, c]))
    if (!campMap.size) return { success: true, history: {} }

    const rows: HistoryRow[] = []
    // în bucăți, ca filtrul să nu depășească lungimea URL-ului
    for (let i = 0; i < infIds.length; i += 150) {
      const { data } = await admin.from('collaborations')
        .select('id, influencer_id, campaign_id, status, created_at, completed_at, deliverable_submitted_at')
        .in('influencer_id', infIds.slice(i, i + 150))
        .in('campaign_id', [...campMap.keys()])
      for (const r of data ?? []) rows.push({ ...r, campaign: campMap.get(r.campaign_id) } as any)
    }

    // notele date de brand la colaborările încheiate
    const doneIds = rows.filter(r => r.status === 'COMPLETED').map((r: any) => r.id)
    if (doneIds.length) {
      const { data: revs } = await admin.from('reviews').select('collaboration_id, rating').eq('reviewer_role', 'brand').in('collaboration_id', doneIds)
      const rMap = new Map((revs ?? []).map(r => [r.collaboration_id, Number(r.rating)]))
      for (const r of rows as any[]) if (rMap.has(r.id)) r.rating = rMap.get(r.id)
    }

    return { success: true, history: summarizeBrandHistory(rows) }
  } catch (e: any) {
    return { error: e?.message || 'Eroare' }
  }
}
