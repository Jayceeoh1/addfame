// Notificări push pe telefon / desktop (Web Push, prin service worker-ul PWA).
//
// Fluxul: orice rând nou în „notifications” → trigger în Postgres (SQL 24) → POST /api/push/dispatch
// cu id-urile noi → aici se „revendică” (pushed_at) și se trimit la dispozitivele utilizatorului.
// Revendicarea atomică face ca o notificare să plece o singură dată, chiar dacă apelul se repetă.
import type { SupabaseClient } from '@supabase/supabase-js'

export const PUSH_MAX_AGE_MIN = 15          // notificările mai vechi nu mai pleacă ca push
export const PUSH_MAX_FAILURES = 5          // după atâtea erori la rând abonamentul e șters
const CONCURRENCY = 10

export interface PushNotification { id: string; user_id: string; title: string | null; body: string | null; link: string | null }
export interface PushSub { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; failure_count: number }

export function pushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''
  const subject = process.env.VAPID_SUBJECT || 'mailto:contact@addfame.ro'
  return { publicKey, privateKey, subject, enabled: !!(publicKey && privateKey) }
}

/** Doar link-uri interne (relative) — un push nu trebuie să poată deschide alt site. */
export function safeLink(link: string | null | undefined): string {
  const l = String(link || '').trim()
  return l.startsWith('/') && !l.startsWith('//') ? l : '/'
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

export function buildPushPayload(n: Pick<PushNotification, 'id' | 'title' | 'body' | 'link'>): string {
  return JSON.stringify({
    title: clip(String(n.title || 'AddFame'), 80),
    body: clip(String(n.body || ''), 180),
    url: safeLink(n.link),
    tag: `n-${n.id}`,
  })
}

/** 404/410 = dispozitivul a renunțat la abonament → îl ștergem imediat. */
export function isGoneStatus(status: number | undefined): boolean {
  return status === 404 || status === 410
}

export function cleanSubscription(v: any): { endpoint: string; p256dh: string; auth: string } | null {
  const endpoint = String(v?.endpoint || '')
  const p256dh = String(v?.keys?.p256dh || '')
  const auth = String(v?.keys?.auth || '')
  if (!/^https:\/\/[^\s]{10,}$/.test(endpoint) || endpoint.length > 1000) return null
  if (!/^[A-Za-z0-9_=-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_=-]{8,100}$/.test(auth)) return null
  return { endpoint, p256dh, auth }
}

async function pool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const x = items[i++]; await fn(x) }
  })
  await Promise.all(workers)
}

type Sender = (sub: PushSub, payload: string) => Promise<{ ok: boolean; status?: number; error?: string }>

async function defaultSender(): Promise<Sender | null> {
  const cfg = pushConfig()
  if (!cfg.enabled) return null
  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey)
  return async (sub, payload) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'normal' },
      )
      return { ok: true }
    } catch (e: any) {
      return { ok: false, status: e?.statusCode, error: String(e?.body || e?.message || e).slice(0, 200) }
    }
  }
}

/** Trimite notificări deja revendicate către toate dispozitivele destinatarilor. */
export async function sendToDevices(admin: SupabaseClient, notes: PushNotification[], send?: Sender) {
  const stats = { notifications: notes.length, sent: 0, failed: 0, removed: 0 }
  if (!notes.length) return stats
  const sender = send ?? (await defaultSender())
  if (!sender) return { ...stats, disabled: true }

  const userIds = [...new Set(notes.map(n => n.user_id))]
  const { data: subs, error } = await admin.from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, failure_count').in('user_id', userIds)
  if (error) throw new Error('push_subscriptions: ' + error.message)

  const byUser = new Map<string, PushSub[]>()
  for (const s of (subs || []) as PushSub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s])

  const jobs: { sub: PushSub; payload: string }[] = []
  for (const n of notes) for (const sub of byUser.get(n.user_id) || []) jobs.push({ sub, payload: buildPushPayload(n) })

  const okIds = new Set<string>()
  const goneIds = new Set<string>()
  const failed = new Map<string, PushSub>()
  await pool(jobs, CONCURRENCY, async ({ sub, payload }) => {
    const r = await sender(sub, payload)
    if (r.ok) { stats.sent++; okIds.add(sub.id); return }
    stats.failed++
    if (isGoneStatus(r.status)) goneIds.add(sub.id)
    else failed.set(sub.id, sub)
  })

  if (goneIds.size) {
    await admin.from('push_subscriptions').delete().in('id', [...goneIds])
    stats.removed += goneIds.size
  }
  if (okIds.size) {
    await admin.from('push_subscriptions')
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 }).in('id', [...okIds])
  }
  for (const sub of failed.values()) {
    if (okIds.has(sub.id) || goneIds.has(sub.id)) continue
    if (sub.failure_count + 1 >= PUSH_MAX_FAILURES) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id); stats.removed++
    } else {
      await admin.from('push_subscriptions').update({ failure_count: sub.failure_count + 1 }).eq('id', sub.id)
    }
  }
  return stats
}

/** Revendică notificările (o singură dată, doar cele recente) și le trimite ca push. */
export async function dispatchNotifications(admin: SupabaseClient, ids: string[], send?: Sender) {
  const clean = [...new Set(ids.map(String).filter(x => /^[0-9a-zA-Z-]{1,64}$/.test(x)))].slice(0, 500)
  if (!clean.length) return { notifications: 0, sent: 0, failed: 0, removed: 0 }
  const since = new Date(Date.now() - PUSH_MAX_AGE_MIN * 60_000).toISOString()
  const { data, error } = await admin.from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .in('id', clean).is('pushed_at', null).gte('created_at', since)
    .select('id, user_id, title, body, link')
  if (error) throw new Error('notifications claim: ' + error.message)
  return sendToDevices(admin, (data || []) as PushNotification[], send)
}

let cachedSecret: { value: string; at: number } | null = null

/** Secretul cu care Postgres semnează apelurile (generat în SQL 24, citit cu cheia de serviciu). */
export async function dispatchSecret(admin: SupabaseClient): Promise<string | null> {
  if (cachedSecret && Date.now() - cachedSecret.at < 10 * 60_000) return cachedSecret.value
  const { data } = await admin.from('app_private_settings').select('value').eq('key', 'push_dispatch_secret').maybeSingle()
  const value = (data as any)?.value || null
  if (value) cachedSecret = { value, at: Date.now() }
  return value
}

/** Comparare în timp constant (fără scurgeri de informație prin durată). */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
