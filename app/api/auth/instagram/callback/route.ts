import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!
const REDIRECT_URI = 'https://addfame.ro/api/auth/instagram/callback'
const APP_URL = 'https://www.addfame.ro'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateParam = searchParams.get('state')

  // ── CSRF state verification ──────────────────────────────────────────────
  const cookieStore = await cookies()
  const savedState = cookieStore.get('ig_oauth_state')?.value

  // Clear state cookie immediately (one-time use)
  cookieStore.delete('ig_oauth_state')

  if (!savedState || stateParam !== savedState) {
    console.error('[IG Callback] CSRF state mismatch — possible attack')
    return NextResponse.redirect(`${APP_URL}/influencer/profile?instagram=error&reason=csrf`)
  }
  // ────────────────────────────────────────────────────────────────────────

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/influencer/profile?instagram=error`)
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code,
      }).toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      throw new Error(`No access token: ${JSON.stringify(tokenData)}`)
    }

    const shortToken = tokenData.access_token
    const igUserId = tokenData.user_id

    // 2. Exchange for long-lived token
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json()
    const accessToken = longTokenData.access_token || shortToken
    const expiresIn = longTokenData.expires_in || 5184000

    // 3. Get profile
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
    )
    const profile = await profileRes.json()

    // 4. Engagement rate
    const mediaRes = await fetch(
      `https://graph.instagram.com/v21.0/me/media?fields=like_count,comments_count&limit=12&access_token=${accessToken}`
    )
    const mediaData = await mediaRes.json()
    let engagementRate = 0
    if (mediaData.data?.length > 0 && profile.followers_count > 0) {
      const totalEng = mediaData.data.reduce((s: number, p: any) =>
        s + (p.like_count || 0) + (p.comments_count || 0), 0)
      engagementRate = (totalEng / mediaData.data.length / profile.followers_count) * 100
    }

    // 5. Get Supabase user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`)

    // 6. Save to DB
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: updateError } = await admin.from('influencers').update({
      instagram_access_token: accessToken,
      instagram_token_expires: new Date(Date.now() + expiresIn * 1000).toISOString(),
      instagram_user_id: String(igUserId || profile.id),
      instagram_connected: true,
      instagram_handle: profile.username,
      ig_followers: profile.followers_count || 0,
      ig_following: profile.follows_count || 0,
      ig_posts_count: profile.media_count || 0,
      ig_bio: profile.biography || null,
      ig_avatar: profile.profile_picture_url || null,
      ig_engagement_rate: Math.round(engagementRate * 100) / 100,
      ig_last_sync: new Date().toISOString(),
    }).eq('user_id', user.id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.redirect(`${APP_URL}/influencer/profile?instagram=success`)

  } catch (e: any) {
    return NextResponse.redirect(`${APP_URL}/influencer/profile?instagram=error&msg=${encodeURIComponent(e.message)}`)
  }
}