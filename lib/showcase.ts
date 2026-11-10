// Lista brandurilor partenere: ce are voie să vadă un brand despre campaniile altor branduri.
// Doar banner, titlu, status și numărul de creatori. Fără buget, creatori, brief sau alte detalii.

export type ShowcaseCampaign = { title: string; banner: string | null; status: 'ACTIVE' | 'COMPLETED'; creators: number }
export type ShowcaseBrand = {
  id: string; name: string; logo: string | null
  active: number; completed: number; creators: number
  campaigns: ShowcaseCampaign[]
}

const coverOf = (c: any): string | null =>
  (Array.isArray(c?.offer_images) && c.offer_images[0]) || (Array.isArray(c?.offer_image_urls) && c.offer_image_urls[0]) || c?.offer_image_url || null

export function buildShowcase(brands: any[], campaigns: any[], collabs: any[]): ShowcaseBrand[] {
  const perCampaign = new Map<string, number>()
  for (const x of collabs || []) {
    if (x?.status === 'ACTIVE' || x?.status === 'COMPLETED') perCampaign.set(x.campaign_id, (perCampaign.get(x.campaign_id) || 0) + 1)
  }
  const out: ShowcaseBrand[] = []
  for (const b of brands || []) {
    const list: ShowcaseCampaign[] = (campaigns || [])
      .filter(c => c.brand_id === b.id && (c.status === 'ACTIVE' || c.status === 'COMPLETED'))
      .map(c => ({
        title: String(c.title || 'Campanie').replace(/^\[Barter\]\s*/i, ''),
        banner: coverOf(c), status: c.status as 'ACTIVE' | 'COMPLETED', creators: perCampaign.get(c.id) || 0,
      }))
    if (!list.length) continue
    list.sort((a, b2) => (a.status === b2.status ? 0 : a.status === 'ACTIVE' ? -1 : 1))
    out.push({
      id: b.id, name: String(b.name || 'Brand'), logo: b.logo || null,
      active: list.filter(c => c.status === 'ACTIVE').length,
      completed: list.filter(c => c.status === 'COMPLETED').length,
      creators: list.reduce((s, c) => s + c.creators, 0),
      campaigns: list,
    })
  }
  return out.sort((a, b) => b.creators - a.creators)
}
