// Înregistrează erorile în tabelul app_errors (vizibil în /admin/errors).
// Nu aruncă niciodată: o eroare în logger nu trebuie să strice cererea care a eșuat.
import { createAdminClient } from '@/lib/supabase/admin'

export type ErrorSource = 'server' | 'client' | 'cron' | 'action'

export interface LogErrorOptions {
  source?: ErrorSource
  url?: string | null
  userId?: string | null
  context?: Record<string, unknown>
}

/** Scoate din text tokenuri, chei și adrese de email, ca să nu ajungă în loguri. */
export function scrub(text: string): string {
  return String(text ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redactat]')
    .replace(/\b(sk|pk|rk|whsec)_(live|test)_[A-Za-z0-9]+/g, '$1_$2_[redactat]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[jwt redactat]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
}

/** Aceeași eroare → aceeași amprentă (sursă + mesaj fără numere/uuid + prima linie din stack). */
/** Hash simplu (cyrb53, două treceri), fără `crypto` din Node: instrumentation.ts e analizat și pentru runtime-ul edge. */
function hash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b1, h4 = 0x85ebca6b
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677)
    h3 = Math.imul(h3 ^ c, 2246822519); h4 = Math.imul(h4 ^ c, 3266489917)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909)
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909)
  return [h1, h2, h3, h4].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('')
}

export function fingerprint(source: string, message: string, stack?: string): string {
  const msg = scrub(message).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{12,}/gi, '<id>').replace(/\d+/g, '#').slice(0, 200)
  const line = (stack || '').split('\n').find(l => /^\s*at\s/.test(l)) || ''
  return hash(`${source}|${msg}|${line.replace(/\d+/g, '#').trim().slice(0, 200)}`)
}

export async function logError(err: unknown, opts: LogErrorOptions = {}): Promise<void> {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err))
    const source = opts.source ?? 'server'
    const message = scrub(e.message || 'Eroare necunoscută')
    const stack = e.stack ? scrub(e.stack) : undefined
    let context: Record<string, unknown> | null = null
    if (opts.context) {
      const s = scrub(JSON.stringify(opts.context))
      context = s.length <= 2000 ? JSON.parse(s) : { truncated: s.slice(0, 2000) }
    }
    const admin = createAdminClient()
    const { error } = await admin.rpc('log_app_error', {
      p_fingerprint: fingerprint(source, message, stack),
      p_source: source,
      p_message: message,
      p_stack: stack ?? null,
      p_url: opts.url ? scrub(opts.url).slice(0, 500) : null,
      p_user: opts.userId ?? null,
      p_context: context,
    })
    if (error) console.error('[logError] nu s-a putut salva:', error.message)
  } catch (inner) {
    console.error('[logError] eșec:', (inner as Error)?.message)
  }
}

/** Pentru erori întoarse de supabase-js ({ error }), care NU aruncă excepții. */
export async function logDbError(where: string, error: { message?: string } | null | undefined, context?: Record<string, unknown>) {
  if (!error) return
  await logError(new Error(`${where}: ${error.message ?? 'eroare bază de date'}`), { source: 'action', context })
}
