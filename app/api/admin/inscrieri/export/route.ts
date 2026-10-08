import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/drafts'
import { toCsv, csvFilename, fmtDateRo, type Cell } from '@/lib/csv'
import { costPer1k, zoneLabel, STATUS_LABEL, PLATFORMS, genderLabel, audienceGenderLabel } from '@/lib/creator-signups'

// GET ?form=<id>[&status=selected] → CSV cu înscrierile (Excel, „;”, diacritice corecte)
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('form') || ''
  const status = req.nextUrl.searchParams.get('status') || ''
  if (!isUuid(id)) return NextResponse.json({ error: 'pagină invalidă' }, { status: 400 })
  const admin = createAdminClient()
  const { data: c } = await admin.from('signup_forms').select('slug, title').eq('id', id).maybeSingle()
  let q = admin.from('signup_entries').select('*').eq('form_id', id).order('created_at')
  if (status) q = q.eq('status', status)
  const { data: rows, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['Status', 'Prenume', 'Nume', 'Gen', 'Email', 'Telefon', 'Zonă', 'Poate veni în București', 'Permis B', 'Ani condus',
    ...PLATFORMS.flatMap(p => [`${p.label} cont`, `${p.label} urmăritori`, `${p.label} vizualizări medii`]),
    'Platformă principală', 'Preț / video (RON)', 'Cost / 1.000 viz. (RON)', 'Preț YouTube (RON)', 'Preț 3 story-uri (RON)',
    'Facturare', 'Drepturi reclame', 'Acceptă barter', 'Conținut', 'Linkuri video', 'Experiență auto', 'Audiență din București',
    'Vârstă audiență', 'Gen audiență', 'Disponibilitate', 'Postează în', 'Observații creator', 'Notă admin', 'Înscris pe']
  const out: Cell[][] = (rows || []).map((r: any) => [
    STATUS_LABEL[r.status] || r.status, r.first_name, r.last_name, r.gender ? genderLabel(r.gender) : '', r.email, r.phone, zoneLabel(r.zone, r.other_city), r.can_travel,
    r.has_license ? 'Da' : 'Nu', r.driving_years,
    ...PLATFORMS.flatMap(p => { const x = r.platforms?.[p.key]; return x ? [x.handle, x.followers, x.avg_views || ''] : ['', '', ''] }),
    PLATFORMS.find(p => p.key === r.main_platform)?.label || r.main_platform, r.price_video, costPer1k(r.price_video, r.main_avg_views) ?? '',
    r.price_youtube, r.price_stories, r.invoicing, r.usage_rights, r.accepts_barter ? 'Da' : 'Nu',
    (r.content_types || []).join(', '), (r.sample_links || []).join(' '), r.auto_experience, r.audience_city_share, r.audience_age, r.audience_gender ? audienceGenderLabel(r.audience_gender) : '',
    (r.availability || []).join(', '), r.posting_time, r.notes, r.admin_note, fmtDateRo(r.created_at),
  ])
  return new NextResponse(toCsv(headers, out), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${csvFilename('inscrieri', c?.slug || 'export', status || 'toti')}"`,
      'Cache-Control': 'no-store',
    },
  })
}
