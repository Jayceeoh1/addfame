import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

let cleanupCounter = 0
function maybeCleanup() {
  if (++cleanupCounter % 1000 !== 0) return
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}

const adminCache = new Map<string, { isAdmin: boolean; cachedAt: number }>()
const ADMIN_CACHE_TTL = 5 * 60 * 1000

async function checkIsAdmin(userId: string): Promise<boolean> {
  const now = Date.now()
  const cached = adminCache.get(userId)
  if (cached && now - cached.cachedAt < ADMIN_CACHE_TTL) {
    return cached.isAdmin
  }

  try {
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await serviceClient
      .from('admins')
      .select('is_active')
      .eq('user_id', userId)
      .single()

    const isAdmin = !!(data && data.is_active !== false)
    adminCache.set(userId, { isAdmin, cachedAt: now })
    return isAdmin
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  maybeCleanup()

  // ── Rute complet publice — skip total ────────────────────────────────────
  // /contract/[token] si /api/ugc-contracts sunt publice, fara auth
  if (
    pathname.startsWith('/contract/') ||
    pathname.startsWith('/api/ugc-contracts/') ||
    pathname.startsWith('/api/contracts/') ||
    pathname.startsWith('/api/public/')
  ) {
    return NextResponse.next()
  }

  // ── Rate limiting pe API routes ──────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/auth') || pathname.includes('login') || pathname.includes('register')) {
      if (!rateLimit(`auth:${ip}`, 10, 60_000)) {
        return NextResponse.json({ error: 'Prea multe request-uri. Încearcă din nou în câteva minute.' }, { status: 429 })
      }
    }
    if (pathname.startsWith('/api/stripe') || pathname.startsWith('/api/badge')) {
      if (!rateLimit(`stripe:${ip}`, 20, 60_000)) {
        return NextResponse.json({ error: 'Prea multe request-uri.' }, { status: 429 })
      }
    }
    if (pathname.startsWith('/api/admin')) {
      if (!rateLimit(`admin-api:${ip}`, 60, 60_000)) {
        return NextResponse.json({ error: 'Prea multe request-uri.' }, { status: 429 })
      }
    }
    if (!rateLimit(`api:${ip}`, 100, 60_000)) {
      return NextResponse.json({ error: 'Prea multe request-uri.' }, { status: 429 })
    }
  }

  // ── Verificăm sesiunea DOAR pe rutele protejate ──────────────────────────
  const isAdminRoute = pathname.startsWith('/admin')
  const isProtected = pathname.startsWith('/brand') || pathname.startsWith('/influencer')

  if (!isAdminRoute && !isProtected) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

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

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url))
    }
    const isAdmin = await checkIsAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isProtected && user && pathname.startsWith('/influencer')) {
    const cacheKey = `active:${user.id}`
    const cached = rateLimitMap.get(cacheKey)
    const now = Date.now()
    const FIVE_MIN = 5 * 60_000

    if (!cached || now > cached.resetAt) {
      rateLimitMap.set(cacheKey, { count: 1, resetAt: now + FIVE_MIN })
      try {
        const serviceClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )
        Promise.resolve(
          serviceClient
            .from('influencers')
            .update({ last_active_at: new Date().toISOString() })
            .eq('user_id', user.id)
        ).then(() => {}).catch(() => {})
      } catch {}
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
