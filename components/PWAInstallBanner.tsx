'use client'
import { useState, useEffect } from 'react'
import { X, Share, MoreVertical, Plus, Download } from 'lucide-react'

export default function PWAInstallModal() {
  const [show, setShow] = useState(false)
  const [device, setDevice] = useState<'android' | 'ios' | null>(null)
  const [step, setStep] = useState(1)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed or dismissed
    try {
      if (localStorage.getItem('pwa_installed') === '1') return
      if (localStorage.getItem('pwa_dismissed')) {
        const dismissed = parseInt(localStorage.getItem('pwa_dismissed') || '0')
        // Show again after 7 days
        if (Date.now() - dismissed < 7 * 24 * 60 * 60 * 1000) return
      }
    } catch {}

    // Check if already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as any).standalone === true) return

    // Detect device
    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isAndroid = /Android/.test(ua)

    if (!isIOS && !isAndroid) return

    setDevice(isIOS ? 'ios' : 'android')

    // For Android - listen for beforeinstallprompt
    if (isAndroid) {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
      })
    }

    // Show modal after 2 seconds
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    try { localStorage.setItem('pwa_dismissed', Date.now().toString()) } catch {}
    setShow(false)
  }

  async function installAndroid() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        try { localStorage.setItem('pwa_installed', '1') } catch {}
        setInstalled(true)
        setTimeout(() => setShow(false), 2000)
      }
    } else {
      // Fallback - show manual steps
      setStep(2)
    }
  }

  if (!show || !device) return null

  const totalSteps = device === 'ios' ? 3 : 2

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pb-6"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        {/* Header gradient */}
        <div className="relative" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)', padding: '24px 24px 20px' }}>
          <button onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition">
            <X className="w-4 h-4" />
          </button>

          {/* App icon */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <img src="/logo.png" alt="AddFame" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <p className="text-white font-black text-lg leading-tight">AddFame</p>
              <p className="text-white/80 text-xs">Influencer Marketing</p>
            </div>
          </div>

          <h2 className="text-white font-black text-xl leading-tight">
            Instalează aplicația! 🚀
          </h2>
          <p className="text-white/80 text-sm mt-1">
            Acces rapid, notificări instant, experiență nativă
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {installed ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-black text-gray-900 text-lg">Instalat cu succes!</p>
              <p className="text-sm text-gray-500 mt-1">Caută AddFame pe ecranul tău principal</p>
            </div>
          ) : device === 'android' ? (
            <AndroidSteps step={step} onInstall={installAndroid} hasBrowserPrompt={!!deferredPrompt} />
          ) : (
            <IOSSteps step={step} setStep={setStep} totalSteps={totalSteps} />
          )}

          {!installed && (
            <div className="flex gap-3 mt-5">
              <button onClick={dismiss}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-gray-500 border-2 border-gray-200 hover:bg-gray-50 transition">
                Poate mai târziu
              </button>
              {device === 'android' && step === 1 && (
                <button onClick={installAndroid}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                  <Download className="w-4 h-4" />
                  Instalează
                </button>
              )}
              {device === 'ios' && step < totalSteps && (
                <button onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                  Următorul pas →
                </button>
              )}
              {device === 'ios' && step === totalSteps && (
                <button onClick={dismiss}
                  className="flex-1 py-3 rounded-2xl text-sm font-black text-white transition"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                  Gata! ✓
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Android Steps ─────────────────────────────────────────────────────────────
function AndroidSteps({ step, onInstall, hasBrowserPrompt }: { step: number; onInstall: () => void; hasBrowserPrompt: boolean }) {
  if (hasBrowserPrompt) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-3">📲</div>
        <p className="font-black text-gray-900 mb-2">Instalare cu un singur tap!</p>
        <p className="text-sm text-gray-500">Apasă butonul de mai jos și confirmă instalarea.</p>
      </div>
    )
  }

  // Manual steps if no browser prompt
  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Pași de instalare pe Android:</p>
      {[
        { icon: '⋮', label: 'Apasă meniul (3 puncte)', desc: 'Sus dreapta în Chrome', highlight: step >= 1 },
        { icon: '📲', label: 'Selectează "Adaugă pe ecranul principal"', desc: 'sau "Install app"', highlight: step >= 2 },
        { icon: '✅', label: 'Confirmă instalarea', desc: 'Apasă "Add" sau "Install"', highlight: step >= 3 },
      ].map((s, i) => (
        <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl transition ${s.highlight ? 'bg-orange-50 border-2 border-orange-200' : 'bg-gray-50'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${s.highlight ? 'bg-orange-100' : 'bg-gray-200'}`}>
            {s.icon}
          </div>
          <div>
            <p className={`text-sm font-black ${s.highlight ? 'text-orange-700' : 'text-gray-600'}`}>{s.label}</p>
            <p className="text-xs text-gray-400">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── iOS Steps ─────────────────────────────────────────────────────────────────
function IOSSteps({ step, setStep, totalSteps }: { step: number; setStep: (s: any) => void; totalSteps: number }) {
  const steps = [
    {
      icon: '📤',
      title: 'Apasă butonul Share',
      desc: 'Găsești butonul Share (pătrățel cu săgeată) în bara de jos a Safari',
      visual: (
        <div className="bg-gray-100 rounded-2xl p-4 mt-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm">
            <Share className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-bold text-gray-700">Share</span>
          </div>
          <span className="text-gray-400 text-sm">← apasă asta</span>
        </div>
      )
    },
    {
      icon: '➕',
      title: 'Alege "Adaugă la ecran principal"',
      desc: 'Derulează în jos în meniul Share și apasă această opțiune',
      visual: (
        <div className="bg-gray-100 rounded-2xl p-4 mt-3">
          <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 border-2 border-orange-300">
            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Plus className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">Adaugă la ecran principal</p>
              <p className="text-xs text-gray-400">Add to Home Screen</p>
            </div>
          </div>
        </div>
      )
    },
    {
      icon: '✅',
      title: 'Apasă "Adaugă"',
      desc: 'Sus dreapta apare butonul "Adaugă" — apasă-l și gata!',
      visual: (
        <div className="bg-gray-100 rounded-2xl p-4 mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-blue-500">Anulează</span>
          <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-500">AddFame</p>
          </div>
          <span className="text-sm font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg">Adaugă ←</span>
        </div>
      )
    },
  ]

  const current = steps[step - 1]

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {steps.map((_, i) => (
          <div key={i}
            className={`h-1.5 rounded-full flex-1 transition-all ${i + 1 <= step ? 'bg-orange-400' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Current step */}
      <div className="text-center mb-2">
        <span className="text-3xl">{current.icon}</span>
      </div>
      <p className="font-black text-gray-900 text-center">{current.title}</p>
      <p className="text-sm text-gray-500 text-center mt-1">{current.desc}</p>
      {current.visual}

      <p className="text-center text-xs text-gray-400 mt-3">
        Pas {step} din {totalSteps}
      </p>
    </div>
  )
}
