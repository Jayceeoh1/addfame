import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!

// Toate redirect-urile de succes/eroare merg pe același host pe care a
// aterizat callback-ul, ca să nu introducem inutil 307-uri.
function profileUrl(host: string, query: string) {
  return `https://${host}/influencer/profile?${query}`
}

function clearOauthCookies(store: Awaited<ReturnType<typeof cookies>>) {
  const opts = { path: '/', domain: '.addfame.ro' as const }
  store.delete({ name: 'ig_oauth_state', ...opts })
  store.delete({ name: 'ig_oauth_redirect', ...opts })
  store.delete({ name: 'ig_oauth_user', ...opts })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const stateParam = searchParams.get('state')

  const host = req.headers.get('host') || 'addfame.ro'
  const cookieStore = await cookies()

  const savedState = cookieStore.get('ig_oauth_state')?.value
  const savedRedirect = cookieStore.get('ig_oauth_redirect')?.value
  const savedUserId = cookieStore.get('ig_oauth_user')?.value

  // Cookie-urile sunt one-time — le ștergem imediat.
  clearOauthCookies(cookieStore)

  // ── User a refuzat pe Instagram ───────────────────────────────────────────
  if (errorParam) {
    const msg = encodeURIComponent(errorDesc || errorParam)
    return NextResponse.redirect(profileUrl(host, `instagram=error&reason=denied&msg=${msg}`))
  }

  // ── Validări de bază ──────────────────────────────────────────────────────
  if (!code) {
    return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=no_code'))
  }
  if (!savedState || stateParam !== savedState) {
    console.error('[IG Callback] CSRF state mismatch', { hasState: !!savedState, match: stateParam === savedState })
    return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=csrf'))
  }
  if (!savedRedirect) {
    return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=no_redirect_cookie'))
  }
  if (!savedUserId) {
    return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=no_user_cookie'))
  }

  try {
    // ── 1. Schimbăm code-ul pe short-lived token ────────────────────────────
    // IMPORTANT: redirect_uri trebuie să fie EXACT cel folosit în /instagram
    // (din cookie, nu recompus). Instagram face byte-exact match.
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: savedRedirect,
        code,
      }).toString(),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[IG Callback] Token exchange failed', {
        status: tokenRes.status,
        data: tokenData,
        redirect_uri: savedRedirect,
      })
      const msg = encodeURIComponent(
        tokenData.error_message || tokenData.error?.message || `HTTP ${tokenRes.status}`
      )
      return NextResponse.redirect(profileUrl(host, `instagram=error&reason=token_exchange&msg=${msg}`))
    }

    const shortToken: string = tokenData.access_token
    const igUserId: string = String(tokenData.user_id || '')

    // ── 2. Long-lived token (60 zile) ───────────────────────────────────────
    const longUrl = new URL('https://graph.instagram.com/access_token')
    longUrl.searchParams.set('grant_type', 'ig_exchange_token')
    longUrl.searchParams.set('client_secret', INSTAGRAM_APP_SECRET)
    longUrl.searchParams.set('access_token', shortToken)

    const longRes = await fetch(longUrl.toString())
    const longData = await longRes.json()

    // Dacă long-lived exchange eșuează (ex. cont Personal fără Business),
    // continuăm cu short-lived — expiră în 1h dar cel puțin conectăm.
    const accessToken: string = longData.access_token || shortToken
    const expiresIn: number = longData.expires_in || 3600
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // ── 3. Profil ───────────────────────────────────────────────────────────
    const profileFields = [
      'id',
      'user_id',
      'username',
      'account_type',
      'media_count',
      'followers_count',
      'follows_count',
      'biography',
      'profile_picture_url',
      'website',
    ].join(',')

    const profileUrl2 = new URL('https://graph.instagram.com/v21.0/me')
    profileUrl2.searchParams.set('fields', profileFields)
    profileUrl2.searchParams.set('access_token', accessToken)

    const profileRes = await fetch(profileUrl2.toString())
    const profile = await profileRes.json()

    if (!profileRes.ok) {
      console.error('[IG Callback] Profile fetch failed', { status: profileRes.status, data: profile })
    }

    // ── 4. Engagement rate — best-effort (nu blocăm conectarea dacă pică) ───
    let engagementRate = 0
    try {
      const mediaUrl = new URL('https://graph.instagram.com/v21.0/me/media')
      mediaUrl.searchParams.set('fields', 'like_count,comments_count')
      mediaUrl.searchParams.set('limit', '12')
      mediaUrl.searchParams.set('access_token', accessToken)

      const mediaRes = await fetch(mediaUrl.toString())
      const mediaData = await mediaRes.json()

      if (mediaData.data?.length > 0 && profile.followers_count > 0) {
        const totalEng = mediaData.data.reduce(
          (s: number, p: any) => s + (p.like_count || 0) + (p.comments_count || 0),
          0
        )
        engagementRate = (totalEng / mediaData.data.length / profile.followers_count) * 100
      }
    } catch (e) {
      console.warn('[IG Callback] Engagement calc failed', e)
    }

    // ── 5. Salvare în DB (service role, bypass RLS) ─────────────────────────
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: updateError } = await admin
      .from('influencers')
      .update({
        instagram_connected: true,
        instagram_handle: profile.username || null,
        instagram_user_id: String(igUserId || profile.user_id || profile.id || ''),
        instagram_access_token: accessToken,
        instagram_token_expires: expiresAt,
        ig_account_type: profile.account_type || null,
        ig_followers: profile.followers_count || 0,
        ig_following: profile.follows_count || 0,
        ig_posts_count: profile.media_count || 0,
        ig_bio: profile.biography || null,
        ig_avatar: profile.profile_picture_url || null,
        ig_engagement_rate: Math.round(engagementRate * 100) / 100,
        ig_last_sync: new Date().toISOString(),
      })
      .eq('user_id', savedUserId)

    if (updateError) {
      console.error('[IG Callback] DB update failed', updateError)
      const msg = encodeURIComponent(updateError.message)
      return NextResponse.redirect(profileUrl(host, `instagram=error&reason=db&msg=${msg}`))
    }

    return NextResponse.redirect(profileUrl(host, 'instagram=success'))
  } catch (e: any) {
    console.error('[IG Callback] Unexpected error', e)
    const msg = encodeURIComponent(e?.message || 'unknown')
    return NextResponse.redirect(profileUrl(host, `instagram=error&reason=exception&msg=${msg}`))
  }
}
