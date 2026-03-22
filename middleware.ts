import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // ── Admin protection ────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url))
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: adminRow } = await serviceClient
      .from('admins')
      .select('user_id, role, permissions, is_active')
      .eq('user_id', user.id)
      .single()

    // Not an admin or deactivated
    if (!adminRow || adminRow.is_active === false) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    const isSuperAdmin = adminRow.role === 'super_admin'
    const permissions: string[] = adminRow.permissions || []

    // Pages only super_admin can access
    const superAdminOnly = [
      '/admin/admins',       // manage admins
      '/admin/revenue',      // financial overview
      '/admin/payments',     // top-up brands
    ]

    if (superAdminOnly.some(p => pathname.startsWith(p)) && !isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Permission-gated pages
    const permissionMap: Record<string, string> = {
      '/admin/withdrawals': 'manage_withdrawals',
      '/admin/influencers': 'approve_influencers',
      '/admin/brands': 'approve_brands',
      '/admin/campaigns': 'manage_campaigns',
      '/admin/identity': 'approve_influencers',
      '/admin/collaborations': 'manage_campaigns',
    }

    for (const [path, permission] of Object.entries(permissionMap)) {
      if (pathname.startsWith(path) && !isSuperAdmin && !permissions.includes(permission)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
  }

  // ── Brand / influencer protection ───────────────────────────────────────────
  const isProtected = pathname.startsWith('/brand') || pathname.startsWith('/influencer')
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // ── Influencer pending approval gate ────────────────────────────────────────
  const influencerExempt = ['/influencer/pending', '/influencer/onboarding']
  if (pathname.startsWith('/influencer') && !influencerExempt.some(p => pathname.startsWith(p)) && user) {
    try {
      const { data: inf } = await supabase
        .from('influencers')
        .select('approval_status')
        .eq('user_id', user.id)
        .maybeSingle()
      if (inf && inf.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/influencer/pending', request.url))
      }
    } catch (_) { }
  }

  // ── Brand onboarding gate ────────────────────────────────────────────────────
  if (pathname.startsWith('/brand') && !pathname.startsWith('/brand/onboarding') && user) {
    try {
      const { data: brand } = await supabase
        .from('brands')
        .select('onboarding_done')
        .eq('user_id', user.id)
        .maybeSingle()
      if (brand && brand.onboarding_done === false) {
        return NextResponse.redirect(new URL('/brand/onboarding', request.url))
      }
    } catch (_) { }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}