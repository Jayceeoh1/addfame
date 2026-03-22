import { NextRequest, NextResponse } from 'next/server'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`

export async function GET(req: NextRequest) {
  const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', 'instagram_business_basic,instagram_business_manage_insights')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', 'addfame_instagram_connect')

  return NextResponse.redirect(authUrl.toString())
}
