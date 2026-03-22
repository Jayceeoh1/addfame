import type { Metadata, Viewport } from 'next'
import { SessionGuard } from '@/components/shared/session-guard'
import { LangProvider } from '@/lib/i18n/context'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import PWAInstallBanner from '@/components/PWAInstallBanner'
import '../styles/mobile.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'AddFame — Influencer Marketing fără abonamente',
    template: '%s | AddFame',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AddFame',
  },
  description: 'Conectăm branduri cu influenceri români. Plătești 0 RON până la rezultat — 15% comision doar când postul e aprobat. Fără abonamente.',
  keywords: ['influencer marketing', 'marketing influenceri', 'campanii influenceri', 'Romania', 'TikTok', 'Instagram', 'brand collaboration'],
  authors: [{ name: 'AddFame', url: 'https://addfame.ro' }],
  creator: 'AddFame',
  metadataBase: new URL('https://addfame.ro'),
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: 'https://addfame.ro',
    siteName: 'AddFame',
    title: 'AddFame — Influencer Marketing fără abonamente',
    description: 'Conectăm branduri cu influenceri români. Plătești 0 RON până la rezultat.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'AddFame — Influencer Marketing Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AddFame — Influencer Marketing fără abonamente',
    description: 'Conectăm branduri cu influenceri români. 15% comision doar la rezultat.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  formatDetection: { email: false, telephone: false, address: false },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AddFame" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="AddFame" />
      </head>
      <body className="font-sans antialiased">
        <LangProvider>
          <SessionGuard>{children}</SessionGuard>
        </LangProvider>
        <Analytics />
        <PWAInstallBanner />
        <script dangerouslySetInnerHTML={{
          __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered:', reg.scope); })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
        `}} />
      </body>
    </html>
  )
}
