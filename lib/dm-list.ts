// Lista de creatori pentru invitații pe Instagram (DM): scor de potrivire, link de profil, CSV, mesaj. Funcții pure.
import { creatorTierInfo, parseCount } from '@/lib/tiers'

export type DmCandidate = {
  id: string; name?: string | null; instagram_handle?: string | null; city?: string | null
  niches?: unknown; creator_score?: number | null; last_active_at?: string | null
  engagement_rate?: number | string | null; instagram_connected?: boolean | null
  ig_followers?: number | null; instagram_followers?: number | string | null; tt_followers?: number | string | null; platforms?: unknown
}

/** Handle curat (fără @, fără link), sau null dacă nu arată a username de Instagram. */
export function cleanHandle(raw: unknown): string | null {
  let s = String(raw ?? '').trim()
  if (!s) return null
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#\s]/)[0]
  return /^[a-z0-9._]{1,30}$/i.test(s) ? s : null
}

export function instagramUrl(handle: unknown): string | null {
  const h = cleanHandle(handle)
  return h ? `https://www.instagram.com/${h}/` : null
}

function nicheList(n: unknown): string[] {
  if (Array.isArray(n)) return n.map(x => String(x).toLowerCase().trim()).filter(Boolean)
  if (typeof n === 'string') return n.split(/[,;|]/).map(x => x.toLowerCase().trim()).filter(Boolean)
  return []
}

/** Scor 0–100: activ recent, nișă potrivită, număr de urmăritori în zona bună pentru barter, Creator Score, engagement. */
export function dmScore(c: DmCandidate, campaignNiches: unknown, now = Date.now()): number {
  let s = 0
  if (c.last_active_at) {
    const days = (now - new Date(c.last_active_at).getTime()) / 86_400_000
    s += days <= 7 ? 30 : days <= 30 ? 22 : days <= 90 ? 10 : 0
  }
  const want = nicheList(campaignNiches), have = nicheList(c.niches)
  if (want.length && have.some(h => want.some(w => h.includes(w) || w.includes(h)))) s += 25
  const f = creatorTierInfo(c as any).followers
  if (f >= 3_000 && f <= 60_000) s += 20
  else if (f >= 1_000 && f < 3_000) s += 12
  else if (f > 60_000) s += 8
  s += Math.min(15, Math.round((Number(c.creator_score) || 0) / 10))
  const er = parseCount(c.engagement_rate) || Number(c.engagement_rate) || 0
  if (er >= 3) s += 10; else if (er >= 1.5) s += 6
  return Math.min(100, s)
}

export type DmRow = { id: string; name: string; handle: string; url: string; followers: number; city: string; score: number }

/** Alege cei mai potriviți `limit` creatori cu Instagram valid, fără cei excluși. */
export function pickDmList(cands: DmCandidate[], campaignNiches: unknown, limit = 300, exclude: Set<string> = new Set(), now = Date.now()): DmRow[] {
  const rows: DmRow[] = []
  for (const c of cands) {
    if (exclude.has(c.id)) continue
    const handle = cleanHandle(c.instagram_handle)
    if (!handle) continue
    rows.push({
      id: c.id, name: String(c.name || handle), handle, url: `https://www.instagram.com/${handle}/`,
      followers: creatorTierInfo(c as any).followers, city: String(c.city || ''), score: dmScore(c, campaignNiches, now),
    })
  }
  rows.sort((a, b) => b.score - a.score || b.followers - a.followers)
  return rows.slice(0, limit)
}

function csvCell(v: unknown): string {
  const s = String(v ?? '')
  const safe = /^[=+\-@]/.test(s) ? "'" + s : s   // fără formule în Excel
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: DmRow[], sent: Set<string> = new Set()): string {
  const head = ['Nr', 'Nume', 'Instagram', 'Link Instagram', 'Urmăritori', 'Oraș', 'Scor', 'Trimis']
  const lines = rows.map((r, i) => [i + 1, r.name, '@' + r.handle, r.url, r.followers || '', r.city, r.score, sent.has(r.id) ? 'da' : ''].map(csvCell).join(','))
  return '﻿' + [head.join(','), ...lines].join('\r\n')
}

export function dmMessage(firstName: string, campaignName: string, link: string): string {
  const n = (firstName || '').trim().split(/\s+/)[0] || 'salut'
  return `Salut, ${n}! Sunt de la AddFame. Avem o campanie nouă, „${campaignName}”, cu produse primite gratuit în schimbul unui Reel/Story, și cred că ți se potrivește. Locurile sunt limitate, intră în contul tău AddFame și aplică aici: ${link}`
}
