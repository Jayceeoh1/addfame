// Portofoliul public al unui creator: colaborările finalizate, grupate pe brand,
// cu postările, recenzia brandului și (doar pentru vizitatori autorizați) cifrele postărilor.
// Funcții pure, testabile; ruta /api/public/influencer-portfolio doar aduce datele.

export interface PortfolioPost {
  url: string | null            // null pentru branduri (fără link spre conturile creatorului)
  platform: 'instagram' | 'tiktok' | 'youtube' | 'other'
  thumbnail: string | null
  views: number | null
  likes: number | null
  comments: number | null
  shares: number | null
}

export interface PortfolioCollab {
  id: string
  campaign: string
  completedAt: string | null
  rating: number | null
  comment: string | null
  posts: PortfolioPost[]
}

export interface PortfolioBrand {
  key: string
  name: string
  logo: string | null
  collabs: PortfolioCollab[]
  rating: number | null          // media notelor acestui brand
  lastAt: string | null
}

export interface PortfolioSummary {
  completed: number
  brands: number
  rating: number | null
  ratingCount: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
  views: number | null          // null când cifrele nu sunt vizibile
  likes: number | null
}

export function platformOf(url?: string | null): PortfolioPost['platform'] {
  const u = String(url || '').toLowerCase()
  if (u.includes('instagram.com')) return 'instagram'
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  return 'other'
}

/** Logo utilizabil în pagină: URL http(s) sau o imagine inline mică (base64 mare = prea greu pentru listă). */
export function usableLogo(v?: string | null): string | null {
  const s = String(v || '').trim()
  if (/^https?:\/\//i.test(s)) return s
  if (/^data:image\//i.test(s) && s.length <= 60_000) return s
  return null
}

const num = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/** Grupează colaborările pe brand (cel mai recent brand primul) și calculează sumarul. */
export type BrandRef = { key: string; name: string; logo: string | null }

export function buildPortfolio(
  input: Array<PortfolioCollab & { brand: BrandRef }>,
  opts: { totalCompleted?: number; showMetrics: boolean },
): { summary: PortfolioSummary; brands: PortfolioBrand[] } {
  const map = new Map<string, PortfolioBrand>()
  const collabs: PortfolioCollab[] = []
  for (const { brand: b, ...c } of input) {
    collabs.push(c)
    const g = map.get(b.key) || { key: b.key, name: b.name, logo: b.logo, collabs: [], rating: null, lastAt: null }
    g.collabs.push(c)
    if (!g.logo && b.logo) g.logo = b.logo
    if (c.completedAt && (!g.lastAt || c.completedAt > g.lastAt)) g.lastAt = c.completedAt
    map.set(b.key, g)
  }
  const brands = [...map.values()]
  for (const g of brands) {
    g.collabs.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
    const rs = g.collabs.map(c => c.rating).filter((r): r is number => typeof r === 'number' && r > 0)
    g.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10 : null
  }
  brands.sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')))

  const ratings = collabs.map(c => c.rating).filter((r): r is number => typeof r === 'number' && r > 0)
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as PortfolioSummary['distribution']
  for (const r of ratings) distribution[Math.min(5, Math.max(1, Math.round(r))) as 1 | 2 | 3 | 4 | 5]++
  const posts = collabs.flatMap(c => c.posts)
  const sum = (k: 'views' | 'likes') => {
    const vals = posts.map(p => p[k]).filter((v): v is number => typeof v === 'number')
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null
  }

  return {
    brands,
    summary: {
      completed: Math.max(opts.totalCompleted ?? 0, collabs.length),
      brands: brands.length,
      rating: ratings.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      ratingCount: ratings.length,
      distribution,
      views: opts.showMetrics ? sum('views') : null,
      likes: opts.showMetrics ? sum('likes') : null,
    },
  }
}

/** Postările unei colaborări: rândurile de statistici, altfel linkul livrat. Cifrele doar dacă e voie. */
export function collabPosts(
  deliverableUrl: string | null,
  collabThumb: string | null,
  metrics: Array<{ url: string; platform?: string | null; thumbnail_url?: string | null; views?: any; likes?: any; comments?: any; shares?: any }>,
  opts: { showMetrics: boolean; hideLinks: boolean },
): PortfolioPost[] {
  const rows = metrics.length ? metrics : (deliverableUrl ? [{ url: deliverableUrl, thumbnail_url: collabThumb }] : [])
  const seen = new Set<string>()
  return rows.filter(r => r.url && !seen.has(r.url) && seen.add(r.url)).map(r => ({
    url: opts.hideLinks ? null : r.url,
    platform: platformOf(r.url),
    thumbnail: r.thumbnail_url || collabThumb || null,
    views: opts.showMetrics ? num((r as any).views) : null,
    likes: opts.showMetrics ? num((r as any).likes) : null,
    comments: opts.showMetrics ? num((r as any).comments) : null,
    shares: opts.showMetrics ? num((r as any).shares) : null,
  }))
}

/** 41600 → „41,6 K”, 1110 → „1,1 K”, 1250000 → „1,3 M” */
export function compactRo(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '–'
  const f = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',')
  if (n >= 1e6) return `${f(n / 1e6)} M`
  if (n >= 1e4) return `${f(n / 1e3)} K`
  if (n >= 1e3) return `${f(n / 1e3)} K`
  return String(Math.round(n))
}
