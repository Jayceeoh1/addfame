'use client'

import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verifică dacă e deja instalat
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Verifică dacă userul a închis banner-ul recent (24h)
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return

    // Detectează iOS
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone

    if (isIOSDevice && !isInStandaloneMode) {
      setIsIOS(true)
      // Pe iOS arătăm bannerul după 3 secunde
      setTimeout(() => setShowBanner(true), 3000)
    }

    // Android / Chrome — ascultă evenimentul beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') setShowBanner(false)
        setDeferredPrompt(null)
      })
    }
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString())
  }

  if (!showBanner || isInstalled) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Gradient accent top */}
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)' }} />

        <div className="p-5">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>

          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
            >
              <img src="/apple-icon.png" alt="AddFame" className="w-full h-full object-cover"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent) parent.innerHTML = '<span style="font-size:28px">✨</span>'
                }}
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-white text-base leading-tight">AddFame</p>
              <p className="text-white/60 text-xs mt-0.5">
                {isIOS ? 'Instalează pe iPhone pentru acces rapid' : 'Instalează aplicația pe telefon'}
              </p>
              {isIOS ? (
                <p className="text-white/40 text-[11px] mt-1.5 leading-relaxed">
                  📤 Apasă <strong className="text-white/60">Share</strong> → <strong className="text-white/60">Add to Home Screen</strong>
                </p>
              ) : (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-green-400 text-[11px] font-bold">Gratuit · Fără App Store</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isIOS && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/50 transition hover:text-white/70"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Mai târziu
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
              >
                <Download className="w-4 h-4" />
                Instalează
              </button>
            </div>
          )}

          {/* iOS — just show instructions, no button needed */}
          {isIOS && (
            <div
              className="mt-4 rounded-2xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <Smartphone className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <p className="text-white/50 text-xs leading-relaxed">
                În Safari: apasă <strong className="text-white/70">⎙</strong> din bara de jos, apoi <strong className="text-white/70">„Add to Home Screen"</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
