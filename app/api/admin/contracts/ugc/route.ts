import { NextRequest, NextResponse } from 'next/server'
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

function makeSlug(name: string, shortId: string): string {
  let slug = name.toLowerCase()
  slug = slug.replace(/[ăâ]/g, 'a')
  slug = slug.replace(/[îi]/g, 'i')
  slug = slug.replace(/[șş]/g, 's')
  slug = slug.replace(/[țţ]/g, 't')
  slug = slug.replace(/[^a-z0-9\s-]/g, '')
  slug = slug.trim().replace(/\s+/g, '-')
  return `${slug}-${shortId}`
}

function randomShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// GET — list all UGC contracts
export async function GET() {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await adminClient()
      .from('ugc_contracts')
      .select('*')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contracts: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create new UGC contract
export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { influencer_name, influencer_email, influencer_phone, influencer_address, amount_lei, payment_days, notes } = body

    if (!influencer_name || !influencer_email || !amount_lei) {
      return NextResponse.json({ error: 'Campuri obligatorii lipsa: nume, email, suma' }, { status: 400 })
    }

    // Generate friendly token: slug-shortid
    let token = ''
    let attempts = 0
    while (attempts < 10) {
      const candidate = makeSlug(influencer_name, randomShortId(6))
      // Check uniqueness
      const { data: existing } = await adminClient()
        .from('ugc_contracts')
        .select('id')
        .eq('token', candidate)
        .single()
      if (!existing) { token = candidate; break }
      attempts++
    }
    if (!token) token = makeSlug(influencer_name, randomShortId(10)) // fallback longer

    const { data, error } = await adminClient()
      .from('ugc_contracts')
      .insert({
        token,
        influencer_name,
        influencer_email,
        influencer_phone: influencer_phone || null,
        influencer_address: influencer_address || null,
        amount_lei: Number(amount_lei),
        payment_days: Number(payment_days) || 14,
        notes: notes || null,
        status: 'draft',
        created_by_admin_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contract: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
