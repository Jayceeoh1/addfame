// Istoricul punctelor Creator Score: scriere (din server) și rezumat pentru pagina „Recompense”.

export type ScoreEntry = {
  influencerId: string
  points: number
  kind: string
  label: string
  collabId?: string | null
  campaignId?: string | null
  campaignTitle?: string | null
}

/** Salvează în istoric un câștig sau o pierdere de puncte. Nu aruncă erori: scorul rămâne oricum aplicat. */
export async function logScore(admin: any, entries: ScoreEntry | ScoreEntry[]): Promise<void> {
  try {
    const rows = (Array.isArray(entries) ? entries : [entries])
      .filter(e => e.influencerId && Number.isFinite(e.points) && e.points !== 0)
      .map(e => ({
        influencer_id: e.influencerId, points: Math.round(e.points), kind: e.kind, label: e.label,
        collab_id: e.collabId ?? null, campaign_id: e.campaignId ?? null, campaign_title: e.campaignTitle ?? null,
      }))
    if (rows.length) await admin.from('creator_score_log').insert(rows)
  } catch { /* istoricul nu trebuie să oprească acordarea punctelor */ }
}

export type ScoreLogRow = {
  id?: string; points: number; kind?: string; label: string; collab_id?: string | null
  campaign_id?: string | null; campaign_title?: string | null; estimated?: boolean; created_at: string
}
export type CampaignGroup = { key: string; title: string; net: number; rows: ScoreLogRow[] }

/** Totaluri, grupare pe campanii și rândul „Alte puncte” (diferența dintre scorul real și ce e în istoric). */
export function summarizeScoreLog(rows: ScoreLogRow[], currentScore: number) {
  const list = [...(rows || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  const earned = list.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0)
  const lost = list.filter(r => r.points < 0).reduce((s, r) => s + r.points, 0)
  const other = Math.round(Number(currentScore || 0)) - (earned + lost)

  const map = new Map<string, CampaignGroup>()
  const outside: ScoreLogRow[] = []
  for (const r of list) {
    if (!r.campaign_id && !r.campaign_title) { outside.push(r); continue }
    const key = r.campaign_id || String(r.campaign_title)
    const g = map.get(key) || { key, title: r.campaign_title || 'Campanie', net: 0, rows: [] }
    g.net += r.points
    g.rows.push(r)
    map.set(key, g)
  }
  const campaigns = [...map.values()].sort((a, b) => String(b.rows[0].created_at).localeCompare(String(a.rows[0].created_at)))
  return { list, earned, lost, other, campaigns, outside, outsideNet: outside.reduce((s, r) => s + r.points, 0) }
}

/** Cheie „Noiembrie 2026” pentru gruparea cronologică. */
export function monthLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const s = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
