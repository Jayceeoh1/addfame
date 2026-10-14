// Numele unei campanii așa cum îl vede influencerul.
// Campaniile barter au în baza de date un titlu generat („[Barter] Brand — Produs gratuit (Instagram)”);
// numele real e numele ofertei (offer_name), ex. „Ser concentrat pentru ten gras”.

type CampaignLike = { title?: string | null; offer_name?: string | null; product_name?: string | null } | null | undefined

/** Titlul fără etichetele tehnice: [Barter], [Managed], [Draft]. */
export function stripCampaignTags(title?: string | null): string {
  return String(title ?? '').replace(/^(\s*\[(Barter|Managed|Draft|Paid|Plătit[ăa]?)\]\s*)+/i, '').trim()
}

/** Titlul generat automat pentru barter, fără nume real („Brand — Produs gratuit (Instagram)”). */
export function isGenericBarterTitle(title?: string | null): boolean {
  return /—\s*(Produs|Serviciu) gratuit\s*\(/i.test(String(title ?? ''))
}

/** Numele afișat: numele ofertei (barter) / al produsului, altfel titlul curățat. */
export function campaignName(c: CampaignLike, fallback = 'Campanie'): string {
  const offer = String(c?.offer_name ?? '').trim()
  const product = String(c?.product_name ?? '').trim()
  const title = stripCampaignTags(c?.title)
  if (offer && (isGenericBarterTitle(c?.title) || !title)) return offer
  if (title && !isGenericBarterTitle(c?.title)) return title
  return offer || product || title || fallback
}

/** Username-ul de Instagram dintr-un handle sau URL („@ana”, „instagram.com/ana/”, „https://www.instagram.com/ana?igsh=…”). */
export function instagramUsername(v?: string | null): string | null {
  let s = String(v ?? '').trim()
  if (!s) return null
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  if (m) s = m[1]
  s = s.replace(/^@+/, '').replace(/\/+$/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(s) && !['p', 'reel', 'reels', 'stories', 'explore'].includes(s.toLowerCase()) ? s : null
}
