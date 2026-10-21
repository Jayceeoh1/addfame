// Lista de creatori pentru invitații pe Instagram (DM): scor de potrivire, link de profil, CSV, mesaj. Funcții pure.
import { creatorTierInfo, parseCount, normalizePlatforms } from '@/lib/tiers'

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

/** Handle-ul de Instagram: din câmpul instagram_handle, altfel din lista de platforme (username sau link). */
export function igHandleOf(c: { instagram_handle?: unknown; platforms?: unknown }): string | null {
  const direct = cleanHandle(c.instagram_handle)
  if (direct) return direct
  for (const p of normalizePlatforms(c.platforms) as any[]) {
    if (String(p?.platform || '').toLowerCase().trim() !== 'instagram') continue
    const h = cleanHandle(p.username) || cleanHandle(p.handle) || cleanHandle(p.url)
    if (h) return h
  }
  return null
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
    const handle = igHandleOf(c)
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

// ─── Export aplicanți (pentru brand): fără email / telefon ──────────────────────
const STATUS_RO: Record<string, string> = { PENDING: 'În așteptare', ACTIVE: 'Acceptat', COMPLETED: 'Finalizat', REJECTED: 'Respins', CANCELLED: 'Anulat' }

export type ApplicantRow = { name: string; handle: string; url: string; followers: number; tier: string; city: string; niches: string; engagement: string; status: string; appliedAt: string }

export function buildApplicantRow(col: { status?: string | null; created_at?: string | null }, inf: DmCandidate & { niches?: unknown }): ApplicantRow {
  const handle = igHandleOf(inf) || ''
  const info = creatorTierInfo(inf as any)
  const er = parseCount(inf.engagement_rate) || Number(inf.engagement_rate) || 0
  return {
    name: String(inf.name || handle || ''), handle, url: handle ? `https://www.instagram.com/${handle}/` : '',
    followers: info.followers, tier: info.tier?.label || '', city: String(inf.city || ''),
    niches: nicheList(inf.niches).join(', '), engagement: er ? String(er).replace('.', ',') + '%' : '',
    status: STATUS_RO[String(col.status || '').toUpperCase()] || String(col.status || ''),
    appliedAt: col.created_at ? new Date(col.created_at).toLocaleDateString('ro-RO') : '',
  }
}

export function applicantsToCsv(rows: ApplicantRow[]): string {
  const head = ['Nr', 'Nume AddFame', 'Instagram', 'Link Instagram', 'Urmăritori', 'Nivel', 'Oraș', 'Nișe', 'Engagement', 'Status', 'Data aplicării']
  const lines = rows.map((r, i) => [i + 1, r.name, r.handle ? '@' + r.handle : '', r.url, r.followers || '', r.tier, r.city, r.niches, r.engagement, r.status, r.appliedAt].map(csvCell).join(','))
  return '﻿' + [head.join(','), ...lines].join('\r\n')
}
