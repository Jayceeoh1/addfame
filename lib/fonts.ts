// Fonturile paginii principale și ale paginilor de autentificare.
// next/font le descarcă la build și le servește de pe addfame.ro —
// pagina nu depinde de Google Fonts la încărcare.
import { Bricolage_Grotesque, Figtree } from 'next/font/google'

export const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const fontBody = Figtree({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
})

export const fontVars = `${fontDisplay.variable} ${fontBody.variable}`
