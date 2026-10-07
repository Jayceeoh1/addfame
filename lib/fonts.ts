import localFont from 'next/font/local'

// Bricolage Grotesque este self-hosted (fișiere în lib/fonts) pentru că loaderul
// Toate fonturile sunt self-hosted: next/font/google eșuează la build cu noile URL-uri fonts.gstatic.com/l/font?kit=...
export const fontDisplay = localFont({
  src: [
    {
      path: './fonts/bricolage-grotesque-latin-ext-wght-normal.woff2',
      weight: '200 800',
      style: 'normal',
    },
    {
      path: './fonts/bricolage-grotesque-latin-wght-normal.woff2',
      weight: '200 800',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
})

export const fontBody = localFont({
  src: [
    { path: './fonts/figtree-latin-ext-wght-normal.woff2', weight: '300 900', style: 'normal' },
    { path: './fonts/figtree-latin-wght-normal.woff2', weight: '300 900', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
})

export const fontVars = `${fontDisplay.variable} ${fontBody.variable}`
