'use client'

// Dacă o pagină de admin crapă, meniul rămâne și apare eroarea exactă (nu o pagină albă).
import { useEffect } from 'react'
import { reportClientError } from '@/components/shared/ErrorReporter'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin]', error)
    try { reportClientError(error.message, error.stack, { digest: error.digest, area: 'admin' }) } catch { /* */ }
  }, [error])

  return (
    <div className="ad-page">
      <div className="ad-card ad-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
        <h2>Pagina nu s-a putut afișa</h2>
        <p className="ad-muted" style={{ margin: 0, fontSize: 14 }}>
          Meniul funcționează în continuare. Trimite-i dezvoltatorului textul de mai jos.
        </p>
        <pre style={{ margin: 0, padding: 12, borderRadius: 12, background: '#f6f6fc', border: '1px solid #e5e3f3', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'all' }}>
          {error.message || 'Eroare necunoscută'}{error.digest ? `\n(cod: ${error.digest})` : ''}
        </pre>
        <div className="ad-row">
          <button className="ad-btn p" onClick={reset}>Reîncearcă</button>
          <button className="ad-btn" onClick={() => window.location.reload()}>Reîncarcă pagina</button>
        </div>
      </div>
    </div>
  )
}
