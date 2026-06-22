'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'idle' | 'done'>('idle')
  const [email, setEmail] = useState('')

  function handleUnsubscribe() {
    if (!email) return
    // Simply confirm - in production you'd call an API
    setStatus('done')
  }

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#f9fafb' }}
      className="flex items-center justify-center p-6"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
        {status === 'idle' ? (
          <>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              <span className="text-2xl">📧</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">Dezabonare emailuri</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Introdu adresa de email și nu vei mai primi emailuri de marketing de la AddFame.
              Emailurile legate de contul tău (confirmări, notificări) vor continua.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="adresa@email.ro"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition mb-3"
            />
            <button
              onClick={handleUnsubscribe}
              disabled={!email}
              className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition mb-3"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
            >
              Mă dezabonez
            </button>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition">
              ← Înapoi la AddFame
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-green-100">
              <span className="text-2xl">✅</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-2">Dezabonat cu succes!</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Adresa <strong>{email}</strong> a fost eliminată din lista noastră de emailuri marketing.
              Îți mulțumim că ai folosit AddFame!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl font-black text-sm text-white transition"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
            >
              Înapoi la AddFame →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
