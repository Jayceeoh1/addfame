import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { emailProfileReminder } from '@/lib/email'
import { rateLimit, getClientIP, LIMITS } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 emailuri/oră per IP
    const ip = await getClientIP()
    const rl = await rateLimit(`reminder:${ip}`, LIMITS.email)
    if (!rl.ok) return NextResponse.json({ error: 'Prea multe emailuri trimise. Încearcă din nou mai târziu.' }, { status: 429 })
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify admin
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: adminRow } = await admin.from('admins').select('role').eq('user_id', user.id).single()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { influencer_id, custom_message } = await req.json()
    if (!influencer_id) return NextResponse.json({ error: 'influencer_id required' }, { status: 400 })

    // Get influencer data
    const { data: inf } = await admin
      .from('influencers')
      .select('name, avatar, bio, niches, platforms, slug, identity_verified, city')
      .eq('id', influencer_id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

    // Get email from auth.users via user_id
    const { data: infUser } = await admin
      .from('influencers')
      .select('user_id')
      .eq('id', influencer_id)
      .single()

    const { data: authUser } = await admin.auth.admin.getUserById(infUser?.user_id)
    const email = authUser?.user?.email

    if (!email) return NextResponse.json({ error: 'Email negăsit pentru acest influencer' }, { status: 404 })

    // Calculate missing items
    const missing: string[] = []
    if (!inf.bio) missing.push('Bio — spune-le brandurilor cine ești')
    if (!inf.niches || inf.niches.length === 0) missing.push('Nișe de conținut — Fashion, Food, Tech etc.')
    if (!inf.platforms || inf.platforms.length === 0) missing.push('Platforme sociale — Instagram, TikTok, YouTube')
    if (!inf.avatar) missing.push('Poză de profil')
    if (!inf.slug) missing.push('Link profil public (slug)')
    if (!inf.city) missing.push('Orașul/Comuna — necesar pentru oferte barter locale din zona ta')
    if (!inf.identity_verified) missing.push('Verificare identitate — necesară pentru a aplica')

    // Send email
    const result = await emailProfileReminder(email, inf.name || 'Creator', missing, custom_message)

    if (!result?.ok) {
      return NextResponse.json({ error: 'Email-ul nu a putut fi trimis. Verifică RESEND_API_KEY.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email,
      missing_count: missing.length,
      missing,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}