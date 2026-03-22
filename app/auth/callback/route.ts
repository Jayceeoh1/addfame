import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Determine where to redirect based on user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: brand } = await supabase.from('brands').select('id').eq('user_id', user.id).single()
        if (brand) {
          return NextResponse.redirect(new URL('/brand/onboarding', request.url))
        }
        const { data: inf } = await supabase.from('influencers').select('id').eq('user_id', user.id).single()
        if (inf) {
          return NextResponse.redirect(new URL('/influencer/onboarding', request.url))
        }
      }
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=confirmation_failed', request.url))
}
