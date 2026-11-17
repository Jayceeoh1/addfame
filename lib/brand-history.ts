// „A mai lucrat cu tine” — istoricul unui influencer cu același brand (alte campanii ale brandului).
// Funcție pură, testată separat.

import { campaignName } from '@/lib/campaign-name'

export type HistoryRow = {
  influencer_id: string
  campaign_id: string
  status: string
  created_at: string
  completed_at?: string | null
  deliverable_submitted_at?: string | null
  campaign?: { title?: string | null; offer_name?: string | null; product_name?: string | null; deadline?: string | null } | null
  rating?: number | null   // nota dată de brand la colaborarea respectivă
}

export type InfluencerHistory = {
  completed: number      // colaborări finalizate (postare aprobată)
  ongoing: number        // colaborări în desfășurare în alte campanii
  unfinished: number     // anulate sau cu termenul trecut fără postare
  appliedOnly: number    // doar aplicări / invitații, fără colaborare
  avgRating: number | null
  last: { name: string; date: string; status: string } | null
  /** toate campaniile brandului la care a fost (sau a aplicat), cele mai noi primele */
  campaigns: { id: string; name: string; date: string; kind: HistoryKind }[]
}

export type HistoryKind = 'completed' | 'ongoing' | 'unfinished' | 'applied' | 'rejected'

export const HISTORY_KIND_LABEL: Record<HistoryKind, string> = {
  completed: 'Finalizată',
  ongoing: 'În desfășurare',
  unfinished: 'Nefinalizată',
  applied: 'A aplicat',
  rejected: 'Respins',
}

const GRACE_DAYS = 7  // după termen, mai lăsăm 7 zile până o considerăm nefinalizată

export function summarizeBrandHistory(rows: HistoryRow[], now = new Date()): Record<string, InfluencerHistory> {
  const out: Record<string, InfluencerHistory> = {}
  for (const r of rows) {
    const h = out[r.influencer_id] ||= { completed: 0, ongoing: 0, unfinished: 0, appliedOnly: 0, avgRating: null, last: null, campaigns: [] }
    const deadline = r.campaign?.deadline ? new Date(r.campaign.deadline).getTime() + GRACE_DAYS * 864e5 : null
    let worked = true
    let kind: HistoryKind
    if (r.status === 'COMPLETED') { h.completed++; kind = 'completed' }
    else if (r.status === 'CANCELLED') { h.unfinished++; kind = 'unfinished' }
    else if (r.status === 'ACTIVE') {
      if (deadline && deadline < now.getTime() && !r.deliverable_submitted_at) { h.unfinished++; kind = 'unfinished' }
      else { h.ongoing++; kind = 'ongoing' }
    } else { h.appliedOnly++; worked = false; kind = r.status === 'REJECTED' ? 'rejected' : 'applied' }
    h.campaigns.push({ id: r.campaign_id, name: campaignName(r.campaign), date: r.completed_at || r.created_at, kind })

    if (worked) {
      const date = r.completed_at || r.created_at
      if (!h.last || new Date(date) > new Date(h.last.date)) h.last = { name: campaignName(r.campaign), date, status: r.status }
    }
  }
  for (const h of Object.values(out)) h.campaigns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  // media notelor date de brand
  const ratings: Record<string, number[]> = {}
  for (const r of rows) if (r.rating && r.rating > 0) (ratings[r.influencer_id] ||= []).push(r.rating)
  for (const [id, list] of Object.entries(ratings)) {
    out[id].avgRating = Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10
  }
  return out
}

/** A lucrat efectiv cu brandul (nu doar a aplicat). */
export const hasWorkedWith = (h?: InfluencerHistory | null) => !!h && (h.completed + h.ongoing + h.unfinished) > 0
