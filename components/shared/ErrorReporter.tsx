'use client'
import { useEffect } from 'react'

const IGNORE = /ResizeObserver|Script error|chrome-extension|moz-extension|Non-Error promise rejection|Loading chunk|ChunkLoadError|NetworkError|Failed to fetch|Load failed/i

export function reportClientError(message: string, stack?: string, extra?: Record<string, unknown>) {
  try {
    if (IGNORE.test(message)) return
    const body = JSON.stringify({ message, stack, url: location.pathname + location.search, ...extra })
    if (navigator.sendBeacon) navigator.sendBeacon('/api/log-client-error', new Blob([body], { type: 'application/json' }))
    else fetch('/api/log-client-error', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
  } catch { /* nu stricăm pagina */ }
}

/** Montat o singură dată în layout: prinde erorile din browser care nu trec prin error boundary. */
export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0
    const cap = (fn: () => void) => { if (sent++ < 5) fn() }
    const onError = (e: ErrorEvent) => cap(() => reportClientError(e.message || 'Eroare', e.error?.stack))
    const onRej = (e: PromiseRejectionEvent) => cap(() => {
      const r: any = e.reason
      reportClientError(String(r?.message || r || 'Promise respins'), r?.stack)
    })
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRej)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRej) }
  }, [])
  return null
}
