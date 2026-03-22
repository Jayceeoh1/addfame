import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const REDIRECT_URI = 'https://addfame.ro/api/auth/instagram/callback'

export async function GET(req: NextRequest) {
  // Generate CSRF state token
  const state = crypto.randomUUID()

  // Store in httpOnly cookie (15 min expiry)
  const cookieStore = await cookies()
  cookieStore.set('ig_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minute
    path: '/',
  })

  const authUrl = new URL('https://api.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state) // CSRF protection

  return NextResponse.redirect(authUrl.toString())
}
