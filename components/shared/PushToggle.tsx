'use client'
// Activează / dezactivează notificările push pe dispozitivul curent (telefon sau calculator).
// Variante: „row” (în setări), „compact” (în clopoțel), „banner” (invitație discretă, se poate închide).
import { useCallback, useEffect, useState } from 'react'
import { BellRing, BellOff, Smartphone, X } from 'lucide-react'

type State = 'loading' | 'hidden' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'denied' | 'busy'

const DISMISS_KEY = 'af-push-banner-dismissed'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) { try { reg = await navigator.serviceWorker.register('/sw.js') } catch { return null } }
  return navigator.serviceWorker.ready
}

async function saveOnServer(sub: PushSubscription) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Eroare la salvare')
}

export function PushToggle({ variant = 'row', accent = '#5a35e6' }: { variant?: 'row' | 'compact' | 'banner'; accent?: string }) {
  const [state, setState] = useState<State>('loading')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      if (variant === 'banner') {
        try { if (localStorage.getItem(DISMISS_KEY)) { setDismissed(true) } } catch { /* stocare blocată */ }
      }
      const cfg = await fetch('/api/push/config').then(r => r.json()).catch(() => null)
      if (!cfg?.enabled || !cfg.publicKey) { setState('hidden'); return }
      setPublicKey(cfg.publicKey)

      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!supported) { setState(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported'); return }
      if (Notification.permission === 'denied') { setState('denied'); return }

      const reg = await getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub && Notification.permission === 'granted') {
        setState('on')
        // dispozitivul poate fi fost folosit de alt cont → îl legăm de contul curent
        saveOnServer(sub).catch(() => {})
      } else setState('off')
    } catch { setState('unsupported') }
  }, [variant])

  useEffect(() => { refresh() }, [refresh])

  async function enable() {
    if (!publicKey) return
    setMsg(null); setState('busy')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return }
      const reg = await getRegistration()
      if (!reg) throw new Error('Browserul nu permite notificări aici.')
      const sub = (await reg.pushManager.getSubscription())
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      await saveOnServer(sub)
      setState('on'); setMsg('Gata! Vei primi notificări pe acest dispozitiv.')
    } catch (e: any) {
      setState('off'); setMsg(e?.message || 'Nu am putut activa notificările.')
    }
  }

  async function disable() {
    setMsg(null); setState('busy')
    try {
      const reg = await getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      setState('off')
    } catch { setState('off') }
  }

  async function test() {
    setMsg(null)
    const res = await fetch('/api/push/test', { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setMsg(res.ok ? 'Am trimis un test. Ar trebui să apară în câteva secunde.' : (j.error || 'Testul nu a mers.'))
  }

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* stocare blocată */ }
  }

  if (state === 'loading' || state === 'hidden') return null

  const on = state === 'on'
  const busy = state === 'busy'

  const hint =
    state === 'ios-install' ? 'Pe iPhone: deschide AddFame în Safari → Distribuie → „Adaugă pe ecranul principal”, apoi activează notificările din aplicația instalată.'
    : state === 'denied' ? 'Notificările sunt blocate din browser. Le poți permite din setările site-ului (iconița de lângă adresă), apoi revino aici.'
    : state === 'unsupported' ? 'Browserul acesta nu suportă notificări push. Încearcă în Chrome, Edge, Firefox sau Safari (iPhone: din aplicația instalată).'
    : null

  const button = (
    <button
      type="button"
      disabled={busy || !!hint}
      onClick={on ? disable : enable}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none',
        padding: variant === 'compact' ? '6px 10px' : '8px 14px', borderRadius: 10,
        fontSize: variant === 'compact' ? 12 : 13, fontWeight: 800,
        border: on ? '1.5px solid #e5e7eb' : 'none',
        background: on ? 'white' : accent, color: on ? '#374151' : 'white',
        opacity: busy || hint ? 0.6 : 1, cursor: busy || hint ? 'default' : 'pointer',
      }}>
      {on ? <BellOff size={14} /> : <BellRing size={14} />}
      {busy ? 'Se procesează…' : on ? 'Dezactivează' : 'Activează'}
    </button>
  )

  if (variant === 'banner') {
    if (dismissed || on || state === 'denied' || state === 'unsupported') return null
    return (
      <div role="region" aria-label="Notificări push" style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16,
        background: 'linear-gradient(135deg,#f5f3ff,#eef2ff)', border: '1.5px solid #e0e7ff', margin: '0 0 16px',
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: accent, display: 'grid', placeItems: 'center', flex: 'none' }}>
          <Smartphone size={18} color="white" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Află primul de campanii noi</div>
          <div style={{ fontSize: 12.5, color: '#4b5563', lineHeight: 1.45 }}>
            {hint || (msg ?? 'Primește pe telefon campaniile potrivite pentru tine, răspunsurile la drafturi și mesajele brandurilor.')}
          </div>
        </div>
        {!hint && button}
        <button type="button" onClick={dismiss} aria-label="Închide" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, flex: 'none' }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div style={{ padding: '10px 14px', borderTop: '1.5px solid #f5f5f5', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Smartphone size={16} color="#6b7280" style={{ flex: 'none' }} />
          <div style={{ flex: 1, fontSize: 12, color: '#4b5563', lineHeight: 1.4 }}>
            {on ? 'Push activ pe acest dispozitiv' : hint ? 'Notificări pe telefon' : 'Primește notificările și pe telefon'}
          </div>
          {!hint && button}
        </div>
        {(hint || msg) && <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 6, lineHeight: 1.45 }}>{hint || msg}</div>}
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Notificări push pe acest dispozitiv</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>
            {on ? 'Active. Primești pe loc campanii noi, drafturi, mesaje și plăți.' : 'Primești notificările direct pe telefon sau calculator, chiar dacă site-ul e închis.'}
          </div>
        </div>
        {button}
      </div>
      {(hint || msg) && <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 8, lineHeight: 1.5 }}>{hint || msg}</div>}
      {on && (
        <button type="button" onClick={test} style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: accent, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          Trimite o notificare de test
        </button>
      )}
    </div>
  )
}

export default PushToggle
