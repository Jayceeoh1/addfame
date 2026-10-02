import { MetadataRoute } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Googlebot și toți crawlerii
        userAgent: '*',
        allow: [
          '/',
          '/auth/register',
          '/auth/login',
          '/despre-noi',
          '/contact',
          '/preturi',
          '/cum-functioneaza',
          '/pentru-branduri',
          '/pentru-influenceri',
          '/termeni',
          '/politica-de-confidentialitate',
          '/politica-cookies',
          '/blog',
        ],
        disallow: [
          // Dashboard-uri private
          '/admin',
          '/brand',
          '/influencer',
          // API routes
          '/api',
          // Auth callbacks
          '/auth/callback',
          '/auth/reset-password',
          '/auth/verify-email',
          // Pagini interne
          '/auth/pending',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
