/**
 * Detect the Capacitor shell (Android / iOS) without touching payments.
 *
 * Two signals, either one is enough:
 * 1. The bridge the native WebView injects: window.Capacitor.isNativePlatform()
 *    (getPlatform() === 'android' | 'ios' is the fallback if that call is missing).
 * 2. A user-agent token the shell appends. Capacitor 8 has no server.appendUserAgent;
 *    set android.appendUserAgent and ios.appendUserAgent to NATIVE_APP_UA_TOKEN
 *    in mobile/capacitor.config.js, then `npx cap sync` from mobile/.
 *    The token is what hides the purchase UI before the first paint when the
 *    bridge is injected only after the remote https://addfame.ro document loads.
 *
 * A normal browser has neither signal, so the website stays unchanged.
 */

export const NATIVE_APP_UA_TOKEN = 'AddFameApp'

export const NATIVE_APP_HTML_ATTR = 'data-native-app'
export const NATIVE_APP_HTML_VALUE = '1'

/** Shared by the purchase controls (hidden in the app) and the neutral notice. */
export const VERIFIED_PURCHASE_SLOT = 'verified-purchase'

export type CapacitorBridge = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

const UA_TOKEN_SPLIT = /[\s;/()]+/

export function isNativeUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false
  return ua.split(UA_TOKEN_SPLIT).includes(NATIVE_APP_UA_TOKEN)
}

export function isNativeCapacitor(cap: CapacitorBridge | null | undefined): boolean {
  if (!cap) return false
  try {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform() === true) return true
  } catch {
    // Bridge object exists but is not ready yet; try the platform name below.
  }
  try {
    const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : ''
    return platform === 'android' || platform === 'ios'
  } catch {
    return false
  }
}

export function isNativeApp(input: {
  userAgent?: string | null
  capacitor?: CapacitorBridge | null
}): boolean {
  return isNativeCapacitor(input.capacitor) || isNativeUserAgent(input.userAgent)
}

function capacitorFromWindow(): CapacitorBridge | null {
  if (typeof window === 'undefined') return null
  const cap = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor
  return cap ?? null
}

/** Client-only. Also re-stamps <html> so the pre-paint CSS stays applied after hydration. */
export function readIsNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const native = isNativeApp({
    userAgent: window.navigator?.userAgent,
    capacitor: capacitorFromWindow(),
  })
  if (native) {
    document.documentElement.setAttribute(NATIVE_APP_HTML_ATTR, NATIVE_APP_HTML_VALUE)
    return true
  }
  return document.documentElement.getAttribute(NATIVE_APP_HTML_ATTR) === NATIVE_APP_HTML_VALUE
}

/** True when Verified Creator must not be offered or paid for in this UI. */
export function verifiedPurchaseBlocked(): boolean {
  return readIsNativeApp()
}

/**
 * In-app copy that asks the user to buy or renew the badge.
 * A confirmation that the badge is already active is not a prompt.
 * Both signals are required so an unrelated "reînnoiește" notice stays visible.
 */
export function isVerifiedBadgePurchasePrompt(input: {
  title?: string | null
  body?: string | null
  message?: string | null
  link?: string | null
}): boolean {
  const link = input.link || ''
  if (/[?&]pay=stripe(?:&|$)/.test(link)) return true
  const text = `${input.title || ''}\n${input.body || ''}\n${input.message || ''}`.toLowerCase()
  const aboutBadge = text.includes('verified creator') || text.includes('badge-ul') || text.includes('badge verificat')
  const asksToPay = (
    text.includes('reînnoiește') ||
    text.includes('reinnoieste') ||
    text.includes('a expirat') ||
    text.includes('activează') ||
    text.includes('activeaza') ||
    text.includes('devino')
  )
  return aboutBadge && asksToPay
}

/**
 * Blocking head script. Sets data-native-app="1" before the body paints and
 * keeps checking briefly, because a remote server.url WebView may inject
 * window.Capacitor only after the document starts loading.
 */
export function nativeAppBootSource(): string {
  const token = JSON.stringify(NATIVE_APP_UA_TOKEN)
  const attr = JSON.stringify(NATIVE_APP_HTML_ATTR)
  const value = JSON.stringify(NATIVE_APP_HTML_VALUE)
  return `(function(){try{var token=${token};var attr=${attr};var value=${value};var done=false;function detect(){if(done)return;var native=false;var cap=window.Capacitor;if(cap){try{if(typeof cap.isNativePlatform==="function"&&cap.isNativePlatform()===true)native=true;}catch(e){}if(!native){try{if(typeof cap.getPlatform==="function"){var platform=cap.getPlatform();if(platform==="android"||platform==="ios")native=true;}}catch(e){}}}if(!native){var ua=(navigator.userAgent||"");var parts=ua.split(/[\\s;/()]+/);for(var i=0;i<parts.length;i++){if(parts[i]===token){native=true;break;}}}if(native){done=true;document.documentElement.setAttribute(attr,value);}}detect();document.addEventListener("DOMContentLoaded",detect);window.addEventListener("load",detect);var n=0;var id=window.setInterval(function(){detect();if(done||++n>=12)window.clearInterval(id);},100);}catch(e){}})();`
}
