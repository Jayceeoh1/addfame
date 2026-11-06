import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import {
  NATIVE_APP_HTML_ATTR,
  NATIVE_APP_HTML_VALUE,
  NATIVE_APP_UA_TOKEN,
  VERIFIED_PURCHASE_SLOT,
  isNativeApp,
  isNativeCapacitor,
  isNativeUserAgent,
  isVerifiedBadgePurchasePrompt,
  nativeAppBootSource,
} from '@/lib/native-app'

const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const APP_UA = `${CHROME} ${NATIVE_APP_UA_TOKEN}`

function boot(ua: string, capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } | null) {
  const attrs: Record<string, string> = {}
  const listeners: Record<string, Array<() => void>> = {}
  const context = vm.createContext({
    window: {
      Capacitor: capacitor,
      addEventListener(type: string, fn: () => void) {
        ;(listeners[type] ||= []).push(fn)
      },
      setInterval: () => 1,
      clearInterval() {},
    },
    document: {
      documentElement: {
        setAttribute(name: string, value: string) { attrs[name] = value },
        getAttribute(name: string) { return attrs[name] ?? null },
      },
      addEventListener(type: string, fn: () => void) {
        ;(listeners[type] ||= []).push(fn)
      },
    },
    navigator: { userAgent: ua },
  })
  vm.runInContext(nativeAppBootSource(), context)
  return attrs[NATIVE_APP_HTML_ATTR] === NATIVE_APP_HTML_VALUE
}

describe('native app detection', () => {
  it('ignores a normal browser user agent', () => {
    expect(isNativeUserAgent(CHROME)).toBe(false)
    expect(isNativeUserAgent('AddFameApplication')).toBe(false)
    expect(isNativeUserAgent('NotAddFameApp')).toBe(false)
    expect(isNativeUserAgent('')).toBe(false)
    expect(isNativeUserAgent(null)).toBe(false)
  })

  it('matches only the whole AddFameApp token', () => {
    expect(isNativeUserAgent(APP_UA)).toBe(true)
    expect(isNativeUserAgent(`x ${NATIVE_APP_UA_TOKEN}/1.0 y`)).toBe(true)
    expect(isNativeUserAgent(`${NATIVE_APP_UA_TOKEN};wv`)).toBe(true)
  })

  it('trusts Capacitor isNativePlatform and android/ios platform', () => {
    expect(isNativeCapacitor(null)).toBe(false)
    expect(isNativeCapacitor({})).toBe(false)
    expect(isNativeCapacitor({ isNativePlatform: () => false, getPlatform: () => 'web' })).toBe(false)
    expect(isNativeCapacitor({ isNativePlatform: () => true, getPlatform: () => 'web' })).toBe(true)
    expect(isNativeCapacitor({ isNativePlatform: () => false, getPlatform: () => 'android' })).toBe(true)
    expect(isNativeCapacitor({ isNativePlatform: () => false, getPlatform: () => 'ios' })).toBe(true)
    expect(isNativeCapacitor({
      isNativePlatform: () => { throw new Error('bridge') },
      getPlatform: () => 'ios',
    })).toBe(true)
    expect(isNativeCapacitor({
      isNativePlatform: () => { throw new Error('bridge') },
      getPlatform: () => { throw new Error('bridge') },
    })).toBe(false)
  })

  it('accepts either signal', () => {
    expect(isNativeApp({ userAgent: CHROME })).toBe(false)
    expect(isNativeApp({ userAgent: APP_UA })).toBe(true)
    expect(isNativeApp({ userAgent: CHROME, capacitor: { isNativePlatform: () => true } })).toBe(true)
  })

  it('boot script agrees with the detector and does not mark the website', () => {
    const cases: Array<{ ua: string; cap?: { isNativePlatform?: () => boolean; getPlatform?: () => string } | null }> = [
      { ua: CHROME },
      { ua: APP_UA },
      { ua: CHROME, cap: { isNativePlatform: () => true } },
      { ua: CHROME, cap: { getPlatform: () => 'android' } },
      { ua: CHROME, cap: { isNativePlatform: () => false, getPlatform: () => 'web' } },
      { ua: CHROME, cap: { isNativePlatform: () => { throw new Error('x') }, getPlatform: () => 'ios' } },
    ]
    for (const c of cases) {
      expect(boot(c.ua, c.cap)).toBe(isNativeApp({ userAgent: c.ua, capacitor: c.cap }))
    }
  })
})

