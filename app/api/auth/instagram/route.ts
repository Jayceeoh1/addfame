import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID!

// Scopurile pentru App Review — includem TOATE ce declarăm în Meta ca să
// ne asigurăm că reviewer-ul vede fluxul complet.
const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
].join(',')

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()

  // ── Verifică că userul e logat înainte să pornim OAuth ────────────────────
  // Altfel primim codul înapoi și nu știm în ce influencer să-l salvăm.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?redirect=/influencer/profile', req.url))
  }

  // ── Detectăm host-ul curent și construim redirect_uri dinamic ─────────────
  // Meta trebuie să aibă înregistrate AMBELE URI-uri (addfame.ro și
  // www.addfame.ro) ca "Valid OAuth Redirect URIs". Astfel funcționează
  // indiferent unde a intrat userul.
  const host = req.headers.get('host') || 'addfame.ro'
  const REDIRECT_URI = `https://${host}/api/auth/instagram/callback`

  // CSRF state
  const state = crypto.randomUUID()

  // Cookie shared între addfame.ro și www.addfame.ro (Domain=.addfame.ro).
  // Așa, dacă useragent-ul e forțat prin 307 pe alt subdomeniu între /instagram
  // și /callback, cookie-ul rămâne accesibil.
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 10 * 60, // 10 min — codul Instagram expiră mult mai repede
    path: '/',
    domain: '.addfame.ro',
  }

  cookieStore.set('ig_oauth_state', state, cookieOpts)
  // Salvăm redirect_uri exact ce trimitem la Instagram, ca să-l refolosim
  // identic la token exchange (obligatoriu — verificarea e byte-exact).
  cookieStore.set('ig_oauth_redirect', REDIRECT_URI, cookieOpts)
  // Legăm cookie-ul de user-ul curent — dacă cineva reia URL-ul, tot userul
  // corect primește token-ul.
  cookieStore.set('ig_oauth_user', user.id, cookieOpts)

  // ── Construim URL-ul de autorizare ────────────────────────────────────────
  // Folosim www.instagram.com/oauth/authorize (endpoint-ul nou, recomandat
  // pentru Instagram Business Login). Instagram redirectă apoi user-ul înapoi
  // la REDIRECT_URI cu ?code=... .
  const authUrl = new URL('https://www.instagram.com/oauth/authorize')
  authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)
  // force_reauth ne asigură că userul vede prompt-ul de permisiuni (util
  // pentru video-ul de App Review).
  authUrl.searchParams.set('force_reauth', 'true')

  return NextResponse.redirect(authUrl.toString())
}
