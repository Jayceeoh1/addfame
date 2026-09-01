import { NextResponse } from 'next/server'
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

// Campanii active/pauzate + datele legale ale brandului, pentru autocompletarea contractelor.
export async function GET() {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await adminClient()
      .from('campaigns')
      .select('id, title, status, product_name, product_description, deliverables, platforms, brand_id, brand_name, brands(name, company_legal_name, cui, company_address, website)')
      .in('status', ['ACTIVE', 'PAUSED'])
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const campaigns = (data || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      product_name: c.product_name || c.product_description || null,
      deliverables: c.deliverables || null,
      platforms: c.platforms || [],
      brand_name: c.brand_name || c.brands?.name || null,
      brand_legal_name: c.brands?.company_legal_name || c.brand_name || c.brands?.name || null,
      brand_cui: c.brands?.cui || null,
      brand_address: c.brands?.company_address || null,
      brand_website: c.brands?.website || null,
    }))

    return NextResponse.json({ campaigns })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
