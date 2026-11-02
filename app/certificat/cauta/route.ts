import { NextRequest, NextResponse } from 'next/server'

// Formularul de verificare trimite ?cod=… aici; redirecționăm la /certificat/<COD>.
export function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get('cod') || '').trim().toUpperCase().replace(/\s+/g, '')
  const code = raw.replace(/[^A-Z0-9-]/g, '').slice(0, 30)
  return NextResponse.redirect(new URL(code ? `/certificat/${encodeURIComponent(code)}` : '/certificat', req.url))
}
