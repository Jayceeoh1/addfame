'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('addfame_cookies')
      if (!accepted) setVisible(true)
    } catch {}
  }, [])

  function accept() {
    try { localStorage.setItem('addfame_cookies', 'accepted') } catch {}
    setVisible(false)
  }

  function decline() {
    try { localStorage.setItem('addfame_cookies', 'declined') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-2xl">🍪</span>
        <div>
          <p className="font-black text-gray-900 text-sm mb-1">Folosim cookie-uri</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Folosim cookie-uri pentru a îmbunătăți experiența ta pe AddFame și pentru analize interne.
            Vezi{' '}
            <Link href="/privacy" className="text-orange-500 font-semibold hover:underline">
              Politica de confidențialitate
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={decline}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition"
        >
          Refuz
        </button>
        <button
          onClick={accept}
          className="flex-1 py-2.5 rounded-xl text-sm font-black text-white transition"
          style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
        >
          Accept toate
        </button>
      </div>
    </div>
  )
}
