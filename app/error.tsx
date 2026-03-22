'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Log pentru debugging
    console.error('[Error boundary]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })

    // Auto-retry după 5 secunde
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); reset(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [error, reset])

  const isAuthError = error.message?.includes('auth') || error.message?.includes('session') || error.message?.includes('JWT')
  const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('ECONNREFUSED')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>

          <h1 className="text-xl font-black text-gray-900 mb-2">
            {isAuthError ? 'Sesiune expirată' : isNetworkError ? 'Problemă de conexiune' : 'Ceva nu a mers bine'}
          </h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {isAuthError
              ? 'Sesiunea ta a expirat. Te rugăm să te reconectezi.'
              : isNetworkError
                ? 'Verifică conexiunea la internet și încearcă din nou.'
                : 'A apărut o eroare temporară. Se reîncearcă automat...'}
          </p>

          {/* Auto retry countdown */}
          <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5 flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
            <span className="text-sm font-bold text-gray-500">Reîncercare automată în {countdown}s...</span>
          </div>

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <RefreshCw className="w-4 h-4" /> Reîncearcă
            </button>
            <button onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              <Home className="w-4 h-4" /> Acasă
            </button>
          </div>

          {isAuthError && (
            <button onClick={() => window.location.href = '/auth/login'}
              className="w-full mt-3 py-3 rounded-xl font-black text-sm bg-orange-50 text-orange-600 hover:bg-orange-100 transition">
              Conectează-te din nou
            </button>
          )}
        </div>

        {error.digest && (
          <p className="text-xs text-gray-300 mt-4">Cod eroare: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
