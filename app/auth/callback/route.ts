import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  let authSuccess = false

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) authSuccess = true
  }

  if (!authSuccess && token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (!error) authSuccess = true
  }

  if (authSuccess) {
    // Recovery flow — redirectăm direct la pagina de reset, sesiunea e deja setată în cookie
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }

    // Orice alt flow — determinăm dashboard-ul corect
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: brand } = await supabase.from('brands').select('id').eq('user_id', user.id).maybeSingle()
      if (brand) return NextResponse.redirect(new URL('/brand/dashboard', request.url))
      const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
      if (inf) {
        return NextResponse.redirect(new URL('/influencer/dashboard', request.url))
      }
    }
    return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/auth/login?error=confirmation_failed', request.url))
}
