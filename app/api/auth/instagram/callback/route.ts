import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { syncInstagram } from '@/lib/instagram'

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

    // ── 3. Salvare token (tabel doar pentru server) + prima sincronizare ────
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: inf } = await admin.from('influencers').select('id').eq('user_id', savedUserId).maybeSingle()
    if (!inf) return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=no_influencer'))

    // Un cont Instagram poate fi legat de un singur creator
    if (igUserId) {
      const { data: taken } = await admin.from('influencers').select('id')
        .eq('instagram_user_id', igUserId).neq('id', inf.id).limit(1)
      if (taken?.length) return NextResponse.redirect(profileUrl(host, 'instagram=error&reason=already_linked'))
    }

    const sync = await syncInstagram(admin, inf.id, accessToken)
    if (!sync.ok) {
      const reason = sync.reason === 'not_professional' ? 'not_professional' : 'api'
      return NextResponse.redirect(profileUrl(host, `instagram=error&reason=${reason}&msg=${encodeURIComponent(sync.message || '')}`))
    }

    await admin.from('instagram_private').upsert({
      influencer_id: inf.id, ig_user_id: igUserId || null, access_token: accessToken,
      token_expires: expiresAt, updated_at: new Date().toISOString(),
    })
    await admin.from('influencers').update({ instagram_user_id: igUserId || null }).eq('id', inf.id)

    return NextResponse.redirect(profileUrl(host, 'instagram=success'))
  } catch (e: any) {
    console.error('[IG Callback] Unexpected error', e)
    const msg = encodeURIComponent(e?.message || 'unknown')
    return NextResponse.redirect(profileUrl(host, `instagram=error&reason=exception&msg=${msg}`))
  }
}
