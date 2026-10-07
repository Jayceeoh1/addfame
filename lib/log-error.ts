// Înregistrează erorile în tabelul app_errors (vizibil în /admin/errors).
// Nu aruncă niciodată: o eroare în logger nu trebuie să strice cererea care a eșuat.
import { createHash } from 'crypto'
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
export function fingerprint(source: string, message: string, stack?: string): string {
  const msg = scrub(message).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{12,}/gi, '<id>').replace(/\d+/g, '#').slice(0, 200)
  const line = (stack || '').split('\n').find(l => /^\s*at\s/.test(l)) || ''
  return createHash('sha1').update(`${source}|${msg}|${line.replace(/\d+/g, '#').trim().slice(0, 200)}`).digest('hex')
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
