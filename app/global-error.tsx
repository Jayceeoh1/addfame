'use client'
import { useEffect } from 'react'
import { reportClientError } from '@/components/shared/ErrorReporter'

// Ultima plasă: crapă chiar layout-ul rădăcină.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { reportClientError(error.message, error.stack, { digest: error.digest, global: true }) }, [error])
  return (
    <html lang="ro">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, background: '#f6f6fc' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ color: '#14123a' }}>Ceva nu a mers bine</h1>
          <p style={{ color: '#4a4770' }}>Am notat problema. Încearcă din nou.</p>
          <button onClick={reset} style={{ background: '#5a35e6', color: '#fff', border: 0, borderRadius: 12, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>Reîncearcă</button>
        </div>
      </body>
    </html>
  )
}
