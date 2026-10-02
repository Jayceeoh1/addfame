'use client'

import { useState, useEffect } from 'react'
import { Smartphone, Share, MoreVertical, Plus, Download, Check, ChevronRight, Wifi } from 'lucide-react'

export default function InstallAppPage() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [device, setDevice] = useState<'ios' | 'android' | 'desktop' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua)) setDevice('ios')
    else if (/Android/.test(ua)) setDevice('android')
    else setDevice('desktop')

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    })
  }, [])

  async function handleInstallAndroid() {
    if (!deferredPrompt) return
    setInstalling(true)
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstalling(false)
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Ești deja instalat!</h1>
          <p className="text-gray-500 text-sm">Folosești AddFame ca aplicație nativă. </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Instalează AddFame</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Adaugă aplicația pe ecranul principal pentru acces rapid, fără să deschizi browser-ul.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Smartphone, label: 'Ca aplicație nativă', sub: 'fără bara browser' },
            { icon: Wifi, label: 'Acces rapid', sub: 'de pe ecran principal' },
            { icon: ChevronRight, label: 'Notificări', sub: 'în timp real' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-3 text-center border border-gray-100">
              <Icon className="w-5 h-5 text-orange-500 mx-auto mb-1.5" />
              <p className="text-xs font-black text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Android — buton direct */}
        {device === 'android' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            <div className="p-5 border-b border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f5e9' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#2e7d32"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.637.637 0 0 0-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67a.643.643 0 0 0-.87-.2c-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">Android — Chrome</p>
                <p className="text-xs text-gray-400">Instalare automată</p>
              </div>
            </div>
            <div className="p-5">
              {installed ? (
                <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4">
                  <Check className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-black text-green-700">Instalat cu succes! Caută iconița AddFame pe ecranul tău.</p>
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallAndroid}
                  disabled={installing}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}
                >
                  {installing
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se instalează...</>
                    : <><Download className="w-4 h-4" /> Instalează acum</>
                  }
                </button>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Dacă nu apare butonul automat, urmează pașii manual:</p>
                  {[
                    { step: 1, text: 'Apasă meniul', detail: '⋮ din colțul dreapta sus al Chrome' },
                    { step: 2, text: 'Alege', detail: '"Add to Home screen"' },
                    { step: 3, text: 'Confirmă', detail: 'apasă "Install" sau "Add"' },
                  ].map(({ step, text, detail }) => (
                    <div key={step} className="flex gap-3 items-start mb-3 last:mb-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{step}</div>
                      <p className="text-sm text-gray-700"><span className="font-bold">{text}</span> {detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* iOS */}
        {device === 'ios' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            <div className="p-5 border-b border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">iPhone / iPad — Safari</p>
                <p className="text-xs text-gray-400">Urmează pașii de mai jos</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {[
                {
                  step: 1,
                  title: 'Deschide Safari',
                  desc: 'Asigură-te că ești în Safari, nu în Chrome sau alt browser.',
                  icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f97316" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
                },
                {
                  step: 2,
                  title: 'Apasă butonul Share',
                  desc: 'Butonul cu săgeată în sus — în bara de jos a Safari.',
                  icon: <Share className="w-[18px] h-[18px] text-orange-500" />,
                },
                {
                  step: 3,
                  title: 'Alege „Add to Home Screen"',
                  desc: 'Derulează în jos în meniu și apasă această opțiune.',
                  icon: <Plus className="w-[18px] h-[18px] text-orange-500" />,
                },
                {
                  step: 4,
                  title: 'Apasă „Add"',
                  desc: 'Iconița AddFame apare pe ecranul principal.',
                  icon: <Check className="w-[18px] h-[18px] text-orange-500" />,
                },
              ].map(({ step, title, desc, icon }) => (
                <div key={step} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-black text-orange-500">Pasul {step}</span>
                    </div>
                    <p className="text-sm font-black text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 items-start">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <p className="text-xs text-amber-700">Funcționează <strong>doar din Safari</strong>. Chrome pe iPhone nu permite instalarea.</p>
              </div>
            </div>
          </div>
        )}

        {/* Desktop */}
        {device === 'desktop' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
            <p className="font-black text-gray-900 mb-2">Pe calculator</p>
            <p className="text-sm text-gray-500 mb-4">Chrome și Edge permit instalarea și pe desktop:</p>
            {[
              { step: 1, text: 'Click pe iconița de instalare', detail: '⊕ din bara de adresă (dreapta)' },
              { step: 2, text: 'Alege', detail: '"Install AddFame"' },
              { step: 3, text: 'Confirmă', detail: 'apasă "Install"' },
            ].map(({ step, text, detail }) => (
              <div key={step} className="flex gap-3 items-start mb-3 last:mb-0">
                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-gray-700"><span className="font-bold">{text}</span> {detail}</p>
              </div>
            ))}
          </div>
        )}

        {/* Nu se detecteaza device-ul */}
        {!device && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 text-center">
            <div className="w-10 h-10 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">Se detectează dispozitivul...</p>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Aplicația nu ocupă spațiu suplimentar — e un shortcut inteligent spre addfame.ro
        </p>

      </div>
    </div>
  )
}
