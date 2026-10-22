/**
 * Capacitor shell for AddFame. This file is plain JavaScript on purpose:
 * the root tsconfig includes every *.ts / *.tsx in the repo, and this folder
 * must not change the web app's typecheck, build, or Vercel deploy.
 *
 * PRODUCTION_URL — the live site loaded in the WebView.
 * Where it comes from in the existing app (nothing here edits those files):
 *   - app/layout.tsx sets metadataBase and openGraph.url to https://addfame.ro
 *   - API routes fall back to process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
 * Change this constant, then run `npm run sync`, to point a build at another host.
 *
 * The Supabase project host is not committed. It is read at runtime from
 * NEXT_PUBLIC_SUPABASE_URL, so navigation allows any *.supabase.co host.
 * If production uses a custom Supabase domain, add that host to ALLOWED_HOSTS.
 */

const PRODUCTION_URL = 'https://addfame.ro';

const ALLOWED_HOSTS = [
  'addfame.ro',
  '*.addfame.ro',
  // Supabase API, auth and storage. Project ref lives only in env.
  '*.supabase.co',
  // Stripe Payment Element and 3-D Secure.
  // next.config.mjs CSP allows js.stripe.com, api.stripe.com, hooks.stripe.com.
  'stripe.com',
  '*.stripe.com',
  // Instagram Business Login.
  // app/api/auth/instagram/route.ts redirects to www.instagram.com/oauth/authorize.
  'instagram.com',
  '*.instagram.com',
  // The Instagram login screen continues on Facebook.
  'facebook.com',
  '*.facebook.com',
];

const config = {
  appId: 'ro.addfame.app',
  appName: 'AddFame',
  webDir: 'www',
  backgroundColor: '#ffffff',
  server: {
    url: PRODUCTION_URL,
    cleartext: false,
    allowNavigation: ALLOWED_HOSTS,
    // Local page in webDir, shown when https://addfame.ro cannot be reached.
    errorPath: 'index.html',
  },
  // Exact token the site looks for (single word). Do not add spaces or rename it.
  android: { appendUserAgent: 'AddFameApp' },
  ios: { appendUserAgent: 'AddFameApp' },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      // Light icons on the site theme color (app/layout.tsx viewport.themeColor).
      style: 'LIGHT',
      backgroundColor: '#f97316',
    },
  },
};

module.exports = config;
