import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildShowcase } from '@/lib/showcase'

// Lista de branduri partenere, doar pentru brandurile autentificate.
// Trimite exclusiv câmpurile permise (vezi lib/showcase.ts); restul datelor campaniei nu părăsesc serverul.
export async function GET() {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })
    const admin = createAdminClient()
    const { data: me } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!me) return NextResponse.json({ error: 'Doar pentru branduri' }, { status: 403 })

    const { data: brands } = await admin.from('brands').select('id, name, logo').eq('show_in_showcase', true)
    const ids = (brands || []).map((b: any) => b.id)
    if (!ids.length) return NextResponse.json({ brands: [] })
    const { data: campaigns } = await admin.from('campaigns')
      .select('id, brand_id, title, status, offer_images, offer_image_urls, offer_image_url')
      .in('brand_id', ids).in('status', ['ACTIVE', 'COMPLETED'])
    const cids = (campaigns || []).map((c: any) => c.id)
    const { data: collabs } = cids.length
      ? await admin.from('collaborations').select('campaign_id, status').in('campaign_id', cids).in('status', ['ACTIVE', 'COMPLETED'])
      : { data: [] as any[] }
    return NextResponse.json({ brands: buildShowcase(brands || [], campaigns || [], collabs || []) })
  } catch (e: any) {
    return NextResponse.json({ error: 'Nu am putut încărca lista' }, { status: 500 })
  }
}
