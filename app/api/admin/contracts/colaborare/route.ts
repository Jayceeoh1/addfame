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
    const { data, error } = await adminClient().from('colaborare_contracts').select('*').neq('status', 'archived').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contracts: data })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { influencer_name, influencer_email, influencer_phone, influencer_address, amount_lei, payment_days, campaign_title, platform, deliverables, notes } = body
    if (!influencer_name || !influencer_email || !amount_lei) return NextResponse.json({ error: 'Câmpuri obligatorii lipsă' }, { status: 400 })
    const token = randomToken(influencer_name)
    const { data, error } = await adminClient().from('colaborare_contracts').insert({ token, influencer_name, influencer_email, influencer_phone: influencer_phone || null, influencer_address: influencer_address || null, amount_lei, payment_days: payment_days || 14, campaign_title: campaign_title || null, platform: platform || null, deliverables: deliverables || null, notes: notes || null, status: 'draft' }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contract: data })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
