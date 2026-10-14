import { NextRequest, NextResponse } from 'next/server'
import { campaignName } from '@/lib/campaign-name'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const adminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getAdminUser() {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: adminRow } = await adminClient().from('admins').select('id').eq('user_id', user.id).single()
  return adminRow ? user : null
}

function randomToken(name: string): string {
  const slug = name.toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îi]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  const rand = Math.random().toString(36).slice(2, 8)
  return `${slug}-${rand}`
}

export async function GET() {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await adminClient().from('cesiune_contracts').select('*').neq('status', 'archived').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Numele real al campaniei (oferta), și pentru campaniile deja încheiate
    const ids = [...new Set((data || []).map((c: any) => c.campaign_id).filter(Boolean))]
    const camps = new Map<string, any>()
    for (let i = 0; i < ids.length; i += 150) {
      const { data: cs } = await adminClient().from('campaigns')
        .select('id, title, offer_name, product_name, status, brand_name, brands(name, company_legal_name)').in('id', ids.slice(i, i + 150))
      for (const c of cs || []) camps.set(c.id, c)
    }
    const contracts = (data || []).map((c: any) => {
      const camp = c.campaign_id ? camps.get(c.campaign_id) : null
      return camp ? { ...c, campaign: {
        name: campaignName(camp, c.campaign_title || 'Campanie'),
        offer_name: camp.offer_name || camp.product_name || null,
        status: camp.status,
        brand: (camp.brands as any)?.company_legal_name || camp.brand_name || (camp.brands as any)?.name || null,
      } } : c
    })
    return NextResponse.json({ contracts })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const {
      influencer_name, influencer_email, influencer_phone,
      influencer_cnp, influencer_ci_serie, influencer_ci_numar, influencer_address,
      campaign_title, product_name, product_value_lei, contract_number,
      brand_name, brand_cui, brand_reg_com, brand_address, brand_website, notes,
      campaign_id, influencer_id,
    } = body
    if (!influencer_name || !influencer_email) return NextResponse.json({ error: 'Câmpuri obligatorii lipsă' }, { status: 400 })

    const token = randomToken(influencer_name)

    // Auto-număr contract dacă nu e dat manual: următorul din serie
    let number = contract_number
    if (!number) {
      const { count } = await adminClient().from('cesiune_contracts').select('*', { count: 'exact', head: true })
      number = String((count || 0) + 1)
    }

    const { data, error } = await adminClient().from('cesiune_contracts').insert({
      token,
      contract_number: number,
      influencer_name,
      influencer_email,
      influencer_phone: influencer_phone || null,
      influencer_cnp: influencer_cnp || null,
      influencer_ci_serie: influencer_ci_serie || null,
      influencer_ci_numar: influencer_ci_numar || null,
      influencer_address: influencer_address || null,
      campaign_title: campaign_title || null,
      product_name: product_name || null,
      product_value_lei: product_value_lei || null,
      brand_name: brand_name || null,
      brand_cui: brand_cui || null,
      brand_reg_com: brand_reg_com || null,
      brand_address: brand_address || null,
      brand_website: brand_website || null,
      notes: notes || null,
      campaign_id: campaign_id || null,
      influencer_id: influencer_id || null,
      status: 'draft',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contract: data })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