describe('verified purchase prompts', () => {
  it('flags renew copy and stripe checkout links', () => {
    expect(isVerifiedBadgePurchasePrompt({
      title: '⚠️ Abonamentul Verified Creator a expirat',
      body: 'Badge-ul tău auriu a expirat. Reînnoiește din Settings pentru a apărea primul la branduri.',
      link: '/influencer/settings',
    })).toBe(true)
    expect(isVerifiedBadgePurchasePrompt({
      title: 'Devino Verified Creator',
      link: '/influencer/settings?tab=verified&pay=stripe',
    })).toBe(true)
    expect(isVerifiedBadgePurchasePrompt({ link: '/influencer/settings?tab=verified&pay=stripe' })).toBe(true)
  })

  it('leaves badge confirmations and unrelated notices alone', () => {
    expect(isVerifiedBadgePurchasePrompt({
      title: '⭐ Verified Creator activ!',
      body: 'Profilul tău apare primul la branduri.',
      link: '/influencer/settings?tab=verified',
    })).toBe(false)
    expect(isVerifiedBadgePurchasePrompt({
      title: '⭐ Badge Verified Creator activat!',
      link: '/influencer/settings?tab=verified',
    })).toBe(false)
    expect(isVerifiedBadgePurchasePrompt({
      title: '✅ Identitatea ta a fost verificată!',
      link: '/influencer/verify',
    })).toBe(false)
    expect(isVerifiedBadgePurchasePrompt({
      title: 'Reînnoiește parola',
      body: 'Din setări',
      link: '/influencer/settings',
    })).toBe(false)
  })
})

describe('purchase UI wiring', () => {
  const root = process.cwd()
  const read = (path: string) => readFileSync(`${root}/${path}`, 'utf8')

  it('ships the pre-paint CSS and boot script', () => {
    const css = read('app/globals.css')
    expect(css).toContain(`html[data-native-app="1"] [data-native-hide="${VERIFIED_PURCHASE_SLOT}"]`)
    expect(css).toContain(`[data-native-only="${VERIFIED_PURCHASE_SLOT}"]`)
    expect(css).toContain(`html[data-native-app="1"] [data-native-only="${VERIFIED_PURCHASE_SLOT}"]`)
    const layout = read('app/layout.tsx')
    expect(layout).toContain('nativeAppBootSource()')
    expect(layout).toContain('suppressHydrationWarning')
  })

  it('gates every verified checkout surface and keeps a neutral notice', () => {
    const notice = read('components/native/VerifiedUnavailableNotice.tsx')
    expect(notice).toContain('Verified Creator nu este disponibil în aplicație.')
    expect(notice).not.toMatch(/href|https?:|addfame\.ro|RON|cumpăr|wallet|stripe|browser|site-ul/i)

    for (const path of [
      'app/influencer/layout.tsx',
      'app/influencer/settings/page.tsx',
      'app/cum-functioneaza/influencer/settings/page.tsx',
    ]) {
      const source = read(path)
      expect(source).toContain('verifiedPurchaseBlocked')
      expect(source).toContain('data-native-hide="verified-purchase"')
    }
    for (const path of [
      'app/influencer/settings/page.tsx',
      'app/cum-functioneaza/influencer/settings/page.tsx',
    ]) {
      expect(read(path)).toContain('VerifiedUnavailableNotice')
    }
  })
})
