import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, getSessionBrandId, verifyAdminSession, unauthorized, forbidden } from '@/lib/api-auth'
import { toCsv, csvFilename, COLLAB_STATUS_RO, fmtDateRo, type Cell } from '@/lib/csv'
import { campaignMetrics, collabPostUrls, SOURCE_LABEL } from '@/lib/post-metrics'
import { creatorTierInfo, parseCount } from '@/lib/tiers'
import { limitRequest } from '@/lib/rate-limit'
import { logError } from '@/lib/log-error'

// Exporturi CSV pentru branduri:
//   ?type=applicants&campaign=ID   — aplicanții unei campanii (cu adresa de livrare pentru cei acceptați)
//   ?type=report&campaign=ID       — postările și metricile campaniei
//   ?type=collaborations           — toate colaborările brandului, din toate campaniile
const ACCEPTED = ['ACTIVE', 'COMPLETED']

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

const followersOf = (i: any) => creatorTierInfo(i).followers || 0
const handleOf = (i: any, platform: string) => {
  const p = (Array.isArray(i?.platforms) ? i.platforms : []).find((x: any) => String(x?.platform || '').toLowerCase() === platform)
  if (platform === 'instagram' && i?.instagram_handle) return `@${String(i.instagram_handle).replace(/^@/, '')}`
  return p?.url || p?.handle || ''
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  { const limited = await limitRequest(req, 'brand-export', { maxRequests: 20, windowMs: 10 * 60 * 1000 }, user.id); if (limited) return limited }

  const type = req.nextUrl.searchParams.get('type') || ''
  const campaignId = req.nextUrl.searchParams.get('campaign') || ''
  const admin = createAdminClient()
  const isAdmin = !!(await verifyAdminSession())
  const brandId = await getSessionBrandId(user.id)
  if (!brandId && !isAdmin) return forbidden()

  try {
    // ── o campanie ─────────────────────────────────────────────
    if (type === 'applicants' || type === 'report') {
      const { data: camp } = await admin.from('campaigns').select('id, title, brand_id, campaign_type').eq('id', campaignId).maybeSingle()
      if (!camp) return NextResponse.json({ error: 'Campanie inexistentă' }, { status: 404 })
      if (!isAdmin && camp.brand_id !== brandId) return forbidden()

      if (type === 'report') {
        const { rows, totals } = await campaignMetrics(admin, campaignId)
        const out: Cell[][] = rows.map(r => [
          r.influencer_name || '', r.platform, r.url, SOURCE_LABEL[r.source] || r.source,
          r.views, r.reach, r.likes, r.comments, r.shares, r.saves,
          r.views ? Math.round((((r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.saves || 0)) / r.views) * 1000) / 10 : '',
          fmtDateRo(r.fetched_at || r.reported_at || null),
        ])
        out.push([], ['TOTAL', '', `${totals.posts} postări`, '', totals.views, totals.reach, totals.likes, totals.comments, totals.shares, totals.saves, totals.engagementRate ?? '', ''])
        return csvResponse(
          toCsv(['Creator', 'Platformă', 'Link postare', 'Sursa datelor', 'Vizualizări', 'Reach', 'Like-uri', 'Comentarii', 'Distribuiri', 'Salvări', 'Engagement %', 'Actualizat'], out),
          csvFilename('raport', camp.title),
        )
      }

      const { data: collabs, error } = await admin.from('collaborations').select('*').eq('campaign_id', campaignId).order('created_at')
      if (error) throw new Error(error.message)
      const ids = [...new Set((collabs || []).map((c: any) => c.influencer_id).filter(Boolean))]
      const { data: infs } = ids.length ? await admin.from('influencers').select('*').in('id', ids) : { data: [] as any[] }
      const byId = new Map((infs || []).map((i: any) => [i.id, i]))
      const out: Cell[][] = (collabs || []).map((c: any) => {
        const i: any = byId.get(c.influencer_id) || {}
        const accepted = ACCEPTED.includes(c.status)
        const tier = creatorTierInfo(i)
        return [
          i.name || '', i.slug ? `https://addfame.ro/influencer/${i.slug}` : '',
          COLLAB_STATUS_RO[c.status] || c.status, fmtDateRo(c.created_at),
          tier.tier?.label || '', followersOf(i) || '', tier.source === 'verified' ? 'verificat' : tier.source ? 'declarat' : '',
          handleOf(i, 'instagram'), handleOf(i, 'tiktok'),
          (i.niches || []).join(', '), i.city || '',
          collabPostUrls(c).join(' '),
          accepted ? c.delivery_name || '' : '', accepted ? c.delivery_phone || '' : '',
          accepted ? [c.delivery_address, c.delivery_city, c.delivery_county, c.delivery_postal_code].filter(Boolean).join(', ') : '',
        ]
      })
      return csvResponse(
        toCsv(['Creator', 'Profil AddFame', 'Status', 'Aplicat la', 'Categorie', 'Urmăritori', 'Urmăritori (sursa)', 'Instagram', 'TikTok', 'Nișe', 'Oraș', 'Linkuri postări', 'Livrare: nume', 'Livrare: telefon', 'Livrare: adresă'], out),
        csvFilename('aplicanti', camp.title),
      )
    }

    // ── toate colaborările brandului ───────────────────────────
    if (type === 'collaborations') {
      if (!brandId) return NextResponse.json({ error: 'Doar pentru conturile de brand' }, { status: 400 })
      const { data: camps } = await admin.from('campaigns').select('id, title, campaign_type, status').eq('brand_id', brandId)
      const campIds = (camps || []).map((c: any) => c.id)
      const campById = new Map((camps || []).map((c: any) => [c.id, c]))
      const collabs: any[] = []
      for (let i = 0; i < campIds.length; i += 200) {
        const { data } = await admin.from('collaborations')
          .select('id, campaign_id, influencer_id, status, created_at, completed_at, payment_amount, deliverable_url, deliverable_urls')
          .in('campaign_id', campIds.slice(i, i + 200))
        collabs.push(...(data || []))
      }
      const ids = [...new Set(collabs.map(c => c.influencer_id).filter(Boolean))]
      const infs: any[] = []
      for (let i = 0; i < ids.length; i += 300) {
        const { data } = await admin.from('influencers').select('*').in('id', ids.slice(i, i + 300))
        infs.push(...(data || []))
      }
      const byId = new Map(infs.map(i => [i.id, i]))
      collabs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      const out: Cell[][] = collabs.map(c => {
        const i: any = byId.get(c.influencer_id) || {}
        const camp: any = campById.get(c.campaign_id) || {}
        return [
          camp.title || '', String(camp.campaign_type || '').toUpperCase() === 'BARTER' ? 'Barter' : 'Plătită',
          i.name || '', COLLAB_STATUS_RO[c.status] || c.status, fmtDateRo(c.created_at), fmtDateRo(c.completed_at),
          parseCount(c.payment_amount) || '', followersOf(i) || '', collabPostUrls(c).join(' '),
        ]
      })
      return csvResponse(
        toCsv(['Campanie', 'Tip', 'Creator', 'Status', 'Aplicat la', 'Finalizat la', 'Plată (RON)', 'Urmăritori', 'Linkuri postări'], out),
        csvFilename('colaborari', new Date().toISOString().slice(0, 10)),
      )
    }

    return NextResponse.json({ error: 'Tip de export necunoscut' }, { status: 400 })
  } catch (e) {
    await logError(e, { source: 'server', url: '/api/brand/export', userId: user.id })
    return NextResponse.json({ error: 'Exportul a eșuat. Încearcă din nou.' }, { status: 500 })
  }
}
