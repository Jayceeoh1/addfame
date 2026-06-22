/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://vercel.live https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://www.gravatar.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api.stripe.com https://js.stripe.com https://fonts.googleapis.com https://fonts.gstatic.com https://www.googletagmanager.com https://generativelanguage.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Redirect pagini vechi → URL-uri noi (301 permanent pentru SEO)
      {
        source: '/privacy',
        destination: '/politica-de-confidentialitate',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/politica-de-confidentialitate',
        permanent: true,
      },
      {
        source: '/politica-confidentialitate',
        destination: '/politica-de-confidentialitate',
        permanent: true,
      },
      {
        source: '/cookies',
        destination: '/politica-cookies',
        permanent: true,
      },
      {
        source: '/cookie-policy',
        destination: '/politica-cookies',
        permanent: true,
      },
      {
        source: '/faq',
        destination: '/intrebari-frecvente',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/despre-noi',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/termeni',
        permanent: true,
      },
      {
        source: '/how-it-works',
        destination: '/cum-functioneaza',
        permanent: true,
      },
      {
        source: '/for-brands',
        destination: '/pentru-branduri',
        permanent: true,
      },
      {
        source: '/for-influencers',
        destination: '/pentru-influenceri',
        permanent: true,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
